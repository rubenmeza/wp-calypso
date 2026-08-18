import { QueryClient, dehydrate } from '@tanstack/react-query';
import { dehydrateOptions } from '../dehydrate-options';
import { userPaymentMethodsQuery } from '../me-payment-methods';

describe( 'saved payment methods and the on-disk cache', () => {
	test( 'are never written to storage', async () => {
		const client = new QueryClient();
		const query = userPaymentMethodsQuery( { type: 'card' } );

		await client.prefetchQuery( {
			...query,
			queryFn: () => [
				{
					stored_details_id: '1',
					card_last_4: '4242',
					name: 'A Cardholder',
					tax_location: { postal_code: '10001' },
				},
			],
		} );

		// It is in memory, where checkout and the Dashboard read it from.
		expect( client.getQueryData( query.queryKey ) ).toHaveLength( 1 );

		const dehydrated = dehydrate( client, dehydrateOptions );

		// It is not in what gets written to localStorage.
		expect( dehydrated.queries ).toHaveLength( 0 );
		expect( JSON.stringify( dehydrated ) ).not.toContain( '4242' );
	} );
} );
