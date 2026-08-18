import { domainContactInformationQuery } from '@automattic/api-queries';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import debugFactory from 'debug';
import wpcom from 'calypso/lib/wp';
import type { DomainContactInformation } from '@automattic/api-core';
import type {
	DomainContactValidationRequest,
	ManagedContactDetailsTldExtraFieldsShape,
	PossiblyCompleteDomainContactDetails,
} from '@automattic/wpcom-checkout';

const debug = debugFactory( 'calypso:user-cached-contact-details' );

async function fetchCachedContactDetails(): Promise< PossiblyCompleteDomainContactDetails > {
	try {
		const rawData: DomainContactInformation = await wpcom.req.get(
			'/me/domain-contact-information'
		);
		debug( 'fetched cached contact details', rawData );
		return convertSnakeCaseContactDetailsToCamelCase( rawData );
	} catch ( error ) {
		return Promise.reject( new Error( 'Error fetching cached contact details' ) );
	}
}

async function setCachedContactDetails( rawData: DomainContactValidationRequest ): Promise< void > {
	debug( 'updating cached contact details to', rawData );
	wpcom.req.post( '/me/domain-contact-information', rawData );
}

export function convertSnakeCaseContactDetailsToCamelCase(
	rawData: DomainContactInformation
): PossiblyCompleteDomainContactDetails {
	return {
		firstName: rawData.first_name ?? null,
		lastName: rawData.last_name ?? null,
		organization: rawData.organization ?? null,
		email: rawData.email ?? null,
		phone: rawData.phone ?? null,
		address1: rawData.address_1 ?? null,
		address2: rawData.address_2 ?? null,
		city: rawData.city ?? null,
		state: rawData.state ?? null,
		postalCode: rawData.postal_code ?? null,
		countryCode: rawData.country_code ?? null,
		fax: rawData.fax ?? null,
		extra: convertSnakeCaseContactDetailsExtraToCamelCase( rawData.extra ),
	};
}

function convertSnakeCaseContactDetailsExtraToCamelCase(
	extra: DomainContactInformation[ 'extra' ] | undefined
): ManagedContactDetailsTldExtraFieldsShape< string | null > | undefined {
	if ( ! extra ) {
		return undefined;
	}
	return {
		ca: {
			lang: extra.ca?.lang,
			legalType: extra.ca?.legal_type,
			ciraAgreementAccepted: extra.ca?.cira_agreement_accepted
				? String( extra.ca.cira_agreement_accepted )
				: undefined,
		},
		uk: {
			registrantType: extra.uk?.registrant_type,
			registrationNumber: extra.uk?.registration_number,
			tradingName: extra.uk?.trading_name,
		},
		fr: {
			registrantType: extra.fr?.registrant_type,
			trademarkNumber: extra.fr?.trademark_number,
			sirenSiret: extra.fr?.siren_siret,
		},
	};
}

const cachedContactDetailsQueryKey = [ 'user-cached-contact-details' ];

export function useCachedContactDetails( {
	isLoggedOut,
	enabled = true,
}: {
	isLoggedOut?: boolean;
	/**
	 * False while another read is answering for these details, so that only one
	 * of the two fetches. See `useCheckoutCachedContactDetails`.
	 */
	enabled?: boolean;
} ): {
	contactDetails: PossiblyCompleteDomainContactDetails | null;
	isError: boolean;
} {
	const result = useQuery( {
		queryKey: cachedContactDetailsQueryKey,
		queryFn: fetchCachedContactDetails,
		enabled: enabled && ! isLoggedOut,
		meta: {
			persist: false,
		},
		refetchOnWindowFocus: false,
	} );

	return {
		contactDetails: result.data ?? null,
		isError: result.isError,
	};
}

export function useUpdateCachedContactDetails(): (
	updatedData: DomainContactValidationRequest
) => void {
	const queryClient = useQueryClient();
	const mutation = useMutation< void, Error, DomainContactValidationRequest >( {
		mutationFn: setCachedContactDetails,
		onSuccess: () => {
			// Both caches: either of them may be the one checkout is autofilling
			// from, and a save is the only moment either is known to be stale.
			queryClient.invalidateQueries( {
				queryKey: cachedContactDetailsQueryKey,
			} );
			queryClient.invalidateQueries( {
				queryKey: domainContactInformationQuery().queryKey,
			} );
		},
	} );
	return mutation.mutate;
}
