import nock from 'nock';
import {
	confirmPayPalJsPayment,
	submitPayPalExpressTransaction,
	submitTransaction,
} from '../mutators';
import type {
	PayPalExpressEndpointRequestPayload,
	WPCOMTransactionEndpointRequestPayload,
} from '../types';

const BASE = 'https://public-api.wordpress.com';

type TransactionCart = WPCOMTransactionEndpointRequestPayload[ 'cart' ];
const cart = { products: [], currency: 'USD' } as unknown as TransactionCart;

describe( 'submitting a transaction', () => {
	afterEach( () => nock.cleanAll() );

	it( 'sends the payment details snake-cased, which is what the endpoint reads', async () => {
		let sent: Record< string, Record< string, unknown > > | undefined;
		nock( BASE )
			.post( '/rest/v1.1/me/transactions', ( body ) => {
				sent = body;
				return true;
			} )
			.reply( 200, { success: true, receipt_id: 7 } );

		await submitTransaction( {
			cart,
			payment: {
				paymentMethod: 'card',
				name: 'Ada Lovelace',
				zip: 'SW1A 1AA',
				postalCode: 'SW1A 1AA',
				country: 'GB',
				countryCode: 'GB',
			},
		} as WPCOMTransactionEndpointRequestPayload );

		expect( sent?.payment.payment_method ).toBe( 'card' );
		expect( sent?.payment.postal_code ).toBe( 'SW1A 1AA' );
		expect( sent?.payment.country_code ).toBe( 'GB' );
	} );
} );

describe( 'submitting a PayPal Express transaction', () => {
	afterEach( () => nock.cleanAll() );

	it( 'asks version 1.2 of the endpoint where to send the shopper', async () => {
		nock( BASE )
			.post( '/rest/v1.2/me/paypal-express-url' )
			.reply( 200, { redirect_url: 'https://paypal.example/checkout' } );

		await expect(
			submitPayPalExpressTransaction( {
				successUrl: 'https://wordpress.com/thank-you',
				cancelUrl: 'https://wordpress.com/checkout',
				cart,
				domainDetails: null,
				country: 'GB',
				postalCode: 'SW1A 1AA',
			} as PayPalExpressEndpointRequestPayload )
		).resolves.toEqual( { redirect_url: 'https://paypal.example/checkout' } );
	} );
} );

describe( 'confirming a PayPal payment', () => {
	afterEach( () => nock.cleanAll() );

	it( 'names both orders, the merchant one and PayPal own', async () => {
		nock( BASE )
			.post( '/rest/v1.1/me/paypal-ppcp-confirm-payment', {
				bd_order_id: 'bd-1',
				paypal_order_id: 'pp-1',
			} )
			.reply( 200, { success: true } );

		await expect( confirmPayPalJsPayment( 'bd-1', 'pp-1' ) ).resolves.toEqual( { success: true } );
	} );
} );
