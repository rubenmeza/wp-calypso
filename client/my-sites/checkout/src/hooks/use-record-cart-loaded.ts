import { useRef, useEffect } from 'react';
import { logStashEvent } from '../lib/analytics';
import { useCheckoutRecordCartAddEvent } from './use-checkout-analytics-bridge';
import { useCheckoutRecordEvent } from './use-checkout-host-bridge';
import type { ResponseCart, RequestCartProduct } from '@automattic/shopping-cart';

export default function useRecordCartLoaded( {
	responseCart,
	productsForCart,
	isInitialCartLoading,
}: {
	responseCart: ResponseCart;
	productsForCart: RequestCartProduct[];
	isInitialCartLoading: boolean;
} ): void {
	const recordEvent = useCheckoutRecordEvent();
	const recordCartAddEvent = useCheckoutRecordCartAddEvent();
	const hasRecorded = useRef< boolean >( false );

	useEffect( () => {
		if ( hasRecorded.current ) {
			return;
		}
		if ( ! isInitialCartLoading ) {
			hasRecorded.current = true;
			recordEvent( 'calypso_checkout_composite_cart_loaded', {
				products: responseCart.products.map( ( product ) => product.product_slug ).join( ',' ),
			} );
			productsForCart.forEach( ( productToAdd ) => {
				try {
					recordCartAddEvent( productToAdd );
				} catch ( error ) {
					logStashEvent( 'checkout_add_product_analytics_error', {
						error: String( error ),
					} );
				}
			} );
		}
	}, [ isInitialCartLoading, productsForCart, recordCartAddEvent, recordEvent, responseCart ] );
}
