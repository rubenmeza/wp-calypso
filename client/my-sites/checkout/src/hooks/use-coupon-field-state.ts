import { useState, useEffect, useCallback } from 'react';
import { useCheckoutRecordEvent } from './use-checkout-host-bridge';
import type { ApplyCouponToCart } from '@automattic/shopping-cart';

export type CouponFieldStateProps = {
	couponFieldValue: string;
	setCouponFieldValue: ( arg0: string ) => void;
	isApplyButtonActive: boolean;
	isFreshOrEdited: boolean;
	setIsFreshOrEdited: ( arg0: boolean ) => void;
	handleCouponSubmit: () => void;
};

export default function useCouponFieldState(
	applyCoupon: ApplyCouponToCart
): CouponFieldStateProps {
	const recordEvent = useCheckoutRecordEvent();
	const [ couponFieldValue, setCouponFieldValue ] = useState< string >( '' );

	// Used to hide the `Apply` button
	const [ isApplyButtonActive, setIsApplyButtonActive ] = useState< boolean >( false );

	// Used to hide error messages if the user has edited the form field
	const [ isFreshOrEdited, setIsFreshOrEdited ] = useState< boolean >( true );

	useEffect( () => {
		if ( couponFieldValue.length > 0 ) {
			setIsApplyButtonActive( true );
			return;
		}
		setIsApplyButtonActive( false );
	}, [ couponFieldValue ] );

	const handleCouponSubmit = useCallback( () => {
		const trimmedValue = couponFieldValue.trim();

		recordEvent( 'calypso_checkout_composite_coupon_add_submit', {
			coupon: trimmedValue,
		} );

		applyCoupon( trimmedValue ).catch( () => {
			// Nothing needs to be done here. CartMessages will display the error to the user.
		} );

		return;
	}, [ couponFieldValue, recordEvent, applyCoupon ] );

	return {
		couponFieldValue,
		setCouponFieldValue,
		isApplyButtonActive,
		isFreshOrEdited,
		setIsFreshOrEdited,
		handleCouponSubmit,
	};
}
