/**
 * @jest-environment jsdom
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { leaveCheckout } from 'calypso/my-sites/checkout/src/lib/leave-checkout';
import getInitialQueryArguments from 'calypso/state/selectors/get-initial-query-arguments';
import CheckoutMasterbar from '../checkout';

jest.mock( '@automattic/calypso-config', () => {
	const config = jest.fn( ( key ) => ( key === 'hostname' ? 'wordpress.com' : undefined ) );
	return Object.assign( config, { __esModule: true, default: config, isEnabled: jest.fn() } );
} );

jest.mock( 'calypso/my-sites/checkout/src/lib/leave-checkout', () => ( {
	leaveCheckout: jest.fn(),
} ) );
jest.mock( 'calypso/my-sites/checkout/calypso-shopping-cart-provider', () => ( {
	__esModule: true,
	default: ( { children }: { children: React.ReactNode } ) => children,
} ) );
jest.mock( 'calypso/my-sites/checkout/src/hooks/use-checkout-help-center', () => ( {
	useCheckoutHelpCenter: () => ( {
		helpCenterButtonCopy: '',
		helpCenterButtonLink: '',
		toggleHelpCenter: jest.fn(),
	} ),
} ) );
jest.mock( 'calypso/my-sites/checkout/use-cart-key', () => ( {
	__esModule: true,
	default: () => 9,
} ) );
jest.mock( '@automattic/shopping-cart', () => ( {
	...jest.requireActual( '@automattic/shopping-cart' ),
	useShoppingCart: () => ( {
		responseCart: { products: [] },
		replaceProductsInCart: jest.fn(),
	} ),
	useShoppingCartManagerClient: () => ( { forCartKey: () => ( { actions: {} } ) } ),
} ) );
jest.mock( '../masterbar', () => ( {
	__esModule: true,
	default: ( { children }: { children: React.ReactNode } ) => <div>{ children }</div>,
} ) );

const mockDispatch = jest.fn();
jest.mock( 'calypso/state', () => ( {
	useDispatch: () => mockDispatch,
	useSelector: ( selector: ( state: unknown ) => unknown ) => selector( {} ),
} ) );
jest.mock( 'react-redux', () => ( {
	useSelector: ( selector: ( state: unknown ) => unknown ) => selector( {} ),
} ) );
jest.mock( 'calypso/state/selectors/get-initial-query-arguments' );
jest.mock( 'calypso/state/selectors/get-previous-route', () => jest.fn() );
jest.mock( 'calypso/state/selectors/get-previous-path', () => jest.fn() );
jest.mock( 'calypso/state/selectors/has-gravatar-domain-query-param', () => jest.fn() );
jest.mock( 'calypso/state/sites/selectors', () => ( {
	getSiteId: () => 9,
	getSiteSlug: () => 'example.wordpress.com',
	isJetpackSite: () => false,
	isCommerceGardenSite: () => false,
} ) );
jest.mock( 'calypso/state/selectors/is-site-automated-transfer', () => ( {
	__esModule: true,
	default: () => false,
} ) );
jest.mock( 'calypso/state/selectors/is-private-site', () => ( {
	__esModule: true,
	default: () => false,
} ) );

const SITE_SLUG = 'example.wordpress.com';
const BACK_URL = 'https://wordpress.com/home/example.wordpress.com';

beforeEach( () => {
	jest.clearAllMocks();
	window.history.replaceState( {}, '', `/checkout/${ SITE_SLUG }/personal` );
	( getInitialQueryArguments as jest.Mock ).mockReturnValue( { checkoutBackUrl: BACK_URL } );
} );

describe( 'the checkout masterbar', () => {
	it( 'leaves to the back URL the shopper arrived with', async () => {
		const queryClient = new QueryClient( { defaultOptions: { queries: { retry: false } } } );
		render(
			<QueryClientProvider client={ queryClient }>
				<CheckoutMasterbar title="Checkout" siteSlug={ SITE_SLUG } isLeavingAllowed />
			</QueryClientProvider>
		);

		await userEvent.click( screen.getByRole( 'button' ) );

		expect( leaveCheckout ).toHaveBeenCalledWith(
			expect.objectContaining( { forceCheckoutBackUrl: BACK_URL } )
		);
	} );
} );
