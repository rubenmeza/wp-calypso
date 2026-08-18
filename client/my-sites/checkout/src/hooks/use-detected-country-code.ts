import { geoLocationQuery } from '@automattic/api-queries';
import { isEnabled } from '@automattic/calypso-config';
import { useQuery } from '@tanstack/react-query';
import { useDispatch, useRegistry } from '@wordpress/data';
import debugFactory from 'debug';
import { useRef, useEffect } from 'react';
import { useSelector } from 'calypso/state';
import { getCurrentUserCountryCode } from 'calypso/state/current-user/selectors';
import { CHECKOUT_STORE } from '../lib/wpcom-store';

const debug = debugFactory( 'calypso:composite-checkout:use-detected-country-code' );

/**
 * The `checkout/query-geo` switch: with the flag on the country comes from the
 * shared geo query, with it off from the country the Redux user record carries.
 * Both are the same geo-IP answer by a different route. The Redux read goes
 * away once the query is the only path.
 */
function useGeoCountryCode(): string | undefined {
	const isGeoQueryEnabled = isEnabled( 'checkout/query-geo' );
	const userCountryCode = useSelector( getCurrentUserCountryCode );
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
