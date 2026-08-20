import { fetchOrderTransaction } from '@automattic/api-core';
import { queryOptions, skipToken } from '@tanstack/react-query';

export const orderTransactionQuery = ( orderId: number | undefined ) =>
	queryOptions( {
		queryKey: [ 'me', 'transactions', 'order', orderId ],
		queryFn: orderId ? () => fetchOrderTransaction( orderId ) : skipToken,
		// Where a purchase got to is a fact about the server right now, not
		// something to restore from a previous visit.
		meta: { persist: false },
	} );
