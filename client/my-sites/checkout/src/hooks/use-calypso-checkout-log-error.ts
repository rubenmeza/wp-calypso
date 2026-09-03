import { useCallback } from 'react';
import { logToLogstash } from 'calypso/lib/logstash';
import type { CheckoutErrorLog, CheckoutHostContext } from '@automattic/checkout';

/**
 * The checkout's severity vocabulary is narrower than Logstash's
 * `extra`-carrying payload, so the mapping is spelled out here rather than left
 * to the call sites.
 *
 * Its own module because `logToLogstash` posts through `calypso/lib/wp`, which
 * builds an HTTP client the moment it is imported. Anything that only wants to
 * record an analytics event should not drag that in.
 */
export function useCalypsoCheckoutLogError(): CheckoutHostContext[ 'logError' ] {
	return useCallback( ( { message, severity, extra, tags, siteId }: CheckoutErrorLog ) => {
		logToLogstash( {
			feature: 'calypso_client',
			message,
			severity,
			extra,
			tags,
			site_id: siteId,
		} );
	}, [] );
}
