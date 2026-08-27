/**
 * @jest-environment jsdom
 */
import { fetchSite } from '@automattic/api-core';
import { isEnabled } from '@automattic/calypso-config';
import { CheckoutHostProvider } from '@automattic/checkout';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { createTestCheckoutHost } from '../../test/util/checkout-host';
import { useCheckoutSelectedSiteId, useCheckoutSiteFacts } from '../use-checkout-site-facts';
import type { Site } from '@automattic/api-core';
import type { ReactNode } from 'react';

jest.mock( '@automattic/calypso-config', () => {
	const config = jest.fn();
	return Object.assign( config, { __esModule: true, default: config, isEnabled: jest.fn() } );
} );

jest.mock( '@automattic/api-core', () => ( {
	...jest.requireActual( '@automattic/api-core' ),
	fetchSite: jest.fn(),
} ) );

// The Redux path delegates to Calypso's own selectors, so those are what the
// test stands in for. Mocking the raw site instead would let the fixture invent
// fields the real store does not have — `slug` is computed, not stored.
const mockReduxSiteIdForSlug = jest.fn();
const mockReduxSlug = jest.fn();
const mockReduxIsJetpack = jest.fn();
const mockReduxIsAtomic = jest.fn();
const mockReduxIsCommerceGarden = jest.fn();
const mockReduxIsPrivate = jest.fn();
jest.mock( 'calypso/state', () => ( {
	useSelector: ( selector: ( state: unknown ) => unknown ) => selector( {} ),
} ) );
jest.mock( 'calypso/state/sites/selectors', () => ( {
	getSiteId: () => mockReduxSiteIdForSlug(),
	getSiteSlug: () => mockReduxSlug(),
	isJetpackSite: () => mockReduxIsJetpack(),
	isCommerceGardenSite: () => mockReduxIsCommerceGarden(),
} ) );
jest.mock( 'calypso/state/selectors/is-site-automated-transfer', () => ( {
	__esModule: true,
	default: () => mockReduxIsAtomic(),
} ) );
jest.mock( 'calypso/state/selectors/is-private-site', () => ( {
	__esModule: true,
	default: () => mockReduxIsPrivate(),
} ) );
const mockSelectedSiteId = jest.fn();
jest.mock( 'calypso/state/ui/selectors', () => ( {
	getSelectedSiteId: () => mockSelectedSiteId(),
} ) );

const mockIsEnabled = isEnabled as jest.MockedFunction< typeof isEnabled >;
const mockFetchSite = fetchSite as jest.MockedFunction< typeof fetchSite >;

const SITE_ID = 4321;

function sharedSite( overrides: Partial< Site > = {} ): Site {
	return {
		ID: SITE_ID,
		slug: 'jetpack.example.com',
		jetpack: true,
		jetpack_connection: true,
		is_wpcom_atomic: false,
		is_wpcom_flex: false,
		is_garden: false,
		garden_name: null,
		is_private: false,
		options: { admin_url: 'https://jetpack.example.com/wp-admin/' },
		...overrides,
	} as Site;
}

function renderFacts( siteId: number | undefined, siteSlug?: string ) {
	const queryClient = new QueryClient( { defaultOptions: { queries: { retry: false } } } );
	const wrapper = ( { children }: { children: ReactNode } ) => (
		<QueryClientProvider client={ queryClient }>{ children }</QueryClientProvider>
	);
	return renderHook( () => useCheckoutSiteFacts( siteId, siteSlug ), { wrapper } );
}

beforeEach( () => {
	jest.clearAllMocks();
	mockReduxSiteIdForSlug.mockReturnValue( SITE_ID );
	mockReduxSlug.mockReturnValue( 'jetpack.example.com' );
	mockReduxIsJetpack.mockReturnValue( true );
	mockReduxIsAtomic.mockReturnValue( false );
	mockReduxIsCommerceGarden.mockReturnValue( false );
	mockReduxIsPrivate.mockReturnValue( false );
	mockSelectedSiteId.mockReturnValue( 555 );
	mockFetchSite.mockResolvedValue( sharedSite() );
} );

