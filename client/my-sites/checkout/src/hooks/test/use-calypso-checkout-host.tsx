/**
 * @jest-environment jsdom
 */
import { renderHook } from '@testing-library/react';
import { navigate } from 'calypso/lib/navigate';
import { leaveCheckout } from '../../lib/leave-checkout';
import useCalypsoCheckoutHost from '../use-calypso-checkout-host';
import useValidCheckoutBackUrl from '../use-valid-checkout-back-url';

jest.mock( 'calypso/lib/navigate', () => ( { navigate: jest.fn() } ) );
jest.mock( '../../lib/leave-checkout', () => ( { leaveCheckout: jest.fn() } ) );
jest.mock( '../use-valid-checkout-back-url', () => jest.fn() );
jest.mock( 'calypso/state/selectors/get-previous-route', () => jest.fn() );

const mockDispatch = jest.fn();
jest.mock( 'calypso/state', () => ( {
	useDispatch: () => mockDispatch,
	useSelector: ( selector: ( state: unknown ) => unknown ) => selector( {} ),
} ) );

const mockUseValidCheckoutBackUrl = useValidCheckoutBackUrl as jest.MockedFunction<
	typeof useValidCheckoutBackUrl
>;

function renderHost( { siteId = 9, siteSlug = 'example.wordpress.com' } = {} ) {
	return renderHook( () => useCalypsoCheckoutHost( { siteId, siteSlug } ) ).result;
}

describe( 'useCalypsoCheckoutHost', () => {
	beforeEach( () => {
		jest.clearAllMocks();
		mockUseValidCheckoutBackUrl.mockReturnValue( undefined );
		window.history.replaceState( {}, '', '/checkout/example.wordpress.com' );
	} );

	it( 'reports the site checkout is buying for', () => {
		expect( renderHost( { siteId: 4242 } ).current.siteId ).toBe( 4242 );
	} );

	it( 'exposes the current query string as URL params', () => {
		window.history.replaceState( {}, '', '/checkout/example.wordpress.com?coupon=FOO&signup=1' );

		const { urlParams } = renderHost().current;

		expect( urlParams.get( 'coupon' ) ).toBe( 'FOO' );
		expect( urlParams.get( 'signup' ) ).toBe( '1' );
	} );

	it( 'navigates through Calypso’s router', () => {
		renderHost().current.navigate( '/plans/example.wordpress.com' );

		expect( navigate ).toHaveBeenCalledWith( '/plans/example.wordpress.com' );
	} );

	it( 'dispatches error and info notices', () => {
		const { notices } = renderHost().current;

		notices.error( 'Payment failed', { id: 'checkout-payment-error' } );
		notices.info( 'Redirecting…', { durationMs: 5000 } );

		expect( mockDispatch ).toHaveBeenCalledWith(
			expect.objectContaining( {
				notice: expect.objectContaining( {
					status: 'is-error',
					text: 'Payment failed',
					noticeId: 'checkout-payment-error',
				} ),
			} )
		);
		expect( mockDispatch ).toHaveBeenCalledWith(
			expect.objectContaining( {
				notice: expect.objectContaining( {
					status: 'is-info',
					text: 'Redirecting…',
					duration: 5000,
				} ),
			} )
		);
	} );

	it( 'dispatches tracks events', () => {
		renderHost().current.recordEvent( 'calypso_checkout_composite_step_changed', { step: 2 } );

		expect( mockDispatch ).toHaveBeenCalledWith(
			expect.objectContaining( {
				type: 'ANALYTICS_EVENT_RECORD',
				meta: expect.objectContaining( {
					analytics: [
						expect.objectContaining( {
							payload: expect.objectContaining( {
								name: 'calypso_checkout_composite_step_changed',
								properties: { step: 2 },
							} ),
						} ),
					],
				} ),
			} )
		);
	} );

	describe( 'close', () => {
		it( 'leaves checkout with the default back URL and the host’s navigate', () => {
			mockUseValidCheckoutBackUrl.mockReturnValue( 'https://cloud.jetpack.com/pricing/' );

			renderHost().current.close();

			expect( leaveCheckout ).toHaveBeenCalledWith( {
				siteSlug: 'example.wordpress.com',
				forceCheckoutBackUrl: 'https://cloud.jetpack.com/pricing/',
				previousPath: undefined,
				tracksEvent: 'calypso_masterbar_close_clicked',
				userHasClearedCart: false,
				navigate: expect.any( Function ),
			} );
		} );

		it( 'passes an empty slug rather than none, the way the callers it replaces did', () => {
			const { result } = renderHook( () =>
				useCalypsoCheckoutHost( { siteId: undefined, siteSlug: undefined } )
			);

			result.current.close();

			expect( leaveCheckout ).toHaveBeenCalledWith( expect.objectContaining( { siteSlug: '' } ) );
		} );

		it( 'prefers the destination checkout asks for', () => {
			mockUseValidCheckoutBackUrl.mockReturnValue( 'https://cloud.jetpack.com/pricing/' );

			renderHost().current.close( {
				destinationUrl: '/domains/add/example.wordpress.com',
				cartWasEmptied: true,
			} );

			expect( leaveCheckout ).toHaveBeenCalledWith(
				expect.objectContaining( {
					forceCheckoutBackUrl: '/domains/add/example.wordpress.com',
					userHasClearedCart: true,
				} )
			);
		} );
	} );
} );
