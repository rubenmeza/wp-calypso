import { createContext, useContext, useRef } from 'react';
import type { CheckoutHostSlots } from './slots';
import type { ReactNode } from 'react';

const NO_SLOTS: CheckoutHostSlots = {};

const checkoutSlotsContext = createContext< CheckoutHostSlots >( NO_SLOTS );

/**
 * Supply the host's slots.
 *
 * Deliberately separate from `CheckoutHostProvider`, and deliberately not
 * behind `checkout/shared-foundation`: the host context selects between the new
 * path and the old one, while slots are how the Calypso-only paths reach the
 * checkout *in both flag states*. A host that has none of them mounts nothing
 * and every slotted branch is simply absent.
 */
export function CheckoutSlotsProvider( {
	value,
	children,
}: {
	value: CheckoutHostSlots;
	children: ReactNode;
} ) {
	return (
		<checkoutSlotsContext.Provider value={ value }>{ children }</checkoutSlotsContext.Provider>
	);
}

/**
 * The host's slots, or an empty set when no host supplied any. Never throws:
 * a checkout with no slots is a working checkout, which is the difference
 * between a slot and a host capability.
 */
export function useCheckoutSlots(): CheckoutHostSlots {
	return useContext( checkoutSlotsContext );
}

/**
 * Call a slot that is itself a hook, or fall back when the host did not supply
 * it.
 *
 * Slots are optional and hooks are not, so reading one directly
 * (`slots.useThing?.()`) is a conditional hook call. It is sound only while a
 * given slot is either filled for the whole life of the tree or absent for the
 * whole life of it, so the branch taken never changes and the hook order never
 * shifts. Going through this helper states that once, rather than leaving each
 * call site to argue it.
 *
 * What matters is which *keys* the slot bag has, not the identity of the bag:
 * memoising an object whose keys are chosen per render still shifts hook order.
 * Build the bag as a constant, or memoise one whose shape cannot vary. This
 * checks that per call site: React would fail the same render anyway, on a
 * hook count it cannot attribute to anything, so the check costs nothing and
 * names the cause.
 */
export function useSlotHook< TArgs extends unknown[], TResult >(
	slot: ( ( ...args: TArgs ) => TResult ) | undefined,
	fallback: TResult,
	...args: TArgs
): TResult {
	const wasFilled = useRef( slot !== undefined );

	if ( wasFilled.current !== ( slot !== undefined ) ) {
		throw new Error(
			'A checkout slot was added or removed while the checkout was mounted. A slot that is a hook has to be present, or absent, for the whole life of the tree: build the host slot bag as a constant rather than choosing its keys per render.'
		);
	}

	return slot ? slot( ...args ) : fallback;
}
