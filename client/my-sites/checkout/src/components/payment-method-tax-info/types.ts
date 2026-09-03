export interface TaxInfo {
	tax_postal_code: string;
	tax_country_code: string;
	tax_subdivision_code?: string;
	tax_city?: string;
	tax_organization?: string;
	tax_address?: string;
}

/**
 * What reading a tax location back gives you. Every field is optional, unlike
 * `TaxInfo`: a method with no tax location set answers with `is_tax_info_set`
 * alone.
 */
export type { StoredPaymentMethodTaxInfo as TaxGetInfo } from '@automattic/api-core';
