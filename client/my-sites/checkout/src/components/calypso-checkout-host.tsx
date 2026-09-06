import { CheckoutHostProvider } from '@automattic/checkout';
import useCalypsoCheckoutHost from '../hooks/use-calypso-checkout-host';
import { CalypsoCheckoutSlots } from './calypso-checkout-slots';
import type { ReactNode } from 'react';

interface CalypsoCheckoutHostProps {
	siteId: number | undefined;
	siteSlug: string | undefined;
	children: ReactNode;
}

/**
 * Puts Calypso behind the checkout's host seam.
 *
 * Every Calypso surface that renders the checkout mounts this, not the two
 * providers by hand: a capability added to the host has one place to be filled,
 * and a surface that forgets it gets a checkout with no navigation, no notices
 * and no cart key rather than an error.
 */
export function CalypsoCheckoutHost( { siteId, siteSlug, children }: CalypsoCheckoutHostProps ) {
	return (
		<CalypsoCheckoutSlots>
			<CalypsoHostProvider siteId={ siteId } siteSlug={ siteSlug }>
				{ children }
			</CalypsoHostProvider>
		</CalypsoCheckoutSlots>
	);
}

/**
 * The host has to be built *below* the slots provider: the adapter fills the
 * checkout's back URL from a slot, and a slot read from the component that
 * renders the provider gets an empty bag rather than an error.
 */
function CalypsoHostProvider( { siteId, siteSlug, children }: CalypsoCheckoutHostProps ) {
	const host = useCalypsoCheckoutHost( { siteId, siteSlug } );

	return <CheckoutHostProvider value={ host }>{ children }</CheckoutHostProvider>;
}
