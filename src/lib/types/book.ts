export enum BookCondition {
	LIKE_NEW = 'LIKE_NEW',
	VERY_GOOD = 'VERY_GOOD',
	GOOD = 'GOOD',
	FAIR = 'FAIR',
	POOR = 'POOR'
}

export interface Book {
	id: string;
	owner_id: string;
	title: string;
	authors: string[];
	isbn: string | null;
	condition: BookCondition;
	genre: string | null;
	description: string | null;
	google_volume_id: string | null;
	is_available: boolean;
	created_at: string;
	updated_at: string;
}

export interface BookInput {
	title: string;
	authors: string[];
	isbn?: string | null;
	condition: BookCondition;
	genre?: string | null;
	description?: string | null;
	google_volume_id?: string | null;
	is_available?: boolean;
}

export interface BookUpdate {
	title?: string;
	authors?: string[];
	isbn?: string | null;
	condition?: BookCondition;
	genre?: string | null;
	description?: string | null;
	is_available?: boolean;
}

export interface BookWithOwner extends Book {
	profiles: {
		username: string | null;
		full_name: string | null;
		avatar_url: string | null;
	};
}

export interface GoogleBookResult {
	id: string;
	volumeInfo: {
		title: string;
		authors?: string[];
		description?: string;
		categories?: string[];
		imageLinks?: {
			thumbnail?: string;
			smallThumbnail?: string;
		};
		industryIdentifiers?: Array<{
			type: string;
			identifier: string;
		}>;
		publishedDate?: string;
		pageCount?: number;
		language?: string;
		previewLink?: string;
		infoLink?: string;
	};
}