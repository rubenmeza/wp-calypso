import { isEnabled } from '@automattic/calypso-config';

/**
 * Whether the checkout runs on the shared foundation.
 *
 * One switch covers the whole of it: the host capabilities arriving through the
 * injected context, the saved cards, detected country, contact details, country
 * list and tax details all read through the shared queries, and the local state
 * scoped to one open checkout. Off, every one of those falls back to the read
 * the checkout has always used.
 *
 * These changes ramp together because none of them has behaviour of its own to
 * show a customer — each is meant to be invisible — so a fault in one is reason
 * to doubt the batch. The cost is that turning any single one off means turning
 * all of them off.
 */
export function isSharedFoundationEnabled(): boolean {
	return isEnabled( 'checkout/shared-foundation' );
}
