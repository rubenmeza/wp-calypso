import { wpcom } from '../wpcom-fetcher';

export interface ValidateSignupUserParams {
	email: string;
	locale: string;
	is_from_registrationless_checkout: boolean;
}

export interface SignupUserValidationResponse {
	success: boolean;
	messages?: {
		first_name?: string[];
		last_name?: string[];
		// Keyed by reason (`taken`, `invalid`) where the other fields are plain
		// lists, so the caller can tell an existing account from a bad address.
		email?: Record< string, string >;
		username?: string[];
		password?: string[];
	};
}

/**
 * Whether an email may open an account, asked before a logged-out shopper is
 * taken through a purchase. `locale` is passed in rather than read here so that
 * this stays usable from any host.
 */
export async function validateSignupUser(
	params: ValidateSignupUserParams
): Promise< SignupUserValidationResponse > {
	return await wpcom.req.post( {
		path: '/signups/validation/user/',
		body: params,
	} );
}
