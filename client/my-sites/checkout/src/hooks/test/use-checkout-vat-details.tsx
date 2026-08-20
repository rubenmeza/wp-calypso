/**
 * @jest-environment jsdom
 */
import { fetchUserTaxDetails, updateUserTaxDetails } from '@automattic/api-core';
import { isEnabled } from '@automattic/calypso-config';
import { QueryClient, QueryClientProvider, dehydrate } from '@tanstack/react-query';
import { renderHook, waitFor, act } from '@testing-library/react';
import wp from 'calypso/lib/wp';
import { shouldDehydrateQuery } from 'calypso/state/should-dehydrate-query';
import { useCheckoutVatDetails } from '../use-checkout-vat-details';
import type { ReactNode } from 'react';

jest.mock( '@automattic/calypso-config', () => {
	const config = jest.fn();
	return Object.assign( config, { __esModule: true, default: config, isEnabled: jest.fn() } );
} );

jest.mock( 'calypso/lib/wp', () => ( {
	__esModule: true,
	default: { req: { get: jest.fn(), post: jest.fn() } },
} ) );

jest.mock( '@automattic/api-core', () => ( {
	...jest.requireActual( '@automattic/api-core' ),
	fetchUserTaxDetails: jest.fn(),
	updateUserTaxDetails: jest.fn(),
} ) );

const mockIsEnabled = isEnabled as jest.MockedFunction< typeof isEnabled >;
const mockSharedFetch = fetchUserTaxDetails as jest.MockedFunction< typeof fetchUserTaxDetails >;
const mockSharedUpdate = updateUserTaxDetails as jest.MockedFunction< typeof updateUserTaxDetails >;
const mockLegacyGet = wp.req.get as jest.Mock;
const mockLegacyPost = wp.req.post as jest.Mock;

const savedVatDetails = {
	country: 'GB',
	id: '12345',
	name: 'A Business',
	address: '123 Main Street',
};

function renderVatDetails() {
	const queryClient = new QueryClient( { defaultOptions: { queries: { retry: false } } } );
	const wrapper = ( { children }: { children: ReactNode } ) => (
		<QueryClientProvider client={ queryClient }>{ children }</QueryClientProvider>
	);
	return { queryClient, ...renderHook( () => useCheckoutVatDetails(), { wrapper } ) };
}

/** What the save actually sent, whichever path took it. */
function sentVatDetails() {
	if ( mockSharedUpdate.mock.calls.length ) {
		return mockSharedUpdate.mock.calls[ 0 ][ 0 ];
	}
	return mockLegacyPost.mock.calls[ 0 ][ 0 ].body;
}

beforeEach( () => {
	jest.clearAllMocks();
	mockSharedFetch.mockResolvedValue( savedVatDetails );
	mockSharedUpdate.mockResolvedValue( savedVatDetails );
	mockLegacyGet.mockResolvedValue( savedVatDetails );
	mockLegacyPost.mockResolvedValue( savedVatDetails );
} );

describe( 'the VAT details with the shared query', () => {
	beforeEach( () => {
		mockIsEnabled.mockImplementation( ( flag ) => flag === 'checkout/shared-foundation' );
	} );

	it( 'reads the saved details from the shared query', async () => {
		const { result } = renderVatDetails();

		await waitFor( () => expect( result.current.vatDetails ).toEqual( savedVatDetails ) );

		expect( mockSharedFetch ).toHaveBeenCalledTimes( 1 );
		expect( mockLegacyGet ).not.toHaveBeenCalled();
	} );

	it( 'saves through the shared mutation', async () => {
		const { result } = renderVatDetails();
		await waitFor( () => expect( result.current.vatDetails ).toEqual( savedVatDetails ) );

		await act( async () => {
			await result.current.setVatDetails( { country: 'GB', id: '999', name: 'B', address: 'C' } );
		} );

		expect( mockSharedUpdate ).toHaveBeenCalledTimes( 1 );
		expect( mockLegacyPost ).not.toHaveBeenCalled();
	} );

	it( 'leaves the older read alone', async () => {
		renderVatDetails();

		await waitFor( () => expect( mockSharedFetch ).toHaveBeenCalled() );
		expect( mockLegacyGet ).not.toHaveBeenCalled();
	} );

	it( 'refreshes what the older read would answer, so both stay in step', async () => {
		const { result, queryClient } = renderVatDetails();
		await waitFor( () => expect( result.current.vatDetails ).toEqual( savedVatDetails ) );

		const saved = { country: 'GB', id: '999', name: 'B', address: 'C' };
		mockSharedUpdate.mockResolvedValue( saved );
		await act( async () => {
			await result.current.setVatDetails( saved );
		} );

		await waitFor( () => expect( queryClient.getQueryData( [ 'vat-details' ] ) ).toEqual( saved ) );
	} );

	it( 'surfaces the failure the shopper needs to see', async () => {
		mockSharedUpdate.mockRejectedValue( { error: 'invalid_vat', message: 'Bad VAT id' } );
		const { result } = renderVatDetails();
		await waitFor( () => expect( result.current.vatDetails ).toEqual( savedVatDetails ) );

		await expect(
			act( async () => {
				await result.current.setVatDetails( savedVatDetails );
			} )
		).rejects.toMatchObject( { error: 'invalid_vat' } );
	} );
} );

