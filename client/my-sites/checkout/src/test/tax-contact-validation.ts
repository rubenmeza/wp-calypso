/**
 * @jest-environment jsdom
 */
import { validateTaxContactInformation } from '@automattic/api-core';
import { getTaxValidationResult } from '../lib/contact-validation';
import type { ManagedContactDetails } from '@automattic/wpcom-checkout';

jest.mock( '@automattic/api-core', () => ( {
	...jest.requireActual( '@automattic/api-core' ),
	validateTaxContactInformation: jest.fn(),
} ) );

const mockValidate = validateTaxContactInformation as jest.MockedFunction<
	typeof validateTaxContactInformation
>;

const contactInfo = {
	countryCode: { value: 'GB', errors: [], isTouched: true },
	postalCode: { value: 'SW1A 1AA', errors: [], isTouched: true },
	city: { value: 'London', errors: [], isTouched: true },
} as ManagedContactDetails;

beforeEach( () => {
	jest.clearAllMocks();
	mockValidate.mockResolvedValue( { success: true } );
} );

describe( 'validating the tax contact details', () => {
	it( 'goes through the shared mutation', async () => {
		await expect( getTaxValidationResult( contactInfo ) ).resolves.toEqual( { success: true } );

		expect( mockValidate ).toHaveBeenCalledTimes( 1 );
	} );

	it( 'sends what the shopper typed, in the shape the endpoint reads', async () => {
		await getTaxValidationResult( contactInfo );

		expect( mockValidate.mock.calls[ 0 ][ 0 ].contact_information ).toMatchObject( {
			country_code: 'GB',
			postal_code: 'SW1A 1AA',
			city: 'London',
		} );
	} );

	it( 'turns a rejection into per-field messages', async () => {
		mockValidate.mockResolvedValue( {
			success: false,
			messages: { 'contact_information.postal_code': [ 'Not a valid postcode' ] },
			messages_simple: [ 'Not a valid postcode' ],
		} );

		await expect( getTaxValidationResult( contactInfo ) ).resolves.toEqual( {
			success: false,
			messages: { contact_information: { postal_code: [ 'Not a valid postcode' ] } },
			messages_simple: [ 'Not a valid postcode' ],
		} );
	} );
} );
