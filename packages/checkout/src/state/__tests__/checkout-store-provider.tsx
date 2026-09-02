/**
 * @jest-environment jsdom
 */
import { render, screen, act } from '@testing-library/react';
import { register, useDispatch, useSelect } from '@wordpress/data';
import { createCheckoutStore } from '../checkout-store';
import { CheckoutStoreProvider } from '../checkout-store-provider';

/**
 * The package hands out a factory; registering one globally is the app's job,
 * so the test does what the app does. A scoped checkout must not touch it.
 */
const globalStore = createCheckoutStore();
register( globalStore );

function ContactEmail( { label, typed }: { label: string; typed?: string } ) {
	const email = useSelect( ( select ) => select( globalStore ).getContactInfo().email, [] );
	const { updateEmail } = useDispatch( globalStore );

	return (
		<div>
			<span data-testid={ label }>{ email?.value ?? '' }</span>
			<button onClick={ () => updateEmail( typed ?? '' ) }>type into { label }</button>
		</div>
	);
}

function typeInto( label: string ) {
	act( () => {
		screen.getByRole( 'button', { name: `type into ${ label }` } ).click();
	} );
}

describe( 'a checkout with its own state', () => {
	it( 'does not see what a checkout beside it has typed', () => {
		render(
			<>
				<CheckoutStoreProvider>
					<ContactEmail label="first" typed="first@example.com" />
				</CheckoutStoreProvider>
				<CheckoutStoreProvider>
					<ContactEmail label="second" />
				</CheckoutStoreProvider>
			</>
		);

		typeInto( 'first' );

		expect( screen.getByTestId( 'first' ) ).toHaveTextContent( 'first@example.com' );
		expect( screen.getByTestId( 'second' ) ).toHaveTextContent( '' );
	} );

	it( 'leaves nothing behind for the next checkout that opens', () => {
		const { unmount } = render(
			<CheckoutStoreProvider>
				<ContactEmail label="first" typed="first@example.com" />
			</CheckoutStoreProvider>
		);
		typeInto( 'first' );
		unmount();

		render(
			<CheckoutStoreProvider>
				<ContactEmail label="reopened" />
			</CheckoutStoreProvider>
		);

		expect( screen.getByTestId( 'reopened' ) ).toHaveTextContent( '' );
	} );

	it( 'leaves the store outside it alone', () => {
		render(
			<CheckoutStoreProvider>
				<ContactEmail label="inside" typed="inside@example.com" />
			</CheckoutStoreProvider>
		);
		typeInto( 'inside' );

		render( <ContactEmail label="outside" /> );

		expect( screen.getByTestId( 'outside' ) ).toHaveTextContent( '' );
	} );

	it( 'keeps its VAT details and touched fields to itself too', () => {
		function VatAndTouched( { label }: { label: string } ) {
			const vatDetails = useSelect( ( select ) => select( globalStore ).getVatDetails(), [] );
			const contactInfo = useSelect( ( select ) => select( globalStore ).getContactInfo(), [] );
			const { setVatDetails, touchContactFields } = useDispatch( globalStore );

			return (
				<div>
					<span data-testid={ `${ label }-vat` }>{ vatDetails?.id ?? '' }</span>
					<span data-testid={ `${ label }-touched` }>
						{ contactInfo.email?.isTouched ? 'touched' : 'untouched' }
					</span>
					<button
						onClick={ () => {
							setVatDetails( { id: `vat-${ label }` } );
							touchContactFields();
						} }
					>
						fill in { label }
					</button>
				</div>
			);
		}

		render(
			<>
				<CheckoutStoreProvider>
					<VatAndTouched label="first" />
				</CheckoutStoreProvider>
				<CheckoutStoreProvider>
					<VatAndTouched label="second" />
				</CheckoutStoreProvider>
			</>
		);

		act( () => {
			screen.getByRole( 'button', { name: 'fill in first' } ).click();
		} );

		expect( screen.getByTestId( 'first-vat' ) ).toHaveTextContent( 'vat-first' );
		expect( screen.getByTestId( 'first-touched' ) ).toHaveTextContent( 'touched' );
		expect( screen.getByTestId( 'second-vat' ) ).toHaveTextContent( '' );
		expect( screen.getByTestId( 'second-touched' ) ).toHaveTextContent( 'untouched' );
	} );
} );
