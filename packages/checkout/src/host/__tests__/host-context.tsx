/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react';
import { CheckoutHostProvider, useCheckoutHost, useOptionalCheckoutHost } from '../index';
import type { CheckoutHostContext } from '../index';

function createHost( overrides: Partial< CheckoutHostContext > = {} ): CheckoutHostContext {
	return {
		siteId: 12345,
		navigate: jest.fn(),
		close: jest.fn(),
		onComplete: jest.fn(),
		notices: { error: jest.fn(), info: jest.fn() },
		urlParams: new URLSearchParams( '' ),
		recordEvent: jest.fn(),
		...overrides,
	};
}

describe( 'useCheckoutHost', () => {
	it( 'returns the host the provider supplies', () => {
		const host = createHost( { siteId: 777, urlParams: new URLSearchParams( 'coupon=FOO' ) } );

		function Consumer() {
			const { siteId, urlParams } = useCheckoutHost();
			return (
				<div>
					<span>site: { siteId }</span>
					<span>coupon: { urlParams.get( 'coupon' ) }</span>
				</div>
			);
		}

		render(
			<CheckoutHostProvider value={ host }>
				<Consumer />
			</CheckoutHostProvider>
		);

		expect( screen.getByText( 'site: 777' ) ).toBeVisible();
		expect( screen.getByText( 'coupon: FOO' ) ).toBeVisible();
	} );

	it( 'reaches consumers nested below other components', () => {
		const host = createHost();

		function Deep() {
			return <span>site: { useCheckoutHost().siteId }</span>;
		}

		render(
			<CheckoutHostProvider value={ host }>
				<div>
					<div>
						<Deep />
					</div>
				</div>
			</CheckoutHostProvider>
		);

		expect( screen.getByText( 'site: 12345' ) ).toBeVisible();
	} );

	it( 'throws when no host is mounted, naming the missing provider', () => {
		function Consumer() {
			useCheckoutHost();
			return null;
		}

		// React logs the error it re-throws; silence it so the run stays readable.
		const consoleError = jest.spyOn( console, 'error' ).mockImplementation( () => {} );
		expect( () => render( <Consumer /> ) ).toThrow( /CheckoutHostProvider/ );
		consoleError.mockRestore();
	} );
} );

describe( 'useOptionalCheckoutHost', () => {
	it( 'returns null when no host is mounted', () => {
		function Consumer() {
			return <span>host: { String( useOptionalCheckoutHost() ) }</span>;
		}

		render( <Consumer /> );

		expect( screen.getByText( 'host: null' ) ).toBeVisible();
	} );

	it( 'returns the host when one is mounted', () => {
		const host = createHost();

		function Consumer() {
			return <span>site: { useOptionalCheckoutHost()?.siteId }</span>;
		}

		render(
			<CheckoutHostProvider value={ host }>
				<Consumer />
			</CheckoutHostProvider>
		);

		expect( screen.getByText( 'site: 12345' ) ).toBeVisible();
	} );
} );

describe( 'the host capabilities', () => {
	it( 'passes navigation, close, notices, events and completion straight through', () => {
		const host = createHost();
		const receipt = { receiptId: 42 };

		function Consumer() {
			const { navigate, close, notices, recordEvent, onComplete } = useCheckoutHost();
			navigate( '/plans/example.com' );
			close();
			notices.error( 'boom' );
			notices.info( 'redirecting' );
			recordEvent( 'calypso_checkout_test', { step: 'payment' } );
			onComplete( { receipt, purchasedProducts: [] } );
			return null;
		}

		render(
			<CheckoutHostProvider value={ host }>
				<Consumer />
			</CheckoutHostProvider>
		);

		expect( host.navigate ).toHaveBeenCalledWith( '/plans/example.com' );
		expect( host.close ).toHaveBeenCalledWith();
		expect( host.notices.error ).toHaveBeenCalledWith( 'boom' );
		expect( host.notices.info ).toHaveBeenCalledWith( 'redirecting' );
		expect( host.recordEvent ).toHaveBeenCalledWith( 'calypso_checkout_test', {
			step: 'payment',
		} );
		expect( host.onComplete ).toHaveBeenCalledWith( { receipt, purchasedProducts: [] } );
	} );

	it( 'lets a host be told where checkout wants to close to', () => {
		const host = createHost();

		function Consumer() {
			useCheckoutHost().close( {
				destinationUrl: '/domains/add/example.com',
				cartWasEmptied: true,
			} );
			return null;
		}

		render(
			<CheckoutHostProvider value={ host }>
				<Consumer />
			</CheckoutHostProvider>
		);

		expect( host.close ).toHaveBeenCalledWith( {
			destinationUrl: '/domains/add/example.com',
			cartWasEmptied: true,
		} );
	} );
} );
