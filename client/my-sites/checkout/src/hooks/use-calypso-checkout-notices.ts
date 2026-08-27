import { useMemo } from 'react';
import { useDispatch } from 'calypso/state';
import { errorNotice, infoNotice, removeNotice } from 'calypso/state/notices/actions';
import type { CheckoutNoticeOptions, CheckoutNotices } from '@automattic/checkout';
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
