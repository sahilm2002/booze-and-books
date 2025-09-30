/**
 * Shared upload configuration constants
 * This ensures client and server use the same upload limits and validation rules
 */

// Maximum file size for avatar uploads (10MB in bytes)
export const MAX_AVATAR_UPLOAD_SIZE = 10 * 1024 * 1024;

// Allowed MIME types for avatar uploads
export const ALLOWED_AVATAR_MIME_TYPES = [
	'image/png', 
	'image/jpeg', 
	'image/webp', 
	'image/gif'
];

/**
 * Chat attachment allowlists (shared by client and server)
 */
export const ALLOWED_ATTACHMENT_MIME_TYPES = [
	'image/jpeg',
	'image/png',
	'image/gif',
	'application/pdf'
];

export const ALLOWED_ATTACHMENT_EXTENSIONS = [
	'.jpg',
	'.jpeg',
	'.png',
	'.gif',
	'.pdf'
];

// Convenience: same extensions without dot for server-side checks
export const ALLOWED_ATTACHMENT_EXTENSIONS_NO_DOT = [
	'jpg',
	'jpeg',
	'png',
	'gif',
	'pdf'
];

/**
 * Converts bytes to MB for display purposes
 * @param bytes - Size in bytes
 * @returns Size in MB as a string with 1 decimal place
 */
export function formatSizeInMB(bytes: number): string {
	return (bytes / (1024 * 1024)).toFixed(1);
}

/**
 * Gets the maximum upload size in MB as a string for display
 * @returns Maximum upload size formatted as "10.0MB"
 */
export function getMaxUploadSizeDisplay(): string {
	return `${formatSizeInMB(MAX_AVATAR_UPLOAD_SIZE)}MB`;
}
