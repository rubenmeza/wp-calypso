import CheckoutMain from './checkout-main';
import type { CheckoutMainProps } from './checkout-main';

/**
 * The checkout, with no frame around it.
 *
 * Everything a purchase needs and nothing that assumes a page: it sizes to
 * whatever contains it. A host renders it inside its own frame — a modal, or
 * the full-page route's shell — and reads `useCheckoutStatus` to know whether
 * that frame may be dismissed.
 *
 * It records a page view only when asked to. The path it would record is
 * derived from the cart, so the checkout is the only thing that can build it,
 * but a modal opening over a page is not a page view and must not send one.
 */
export function CheckoutContent( {
	recordsPageView = false,
	...props
}: Omit< CheckoutMainProps, 'isEmbedded' > ) {
	return <CheckoutMain { ...props } isEmbedded recordsPageView={ recordsPageView } />;
}
