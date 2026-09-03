import { siteCurrentPlanQuery } from '@automattic/api-queries';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'calypso/state';
import { getCurrentPlan } from 'calypso/state/sites/plans/selectors';
import { isSharedFoundationEnabled } from '../lib/shared-foundation';

/**
 * The slug of the plan the site is currently on, from whichever source the
 * `checkout/shared-foundation` flag selects: the shared site-plans query, or
 * Calypso's Redux plans. Both name the same plan; only the case of the field
 * differs, which is why this returns the slug rather than the plan.
 *
 * A site on no plan reads as absent rather than as an error: the shared query
 * rejects when it finds no current plan, and that is not a fault the checkout
 * has anything to do about.
 *
 * Only one of the two ever fetches. Hooks cannot be called conditionally, so
 * both are mounted and the unselected one is disabled.
 */
export function useCheckoutCurrentPlanSlug( siteId: number | undefined ): string | undefined {
	const useSharedQuery = isSharedFoundationEnabled();

	const legacyPlanSlug = useSelector( ( state ) =>
		useSharedQuery || ! siteId ? undefined : getCurrentPlan( state, siteId )?.productSlug
	);

	const { data: sharedPlan } = useQuery( {
		...siteCurrentPlanQuery( siteId as number ),
		enabled: useSharedQuery && Boolean( siteId ),
	} );

	return useSharedQuery ? sharedPlan?.product_slug : legacyPlanSlug;
}
