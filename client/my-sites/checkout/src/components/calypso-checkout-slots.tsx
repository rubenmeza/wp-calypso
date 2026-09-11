import { CheckoutSlotsProvider } from '@automattic/checkout';
import { calypsoCheckoutSlots } from '../hooks/calypso-checkout-slots';
import type { ReactNode } from 'react';

/**
 * Supplies Calypso's slots to anything that renders a piece of the checkout.
 *
 * Every Calypso surface needs this, not just the ones that mount a host: the
 * checkout masterbar renders the leave-checkout affordance from outside the
 * checkout's own tree, and a slot read without a provider above it is an empty
 * bag rather than an error — the branch turns off silently.
 */
export function CalypsoCheckoutSlots( { children }: { children: ReactNode } ) {
	return <CheckoutSlotsProvider value={ calypsoCheckoutSlots }>{ children }</CheckoutSlotsProvider>;
}
