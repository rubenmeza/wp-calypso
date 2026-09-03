import nock from 'nock';
import { setDomainContactInformation } from '../mutators';

const BASE = 'https://public-api.wordpress.com';

describe( 'the cached domain contact information mutator', () => {
	afterEach( () => nock.cleanAll() );

	it( 'saves the contact details wrapped, the way the endpoint expects them', async () => {
		const scope = nock( BASE )
			.post( '/rest/v1.1/me/domain-contact-information', {
				contact_information: {
					first_name: 'Ada',
					last_name: 'Lovelace',
					country_code: 'GB',
				},
			} )
			.reply( 200, {} );

		await setDomainContactInformation( {
			first_name: 'Ada',
			last_name: 'Lovelace',
			country_code: 'GB',
		} );

		expect( scope.isDone() ).toBe( true );
	} );
} );
