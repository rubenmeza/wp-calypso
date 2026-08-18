import { QueryClient, dehydrate } from '@tanstack/react-query';
import { dehydrateOptions } from '../dehydrate-options';
import { domainContactInformationQuery } from '../me-domain-contact-information';

describe( 'cached contact details and the on-disk cache', () => {
	test( 'are never written to storage', async () => {
		const client = new QueryClient();
		const query = domainContactInformationQuery();

		await client.prefetchQuery( {
			...query,
			queryFn: () => ( {
				first_name: 'Anna',
				last_name: 'Shopper',
				email: 'anna@example.com',
				phone: '+15558675309',
				address_1: '123 Main Street',
				postal_code: '10001',
				country_code: 'US',
			} ),
		} );

		// It is in memory, where the contact form autofills from it.
		expect( client.getQueryData( query.queryKey ) ).toMatchObject( { first_name: 'Anna' } );

		const dehydrated = dehydrate( client, dehydrateOptions );

		// It is not in what gets written to localStorage.
		expect( dehydrated.queries ).toHaveLength( 0 );
		expect( JSON.stringify( dehydrated ) ).not.toContain( 'anna@example.com' );
	} );
} );
