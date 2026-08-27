/**
 * @jest-environment jsdom
 */
import { calypsoCheckoutSlots } from '../calypso-checkout-slots';

jest.mock( 'calypso/lib/jetpack/is-jetpack-checkout', () => ( {
	__esModule: true,
	default: () => true,
} ) );
jest.mock( 'calypso/lib/akismet/is-akismet-checkout', () => ( {
	__esModule: true,
	default: () => true,
} ) );
jest.mock( 'calypso/lib/mobile-app', () => ( {
	isWcMobileApp: () => true,
} ) );

describe( 'the slots Calypso fills', () => {
	it( 'answers which surface the checkout is running on', () => {
		expect( calypsoCheckoutSlots.isJetpackCheckout?.() ).toBe( true );
		expect( calypsoCheckoutSlots.isAkismetCheckout?.() ).toBe( true );
		expect( calypsoCheckoutSlots.isWcMobileApp?.() ).toBe( true );
	} );
} );
