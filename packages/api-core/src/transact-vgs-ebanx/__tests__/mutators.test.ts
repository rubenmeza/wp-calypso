import nock from 'nock';
import { tokenizeEbanxCard } from '../mutators';

const BASE = 'https://public-api.wordpress.com';

const payload = {
	card_number: 'vgs-number-token',
	card_name: 'Ada Lovelace',
	card_due_date: '12/30',
	card_cvv: 'vgs-cvc-token',
	payment_type_code: 'card',
	country: 'BR',
};

describe( 'the EBANX tokenization mutator', () => {
	afterEach( () => nock.cleanAll() );

	it( 'sends the VGS tokens, never the card, and returns the EBANX token', async () => {
		nock( BASE )
			.post( '/wpcom/v2/transact/vgs/wpcom/ebanx/tokenize', payload )
			.reply( 200, { token: 'ebanx-token', status: 'SUCCESS' } );

		await expect( tokenizeEbanxCard( payload ) ).resolves.toEqual( {
			token: 'ebanx-token',
			status: 'SUCCESS',
		} );
	} );
} );
