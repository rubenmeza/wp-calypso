import { fetchTransactionsSupportedCountries } from '@automattic/api-core';
import { useQuery } from '@tanstack/react-query';
import type { CountryListItem, CountryListItemWithVat } from '@automattic/wpcom-checkout';

const emptyList: CountryListItem[] = [];

export const isVatSupported = ( country: CountryListItem ): country is CountryListItemWithVat =>
	country.vat_supported;

const getCountryListQueryKey = ( locale?: string ) => [ 'checkout-country-list', locale ?? '' ];

export default function useCountryList(
	locale?: string,
	{
		enabled = true,
	}: {
		/**
		 * False while another read is answering for this list, so that only one
		 * of the two fetches. See `useCheckoutCountryList`.
		 */
		enabled?: boolean;
	} = {}
): CountryListItem[] {
	const result = useQuery( {
		queryKey: getCountryListQueryKey( locale ),
		queryFn: () => fetchTransactionsSupportedCountries( locale ),
		enabled,
		meta: {
			persist: false,
		},
		refetchOnWindowFocus: false,
	} );
	return result.data ?? emptyList;
}

export function useTaxName( countryCode: string, locale?: string ): undefined | string {
	const countryList = useCountryList( locale );
	const country = countryList.find( ( country ) => country.code === countryCode );
	return country?.tax_name;
}
