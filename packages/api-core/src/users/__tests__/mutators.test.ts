import nock from 'nock';
import { createUserAccount } from '../mutators';

const BASE = 'https://public-api.wordpress.com';

const params = {
	email: 'shopper@example.com',
	is_passwordless: true,
	signup_flow_name: 'onboarding',
	validate: false,
	should_create_site: true,
	locale: 'en',
	client_id: 'id',
	client_secret: 'secret',
};

describe( 'creating the account a shopper buys through', () => {
	afterEach( () => nock.cleanAll() );

	it( 'registers the shopper and hands back the token to log them in with', async () => {
		nock( BASE )
			.post( '/rest/v1.1/users/new', params )
			.reply( 200, { success: true, bearer_token: 'tok', username: 'ada' } );

		await expect( createUserAccount( params ) ).resolves.toEqual( {
			success: true,
			bearer_token: 'tok',
			username: 'ada',
		} );
	} );
} );
