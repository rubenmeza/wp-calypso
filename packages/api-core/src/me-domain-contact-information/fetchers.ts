import { wpcom } from '../wpcom-fetcher';
import type { DomainContactInformation } from './types';

export async function fetchDomainContactInformation(): Promise< DomainContactInformation > {
	return await wpcom.req.get( '/me/domain-contact-information' );
}
