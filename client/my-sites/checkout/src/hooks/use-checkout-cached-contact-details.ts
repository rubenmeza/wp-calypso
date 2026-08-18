import { domainContactInformationQuery } from '@automattic/api-queries';
import { isEnabled } from '@automattic/calypso-config';
import { useQuery } from '@tanstack/react-query';
import {
	convertSnakeCaseContactDetailsToCamelCase,
	useCachedContactDetails,
} from './use-cached-contact-details';
import type { PossiblyCompleteDomainContactDetails } from '@automattic/wpcom-checkout';

/**
 * The contact details checkout autofills from, out of whichever source the
 * `checkout/query-contact` flag selects: the shared query, or checkout's own
 * older read. Both are the same `/me/domain-contact-information` payload put
 * through the same conversion, so the form is filled with the same values
 * either way. The old read goes away once the flag is retired.
 *
 * Only one of the two ever fetches. Hooks cannot be called conditionally, so
 * both are mounted and the unselected one is disabled.
 */
export function useCheckoutCachedContactDetails( { isLoggedOut }: { isLoggedOut?: boolean } ): {
	contactDetails: PossiblyCompleteDomainContactDetails | null;
	isError: boolean;
} {
	const useSharedQuery = isEnabled( 'checkout/query-contact' );

	const legacy = useCachedContactDetails( { isLoggedOut, enabled: ! useSharedQuery } );

	const shared = useQuery( {
		...domainContactInformationQuery(),
		enabled: useSharedQuery && ! isLoggedOut,
		// As the older read has always done: re-reading personal data every time
		// the shopper tabs back is not worth the request.
		refetchOnWindowFocus: false,
		// Declared out here rather than inline so that the converted details keep
		// one identity across renders: they are an effect dependency of the form
		// autofill.
		select: convertSnakeCaseContactDetailsToCamelCase,
	} );

	if ( ! useSharedQuery ) {
		return legacy;
	}

	return { contactDetails: shared.data ?? null, isError: shared.isError };
}
