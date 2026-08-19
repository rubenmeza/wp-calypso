import { fetchUserTaxDetails, updateUserTaxDetails } from '@automattic/api-core';
import { queryOptions, mutationOptions } from '@tanstack/react-query';
import { queryClient } from './query-client';

export const userTaxDetailsQuery = () =>
	queryOptions( {
		queryKey: [ 'me', 'billing-purchases', 'tax-details' ],
		queryFn: () => fetchUserTaxDetails(),
		// A VAT id with the name and address it belongs to is personal data: it
		// belongs in memory for as long as the tab is open, never in the query
		// cache that is written to storage.
		meta: { persist: false },
	} );

export const userTaxDetailsMutation = () =>
	mutationOptions( {
		meta: { statId: 'user-tax-details-update' },
		mutationFn: updateUserTaxDetails,
		onSuccess: ( newData ) => {
			queryClient.setQueryData(
				userTaxDetailsQuery().queryKey,
				( oldData ) => oldData && { ...oldData, ...newData }
			);
		},
	} );
