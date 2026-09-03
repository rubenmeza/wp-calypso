/**
 * @jest-environment jsdom
 */
import { fetchTransactionsSupportedCountries } from '@automattic/api-core';
import { isEnabled } from '@automattic/calypso-config';
import { QueryClient, QueryClientProvider, dehydrate } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import wp from 'calypso/lib/wp';
import { shouldDehydrateQuery } from 'calypso/state/should-dehydrate-query';
import { useCheckoutCountryList, useCheckoutTaxName } from '../use-checkout-country-list';
import { isVatSupported } from '../use-country-list';
import type { ReactNode } from 'react';

jest.mock( '@automattic/calypso-config', () => {
	const config = jest.fn();
	return Object.assign( config, { __esModule: true, default: config, isEnabled: jest.fn() } );
} );

jest.mock( 'calypso/lib/wp', () => ( {
	__esModule: true,
	default: { req: { get: jest.fn() } },
} ) );

jest.mock( '@automattic/api-core', () => ( {
	...jest.requireActual( '@automattic/api-core' ),
	fetchTransactionsSupportedCountries: jest.fn(),
} ) );

const mockIsEnabled = isEnabled as jest.MockedFunction< typeof isEnabled >;
const mockSharedFetch = fetchTransactionsSupportedCountries as jest.MockedFunction<
	typeof fetchTransactionsSupportedCountries
>;
const mockLegacyGet = wp.req.get as jest.Mock;

const countries = [
	{
		code: 'GB',
		name: 'United Kingdom',
		vat_supported: true as const,
		tax_country_codes: [ 'GB', 'XI' ],
		tax_name: 'VAT',
	},
	{ code: 'US', name: 'United States', vat_supported: false as const },
];

function renderCountries< T >( hook: () => T ) {
	const queryClient = new QueryClient( { defaultOptions: { queries: { retry: false } } } );
	const wrapper = ( { children }: { children: ReactNode } ) => (
		<QueryClientProvider client={ queryClient }>{ children }</QueryClientProvider>
	);
	return renderHook( hook, { wrapper } );
}

beforeEach( () => {
	jest.clearAllMocks();
	mockSharedFetch.mockResolvedValue( countries );
} );

describe( 'the country list with the shared query', () => {
	beforeEach( () => {
		mockIsEnabled.mockImplementation( ( flag ) => flag === 'checkout/shared-foundation' );
	} );

	it( 'comes from the shared query, and the older read stays quiet', async () => {
		const { result } = renderCountries( () => useCheckoutCountryList() );

		await waitFor( () => expect( result.current ).toHaveLength( 2 ) );

		expect( mockSharedFetch ).toHaveBeenCalledTimes( 1 );
		expect( mockLegacyGet ).not.toHaveBeenCalled();
	} );

	it( 'still knows which countries need a VAT id', async () => {
		const { result } = renderCountries( () => useCheckoutCountryList() );

		await waitFor( () => expect( result.current ).toHaveLength( 2 ) );

		const [ gb, us ] = result.current;
		expect( isVatSupported( gb ) ).toBe( true );
		expect( isVatSupported( us ) ).toBe( false );
		expect( isVatSupported( gb ) && gb.tax_country_codes ).toEqual( [ 'GB', 'XI' ] );
	} );

	it( 'asks for the locale it was given', async () => {
		renderCountries( () => useCheckoutCountryList( 'fr' ) );

		await waitFor( () => expect( mockSharedFetch ).toHaveBeenCalledWith( 'fr' ) );
	} );

	it( 'names the tax for a country', async () => {
		const { result } = renderCountries( () => useCheckoutTaxName( 'GB' ) );

		await waitFor( () => expect( result.current ).toBe( 'VAT' ) );
	} );
} );

describe( 'the country list with the flag off', () => {
	beforeEach( () => {
		mockIsEnabled.mockReturnValue( false );
	} );

	// Both reads share one fetcher, so the fetch count is what separates them.
	it( 'keeps coming from the older read, and only it fetches', async () => {
		const { result } = renderCountries( () => useCheckoutCountryList() );

		await waitFor( () => expect( result.current ).toHaveLength( 2 ) );

		expect( mockSharedFetch ).toHaveBeenCalledTimes( 1 );
		expect( mockLegacyGet ).not.toHaveBeenCalled();
	} );

	it( 'still knows which countries need a VAT id', async () => {
		const { result } = renderCountries( () => useCheckoutCountryList() );

		await waitFor( () => expect( result.current ).toHaveLength( 2 ) );

		expect( isVatSupported( result.current[ 0 ] ) ).toBe( true );
	} );

	it( 'asks for the locale it was given', async () => {
		renderCountries( () => useCheckoutCountryList( 'fr' ) );

		await waitFor( () => expect( mockSharedFetch ).toHaveBeenCalledWith( 'fr' ) );
	} );
} );

describe( 'the country list and the on-disk cache', () => {
	it.each( [
		[ 'the shared query', true ],
		[ 'the older read', false ],
	] )( 'is not written to storage by %s', async ( _name, isFlagOn ) => {
		mockIsEnabled.mockImplementation(
			( flag ) => isFlagOn && flag === 'checkout/shared-foundation'
		);
		const queryClient = new QueryClient( { defaultOptions: { queries: { retry: false } } } );
		const wrapper = ( { children }: { children: ReactNode } ) => (
			<QueryClientProvider client={ queryClient }>{ children }</QueryClientProvider>
		);

		const { result } = renderHook( () => useCheckoutCountryList(), { wrapper } );
		await waitFor( () => expect( result.current ).toHaveLength( 2 ) );

		expect( dehydrate( queryClient, { shouldDehydrateQuery } ).queries ).toHaveLength( 0 );
	} );
} );
