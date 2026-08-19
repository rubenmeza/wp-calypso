import { fetchTransactionsSupportedCountries } from '@automattic/api-core';
import { queryOptions } from '@tanstack/react-query';

export const transactionsSupportedCountriesQuery = ( locale?: string ) =>
	queryOptions( {
		queryKey: [ 'me', 'transactions', 'supported-countries', locale ],
		queryFn: () => fetchTransactionsSupportedCountries( locale ),
	} );
