import { wpcom } from '../wpcom-fetcher';
import type { EbanxTokenizeRequest, EbanxTokenizeResponse } from './types';

/**
 * Exchanges the VGS tokens standing in for a card for an EBANX payment token.
 * The card itself never reaches WordPress.com: what is sent here is already
 * tokenized by VGS.
 */
export async function tokenizeEbanxCard(
	payload: EbanxTokenizeRequest
): Promise< EbanxTokenizeResponse > {
	return await wpcom.req.post< EbanxTokenizeResponse >( {
		path: '/transact/vgs/wpcom/ebanx/tokenize',
		apiNamespace: 'wpcom/v2',
		body: payload,
	} );
}
