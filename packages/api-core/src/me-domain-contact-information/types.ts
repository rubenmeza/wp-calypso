import type { DomainContactValidationRequestExtraFields } from '../domain-whois/types';

/**
 * The contact details the user last saved, as returned by
 * /me/domain-contact-information. Every field is optional: an account that has
 * never bought a domain has none of them.
 */
export interface DomainContactInformation {
	first_name?: string;
	last_name?: string;
	organization?: string;
	email?: string;
	phone?: string;
	phone_number_country?: string;
	address_1?: string;
	address_2?: string;
	city?: string;
	state?: string;
	postal_code?: string;
	country_code?: string;
	fax?: string;
	vat_id?: string;
	extra?: DomainContactValidationRequestExtraFields;
}
