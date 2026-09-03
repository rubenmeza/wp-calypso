import nock from 'nock';
import { validateSignupUser } from '../mutators';

const BASE = 'https://public-api.wordpress.com';

describe( 'the signup user validation mutator', () => {
	afterEach( () => nock.cleanAll() );

	it( 'asks whether an email may open an account, in the locale it is given', async () => {
		nock( BASE )
			.post( '/rest/v1.1/signups/validation/user/', {
				locale: 'fr',
				email: 'shopper@example.com',
				is_from_registrationless_checkout: true,
			} )
			.reply( 200, { success: true } );

		await expect(
			validateSignupUser( {
				email: 'shopper@example.com',
				locale: 'fr',
				is_from_registrationless_checkout: true,
			} )
		).resolves.toEqual( { success: true } );
	} );

	it( 'carries back the per-field messages when the email cannot be used', async () => {
		nock( BASE )
			.post( '/rest/v1.1/signups/validation/user/' )
			.reply( 200, {
				success: false,
				messages: { email: { taken: 'That email is already in use.' } },
			} );

		await expect(
			validateSignupUser( {
				email: 'taken@example.com',
				locale: 'en',
				is_from_registrationless_checkout: false,
			} )
		).resolves.toEqual( {
			success: false,
			messages: { email: { taken: 'That email is already in use.' } },
		} );
	} );
} );
