import { useCallback } from 'react';
import { logToLogstash } from 'calypso/lib/logstash';
import type { CheckoutErrorLog, CheckoutHostContext } from '@automattic/checkout';

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
