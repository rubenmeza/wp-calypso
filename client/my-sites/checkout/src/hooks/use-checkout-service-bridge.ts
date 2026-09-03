import { useCalypsoCheckoutLogError } from './use-calypso-checkout-log-error';
import { useEnabledCheckoutHost } from './use-checkout-host-bridge';
import type { CheckoutHostContext } from '@automattic/checkout';

/**
 * The host capabilities that reach the network.
 *
 * The bridge is split by what importing it costs: `use-checkout-host-bridge` is
 * free, `use-checkout-analytics-bridge` costs an analytics transport, and this
 * one reaches Logstash, which posts through `calypso/lib/wp` and so builds an
 * HTTP client on evaluation. Import the cheapest one that answers the question.
 *
 * Each returns the host's capability when the flag is on and a host is mounted,
 * and Calypso's direct one otherwise. The file goes away once the context is
 * the only path.
 */

/** Where faults go. */
export function useCheckoutLogError(): CheckoutHostContext[ 'logError' ] {
	const host = useEnabledCheckoutHost();
	const calypsoLogError = useCalypsoCheckoutLogError();
	return host?.logError ?? calypsoLogError;
}
