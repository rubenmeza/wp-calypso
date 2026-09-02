import { wpcom } from '../wpcom-fetcher';

/** The VGS Collect SDK's vault environments, spelled out so that reading the vault does not pull the SDK in. */
export type VgsVaultEnvironment = 'sandbox' | 'live' | 'live-eu-1' | 'live-ap-1';

export interface VgsVaultId {
	vault_id: string;
	environment: VgsVaultEnvironment;
}

/**
 * The vault a card is tokenized into before it ever reaches WordPress.com.
 * Sandbox and production have different vaults, so the environment travels
 * with the id rather than being inferred by the caller.
 */
export async function fetchVgsVaultId(): Promise< VgsVaultId > {
	return await wpcom.req.get( {
		path: '/transact/vgs/wpcom/vault-id',
		apiNamespace: 'wpcom/v2',
	} );
}
