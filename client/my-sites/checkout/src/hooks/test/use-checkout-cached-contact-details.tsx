/**
 * @jest-environment jsdom
 */
import { fetchDomainContactInformation } from '@automattic/api-core';
import { isEnabled } from '@automattic/calypso-config';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor, act } from '@testing-library/react';
import wp from 'calypso/lib/wp';
import { useUpdateCachedContactDetails } from '../use-cached-contact-details';
import { useCheckoutCachedContactDetails } from '../use-checkout-cached-contact-details';
import type { ReactNode } from 'react';

jest.mock( '@automattic/calypso-config', () => {
	const config = jest.fn();
	return Object.assign( config, { __esModule: true, default: config, isEnabled: jest.fn() } );
} );

jest.mock( 'calypso/lib/wp', () => ( {
	__esModule: true,
	default: { req: { get: jest.fn(), post: jest.fn() } },
} ) );

jest.mock( '@automattic/api-core', () => ( {
	...jest.requireActual( '@automattic/api-core' ),
	fetchDomainContactInformation: jest.fn(),
} ) );

const mockIsEnabled = isEnabled as jest.MockedFunction< typeof isEnabled >;
const mockSharedFetch = fetchDomainContactInformation as jest.MockedFunction<
	typeof fetchDomainContactInformation
>;
const mockLegacyGet = wp.req.get as jest.Mock;
const mockLegacyPost = wp.req.post as jest.Mock;

const savedContactDetails = {
	first_name: 'Anna',
	last_name: 'Shopper',
	organization: 'Example Ltd',
	email: 'anna@example.com',
	phone: '+15558675309',
	address_1: '123 Main Street',
	address_2: 'Apt 4',
	city: 'New York',
	state: 'NY',
	postal_code: '10001',
	country_code: 'US',
	fax: '',
	extra: { ca: { lang: 'EN', legal_type: 'CCT', cira_agreement_accepted: true } },
};

function renderContactDetails( { isLoggedOut }: { isLoggedOut?: boolean } = {} ) {
	const queryClient = new QueryClient( { defaultOptions: { queries: { retry: false } } } );
	const wrapper = ( { children }: { children: ReactNode } ) => (
		<QueryClientProvider client={ queryClient }>{ children }</QueryClientProvider>
	);
	return renderHook(
		() => ( {
			details: useCheckoutCachedContactDetails( { isLoggedOut } ),
			update: useUpdateCachedContactDetails(),
		} ),
		{ wrapper }
	);
}

beforeEach( () => {
	jest.clearAllMocks();
	mockSharedFetch.mockResolvedValue( savedContactDetails );
	mockLegacyGet.mockResolvedValue( savedContactDetails );
	mockLegacyPost.mockResolvedValue( undefined );
} );

describe( 'the cached contact details with the shared query', () => {
	beforeEach( () => {
		mockIsEnabled.mockImplementation( ( flag ) => flag === 'checkout/query-contact' );
	} );

	it( 'autofills from the shared query', async () => {
		const { result } = renderContactDetails();

		await waitFor( () => expect( result.current.details.contactDetails ).not.toBeNull() );

		expect( result.current.details.contactDetails ).toMatchObject( {
			firstName: 'Anna',
			email: 'anna@example.com',
			postalCode: '10001',
			countryCode: 'US',
		} );
	} );

	it( 'leaves the older read alone, so the details are fetched once', async () => {
		const { result } = renderContactDetails();

		await waitFor( () => expect( result.current.details.contactDetails ).not.toBeNull() );

		expect( mockSharedFetch ).toHaveBeenCalledTimes( 1 );
		expect( mockLegacyGet ).not.toHaveBeenCalled();
	} );

	it( 'reports a failure the same way the older read does', async () => {
		mockSharedFetch.mockRejectedValue( new Error( 'nope' ) );

		const { result } = renderContactDetails();

		await waitFor( () => expect( result.current.details.isError ).toBe( true ) );
		expect( result.current.details.contactDetails ).toBeNull();
	} );

	it( 'fetches nothing for a logged-out shopper', async () => {
		renderContactDetails( { isLoggedOut: true } );

		await waitFor( () => expect( mockSharedFetch ).not.toHaveBeenCalled() );
		expect( mockLegacyGet ).not.toHaveBeenCalled();
	} );
} );

describe( 'the cached contact details with the flag off', () => {
	beforeEach( () => {
		mockIsEnabled.mockReturnValue( false );
	} );

	it( 'keeps autofilling from the older read', async () => {
		const { result } = renderContactDetails();

		await waitFor( () => expect( result.current.details.contactDetails ).not.toBeNull() );

		expect( mockLegacyGet ).toHaveBeenCalledWith( '/me/domain-contact-information' );
		expect( mockSharedFetch ).not.toHaveBeenCalled();
	} );

	it( 'fetches nothing for a logged-out shopper', async () => {
		renderContactDetails( { isLoggedOut: true } );

		await waitFor( () => expect( mockLegacyGet ).not.toHaveBeenCalled() );
		expect( mockSharedFetch ).not.toHaveBeenCalled();
	} );
} );

describe( 'the two sources', () => {
	async function detailsWithFlag( isFlagOn: boolean ) {
		mockIsEnabled.mockImplementation( ( flag ) => isFlagOn && flag === 'checkout/query-contact' );
		const { result } = renderContactDetails();
		await waitFor( () => expect( result.current.details.contactDetails ).not.toBeNull() );
		return result.current.details.contactDetails;
	}

	it( 'answer with the same contact details for the same saved data', async () => {
		expect( await detailsWithFlag( true ) ).toEqual( await detailsWithFlag( false ) );
	} );
} );

describe( 'saving contact details', () => {
	it( 'refreshes both caches, whichever one checkout is reading', async () => {
		mockIsEnabled.mockImplementation( ( flag ) => flag === 'checkout/query-contact' );
		const { result } = renderContactDetails();

		await waitFor( () => expect( mockSharedFetch ).toHaveBeenCalledTimes( 1 ) );

		await act( async () => {
			result.current.update( { contact_information: { first_name: 'Anna Maria' } } );
		} );

		await waitFor( () => expect( mockSharedFetch ).toHaveBeenCalledTimes( 2 ) );
	} );
} );
