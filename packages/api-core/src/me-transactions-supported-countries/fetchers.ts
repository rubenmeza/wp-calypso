import { wpcom } from '../wpcom-fetcher';
import type { CountryListItem } from '../domain-supported-countries/types';

/**
 * The countries a purchase can be made from, carrying the tax and VAT metadata
 * a checkout needs. Not interchangeable with `/domains/supported-countries`
 * (see `fetchCountryList`), which answers where a domain contact may live.
 */
export async function fetchTransactionsSupportedCountries(
	locale?: string
): Promise< CountryListItem[] > {
	return await wpcom.req.get(
		{
			path: '/me/transactions/supported-countries',
			apiVersion: '1.1',
		},
		locale ? { locale } : undefined
	);
}
