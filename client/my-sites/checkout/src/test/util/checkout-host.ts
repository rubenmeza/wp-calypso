import type { CheckoutHostContext } from '@automattic/checkout';

/**
 * A host context filled with inert fakes, for tests that care about one
 * capability and not the other fifteen. Pass overrides for the ones under test.
 *
 * Without this, every test that mounts a host has to enumerate the whole
 * interface, and adding a capability breaks tests that never used it.
 */
export function createTestCheckoutHost(
	overrides: Partial< CheckoutHostContext > = {}
): CheckoutHostContext {
	return {
		siteId: undefined,
		cartKey: undefined,
		navigate: jest.fn(),
		close: jest.fn(),
		onComplete: jest.fn(),
		notices: { error: jest.fn(), info: jest.fn(), remove: jest.fn() },
		urlParams: new URLSearchParams( '' ),
		wpcom: {
			req: { get: jest.fn(), post: jest.fn() },
		} as unknown as CheckoutHostContext[ 'wpcom' ],
		logError: jest.fn(),
		recordEvent: jest.fn(),
		recordGaEvent: jest.fn(),
		recordCartAddEvent: jest.fn(),
		recordPurchase: jest.fn(),
		recordRecaptchaAction: jest.fn().mockResolvedValue( null ),
		getStripeConfiguration: jest.fn().mockResolvedValue( {} ),
		loadPaymentGateway: jest.fn().mockResolvedValue( {} ),
		...overrides,
	};
}
