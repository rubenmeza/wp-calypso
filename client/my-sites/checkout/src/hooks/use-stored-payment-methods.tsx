import { fetchUserPaymentMethods, requestPaymentMethodDeletion } from '@automattic/api-core';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslate } from 'i18n-calypso';
import { useCallback } from 'react';
import type { StoredPaymentMethod } from '@automattic/wpcom-checkout';
import type { ComponentType } from 'react';

export const storedPaymentMethodsQueryKey = 'use-stored-payment-methods';

export type PaymentMethodRequestType = 'card' | 'agreement' | 'vault-token' | 'all';

/**
 * What a card-list response means, shared by both reads so they cannot drift:
 * anything that is not an array is no cards plus an error, never a value
 * handed on to callers that will call `.length` or `.filter` on it.
 */
export function readStoredPaymentMethods( {
	data,
	queryError,
	deletionError,
	isForBusiness,
	translate,
}: {
	data: unknown;
	queryError?: Error | null;
	deletionError?: Error | null;
	isForBusiness?: boolean | null;
	translate: ReturnType< typeof useTranslate >;
} ): { paymentMethods: StoredPaymentMethod[]; error: string | null } {
	const isDataValid = Array.isArray( data );
	const paymentMethods = ( () => {
		if ( ! isDataValid ) {
			return [];
		}
		return isForBusiness
			? ( data as StoredPaymentMethod[] ).filter(
					( method ) => method?.tax_location?.is_for_business === isForBusiness
			  )
			: ( data as StoredPaymentMethod[] );
	} )();

	const error = ( () => {
		if ( deletionError ) {
			return deletionError.message;
		}
		if ( queryError ) {
			return queryError.message;
		}
		if ( data !== undefined && ! isDataValid ) {
			return translate( 'There was a problem loading your stored payment methods.', {
				textOnly: true,
			} );
		}
		return null;
	} )();

	return { paymentMethods, error };
}

export interface StoredPaymentMethodsState {
	paymentMethods: StoredPaymentMethod[];
	isLoading: boolean;
	isDeleting: boolean;
	error: string | null;
	deletePaymentMethod: ( id: StoredPaymentMethod[ 'stored_details_id' ] ) => Promise< void >;
}

export interface WithStoredPaymentMethodsProps {
	paymentMethodsState: StoredPaymentMethodsState;
}

export function withStoredPaymentMethods< P >(
	Component: ComponentType< P >,
	options: {
		type?: PaymentMethodRequestType;
		expired?: boolean;
	} = {}
) {
	return function StoredPaymentMethodsWrapper(
		props: Omit< P, keyof WithStoredPaymentMethodsProps >
	) {
		const paymentMethodsState = useStoredPaymentMethods( options );
		return <Component { ...( props as P ) } paymentMethodsState={ paymentMethodsState } />;
	};
}

export function useStoredPaymentMethods( {
	type = 'all',
	expired = false,
	isLoggedOut = false,
	isForBusiness = false,
	enabled = true,
}: {
	/**
	 * If there is no logged-in user, we will not try to fetch anything.
	 */
	isLoggedOut?: boolean;

	/**
	 * False to skip the fetch entirely, for callers that read the card list
	 * from somewhere else.
	 *
	 * Defaults to true.
	 */
	enabled?: boolean;

	/**
	 * The type of payment method to fetch.
	 *
	 * Defaults to 'all'.
	 */
	type?: PaymentMethodRequestType;

	/**
	 * True to also fetch expired payment methods.
	 *
	 * Defaults to false.
	 */
	expired?: boolean;

	/**
	 * Optionally filter methods by business use status
	 *
	 * Defaults to 'false'
	 */
	isForBusiness?: boolean | null;
} = {} ): StoredPaymentMethodsState {
	const queryClient = useQueryClient();

	const queryKey = [ storedPaymentMethodsQueryKey, type, expired ];

	const { data, isLoading, error } = useQuery< StoredPaymentMethod[], Error >( {
		queryKey,
		queryFn: () => fetchUserPaymentMethods( type, expired ),
		enabled: enabled && ! isLoggedOut,
		// Saved payment details stay in memory, never in localStorage.
		meta: { persist: false },
	} );

	const translate = useTranslate();

	const mutation = useMutation<
		StoredPaymentMethod[ 'stored_details_id' ],
		Error,
		StoredPaymentMethod[ 'stored_details_id' ]
	>( {
		mutationFn: ( id ) => requestPaymentMethodDeletion( id ),
		onSuccess: () => {
			queryClient.invalidateQueries( {
				queryKey: [ storedPaymentMethodsQueryKey ],
			} );
			queryClient.invalidateQueries( {
				queryKey: [ 'me', 'payment-methods' ],
			} );
		},
	} );

	const { mutate: mutateDeletion } = mutation;
	const deletePaymentMethod = useCallback< StoredPaymentMethodsState[ 'deletePaymentMethod' ] >(
		( id ) => {
			return new Promise( ( resolve, reject ) => {
				mutateDeletion( id, {
					onSuccess: () => resolve(),
					onError: ( error ) => reject( error ),
				} );
			} );
		},
		[ mutateDeletion ]
	);

	const { paymentMethods, error: errorMessage } = readStoredPaymentMethods( {
		data,
		queryError: error,
		deletionError: mutation.error,
		isForBusiness,
		translate,
	} );

	return {
		paymentMethods,
		isLoading: isLoggedOut || ! enabled ? false : isLoading,
		isDeleting: mutation.isPending,
		error: errorMessage,
		deletePaymentMethod,
	};
}
