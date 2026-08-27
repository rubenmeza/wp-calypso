/**
 * @jest-environment jsdom
 */
import { CheckoutSlotsProvider } from '@automattic/checkout';
import { render, screen } from '@testing-library/react';
import { TermsOfService } from '../terms-of-service';
import type { CheckoutHostSlots } from '@automattic/checkout';
import type { ReactNode } from 'react';

jest.mock( '../../hooks/use-checkout-analytics-bridge', () => ( {
	useCheckoutRecordGaEvent: () => jest.fn(),
} ) );

function renderTerms( slots: CheckoutHostSlots ) {
	const wrapper = ( { children }: { children: ReactNode } ) => (
		<CheckoutSlotsProvider value={ slots }>{ children }</CheckoutSlotsProvider>
	);
	return render(
		<TermsOfService
			hasRenewableSubscription={ false }
			isGiftPurchase={ false }
			is100YearPlanPurchase={ false }
			is100YearDomainPurchase={ false }
		/>,
		{ wrapper }
	);
}

it( 'points at the Akismet terms when the host says this is Akismet checkout', () => {
	renderTerms( { isAkismetCheckout: () => true } );

	expect( screen.getByRole( 'link', { name: 'Terms of Service' } ) ).toHaveAttribute(
		'href',
		'https://akismet.com/tos/'
	);
} );

it( 'points at the WordPress.com terms when it says otherwise', () => {
	renderTerms( { isAkismetCheckout: () => false } );

	expect( screen.getByRole( 'link', { name: 'Terms of Service' } ) ).toHaveAttribute(
		'href',
		'https://wordpress.com/tos/'
	);
} );

it( 'points at the WordPress.com terms for a host that fills no slots', () => {
	// An absent slot turns its branch off; it never makes the branch behave
	// differently. This is the whole slot contract, on the simplest branch that
	// has one.
	renderTerms( {} );

	expect( screen.getByRole( 'link', { name: 'Terms of Service' } ) ).toHaveAttribute(
		'href',
		'https://wordpress.com/tos/'
	);
} );
