import nock from 'nock';
import { fetchOrderTransaction } from '../fetchers';

const BASE = 'https://public-api.wordpress.com';

describe( 'the order transaction fetcher', () => {
	afterEach( () => nock.cleanAll() );

	it( 'reads how far along an order is', async () => {
		nock( BASE ).get( '/rest/v1.1/me/transactions/order/12345' ).reply( 200, {
			order_id: 12345,
			user_id: 99,
			receipt_id: 6789,
			processing_status: 'success',
		} );

		await expect( fetchOrderTransaction( 12345 ) ).resolves.toEqual( {
			order_id: 12345,
			user_id: 99,
			receipt_id: 6789,
			processing_status: 'success',
		} );
	} );

	it( 'reads an order that has not finished yet', async () => {
		nock( BASE )
			.get( '/rest/v1.1/me/transactions/order/12345' )
			.reply( 200, { order_id: 12345, user_id: 99, processing_status: 'processing' } );

		await expect( fetchOrderTransaction( 12345 ) ).resolves.toMatchObject( {
			processing_status: 'processing',
		} );
	} );
} );
