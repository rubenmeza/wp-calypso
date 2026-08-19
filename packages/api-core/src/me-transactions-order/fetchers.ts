import { wpcom } from '../wpcom-fetcher';
import type { OrderTransaction } from './types';

export async function fetchOrderTransaction( orderId: number ): Promise< OrderTransaction > {
	return await wpcom.req.get( `/me/transactions/order/${ orderId }`, {
		apiVersion: '1.1',
	} );
}
