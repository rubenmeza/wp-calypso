/**
 * @jest-environment jsdom
 */
import { useCheckoutHost } from '@automattic/checkout';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import getInitialQueryArguments from 'calypso/state/selectors/get-initial-query-arguments';
import { leaveCheckout } from '../../lib/leave-checkout';
import { CalypsoCheckoutHost } from '../calypso-checkout-host';
import type { CheckoutHostContext } from '@automattic/checkout';

jest.mock( '@automattic/calypso-config', () => {
	const config = jest.fn( ( key ) => ( key === 'hostname' ? 'wordpress.com' : undefined ) );
	return Object.assign( config, { __esModule: true, default: config, isEnabled: jest.fn() } );
} );

jest.mock( 'calypso/lib/navigate', () => ( { navigate: jest.fn() } ) );
jest.mock( '../../lib/leave-checkout', () => ( { leaveCheckout: jest.fn() } ) );
jest.mock( 'calypso/my-sites/checkout/use-cart-key', () => ( {
	__esModule: true,
	default: () => 9,
} ) );

jest.mock( 'calypso/state', () => ( {
	useDispatch: () => jest.fn(),
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

let host: CheckoutHostContext;

function CaptureHost() {
	host = useCheckoutHost();
	return null;
}

function renderHost() {
	const queryClient = new QueryClient( { defaultOptions: { queries: { retry: false } } } );
	render(
		<QueryClientProvider client={ queryClient }>
			<CalypsoCheckoutHost siteId={ 9 } siteSlug={ SITE_SLUG }>
				<CaptureHost />
			</CalypsoCheckoutHost>
		</QueryClientProvider>
	);
	return host;
}

beforeEach( () => {
	jest.clearAllMocks();
	window.history.replaceState( {}, '', `/checkout/${ SITE_SLUG }/personal` );
	( getInitialQueryArguments as jest.Mock ).mockReturnValue( { checkoutBackUrl: BACK_URL } );
} );

describe( 'CalypsoCheckoutHost', () => {
	it( 'closes to the back URL the shopper arrived with', () => {
		renderHost().close();

		expect( leaveCheckout ).toHaveBeenCalledWith(
			expect.objectContaining( { forceCheckoutBackUrl: BACK_URL } )
		);
	} );

	it( 'closes with no forced back URL when the shopper arrived without one', () => {
		( getInitialQueryArguments as jest.Mock ).mockReturnValue( {} );

		renderHost().close();

		expect( leaveCheckout ).toHaveBeenCalledWith(
			expect.objectContaining( { forceCheckoutBackUrl: undefined } )
		);
	} );
} );
