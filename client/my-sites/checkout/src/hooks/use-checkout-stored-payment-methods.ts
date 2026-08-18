import { requestPaymentMethodDeletion } from '@automattic/api-core';
import { userPaymentMethodsQuery } from '@automattic/api-queries';
import { isEnabled } from '@automattic/calypso-config';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslate } from 'i18n-calypso';
import { useCallback } from 'react';
import {
	readStoredPaymentMethods,
	storedPaymentMethodsQueryKey,
	useStoredPaymentMethods,
} from './use-stored-payment-methods';
import type {
	StoredPaymentMethodsState,
	PaymentMethodRequestType,
} from './use-stored-payment-methods';

/**
 * The saved-card list checkout reads, from whichever source the
 * `checkout/query-payment-methods` flag selects: the shared query the Dashboard
 * uses, or checkout's own older read. Both hit `/me/payment-methods` with the
 * same arguments, so the cards are the same either way — only the cache they
 * land in differs. The old read goes away once the flag is retired.
 *
 * Only one of the two ever fetches. Hooks cannot be called conditionally, so
 * both are mounted and the unselected one is disabled.
 */
export function useCheckoutStoredPaymentMethods( {
	type = 'all',
	expired = false,
	isLoggedOut = false,
	isForBusiness = false,
}: {
	isLoggedOut?: boolean;
	type?: PaymentMethodRequestType;
	expired?: boolean;
	isForBusiness?: boolean | null;
} = {} ): StoredPaymentMethodsState {
	const useSharedQuery = isEnabled( 'checkout/query-payment-methods' );
	const translate = useTranslate();
	const queryClient = useQueryClient();

	const legacy = useStoredPaymentMethods( {
		type,
		expired,
		isForBusiness,
		isLoggedOut,
		enabled: ! useSharedQuery,
	} );

	const shared = useQuery( {
		...userPaymentMethodsQuery( { type, expired, isForBusiness } ),
		enabled: useSharedQuery && ! isLoggedOut,
	} );

	// The list is read from one cache and written from another until the old
	// read is gone, so a deletion has to clear both.
	const refreshBothCaches = useCallback( () => {
		queryClient.invalidateQueries( { queryKey: [ 'me', 'payment-methods' ] } );
		queryClient.invalidateQueries( { queryKey: [ storedPaymentMethodsQueryKey ] } );
	}, [ queryClient ] );

	// Not `userPaymentMethodDeleteQuery` from api-queries: that helper invalidates
	// the query client the package owns, which is not the one Calypso renders
	// against, so the list would never refresh here.
	const sharedDeletion = useMutation< void, Error, string >( {
		mutationFn: ( id ) => requestPaymentMethodDeletion( id ),
		onSuccess: refreshBothCaches,
	} );

	// `userPaymentMethodsQuery` already applies the business filter in `select`,
	// so it is not applied again here.
	const { paymentMethods, error } = readStoredPaymentMethods( {
		data: shared.data,
		queryError: shared.error,
		deletionError: sharedDeletion.error,
		translate,
	} );

	if ( ! useSharedQuery ) {
		return legacy;
	}

	return {
		paymentMethods,
		isLoading: isLoggedOut ? false : shared.isLoading,
		isDeleting: sharedDeletion.isPending,
		error,
		deletePaymentMethod: sharedDeletion.mutateAsync,
	};
}
