/**
 * @jest-environment jsdom
 */
import { renderHook } from '@testing-library/react';
import useCheckoutSiteSlug from '../use-checkout-site-slug';
import type { SitelessCheckoutType } from '@automattic/wpcom-checkout';

const allSlugs = {
	siteSlug: 'example.wordpress.com',
	jetpackSiteSlug: 'jetpack.example.com',
};

function slugFor( sitelessCheckoutType?: SitelessCheckoutType ) {
	return renderHook( () => useCheckoutSiteSlug( { ...allSlugs, sitelessCheckoutType } ) ).result
		.current;
}

describe( 'useCheckoutSiteSlug', () => {
	it( 'uses the selected site outside the siteless flows', () => {
		expect( slugFor( undefined ) ).toBe( 'example.wordpress.com' );
	} );

	it( 'uses the flow’s own slug for Jetpack siteless checkout', () => {
		expect( slugFor( 'jetpack' ) ).toBe( 'jetpack.example.com' );
	} );

	it( 'has no slug for the siteless flows whose selected slug is a placeholder', () => {
		expect( slugFor( 'akismet' ) ).toBeUndefined();
		expect( slugFor( 'marketplace' ) ).toBeUndefined();
		expect( slugFor( 'unified' ) ).toBeUndefined();
	} );
} );
