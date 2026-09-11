import { useCallback } from 'react';
import { logToLogstash } from 'calypso/lib/logstash';
import type { CheckoutErrorLog, CheckoutHostContext } from '@automattic/checkout';

/**
 * Exported as a plain function as well as a hook: Calypso surfaces outside the
 * checkout log through the same helpers and have no host to read it from.
 */
export const calypsoCheckoutLogError: CheckoutHostContext[ 'logError' ] = ( {
	message,
	severity,
	extra,
	tags,
	siteId,
}: CheckoutErrorLog ) => {
	logToLogstash( {
		feature: 'calypso_client',
		message,
		severity,
		extra,
		tags,
		site_id: siteId,
	} );
};

export function useCalypsoCheckoutLogError(): CheckoutHostContext[ 'logError' ] {
	return useCallback( calypsoCheckoutLogError, [] );
}
