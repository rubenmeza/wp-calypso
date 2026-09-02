import { fetchPaymentMethodTaxLocation, setPaymentMethodTaxInfo } from '@automattic/api-core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import type { TaxGetInfo, TaxInfo } from './types';

/**
 * The endpoint reads back `tax_`-prefixed and is written unprefixed, and
 * `setPaymentMethodTaxInfo` puts the prefixes back on. Dropping them here is
 * what lets both directions go through the one shared writer.
 */
function toTaxLocation( taxInfo: TaxInfo ) {
	return {
		postal_code: taxInfo.tax_postal_code,
		country_code: taxInfo.tax_country_code,
		subdivision_code: taxInfo.tax_subdivision_code,
		city: taxInfo.tax_city,
		organization: taxInfo.tax_organization,
		address: taxInfo.tax_address,
	};
}

export function usePaymentMethodTaxInfo(
	storedDetailsId: string,
	{ doNotFetch }: { doNotFetch?: boolean } = {}
): {
	taxInfo: TaxGetInfo | undefined;
	isLoading: boolean;
	setTaxInfo: ( newInfo: TaxInfo ) => Promise< void >;
} {
	const queryClient = useQueryClient();

	const queryKey = [ 'tax-info-is-set', storedDetailsId ];

	const { data: taxInfo, isLoading } = useQuery< TaxGetInfo, Error >( {
		queryKey,
		queryFn: () => fetchPaymentMethodTaxLocation( storedDetailsId ),
		enabled: ! doNotFetch,
	} );

	const mutation = useMutation( {
		mutationFn: async ( mutationInputValues: TaxInfo ) => {
			await setPaymentMethodTaxInfo( storedDetailsId, toTaxLocation( mutationInputValues ) );
			// The shared writer resolves with nothing, so the values just saved are
			// what seeds the cache below, rather than the endpoint's echo of them.
			return mutationInputValues;
		},
		onSuccess: ( onSuccessInputValues: TaxInfo ) => {
			queryClient.setQueryData( queryKey, {
				...onSuccessInputValues,
				is_tax_info_set: true,
			} );
		},
	} );

	const { mutate } = mutation;
	const setTaxInfo = useCallback(
		( newInfo: TaxInfo ): Promise< void > => {
			return new Promise( ( resolve, reject ) => {
				mutate( newInfo, {
					onSuccess: () => resolve(),
					onError: ( error ) => reject( ( error as Error ).message ),
				} );
			} );
		},
		[ mutate ]
	);

	return {
		taxInfo,
		isLoading: doNotFetch ? false : isLoading,
		setTaxInfo,
	};
}
