import { CheckoutHostProvider, CheckoutSlotsProvider } from '@automattic/checkout';
import { calypsoCheckoutSlots } from '../hooks/calypso-checkout-slots';
import useCalypsoCheckoutHost from '../hooks/use-calypso-checkout-host';
import type { ReactNode } from 'react';

/**
 * Puts Calypso behind the checkout's host seam.
 *
 * Every Calypso surface that renders the checkout mounts this, not the two
 * providers by hand: a capability added to the host has one place to be filled,
 * and a surface that forgets it gets a checkout with no navigation, no notices
 * and no cart key rather than an error.
 */
export function CalypsoCheckoutHost( {
	siteId,
	siteSlug,
	children,
}: {
	siteId: number | undefined;
	siteSlug: string | undefined;
	children: ReactNode;
} ) {
	const host = useCalypsoCheckoutHost( { siteId, siteSlug } );

	return (
		<CheckoutHostProvider value={ host }>
			<CheckoutSlotsProvider value={ calypsoCheckoutSlots }>{ children }</CheckoutSlotsProvider>
		</CheckoutHostProvider>
	);
}
