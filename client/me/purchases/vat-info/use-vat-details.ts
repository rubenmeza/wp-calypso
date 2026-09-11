import { userTaxDetailsQuery } from '@automattic/api-queries';
import { formatVatDetails } from '@automattic/checkout';
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

const emptyVatDetails = {};

export const vatDetailsQueryKey = [ 'vat-details' ];

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
