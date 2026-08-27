import { useCallback, useMemo } from 'react';
import { useDispatch } from 'calypso/state';
import { recordTracksEvent } from 'calypso/state/analytics/actions';
import { errorNotice, infoNotice, removeNotice } from 'calypso/state/notices/actions';
import type {
	CheckoutHostContext,
	CheckoutNoticeOptions,
	CheckoutNotices,
} from '@automattic/checkout';
import type { NoticeActionCreator } from 'calypso/state/notices/types';
import type { ReactNode } from 'react';

/**
 * The Calypso capabilities that cost nothing to import.
 *
 * Kept apart from the rest of the host adapter on purpose: the other
 * capabilities reach the network, and `calypso/lib/wp` builds a client the
 * moment it is imported. A component that wants a cart key should not pay for
 * an HTTP client, so the two live in separate modules and the bridge imports
 * only this one.
 */

/**
 * Calypso's notice store, in the shape the checkout asks for. Shared with the
 * bridge so the flag-off path shows notices exactly the same way.
 */
export function useCalypsoCheckoutNotices(): CheckoutNotices {
	const reduxDispatch = useDispatch();

	return useMemo( () => {
		const show =
			( createNotice: NoticeActionCreator ) =>
			( message: ReactNode, options?: CheckoutNoticeOptions ) => {
				reduxDispatch(
					createNotice( message, {
						id: options?.id,
						duration: options?.durationMs,
						ariaLive: options?.ariaLive,
						role: options?.role,
					} )
				);
			};
		return {
			error: show( errorNotice ),
			info: show( infoNotice ),
			remove: ( id: string ) => {
				reduxDispatch( removeNotice( id ) );
			},
		};
	}, [ reduxDispatch ] );
}

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
