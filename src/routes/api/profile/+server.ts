import { json } from '@sveltejs/kit';
import { ProfileServiceServer } from '$lib/services/profileServiceServer';
import { validateProfileUpdate } from '$lib/validation/profile';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		let profile = await ProfileServiceServer.getProfile(locals.supabase, locals.user.id);
		
		if (!profile) {
    const sanitizedUsername = ProfileServiceServer.sanitizeUsername(locals.user?.email || '');
			profile = await ProfileServiceServer.createProfile(locals.supabase, locals.user.id, {
				username: sanitizedUsername,
				full_name: locals.user.email
			});
		}

		return json({ profile });
	} catch (error) {
		console.error('Failed to fetch profile:', error);
		return json({ error: 'Failed to fetch profile' }, { status: 500 });
	}
};

export const PUT: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const updates = await request.json();
		
		// Validate using shared schema
		const validation = validateProfileUpdate(updates);
		if (!validation.success) {
			const firstError = Object.values(validation.errors)[0];
			return json({ error: firstError || 'Invalid profile data' }, { status: 400 });
		}

		const updatedProfile = await ProfileServiceServer.updateProfile(locals.supabase, locals.user.id, validation.data);
		return json({ profile: updatedProfile });
	} catch (error) {
		console.error('Failed to update profile:', error);
		return json({ error: 'Failed to update profile' }, { status: 500 });
	}
};
