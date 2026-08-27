/**
 * The checkout's fault log.
 *
 * Kept apart from `analytics.ts`, which is Redux thunks and stays with the app:
 * everything here reaches its destination through the host's `logError`, so it
 * travels with the checkout.
 */
import config from '@automattic/calypso-config';
import { captureException } from '@automattic/calypso-sentry';
import type { CheckoutHostContext } from '@automattic/checkout';

function serializeCaughtError(
	// This may come from Error.cause which I'm pretty sure has no defined
	// type. It can be used to keep another Error but it could also be anything
	// else so let's not make any assumptions. Also things other than Error
	// objects can be thrown so let's not even assume this is an Error.
	error: unknown,
	options: {
		excludeStack?: boolean;
	} = {}
): string {
	const messages = [];
	messages.push( getErrorMessageFromError( error ) );
	let hasCause = false;
	const errorObject = error as Error;
	if ( 'cause' in errorObject && errorObject.cause ) {
		hasCause = true;
		const cause = serializeCaughtError( errorObject.cause, options );
		messages.push( `(Cause: ${ cause })` );
	}
	// We only include the stack trace if there is no cause, meaning this is
	// the deepest error in the chain. The others are all likely re-thrown
	// errors so we should know their stack trace already.
	if ( ! options?.excludeStack && ! hasCause && 'stack' in errorObject && errorObject.stack ) {
		messages.push( `(Stack: ${ errorObject.stack })` );
	}
	return messages.join( '; ' );
}

function getErrorMessageFromError( error: unknown ): string {
	const errorObject = error as Error;
	if ( 'message' in errorObject && errorObject.message ) {
		return `Message: ${ errorObject.message }`;
	}
	return `Non-Error: ${ error }`;
}

/**
 * Convert a thrown error to a string for logging.
 *
 * I've typed this function as requiring an Error because that's the intended
 * behavior and I'd like TypeScript to enforce that as best as it can. However,
 * other things can be thrown besides Error objects and so this will actually
 * handle other things like strings just fine.
 */
export function convertErrorToString( error: Error ): string {
	return serializeCaughtError( error );
}

export function logStashLoadErrorEvent(
	logError: CheckoutHostContext[ 'logError' ],
	errorType: string,
	error: Error,
	additionalData: Record< string, string | number | undefined > = {}
): void {
	captureException( error, {
		tags: {
			serialized_message: serializeCaughtError( error, { excludeStack: true } ),
			calypso_checkout: 'true',
			error_type: errorType,
			...additionalData,
		},
	} );
	logStashEvent( logError, 'composite checkout load error', {
		...additionalData,
		type: errorType,
		message: additionalData.message
			? String( additionalData.message )
			: convertErrorToString( error ),
		...( additionalData.message
			? // No need to log the `errorMessage` separately if it's the same as
			  // the `message` property.
			  {
					errorMessage: convertErrorToString( error ),
			  }
			: {} ),
		tags: [ 'checkout-error-boundary' ],
	} );
}

export type DataForLog = Record< string, string | string[] > & { tags?: string[] };

export function logStashEvent(
	logError: CheckoutHostContext[ 'logError' ],
	message: string,
	dataForLog: DataForLog,
	severity: 'error' | 'warning' | 'info' = 'error'
): void {
	const tags = dataForLog.tags ?? [];
	const extra: Record< string, string | string[] > = {
		env: config( 'env_id' ),
	};
	Object.keys( dataForLog ).forEach( ( key ) => {
		if ( key === 'tags' ) {
			return;
		}
		extra[ key ] = dataForLog[ key ];
	} );
	logError( {
		message,
		severity: config( 'env_id' ) === 'production' ? severity : 'debug',
		extra,
		tags,
	} );
}
