import { useCallback } from 'react';
import { useDispatch } from 'calypso/state';
import { recordTracksEvent } from 'calypso/state/analytics/actions';
import type { CheckoutHostContext } from '@automattic/checkout';

/**
 * Calypso's analytics pipeline, in the shape the checkout asks for. Shared with
 * the bridge so the flag-off path records exactly the same events.
 */
export function useCalypsoCheckoutRecordEvent(): CheckoutHostContext[ 'recordEvent' ] {
	const reduxDispatch = useDispatch();

	return useCallback(
		( name: string, properties?: Record< string, unknown > ) => {
			reduxDispatch( recordTracksEvent( name, properties ) );
		},
		[ reduxDispatch ]
	);
}
