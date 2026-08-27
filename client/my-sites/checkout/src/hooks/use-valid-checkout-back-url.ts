import config from '@automattic/calypso-config';
import { isAllowedRedirectUrl } from '@automattic/calypso-url';
import { getLanguageSlugs } from '@automattic/i18n-utils';
import { useMemo } from 'react';
import { useCheckoutSiteFacts } from './use-checkout-site-facts';
import { useCheckoutInitialQueryArguments } from './use-checkout-surface';

const getAllowedHosts = ( siteSlug?: string ): string[] => {
	const hostname = config< string >( 'hostname' );
	const basicHosts: string[] = [
		'akismet.com',
		'jetpack.com',
		'jetpack.cloud.localhost',
		'cloud.jetpack.com',
		...( hostname ? [ hostname ] : [] ),
		...( siteSlug ? [ siteSlug.includes( '::' ) ? siteSlug.split( '::' )[ 0 ] : siteSlug ] : [] ),
	];

	const languageSpecificJetpackHosts = getLanguageSlugs().map(
		( lang: string ) => `${ lang }.jetpack.com`
	);

	return basicHosts.concat( languageSpecificJetpackHosts );
};

const useValidCheckoutBackUrl = (
	siteSlug: string | undefined,
	siteId?: number,
	queryArgName = 'checkoutBackUrl'
): string | undefined => {
	const queryArgs = useCheckoutInitialQueryArguments() ?? {};
	const backUrl = queryArgs[ queryArgName ] as string | undefined;
	const site = useCheckoutSiteFacts( siteId, siteSlug );
	const isSelfHostedJetpack = site.isJetpack && ! site.isAtomic && ! site.isCommerceGarden;

	return useMemo( () => {
		if ( ! backUrl ) {
			if ( queryArgName !== 'checkoutBackUrl' ) {
				return undefined;
			}
			// For akismet specific checkout, if navigated with direct link
			// We shouldn't be navigated to `start\domain` but to `akismet\plans`
			const isAkismetCheckout = window.location.pathname.startsWith( '/checkout/akismet' );
			if ( ! siteSlug && isAkismetCheckout ) {
				return 'https://akismet.com/pricing';
			}
			// For Jetpack specific checkout, if navigated with direct link
			// We should redirect to the jetpack pricing page
			if ( isSelfHostedJetpack ) {
				return 'https://cloud.jetpack.com/pricing/' + ( siteSlug || '' );
			}
			return undefined;
		}

		const allowedHosts = getAllowedHosts( siteSlug );

		if ( isAllowedRedirectUrl( backUrl, allowedHosts ) ) {
			return backUrl;
		}

		return undefined;
	}, [ backUrl, queryArgName, isSelfHostedJetpack, siteSlug ] );
};

export default useValidCheckoutBackUrl;
