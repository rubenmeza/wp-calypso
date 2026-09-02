import { createCheckoutStore } from '@automattic/checkout';
import { register } from '@wordpress/data';

const store = createCheckoutStore();

register( store );

/** The store used everywhere a checkout has not registered one of its own. */
export const CHECKOUT_STORE = store;
