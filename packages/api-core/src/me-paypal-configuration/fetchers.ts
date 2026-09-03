import { wpcom } from '../wpcom-fetcher';

export interface PayPalConfigurationResponse {
	client_id?: string;
}

/**
 * The PayPal client id the PayPal SDK script is loaded with. Absent when PayPal
 * is not configured for this environment, which is why the caller has to cope
 * with no id rather than treating it as a fault.
 */
export async function fetchPayPalConfiguration(): Promise< PayPalConfigurationResponse > {
	return await wpcom.req.get( '/me/paypal-configuration' );
}
