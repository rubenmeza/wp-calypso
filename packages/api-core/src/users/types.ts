export interface UserResponse {
	ID: number;
	user_login: string;
	first_name: string;
	last_name: string;
	nice_name: string;
	display_name: string;
	description: string;
	avatar_URL: string;
	profile_URL: string;
	primary_blog: {
		ID: number;
		feed_ID: number;
		URL: string;
		title: string;
		description: string;
		avatar_URL: string | null;
	} | null;
	recommended_blogs_count?: number;
}

export type ReaderUser = Pick<
	UserResponse,
	| 'ID'
	| 'user_login'
	| 'first_name'
	| 'last_name'
	| 'nice_name'
	| 'display_name'
	| 'description'
	| 'avatar_URL'
	| 'profile_URL'
>;

export interface CreateUserAccountParams {
	email?: string;
	is_passwordless: boolean;
	signup_flow_name: string;
	validate: boolean;
	should_create_site: boolean;
	locale: string;
	client_id: string;
	client_secret: string;
	extra?: Record< string, unknown >;
	new_site_params?: Record< string, unknown >;
	tos?: Record< string, unknown >;
	'g-recaptcha-error'?: string;
	'g-recaptcha-response'?: string;
}

export interface CreateUserAccountResponse {
	success: boolean;
	bearer_token?: string;
	username?: string;
	blog_details?: {
		blogid?: string;
	};
}
