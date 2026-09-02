import nock from 'nock';
import { validateGSuiteContactInformation } from '../mutators';

const BASE = 'https://public-api.wordpress.com';

const contactInformation = {
	first_name: 'Ada',
	last_name: 'Lovelace',
	email: 'ada@example.com',
	country_code: 'GB',
};

describe( 'the Google Workspace contact validation mutator', () => {
	afterEach( () => nock.cleanAll() );

	it( 'validates the contact against the domains the mailboxes are for', async () => {
		nock( BASE )
			.post( '/rest/v1.1/me/google-apps/validate', {
				contact_information: contactInformation,
				domain_names: [ 'example.com' ],
			} )
			.reply( 200, { success: true } );

		await expect(
			validateGSuiteContactInformation( contactInformation, [ 'example.com' ] )
		).resolves.toEqual( { success: true } );
	} );

	it( 'carries the failure messages back flat, the way the endpoint sends them', async () => {
		nock( BASE )
			.post( '/rest/v1.1/me/google-apps/validate' )
			.reply( 200, {
				success: false,
				messages: {
					postal_code: [ 'Postal code is not valid.' ],
					'extra.uk.registrationNumber': [ 'Registration number is required.' ],
				},
				messages_simple: [ 'Postal code is not valid.' ],
			} );

		const result = await validateGSuiteContactInformation( contactInformation, [ 'example.com' ] );

		if ( result.success ) {
			throw new Error( 'expected the contact to be rejected' );
		}

		// Dot-keyed rather than nested: reshaping them is the caller's job, and a
		// return type promising the nested form would make this key unreachable.
		expect( result.messages[ 'extra.uk.registrationNumber' ] ).toEqual( [
			'Registration number is required.',
		] );
	} );
} );
