import wpcom from 'calypso/lib/wp';
import { useCalypsoCheckoutLogError } from './use-calypso-checkout-log-error';
import { useEnabledCheckoutHost } from './use-checkout-host-bridge';
import type { CheckoutHostContext } from '@automattic/checkout';

/**
 * The host capabilities that reach the REST API.
 *
 * Importing this module builds an HTTP client, because `calypso/lib/wp` does
 * that on evaluation. That is the whole reason the bridge is split three ways:
 * `use-checkout-host-bridge` is free to import, `use-checkout-analytics-bridge`
 * costs an analytics transport, and this one costs a REST client. Import the
 * cheapest one that answers the question.
 *
 * Each returns the host's capability when the flag is on and a host is mounted,
 * and Calypso's direct one otherwise. The file goes away once the context is
 * the only path.
 */

/** The authenticated WordPress.com REST client. */
export function useCheckoutWpcom(): CheckoutHostContext[ 'wpcom' ] {
	const host = useEnabledCheckoutHost();
	return host?.wpcom ?? wpcom;
}

/** Where faults go. */
export function useCheckoutLogError(): CheckoutHostContext[ 'logError' ] {
	const host = useEnabledCheckoutHost();
	const calypsoLogError = useCalypsoCheckoutLogError();
	return host?.logError ?? calypsoLogError;
}
