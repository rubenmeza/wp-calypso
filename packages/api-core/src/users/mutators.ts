import { wpcom } from '../wpcom-fetcher';
import type { CreateUserAccountParams, CreateUserAccountResponse } from './types';

/**
 * Registers the account a logged-out shopper needs before they can buy.
 *
 * The signup client credentials, locale and terms-of-service payload are passed
 * in rather than read here, so this stays usable from any host.
 */
export async function createUserAccount(
	params: CreateUserAccountParams
): Promise< CreateUserAccountResponse > {
	return await wpcom.req.post( '/users/new', params );
}
