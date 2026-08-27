import { updateUserTaxDetails } from '@automattic/api-core';
import { userTaxDetailsQuery } from '@automattic/api-queries';
import { formatVatDetails, useCheckoutSlots, useSlotHook } from '@automattic/checkout';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { isSharedFoundationEnabled } from '../lib/shared-foundation';
import type { UserTaxFormData } from '@automattic/api-core';
import type { CheckoutVatDetailsManager } from '@automattic/checkout';
import type { VatDetails } from '@automattic/wpcom-checkout';

const emptyVatDetails: VatDetails = {};

const noop = () => undefined;

async function refuseToSave(): Promise< VatDetails > {
	throw new Error( 'This checkout host cannot save VAT details without the shared foundation.' );
}

/**
 * What a host that supplies no legacy VAT read sees with the flag off. Frozen at
 * module scope so it keeps one identity across renders, the way a real manager
 * does.
 */
const noVatDetails: CheckoutVatDetailsManager = {
	vatDetails: emptyVatDetails,
	isLoading: false,
	isUpdating: false,
	isUpdateSuccessful: false,
	fetchError: null,
	updateError: null,
	setVatDetails: refuseToSave,
};

/**
 * A rejection from `/me/vat-info` carries an `error` code beside its message,
 * and checkout reads that code to tell `invalid_vat` — the VAT service being
 * briefly unavailable, which a shopper may proceed past — from a real failure.
 * The shared query types its failures as plain `Error`, so recover the code by
 * looking rather than by asserting.
 */
function withErrorCode( error: Error | null ): ( Error & { error: string } ) | null {
	if ( ! error ) {
		return null;
	}
	const code = 'error' in error && typeof error.error === 'string' ? error.error : '';
	return Object.assign( error, { error: code } );
}

/**
 * `VatDetails` allows `null` for a field the shopper has not filled in, and the
 * shared mutation's `UserTaxFormData` allows only `undefined`. Both mean an
 * absent value to the endpoint, so drop the nulls rather than assert that the
 * two types match.
 */
function withoutNulls( vatDetails: VatDetails ) {
	const { country, id, name, address, isForBusiness } = vatDetails;
	return {
		country: country ?? undefined,
		id: id ?? undefined,
		name: name ?? undefined,
		address: address ?? undefined,
		isForBusiness: isForBusiness ?? undefined,
	};
}

/**
 * The shopper's saved VAT details, read and written through whichever source
 * the `checkout/shared-foundation` flag selects: the shared query and mutation, or
 * checkout's own older path. Both read and write `/me/vat-info` with the same
 * formatting, so the details are the same either way. The old path goes away
 * once the flag is retired.
 *
 * Only one of the two ever fetches. Hooks cannot be called conditionally, so
 * both are mounted and the unselected one is disabled. Every reader inside
 * checkout goes through here; the `/me/purchases` screens keep the old path.
 *
 * The old path is a slot because it lives in `/me/purchases`, which only Calypso
 * has. Calypso supplies it, so flag-off is unchanged there.
 */
export function useCheckoutVatDetails(): CheckoutVatDetailsManager {
	const useSharedQuery = isSharedFoundationEnabled();
	const queryClient = useQueryClient();
	const slots = useCheckoutSlots();

	const legacy = useSlotHook( slots.legacyReads?.useVatDetails, noVatDetails, {
		enabled: ! useSharedQuery,
	} );
	const onVatDetailsSaved = useSlotHook( slots.legacyReads?.useOnVatDetailsSaved, noop );

	const shared = useQuery( {
		...userTaxDetailsQuery(),
		enabled: useSharedQuery,
	} );

	// Not `userTaxDetailsMutation` from api-queries: it writes to the query
	// client the package owns, which is not the one Calypso renders against, so
	// the saved details would never reach the screen.
	const sharedUpdate = useMutation< Partial< UserTaxFormData >, Error, VatDetails >( {
		mutationFn: ( vatDetails ) => updateUserTaxDetails( withoutNulls( vatDetails ) ),
		onSuccess: ( saved ) => {
			// The endpoint answers with what it saved, but types that answer as a
			// partial record, so re-read it rather than assert the merge is whole.
			queryClient.invalidateQueries( { queryKey: userTaxDetailsQuery().queryKey } );
			onVatDetailsSaved( saved );
		},
	} );

	const { mutateAsync: saveSharedVatDetails } = sharedUpdate;
	const setSharedVatDetails = useCallback(
		async ( vatDetails: VatDetails ): Promise< VatDetails > =>
			await saveSharedVatDetails( formatVatDetails( vatDetails ) ),
		[ saveSharedVatDetails ]
	);

	if ( ! useSharedQuery ) {
		return legacy;
	}

	return {
		vatDetails: shared.data ?? emptyVatDetails,
		isLoading: shared.isLoading,
		isUpdating: sharedUpdate.isPending,
		isUpdateSuccessful: sharedUpdate.isSuccess,
		fetchError: withErrorCode( shared.error ),
		updateError: withErrorCode( sharedUpdate.error ),
		setVatDetails: setSharedVatDetails,
	};
}