describe( 'the VAT details with the flag off', () => {
	beforeEach( () => {
		mockIsEnabled.mockReturnValue( false );
	} );

	it( 'keeps reading and writing through the older path', async () => {
		const { result } = renderVatDetails();
		await waitFor( () => expect( result.current.vatDetails ).toEqual( savedVatDetails ) );

		await act( async () => {
			await result.current.setVatDetails( { country: 'GB', id: '999', name: 'B', address: 'C' } );
		} );

		expect( mockLegacyGet ).toHaveBeenCalledWith( '/me/vat-info' );
		expect( mockLegacyPost ).toHaveBeenCalled();
		expect( mockSharedFetch ).not.toHaveBeenCalled();
		expect( mockSharedUpdate ).not.toHaveBeenCalled();
	} );
} );

describe( 'the VAT id a shopper types', () => {
	it.each( [
		[ 'the shared mutation', true ],
		[ 'the older path', false ],
	] )( 'reaches %s without the country code the shopper prefixed', async ( _name, isFlagOn ) => {
		mockIsEnabled.mockImplementation(
			( flag ) => isFlagOn && flag === 'checkout/shared-foundation'
		);
		const { result } = renderVatDetails();
		await waitFor( () => expect( result.current.vatDetails ).toEqual( savedVatDetails ) );

		await act( async () => {
			await result.current.setVatDetails( {
				country: 'GB',
				id: 'GB12345',
				name: 'A',
				address: 'B',
			} );
		} );

		expect( sentVatDetails() ).toMatchObject( { country: 'GB', id: '12345' } );
	} );

	it.each( [
		[ 'the shared mutation', true ],
		[ 'the older path', false ],
	] )( 'reaches %s without the Swiss prefix either', async ( _name, isFlagOn ) => {
		mockIsEnabled.mockImplementation(
			( flag ) => isFlagOn && flag === 'checkout/shared-foundation'
		);
		const { result } = renderVatDetails();
		await waitFor( () => expect( result.current.vatDetails ).toEqual( savedVatDetails ) );

		await act( async () => {
			await result.current.setVatDetails( {
				country: 'CH',
				id: 'CHE-12345',
				name: 'A',
				address: 'B',
			} );
		} );

		expect( sentVatDetails() ).toMatchObject( { country: 'CH', id: '12345' } );
	} );
} );

describe( 'the business flag on the VAT details', () => {
	it.each( [
		[ 'the shared mutation', true ],
		[ 'the older path', false ],
	] )( 'still reaches the endpoint through %s', async ( _name, isFlagOn ) => {
		mockIsEnabled.mockImplementation(
			( flag ) => isFlagOn && flag === 'checkout/shared-foundation'
		);
		const { result } = renderVatDetails();
		await waitFor( () => expect( result.current.vatDetails ).toEqual( savedVatDetails ) );

		await act( async () => {
			await result.current.setVatDetails( { ...savedVatDetails, isForBusiness: true } );
		} );

		expect( sentVatDetails() ).toMatchObject( { isForBusiness: true } );
	} );
} );

describe( 'the saved VAT details and the on-disk cache', () => {
	it.each( [
		[ 'the shared query', true ],
		[ 'the older read', false ],
	] )( 'are not written to storage by %s', async ( _name, isFlagOn ) => {
		mockIsEnabled.mockImplementation(
			( flag ) => isFlagOn && flag === 'checkout/shared-foundation'
		);
		const { result, queryClient } = renderVatDetails();

		await waitFor( () => expect( result.current.vatDetails ).toEqual( savedVatDetails ) );

		expect( dehydrate( queryClient, { shouldDehydrateQuery } ).queries ).toHaveLength( 0 );
	} );
} );
