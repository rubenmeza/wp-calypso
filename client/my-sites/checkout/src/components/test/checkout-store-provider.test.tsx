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

describe( 'the store a checkout uses', () => {
	it( 'is its own on the shared foundation', () => {
		mockIsEnabled.mockImplementation( ( flag ) => flag === 'checkout/shared-foundation' );

		render(
			<>
				{ openCheckout( 'first', 'first@example.com' ) }
				{ openCheckout( 'second' ) }
			</>
		);

		typeInto( 'first' );

		expect( screen.getByTestId( 'first' ) ).toHaveTextContent( 'first@example.com' );
		expect( screen.getByTestId( 'second' ) ).toHaveTextContent( '' );
	} );

	it( 'is the one the app registered, with the flag off', () => {
		mockIsEnabled.mockReturnValue( false );

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

describe( 'the recaptcha badge the route renders beside the checkout', () => {
	it( 'is heard by the checkout, wherever its store lives', () => {
		mockIsEnabled.mockImplementation( ( flag ) => flag === 'checkout/shared-foundation' );

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
