import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

export interface CheckoutStatus {
	/** The checkout is doing something a shopper should not interrupt. */
	isBusy: boolean;
	/** The frame around the checkout may be dismissed. */
	canClose: boolean;
}

/**
 * What a host is told when no checkout is reporting: there is nothing in
 * flight, so there is nothing to hold a frame open for.
 */
const IDLE: CheckoutStatus = { isBusy: false, canClose: true };

const CheckoutStatusContext = createContext< {
	status: CheckoutStatus;
	report: ( status: CheckoutStatus ) => void;
} >( { status: IDLE, report: () => {} } );

/**
 * Lets a host see what the checkout inside it is doing.
 *
 * A host renders the frame — a modal, a page — around the checkout, so it is
 * the one that has to decide whether a click on the backdrop may dismiss it.
 * Only the checkout knows whether a payment is going through. This carries that
 * answer outwards, and nothing more: the host decides what to do about it.
 *
 * One of these holds the status of one checkout. A host that opens two puts a
 * provider around each, which is what having its own frame means.
 */
export function CheckoutStatusProvider( { children }: { children: ReactNode } ) {
	const [ status, setStatus ] = useState( IDLE );
	const value = useMemo( () => ( { status, report: setStatus } ), [ status ] );

	return (
		<CheckoutStatusContext.Provider value={ value }>{ children }</CheckoutStatusContext.Provider>
	);
}

/**
 * The status of the checkout inside this host, for guarding dismissal.
 */
export function useCheckoutStatus(): CheckoutStatus {
	return useContext( CheckoutStatusContext ).status;
}

/**
 * Reports the checkout's status outwards, for a host to read. Reports nowhere
 * when no host is listening, which is the case on the full-page route.
 */
export function useReportCheckoutStatus( { isBusy, canClose }: CheckoutStatus ): void {
	const { report } = useContext( CheckoutStatusContext );
	const latestReport = useRef( report );
	latestReport.current = report;

	useEffect( () => {
		report( { isBusy, canClose } );
	}, [ isBusy, canClose, report ] );

	useEffect( () => {
		// A checkout that has gone leaves nothing behind to hold the frame open.
		return () => latestReport.current( IDLE );
	}, [] );
}
