import type { VatDetails } from '@automattic/wpcom-checkout';

/**
 * A branch or a component that only one host has.
 *
 * Every slot is optional, and an absent slot turns its branch *off* — it never
 * changes what the branch does. Calypso fills every slot declared here; the
 * Dashboard fills none and gets a checkout without the Calypso-only paths,
 * which is the whole point.
 *
 * A slot is declared in the same change that reads it, so this interface is
 * always the set of branches the checkout actually has, not a plan for the
 * ones it will grow.
 *
 * Slots are not a general extension point. Anything a second host would also
 * want belongs on `CheckoutHostContext` or in a shared query instead.
 */
export interface CheckoutHostSlots {
	/* Where the checkout is running. Absent means "an ordinary WordPress.com
	   checkout", which is what every branch behind these is written against. */
	isJetpackCheckout?: () => boolean;
	isAkismetCheckout?: () => boolean;
	isWcMobileApp?: () => boolean;

	/* Which signup or onboarding flow sent the shopper here, and whether they
	   arrived on a Gravatar domain. */
	useIsOnboardingAffiliateFlow?: () => boolean;
	useIsOnboardingUnifiedFlow?: () => boolean;
	useHasGravatarDomainQueryParam?: () => boolean;

	/* Where the shopper came from, for the close and back affordances.

	   Hooks rather than plain values, like the legacy reads below: a host that
	   answers these from its own store has to read that store at render time,
	   and the slot bag is a constant, so which slots a checkout has cannot
	   change while it is mounted. */
	usePreviousRoute?: () => string | undefined;
	usePreviousPath?: () => string | undefined;
	useInitialQueryArguments?: () => Record< string, unknown > | null;

	/**
	 * The reads the shared queries replaced.
	 *
	 * These are the only slots with a scheduled death: they exist so that
	 * `checkout/shared-foundation` can still restore the old behaviour when it
	 * is off, without the checkout importing the legacy app to do it. **They go
	 * when that flag does.** Every other slot is a permanent Calypso-only path
	 * with no expiry.
	 * @deprecated Goes away with the `checkout/shared-foundation` flag.
	 */
	legacyReads?: CheckoutLegacyReadSlots;
}

/**
 * A rejection from `/me/vat-info`, which carries a code beside its message.
 * Checkout reads the code to tell `invalid_vat` — the VAT service being briefly
 * unavailable, which a shopper may proceed past — from a real failure.
 *
 * Not an `Error`: one of the two paths rejects with a real one and the other
 * with a plain object, and the code and the message are all either path is read
 * for.
 */
export interface CheckoutTaxError {
	message: string;
	error: string;
}

/**
 * A saved-VAT-details reader and writer.
 *
 * Structurally what Calypso's `/me/purchases` VAT manager already is; declared
 * here so the slot has a real type without the package reaching into the app.
 */
export interface CheckoutVatDetailsManager {
	vatDetails: VatDetails;
	isLoading: boolean;
	isUpdating: boolean;
	isUpdateSuccessful: boolean;
	fetchError: CheckoutTaxError | null;
	updateError: CheckoutTaxError | null;
	setVatDetails: ( vatDetails: VatDetails ) => Promise< VatDetails >;
}

/**
 * The two reads that still need the legacy app when the flag is off.
 *
 * There were five candidates. Three of them — cached contact details, stored
 * payment methods and the countries list — turned out to need nothing: their
 * legacy halves reach the REST API and nothing else, so they take the client
 * off the host like any other read. Only these two reach into Calypso proper,
 * one for Redux and one for a `/me/purchases` module.
 * @deprecated Goes away with the `checkout/shared-foundation` flag.
 */
export interface CheckoutLegacyReadSlots {
	/** The country on the Redux user record, which the geo query replaced. */
	useUserCountryCode?: () => string | undefined;
	/** `/me/purchases`' VAT manager, which the shared tax query replaced. */
	useVatDetails?: ( args: { enabled: boolean } ) => CheckoutVatDetailsManager;
	/**
	 * Builds the handler checkout calls after it saves VAT details on the shared
	 * path, so a host that also reads them elsewhere can refresh its own cache.
	 * Absent means nothing else is reading them, which is true of every host but
	 * Calypso.
	 */
	useOnVatDetailsSaved?: () => ( saved: Partial< VatDetails > ) => void;
}
