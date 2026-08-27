import {
	getDomainRegistrations,
	getDomainTransfers,
	hasDomainRegistration,
	hasTransferProduct,
} from '@automattic/wpcom-checkout';
import { useTranslate } from 'i18n-calypso';
import { Fragment } from 'react';
import CheckoutTermsItem from 'calypso/my-sites/checkout/src/components/checkout-terms-item';
import { useCheckoutRecordGaEvent } from '../hooks/use-checkout-analytics-bridge';
import type { DomainLegalAgreementUrl, ResponseCart } from '@automattic/shopping-cart';
import type { LocalizeProps } from 'i18n-calypso';

export interface DomainRegistrationAgreementProps {
	cart: ResponseCart;
}

interface AgreementForDisplay {
	name: string;
	url: string;
	domains: string[];
}

type Translate = LocalizeProps[ 'translate' ];

function getDomainsByRegistrationAgreement(
	cart: ResponseCart,
	translate: Translate
): AgreementForDisplay[] {
	const domainItems = getDomainRegistrations( cart );
	domainItems.push( ...getDomainTransfers( cart ) );

	return Object.values(
		domainItems.reduce(
			( agreements: Record< DomainLegalAgreementUrl, AgreementForDisplay >, domainItem ) => {
				if (
					domainItem?.extra?.legal_agreements &&
					// legal_agreements is an array when it's empty due to PHP > JSON encoding.
					! Array.isArray( domainItem.extra.legal_agreements ) &&
					Object.keys( domainItem.extra.legal_agreements ).length > 0
				) {
					const domainAgreements = domainItem.extra.legal_agreements;
					Object.keys( domainAgreements ).forEach( ( url ) => {
						if ( agreements[ url ] ) {
							agreements[ url ].domains.push( domainItem.meta );
						} else {
							agreements[ url ] = {
								name: domainAgreements[ url ],
								url,
								domains: [ domainItem.meta ],
							};
						}
					} );
					return agreements;
				}

				if ( domainItem.extra.domain_registration_agreement_url ) {
					const url = domainItem?.extra?.domain_registration_agreement_url;
					if ( agreements?.[ url ] ) {
						agreements[ url ].domains.push( domainItem.meta );
					} else {
						agreements[ url ] = {
							name: translate( 'Domain Registration Agreement' ),
							url: url,
							domains: [ domainItem.meta ],
						};
					}
					return agreements;
				}

				// This block should never be hit, but since some tests
				// depend on incorrect behaviour we need to keep it.
				const url = 'undefined';
				if ( agreements?.[ url ] ) {
					agreements[ url ].domains.push( domainItem.meta );
				} else {
					agreements[ url ] = {
						name: translate( 'Domain Registration Agreement' ),
						url: url,
						domains: [ domainItem.meta ],
					};
				}
				return agreements;
			},
			{}
		)
	);
}

function listDomains( agreement: AgreementForDisplay ): string {
	return agreement.domains.join( ', ' ).replace( /, ([^,]*)$/, ' and $1' );
}

export default function DomainRegistrationAgreement( { cart }: DomainRegistrationAgreementProps ) {
	const translate = useTranslate();
	const recordGaEvent = useCheckoutRecordGaEvent();

	if ( ! ( hasDomainRegistration( cart ) || hasTransferProduct( cart ) ) ) {
		return null;
	}

	const recordRegistrationAgreementClick = () => {
		recordGaEvent( 'Upgrades', 'Clicked Registration Agreement Link' );
	};

	const agreementsList = getDomainsByRegistrationAgreement( cart, translate );

	const renderAgreements = () => {
		if ( agreementsList.length > 1 ) {
			const preamble = translate(
				'You agree to the following domain name registration legal agreements:'
			);
			return (
				<Fragment>
					<p>{ preamble }</p>
					{ agreementsList.map( ( agreement ) => (
						<p key={ agreement.url + agreement.domains.length }>
							{ translate(
								'View the {{domainRegistrationAgreementLink}}%(legalAgreementName)s{{/domainRegistrationAgreementLink}} for %(domainsList)s.',
								{
									args: {
										domainsList: listDomains( agreement ),
										legalAgreementName: agreement.name,
									},
									components: {
										domainRegistrationAgreementLink: (
											<a
												href={ agreement.url }
												target="_blank"
												rel="noopener noreferrer"
												onClick={ recordRegistrationAgreementClick }
											/>
										),
									},
								}
							) }
						</p>
					) ) }
				</Fragment>
			);
		}

		const agreement = agreementsList.shift();

		if ( agreement ) {
			return (
				<p>
					{ translate(
						'You agree to the {{domainRegistrationAgreementLink}}Domain Registration Agreement{{/domainRegistrationAgreementLink}} for %(domainsList)s.',
						{
							args: {
								domainsList: listDomains( agreement ),
							},
							components: {
								domainRegistrationAgreementLink: (
									<a
										href={ agreement.url }
										target="_blank"
										rel="noopener noreferrer"
										onClick={ recordRegistrationAgreementClick }
									/>
								),
							},
						}
					) }
				</p>
			);
		}
	};

	return <CheckoutTermsItem isPrewrappedChildren>{ renderAgreements() }</CheckoutTermsItem>;
}
