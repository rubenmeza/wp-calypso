/**
 * @jest-environment jsdom
 */
import { getEmptyResponseCart, getEmptyResponseCartProduct } from '@automattic/shopping-cart';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DomainRegistrationAgreement from '../domain-registration-agreement';
import type { ResponseCart } from '@automattic/shopping-cart';

const mockGaRecordEvent = jest.fn();
jest.mock( 'calypso/lib/analytics/ga', () => ( {
	gaRecordEvent: ( ...args: unknown[] ) => mockGaRecordEvent( ...args ),
} ) );

function cartWithDomains(
	domains: Array< { meta: string; extra: Record< string, unknown > } >
): ResponseCart {
	const cart = getEmptyResponseCart();
	domains.forEach( ( { meta, extra } ) => {
		cart.products.push( {
			...getEmptyResponseCartProduct(),
			is_domain_registration: true,
			meta,
			product_slug: 'dotcom_domain',
			extra: { ...getEmptyResponseCartProduct().extra, ...extra },
		} );
	} );
	return cart;
}

beforeEach( () => {
	jest.clearAllMocks();
} );

it( 'shows nothing when the cart holds no domain', () => {
	const { container } = render( <DomainRegistrationAgreement cart={ getEmptyResponseCart() } /> );

	expect( container ).toBeEmptyDOMElement();
} );

it( 'names one agreement once for the domains that share it', () => {
	const cart = cartWithDomains( [
		{ meta: 'one.com', extra: { domain_registration_agreement_url: 'https://example.com/tos' } },
		{ meta: 'two.com', extra: { domain_registration_agreement_url: 'https://example.com/tos' } },
	] );

	render( <DomainRegistrationAgreement cart={ cart } /> );

	const links = screen.getAllByRole( 'link', { name: 'Domain Registration Agreement' } );
	expect( links ).toHaveLength( 1 );
	expect( links[ 0 ] ).toHaveAttribute( 'href', 'https://example.com/tos' );
	expect( screen.getByText( /one\.com and two\.com/ ) ).toBeVisible();
} );

it( 'lists each agreement separately when the domains do not share one', () => {
	const cart = cartWithDomains( [
		{ meta: 'one.com', extra: { legal_agreements: { 'https://example.com/a': 'Agreement A' } } },
		{ meta: 'two.com', extra: { legal_agreements: { 'https://example.com/b': 'Agreement B' } } },
	] );

	render( <DomainRegistrationAgreement cart={ cart } /> );

	expect( screen.getByRole( 'link', { name: 'Agreement A' } ) ).toHaveAttribute(
		'href',
		'https://example.com/a'
	);
	expect( screen.getByRole( 'link', { name: 'Agreement B' } ) ).toHaveAttribute(
		'href',
		'https://example.com/b'
	);
} );

it( 'records the click on the agreement link', async () => {
	const cart = cartWithDomains( [
		{ meta: 'one.com', extra: { domain_registration_agreement_url: 'https://example.com/tos' } },
	] );

	render( <DomainRegistrationAgreement cart={ cart } /> );
	await userEvent.click( screen.getByRole( 'link', { name: 'Domain Registration Agreement' } ) );

	expect( mockGaRecordEvent ).toHaveBeenCalledWith(
		'Upgrades',
		'Clicked Registration Agreement Link'
	);
} );
