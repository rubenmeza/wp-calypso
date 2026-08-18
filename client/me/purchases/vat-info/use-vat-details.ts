import { userTaxDetailsQuery } from '@automattic/api-queries';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import wpcom from 'calypso/lib/wp';
import type { VatDetails } from '@automattic/wpcom-checkout';

export type SetVatDetails = ( vatDetails: VatDetails ) => Promise< VatDetails >;

export interface UpdateError {
	message: string;
	error: string;
}

export interface FetchError {
	message: string;
	error: string;
}

export interface VatDetailsManager {
	vatDetails: VatDetails;
	isLoading: boolean;
	isUpdating: boolean;
	isUpdateSuccessful: boolean;
	fetchError: FetchError | null;
	updateError: UpdateError | null;
	setVatDetails: SetVatDetails;
}

async function fetchVatDetails(): Promise< VatDetails > {
	return await wpcom.req.get( '/me/vat-info' );
}

async function setVatDetails( vatDetails: VatDetails ): Promise< VatDetails > {
	return await wpcom.req.post( {
		path: '/me/vat-info',
		body: vatDetails,
	} );
}

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

const emptyVatDetails = {};

export const vatDetailsQueryKey = [ 'vat-details' ];

/**
 * The formatting the endpoint expects, applied by every path that writes VAT
 * details. See `useCheckoutVatDetails` for the other one.
 */
export function formatVatDetails( data: VatDetails ): VatDetails {
	const { country, id } = data;

	if ( !! id && id?.length > 1 ) {
		return { ...data, id: stripCountryCodeFromVatId( id, country ) };
	}

	return data;
}

export default function useVatDetails( {
	enabled = true,
}: {
	/**
	 * False while another read is answering for these details, so that only one
	 * of the two fetches. See `useCheckoutVatDetails`.
	 */
	enabled?: boolean;
} = {} ): VatDetailsManager {
	const queryClient = useQueryClient();
	const query = useQuery< VatDetails, FetchError >( {
		queryKey: vatDetailsQueryKey,
		queryFn: fetchVatDetails,
		enabled,
		// Personal data: keep it out of the cache that is written to storage.
		meta: { persist: false },
	} );
	const mutation = useMutation< VatDetails, UpdateError, VatDetails >( {
		mutationFn: setVatDetails,
		onSuccess: ( data ) => {
			queryClient.setQueryData( vatDetailsQueryKey, data );
			// Checkout may be reading the shared query in this same session.
			queryClient.setQueryData( userTaxDetailsQuery().queryKey, data );
		},
	} );
	const { data, isLoading, error: fetchError } = query;
	const { mutateAsync, isPending, isSuccess, error: updateError } = mutation;

	const setDetails = useCallback(
		( vatDetails: VatDetails ) => {
			return mutateAsync( formatVatDetails( vatDetails ) );
		},
		[ mutateAsync ]
	);

	return useMemo(
		() => ( {
			vatDetails: data ?? emptyVatDetails,
			isLoading,
			isUpdating: isPending,
			isUpdateSuccessful: isSuccess,
			fetchError,
			updateError,
			setVatDetails: setDetails,
		} ),
		[ data, isLoading, fetchError, isPending, isSuccess, updateError, setDetails ]
	);
}
