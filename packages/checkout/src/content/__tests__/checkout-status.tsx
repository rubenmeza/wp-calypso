/**
 * @jest-environment jsdom
 */
import { render, screen, act } from '@testing-library/react';
import {
	CheckoutStatusProvider,
	useCheckoutStatus,
	useReportCheckoutStatus,
} from '../checkout-status';
import type { CheckoutStatus } from '../checkout-status';

/** Stands in for the checkout, which knows its own status. */
function CheckoutInside( { status }: { status: CheckoutStatus } ) {
	useReportCheckoutStatus( status );
	return null;
}

/** Stands in for a modal frame, which has to decide whether it may close. */
function HostFrame() {
	const { isBusy, canClose } = useCheckoutStatus();
	return (
		<span data-testid="frame">
			{ isBusy ? 'busy' : 'idle' }/{ canClose ? 'closable' : 'held-open' }
		</span>
	);
}

function renderHostAround( status: CheckoutStatus ) {
	return render(
		<CheckoutStatusProvider>
			<HostFrame />
			<CheckoutInside status={ status } />
		</CheckoutStatusProvider>
	);
}

describe( 'what a host is told about the checkout inside it', () => {
	it( 'is idle and closable before anything happens', () => {
		renderHostAround( { isBusy: false, canClose: true } );

		expect( screen.getByTestId( 'frame' ) ).toHaveTextContent( 'idle/closable' );
	} );

	it( 'is busy and held open while a payment is going through', () => {
		renderHostAround( { isBusy: true, canClose: false } );

		expect( screen.getByTestId( 'frame' ) ).toHaveTextContent( 'busy/held-open' );
	} );

	it( 'follows the checkout as it changes', () => {
		const { rerender } = renderHostAround( { isBusy: false, canClose: true } );

		act( () => {
			rerender(
				<CheckoutStatusProvider>
					<HostFrame />
					<CheckoutInside status={ { isBusy: true, canClose: false } } />
				</CheckoutStatusProvider>
			);
		} );

		expect( screen.getByTestId( 'frame' ) ).toHaveTextContent( 'busy/held-open' );
	} );

	it( 'goes back to closable when the checkout unmounts, so nothing is held open by a ghost', () => {
		const { rerender } = renderHostAround( { isBusy: true, canClose: false } );

		act( () => {
			rerender(
				<CheckoutStatusProvider>
					<HostFrame />
				</CheckoutStatusProvider>
			);
		} );

		expect( screen.getByTestId( 'frame' ) ).toHaveTextContent( 'idle/closable' );
	} );
} );

describe( 'a checkout with no host listening', () => {
	it( 'reports its status to nobody without complaint', () => {
		expect( () =>
			render( <CheckoutInside status={ { isBusy: true, canClose: false } } /> )
		).not.toThrow();
	} );

	it( 'leaves a host that asks anyway with a closable answer', () => {
		render( <HostFrame /> );

		expect( screen.getByTestId( 'frame' ) ).toHaveTextContent( 'idle/closable' );
	} );
} );
