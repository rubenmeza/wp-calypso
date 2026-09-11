import { mapRecordKeysRecursively, camelToSnakeCase } from '@automattic/js-utils';
import { wpcom } from '../wpcom-fetcher';
import type {
	PayPalConfirmResponse,
	PayPalExpressEndpointRequestPayload,
	PayPalExpressRedirect,
	WPCOMTransactionEndpointRequestPayload,
	WPCOMTransactionEndpointResponse,
} from './types';

/**
 * Submits a purchase.
 *
 * The payload is written in camelCase and sent in snake_case; the conversion
 * happens here so no caller has to hold both spellings of the same field.
 */
export async function submitTransaction(
	payload: WPCOMTransactionEndpointRequestPayload
): Promise< WPCOMTransactionEndpointResponse > {
	return await wpcom.req.post(
		'/me/transactions',
		mapRecordKeysRecursively( payload, camelToSnakeCase )
	);
}

/**
 * The other way a purchase can start: hands the cart to PayPal and answers with
 * the URL to send the shopper to. See `submitTransaction` for the ordinary one.
 */
export async function submitPayPalExpressTransaction(
	payload: PayPalExpressEndpointRequestPayload
): Promise< PayPalExpressRedirect > {
	return await wpcom.req.post< PayPalExpressRedirect >(
		{ path: '/me/paypal-express-url' },
		{ apiVersion: '1.2' },
		mapRecordKeysRecursively( payload, camelToSnakeCase )
	);
}

/**
 * Confirms a payment the shopper has already approved in PayPal, naming both
 * the merchant's order and PayPal's own.
 */
export async function confirmPayPalJsPayment(
	bdOrderId: string,
	payPalOrderId: string
): Promise< PayPalConfirmResponse > {
	return await wpcom.req.post( {
		path: '/me/paypal-ppcp-confirm-payment',
		body: {
			bd_order_id: bdOrderId,
			paypal_order_id: payPalOrderId,
		},
	} );
}
