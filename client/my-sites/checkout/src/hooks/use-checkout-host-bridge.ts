import { isEnabled } from '@automattic/calypso-config';
import { useOptionalCheckoutHost } from '@automattic/checkout';
import { useMemo } from 'react';
import {
	useCalypsoCheckoutNotices,
	useCalypsoCheckoutRecordEvent,
} from './use-calypso-checkout-host';
import type { CheckoutHostContext, CheckoutNotices } from '@automattic/checkout';

/**
 * These hooks are the `checkout/host-context` switch: with the flag on, the
 * legacy checkout reads its host capabilities from the injected context; with
 * it off, it keeps the direct reads it has always done. Both paths run through
 * the same call sites, so the only difference between flag states is where the
 * capability comes from.
 *
 * A host is also required, not just the flag — surfaces that render
 * `CheckoutMain` without mounting a provider (Automattic for Agencies) stay on
 * the direct reads whatever the flag says. The whole file goes away once the
 * context is the only path.
 */
function useEnabledCheckoutHost(): CheckoutHostContext | null {
	const host = useOptionalCheckoutHost();
	return isEnabled( 'checkout/host-context' ) ? host : null;
}

export function useCheckoutSiteId( siteId: number | undefined ): number | undefined {
	const host = useEnabledCheckoutHost();
	// Deliberately not `??`: a host reporting no site at all is an answer, not a
	// gap to fill from the props.
	return host ? host.siteId : siteId;
}

export function useCheckoutUrlParams(): URLSearchParams {
	const host = useEnabledCheckoutHost();
	const search = window.location.search;
	const windowParams = useMemo( () => new URLSearchParams( search ), [ search ] );
	return host?.urlParams ?? windowParams;
}

export function useCheckoutNotices(): CheckoutNotices {
	const host = useEnabledCheckoutHost();
	const calypsoNotices = useCalypsoCheckoutNotices();
	return host?.notices ?? calypsoNotices;
}

export function useCheckoutRecordEvent(): CheckoutHostContext[ 'recordEvent' ] {
	const host = useEnabledCheckoutHost();
	const calypsoRecordEvent = useCalypsoCheckoutRecordEvent();
	return host?.recordEvent ?? calypsoRecordEvent;
}

/**
 * The host's navigate, or `undefined` when there is none. `leaveCheckout` takes
 * it as an optional argument and falls back to Calypso's router, so passing
 * `undefined` leaves the legacy behavior untouched.
 */
export function useCheckoutHostNavigate(): CheckoutHostContext[ 'navigate' ] | undefined {
	return useEnabledCheckoutHost()?.navigate;
}

/**
 * The host's close, or `null` when the caller should keep leaving checkout the
 * legacy way. Unlike the others this has no drop-in fallback: the legacy close
 * needs values only the calling component holds.
 */
export function useCheckoutHostClose(): CheckoutHostContext[ 'close' ] | null {
	return useEnabledCheckoutHost()?.close ?? null;
}
