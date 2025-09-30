import { json } from '@sveltejs/kit';
import { supabase } from '$lib/supabase';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { user_id } = await request.json();

		if (!user_id) {
			return json({ error: 'User ID is required' }, { status: 400 });
		}

		// Set user as offline
		const { error } = await supabase.rpc('set_user_offline', {
			user_id
		});

		if (error) {
			console.error('Error setting user offline:', error);
			return json({ error: 'Failed to set user offline' }, { status: 500 });
		}

		return json({ success: true });
	} catch (error) {
		console.error('Error in set-offline endpoint:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
