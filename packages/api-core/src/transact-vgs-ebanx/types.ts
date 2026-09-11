export interface EbanxTokenizeRequest {
	card_number: string;
	card_name: string;
	card_due_date: string;
	card_cvv: string;
	payment_type_code: string;
	country: string;
}

export interface EbanxTokenizeResponse {
	token: string;
	payment_type_code?: string;
	status?: string;
}
