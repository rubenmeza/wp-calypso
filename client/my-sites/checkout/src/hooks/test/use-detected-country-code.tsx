/**
 * @jest-environment jsdom
 */
import { isEnabled } from '@automattic/calypso-config';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import useDetectedCountryCode from '../use-detected-country-code';
import type { ReactNode } from 'react';

jest.mock( '@automattic/calypso-config', () => {
	const config = jest.fn();
	return Object.assign( config, { __esModule: true, default: config, isEnabled: jest.fn() } );
} );

const mockLoadCountryCodeFromGeoIP = jest.fn();
const mockContactInfoCountryCode = jest.fn();
jest.mock( '../../lib/wpcom-store', () => {
	const { createReduxStore, register } = jest.requireActual( '@wordpress/data' );
	const store = createReduxStore( 'test-detected-country-code', {
		reducer: ( state = {} ) => state,
		actions: {
			loadCountryCodeFromGeoIP( payload: string ) {
				mockLoadCountryCodeFromGeoIP( payload );
				return { type: 'LOAD_COUNTRY_CODE_FROM_GEOIP', payload };
			},
		},
		selectors: {
			getContactInfo: () => ( { countryCode: { value: mockContactInfoCountryCode() } } ),
		},
	} );
	register( store );
	return { CHECKOUT_STORE: store };
} );

const mockGetCurrentUserCountryCode = jest.fn();
jest.mock( 'calypso/state', () => ( {
	useSelector: ( selector: () => unknown ) => selector(),
} ) );
jest.mock( 'calypso/state/current-user/selectors', () => ( {
	getCurrentUserCountryCode: () => mockGetCurrentUserCountryCode(),
} ) );

const mockIsEnabled = isEnabled as jest.MockedFunction< typeof isEnabled >;
const mockFetch = jest.fn();

function geoResponds( countryShort: string ) {
	mockFetch.mockResolvedValue( {
		ok: true,
		json: async () => ( { country_short: countryShort } ),
	} );
}

function renderDetection() {
	const queryClient = new QueryClient( {
		defaultOptions: { queries: { retry: false } },
	} );
	const wrapper = ( { children }: { children: ReactNode } ) => (
		<QueryClientProvider client={ queryClient }>{ children }</QueryClientProvider>
	);
	return renderHook( () => useDetectedCountryCode(), { wrapper } );
}

beforeEach( () => {
	jest.clearAllMocks();
	global.fetch = mockFetch as unknown as typeof global.fetch;
	mockGetCurrentUserCountryCode.mockReturnValue( 'US' );
	mockContactInfoCountryCode.mockReturnValue( '' );
	geoResponds( 'FR' );
} );

describe( 'country detection with the shared geo query', () => {
	beforeEach( () => {
		mockIsEnabled.mockImplementation( ( flag ) => flag === 'checkout/query-geo' );
	} );

	it( 'gives the store the country the geo query reports', async () => {
		renderDetection();

		await waitFor( () => expect( mockLoadCountryCodeFromGeoIP ).toHaveBeenCalledWith( 'FR' ) );
	} );

	it( 'waits for the query rather than falling back to the user record', async () => {
		let respond: ( () => void ) | undefined;
		mockFetch.mockReturnValue(
			new Promise( ( resolve ) => {
				respond = () => resolve( { ok: true, json: async () => ( { country_short: 'FR' } ) } );
			} )
		);

		renderDetection();

		await waitFor( () => expect( mockFetch ).toHaveBeenCalled() );
		expect( mockLoadCountryCodeFromGeoIP ).not.toHaveBeenCalled();

		respond?.();
		await waitFor( () => expect( mockLoadCountryCodeFromGeoIP ).toHaveBeenCalledWith( 'FR' ) );
	} );

	it( 'leaves alone a country the contact details already answered', async () => {
		mockContactInfoCountryCode.mockReturnValue( 'DE' );

		renderDetection();

		await waitFor( () => expect( mockFetch ).toHaveBeenCalled() );
		await waitFor( () => expect( mockContactInfoCountryCode ).toHaveBeenCalled() );
		expect( mockLoadCountryCodeFromGeoIP ).not.toHaveBeenCalled();
	} );

	it( 'tells the store once, however often it re-renders', async () => {
		const { rerender } = renderDetection();

		await waitFor( () => expect( mockLoadCountryCodeFromGeoIP ).toHaveBeenCalledTimes( 1 ) );

		rerender();
		rerender();

		expect( mockLoadCountryCodeFromGeoIP ).toHaveBeenCalledTimes( 1 );
	} );
} );

describe( 'country detection with the flag off', () => {
	beforeEach( () => {
		mockIsEnabled.mockReturnValue( false );
	} );

	it( 'keeps giving the store the country from the user record', async () => {
		renderDetection();

		await waitFor( () => expect( mockLoadCountryCodeFromGeoIP ).toHaveBeenCalledWith( 'US' ) );
	} );

	it( 'asks the geo endpoint for nothing', async () => {
		renderDetection();

		await waitFor( () => expect( mockLoadCountryCodeFromGeoIP ).toHaveBeenCalled() );
		expect( mockFetch ).not.toHaveBeenCalled();
	} );

	it( 'has nothing to give the store when the user record has no country', async () => {
		mockGetCurrentUserCountryCode.mockReturnValue( undefined );

		renderDetection();

		await waitFor( () => expect( mockFetch ).not.toHaveBeenCalled() );
		expect( mockLoadCountryCodeFromGeoIP ).not.toHaveBeenCalled();
	} );
} );
