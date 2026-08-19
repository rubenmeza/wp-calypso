import { isEnabled } from '@automattic/calypso-config';
import { RegistryProvider, createRegistry, useRegistry } from '@wordpress/data';
import { useState } from 'react';
import { createCheckoutStore } from '../lib/wpcom-store';
import type { ReactNode } from 'react';

/**
 * Gives the checkout inside it its own local state.
 *
 * What a shopper has typed lives in a `@wordpress/data` store that every
 * checkout shared, so opening checkout twice — two hosts, or the same one
 * reopened — meant the second inheriting whatever the first left behind.
 * Behind the `checkout/scoped-store` flag this registers a store of its own in
 * a child registry, so each open checkout starts empty and stays its own.
 *
 * The child registry keeps its parent, so every other store the checkout reads
 * resolves as it did before; only the checkout's own store is shadowed. With
 * the flag off nothing is mounted and the shared store is used, as before.
 *
 * Anything that writes into the checkout's store has to render inside this —
 * the recaptcha badge does, and reads of it would otherwise never see a client
 * id. Surfaces that fill the store in from outside the checkout entirely, as
 * Automattic for Agencies does with the client's email, do not mount this at
 * all and keep the shared store.
 */
export function CheckoutStoreProvider( { children }: { children: ReactNode } ) {
	const parentRegistry = useRegistry();

	// `useState` rather than `useMemo`, which React is free to throw away: a
	// registry thrown away mid-checkout would take the shopper's typing with it.
	// Reading the flag in here freezes it for the life of the checkout, so a
	// checkout cannot change which store it is using halfway through.
	//
	// `createRegistry` subscribes to its parent and @wordpress/data offers no way
	// to undo that, so each checkout opened leaves a listener behind for the life
	// of the page. Fine for a route that is navigated to; worth revisiting when a
	// modal can be opened and closed repeatedly.
	const [ scopedRegistry ] = useState( () => {
		if ( ! isEnabled( 'checkout/scoped-store' ) ) {
			return null;
		}
		const registry = createRegistry( {}, parentRegistry );
		registry.register( createCheckoutStore() );
		return registry;
	} );

	if ( ! scopedRegistry ) {
		return children;
	}

	return <RegistryProvider value={ scopedRegistry }>{ children }</RegistryProvider>;
}
