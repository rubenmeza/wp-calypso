import type { Site } from '@automattic/api-core';

/**
 * The facts about a site that the checkout branches on, read off the shared
 * site so every host answers them the same way.
 *
 * They are deliberately separate rather than composed: call sites combine
 * different subsets of them, and collapsing those into one predicate changes
 * what some of them mean.
 */

/** Whether the site is hosted on WordPress.com's Atomic infrastructure. */
export function isAtomicSite( site: Site | undefined ): boolean {
	return Boolean( site?.is_wpcom_atomic );
}

export function isCommerceGardenSite( site: Site | undefined ): boolean {
	return Boolean( site?.is_garden && site.garden_name === 'commerce' );
}

/**
 * Whether the site runs Jetpack at all — Atomic sites included, since they run
 * it too. Call sites that mean "Jetpack somewhere other than WordPress.com"
 * pair this with `isAtomicSite`.
 *
 * A connection without the full plugin counts: that is a site carrying a
 * standalone Jetpack product.
 */
export function isJetpackSite( site: Site | undefined ): boolean {
	return Boolean( site?.jetpack || site?.jetpack_connection );
}
