import nock from 'nock';
import { validateDomainContactInformation } from '../mutators';

const BASE = 'https://public-api.wordpress.com';

const contactInformation = { first_name: 'Ada', country_code: 'GB' };

describe( "checkout's domain contact validation", () => {
	afterEach( () => nock.cleanAll() );

	it( 'asks version 1.2 of the endpoint, which is what a purchase has always asked for', async () => {
		nock( BASE )
			.post( '/rest/v1.2/me/domain-contact-information/validate', {
				contact_information: contactInformation,
				domain_names: [ 'example.com' ],
			} )
			.reply( 200, { success: true } );

		await expect(
			validateDomainContactInformation( contactInformation, [ 'example.com' ] )
		).resolves.toEqual( { success: true } );
	} );
} );
