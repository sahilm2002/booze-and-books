import { json } from '@sveltejs/kit';
import { logError } from './logger.js';

/**
 * Generic error response utility for API endpoints
 * Provides secure error handling that doesn't expose sensitive information in production
 */

export interface ApiError {
	message: string;
	code?: string;
	statusCode: number;
	details?: any;
}

export class AppError extends Error {
	public readonly statusCode: number;
	public readonly code?: string;
	public readonly isOperational: boolean;
	public readonly details?: any;

	constructor(message: string, statusCode: number = 500, code?: string, details?: any) {
		super(message);
		this.statusCode = statusCode;
		this.code = code;
		this.isOperational = true;
		this.details = details;

		Error.captureStackTrace(this, this.constructor);
	}
}

/**
 * Creates a standardized error response for API endpoints
 */
export function createErrorResponse(
	error: Error | AppError | any,
	fallbackMessage: string = 'An unexpected error occurred',
	context?: any
): Response {
	const isDevelopment = process.env.NODE_ENV === 'development';
	
	// Log the error with full context
	logError('API Error occurred', error, context);

	let statusCode = 500;
	let message = fallbackMessage;
	let code: string | undefined;

	// Handle known error types
	if (error instanceof AppError) {
		statusCode = error.statusCode;
		message = error.message;
		code = error.code;
	} else if (error instanceof Error) {
		// In development, show the actual error message
		// In production, use generic message for security
		message = isDevelopment ? error.message : fallbackMessage;
	}

	// Prepare response body
	const responseBody: any = {
		error: message,
		success: false
	};

	// Add additional info only in development
	if (isDevelopment) {
		if (code) responseBody.code = code;
		if (error instanceof Error && error.stack) {
			responseBody.stack = error.stack;
		}
		if (context) responseBody.context = context;
	}

	return json(responseBody, { status: statusCode });
}

/**
 * Common error types for the application
 */
export const ErrorTypes = {
	UNAUTHORIZED: (message = 'Unauthorized access') => 
		new AppError(message, 401, 'UNAUTHORIZED'),
	
	FORBIDDEN: (message = 'Access forbidden') => 
		new AppError(message, 403, 'FORBIDDEN'),
	
	NOT_FOUND: (message = 'Resource not found') => 
		new AppError(message, 404, 'NOT_FOUND'),
	
	VALIDATION_ERROR: (message = 'Invalid input data', details?: any) => 
		new AppError(message, 400, 'VALIDATION_ERROR', details),
	
	CONFLICT: (message = 'Resource conflict') => 
		new AppError(message, 409, 'CONFLICT'),
	
	RATE_LIMITED: (message = 'Too many requests') => 
		new AppError(message, 429, 'RATE_LIMITED'),
	
	DATABASE_ERROR: (message = 'Database operation failed') => 
		new AppError(message, 500, 'DATABASE_ERROR'),
	
	EXTERNAL_SERVICE_ERROR: (message = 'External service unavailable') => 
		new AppError(message, 502, 'EXTERNAL_SERVICE_ERROR')
};

/**
 * Validation error helper for Zod validation failures
 */
export function createValidationError(errors: Record<string, string>): AppError {
	const firstError = Object.values(errors)[0] || 'Validation failed';
	return new AppError(firstError, 400, 'VALIDATION_ERROR', { validationErrors: errors });
}

/**
 * Database error helper that sanitizes database-specific error messages
 */
export function handleDatabaseError(error: any, operation: string): AppError {
	logError(`Database error during ${operation}`, error);
	
	// Check for common database error patterns
	if (error?.message?.includes('unique constraint') || error?.code === '23505') {
		return ErrorTypes.CONFLICT('This resource already exists');
	}
	
	if (error?.message?.includes('foreign key constraint') || error?.code === '23503') {
		return ErrorTypes.VALIDATION_ERROR('Referenced resource does not exist');
	}
	
	if (error?.message?.includes('not null constraint') || error?.code === '23502') {
		return ErrorTypes.VALIDATION_ERROR('Required field is missing');
	}
	
	// Generic database error
	return ErrorTypes.DATABASE_ERROR(`Failed to ${operation}`);
}
