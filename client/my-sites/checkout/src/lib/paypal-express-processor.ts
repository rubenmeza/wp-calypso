import { submitPayPalExpressTransaction } from '@automattic/api-core';
import { makeRedirectResponse, makeErrorResponse } from '@automattic/composite-checkout';
import { tryToGuessPostalCodeFormat } from '@automattic/wpcom-checkout';
import debugFactory from 'debug';
import getToSAcceptancePayload from 'calypso/lib/tos-acceptance-tracking';
import { recordTransactionBeginAnalytics } from '../lib/analytics';
import getDomainDetails from '../lib/get-domain-details';
import { addUrlToPendingPageRedirect } from '../lib/pending-page';
import { createTransactionEndpointCartFromResponseCart } from '../lib/translate-cart';
import { createWpcomAccountBeforeTransaction } from './create-wpcom-account-before-transaction';
import type { PaymentProcessorOptions } from '../types/payment-processors';
import type {
	PayPalExpressEndpointRequestPayload,
	PayPalExpressRedirect,
} from '@automattic/api-core';
import type { PaymentProcessorResponse } from '@automattic/composite-checkout';
import type { ResponseCart, DomainContactDetails } from '@automattic/shopping-cart';

const debug = debugFactory( 'calypso:composite-checkout:paypal-express-processor' );

export default async function payPalProcessor(
	transactionOptions: PaymentProcessorOptions
): Promise< PaymentProcessorResponse > {
	const {
		getThankYouUrl,
		createUserAndSiteBeforeTransaction,
		includeDomainDetails,
		includeGSuiteDetails,
		responseCart,
		siteId,
		siteSlug,
		contactDetails,
		fromSiteSlug,
	} = transactionOptions;
	recordTransactionBeginAnalytics( transactionOptions, { paymentMethodId: 'paypal-express' } );

	const thankYouUrl = getThankYouUrl();
	let currentUrl;
	try {
		currentUrl = new URL( window.location.href );
	} catch ( error ) {
		currentUrl = new URL( `https://wordpress.com/checkout/${ siteSlug }` );
	}
	// We must strip out the hash value because it may break URL encoding when
	// this value is passed back and forth to PayPal and through our own
	// endpoints. Otherwise we may end up with an incorrect URL like
	// 'http://wordpress.com/checkout?cart=no-user#step2?paypal=ABCDEFG'.
	currentUrl.hash = '';
	if ( createUserAndSiteBeforeTransaction ) {
		// It's not clear if this is still required but it may be.
		currentUrl.searchParams.set( 'cart', 'no-user' );
	}
	const cancelUrl = currentUrl.toString();
	const successUrl = addUrlToPendingPageRedirect( thankYouUrl, {
		siteSlug,
		urlType: 'absolute',
		fromSiteSlug,
	} );

	const formattedTransactionData = createPayPalExpressEndpointRequestPayloadFromLineItems( {
		responseCart,
		successUrl,
		cancelUrl,
		siteId,
		domainDetails:
			getDomainDetails( contactDetails, { includeDomainDetails, includeGSuiteDetails } ) || null,
	} );
	debug( 'sending paypal transaction', formattedTransactionData );
	return wpcomPayPalExpress( formattedTransactionData, transactionOptions )
		.then( ( response ) => {
			if ( ! response?.redirect_url ) {
				throw new Error( 'There was an error redirecting to PayPal' );
			}
			return makeRedirectResponse( response.redirect_url );
		} )
		.catch( ( error ) => makeErrorResponse( error.message ) );
}

/**
 * Submit a transaction to the WPCOM PayPal transactions endpoint.
 *
 * This is one of two transactions endpoint functions; also see
 * `submitWpcomTransaction`.
 *
 * All this adds to `submitPayPalExpressTransaction` is the account the cart may
 * need before it can be bought. Please do not alter payload here if possible,
 * to retain type safety: alter
 * `createPayPalExpressEndpointRequestPayloadFromLineItems` instead, or add a
 * new type safe function that works similarly (see
 * `createWpcomAccountBeforeTransaction`).
 */
async function wpcomPayPalExpress(
	payload: PayPalExpressEndpointRequestPayload,
	transactionOptions: PaymentProcessorOptions
): Promise< PayPalExpressRedirect > {
	if ( transactionOptions.createUserAndSiteBeforeTransaction ) {
		payload.cart = await createWpcomAccountBeforeTransaction( payload.cart, transactionOptions );
	}

	return submitPayPalExpressTransaction( payload );
}

function createPayPalExpressEndpointRequestPayloadFromLineItems( {
	successUrl,
	cancelUrl,
	siteId,
	domainDetails,
	responseCart,
}: {
	successUrl: string;
	cancelUrl: string;
	siteId: number | undefined;
	domainDetails: DomainContactDetails | null;
	responseCart: ResponseCart;
} ): PayPalExpressEndpointRequestPayload {
	const postalCode = responseCart.tax.location.postal_code ?? '';
	const country = responseCart.tax.location.country_code ?? '';
	return {
		successUrl,
		cancelUrl,
		cart: createTransactionEndpointCartFromResponseCart( {
			siteId,
			contactDetails: domainDetails,
			responseCart,
		} ),
		country,
		postalCode: postalCode ? tryToGuessPostalCodeFormat( postalCode.toUpperCase(), country ) : '',
		domainDetails,
		tos: getToSAcceptancePayload(),
	};
}
