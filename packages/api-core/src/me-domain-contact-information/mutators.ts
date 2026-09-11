import { wpcom } from '../wpcom-fetcher';
import type { ContactValidationRequestContactInformation } from '../domain-whois/types';

/**
 * Saves the contact details an account reuses the next time it buys a domain.
 *
 * Asymmetric with the read on purpose: the endpoint returns the record flat but
 * expects it wrapped, and the wrapping is done here so no caller has to know.
 */
export async function setDomainContactInformation(
	contactInformation: ContactValidationRequestContactInformation
): Promise< void > {
	await wpcom.req.post( '/me/domain-contact-information', {
		contact_information: contactInformation,
	} );
}
