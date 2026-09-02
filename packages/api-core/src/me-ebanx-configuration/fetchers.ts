import { wpcom } from '../wpcom-fetcher';
import type { EbanxConfiguration } from './types';

/**
 * Where to load EBANX's SDK from, and which key to configure it with. Varies by
 * the kind of payment being made, so the request type travels with the ask.
 */
export async function fetchEbanxConfiguration(
	requestType: string
): Promise< EbanxConfiguration > {
	return await wpcom.req.get( '/me/ebanx-configuration', { request_type: requestType } );
}
