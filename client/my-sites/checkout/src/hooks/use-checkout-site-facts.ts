import { siteByIdQuery, siteBySlugQuery } from '@automattic/api-queries';
import {
	isAtomicSite as isSharedSiteAtomic,
	isCommerceGardenSite as isSharedSiteCommerceGarden,
	isJetpackSite as isSharedSiteJetpack,
} from '@automattic/checkout';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'calypso/state';
import isPrivateSite from 'calypso/state/selectors/is-private-site';
import isAtomicSite from 'calypso/state/selectors/is-site-automated-transfer';
import {
	getSiteId,
	getSiteSlug,
	isCommerceGardenSite,
	isJetpackSite,
} from 'calypso/state/sites/selectors';
import { getSelectedSiteId } from 'calypso/state/ui/selectors';
import { isSharedFoundationEnabled } from '../lib/shared-foundation';
import { useEnabledCheckoutHost } from './use-checkout-host-bridge';
import type { AppState } from 'calypso/types';

/**
 * The site the surrounding app has selected, for the call sites that read it
 * rather than being handed one.
 *
 * Here rather than on the bridge because reading it from Redux costs the whole
 * `state/ui` reducer tree: even the narrow `get-selected-site-id` module does
 * `import 'calypso/state/ui/init'`, and that reducer reads config at module
 * scope. The bridge is the module everything imports and has to stay cheap.
 */
export function useCheckoutSelectedSiteId(): number | undefined {
	const host = useEnabledCheckoutHost();
	const calypsoSelectedSiteId = useSelector( getSelectedSiteId ) ?? undefined;
	return host ? host.siteId : calypsoSelectedSiteId;
}

export interface CheckoutSiteFacts {
	slug: string | undefined;
	/** True for Atomic sites too, which run Jetpack. Pair it with `isAtomic`. */
	isJetpack: boolean;
	isAtomic: boolean;
	isCommerceGarden: boolean;
	isPrivate: boolean;
}

const noSite: CheckoutSiteFacts = {
	slug: undefined,
	isJetpack: false,
	isAtomic: false,
	isCommerceGarden: false,
	isPrivate: false,
};

/**
 * Each fact goes through the selector Calypso already had, rather than being
 * re-derived from the raw site. Re-deriving them is how you silently change
 * behaviour: `slug` is a computed attribute and is not on the raw site at all,
 * and `isPrivateSite` falls back to the site settings when the site itself has
 * not loaded.
 */
function factsFromRedux( state: AppState, siteId: number ): CheckoutSiteFacts {
	return {
		slug: getSiteSlug( state, siteId ) ?? undefined,
		isJetpack: Boolean( isJetpackSite( state, siteId ) ),
		isAtomic: Boolean( isAtomicSite( state, siteId ) ),
		isCommerceGarden: Boolean( isCommerceGardenSite( state, siteId ) ),
		isPrivate: Boolean( isPrivateSite( state, siteId ) ),
	};
}

/**
 * The facts about the site being bought for, from whichever source the
 * `checkout/shared-foundation` flag selects: the shared site query the
 * Dashboard uses, or Calypso's Redux site.
 *
 * The facts are separate rather than composed because call sites want
 * different combinations of them — one branch cares whether the site is
 * Jetpack and not Atomic, another adds Commerce garden to that — and a single
 * combined predicate would quietly change what some of them mean.
 *
 * Both sources report every fact off until the site is known, which is what
 * Redux has always answered for a site that has not loaded.
 *
 * Only one of the two ever fetches. Hooks cannot be called conditionally, so
 * both are mounted and the unselected one is disabled.
 */
export function useCheckoutSiteFacts(
	siteId: number | undefined,
	siteSlug?: string
): CheckoutSiteFacts {
	const onSharedFoundation = isSharedFoundationEnabled();

	const reduxFacts = useSelector( ( state: AppState ) => {
		if ( onSharedFoundation ) {
			return noSite;
		}
		const id = siteId ?? getSiteId( state, siteSlug ?? null );
		return id ? factsFromRedux( state, id ) : noSite;
	} );

	// Callers know the site by its id or by its slug, depending on the route
	// the checkout was opened from.
	const byId = useQuery( {
		...siteByIdQuery( siteId as number ),
		enabled: onSharedFoundation && Boolean( siteId ),
	} );
	const bySlug = useQuery( {
		...siteBySlugQuery( siteSlug as string ),
		enabled: onSharedFoundation && ! siteId && Boolean( siteSlug ),
	} );
	const sharedSite = siteId ? byId.data : bySlug.data;

	if ( ! onSharedFoundation ) {
		return reduxFacts;
	}

	if ( ! sharedSite ) {
		return noSite;
	}

	return {
		slug: sharedSite.slug,
		isJetpack: isSharedSiteJetpack( sharedSite ),
		isAtomic: isSharedSiteAtomic( sharedSite ),
		isCommerceGarden: isSharedSiteCommerceGarden( sharedSite ),
		isPrivate: Boolean( sharedSite.is_private ),
	};
}
