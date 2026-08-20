/**
 * @jest-environment jsdom
 */
import { isEnabled } from '@automattic/calypso-config';
import { CheckoutHostProvider } from '@automattic/checkout';
import { renderHook } from '@testing-library/react';
import {
	useCheckoutHostClose,
	useCheckoutHostNavigate,
	useCheckoutNotices,
	useCheckoutRecordEvent,
	useCheckoutSiteId,
	useCheckoutUrlParams,
} from '../use-checkout-host-bridge';
import type { CheckoutHostContext } from '@automattic/checkout';
import type { ReactNode } from 'react';

jest.mock( '@automattic/calypso-config', () => {
	const config = jest.fn();
	return Object.assign( config, { __esModule: true, default: config, isEnabled: jest.fn() } );
} );

const mockDispatch = jest.fn();
jest.mock( 'calypso/state', () => ( {
	useDispatch: () => mockDispatch,
} ) );

const mockIsEnabled = isEnabled as jest.MockedFunction< typeof isEnabled >;

const host: CheckoutHostContext = {
	siteId: 777,
	navigate: jest.fn(),
	close: jest.fn(),
	onComplete: jest.fn(),
	notices: { error: jest.fn(), info: jest.fn() },
	urlParams: new URLSearchParams( 'from=host' ),
	recordEvent: jest.fn(),
};

function withHost( { children }: { children: ReactNode } ) {
	return <CheckoutHostProvider value={ host }>{ children }</CheckoutHostProvider>;
}

function renderWithHost< T >( hook: () => T ) {
	return renderHook( hook, { wrapper: withHost } ).result;
}

describe( 'the host bridge with the flag on', () => {
	beforeEach( () => {
		jest.clearAllMocks();
		mockIsEnabled.mockImplementation( ( flag ) => flag === 'checkout/shared-foundation' );
		window.history.replaceState( {}, '', '/checkout/example.com?from=window' );
	} );

	it( 'reads the site id from the host', () => {
		expect( renderWithHost( () => useCheckoutSiteId( 1 ) ).current ).toBe( 777 );
	} );

	it( 'reads URL params from the host', () => {
		expect( renderWithHost( () => useCheckoutUrlParams() ).current.get( 'from' ) ).toBe( 'host' );
	} );

	it( 'sends notices to the host', () => {
		renderWithHost( () => useCheckoutNotices() ).current.error( 'boom', { id: 'checkout-error' } );

		expect( host.notices.error ).toHaveBeenCalledWith( 'boom', { id: 'checkout-error' } );
		expect( mockDispatch ).not.toHaveBeenCalled();
	} );

	it( 'sends events to the host', () => {
		renderWithHost( () => useCheckoutRecordEvent() ).current( 'calypso_checkout_test', { a: 1 } );

		expect( host.recordEvent ).toHaveBeenCalledWith( 'calypso_checkout_test', { a: 1 } );
		expect( mockDispatch ).not.toHaveBeenCalled();
	} );

	it( 'offers the host’s close and navigate', () => {
		expect( renderWithHost( () => useCheckoutHostClose() ).current ).toBe( host.close );
		expect( renderWithHost( () => useCheckoutHostNavigate() ).current ).toBe( host.navigate );
	} );

	it( 'lets a host say the purchase has no site at all', () => {
		const siteless = { ...host, siteId: undefined };
		const wrapper = ( { children }: { children: ReactNode } ) => (
			<CheckoutHostProvider value={ siteless }>{ children }</CheckoutHostProvider>
		);

		expect(
			renderHook( () => useCheckoutSiteId( 1 ), { wrapper } ).result.current
		).toBeUndefined();
	} );
} );

describe( 'the host bridge with the flag off', () => {
	beforeEach( () => {
		jest.clearAllMocks();
		mockIsEnabled.mockReturnValue( false );
		window.history.replaceState( {}, '', '/checkout/example.com?from=window' );
	} );

	it( 'keeps the site id the caller already had', () => {
		expect( renderWithHost( () => useCheckoutSiteId( 1 ) ).current ).toBe( 1 );
	} );

	it( 'keeps reading URL params off the window', () => {
		expect( renderWithHost( () => useCheckoutUrlParams() ).current.get( 'from' ) ).toBe( 'window' );
	} );

	it( 'keeps dispatching notices to Redux', () => {
		renderWithHost( () => useCheckoutNotices() ).current.error( 'boom', { id: 'checkout-error' } );

		expect( host.notices.error ).not.toHaveBeenCalled();
		expect( mockDispatch ).toHaveBeenCalledWith(
			expect.objectContaining( {
				notice: expect.objectContaining( {
					status: 'is-error',
					text: 'boom',
					noticeId: 'checkout-error',
				} ),
			} )
		);
	} );

	it( 'keeps dispatching events to Redux', () => {
		renderWithHost( () => useCheckoutRecordEvent() ).current( 'calypso_checkout_test', { a: 1 } );

		expect( host.recordEvent ).not.toHaveBeenCalled();
		expect( mockDispatch ).toHaveBeenCalledWith(
			expect.objectContaining( { type: 'ANALYTICS_EVENT_RECORD' } )
		);
	} );

	it( 'offers no close and no navigate, so callers keep their own', () => {
		expect( renderWithHost( () => useCheckoutHostClose() ).current ).toBeNull();
		expect( renderWithHost( () => useCheckoutHostNavigate() ).current ).toBeUndefined();
	} );
} );

describe( 'the host bridge where no host is mounted', () => {
	beforeEach( () => {
		jest.clearAllMocks();
		mockIsEnabled.mockImplementation( ( flag ) => flag === 'checkout/shared-foundation' );
		window.history.replaceState( {}, '', '/checkout/example.com?from=window' );
	} );

	it( 'falls back to the direct reads even with the flag on', () => {
		expect( renderHook( () => useCheckoutSiteId( 1 ) ).result.current ).toBe( 1 );
		expect( renderHook( () => useCheckoutUrlParams() ).result.current.get( 'from' ) ).toBe(
			'window'
		);
		expect( renderHook( () => useCheckoutHostClose() ).result.current ).toBeNull();
		expect( renderHook( () => useCheckoutHostNavigate() ).result.current ).toBeUndefined();

		renderHook( () => useCheckoutRecordEvent() ).result.current( 'calypso_checkout_test' );

		expect( mockDispatch ).toHaveBeenCalledWith(
			expect.objectContaining( { type: 'ANALYTICS_EVENT_RECORD' } )
		);
	} );
} );
