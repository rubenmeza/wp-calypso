/**
 * @jest-environment jsdom
 */
import { validateTaxContactInformation } from '@automattic/api-core';
import { isEnabled } from '@automattic/calypso-config';
import wp from 'calypso/lib/wp';
import { getTaxValidationResult } from '../lib/contact-validation';
import type { ManagedContactDetails } from '@automattic/wpcom-checkout';

jest.mock( '@automattic/calypso-config', () => {
	const config = jest.fn();
	return Object.assign( config, { __esModule: true, default: config, isEnabled: jest.fn() } );
} );

jest.mock( 'calypso/lib/wp', () => ( {
	__esModule: true,
	default: { req: { get: jest.fn(), post: jest.fn() } },
} ) );

jest.mock( '@automattic/api-core', () => ( {
	...jest.requireActual( '@automattic/api-core' ),
	validateTaxContactInformation: jest.fn(),
} ) );

const mockIsEnabled = isEnabled as jest.MockedFunction< typeof isEnabled >;
const mockSharedValidate = validateTaxContactInformation as jest.MockedFunction<
	typeof validateTaxContactInformation
>;
const mockLegacyPost = wp.req.post as jest.Mock;

const contactInfo = {
	countryCode: { value: 'GB', errors: [], isTouched: true },
	postalCode: { value: 'SW1A 1AA', errors: [], isTouched: true },
	city: { value: 'London', errors: [], isTouched: true },
} as ManagedContactDetails;

/** What the validation actually sent, whichever path took it. */
function sentContactInformation() {
	if ( mockSharedValidate.mock.calls.length ) {
		return mockSharedValidate.mock.calls[ 0 ][ 0 ].contact_information;
	}
	return mockLegacyPost.mock.calls[ 0 ][ 2 ].contact_information;
}

beforeEach( () => {
	jest.clearAllMocks();
	mockSharedValidate.mockResolvedValue( { success: true } );
	mockLegacyPost.mockResolvedValue( { success: true } );
} );

describe( 'validating the tax contact details', () => {
	it( 'goes through the shared mutation with the flag on', async () => {
		mockIsEnabled.mockImplementation( ( flag ) => flag === 'checkout/shared-foundation' );

		await expect( getTaxValidationResult( wp, contactInfo ) ).resolves.toEqual( { success: true } );

		expect( mockSharedValidate ).toHaveBeenCalledTimes( 1 );
		expect( mockLegacyPost ).not.toHaveBeenCalled();
	} );

	it( 'goes through the older path with the flag off', async () => {
		mockIsEnabled.mockReturnValue( false );

		await expect( getTaxValidationResult( wp, contactInfo ) ).resolves.toEqual( { success: true } );

		expect( mockLegacyPost ).toHaveBeenCalledWith(
			{ path: '/me/tax-contact-information/validate' },
			undefined,
			expect.objectContaining( { contact_information: expect.anything() } )
		);
		expect( mockSharedValidate ).not.toHaveBeenCalled();
	} );

	it.each( [
		[ 'the shared mutation', true ],
		[ 'the older path', false ],
	] )( 'sends the same contact details through %s', async ( _name, isFlagOn ) => {
		mockIsEnabled.mockImplementation(
			( flag ) => isFlagOn && flag === 'checkout/shared-foundation'
		);

		await getTaxValidationResult( wp, contactInfo );

		expect( sentContactInformation() ).toMatchObject( {
			country_code: 'GB',
			postal_code: 'SW1A 1AA',
			city: 'London',
		} );
	} );

	it.each( [
		[ 'the shared mutation', true ],
		[ 'the older path', false ],
	] )( 'turns a rejection from %s into per-field messages', async ( _name, isFlagOn ) => {
		mockIsEnabled.mockImplementation(
			( flag ) => isFlagOn && flag === 'checkout/shared-foundation'
		);
		const failure = {
			success: false,
			messages: { 'contact_information.postal_code': [ 'Not a valid postcode' ] },
			messages_simple: [ 'Not a valid postcode' ],
		};
		mockSharedValidate.mockResolvedValue( failure );
		mockLegacyPost.mockResolvedValue( failure );

		await expect( getTaxValidationResult( wp, contactInfo ) ).resolves.toEqual( {
			success: false,
			messages: { contact_information: { postal_code: [ 'Not a valid postcode' ] } },
			messages_simple: [ 'Not a valid postcode' ],
		} );
	} );
} );
