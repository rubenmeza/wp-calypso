/**
 * @jest-environment jsdom
 */
import { fetchOrderTransaction } from '@automattic/api-core';
import { QueryClient, QueryClientProvider, focusManager } from '@tanstack/react-query';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useOrderTransaction } from '../use-order-transaction';
import type { OrderTransaction } from '@automattic/api-core';
import type { ReactNode } from 'react';

jest.mock( '@automattic/api-core', () => ( {
	...jest.requireActual( '@automattic/api-core' ),
	fetchOrderTransaction: jest.fn(),
} ) );

const mockFetchOrder = fetchOrderTransaction as jest.MockedFunction< typeof fetchOrderTransaction >;

function order( processing_status: OrderTransaction[ 'processing_status' ], receipt_id?: number ) {
	return { order_id: 1, user_id: 2, processing_status, receipt_id };
}

function pollOrder( orderId: number | undefined, options = {} ) {
	const queryClient = new QueryClient( { defaultOptions: { queries: { retry: false } } } );
	const wrapper = ( { children }: { children: ReactNode } ) => (
		<QueryClientProvider client={ queryClient }>{ children }</QueryClientProvider>
	);
	return renderHook( () => useOrderTransaction( orderId, options ), { wrapper } );
}

beforeEach( () => {
	jest.clearAllMocks();
	jest.useFakeTimers();
} );

afterEach( () => {
	jest.useRealTimers();
} );

async function advanceBy( ms: number ) {
	await act( async () => {
		jest.advanceTimersByTime( ms );
	} );
}

/** Let the poll fire `times` times, whatever interval it chose. */
async function advanceThroughPolls( times: number ) {
	for ( let i = 0; i < times; i++ ) {
		await advanceBy( 60_000 );
	}
}

describe( 'polling an order', () => {
	it( 'reports success once the server confirms it, with the receipt', async () => {
		mockFetchOrder.mockResolvedValue( order( 'success', 6789 ) );

		const { result } = pollOrder( 12345 );

		await waitFor( () => expect( result.current.status ).toBe( 'success' ) );
		expect( result.current ).toMatchObject( { status: 'success', receiptId: 6789 } );
	} );

	it( 'keeps polling while the order is still being worked on', async () => {
		mockFetchOrder.mockResolvedValue( order( 'processing' ) );

		const { result } = pollOrder( 12345 );

		await waitFor( () => expect( mockFetchOrder ).toHaveBeenCalledTimes( 1 ) );
		expect( result.current.status ).toBe( 'polling' );

		await advanceThroughPolls( 2 );
		expect( mockFetchOrder.mock.calls.length ).toBeGreaterThan( 1 );
	} );

	it( 'treats a payment failure as final and stops asking', async () => {
		mockFetchOrder.mockResolvedValue( order( 'payment-failure' ) );

		const { result } = pollOrder( 12345 );

		await waitFor( () => expect( result.current.status ).toBe( 'failure' ) );

		const callsWhenFinal = mockFetchOrder.mock.calls.length;
		await advanceThroughPolls( 3 );
		expect( mockFetchOrder ).toHaveBeenCalledTimes( callsWhenFinal );
	} );

	it( 'treats an order error as final too', async () => {
		mockFetchOrder.mockResolvedValue( order( 'error' ) );

		const { result } = pollOrder( 12345 );

		await waitFor( () => expect( result.current.status ).toBe( 'failure' ) );
	} );

	it( 'gives up after the timeout, without calling the purchase done', async () => {
		mockFetchOrder.mockResolvedValue( order( 'processing' ) );

		const { result } = pollOrder( 12345, { timeout: 10_000, initialInterval: 1000 } );

		await waitFor( () => expect( mockFetchOrder ).toHaveBeenCalled() );
		await advanceThroughPolls( 4 );

		await waitFor( () => expect( result.current.status ).toBe( 'timeout' ) );

		const callsAtTimeout = mockFetchOrder.mock.calls.length;
		await advanceThroughPolls( 3 );
		expect( mockFetchOrder ).toHaveBeenCalledTimes( callsAtTimeout );
	} );

	it( 'asks for nothing until there is an order to ask about', async () => {
		const { result } = pollOrder( undefined );

		await act( async () => {
			jest.advanceTimersByTime( 30_000 );
		} );

		expect( mockFetchOrder ).not.toHaveBeenCalled();
		expect( result.current.status ).toBe( 'idle' );
	} );

	it( 'waits longer between polls each time, up to a cap', async () => {
		mockFetchOrder.mockResolvedValue( order( 'async-pending' ) );

		pollOrder( 12345, { initialInterval: 1000, maxInterval: 4000, timeout: 60_000 } );
		await waitFor( () => expect( mockFetchOrder ).toHaveBeenCalledTimes( 1 ) );

		await advanceBy( 999 );
		expect( mockFetchOrder ).toHaveBeenCalledTimes( 1 );
		await advanceBy( 1 );
		expect( mockFetchOrder ).toHaveBeenCalledTimes( 2 );

		await advanceBy( 1999 );
		expect( mockFetchOrder ).toHaveBeenCalledTimes( 2 );
		await advanceBy( 1 );
		expect( mockFetchOrder ).toHaveBeenCalledTimes( 3 );

		await advanceBy( 3999 );
		expect( mockFetchOrder ).toHaveBeenCalledTimes( 3 );
		await advanceBy( 1 );
		expect( mockFetchOrder ).toHaveBeenCalledTimes( 4 );

		// Held at the cap rather than doubling again.
		await advanceBy( 4000 );
		expect( mockFetchOrder ).toHaveBeenCalledTimes( 5 );
	} );
} );

describe( 'an order the server has answered for', () => {
	it( 'is not re-read when the customer comes back to the tab', async () => {
		mockFetchOrder.mockResolvedValue( order( 'success', 6789 ) );

		const { result } = pollOrder( 12345 );
		await waitFor( () => expect( result.current.status ).toBe( 'success' ) );
		const callsWhenAnswered = mockFetchOrder.mock.calls.length;

		await act( async () => {
			focusManager.setFocused( false );
		} );
		await act( async () => {
			focusManager.setFocused( true );
		} );

		expect( mockFetchOrder ).toHaveBeenCalledTimes( callsWhenAnswered );
		focusManager.setFocused( undefined );
	} );

	it( 'is still being worked on when it says success without a receipt', async () => {
		mockFetchOrder.mockResolvedValue( order( 'success' ) );

		const { result } = pollOrder( 12345 );

		await waitFor( () => expect( mockFetchOrder ).toHaveBeenCalled() );
		expect( result.current.status ).toBe( 'polling' );

		await advanceThroughPolls( 2 );
		expect( result.current.status ).toBe( 'polling' );

		// ...and finishes as a success as soon as the receipt lands.
		mockFetchOrder.mockResolvedValue( order( 'success', 6789 ) );
		await advanceThroughPolls( 1 );
		await waitFor( () => expect( result.current.status ).toBe( 'success' ) );
	} );
} );

describe( 'when the order cannot be read', () => {
	it( 'keeps asking rather than calling the purchase failed', async () => {
		mockFetchOrder.mockRejectedValue( new Error( 'network down' ) );

		const { result } = pollOrder( 12345, { initialInterval: 1000 } );

		await waitFor( () => expect( result.current.status ).toBe( 'polling' ) );
		await advanceThroughPolls( 2 );

		expect( result.current.status ).toBe( 'polling' );
		expect( mockFetchOrder.mock.calls.length ).toBeGreaterThan( 1 );
	} );
} );
