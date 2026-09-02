import { wpcom } from '../wpcom-fetcher';
import type {
	DomainContactDetails,
	ContactValidationRequestContactInformation,
	DomainContactValidationResponse,
	RawDomainContactValidationResponse,
} from './types';

export function updateDomainWhois(
	domainName: string,
	domainContactDetails: DomainContactDetails,
	transferLock: boolean
): Promise< DomainContactValidationResponse > {
	return wpcom.req.post( {
		path: `/domains/${ domainName }/whois`,
		apiVersion: '1.1',
		body: {
			whois: domainContactDetails,
			transfer_lock: transferLock,
		},
	} );
}

export function validateDomainWhois(
	domainContactDetails: ContactValidationRequestContactInformation,
	domainNames: string[]
): Promise< DomainContactValidationResponse > {
	return wpcom.req.post( {
		path: '/me/domain-contact-information/validate',
		apiVersion: '1.1',
		body: {
			contact_information: domainContactDetails,
			domain_names: domainNames,
		},
	} );
}

/**
 * The same check as `validateDomainWhois`, as checkout makes it: version 1.2 of
 * the endpoint, which is what a purchase has always asked for. Kept separate
 * rather than given a version parameter, because the two callers have never
 * agreed on one and silently moving either is a wire change.
 */
export function validateDomainContactInformation(
	contactInformation: ContactValidationRequestContactInformation,
	domainNames: string[]
): Promise< RawDomainContactValidationResponse > {
	return wpcom.req.post(
		{ path: '/me/domain-contact-information/validate' },
		{ apiVersion: '1.2' },
		{
			contact_information: contactInformation,
			domain_names: domainNames,
		}
	);
}
