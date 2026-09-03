import { recordAddEvent } from 'calypso/lib/analytics/cart';
import { gaRecordEvent } from 'calypso/lib/analytics/ga';
import { useEnabledCheckoutHost } from './use-checkout-host-bridge';
import type { CheckoutHostContext } from '@automattic/checkout';

/**
 * The analytics transports, kept apart from the capabilities that reach the
 * REST API. Recording a click should not construct an HTTP client, which is
 * what importing `calypso/lib/wp` does.
 *
 * Like the rest of the bridge, each returns the host's transport when the flag
 * is on and a host is mounted, and Calypso's direct one otherwise.
 */
export function useCheckoutRecordGaEvent(): CheckoutHostContext[ 'recordGaEvent' ] {
	const host = useEnabledCheckoutHost();
	return host?.recordGaEvent ?? ( gaRecordEvent as CheckoutHostContext[ 'recordGaEvent' ] );
}

export function useCheckoutRecordCartAddEvent(): CheckoutHostContext[ 'recordCartAddEvent' ] {
	const host = useEnabledCheckoutHost();
	return host?.recordCartAddEvent ?? recordAddEvent;
}
