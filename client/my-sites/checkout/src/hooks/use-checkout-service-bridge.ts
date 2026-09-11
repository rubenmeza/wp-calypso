import { useCalypsoCheckoutLogError } from './use-calypso-checkout-log-error';
import { useEnabledCheckoutHost } from './use-checkout-host-bridge';
import type { CheckoutHostContext } from '@automattic/checkout';

/**
 * The host capabilities that reach the network. Each returns the host's
 * capability when the flag is on and a host is mounted, and Calypso's direct
 * one otherwise. The file goes away once the context is the only path.
 */

/** Where faults go. */
export function useCheckoutLogError(): CheckoutHostContext[ 'logError' ] {
	const host = useEnabledCheckoutHost();
	const calypsoLogError = useCalypsoCheckoutLogError();
	return host?.logError ?? calypsoLogError;
}
