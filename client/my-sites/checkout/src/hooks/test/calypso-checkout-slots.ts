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

jest.mock( 'calypso/state', () => ( {
	useSelector: ( selector: ( state: unknown ) => unknown ) => selector( {} ),
} ) );
jest.mock( 'calypso/state/selectors/get-previous-route', () => ( {
	__esModule: true,
	default: () => '/plans/example.com',
} ) );
jest.mock( 'calypso/state/selectors/get-previous-path', () => ( {
	__esModule: true,
	default: () => '/start/plans',
} ) );
jest.mock( 'calypso/state/selectors/get-initial-query-arguments', () => ( {
	__esModule: true,
	default: () => ( { coupon: 'FREE' } ),
} ) );
jest.mock( 'calypso/state/selectors/has-gravatar-domain-query-param', () => ( {
	__esModule: true,
	default: () => true,
} ) );
jest.mock( 'calypso/state/signup/flow/selectors', () => ( {
	getIsOnboardingAffiliateFlow: () => true,
	getIsOnboardingUnifiedFlow: () => false,
} ) );

describe( 'the slots Calypso fills', () => {
	it( 'answers which surface the checkout is running on', () => {
		expect( calypsoCheckoutSlots.isJetpackCheckout?.() ).toBe( true );
		expect( calypsoCheckoutSlots.isAkismetCheckout?.() ).toBe( true );
		expect( calypsoCheckoutSlots.isWcMobileApp?.() ).toBe( true );
	} );

	it( 'answers where the shopper came from, from Redux', () => {
		expect( calypsoCheckoutSlots.usePreviousRoute?.() ).toBe( '/plans/example.com' );
		expect( calypsoCheckoutSlots.usePreviousPath?.() ).toBe( '/start/plans' );
		expect( calypsoCheckoutSlots.useInitialQueryArguments?.() ).toEqual( { coupon: 'FREE' } );
	} );

	it( 'answers which onboarding flow sent them, and whether it is a Gravatar domain', () => {
		expect( calypsoCheckoutSlots.useIsOnboardingAffiliateFlow?.() ).toBe( true );
		expect( calypsoCheckoutSlots.useIsOnboardingUnifiedFlow?.() ).toBe( false );
		expect( calypsoCheckoutSlots.useHasGravatarDomainQueryParam?.() ).toBe( true );
	} );
} );
