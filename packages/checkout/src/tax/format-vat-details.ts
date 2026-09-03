import type { VatDetails } from '@automattic/wpcom-checkout';

// Some countries prefix the VAT ID with the country code, but that's not
// part of the ID as we need it formatted, so here we strip the country
// code out if it is there.
function stripCountryCodeFromVatId( id: string, country: string | undefined | null ): string {
	// Switzerland often uses the prefix 'CHE-' instead of just `CH`.
	const swissCodeRegexp = /^CHE-?/i;
	if ( country === 'CH' && swissCodeRegexp.test( id ) ) {
		return id.replace( swissCodeRegexp, '' );
	}

	const first2UppercasedChars = id.slice( 0, 2 ).toUpperCase();
	if ( first2UppercasedChars === country ) {
		return id.slice( 2 );
	}

	return id;
}

/**
 * The formatting `/me/vat-info` expects, applied by every path that writes VAT
 * details.
 *
 * `client/dashboard/utils/tax.ts` carries the same country-prefix rule for the
 * Dashboard's own tax form. Converging the two is worth doing and is not this
 * function's job.
 */
export function formatVatDetails( data: VatDetails ): VatDetails {
	const { country, id } = data;

	if ( !! id && id?.length > 1 ) {
		return { ...data, id: stripCountryCodeFromVatId( id, country ) };
	}

	return data;
}
