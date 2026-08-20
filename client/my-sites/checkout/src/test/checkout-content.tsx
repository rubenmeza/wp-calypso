/**
 * @jest-environment jsdom
 */
import { CheckoutStatusProvider, useCheckoutStatus } from '@automattic/checkout';
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

/** Stands in for a modal frame, which has to decide whether it may close. */
function HostFrame() {
	const { isBusy, canClose } = useCheckoutStatus();
	return (
		<span data-testid="frame">
			{ isBusy ? 'busy' : 'idle' }/{ canClose ? 'closable' : 'held-open' }
		</span>
	);
}

/** What `CheckoutContent` renders: the checkout with no frame and no page view. */
const frameless = { isEmbedded: true, recordsPageView: false };

describe( 'the checkout with no frame around it', () => {
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

	it( 'renders the whole flow, exactly as the page does', async () => {
		render(
			<MockCheckout
				initialCart={ initialCart }
				setCart={ mockSetCartEndpoint }
				additionalProps={ frameless }
			/>
		);

		expect( await screen.findByText( 'Purchase Details' ) ).toBeVisible();
	} );

	it( 'tells the frame around it that there is nothing in flight to interrupt', async () => {
		render(
			<CheckoutStatusProvider>
				<HostFrame />
				<MockCheckout
					initialCart={ initialCart }
					setCart={ mockSetCartEndpoint }
					additionalProps={ frameless }
				/>
			</CheckoutStatusProvider>
		);

		await screen.findByText( 'Purchase Details' );
		expect( screen.getByTestId( 'frame' ) ).toHaveTextContent( 'idle/closable' );
	} );

	it( 'is the same flow the page renders, which still has its own frame', async () => {
		render( <MockCheckout initialCart={ initialCart } setCart={ mockSetCartEndpoint } /> );

		expect( await screen.findByText( 'Purchase Details' ) ).toBeVisible();
	} );
} );
