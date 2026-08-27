import type { StripeConfiguration } from '@automattic/calypso-stripe';
import type { CartKey, MinimalRequestCartProduct, ResponseCart } from '@automattic/shopping-cart';
import type { ReactNode } from 'react';
import type { WPCOM } from 'wpcom';

/**
 * The receipt for a completed order, in the terms the shared checkout speaks.
 * Post-purchase is the host's job: it routes to its own confirmation surface
 * from this.
 */
export interface CheckoutReceipt {
	receiptId: number;
	orderId?: number;
}

export interface CheckoutPurchasedProduct {
	productId: number;
	productSlug: string;
	siteId?: number;
	meta?: string;
}

export interface CheckoutCompletionResult {
	receipt: CheckoutReceipt;
	purchasedProducts: CheckoutPurchasedProduct[];
}

/**
 * What checkout knows about where the user should land when it closes. Both
 * fields are advisory: a host that has a better answer is free to ignore them.
 */
export interface CheckoutCloseOptions {
	destinationUrl?: string;
	cartWasEmptied?: boolean;
}

export interface CheckoutNoticeOptions {
	/**
	 * Stable identity for a notice. Showing another notice with the same id
	 * replaces the previous one instead of stacking a duplicate.
	 */
	id?: string;
	/** Dismiss the notice automatically after this many milliseconds. */
	durationMs?: number;
}

export interface CheckoutNotices {
	error: ( message: ReactNode, options?: CheckoutNoticeOptions ) => void;
	info: ( message: ReactNode, options?: CheckoutNoticeOptions ) => void;
	/** Withdraw a notice shown earlier under this id. */
	remove: ( id: string ) => void;
}

/**
 * A diagnostic the host forwards to wherever it collects them. Not analytics:
 * this is for faults, and nothing here is expected in the ordinary course of a
 * purchase.
 */
export interface CheckoutErrorLog {
	message: string;
	severity?: 'debug' | 'info' | 'warning' | 'error';
	extra?: Record< string, unknown >;
	tags?: string[];
	siteId?: number;
}

/**
 * The single plug between an embedding app and the shared checkout: everything
 * irreducibly host-specific, and nothing else. Site *facts* (atomic, jetpack,
 * private) are not here — they are derived from `siteId` through the shared
 * site queries. Genuinely global concerns (feature flags, analytics transport,
 * i18n) stay global.
 */
export interface CheckoutHostContext {
	/**
	 * The site being purchased for, or `undefined` for the siteless and
	 * logged-out carts.
	 */
	siteId: number | undefined;
	/**
	 * Which cart the shopping-cart manager should load. Derived from the site,
	 * whether the shopper is logged in, and which siteless checkout this is —
	 * all facts the host owns and the checkout cannot work out for itself.
	 */
	cartKey: CartKey | undefined;
	navigate: ( url: string ) => void;
	close: ( options?: CheckoutCloseOptions ) => void;
	onComplete: ( result: CheckoutCompletionResult ) => void;
	notices: CheckoutNotices;
	urlParams: URLSearchParams;

	/** The authenticated WordPress.com REST client. */
	wpcom: WPCOM;
	/** Where faults go. */
	logError: ( entry: CheckoutErrorLog ) => void;

	/**
	 * Analytics. Five transports rather than one because they are five
	 * different pipelines with five different payloads, and collapsing them
	 * would mean inventing a lowest common denominator that fits none of them.
	 */
	recordEvent: ( name: string, properties?: Record< string, unknown > ) => void;
	recordGaEvent: ( category: string, action: string, label?: string, value?: number ) => void;
	recordCartAddEvent: ( cartItem: MinimalRequestCartProduct ) => void;
	recordPurchase: ( args: {
		cart: ResponseCart;
		orderId: number | null | undefined;
		sitePlanSlug: string | null | undefined;
	} ) => void;
	/** Returns the reCAPTCHA token, or `null` when the shopper could not be scored. */
	recordRecaptchaAction: ( clientId: number, action: string ) => Promise< string | null >;

	/** Payment infrastructure the checkout cannot reach for itself. */
	getStripeConfiguration: ( requestArgs: {
		country?: string;
		payment_partner?: string;
		needs_intent?: boolean;
	} ) => Promise< StripeConfiguration >;
	/** Loads an external payment SDK and resolves with its global namespace. */
	loadPaymentGateway: ( gatewayUrl: string, gatewayNamespace: string ) => Promise< unknown >;
}
