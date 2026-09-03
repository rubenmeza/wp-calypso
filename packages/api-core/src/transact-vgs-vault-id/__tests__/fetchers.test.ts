import nock from 'nock';
import { fetchVgsVaultId } from '../fetchers';

const BASE = 'https://public-api.wordpress.com';

describe( 'the VGS vault fetcher', () => {
	afterEach( () => nock.cleanAll() );

	it( 'reads the vault the card fields post to, and which environment it lives in', async () => {
		nock( BASE )
			.get( '/wpcom/v2/transact/vgs/wpcom/vault-id' )
			.reply( 200, { vault_id: 'tnt1a2b3c', environment: 'sandbox' } );

		await expect( fetchVgsVaultId() ).resolves.toEqual( {
			vault_id: 'tnt1a2b3c',
			environment: 'sandbox',
		} );
	} );
} );
