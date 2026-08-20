import { transactionsSupportedCountriesQuery } from '@automattic/api-queries';
import { useQuery } from '@tanstack/react-query';
import { isSharedFoundationEnabled } from '../lib/shared-foundation';
import useCountryList from './use-country-list';
import type { CountryListItem } from '@automattic/wpcom-checkout';

export { isVatSupported } from './use-country-list';

const emptyList: CountryListItem[] = [];

/**
 * The countries checkout offers, from whichever source the
 * `checkout/shared-foundation` flag selects: the shared query, or checkout's own
 * older read. Both read `/me/transactions/supported-countries`, the list that
 * carries VAT support — not the `/domains/supported-countries` list the shared
 * `countryListQuery` answers, which does not. The old read goes away once the
 * flag is retired.
 *
 * Only one of the two ever fetches. Hooks cannot be called conditionally, so
 * both are mounted and the unselected one is disabled. Every reader inside
 * checkout goes through here; the `/me/purchases` screens keep the old read.
 */
export function useCheckoutCountryList( locale?: string ): CountryListItem[] {
	const useSharedQuery = isSharedFoundationEnabled();

	const legacy = useCountryList( locale, { enabled: ! useSharedQuery } );

	const shared = useQuery( {
		...transactionsSupportedCountriesQuery( locale ),
		enabled: useSharedQuery,
		// As the older read has always done: the list is stable within a visit,
		// and it is not worth carrying between them.
		refetchOnWindowFocus: false,
		meta: { persist: false },
	} );

	return useSharedQuery ? shared.data ?? emptyList : legacy;
}

export function useCheckoutTaxName( countryCode: string, locale?: string ): undefined | string {
	const countries = useCheckoutCountryList( locale );
	return countries.find( ( country ) => country.code === countryCode )?.tax_name;
}
