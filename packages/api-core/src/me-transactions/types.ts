import type { TaxVendorInfo } from '../me-billing-history/types';
import type { DomainContactDetails, RequestCart } from '@automattic/shopping-cart';

type PurchaseSiteId = number;

export type WPCOMTransactionEndpointResponseSuccess = {
	success: true;
	purchases: Record< PurchaseSiteId, TransactionResponsePurchase[] >;
	failed_purchases: Record< PurchaseSiteId, FailedPurchase[] >;
	receipt_id: number;
	order_id: number | '';
	redirect_url?: string;
	paypal_order_id?: string;
	qr_code?: string;
	is_gift_purchase: boolean;
	display_price: string;
	price_integer: number;
	price_float: number;
	currency: string;
	is_gravatar_domain: boolean;
};

export type WPCOMTransactionEndpointResponseFailed = {
	success: false;
	purchases: Record< PurchaseSiteId, TransactionResponsePurchase[] >;
	failed_purchases: Record< PurchaseSiteId, FailedPurchase[] >;
	receipt_id: number;
	order_id: number | '';
	redirect_url?: string;
	qr_code?: string;
	is_gift_purchase: boolean;
	display_price: string;
	price_integer: number;
	price_float: number;
	currency: string;
	is_gravatar_domain: boolean;
};

export type WPCOMTransactionEndpointResponseRedirect = {
	message: { payment_intent_client_secret: string } | { setup_intent_client_secret: string } | '';
	order_id: number | '';
	redirect_url: string;
	qr_code?: string;
};

export type WPCOMTransactionEndpointResponsePayPal = {
	order_id: number | '';
	paypal_order_id: string;
	redirect_url?: string;
	qr_code?: string;
};

export interface TransactionResponsePurchase {
	delayed_provisioning?: boolean;
	expiry?: string;
	is_domain_registration: boolean;
	is_email_verified?: boolean;
	is_renewal: boolean;
	is_root_domain_with_us?: boolean;
	is_hundred_year_domain?: boolean;
	meta: string | null;
	new_quantity?: number;
	product_id: string | number;
	product_name: string;
	product_name_short: string;
	product_type: string;
	product_slug: string;
	registrar_support_url?: string;
	user_email: string;
	saas_redirect_url?: string;
	tax_vendor_info?: TaxVendorInfo;
	blog_id: number;
	price_integer?: number;
}

export interface FailedPurchase {
	product_meta: string;
	product_id: string | number;
	product_slug: string;
	product_cost: string | number;
	product_name: string;
}

export type WPCOMTransactionEndpointRequestPayload = {
	cart: RequestCart;
	payment: WPCOMTransactionEndpointPaymentDetails;
	domainDetails?: DomainContactDetails;
	tos?: ToSAcceptanceTrackingDetails;
	ad_conversion?: AdConversionDetails;
};

export type ToSAcceptanceTrackingDetails = {
	path: string;
	locale: string;
	viewport: string;
};

export type AdConversionDetails = {
	ad_details: string;
	sensitive_pixel_options: string; // sensitive_pixel_options
};

export type WPCOMTransactionEndpointPaymentDetails = {
	paymentMethod: string;
	paymentKey?: string;
	paymentPartner?: string;
	storedDetailsId?: string;
	name: string;
	email?: string;
	zip: string;
	postalCode: string;
	country: string;
	countryCode: string;
	state?: string;
	city?: string;
	address?: string;
	streetNumber?: string;
	phoneNumber?: string;
	document?: string;
	isForBusiness?: boolean;
	deviceId?: string;
	successUrl?: string;
	cancelUrl?: string;
	idealBank?: string;
	// 6-digit BLIK code generated in the customer's banking app.
	code?: string;
	useForAllSubscriptions?: boolean;
	eventSource?: string;
};

export type PayPalExpressEndpointRequestPayload = {
	successUrl: string;
	cancelUrl: string;
	cart: RequestCart;
	domainDetails: DomainContactDetails | null;
	country: string;
	postalCode: string;
	tos?: ToSAcceptanceTrackingDetails;
	ad_conversion?: AdConversionDetails;
};

export type WPCOMTransactionEndpointResponse =
	| WPCOMTransactionEndpointResponseSuccess
	| WPCOMTransactionEndpointResponseFailed
	| WPCOMTransactionEndpointResponsePayPal
	| WPCOMTransactionEndpointResponseRedirect;

/** What the PayPal Express endpoint answers with: where to send the shopper. */
export type PayPalExpressRedirect = {
	redirect_url?: string;
};

export type PayPalConfirmFailResponse = {
	error: string;
	message: string;
};

export type PayPalConfirmSuccessResponse = {
	success: true;
};

export type PayPalConfirmResponse = PayPalConfirmFailResponse | PayPalConfirmSuccessResponse;
