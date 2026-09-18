import {
	translateCheckoutPaymentMethodToWpcomPaymentMethod,
	isRedirectPaymentMethod,
} from '@automattic/wpcom-checkout';
import { logStashLoadErrorEvent } from './error-logging';
import type { CheckoutHostContext } from '@automattic/checkout';
import type { CheckoutPaymentMethodSlug } from '@automattic/wpcom-checkout';

/**
 * The transports these need, in the shape a processor already carries them.
 * Plain functions rather than Redux thunks, so the same code records the same
 * events whichever app is hosting the checkout.
 */
interface TransactionAnalytics {
	recordEvent: CheckoutHostContext[ 'recordEvent' ];
	logError: CheckoutHostContext[ 'logError' ];
}

export function recordCompositeCheckoutErrorDuringAnalytics(
	{ recordEvent, logError }: TransactionAnalytics,
	{ errorObject, failureDescription }: { errorObject: Error; failureDescription: string }
): void {
	// This is a fallback to catch any errors caused by the analytics code
	// Anything in this block should remain very simple and extremely
	// tolerant of any kind of data. It should make no assumptions about
	// the data it uses. There's no fallback for the fallback!
	recordEvent( 'calypso_checkout_composite_error', {
		error_message: errorObject.message,
		action_type: failureDescription,
	} );
	logStashLoadErrorEvent( logError, 'calypso_checkout_composite_error', errorObject, {
		action_type: failureDescription,
	} );
}

export function recordTransactionBeginAnalytics(
	analytics: TransactionAnalytics,
	{
		paymentMethodId,
		useForAllSubscriptions,
	}: {
		paymentMethodId: CheckoutPaymentMethodSlug;
		useForAllSubscriptions?: boolean;
	}
): void {
	const { recordEvent } = analytics;
	try {
		if ( isRedirectPaymentMethod( paymentMethodId ) ) {
			recordEvent( 'calypso_checkout_form_redirect', {} );
		}
		const submitProperties = {
			credits: null,
			payment_method: translateCheckoutPaymentMethodToWpcomPaymentMethod( paymentMethodId ) || '',
			...( useForAllSubscriptions ? { use_for_all_subs: useForAllSubscriptions } : undefined ),
		};
		recordEvent( 'calypso_checkout_form_submit', submitProperties );
		recordEvent( 'calypso_checkout_composite_form_submit', submitProperties );
		const paymentMethodIdForTracks = paymentMethodId.startsWith( 'existingCard' )
			? 'existing_card'
			: paymentMethodId.replace( /-/, '_' ).toLowerCase();
		recordEvent( `calypso_checkout_composite_${ paymentMethodIdForTracks }_submit_clicked`, {} );
	} catch ( errorObject ) {
		recordCompositeCheckoutErrorDuringAnalytics( analytics, {
			errorObject: errorObject as Error,
			failureDescription: `transaction-begin: ${ paymentMethodId }`,
		} );
	}
}
