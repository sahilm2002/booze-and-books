import { json } from '@sveltejs/kit';
import { ProfileServiceServer } from '$lib/services/profileServiceServer';
import { validateProfileUpdate } from '$lib/validation/profile';
import { createErrorResponse, ErrorTypes, createValidationError } from '$lib/utils/errorHandler';
import { applyRateLimit, addRateLimitHeaders, RateLimitConfigs } from '$lib/utils/rateLimiter';
import { logInfo, logError } from '$lib/utils/logger';
import { sanitizeProfileData } from '$lib/utils/sanitizer';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, request }) => {
	try {
		// Apply rate limiting
		const rateLimitResult = applyRateLimit(request, RateLimitConfigs.API_GENERAL);

		if (!locals.user) {
			throw ErrorTypes.UNAUTHORIZED();
		}

		logInfo('Fetching user profile', { userId: locals.user.id });

		let profile = await ProfileServiceServer.getProfile(locals.supabase, locals.user.id);
		
		if (!profile) {
			const sanitizedUsername = ProfileServiceServer.sanitizeUsername(locals.user.email || '');
			profile = await ProfileServiceServer.createProfile(locals.supabase, locals.user.id, {
				username: sanitizedUsername,
				full_name: locals.user.email || ''
			});
		}

		const response = json({ profile, success: true });
		return addRateLimitHeaders(response, rateLimitResult.remaining, rateLimitResult.resetTime);
	} catch (error) {
		return createErrorResponse(error, 'Failed to fetch profile', { endpoint: 'GET /api/profile' });
	}
};

export const PUT: RequestHandler = async ({ request, locals }) => {
	try {
		// Apply rate limiting for mutations
		const rateLimitResult = applyRateLimit(request, RateLimitConfigs.MUTATION);

		if (!locals.user) {
			throw ErrorTypes.UNAUTHORIZED();
		}

		const updates = await request.json();
		
		// Sanitize input data to prevent XSS
		const sanitizedData = sanitizeProfileData(updates);
		
		// Validate using shared schema
		const validation = validateProfileUpdate(sanitizedData);
		if (!validation.success) {
			throw createValidationError(validation.errors);
		}

		logInfo('Updating user profile', { userId: locals.user.id });

		const updatedProfile = await ProfileServiceServer.updateProfile(locals.supabase, locals.user.id, validation.data);
		
		const response = json({ profile: updatedProfile, success: true });
		return addRateLimitHeaders(response, rateLimitResult.remaining, rateLimitResult.resetTime);
	} catch (error) {
		return createErrorResponse(error, 'Failed to update profile', { endpoint: 'PUT /api/profile' });
	}
};
