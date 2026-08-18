/**
 * @jest-environment jsdom
 */
import { fetchUserPaymentMethods, requestPaymentMethodDeletion } from '@automattic/api-core';
import { isEnabled } from '@automattic/calypso-config';
import { QueryClient, QueryClientProvider, dehydrate } from '@tanstack/react-query';
import { renderHook, waitFor, act } from '@testing-library/react';
import wp from 'calypso/lib/wp';
import { shouldDehydrateQuery } from 'calypso/state/should-dehydrate-query';
import { useCheckoutStoredPaymentMethods } from '../use-checkout-stored-payment-methods';
import type { StoredPaymentMethodCard } from '@automattic/wpcom-checkout';
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
	fetchUserPaymentMethods: jest.fn(),
	requestPaymentMethodDeletion: jest.fn(),
} ) );

const mockIsEnabled = isEnabled as jest.MockedFunction< typeof isEnabled >;
const mockSharedFetch = fetchUserPaymentMethods as jest.MockedFunction<
	typeof fetchUserPaymentMethods
>;
const mockSharedDelete = requestPaymentMethodDeletion as jest.MockedFunction<
	typeof requestPaymentMethodDeletion
>;
const mockLegacyGet = wp.req.get as jest.Mock;
const mockLegacyPost = wp.req.post as jest.Mock;

const savedCard: StoredPaymentMethodCard = {
	stored_details_id: 'card-1',
	user_id: '5432',
	name: 'A Cardholder',
	country_code: 'US',
	payment_partner: 'stripe',
	payment_partner_reference: '',
	payment_partner_source_id: '',
	mp_ref: 'mock-mp-ref',
	email: '',
	card_expiry_year: '2080',
	card_expiry_month: '01',
	expiry: '2080-01-31',
	remember: true,
	source: '',
	original_stored_details_id: '',
	is_rechargeable: true,
	payment_type: '',
	is_expired: false,
	is_backup: false,
	tax_location: null,
	card_type: 'mastercard',
	card_iin: '',
	card_last_4: '4242',
	card_zip: '',
	display_brand: null,
};

function wrapper( { children }: { children: ReactNode } ) {
	const queryClient = new QueryClient( {
		defaultOptions: { queries: { retry: false } },
	} );
	return <QueryClientProvider client={ queryClient }>{ children }</QueryClientProvider>;
}

function renderCards() {
	return renderHook( () => useCheckoutStoredPaymentMethods( { type: 'card' } ), { wrapper } );
}

function setSharedQueryFlag( enabled: boolean ) {
	mockIsEnabled.mockImplementation(
		( flag ) => flag === 'checkout/query-payment-methods' && enabled
	);
}

