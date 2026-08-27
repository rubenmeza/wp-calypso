/**
 * @jest-environment jsdom
 */
import { fetchSite } from '@automattic/api-core';
import { isEnabled } from '@automattic/calypso-config';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import getInitialQueryArguments from 'calypso/state/selectors/get-initial-query-arguments';
import useValidCheckoutBackUrl from '../hooks/use-valid-checkout-back-url';
import { CalypsoCheckoutSlots } from './util/checkout-slots';
import type { Site } from '@automattic/api-core';
import type { ReactNode } from 'react';

jest.mock( '@automattic/calypso-config', () => {
	const config = jest.fn( ( key ) => ( key === 'hostname' ? 'wordpress.com' : undefined ) );
	return Object.assign( config, { __esModule: true, default: config, isEnabled: jest.fn() } );
} );

jest.mock( '@automattic/api-core', () => ( {
	...jest.requireActual( '@automattic/api-core' ),
	fetchSite: jest.fn(),
} ) );

jest.mock( 'calypso/state', () => ( {
	useSelector: ( selector: ( state: unknown ) => unknown ) => selector( {} ),
} ) );
jest.mock( 'calypso/state/selectors/get-initial-query-arguments' );

// The flag-off path goes through Calypso's own site selectors, so those are
// what this stands in for.
const mockReduxIsJetpack = jest.fn();
const mockReduxIsCommerceGarden = jest.fn();
jest.mock( 'calypso/state/sites/selectors', () => ( {
	getSiteId: () => 654,
	getSiteSlug: () => 'example-site.com',
	isJetpackSite: () => mockReduxIsJetpack(),
	isCommerceGardenSite: () => mockReduxIsCommerceGarden(),
} ) );
jest.mock( 'calypso/state/selectors/is-site-automated-transfer', () => ( {
	__esModule: true,
	default: () => false,
} ) );
jest.mock( 'calypso/state/selectors/is-private-site', () => ( {
	__esModule: true,
	default: () => false,
} ) );

const mockIsEnabled = isEnabled as jest.MockedFunction< typeof isEnabled >;
const mockFetchSite = fetchSite as jest.MockedFunction< typeof fetchSite >;

const SITE_SLUG = 'example-site.com';

function renderBackUrl() {
	const queryClient = new QueryClient( { defaultOptions: { queries: { retry: false } } } );
	// The initial query arguments reach the hook through a slot now, so the
	// test has to supply the bag Calypso really mounts.
	const wrapper = ( { children }: { children: ReactNode } ) => (
		<QueryClientProvider client={ queryClient }>
			<CalypsoCheckoutSlots>{ children }</CalypsoCheckoutSlots>
		</QueryClientProvider>
	);
	return renderHook( () => useValidCheckoutBackUrl( SITE_SLUG ), { wrapper } );
}

beforeEach( () => {
	jest.clearAllMocks();
	( getInitialQueryArguments as jest.Mock ).mockReturnValue( { checkoutBackUrl: undefined } );
	mockReduxIsJetpack.mockReturnValue( true );
	mockReduxIsCommerceGarden.mockReturnValue( false );
	mockFetchSite.mockResolvedValue( {
		ID: 654,
		slug: SITE_SLUG,
		jetpack: true,
		jetpack_connection: true,
		is_wpcom_atomic: false,
		is_wpcom_flex: false,
		is_garden: false,
		garden_name: null,
	} as Site );
} );

describe( 'the checkout back url with the flag off', () => {
	beforeEach( () => {
		mockIsEnabled.mockReturnValue( false );
	} );

	it( 'sends a Jetpack site back to Jetpack pricing', () => {
		const { result } = renderBackUrl();

		expect( result.current ).toBe( `https://cloud.jetpack.com/pricing/${ SITE_SLUG }` );
	} );

	it( 'sends a Commerce garden site nowhere in particular', () => {
		mockReduxIsCommerceGarden.mockReturnValue( true );

		const { result } = renderBackUrl();

		expect( result.current ).toBeUndefined();
	} );
} );

describe( 'the checkout back url with the shared site query', () => {
	beforeEach( () => {
		mockIsEnabled.mockImplementation( ( flag ) => flag === 'checkout/shared-foundation' );
	} );

	it( 'sends a Jetpack site back to Jetpack pricing, as it always has', async () => {
		const { result } = renderBackUrl();

		await waitFor( () =>
			expect( result.current ).toBe( `https://cloud.jetpack.com/pricing/${ SITE_SLUG }` )
		);
		expect( mockReduxIsJetpack ).not.toHaveBeenCalled();
	} );

	it( 'sends a Commerce garden site nowhere in particular', async () => {
		mockFetchSite.mockResolvedValue( {
			ID: 654,
			slug: SITE_SLUG,
			jetpack: true,
			jetpack_connection: true,
			is_wpcom_atomic: false,
			is_wpcom_flex: false,
			is_garden: true,
			garden_name: 'commerce',
		} as Site );

		const { result } = renderBackUrl();

		await waitFor( () => expect( mockFetchSite ).toHaveBeenCalled() );
		expect( result.current ).toBeUndefined();
	} );

	it( 'still honours an explicit allowed back url without waiting for the site', () => {
		( getInitialQueryArguments as jest.Mock ).mockReturnValue( {
			checkoutBackUrl: `https://${ SITE_SLUG }/wp-admin/`,
		} );

		const { result } = renderBackUrl();

		expect( result.current ).toBe( `https://${ SITE_SLUG }/wp-admin/` );
	} );
} );
