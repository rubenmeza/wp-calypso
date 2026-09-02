import nock from 'nock';
import { fetchEbanxConfiguration } from '../fetchers';

const BASE = 'https://public-api.wordpress.com';

describe( 'the EBANX configuration fetcher', () => {
	afterEach( () => nock.cleanAll() );

	it( 'asks for the configuration matching the kind of payment being made', async () => {
		nock( BASE )
			.get( '/rest/v1.1/me/ebanx-configuration' )
			.query( { request_type: 'card' } )
			.reply( 200, {
				js_url: 'https://ebanx.example/sdk.js',
				environment: 'sandbox',
				public_key: 'pk_test',
			} );

		await expect( fetchEbanxConfiguration( 'card' ) ).resolves.toEqual( {
			js_url: 'https://ebanx.example/sdk.js',
			environment: 'sandbox',
			public_key: 'pk_test',
		} );
	} );
} );
