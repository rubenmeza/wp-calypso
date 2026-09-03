import { useCheckoutSlots, useSlotHook } from '@automattic/checkout';

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

/**
 * Where the shopper came from, and which flow sent them.
 *
 * Slots for the same reason as the surface predicates above: Calypso answers
 * them from its own store, and a host without them gets the branch turned off —
 * no previous route to go back to, no onboarding flow, no Gravatar domain.
 */
export function useCheckoutPreviousRoute(): string | undefined {
	return useSlotHook( useCheckoutSlots().usePreviousRoute, undefined );
}

export function useCheckoutPreviousPath(): string | undefined {
	return useSlotHook( useCheckoutSlots().usePreviousPath, undefined );
}

export function useCheckoutInitialQueryArguments(): Record< string, unknown > | null {
	return useSlotHook( useCheckoutSlots().useInitialQueryArguments, null );
}

export function useCheckoutHasGravatarDomainQueryParam(): boolean {
	return useSlotHook( useCheckoutSlots().useHasGravatarDomainQueryParam, false );
}

export function useCheckoutIsOnboardingAffiliateFlow(): boolean {
	return useSlotHook( useCheckoutSlots().useIsOnboardingAffiliateFlow, false );
}

export function useCheckoutIsOnboardingUnifiedFlow(): boolean {
	return useSlotHook( useCheckoutSlots().useIsOnboardingUnifiedFlow, false );
}
