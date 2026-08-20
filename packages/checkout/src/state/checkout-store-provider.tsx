import { RegistryProvider, createRegistry, useRegistry } from '@wordpress/data';
import { useState } from 'react';
import { createCheckoutStore } from './checkout-store';
import type { ReactNode } from 'react';

/**
 * Gives the checkout inside it its own local state.
 *
 * What a shopper has typed lives in a `@wordpress/data` store. One of these
 * registers a store of its own in a child registry, so each open checkout
 * starts empty and stays its own rather than inheriting whatever the last one
 * left behind.
 *
 * The child registry keeps its parent, so every other store the checkout reads
 * resolves as it did; only the checkout's own store is shadowed. Anything that
 * writes into that store has to render inside this.
 *
 * `createRegistry` subscribes to its parent and `@wordpress/data` offers no way
 * to undo that, so each checkout opened leaves a listener behind for the life of
 * the page. Worth revisiting when a host can open and close checkouts
 * repeatedly.
 */
export function CheckoutStoreProvider( { children }: { children: ReactNode } ) {
	const parentRegistry = useRegistry();

	// `useState` rather than `useMemo`, which React is free to throw away: a
	// registry thrown away mid-checkout would take the shopper's typing with it.
	const [ scopedRegistry ] = useState( () => {
		const registry = createRegistry( {}, parentRegistry );
		registry.register( createCheckoutStore() );
		return registry;
	} );

	return <RegistryProvider value={ scopedRegistry }>{ children }</RegistryProvider>;
}