describe( 'the site facts with the shared query', () => {
	beforeEach( () => {
		mockIsEnabled.mockImplementation( ( flag ) => flag === 'checkout/shared-foundation' );
	} );

	it( 'answers from the shared site once it arrives', async () => {
		const { result } = renderFacts( SITE_ID );

		await waitFor( () => expect( result.current.slug ).toBe( 'jetpack.example.com' ) );
		expect( result.current.isJetpack ).toBe( true );
		expect( mockReduxSlug ).not.toHaveBeenCalled();
	} );

	it( 'reports every branch off while the site is still loading', async () => {
		const { result } = renderFacts( SITE_ID );

		expect( result.current.isJetpack ).toBe( false );
		expect( result.current.isAtomic ).toBe( false );
		expect( result.current.slug ).toBeUndefined();

		await waitFor( () => expect( mockFetchSite ).toHaveBeenCalled() );
	} );

	it( 'asks for nothing when there is no site', async () => {
		const { result } = renderFacts( undefined );

		await waitFor( () => expect( result.current.isJetpack ).toBe( false ) );
		expect( mockFetchSite ).not.toHaveBeenCalled();
	} );

	it( 'reports every branch off when the site cannot be fetched', async () => {
		mockFetchSite.mockRejectedValue( new Error( 'nope' ) );

		const { result } = renderFacts( SITE_ID );

		await waitFor( () => expect( mockFetchSite ).toHaveBeenCalled() );
		expect( result.current.isJetpack ).toBe( false );
		expect( result.current.slug ).toBeUndefined();
	} );
} );

describe( 'the site facts with the flag off', () => {
	beforeEach( () => {
		mockIsEnabled.mockReturnValue( false );
	} );

	it( 'answers each fact through the selector Calypso already had', async () => {
		const { result } = renderFacts( SITE_ID );

		expect( result.current.slug ).toBe( 'jetpack.example.com' );
		expect( result.current.isJetpack ).toBe( true );
		expect( mockReduxSlug ).toHaveBeenCalled();
		expect( mockReduxIsJetpack ).toHaveBeenCalled();
		await waitFor( () => expect( mockFetchSite ).not.toHaveBeenCalled() );
	} );

	it( 'reports Atomic and Commerce garden separately, as the call sites need', () => {
		mockReduxIsAtomic.mockReturnValue( true );
		mockReduxIsCommerceGarden.mockReturnValue( true );

		const { result } = renderFacts( SITE_ID );

		expect( result.current.isAtomic ).toBe( true );
		expect( result.current.isCommerceGarden ).toBe( true );
		// Still Jetpack: an Atomic site runs it. Call sites that mean
		// "Jetpack, but not hosted here" combine the two themselves.
		expect( result.current.isJetpack ).toBe( true );
	} );

	it( 'carries the private answer that falls back to the site settings', () => {
		mockReduxIsPrivate.mockReturnValue( true );

		const { result } = renderFacts( SITE_ID );

		expect( result.current.isPrivate ).toBe( true );
	} );

	it( 'has nothing to answer with when there is no site to look up', () => {
		mockReduxSiteIdForSlug.mockReturnValue( undefined );

		const { result } = renderFacts( undefined );

		expect( result.current.slug ).toBeUndefined();
		expect( result.current.isJetpack ).toBe( false );
	} );
} );

describe( 'the site facts when only the slug is known', () => {
	it( 'looks the site up by slug on the shared query', async () => {
		mockIsEnabled.mockImplementation( ( flag ) => flag === 'checkout/shared-foundation' );

		const { result } = renderFacts( undefined, 'jetpack.example.com' );

		await waitFor( () => expect( result.current.isJetpack ).toBe( true ) );
		expect( mockFetchSite ).toHaveBeenCalledWith( 'jetpack.example.com' );
	} );

	it( 'looks the site up by slug in Redux with the flag off', () => {
		mockIsEnabled.mockReturnValue( false );

		const { result } = renderFacts( undefined, 'jetpack.example.com' );

		expect( mockReduxSlug ).toHaveBeenCalled();
		expect( result.current.isJetpack ).toBe( true );
	} );
} );

describe( 'the site the app has selected', () => {
	const host = createTestCheckoutHost( { siteId: 777 } );

	function renderSelectedSiteId( { withHost }: { withHost: boolean } ) {
		return renderHook( () => useCheckoutSelectedSiteId(), {
			wrapper: ( { children }: { children: ReactNode } ) =>
				withHost ? (
					<CheckoutHostProvider value={ host }>{ children }</CheckoutHostProvider>
				) : (
					<>{ children }</>
				),
		} ).result;
	}

	it( "is the host's site when the flag is on and a host is mounted", () => {
		mockIsEnabled.mockImplementation( ( flag ) => flag === 'checkout/shared-foundation' );

		expect( renderSelectedSiteId( { withHost: true } ).current ).toBe( 777 );
	} );

	it( "is Calypso's selected site with the flag off", () => {
		mockIsEnabled.mockReturnValue( false );

		expect( renderSelectedSiteId( { withHost: true } ).current ).toBe( 555 );
	} );

	it( "is Calypso's selected site when no host is mounted, whatever the flag says", () => {
		mockIsEnabled.mockImplementation( ( flag ) => flag === 'checkout/shared-foundation' );

		expect( renderSelectedSiteId( { withHost: false } ).current ).toBe( 555 );
	} );
} );
