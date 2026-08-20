import { CheckoutStoreProvider as PackagedCheckoutStoreProvider } from '@automattic/checkout';
import { isSharedFoundationEnabled } from '../lib/shared-foundation';
import type { ReactNode } from 'react';

/**
 * Gives the checkout inside it its own local state.
 *
 * On the shared foundation this is the packaged provider, which registers a
 * store per open checkout so two of them never share what a shopper has typed.
 * Off it, nothing is mounted and every checkout keeps using the one store the
 * app registers, as it always has.
 *
 * Anything that writes into the checkout's store has to render inside this —
 * the recaptcha badge does. Surfaces that fill the store in from outside the
 * checkout entirely, as Automattic for Agencies does with the client's email,
 * do not mount it at all.
 */
export function CheckoutStoreProvider( { children }: { children: ReactNode } ) {
	if ( ! isSharedFoundationEnabled() ) {
		return children;
	}

	return <PackagedCheckoutStoreProvider>{ children }</PackagedCheckoutStoreProvider>;
}
