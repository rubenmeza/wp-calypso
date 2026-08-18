import { fetchDomainContactInformation } from '@automattic/api-core';
import { queryOptions } from '@tanstack/react-query';

export const domainContactInformationQuery = () =>
	queryOptions( {
		queryKey: [ 'me', 'domain-contact-information' ],
		queryFn: () => fetchDomainContactInformation(),
		// Personal data: it belongs in memory for as long as the tab is open, and
		// never in the query cache that is written to storage.
		meta: { persist: false },
	} );
