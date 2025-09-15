import type { RequestHandler } from './$types';
import { MAX_AVATAR_UPLOAD_SIZE, ALLOWED_AVATAR_MIME_TYPES, getMaxUploadSizeDisplay } from '$lib/config/upload';

/**
 * POST /api/profile/avatar
 *
 * Expects multipart/form-data with a single "file" field.
 * Uses the server-side Supabase client available on event.locals.supabase to:
 *  - Upload the file to the "avatars" bucket under "{userId}/avatar.<ext>"
 *  - Update the user's profile row with the avatar path (not the public URL)
 *  - Return { publicUrl } on success
 *
 * Notes:
 *  - This endpoint requires the user to be authenticated; event.locals.user is used.
 *  - Upload limits are enforced both client-side and server-side using shared configuration.
 *  - TODO: Consider adding rate limiting (e.g., per-IP upload throttling) to prevent abuse.
 *    This could be implemented using a simple in-memory store or Redis to track upload
 *    attempts per IP address within a time window (e.g., max 5 uploads per minute per IP).
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	// Ensure authenticated user
	const user = locals.user;
	if (!user?.id) {
		return new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401 });
	}

	// Parse multipart form data
	const form = await request.formData();
	const file = form.get('file') as File | null;
	if (!file) {
		return new Response(JSON.stringify({ error: 'No file provided' }), { status: 400 });
	}

	// Validate MIME type using shared configuration
	if (!ALLOWED_AVATAR_MIME_TYPES.includes(file.type)) {
		return new Response(
			JSON.stringify({ 
				error: 'Unsupported file type. Only PNG, JPEG, WebP, and GIF images are allowed.' 
			}), 
			{ status: 415 }
		);
	}

	// Validate file size using shared configuration
	if (file.size > MAX_AVATAR_UPLOAD_SIZE) {
		return new Response(
			JSON.stringify({ 
				error: `File size too large. Maximum allowed size is ${getMaxUploadSizeDisplay()}.` 
			}), 
			{ status: 413 }
		);
	}

	// Derive extension and filename
	let fileExt = (file.name || '').split('.').pop();
	if (!fileExt || fileExt === file.name) {
		const mimeToExt: { [k: string]: string } = {
			'image/jpeg': 'jpg',
			'image/jpg': 'jpg',
			'image/png': 'png',
			'image/gif': 'gif',
			'image/webp': 'webp'
		};
		fileExt = mimeToExt[file.type] || 'png';
	}

	const filePath = `${user.id}/avatar.${fileExt}`;

	try {
		// Upload to Supabase storage (server-side client is configured in hooks)
		const { error: uploadError } = await locals.supabase.storage
			.from('avatars')
			.upload(filePath, file, {
				cacheControl: '3600',
				upsert: true
			});

		if (uploadError) {
			console.error('Upload error:', uploadError);
			return new Response(JSON.stringify({ error: uploadError.message }), { status: 500 });
		}

		// Update the profile record to point to the storage key (filePath)
		const { data, error: updateError } = await locals.supabase
			.from('profiles')
			.update({ avatar_url: filePath })
			.eq('id', user.id)
			.select()
			.single();

		if (updateError) {
			console.error('Profile update error:', updateError);
			// Not fatal for upload success — return still the public URL but log the error
		}

		// Return public URL
		const { data: publicData } = locals.supabase.storage.from('avatars').getPublicUrl(filePath);

		return new Response(JSON.stringify({ publicUrl: publicData.publicUrl }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (err) {
		console.error('Unexpected error uploading avatar:', err);
		return new Response(JSON.stringify({ error: 'Unexpected server error' }), { status: 500 });
	}
};
