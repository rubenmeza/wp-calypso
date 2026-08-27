import { isAtomicSite, isCommerceGardenSite, isJetpackSite } from '../site-facts';
import type { Site } from '@automattic/api-core';

function site( overrides: Partial< Site > = {} ): Site {
	return {
		ID: 1,
		slug: 'example.wordpress.com',
		jetpack: false,
		jetpack_connection: false,
		is_wpcom_atomic: false,
		is_wpcom_flex: false,
		is_garden: false,
		garden_name: null,
		is_private: false,
		...overrides,
	} as Site;
}

describe( 'whether a site runs Jetpack', () => {
	it( 'says no for a simple WordPress.com site', () => {
		expect( isJetpackSite( site() ) ).toBe( false );
	} );

	it( 'says yes for a self-hosted site with the Jetpack plugin', () => {
		expect( isJetpackSite( site( { jetpack: true, jetpack_connection: true } ) ) ).toBe( true );
	} );

	it( 'says yes for a site connected through a standalone Jetpack product', () => {
		// No full Jetpack plugin, but a connection: Jetpack Backup or Search on
		// its own.
		expect( isJetpackSite( site( { jetpack_connection: true } ) ) ).toBe( true );
	} );

	it( 'says yes for an Atomic site, which runs Jetpack too', () => {
		// Call sites that mean "Jetpack, but not hosted here" pair this with
		// `isAtomicSite`; the fact on its own does not.
		expect(
			isJetpackSite( site( { jetpack: true, jetpack_connection: true, is_wpcom_atomic: true } ) )
		).toBe( true );
	} );

	it( 'says no when there is no site', () => {
		expect( isJetpackSite( undefined ) ).toBe( false );
	} );
} );

describe( 'whether a site is Atomic', () => {
	it( 'reads the canonical Atomic flag', () => {
		expect( isAtomicSite( site( { is_wpcom_atomic: true } ) ) ).toBe( true );
		expect( isAtomicSite( site() ) ).toBe( false );
	} );

	it( 'says no when there is no site', () => {
		expect( isAtomicSite( undefined ) ).toBe( false );
	} );
} );

describe( 'whether a site is a Commerce garden site', () => {
	it( 'needs both the garden flag and the commerce name', () => {
		expect( isCommerceGardenSite( site( { is_garden: true, garden_name: 'commerce' } ) ) ).toBe(
			true
		);
		expect( isCommerceGardenSite( site( { is_garden: true, garden_name: 'other' } ) ) ).toBe(
			false
		);
		expect( isCommerceGardenSite( site( { garden_name: 'commerce' } ) ) ).toBe( false );
	} );

	it( 'says no when there is no site', () => {
		expect( isCommerceGardenSite( undefined ) ).toBe( false );
	} );
} );
