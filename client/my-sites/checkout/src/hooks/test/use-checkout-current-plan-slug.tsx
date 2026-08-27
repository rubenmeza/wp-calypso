/**
 * @jest-environment jsdom
 */
import { fetchSitePlans } from '@automattic/api-core';
import { isEnabled } from '@automattic/calypso-config';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { useCheckoutCurrentPlanSlug } from '../use-checkout-current-plan-slug';
import type { ReactNode } from 'react';

jest.mock( '@automattic/calypso-config', () => {
	const config = jest.fn();
	return Object.assign( config, { __esModule: true, default: config, isEnabled: jest.fn() } );
} );

jest.mock( '@automattic/api-core', () => ( {
	...jest.requireActual( '@automattic/api-core' ),
	fetchSitePlans: jest.fn(),
} ) );

const mockReduxCurrentPlan = jest.fn();
jest.mock( 'calypso/state', () => ( {
	useSelector: ( selector: ( state: unknown ) => unknown ) => selector( {} ),
} ) );
jest.mock( 'calypso/state/sites/plans/selectors', () => ( {
	getCurrentPlan: () => mockReduxCurrentPlan(),
} ) );

const mockIsEnabled = isEnabled as jest.MockedFunction< typeof isEnabled >;
const mockFetchSitePlans = fetchSitePlans as jest.MockedFunction< typeof fetchSitePlans >;

const SITE_ID = 99;

function renderPlanSlug( siteId: number | undefined ) {
	const queryClient = new QueryClient( { defaultOptions: { queries: { retry: false } } } );
	const wrapper = ( { children }: { children: ReactNode } ) => (
		<QueryClientProvider client={ queryClient }>{ children }</QueryClientProvider>
	);
	return renderHook( () => useCheckoutCurrentPlanSlug( siteId ), { wrapper } );
}

beforeEach( () => {
	jest.clearAllMocks();
	mockReduxCurrentPlan.mockReturnValue( { productSlug: 'business-bundle' } );
	mockFetchSitePlans.mockResolvedValue( {
		plans: [
			{ product_slug: 'value_bundle', current_plan: false },
			{ product_slug: 'business-bundle', current_plan: true },
		],
	} as Awaited< ReturnType< typeof fetchSitePlans > > );
} );

describe( 'the current plan slug with the shared query', () => {
	beforeEach( () => {
		mockIsEnabled.mockImplementation( ( flag ) => flag === 'checkout/shared-foundation' );
	} );

	it( 'is the slug of the plan the site is on', async () => {
		const { result } = renderPlanSlug( SITE_ID );

		await waitFor( () => expect( result.current ).toBe( 'business-bundle' ) );
		expect( mockReduxCurrentPlan ).not.toHaveBeenCalled();
	} );

	it( 'is absent while the plans are loading', () => {
		const { result } = renderPlanSlug( SITE_ID );

		expect( result.current ).toBeUndefined();
	} );

	it( 'is absent, rather than an error, when the site is on no plan', async () => {
		mockFetchSitePlans.mockResolvedValue( { plans: [] } as Awaited<
			ReturnType< typeof fetchSitePlans >
		> );

		const { result } = renderPlanSlug( SITE_ID );

		await waitFor( () => expect( mockFetchSitePlans ).toHaveBeenCalled() );
		expect( result.current ).toBeUndefined();
	} );

	it( 'asks for nothing when there is no site', async () => {
		const { result } = renderPlanSlug( undefined );

		await waitFor( () => expect( result.current ).toBeUndefined() );
		expect( mockFetchSitePlans ).not.toHaveBeenCalled();
	} );
} );

describe( 'the current plan slug with the flag off', () => {
	beforeEach( () => {
		mockIsEnabled.mockReturnValue( false );
	} );

	it( 'keeps reading the plan Redux holds', () => {
		const { result } = renderPlanSlug( SITE_ID );

		expect( result.current ).toBe( 'business-bundle' );
		expect( mockFetchSitePlans ).not.toHaveBeenCalled();
	} );

	it( 'is absent when Redux has no plan for the site', () => {
		mockReduxCurrentPlan.mockReturnValue( undefined );

		const { result } = renderPlanSlug( SITE_ID );

		expect( result.current ).toBeUndefined();
	} );
} );
