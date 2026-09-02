import nock from 'nock';
import { fetchPayPalConfiguration } from '../fetchers';

const BASE = 'https://public-api.wordpress.com';

describe( 'the PayPal configuration fetcher', () => {
	afterEach( () => nock.cleanAll() );

	it( 'reads the client id the PayPal script is loaded with', async () => {
		nock( BASE )
			.get( '/rest/v1.1/me/paypal-configuration' )
			.reply( 200, { client_id: 'AeQ_paypal_client_id' } );

		await expect( fetchPayPalConfiguration() ).resolves.toEqual( {
			client_id: 'AeQ_paypal_client_id',
		} );
	} );

	it( 'reports no client id when PayPal is not configured', async () => {
		nock( BASE ).get( '/rest/v1.1/me/paypal-configuration' ).reply( 200, {} );

		await expect( fetchPayPalConfiguration() ).resolves.toEqual( {} );
	} );
} );
