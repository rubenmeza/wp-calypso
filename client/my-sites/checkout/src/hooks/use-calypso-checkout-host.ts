import { useCallback, useMemo } from 'react';
import { recordAddEvent } from 'calypso/lib/analytics/cart';
import { gaRecordEvent } from 'calypso/lib/analytics/ga';
import { recordGoogleRecaptchaAction } from 'calypso/lib/analytics/recaptcha';
import { recordPurchase } from 'calypso/lib/analytics/record-purchase';
import { navigate } from 'calypso/lib/navigate';
import paymentGatewayLoader from 'calypso/lib/payment-gateway-loader';
import { getStripeConfiguration } from 'calypso/lib/store-transactions';
import wpcom from 'calypso/lib/wp';
import { useSelector } from 'calypso/state';
import getPreviousRoute from 'calypso/state/selectors/get-previous-route';
import useCartKey from '../../use-cart-key';
import { leaveCheckout } from '../lib/leave-checkout';
import {
	useCalypsoCheckoutNotices,
	useCalypsoCheckoutRecordEvent,
} from './use-calypso-checkout-capabilities';
import { useCalypsoCheckoutLogError } from './use-calypso-checkout-log-error';
import useValidCheckoutBackUrl from './use-valid-checkout-back-url';
import type { CheckoutCloseOptions, CheckoutHostContext } from '@automattic/checkout';

/**
 * Fills the shared checkout's host context with Calypso: its router, its notice
 * store, its analytics pipeline and the route the user arrived from. This is
 * the Calypso side of the one seam between an app and the checkout; every
 * other host writes its own.
 */
export default function useCalypsoCheckoutHost( {
	siteId,
	siteSlug,
}: {
	siteId: number | undefined;
	siteSlug: string | undefined;
} ): CheckoutHostContext {
	const previousPath = useSelector( getPreviousRoute );
	const forceCheckoutBackUrl = useValidCheckoutBackUrl( siteSlug );
	const notices = useCalypsoCheckoutNotices();
	const recordEvent = useCalypsoCheckoutRecordEvent();
	const logError = useCalypsoCheckoutLogError();
	const cartKey = useCartKey();

	const close = useCallback(
		( options?: CheckoutCloseOptions ) => {
			leaveCheckout( {
				// `leaveCheckout` distinguishes an empty slug from a missing one
				// when building the domain-upsell close URL, and the callers this
				// replaces always passed a string.
				siteSlug: siteSlug ?? '',
				forceCheckoutBackUrl: options?.destinationUrl ?? forceCheckoutBackUrl,
				previousPath,
				tracksEvent: 'calypso_masterbar_close_clicked',
				userHasClearedCart: options?.cartWasEmptied ?? false,
				navigate,
			} );
		},
		[ forceCheckoutBackUrl, previousPath, siteSlug ]
	);

	// The legacy full-page checkout finishes by redirecting to the thank-you URL
	// it computes itself, so its host has nothing left to do on completion. The
	// modal hosts use this to close and route once they exist.
	const onComplete = useCallback( () => {}, [] );

	const search = window.location.search;
	const urlParams = useMemo( () => new URLSearchParams( search ), [ search ] );

	return useMemo(
		() => ( {
			siteId,
			cartKey,
			navigate,
			close,
			onComplete,
			notices,
			urlParams,
			wpcom,
			logError,
			recordEvent,
			// `gaRecordEvent` comes from an untyped module as a bare `Function`.
			// The adapter is the right place to assert its shape: this is where
			// untyped legacy meets the typed seam.
			recordGaEvent: gaRecordEvent as CheckoutHostContext[ 'recordGaEvent' ],
			recordCartAddEvent: recordAddEvent,
			recordPurchase,
			recordRecaptchaAction: recordGoogleRecaptchaAction,
			getStripeConfiguration,
			loadPaymentGateway: ( gatewayUrl: string, gatewayNamespace: string ) =>
				paymentGatewayLoader.ready( gatewayUrl, gatewayNamespace ),
		} ),
		[ cartKey, close, logError, notices, onComplete, recordEvent, siteId, urlParams ]
	);
}
