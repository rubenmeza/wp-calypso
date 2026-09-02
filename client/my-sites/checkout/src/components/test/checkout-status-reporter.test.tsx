/**
 * @jest-environment jsdom
 */
import { CheckoutStatusProvider, useCheckoutStatus } from '@automattic/checkout';
import {
	FormStatus,
	TransactionStatus,
	useFormStatus,
	useTransactionStatus,
} from '@automattic/composite-checkout';
import { render, screen } from '@testing-library/react';
import { CheckoutStatusReporter } from '../checkout-status-reporter';

// Only the two status hooks, spelled out: pulling in the real module here
// crashes on its own circular imports.
jest.mock( '@automattic/composite-checkout', () => ( {
	__esModule: true,
	FormStatus: {
		LOADING: 'loading',
		READY: 'ready',
		SUBMITTING: 'submitting',
		VALIDATING: 'validating',
	},
	TransactionStatus: {
		NOT_STARTED: 'not-started',
		PENDING: 'pending',
		COMPLETE: 'complete',
		REDIRECTING: 'redirecting',
		ERROR: 'error',
	},
	useFormStatus: jest.fn(),
	useTransactionStatus: jest.fn(),
} ) );

const mockFormStatus = useFormStatus as jest.MockedFunction< typeof useFormStatus >;
const mockTransactionStatus = useTransactionStatus as jest.MockedFunction<
	typeof useTransactionStatus
>;

function HostFrame() {
	const { isBusy, canClose } = useCheckoutStatus();
	return (
		<span data-testid="frame">
			{ canClose ? 'closable' : 'held-open' }/{ isBusy ? 'busy' : 'idle' }
		</span>
	);
}

function reportedFor( formStatus: FormStatus, transactionStatus: TransactionStatus ) {
	mockFormStatus.mockReturnValue( { formStatus } as ReturnType< typeof useFormStatus > );
	mockTransactionStatus.mockReturnValue( {
		transactionStatus,
	} as ReturnType< typeof useTransactionStatus > );

	render(
		<CheckoutStatusProvider>
			<HostFrame />
			<CheckoutStatusReporter />
		</CheckoutStatusProvider>
	);

	return screen.getByTestId( 'frame' ).textContent;
}

beforeEach( () => jest.clearAllMocks() );

describe( 'what the frame around a checkout is told', () => {
	it( 'is that it may close while the shopper is still filling the form in', () => {
		expect( reportedFor( FormStatus.READY, TransactionStatus.NOT_STARTED ) ).toBe(
			'closable/idle'
		);
	} );

	it( 'is that it may close while the cart is being revalidated', () => {
		expect( reportedFor( FormStatus.VALIDATING, TransactionStatus.NOT_STARTED ) ).toBe(
			'closable/idle'
		);
	} );

	it( 'is to stay open once the shopper has submitted', () => {
		expect( reportedFor( FormStatus.SUBMITTING, TransactionStatus.NOT_STARTED ) ).toBe(
			'held-open/busy'
		);
	} );

	it( 'is to stay open while the payment is with the server', () => {
		expect( reportedFor( FormStatus.SUBMITTING, TransactionStatus.PENDING ) ).toBe(
			'held-open/busy'
		);
	} );

	it( 'is to stay open while the shopper is being sent to their bank', () => {
		expect( reportedFor( FormStatus.SUBMITTING, TransactionStatus.REDIRECTING ) ).toBe(
			'held-open/busy'
		);
	} );

	it( 'is that it may close once the payment has gone through', () => {
		// The form status is still SUBMITTING here: composite-checkout holds it
		// there for any transaction that started and did not fail. Reading it
		// alone would hold the frame open forever after a successful purchase.
		expect( reportedFor( FormStatus.SUBMITTING, TransactionStatus.COMPLETE ) ).toBe(
			'closable/idle'
		);
	} );

	it( 'is that it may close once the payment has failed, so the shopper is not trapped', () => {
		expect( reportedFor( FormStatus.READY, TransactionStatus.ERROR ) ).toBe( 'closable/idle' );
	} );
} );
