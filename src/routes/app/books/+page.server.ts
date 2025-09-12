import { redirect } from '@sveltejs/kit';
import { BookServiceServer } from '$lib/services/bookServiceServer';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(303, '/auth/login');
	}

	try {
		const books = await BookServiceServer.getUserBooks(locals.supabase, locals.user.id);
		const bookCount = await BookServiceServer.getUserBookCount(locals.supabase, locals.user.id);

		return {
			books,
			bookCount
		};
	} catch (error) {
		console.error('Failed to load books:', error);
		
		return {
			books: [],
			bookCount: 0,
			error: 'Failed to load books'
		};
	}
};