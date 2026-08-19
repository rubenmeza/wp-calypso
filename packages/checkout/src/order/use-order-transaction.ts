import { orderTransactionQuery } from '@automattic/api-queries';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import type { OrderTransaction } from '@automattic/api-core';

export interface OrderPollingOptions {
	/** How long to wait before the first re-read. Doubles from there. */
	initialInterval?: number;
	/** The longest the wait between re-reads is allowed to grow to. */
	maxInterval?: number;
	/** How long to keep asking before giving up on an answer. */
	timeout?: number;
}

export type OrderTransactionState =
	/** No order to ask about yet. */
	| { status: 'idle' }
	/** The server has not said either way. `lastError` is set if the last ask failed. */
	| { status: 'polling'; lastError?: Error }
	/** The purchase happened. The only state that means it did. */
	| { status: 'success'; receiptId: number; order: OrderTransaction }
	/** The server says it did not happen. */
	| { status: 'failure'; order: OrderTransaction }
	/** We stopped asking. The order is still live on the server. */
	| { status: 'timeout' };

const DEFAULT_INITIAL_INTERVAL = 2000;
const DEFAULT_MAX_INTERVAL = 15000;
const DEFAULT_TIMEOUT = 5 * 60 * 1000;

/**
 * Whether the order has finished, one way or the other.
 *
 * `processing` and `async-pending` mean it is still being worked on.
 * `payment-confirmed` means the money arrived but the order is not fulfilled,
 * which is not yet an answer. A `success` without a receipt is not an answer
 * either: the receipt is what the customer is owed, so keep asking until it
 * lands rather than reporting a purchase that cannot be shown.
 */
function isFinal( order: OrderTransaction | undefined ): boolean {
	if ( ! order ) {
		return false;
	}
	if ( order.processing_status === 'success' ) {
		return Boolean( order.receipt_id );
	}
	return order.processing_status === 'payment-failure' || order.processing_status === 'error';
}

function nextInterval( dataUpdates: number, initial: number, max: number ): number {
	return Math.min( max, initial * 2 ** Math.max( 0, dataUpdates - 1 ) );
}

/**
 * Follows an order until the server says what happened to it.
 *
 * A payment being taken is not a purchase: the transaction starts an order, and
 * only the order reaching a final state says whether the customer got what they
 * paid for. So this asks repeatedly, waiting longer between each ask, and gives
 * up after `timeout` — at which point the order is still live on the server and
 * the customer is told their receipt will follow. Nothing here cancels an
 * order; closing the checkout only stops the asking.
 *
 * Polling survives the tab being in the background, because the redirect and
 * pop-up payment methods leave this tab blurred for the whole time they take.
 *
 * Resuming (a reopen, or a return from a redirect) restarts the clock but not
 * the backoff, so a long-running order is re-read at the capped interval rather
 * than hammered from the start. That is deliberate: an order that was already
 * slow is not likely to answer faster the second time it is watched.
 */
export function useOrderTransaction(
	orderId: number | undefined,
	{
		initialInterval = DEFAULT_INITIAL_INTERVAL,
		maxInterval = DEFAULT_MAX_INTERVAL,
		timeout = DEFAULT_TIMEOUT,
	}: OrderPollingOptions = {}
): OrderTransactionState {
	const [ hasGivenUp, setHasGivenUp ] = useState( false );

	useEffect( () => {
		if ( ! orderId ) {
			return;
		}
		setHasGivenUp( false );
		const timer = setTimeout( () => setHasGivenUp( true ), timeout );
		return () => clearTimeout( timer );
	}, [ orderId, timeout ] );

	const { data: order, error } = useQuery( {
		...orderTransactionQuery( orderId ),
		enabled: Boolean( orderId ) && ! hasGivenUp,
		refetchInterval: ( query ) =>
			isFinal( query.state.data )
				? false
				: nextInterval( query.state.dataUpdateCount, initialInterval, maxInterval ),
		refetchIntervalInBackground: true,
		// The timer above is the only thing that decides when to ask again.
		// Without this, coming back to the tab re-reads an order that already
		// has an answer, and keeps re-reading one that has timed out.
		refetchOnWindowFocus: false,
	} );

	if ( ! orderId ) {
		return { status: 'idle' };
	}

	if ( order?.processing_status === 'success' && order.receipt_id ) {
		return { status: 'success', receiptId: order.receipt_id, order };
	}

	if ( isFinal( order ) && order ) {
		return { status: 'failure', order };
	}

	if ( hasGivenUp ) {
		return { status: 'timeout' };
	}

	return error ? { status: 'polling', lastError: error } : { status: 'polling' };
}
