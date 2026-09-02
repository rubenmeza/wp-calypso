import { submitTransaction } from '@automattic/api-core';
import { createWpcomAccountBeforeTransaction } from './create-wpcom-account-before-transaction';
import type { PaymentProcessorOptions } from '../types/payment-processors';
import type {
	WPCOMTransactionEndpointRequestPayload,
	WPCOMTransactionEndpointResponse,
} from '@automattic/api-core';

/**
 * Submit a transaction to the WPCOM transactions endpoint.
 *
 * This is one of two transactions endpoint functions; also see
 * `wpcomPayPalExpress`.
 *
 * All this adds to `submitTransaction` is the account the cart may need before
 * it can be bought. Please do not alter payload here if possible, to retain
 * type safety: alter `createTransactionEndpointRequestPayload` instead, or add
 * a new type safe function that works similarly (see
 * `createWpcomAccountBeforeTransaction`).
 */
export default async function submitWpcomTransaction(
	payload: WPCOMTransactionEndpointRequestPayload,
	transactionOptions: PaymentProcessorOptions
): Promise< WPCOMTransactionEndpointResponse > {
	if ( transactionOptions.createUserAndSiteBeforeTransaction ) {
		payload.cart = await createWpcomAccountBeforeTransaction( payload.cart, transactionOptions );
	}

	return submitTransaction( payload );
}