describe( 'useCheckoutStoredPaymentMethods', () => {
	beforeEach( () => {
		jest.clearAllMocks();
		mockLegacyGet.mockResolvedValue( [ savedCard ] );
		mockSharedFetch.mockResolvedValue( [ savedCard ] );
	} );

	it( 'reads the saved cards through the shared query with the flag on', async () => {
		setSharedQueryFlag( true );

		const { result } = renderCards();

		await waitFor( () => expect( result.current.isLoading ).toBe( false ) );
		expect( result.current.paymentMethods ).toEqual( [ savedCard ] );
		expect( mockSharedFetch ).toHaveBeenCalledWith( 'card', false );
		// The old read must not fire as well, or checkout pays for the card list twice.
		expect( mockLegacyGet ).not.toHaveBeenCalled();
	} );

	it( 'reads the saved cards through the old read with the flag off', async () => {
		setSharedQueryFlag( false );

		const { result } = renderCards();

		await waitFor( () => expect( result.current.isLoading ).toBe( false ) );
		expect( result.current.paymentMethods ).toEqual( [ savedCard ] );
		expect( mockLegacyGet ).toHaveBeenCalledWith( '/me/payment-methods', {
			type: 'card',
			expired: 'exclude',
			apiVersion: '1.2',
		} );
		expect( mockSharedFetch ).not.toHaveBeenCalled();
	} );

	it( 'fetches nothing at all when there is no logged-in user', async () => {
		setSharedQueryFlag( true );

		const { result } = renderHook(
			() => useCheckoutStoredPaymentMethods( { type: 'card', isLoggedOut: true } ),
			{ wrapper }
		);

		expect( result.current.isLoading ).toBe( false );
		expect( mockSharedFetch ).not.toHaveBeenCalled();
		expect( mockLegacyGet ).not.toHaveBeenCalled();
	} );

	it( 'filters to business cards the same way in both flag states', async () => {
		const businessCard: StoredPaymentMethodCard = {
			...savedCard,
			stored_details_id: 'card-2',
			tax_location: { is_for_business: true },
		};
		mockLegacyGet.mockResolvedValue( [ savedCard, businessCard ] );
		mockSharedFetch.mockResolvedValue( [ savedCard, businessCard ] );

		for ( const flagOn of [ true, false ] ) {
			setSharedQueryFlag( flagOn );
			const { result } = renderHook(
				() => useCheckoutStoredPaymentMethods( { type: 'card', isForBusiness: true } ),
				{ wrapper }
			);
			await waitFor( () => expect( result.current.isLoading ).toBe( false ) );
			expect( result.current.paymentMethods ).toEqual( [ businessCard ] );
		}
	} );

	it( 'reports no cards, not junk, when the endpoint returns something else', async () => {
		// The endpoint has been seen returning a non-array on error. Consumers
		// call `.length` and `.filter` on this, so both flag states have to hand
		// back a list either way.
		const notAList = { error: 'unauthorized' } as unknown as StoredPaymentMethodCard[];

		for ( const flagOn of [ true, false ] ) {
			setSharedQueryFlag( flagOn );
			mockLegacyGet.mockResolvedValue( notAList );
			mockSharedFetch.mockResolvedValue( notAList );

			const { result } = renderCards();

			await waitFor( () => expect( result.current.isLoading ).toBe( false ) );
			expect( result.current.paymentMethods ).toEqual( [] );
			expect( result.current.error ).toMatch( /problem loading/i );
		}
	} );

	it( 'keeps the card details out of the cache Calypso writes to disk', async () => {
		// Checkout runs on Calypso's query client, whose persister has its own
		// policy file. Both flag states have to be covered by it, not just the
		// shared query's own.
		for ( const flagOn of [ true, false ] ) {
			setSharedQueryFlag( flagOn );
			const queryClient = new QueryClient( { defaultOptions: { queries: { retry: false } } } );
			const { result } = renderHook( () => useCheckoutStoredPaymentMethods( { type: 'card' } ), {
				wrapper: ( { children }: { children: ReactNode } ) => (
					<QueryClientProvider client={ queryClient }>{ children }</QueryClientProvider>
				),
			} );

			await waitFor( () => expect( result.current.paymentMethods ).toHaveLength( 1 ) );

			const dehydrated = dehydrate( queryClient, { shouldDehydrateQuery } );

			expect( dehydrated.queries ).toHaveLength( 0 );
			expect( JSON.stringify( dehydrated ) ).not.toContain( '4242' );
		}
	} );

	describe( 'deleting a card', () => {
		it( 'refreshes the list through the shared query with the flag on', async () => {
			setSharedQueryFlag( true );
			mockSharedDelete.mockResolvedValue( undefined );

			const { result } = renderCards();
			await waitFor( () => expect( result.current.isLoading ).toBe( false ) );

			mockSharedFetch.mockResolvedValue( [] );
			await act( async () => {
				await result.current.deletePaymentMethod( 'card-1' );
			} );

			expect( mockSharedDelete ).toHaveBeenCalledWith( 'card-1' );
			await waitFor( () => expect( result.current.paymentMethods ).toEqual( [] ) );
		} );

		it( 'refreshes the list through the old read with the flag off', async () => {
			setSharedQueryFlag( false );
			mockLegacyPost.mockResolvedValue( undefined );

			const { result } = renderCards();
			await waitFor( () => expect( result.current.isLoading ).toBe( false ) );

			mockLegacyGet.mockResolvedValue( [] );
			await act( async () => {
				await result.current.deletePaymentMethod( 'card-1' );
			} );

			await waitFor( () => expect( result.current.paymentMethods ).toEqual( [] ) );
		} );
	} );
} );
