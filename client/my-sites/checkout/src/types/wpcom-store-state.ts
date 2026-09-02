/**
 * The contact-details model now lives in `@automattic/checkout`. These names are
 * re-exported here so the app's existing import paths keep working while the
 * checkout moves across; the shim goes when the last of them is repointed.
 *
 * Named rather than `export *`: the package's barrel also carries the host
 * context, the order polling and the status seam, and nothing importing this
 * path wants those. The list is what the app actually imports — anything the
 * model needs only for itself stays inside the package.
 */
export {
	convertDomainContactDetailsToManagedContactDetails,
	formatDomainContactValidationResponse,
	getSignupValidationErrorResponse,
	isCompleteAndValid,
	isValid,
	prepareDomainContactDetails,
	prepareDomainContactDetailsErrors,
	prepareDomainContactDetailsForTransaction,
	prepareDomainContactValidationRequest,
	prepareGSuiteContactValidationRequest,
} from '@automattic/checkout';
