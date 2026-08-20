/**
 * The contact-details model now lives in `@automattic/checkout`. These names are
 * re-exported here so the app's existing import paths keep working while the
 * checkout moves across; the shim goes when the last of them is repointed.
 *
 * Named rather than `export *`: the package's barrel also carries the host
 * context, the order polling and the status seam, and nothing importing this
 * path wants those.
 */
export {
	convertDomainContactDetailsToManagedContactDetails,
	convertManagedContactDetailsToDomainContactDetails,
	emptyManagedContactDetails,
	flattenManagedContactDetailsShape,
	formatDomainContactValidationResponse,
	getInitialWpcomStoreState,
	getSignupValidationErrorResponse,
	isCompleteAndValid,
	isTouched,
	isValid,
	managedContactDetailsUpdaters,
	mapManagedContactDetailsShape,
	prepareDomainContactDetails,
	prepareDomainContactDetailsErrors,
	prepareDomainContactDetailsForTransaction,
	prepareDomainContactValidationRequest,
	prepareGSuiteContactValidationRequest,
	updateManagedContactDetailsShape,
} from '@automattic/checkout';
