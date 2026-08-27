import { DOMAIN_PROMOTIONAL_PRICING_POLICY } from '@automattic/urls';
import {
	getDomainMappings,
	getDomainRegistrations,
	getDomainTransfers,
	hasDomainRegistration,
	hasTransferProduct,
} from '@automattic/wpcom-checkout';
import { useTranslate } from 'i18n-calypso';
import CheckoutTermsItem from 'calypso/my-sites/checkout/src/components/checkout-terms-item';
import { useCheckoutRecordGaEvent } from '../hooks/use-checkout-analytics-bridge';
import type { ResponseCart } from '@automattic/shopping-cart';

export interface DomainPromotionalPricingRestrictionsProps {
	cart: ResponseCart;
}

function hasAnyDomainWithPromotionalPrice( cart: ResponseCart ): boolean {
	const domainProducts = [
		...getDomainRegistrations( cart ),
		...getDomainMappings( cart ),
		...getDomainTransfers( cart ),
	];
	return domainProducts.some(
		( product ) => product.item_subtotal_integer !== product.item_original_subtotal_integer
	);
}

export default function DomainPromotionalPricingRestrictions( {
	cart,
}: DomainPromotionalPricingRestrictionsProps ) {
	const translate = useTranslate();
	const recordGaEvent = useCheckoutRecordGaEvent();

	const cartHasDomain = hasDomainRegistration( cart ) || hasTransferProduct( cart );
	if ( ! cartHasDomain || ! hasAnyDomainWithPromotionalPrice( cart ) ) {
		return null;
	}

	const recordPromotionalPricingPolicyClick = () => {
		recordGaEvent( 'Upgrades', 'Clicked Registration Agreement Link' );
	};

	return (
		<CheckoutTermsItem isPrewrappedChildren>
			<p>
				{ translate(
					'{{promotionalPricingPolicyLink}}Restrictions apply{{/promotionalPricingPolicyLink}}.',
					{
						components: {
							promotionalPricingPolicyLink: (
								<a
									href={ DOMAIN_PROMOTIONAL_PRICING_POLICY }
									target="_blank"
									rel="noopener noreferrer"
									onClick={ recordPromotionalPricingPolicyClick }
								/>
							),
						},
					}
				) }
			</p>
		</CheckoutTermsItem>
	);
}
