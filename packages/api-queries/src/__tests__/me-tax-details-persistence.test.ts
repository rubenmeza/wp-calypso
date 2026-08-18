import { QueryClient, dehydrate } from '@tanstack/react-query';
import { dehydrateOptions } from '../dehydrate-options';
import { userTaxDetailsQuery } from '../me-tax-details';

describe( 'saved VAT details and the on-disk cache', () => {
	test( 'are never written to storage', async () => {
		const client = new QueryClient();
		const query = userTaxDetailsQuery();

		await client.prefetchQuery( {
			...query,
			queryFn: () => ( {
				country: 'GB',
				id: 'GB123456789',
				name: 'A Business',
				address: '123 Main Street',
			} ),
		} );

		// It is in memory, where the VAT form reads it from.
		expect( client.getQueryData( query.queryKey ) ).toMatchObject( { id: 'GB123456789' } );

		const dehydrated = dehydrate( client, dehydrateOptions );

		expect( dehydrated.queries ).toHaveLength( 0 );
		expect( JSON.stringify( dehydrated ) ).not.toContain( 'GB123456789' );
	} );
} );
