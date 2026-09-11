import { CheckoutSlotsProvider } from '@automattic/checkout';
import { calypsoCheckoutSlots } from '../../hooks/calypso-checkout-slots';
import type { ReactNode } from 'react';

/**
 * Mounts the slots Calypso really supplies, rather than a fixture standing in
 * for them.
 *
 * A test that renders a slotted branch without this gets the branch turned off
 * — right for a host with no slots, wrong for Calypso. Anything asserting what
 * Calypso does, and every flag-off assertion, needs this.
 */
export function CalypsoCheckoutSlots( { children }: { children: ReactNode } ) {
	return <CheckoutSlotsProvider value={ calypsoCheckoutSlots }>{ children }</CheckoutSlotsProvider>;
}
