import nock from 'nock';
import { fetchTransactionsSupportedCountries } from '../fetchers';

const BASE = 'https://public-api.wordpress.com';

describe( 'the transactions supported-countries fetcher', () => {
	afterEach( () => nock.cleanAll() );

	it( 'reads the countries a purchase can be made from, with their VAT flags', async () => {
		nock( BASE )
			.get( '/rest/v1.1/me/transactions/supported-countries' )
			.reply( 200, [
				{ code: 'GB', name: 'United Kingdom', vat_supported: true, tax_country_codes: [ 'GB' ] },
				{ code: 'US', name: 'United States', vat_supported: false },
			] );

		await expect( fetchTransactionsSupportedCountries() ).resolves.toEqual( [
			{ code: 'GB', name: 'United Kingdom', vat_supported: true, tax_country_codes: [ 'GB' ] },
			{ code: 'US', name: 'United States', vat_supported: false },
		] );
	} );

	it( 'asks for the country names in the locale it is given', async () => {
		nock( BASE )
			.get( '/rest/v1.1/me/transactions/supported-countries' )
			.query( { locale: 'fr' } )
			.reply( 200, [ { code: 'GB', name: 'Royaume-Uni', vat_supported: false } ] );

		await expect( fetchTransactionsSupportedCountries( 'fr' ) ).resolves.toEqual( [
			{ code: 'GB', name: 'Royaume-Uni', vat_supported: false },
		] );
	} );
} );
