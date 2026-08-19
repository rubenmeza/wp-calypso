/**
 * How far along an order is. A transaction succeeding starts an order; only the
 * order reaching one of the final states below says whether the purchase
 * happened.
 */
export type OrderProcessingStatus =
	| 'processing'
	| 'async-pending'
	| 'payment-confirmed'
	| 'payment-failure'
	| 'error'
	| 'success';

export interface OrderTransaction {
	order_id: number;
	user_id: number;
	/** Present once the order has succeeded. */
	receipt_id?: number;
	processing_status: OrderProcessingStatus;
}
