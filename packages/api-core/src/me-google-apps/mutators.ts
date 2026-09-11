import { wpcom } from '../wpcom-fetcher';
import type {
	ContactValidationRequestContactInformation,
	RawDomainContactValidationResponse,
} from '../domain-whois/types';

/**
 * The same contact check as `validateDomainWhois`, against the Google Workspace
 * endpoint: Google validates a contact against the domains the mailboxes are
 * for, and rejects some contacts the domain endpoint accepts. Deliberately sent
 * without an `apiVersion`, as this endpoint has always been called.
 */
export function validateGSuiteContactInformation(
	contactInformation: ContactValidationRequestContactInformation,
	domainNames: string[]
): Promise< RawDomainContactValidationResponse > {
	return wpcom.req.post( {
		path: '/me/google-apps/validate',
		body: {
			contact_information: contactInformation,
			domain_names: domainNames,
		},
	} );
}
