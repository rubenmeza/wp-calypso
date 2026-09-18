/**
 * @jest-environment jsdom
 */
import { fetchSite } from '@automattic/api-core';
import { waitFor } from '@testing-library/react';
import { renderHookWithProvider } from 'calypso/test-helpers/testing-library';
import { isSharedFoundationEnabled } from '../../lib/shared-foundation';
import { useCheckoutSiteFacts } from '../use-checkout-site-facts';
import type { CheckoutSiteFacts } from '../use-checkout-site-facts';
import type { Site } from '@automattic/api-core';
import type { SiteDetails } from '@automattic/data-stores';

jest.mock( '@automattic/api-core', () => ( {
	...jest.requireActual( '@automattic/api-core' ),
	fetchSite: jest.fn(),
} ) );
jest.mock( '../../lib/shared-foundation', () => ( {
	isSharedFoundationEnabled: jest.fn(),
} ) );

const mockFetchSite = fetchSite as jest.MockedFunction< typeof fetchSite >;
const mockIsSharedFoundationEnabled = isSharedFoundationEnabled as jest.MockedFunction<
	typeof isSharedFoundationEnabled
>;

const SITE_ID = 4321;

/**
 * One `/sites/:id` payload as the backend sends it, with both the top-level
 * flags the shared predicates read and the `options` the Redux selectors read.
 * The two sources answer off different fields of the same response, so a
 * fixture that only set one side's fields would prove nothing.
 */
function sitePayload( {
	options,
	...overrides
}: Partial< Omit< Site, 'options' > > & { options?: Partial< SiteDetails[ 'options' ] > } = {} ) {
	return {
		ID: SITE_ID,
		URL: 'https://example.com',
		slug: 'example.com',
		jetpack: false,
		jetpack_connection: false,
		is_wpcom_atomic: false,
		is_wpcom_flex: false,
		is_garden: false,
		garden_name: null,
		is_private: false,
		...overrides,
		options: {
			is_wpcom_simple: false,
			is_wpcom_atomic: false,
			is_automated_transfer: false,
			jetpack_connection_active_plugins: [],
			...options,
		},
	} as unknown as Site;
}

const facts = ( overrides: Partial< CheckoutSiteFacts > = {} ): CheckoutSiteFacts => ( {
	slug: 'example.com',
	isJetpack: false,
	isAtomic: false,
	isCommerceGarden: false,
	isPrivate: false,
	...overrides,
} );

const sites: [ string, Site, CheckoutSiteFacts ][] = [
	[ 'a simple WordPress.com site', sitePayload( { options: { is_wpcom_simple: true } } ), facts() ],
	[
		'an Atomic site',
		sitePayload( {
			jetpack: true,
			jetpack_connection: true,
			is_wpcom_atomic: true,
			options: {
				is_wpcom_atomic: true,
				is_automated_transfer: true,
				jetpack_connection_active_plugins: [ 'jetpack' ],
			},
		} ),
		facts( { isJetpack: true, isAtomic: true } ),
	],
	[
		'a self-hosted site with the Jetpack plugin',
		sitePayload( {
			jetpack: true,
			jetpack_connection: true,
			options: { jetpack_connection_active_plugins: [ 'jetpack' ] },
		} ),
		facts( { isJetpack: true } ),
	],
	[
		'a self-hosted site connected through a standalone Jetpack product',
		sitePayload( {
			jetpack_connection: true,
			options: { jetpack_connection_active_plugins: [ 'jetpack-backup' ] },
		} ),
		facts( { isJetpack: true } ),
	],
	[
		'a Commerce garden site',
		sitePayload( {
			jetpack: true,
			jetpack_connection: true,
			is_garden: true,
			garden_name: 'commerce',
			options: { jetpack_connection_active_plugins: [ 'jetpack' ] },
		} ),
		facts( { isJetpack: true, isCommerceGarden: true } ),
	],
	[
		'a private site',
		sitePayload( { is_private: true, options: { is_wpcom_simple: true } } ),
		facts( { isPrivate: true } ),
	],
];

function renderFacts( payload: Site ) {
	return renderHookWithProvider( () => useCheckoutSiteFacts( SITE_ID ), {
		initialState: { sites: { items: { [ SITE_ID ]: payload } } },
	} );
}

/** Nothing but this test ties the Redux selectors to the shared predicates. */
describe( 'the site facts agree across the flag for', () => {
	beforeEach( () => {
		jest.clearAllMocks();
	} );

	it.each( sites )( '%s', async ( _, payload, expected ) => {
		mockIsSharedFoundationEnabled.mockReturnValue( false );
		const redux = renderFacts( payload );
		const fromRedux = redux.result.current;
		redux.unmount();
		expect( fromRedux ).toEqual( expected );

		mockIsSharedFoundationEnabled.mockReturnValue( true );
		mockFetchSite.mockResolvedValue( payload );
		const { result: fromSharedQuery } = renderFacts( payload );
		await waitFor( () => expect( fromSharedQuery.current.slug ).toBe( expected.slug ) );

		expect( fromSharedQuery.current ).toEqual( expected );
		expect( fromSharedQuery.current ).toEqual( fromRedux );
	} );
} );
