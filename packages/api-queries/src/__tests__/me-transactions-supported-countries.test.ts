import { transactionsSupportedCountriesQuery } from '../me-transactions-supported-countries';

describe( 'the transactions supported-countries query', () => {
	it( 'keys the locale, so a French list never answers for an English one', () => {
		expect( transactionsSupportedCountriesQuery( 'fr' ).queryKey ).toEqual( [
			'me',
			'transactions',
			'supported-countries',
			'fr',
		] );
		expect( transactionsSupportedCountriesQuery().queryKey ).not.toContain( 'fr' );
	} );
} );
