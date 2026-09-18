/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react';
import useCartKey from 'calypso/my-sites/checkout/use-cart-key';
import { errorNotice } from 'calypso/state/notices/actions';
import { isMarketplaceProduct } from 'calypso/state/products-list/selectors';
import { getDomainsBySiteId, hasLoadedSiteDomains } from 'calypso/state/sites/domains/selectors';
import { getPlansBySiteId } from 'calypso/state/sites/plans/selectors/get-plans-by-site';
import { isJetpackSite, isCommerceGardenSite } from 'calypso/state/sites/selectors';
import {
	getActivePersonalPlanDataForType,
	getBasicCart,
	mockGetPaymentMethodsEndpoint,
	mockGetSupportedCountriesEndpoint,
	mockGetVatInfoEndpoint,
	mockLogStashEndpoint,
	mockMatchMediaOnWindow,
	mockSetCartEndpointWith,
	countryList,
} from './util';
import { MockCheckout } from './util/mock-checkout';

jest.mock( 'calypso/state/sites/selectors' );
jest.mock( 'calypso/state/sites/domains/selectors' );
jest.mock( 'calypso/state/selectors/is-site-automated-transfer' );
jest.mock( 'calypso/state/sites/plans/selectors/get-plans-by-site' );
jest.mock( 'calypso/my-sites/checkout/use-cart-key' );
jest.mock( 'calypso/lib/analytics/utils/refresh-country-code-cookie-gdpr' );
jest.mock( 'calypso/state/products-list/selectors/is-marketplace-product' );
jest.mock( 'calypso/lib/navigate' );
jest.mock( 'calypso/state/notices/actions' );

const onboardingAffiliateFlow = { signup: { flow: { currentFlowName: 'onboarding-affiliate' } } };

describe( 'the checkout reading Calypso’s slots', () => {
	const initialCart = getBasicCart();
	const mockSetCartEndpoint = mockSetCartEndpointWith( {
		currency: initialCart.currency,
		locale: initialCart.locale,
	} );

	beforeEach( () => {
		jest.clearAllMocks();
		( getPlansBySiteId as jest.Mock ).mockImplementation( () => ( {
			data: getActivePersonalPlanDataForType( 'yearly' ),
		} ) );
		( errorNotice as jest.Mock ).mockImplementation( ( value ) => ( {
			type: 'errorNotice',
			value,
		} ) );
		( hasLoadedSiteDomains as jest.Mock ).mockImplementation( () => true );
		( getDomainsBySiteId as jest.Mock ).mockImplementation( () => [] );
		( isMarketplaceProduct as jest.Mock ).mockImplementation( () => false );
		( isJetpackSite as jest.Mock ).mockImplementation( () => false );
		( isCommerceGardenSite as jest.Mock ).mockImplementation( () => false );
		( useCartKey as jest.Mock ).mockImplementation( () => 123456 );
		mockMatchMediaOnWindow();
		mockGetSupportedCountriesEndpoint( countryList );
		mockGetPaymentMethodsEndpoint( [] );
		mockGetVatInfoEndpoint( {} );
		mockLogStashEndpoint();
	} );

	it( 'offers a coupon to an ordinary shopper', async () => {
		render( <MockCheckout initialCart={ initialCart } setCart={ mockSetCartEndpoint } /> );

		expect( await screen.findByText( 'Have a coupon?' ) ).toBeVisible();
	} );

	it( 'offers no coupon on the affiliate onboarding flow', async () => {
		render(
			<MockCheckout
				initialCart={ initialCart }
				setCart={ mockSetCartEndpoint }
				preloadedState={ onboardingAffiliateFlow }
			/>
		);

		await screen.findByText( 'Purchase Details' );
		expect( screen.queryByText( 'Have a coupon?' ) ).not.toBeInTheDocument();
	} );
} );
