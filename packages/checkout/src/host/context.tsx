import { createContext, useContext } from 'react';
import type { CheckoutHostContext } from './types';
import type { ReactNode } from 'react';

const checkoutHostContext = createContext< CheckoutHostContext | null >( null );

export function CheckoutHostProvider( {
	value,
	children,
}: {
	value: CheckoutHostContext;
	children: ReactNode;
} ) {
	return <checkoutHostContext.Provider value={ value }>{ children }</checkoutHostContext.Provider>;
}

/**
 * Read the host plug. Throws when checkout is rendered without a host, because
 * a checkout with nowhere to navigate and no way to close is not recoverable.
 */
export function useCheckoutHost(): CheckoutHostContext {
	const host = useContext( checkoutHostContext );
	if ( ! host ) {
		throw new Error( 'Checkout must be rendered inside a CheckoutHostProvider.' );
	}
	return host;
}

/**
 * Read the host plug where one may not be mounted yet. This exists for the
 * migration: call sites that still have a legacy fallback use it to tell
 * "no host" apart from a broken host. It retires with the legacy paths.
 */
export function useOptionalCheckoutHost(): CheckoutHostContext | null {
	return useContext( checkoutHostContext );
}
