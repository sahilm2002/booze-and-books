import { randomBytes } from 'crypto';
import { logError, logWarn } from './logger.js';

/**
 * CSRF Protection Utility
 * Provides Cross-Site Request Forgery protection for forms and API endpoints
 */

const CSRF_TOKEN_LENGTH = 32;
const CSRF_HEADER_NAME = 'x-csrf-token';
const CSRF_FORM_FIELD = 'csrf_token';

/**
 * Generate a cryptographically secure CSRF token
 */
export function generateCSRFToken(): string {
	return randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
}

/**
 * Validate CSRF token from request
 */
export function validateCSRFToken(
	request: Request,
	sessionToken: string | null
): { valid: boolean; error?: string } {
	if (!sessionToken) {
		logWarn('CSRF validation failed: No session token available');
		return { valid: false, error: 'No CSRF token in session' };
	}

	// Try to get token from header first, then form data
	let requestToken = request.headers.get(CSRF_HEADER_NAME);
	
	if (!requestToken && request.method === 'POST') {
		// For form submissions, we'll need to parse form data
		// This is a simplified version - in practice you'd want to handle this more carefully
		const contentType = request.headers.get('content-type');
		if (contentType?.includes('application/x-www-form-urlencoded')) {
			// Note: This would need to be handled in the actual endpoint
			// since we can't read the body here without consuming it
			logWarn('CSRF token should be provided in header for form submissions');
		}
	}

	if (!requestToken) {
		logWarn('CSRF validation failed: No token in request', {
			method: request.method,
			url: request.url
		});
		return { valid: false, error: 'No CSRF token provided' };
	}

	// Constant-time comparison to prevent timing attacks
	if (!constantTimeEquals(requestToken, sessionToken)) {
		logError('CSRF validation failed: Token mismatch', null, {
			method: request.method,
			url: request.url,
			hasSessionToken: !!sessionToken,
			hasRequestToken: !!requestToken
		});
		return { valid: false, error: 'Invalid CSRF token' };
	}

	return { valid: true };
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
function constantTimeEquals(a: string, b: string): boolean {
	if (a.length !== b.length) {
		return false;
	}

	let result = 0;
	for (let i = 0; i < a.length; i++) {
		result |= a.charCodeAt(i) ^ b.charCodeAt(i);
	}

	return result === 0;
}

/**
 * Middleware function to validate CSRF tokens on state-changing requests
 */
export function requireCSRFToken(
	request: Request,
	sessionToken: string | null
): void {
	// Only validate CSRF for state-changing methods
	const method = request.method.toUpperCase();
	if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
		return; // GET, HEAD, OPTIONS don't need CSRF protection
	}

	const validation = validateCSRFToken(request, sessionToken);
	if (!validation.valid) {
		throw new Error(`CSRF validation failed: ${validation.error}`);
	}
}

/**
 * Helper to create CSRF-protected form HTML
 */
export function createCSRFFormField(token: string): string {
	return `<input type="hidden" name="${CSRF_FORM_FIELD}" value="${token}" />`;
}

/**
 * Helper to get CSRF token from form data
 */
export async function getCSRFTokenFromFormData(request: Request): Promise<string | null> {
	try {
		const formData = await request.formData();
		return formData.get(CSRF_FORM_FIELD) as string | null;
	} catch (error) {
		logError('Failed to parse form data for CSRF token', error);
		return null;
	}
}

/**
 * Enhanced CSRF validation that handles both headers and form data
 */
export async function validateCSRFTokenFromRequest(
	request: Request,
	sessionToken: string | null
): Promise<{ valid: boolean; error?: string }> {
	if (!sessionToken) {
		return { valid: false, error: 'No CSRF token in session' };
	}

	// Try header first
	let requestToken = request.headers.get(CSRF_HEADER_NAME);
	
	// If no header token and it's a form submission, try form data
	if (!requestToken && request.method === 'POST') {
		const contentType = request.headers.get('content-type');
		if (contentType?.includes('application/x-www-form-urlencoded') || 
			contentType?.includes('multipart/form-data')) {
			requestToken = await getCSRFTokenFromFormData(request);
		}
	}

	if (!requestToken) {
		return { valid: false, error: 'No CSRF token provided' };
	}

	if (!constantTimeEquals(requestToken, sessionToken)) {
		logError('CSRF validation failed: Token mismatch');
		return { valid: false, error: 'Invalid CSRF token' };
	}

	return { valid: true };
}

/**
 * Constants for use in components and forms
 */
export const CSRF_CONSTANTS = {
	HEADER_NAME: CSRF_HEADER_NAME,
	FORM_FIELD: CSRF_FORM_FIELD,
	TOKEN_LENGTH: CSRF_TOKEN_LENGTH
} as const;
