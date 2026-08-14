import type { ReactNode } from 'react';

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
	navigate: ( url: string ) => void;
	close: ( options?: CheckoutCloseOptions ) => void;
	onComplete: ( result: CheckoutCompletionResult ) => void;
	notices: CheckoutNotices;
	urlParams: URLSearchParams;
	recordEvent: ( name: string, properties?: Record< string, unknown > ) => void;
}
