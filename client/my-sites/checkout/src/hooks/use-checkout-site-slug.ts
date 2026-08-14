import { useMemo } from 'react';
import type { SitelessCheckoutType } from '@automattic/wpcom-checkout';

/**
 * The site slug checkout should act on, which is not always the selected site:
 * the siteless flows carry their own slug, or none at all.
 *
 * The host context and the checkout body both need this answer, and they must
 * agree on it — a close that leaves for the wrong slug is a regression the
 * flag would not catch, which is why every input here is one both callers hold.
 */
export default function useCheckoutSiteSlug( {
	siteSlug,
	sitelessCheckoutType,
	jetpackSiteSlug,
}: {
	siteSlug?: string;
	sitelessCheckoutType?: SitelessCheckoutType;
	jetpackSiteSlug?: string;
} ): string | undefined {
	return useMemo( () => {
		if ( sitelessCheckoutType === 'jetpack' ) {
			return jetpackSiteSlug;
		}

		// Akismet and marketplace siteless checkout have no slug of their own —
		// nothing supplies one. Returning `undefined` rather than falling through
		// keeps their routes off the "no-user" placeholder `siteSlug` carries.
		if ( sitelessCheckoutType === 'akismet' || sitelessCheckoutType === 'marketplace' ) {
			return undefined;
		}

		// Onboarding unified siteless checkout should return undefined to avoid using siteSlug which becomes "no-user"
		if ( sitelessCheckoutType === 'unified' ) {
			return undefined;
		}

		return siteSlug;
	}, [ jetpackSiteSlug, sitelessCheckoutType, siteSlug ] );
}
