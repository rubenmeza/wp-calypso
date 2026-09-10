// @ts-nocheck - TODO: Fix TypeScript issues
import { StripeHookProvider } from '@automattic/calypso-stripe';
import { CheckoutHostProvider } from '@automattic/checkout';
import { ShoppingCartProvider, createShoppingCartManagerClient } from '@automattic/shopping-cart';
import { PropsOf } from '@emotion/react';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Provider as ReduxProvider } from 'react-redux';
import { CalypsoCheckoutSlots } from 'calypso/my-sites/checkout/src/components/calypso-checkout-slots';
import CheckoutMain from 'calypso/my-sites/checkout/src/components/checkout-main';
import {
	mockGetCartEndpointWith,
	fetchStripeConfiguration,
	siteId,
	mockSetCartEndpointWith,
	createTestReduxStore,
} from './index';
import type { CheckoutHostContext } from '@automattic/checkout';
import type { SetCart, ResponseCart } from '@automattic/shopping-cart';

export function MockCheckout( {
	initialCart,
	cartChanges,
	additionalProps,
	setCart,
	useUndefinedSiteId,
	checkoutHost,
	preloadedState,
}: {
	initialCart: ResponseCart;
	cartChanges?: Partial< ResponseCart >;
	additionalProps?: Partial< PropsOf< typeof CheckoutMain > >;
	setCart?: SetCart;
	useUndefinedSiteId?: boolean;
	/** Mounts checkout under a host, the way a real checkout host does. */
	checkoutHost?: CheckoutHostContext;
	/** Redux slices the test needs seeded, such as the signup flow a shopper arrived on. */
	preloadedState?: Record< string, unknown >;
} ) {
	const reduxStore = createTestReduxStore( preloadedState );
	const [ queryClient ] = useState( () => new QueryClient() );

	const mockSetCartEndpoint = mockSetCartEndpointWith( {
		currency: initialCart.currency,
		locale: initialCart.locale,
	} );
	const managerClient = createShoppingCartManagerClient( {
		getCart: mockGetCartEndpointWith( { ...initialCart, ...( cartChanges ?? {} ) } ),
		setCart: setCart || mockSetCartEndpoint,
	} );

	return (
		<ReduxProvider store={ reduxStore }>
			<QueryClientProvider client={ queryClient }>
				<ShoppingCartProvider managerClient={ managerClient }>
					<StripeHookProvider fetchStripeConfiguration={ fetchStripeConfiguration }>
						<CalypsoCheckoutSlots>
							<MaybeCheckoutHost host={ checkoutHost }>
								<CheckoutMain
									siteId={ useUndefinedSiteId ? undefined : siteId }
									siteSlug="foo.com"
									{ ...additionalProps }
								/>
							</MaybeCheckoutHost>
						</CalypsoCheckoutSlots>
					</StripeHookProvider>
				</ShoppingCartProvider>
			</QueryClientProvider>
		</ReduxProvider>
	);
}

function MaybeCheckoutHost( { host, children } ) {
	if ( ! host ) {
		return children;
	}
	return <CheckoutHostProvider value={ host }>{ children }</CheckoutHostProvider>;
}
