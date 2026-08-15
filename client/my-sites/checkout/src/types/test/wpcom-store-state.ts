import {
	emptyManagedContactDetails,
	managedContactDetailsUpdaters as updaters,
} from '../wpcom-store-state';
import type { PossiblyCompleteDomainContactDetails } from '@automattic/wpcom-checkout';

const noSavedDetails: PossiblyCompleteDomainContactDetails = {
	firstName: null,
	lastName: null,
	organization: null,
	email: null,
	phone: null,
	address1: null,
	address2: null,
	city: null,
	state: null,
	postalCode: null,
	countryCode: null,
	fax: null,
};

/**
 * Two sources answer the contact form's country: the shopper's saved contact
 * details and geo-IP detection. Both write through `setValueUnlessTouched`, so
 * without a decision the winner is whichever request answered last. These lock
 * the order the checkout wants, whatever the network does.
 */
describe( 'the country the contact form starts with', () => {
	it( 'is the saved one, even when a detected country arrived first', () => {
		const detected = updaters.populateCountryCodeFromGeoIP( emptyManagedContactDetails, 'FR' );

		const autofilled = updaters.populateDomainFieldsFromCache( detected, {
			...noSavedDetails,
			countryCode: 'US',
		} );

		expect( autofilled.countryCode?.value ).toBe( 'US' );
	} );

	it( 'falls back to the detected one when nothing is saved', () => {
		const detected = updaters.populateCountryCodeFromGeoIP( emptyManagedContactDetails, 'FR' );

		const autofilled = updaters.populateDomainFieldsFromCache( detected, noSavedDetails );

		expect( autofilled.countryCode?.value ).toBe( 'FR' );
	} );

	it( 'is whatever the shopper chose, once they have chosen', () => {
		const chosen = updaters.updateCountryCode( emptyManagedContactDetails, 'DE' );

		const detected = updaters.populateCountryCodeFromGeoIP( chosen, 'FR' );
		const autofilled = updaters.populateDomainFieldsFromCache( detected, {
			...noSavedDetails,
			countryCode: 'US',
		} );

		expect( autofilled.countryCode?.value ).toBe( 'DE' );
	} );
} );
