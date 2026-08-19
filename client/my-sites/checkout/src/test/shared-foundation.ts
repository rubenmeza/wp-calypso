import { isEnabled } from '@automattic/calypso-config';
import { isSharedFoundationEnabled } from '../lib/shared-foundation';

jest.mock( '@automattic/calypso-config', () => {
	const config = jest.fn();
	return Object.assign( config, { __esModule: true, default: config, isEnabled: jest.fn() } );
} );

const mockIsEnabled = isEnabled as jest.MockedFunction< typeof isEnabled >;

beforeEach( () => jest.clearAllMocks() );

describe( 'the switch the whole foundation ramps behind', () => {
	it( 'is on when the flag is', () => {
		mockIsEnabled.mockImplementation( ( flag ) => flag === 'checkout/shared-foundation' );

		expect( isSharedFoundationEnabled() ).toBe( true );
	} );

	it( 'is off when it is not', () => {
		mockIsEnabled.mockReturnValue( false );

		expect( isSharedFoundationEnabled() ).toBe( false );
	} );

	it( 'is not turned on by any of the flags it replaced', () => {
		mockIsEnabled.mockImplementation( ( flag ) =>
			[
				'checkout/host-context',
				'checkout/query-payment-methods',
				'checkout/query-geo',
				'checkout/query-contact',
				'checkout/query-countries',
				'checkout/query-tax',
				'checkout/scoped-store',
				'checkout/content-split',
			].includes( flag )
		);

		expect( isSharedFoundationEnabled() ).toBe( false );
	} );
} );
