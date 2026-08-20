/**
 * @jest-environment jsdom
 */
import { isEnabled } from '@automattic/calypso-config';
import { render, screen, act } from '@testing-library/react';
import { useDispatch, useSelect } from '@wordpress/data';
import { CHECKOUT_STORE } from '../../lib/wpcom-store';
import { CheckoutStoreProvider } from '../checkout-store-provider';

jest.mock( '@automattic/calypso-config', () => {
	const config = jest.fn();
	return Object.assign( config, { __esModule: true, default: config, isEnabled: jest.fn() } );
} );

const mockIsEnabled = isEnabled as jest.MockedFunction< typeof isEnabled >;

/** Stands in for the recaptcha badge, which reports into the checkout's store. */
function RecaptchaBadge( { clientId }: { clientId: number } ) {
	const { setRecaptchaClientId } = useDispatch( CHECKOUT_STORE );
	return <button onClick={ () => setRecaptchaClientId( clientId ) }>report recaptcha</button>;
}

function RecaptchaClientId() {
	const clientId = useSelect( ( select ) => select( CHECKOUT_STORE ).getRecaptchaClientId(), [] );
	return <span data-testid="recaptcha-client-id">{ clientId }</span>;
}

function VatAndTouched( { label }: { label: string } ) {
	const vatDetails = useSelect( ( select ) => select( CHECKOUT_STORE ).getVatDetails(), [] );
	const contactInfo = useSelect( ( select ) => select( CHECKOUT_STORE ).getContactInfo(), [] );
	const { setVatDetails, touchContactFields } = useDispatch( CHECKOUT_STORE );

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

function ContactEmail( { label, typed }: { label: string; typed?: string } ) {
	const email = useSelect( ( select ) => select( CHECKOUT_STORE ).getContactInfo().email, [] );
	const { updateEmail } = useDispatch( CHECKOUT_STORE );

	return (
		<div>
			<span data-testid={ label }>{ email?.value ?? '' }</span>
			<button onClick={ () => updateEmail( typed ?? '' ) }>type into { label }</button>
		</div>
	);
}

function openCheckout( label: string, typed?: string ) {
	return (
		<CheckoutStoreProvider>
			<ContactEmail label={ label } typed={ typed } />
		</CheckoutStoreProvider>
	);
}

function typeInto( label: string ) {
	act( () => {
		screen.getByRole( 'button', { name: `type into ${ label }` } ).click();
	} );
}

beforeEach( () => {
	jest.clearAllMocks();
} );

describe( 'two checkouts open at once, with the flag on', () => {
	beforeEach( () => {
		mockIsEnabled.mockImplementation( ( flag ) => flag === 'checkout/shared-foundation' );
	} );

	it( 'do not see each other’s contact details', () => {
		render(
			<>
				{ openCheckout( 'first', 'first@example.com' ) }
				{ openCheckout( 'second', 'second@example.com' ) }
			</>
		);

		typeInto( 'first' );

		expect( screen.getByTestId( 'first' ) ).toHaveTextContent( 'first@example.com' );
		expect( screen.getByTestId( 'second' ) ).toHaveTextContent( '' );
	} );

	it( 'leave nothing behind for the next checkout that opens', () => {
		const { unmount } = render( openCheckout( 'first', 'first@example.com' ) );
		typeInto( 'first' );
		expect( screen.getByTestId( 'first' ) ).toHaveTextContent( 'first@example.com' );
		unmount();

		render( openCheckout( 'reopened' ) );

		expect( screen.getByTestId( 'reopened' ) ).toHaveTextContent( '' );
	} );

	it( 'leave the store outside checkout alone', () => {
		render( openCheckout( 'first', 'first@example.com' ) );
		typeInto( 'first' );

		render( <ContactEmail label="outside" /> );
		expect( screen.getByTestId( 'outside' ) ).toHaveTextContent( '' );
	} );
} );

describe( 'two checkouts open at once, with the flag off', () => {
	beforeEach( () => {
		mockIsEnabled.mockReturnValue( false );
	} );

	it( 'share the one global store, as they always have', () => {
		render(
			<>
				{ openCheckout( 'first', 'shared@example.com' ) }
				{ openCheckout( 'second' ) }
			</>
		);

		typeInto( 'first' );

		expect( screen.getByTestId( 'first' ) ).toHaveTextContent( 'shared@example.com' );
		expect( screen.getByTestId( 'second' ) ).toHaveTextContent( 'shared@example.com' );
	} );
} );

describe( 'what a checkout keeps to itself, with the flag on', () => {
	beforeEach( () => {
		mockIsEnabled.mockImplementation( ( flag ) => flag === 'checkout/shared-foundation' );
	} );

	it( 'includes the VAT details and which fields were touched', () => {
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

	it( 'hears the recaptcha badge that the route renders beside it', () => {
		render(
			<CheckoutStoreProvider>
				<RecaptchaClientId />
				<RecaptchaBadge clientId={ 42 } />
			</CheckoutStoreProvider>
		);

		act( () => {
			screen.getByRole( 'button', { name: 'report recaptcha' } ).click();
		} );

		expect( screen.getByTestId( 'recaptcha-client-id' ) ).toHaveTextContent( '42' );
	} );
} );
