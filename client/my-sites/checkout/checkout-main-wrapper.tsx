import config from '@automattic/calypso-config';
import { StripeHookProvider } from '@automattic/calypso-stripe';
import { CheckoutErrorBoundary } from '@automattic/composite-checkout';
import styled from '@emotion/styled';
import { useTranslate } from 'i18n-calypso';
import { useEffect } from 'react';
import { logToLogstash } from 'calypso/lib/logstash';
import { getStripeConfiguration } from 'calypso/lib/store-transactions';
import Recaptcha from 'calypso/signup/recaptcha';
import { useSelector } from 'calypso/state';
import { getCurrentUserLocale } from 'calypso/state/current-user/selectors';
import { getSelectedSiteId } from 'calypso/state/ui/selectors';
import CalypsoShoppingCartProvider from './calypso-shopping-cart-provider';
import { CalypsoCheckoutHost } from './src/components/calypso-checkout-host';
import { CheckoutContent } from './src/components/checkout-content';
import CheckoutMain from './src/components/checkout-main';
import { CheckoutStoreProvider } from './src/components/checkout-store-provider';
import { calypsoCheckoutLogError } from './src/hooks/use-calypso-checkout-log-error';
import useCheckoutSiteSlug from './src/hooks/use-checkout-site-slug';
import { logStashLoadErrorEvent } from './src/lib/error-logging';
import { isSharedFoundationEnabled } from './src/lib/shared-foundation';
import type { SitelessCheckoutType } from '@automattic/wpcom-checkout';

const logCheckoutError = ( error: Error ) => {
	logStashLoadErrorEvent( calypsoCheckoutLogError, 'checkout_system_decider', error );
};

/** The page the checkout fills when the full-page route is the host. */
const CheckoutPageShell = styled.div`
	display: flex;
	flex-direction: column;
	min-height: 100vh;

	> * {
		flex: 1;
	}
`;

export default function CheckoutMainWrapper( {
	productAliasFromUrl,
	productSourceFromUrl,
	purchaseId,
	selectedFeature,
	couponCode,
	isComingFromUpsell,
	plan,
	selectedSite,
	redirectTo,
	sitelessCheckoutType,
	isLoggedOutCart,
	isNoSiteCart,
	isGiftPurchase,
	jetpackSiteSlug,
	jetpackPurchaseToken,
	isUserComingFromLoginForm,
	connectAfterCheckout,
	fromSiteSlug,
	adminUrl,
}: {
	productAliasFromUrl?: string;
	productSourceFromUrl?: string;
	purchaseId?: number;
	selectedFeature?: string;
	couponCode?: string;
	isComingFromUpsell?: boolean;
	plan?: string;
	selectedSite?: { slug?: string };
	redirectTo?: string;
	sitelessCheckoutType: SitelessCheckoutType;
	isLoggedOutCart?: boolean;
	isNoSiteCart?: boolean;
	isGiftPurchase?: boolean;
	jetpackSiteSlug?: string;
	jetpackPurchaseToken?: string;
	isUserComingFromLoginForm?: boolean;
	connectAfterCheckout?: boolean;
	/**
	 * `fromSiteSlug` is the Jetpack site slug passed from the site via url query arg (into
	 * checkout), for use cases when the site slug cannot be retrieved from state, ie- when there
	 * is not a site in context, such as in siteless checkout. As opposed to `siteSlug` which is
	 * the site slug present when the site is in context (ie- when site is connected and user is
	 * logged in).
	 */
	fromSiteSlug?: string;
	adminUrl?: string;
} ) {
	const translate = useTranslate();
	const locale = useSelector( getCurrentUserLocale );
	const selectedSiteId = useSelector( getSelectedSiteId ) ?? undefined;

	useEffect( () => {
		window.scrollTo( 0, 0 );
	}, [] );

	useEffect( () => {
		if ( productAliasFromUrl ) {
			logToLogstash( {
				feature: 'calypso_client',
				message: 'CheckoutMainWrapper saw productSlug to add',
				severity: config( 'env_id' ) === 'production' ? 'info' : 'debug',
				extra: {
					productSlug: productAliasFromUrl,
				},
			} );
		}
	}, [ productAliasFromUrl ] );

	let siteSlug = selectedSite?.slug;

	if ( ! siteSlug ) {
		siteSlug = 'no-site';

		/*
		 * As Gifting purchases are for sites, we avoid to use no-user.
		 */
		if ( ( ! isGiftPurchase && isLoggedOutCart ) || isNoSiteCart ) {
			siteSlug = 'no-user';
		}
	}

	const checkoutSiteSlug = useCheckoutSiteSlug( {
		siteSlug,
		sitelessCheckoutType,
		jetpackSiteSlug,
	} );

	const isContentSplit = isSharedFoundationEnabled();
	const checkoutProps = {
		siteSlug: siteSlug,
		siteId: selectedSiteId,
		productAliasFromUrl: productAliasFromUrl,
		productSourceFromUrl: productSourceFromUrl,
		purchaseId: purchaseId,
		couponCode: couponCode,
		redirectTo: redirectTo,
		feature: selectedFeature,
		plan: plan,
		isComingFromUpsell: isComingFromUpsell,
		sitelessCheckoutType: sitelessCheckoutType,
		isLoggedOutCart: isLoggedOutCart,
		isNoSiteCart: isNoSiteCart,
		isGiftPurchase: isGiftPurchase,
		jetpackSiteSlug: jetpackSiteSlug,
		jetpackPurchaseToken: jetpackPurchaseToken,
		isUserComingFromLoginForm: isUserComingFromLoginForm,
		connectAfterCheckout: connectAfterCheckout,
		fromSiteSlug: fromSiteSlug,
		adminUrl: adminUrl,
	};
	const checkout = isContentSplit ? (
		<CheckoutPageShell>
			<CheckoutContent { ...checkoutProps } recordsPageView />
		</CheckoutPageShell>
	) : (
		<CheckoutMain { ...checkoutProps } />
	);

	return (
		<CheckoutStoreProvider>
			<CheckoutErrorBoundary
				errorMessage={ translate( 'Sorry, there was an error loading this page.' ) }
				onError={ logCheckoutError }
			>
				<CalypsoShoppingCartProvider shouldShowPersistentErrors>
					<StripeHookProvider fetchStripeConfiguration={ getStripeConfiguration } locale={ locale }>
						<CalypsoCheckoutHost siteId={ selectedSiteId } siteSlug={ checkoutSiteSlug }>
							{ checkout }
						</CalypsoCheckoutHost>
					</StripeHookProvider>
				</CalypsoShoppingCartProvider>
			</CheckoutErrorBoundary>
			{ /* Inside the provider: it reports the recaptcha client id into the
			     checkout's store, and a scoped checkout has to be the one that
			     hears it. */ }
			{ isLoggedOutCart && <Recaptcha badgePosition="bottomright" /> }
		</CheckoutStoreProvider>
	);
}
