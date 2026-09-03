/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react';
import { CheckoutSlotsProvider, useCheckoutSlots, useSlotHook } from '../slots-context';
import type { CheckoutHostSlots } from '../slots';
import type { ReactNode } from 'react';

function ReportsCountry() {
	const slots = useCheckoutSlots();
	const country = useSlotHook( slots.legacyReads?.useUserCountryCode, undefined );
	return <span>{ country ? `country ${ country }` : 'no country' }</span>;
}

function renderWithSlots( ui: ReactNode, slots?: CheckoutHostSlots ) {
	return render(
		slots ? <CheckoutSlotsProvider value={ slots }>{ ui }</CheckoutSlotsProvider> : <>{ ui }</>
	);
}

describe( 'host slots', () => {
	it( 'turns a branch off when no host supplied any slots at all', () => {
		renderWithSlots( <ReportsCountry /> );

		expect( screen.getByText( 'no country' ) ).toBeVisible();
	} );

	it( 'turns a branch off when the host supplied other slots but not this one', () => {
		renderWithSlots( <ReportsCountry />, { legacyReads: {} } );

		expect( screen.getByText( 'no country' ) ).toBeVisible();
	} );

	it( 'runs the branch when the host supplied it', () => {
		renderWithSlots( <ReportsCountry />, {
			legacyReads: { useUserCountryCode: () => 'FR' },
		} );

		expect( screen.getByText( 'country FR' ) ).toBeVisible();
	} );

	it( 'lets a host answer nothing through a slot it did supply', () => {
		renderWithSlots( <ReportsCountry />, {
			legacyReads: { useUserCountryCode: () => undefined },
		} );

		expect( screen.getByText( 'no country' ) ).toBeVisible();
	} );
} );

describe( 'a hook slot that changes while the checkout is mounted', () => {
	let consoleError: jest.SpyInstance;

	beforeEach( () => {
		consoleError = jest.spyOn( console, 'error' ).mockImplementation( () => {} );
	} );

	afterEach( () => {
		consoleError.mockRestore();
	} );

	it( 'throws when a host fills a slot it did not have', () => {
		const { rerender } = renderWithSlots( <ReportsCountry />, { legacyReads: {} } );

		expect( () =>
			rerender(
				<CheckoutSlotsProvider value={ { legacyReads: { useUserCountryCode: () => 'FR' } } }>
					<ReportsCountry />
				</CheckoutSlotsProvider>
			)
		).toThrow( /added or removed while the checkout was mounted/ );
	} );

	it( 'throws when a host drops a slot it had filled', () => {
		const { rerender } = renderWithSlots( <ReportsCountry />, {
			legacyReads: { useUserCountryCode: () => 'FR' },
		} );

		expect( () =>
			rerender(
				<CheckoutSlotsProvider value={ { legacyReads: {} } }>
					<ReportsCountry />
				</CheckoutSlotsProvider>
			)
		).toThrow( /added or removed while the checkout was mounted/ );
	} );
} );
