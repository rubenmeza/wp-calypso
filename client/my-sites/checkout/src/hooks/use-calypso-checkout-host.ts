import { useCallback, useMemo } from 'react';
import { navigate } from 'calypso/lib/navigate';
import { useDispatch, useSelector } from 'calypso/state';
import { recordTracksEvent } from 'calypso/state/analytics/actions';
import { errorNotice, infoNotice } from 'calypso/state/notices/actions';
import getPreviousRoute from 'calypso/state/selectors/get-previous-route';
import { leaveCheckout } from '../lib/leave-checkout';
import useValidCheckoutBackUrl from './use-valid-checkout-back-url';
import type {
	CheckoutCloseOptions,
	CheckoutHostContext,
	CheckoutNoticeOptions,
	CheckoutNotices,
} from '@automattic/checkout';
import type { NoticeActionCreator } from 'calypso/state/notices/types';
import type { ReactNode } from 'react';

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
					createNotice( message, { id: options?.id, duration: options?.durationMs } )
				);
			};
		return { error: show( errorNotice ), info: show( infoNotice ) };
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

/**
 * Fills the shared checkout's host context with Calypso: its router, its notice
 * store, its analytics pipeline and the route the user arrived from. This is
 * the Calypso side of the one seam between an app and the checkout; every
 * other host writes its own.
 */
export default function useCalypsoCheckoutHost( {
	siteId,
	siteSlug,
}: {
	siteId: number | undefined;
	siteSlug: string | undefined;
} ): CheckoutHostContext {
	const previousPath = useSelector( getPreviousRoute );
	const forceCheckoutBackUrl = useValidCheckoutBackUrl( siteSlug );
	const notices = useCalypsoCheckoutNotices();
	const recordEvent = useCalypsoCheckoutRecordEvent();

	const close = useCallback(
		( options?: CheckoutCloseOptions ) => {
			leaveCheckout( {
				// `leaveCheckout` distinguishes an empty slug from a missing one
				// when building the domain-upsell close URL, and the callers this
				// replaces always passed a string.
				siteSlug: siteSlug ?? '',
				forceCheckoutBackUrl: options?.destinationUrl ?? forceCheckoutBackUrl,
				previousPath,
				tracksEvent: 'calypso_masterbar_close_clicked',
				userHasClearedCart: options?.cartWasEmptied ?? false,
				navigate,
			} );
		},
		[ forceCheckoutBackUrl, previousPath, siteSlug ]
	);

	// The legacy full-page checkout finishes by redirecting to the thank-you URL
	// it computes itself, so its host has nothing left to do on completion. The
	// modal hosts use this to close and route once they exist.
	const onComplete = useCallback( () => {}, [] );

	const search = window.location.search;
	const urlParams = useMemo( () => new URLSearchParams( search ), [ search ] );

	return useMemo(
		() => ( { siteId, navigate, close, onComplete, notices, urlParams, recordEvent } ),
		[ close, notices, onComplete, recordEvent, siteId, urlParams ]
	);
}
