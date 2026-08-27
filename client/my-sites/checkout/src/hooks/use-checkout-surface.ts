import { useCheckoutSlots } from '@automattic/checkout';

/**
 * Which surface the checkout is running on.
 *
 * These are slots rather than host capabilities: a host that fills none of them
 * gets an ordinary WordPress.com checkout, which is what every branch behind
 * them is written against. Calypso answers them from the URL, which is why they
 * cannot travel with the checkout.
 */
export function useIsJetpackCheckout(): boolean {
	return useCheckoutSlots().isJetpackCheckout?.() ?? false;
}

export function useIsAkismetCheckout(): boolean {
	return useCheckoutSlots().isAkismetCheckout?.() ?? false;
}

/** Whether the checkout is embedded in the WooCommerce mobile app's webview. */
export function useIsWcMobileApp(): boolean {
	return useCheckoutSlots().isWcMobileApp?.() ?? false;
}
