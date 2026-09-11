import nock from 'nock';
import { fetchPaymentMethodTaxLocation } from '../fetchers';

const BASE = 'https://public-api.wordpress.com';

describe( 'the stored payment method tax location fetcher', () => {
	afterEach( () => nock.cleanAll() );

	it( 'reads the tax location back in the prefixed shape it is written in', async () => {
		nock( BASE ).get( '/rest/v1.1/me/payment-methods/abc123/tax-location' ).reply( 200, {
			tax_postal_code: 'SW1A 1AA',
			tax_country_code: 'GB',
			is_tax_info_set: true,
		} );

		await expect( fetchPaymentMethodTaxLocation( 'abc123' ) ).resolves.toEqual( {
			tax_postal_code: 'SW1A 1AA',
			tax_country_code: 'GB',
			is_tax_info_set: true,
		} );
	} );

	it( 'reports when no tax location has been set', async () => {
		nock( BASE )
			.get( '/rest/v1.1/me/payment-methods/abc123/tax-location' )
			.reply( 200, { is_tax_info_set: false } );

		await expect( fetchPaymentMethodTaxLocation( 'abc123' ) ).resolves.toEqual( {
			is_tax_info_set: false,
		} );
	} );
} );
