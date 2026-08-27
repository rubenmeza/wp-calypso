import { geoLocationQuery } from '@automattic/api-queries';
import { useCheckoutSlots, useSlotHook } from '@automattic/checkout';
import { useQuery } from '@tanstack/react-query';
import { useDispatch, useRegistry } from '@wordpress/data';
import debugFactory from 'debug';
import { useRef, useEffect } from 'react';
import { isSharedFoundationEnabled } from '../lib/shared-foundation';
import { CHECKOUT_STORE } from '../lib/wpcom-store';

const debug = debugFactory( 'calypso:composite-checkout:use-detected-country-code' );

/**
 * On the shared foundation the country comes from the
 * shared geo query, with it off from the country the Redux user record carries.
 * Both are the same geo-IP answer by a different route. The Redux read goes
 * away once the query is the only path.
 *
 * The Redux half is a slot because only Calypso has a Redux user record. A host
 * without it detects nothing when the flag is off, which is the branch turning
 * off rather than behaving differently — and no such host exists, because the
 * flag being off is what keeps Calypso on its old path.
 */
function useGeoCountryCode(): string | undefined {
	const isGeoQueryEnabled = isSharedFoundationEnabled();
	const slots = useCheckoutSlots();
	const userCountryCode = useSlotHook( slots.legacyReads?.useUserCountryCode, undefined );
	const { data } = useQuery( {
		...geoLocationQuery(),
		enabled: isGeoQueryEnabled,
		// Where the customer is is a fact about this visit: ask once, and never
		// answer a later visit out of storage.
		staleTime: Infinity,
		meta: { persist: false },
	} );
	return isGeoQueryEnabled ? data?.country_short : userCountryCode;
}

export default function useDetectedCountryCode(): void {
	const detectedCountryCode = useGeoCountryCode();
	const refHaveUsedDetectedCountryCode = useRef( false );
	const { loadCountryCodeFromGeoIP } = useDispatch( CHECKOUT_STORE ) ?? {};
	const registry = useRegistry();

	useEffect( () => {
		// Dispatch exactly once
		if (
			detectedCountryCode &&
			! refHaveUsedDetectedCountryCode.current &&
			loadCountryCodeFromGeoIP
		) {
			refHaveUsedDetectedCountryCode.current = true;
			// A geo answer that arrives after the contact details were autofilled
			// would otherwise replace the country the customer has on file with
			// wherever they happen to be sitting.
			if ( registry.select( CHECKOUT_STORE ).getContactInfo().countryCode?.value ) {
				debug( 'ignoring detected country code, the contact details have one' );
				return;
			}
			debug( 'using detected country code "' + detectedCountryCode + '"' );
			loadCountryCodeFromGeoIP( detectedCountryCode );
		}
	}, [ detectedCountryCode, loadCountryCodeFromGeoIP, registry ] );
}
