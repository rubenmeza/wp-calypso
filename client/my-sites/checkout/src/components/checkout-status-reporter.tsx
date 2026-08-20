import { useReportCheckoutStatus } from '@automattic/checkout';
import {
	FormStatus,
	TransactionStatus,
	useFormStatus,
	useTransactionStatus,
} from '@automattic/composite-checkout';

/**
 * Tells whatever host is around this checkout whether it may be dismissed.
 *
 * Only code inside the checkout provider can see that a payment is being
 * submitted or a redirect is under way, and only the host can act on it, so
 * this sits inside and reports outwards. It renders nothing, and reports to
 * nobody on the full-page route, where there is no frame to guard.
 */
export function CheckoutStatusReporter() {
	const { formStatus } = useFormStatus();
	const { transactionStatus } = useTransactionStatus();

	// A paid-for order is not something to hold a frame open for, and the form
	// status cannot say so on its own: composite-checkout pins it to SUBMITTING
	// for any transaction that started and did not fail, `complete` included.
	const isPaidFor = transactionStatus === TransactionStatus.COMPLETE;
	const isBusy =
		! isPaidFor &&
		( formStatus === FormStatus.SUBMITTING ||
			transactionStatus === TransactionStatus.PENDING ||
			transactionStatus === TransactionStatus.REDIRECTING );

	useReportCheckoutStatus( { isBusy, canClose: ! isBusy } );

	return null;
}
