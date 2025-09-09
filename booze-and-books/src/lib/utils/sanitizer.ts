/**
 * Input Sanitization Utility
 * Provides XSS protection and input sanitization for user-generated content
 */

/**
 * HTML entities for escaping
 */
const HTML_ENTITIES: Record<string, string> = {
	'&': '&amp;',
	'<': '&lt;',
	'>': '&gt;',
	'"': '&quot;',
	"'": '&#x27;',
	'/': '&#x2F;',
	'`': '&#x60;',
	'=': '&#x3D;'
};

/**
 * Escape HTML entities to prevent XSS
 */
export function escapeHtml(text: string): string {
	if (typeof text !== 'string') {
		return String(text);
	}
	
	return text.replace(/[&<>"'`=/]/g, (match) => HTML_ENTITIES[match] || match);
}

/**
 * Sanitize user input for safe display
 */
export function sanitizeUserInput(input: string): string {
	if (typeof input !== 'string') {
		return '';
	}

	// Remove null bytes and control characters except newlines and tabs
	let sanitized = input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
	
	// Escape HTML entities
	sanitized = escapeHtml(sanitized);
	
	// Trim whitespace
	sanitized = sanitized.trim();
	
	return sanitized;
}

/**
 * Sanitize text for use in HTML attributes
 */
export function sanitizeAttribute(value: string): string {
	if (typeof value !== 'string') {
		return '';
	}

	// Remove dangerous characters for attributes
	return value
		.replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
		.replace(/[<>"'`]/g, (match) => HTML_ENTITIES[match] || '') // Escape dangerous chars
		.trim();
}

/**
 * Sanitize URLs to prevent javascript: and data: schemes
 */
export function sanitizeUrl(url: string): string {
	if (typeof url !== 'string') {
		return '';
	}

	const trimmed = url.trim().toLowerCase();
	
	// Block dangerous protocols
	const dangerousProtocols = [
		'javascript:',
		'data:',
		'vbscript:',
		'file:',
		'about:'
	];

	for (const protocol of dangerousProtocols) {
		if (trimmed.startsWith(protocol)) {
			return '';
		}
	}

	// Allow only safe protocols
	const safeProtocols = ['http:', 'https:', 'mailto:', 'tel:', 'ftp:'];
	const hasProtocol = trimmed.includes(':');
	
	if (hasProtocol) {
		const isAllowed = safeProtocols.some(protocol => trimmed.startsWith(protocol));
		if (!isAllowed) {
			return '';
		}
	}

	return url.trim();
}

/**
 * Sanitize book title for safe display
 */
export function sanitizeBookTitle(title: string): string {
	if (typeof title !== 'string') {
		return '';
	}

	// Allow basic punctuation but escape HTML
	return escapeHtml(title.trim());
}

/**
 * Sanitize author names
 */
export function sanitizeAuthorName(name: string): string {
	if (typeof name !== 'string') {
		return '';
	}

	// Remove excessive whitespace and escape HTML
	return escapeHtml(name.replace(/\s+/g, ' ').trim());
}

/**
 * Sanitize book description/bio text
 */
export function sanitizeDescription(description: string): string {
	if (typeof description !== 'string') {
		return '';
	}

	// Allow newlines but escape HTML and remove excessive whitespace
	return escapeHtml(description.replace(/\s+/g, ' ').trim());
}

/**
 * Sanitize username for display
 */
export function sanitizeUsername(username: string): string {
	if (typeof username !== 'string') {
		return '';
	}

	// Remove non-alphanumeric characters except underscore and hyphen
	return username
		.replace(/[^a-zA-Z0-9_-]/g, '')
		.toLowerCase()
		.trim();
}

/**
 * Sanitize search query
 */
export function sanitizeSearchQuery(query: string): string {
	if (typeof query !== 'string') {
		return '';
	}

	// Remove special characters that could be used for injection
	return query
		.replace(/[<>'"&]/g, '')
		.replace(/\s+/g, ' ')
		.trim()
		.substring(0, 100); // Limit length
}

/**
 * Sanitize file names for uploads
 */
export function sanitizeFileName(fileName: string): string {
	if (typeof fileName !== 'string') {
		return '';
	}

	// Remove path traversal attempts and dangerous characters
	return fileName
		.replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
		.replace(/^\.+/, '') // Remove leading dots
		.replace(/\.+$/, '') // Remove trailing dots
		.trim()
		.substring(0, 255); // Limit length
}

/**
 * Validate and sanitize email addresses
 */
export function sanitizeEmail(email: string): string {
	if (typeof email !== 'string') {
		return '';
	}

	// Basic email validation and sanitization
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	const trimmed = email.trim().toLowerCase();
	
	if (!emailRegex.test(trimmed)) {
		return '';
	}

	return trimmed;
}

/**
 * Sanitize numeric input
 */
export function sanitizeNumber(value: unknown, min?: number, max?: number): number | null {
	const num = Number(value);
	
	if (isNaN(num) || !isFinite(num)) {
		return null;
	}

	if (min !== undefined && num < min) {
		return min;
	}

	if (max !== undefined && num > max) {
		return max;
	}

	return num;
}

/**
 * Sanitize boolean input
 */
export function sanitizeBoolean(value: unknown): boolean {
	if (typeof value === 'boolean') {
		return value;
	}

	if (typeof value === 'string') {
		const lower = value.toLowerCase().trim();
		return lower === 'true' || lower === '1' || lower === 'yes';
	}

	if (typeof value === 'number') {
		return value !== 0;
	}

	return false;
}

/**
 * Comprehensive sanitization for user profile data
 */
export function sanitizeProfileData(data: {
	username?: string;
	full_name?: string;
	bio?: string;
	location?: string;
}): {
	username?: string;
	full_name?: string;
	bio?: string;
	location?: string;
} {
	const sanitized: typeof data = {};

	if (data.username) {
		sanitized.username = sanitizeUsername(data.username);
	}

	if (data.full_name) {
		sanitized.full_name = sanitizeUserInput(data.full_name);
	}

	if (data.bio) {
		sanitized.bio = sanitizeDescription(data.bio);
	}

	if (data.location) {
		sanitized.location = sanitizeUserInput(data.location);
	}

	return sanitized;
}

/**
 * Comprehensive sanitization for book data
 */
export function sanitizeBookData(data: {
	title?: string;
	authors?: string[];
	description?: string;
	genre?: string;
}): {
	title?: string;
	authors?: string[];
	description?: string;
	genre?: string;
} {
	const sanitized: typeof data = {};

	if (data.title) {
		sanitized.title = sanitizeBookTitle(data.title);
	}

	if (data.authors && Array.isArray(data.authors)) {
		sanitized.authors = data.authors
			.map(author => sanitizeAuthorName(author))
			.filter(author => author.length > 0);
	}

	if (data.description) {
		sanitized.description = sanitizeDescription(data.description);
	}

	if (data.genre) {
		sanitized.genre = sanitizeUserInput(data.genre);
	}

	return sanitized;
}
