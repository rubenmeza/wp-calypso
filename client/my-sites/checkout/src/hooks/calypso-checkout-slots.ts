import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import isAkismetCheckout from 'calypso/lib/akismet/is-akismet-checkout';
import isJetpackCheckout from 'calypso/lib/jetpack/is-jetpack-checkout';
import { isWcMobileApp } from 'calypso/lib/mobile-app';
import useVatDetails, { vatDetailsQueryKey } from 'calypso/me/purchases/vat-info/use-vat-details';
import { useSelector } from 'calypso/state';
import { getCurrentUserCountryCode } from 'calypso/state/current-user/selectors';
import type { CheckoutHostSlots, CheckoutVatDetailsManager } from '@automattic/checkout';
import type { VatDetails } from '@automattic/wpcom-checkout';

function useUserCountryCode(): string | undefined {
	return useSelector( getCurrentUserCountryCode );
}

function useLegacyVatDetails( { enabled }: { enabled: boolean } ): CheckoutVatDetailsManager {
	return useVatDetails( { enabled } );
}

function useOnVatDetailsSaved() {
	const queryClient = useQueryClient();
	return useCallback(
		( saved: Partial< VatDetails > ) => {
			queryClient.setQueryData( vatDetailsQueryKey, ( old: VatDetails | undefined ) => ( {
				...old,
				...saved,
			} ) );
		},
		[ queryClient ]
	);
}

/**
 * What Calypso fills the checkout's slots with.
 *
 * A constant rather than a hook, because slot identity has to hold for as long
 * as a checkout is mounted: the slots are hooks, and swapping the bag
 * mid-flight would shift hook order. The first slot that needs something from
 * the host makes this a memoised hook again, and inherits that constraint.
 */
export const calypsoCheckoutSlots: CheckoutHostSlots = {
	isJetpackCheckout,
	isAkismetCheckout,
	isWcMobileApp,
	legacyReads: {
		useUserCountryCode,
		useVatDetails: useLegacyVatDetails,
		useOnVatDetailsSaved,
	},
};
