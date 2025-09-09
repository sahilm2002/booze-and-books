import { ErrorTypes } from './errorHandler.js';
import { logWarn } from './logger.js';

/**
 * Simple in-memory rate limiter for API endpoints
 * In production, consider using Redis for distributed rate limiting
 */

interface RateLimitEntry {
	count: number;
	resetTime: number;
	firstRequest: number;
}

class RateLimiter {
	private store = new Map<string, RateLimitEntry>();
	private cleanupInterval: NodeJS.Timeout;

	constructor() {
		// Clean up expired entries every 5 minutes
		this.cleanupInterval = setInterval(() => {
			this.cleanup();
		}, 5 * 60 * 1000);
	}

	/**
	 * Check if a request should be rate limited
	 */
	checkLimit(
		identifier: string,
		maxRequests: number,
		windowMs: number
	): { allowed: boolean; resetTime?: number; remaining?: number } {
		const now = Date.now();
		const entry = this.store.get(identifier);

		if (!entry) {
			// First request from this identifier
			this.store.set(identifier, {
				count: 1,
				resetTime: now + windowMs,
				firstRequest: now
			});
			return { allowed: true, remaining: maxRequests - 1 };
		}

		// Check if window has expired
		if (now >= entry.resetTime) {
			// Reset the window
			this.store.set(identifier, {
				count: 1,
				resetTime: now + windowMs,
				firstRequest: now
			});
			return { allowed: true, remaining: maxRequests - 1 };
		}

		// Check if limit exceeded
		if (entry.count >= maxRequests) {
			logWarn('Rate limit exceeded', { 
				identifier, 
				count: entry.count, 
				maxRequests,
				resetTime: entry.resetTime 
			});
			return { 
				allowed: false, 
				resetTime: entry.resetTime,
				remaining: 0
			};
		}

		// Increment counter
		entry.count++;
		this.store.set(identifier, entry);

		return { 
			allowed: true, 
			remaining: maxRequests - entry.count 
		};
	}

	/**
	 * Clean up expired entries
	 */
	private cleanup(): void {
		const now = Date.now();
		let cleaned = 0;

		for (const [key, entry] of this.store.entries()) {
			if (now >= entry.resetTime) {
				this.store.delete(key);
				cleaned++;
			}
		}

		if (cleaned > 0) {
			logWarn(`Rate limiter cleanup: removed ${cleaned} expired entries`);
		}
	}

	/**
	 * Get current stats for monitoring
	 */
	getStats(): { totalEntries: number; memoryUsage: string } {
		return {
			totalEntries: this.store.size,
			memoryUsage: `${Math.round(JSON.stringify([...this.store]).length / 1024)}KB`
		};
	}

	/**
	 * Clear all entries (useful for testing)
	 */
	clear(): void {
		this.store.clear();
	}

	/**
	 * Destroy the rate limiter and cleanup interval
	 */
	destroy(): void {
		clearInterval(this.cleanupInterval);
		this.store.clear();
	}
}

// Singleton instance
const rateLimiter = new RateLimiter();

/**
 * Rate limiting configurations for different endpoint types
 */
export const RateLimitConfigs = {
	// General API endpoints
	API_GENERAL: { maxRequests: 100, windowMs: 15 * 60 * 1000 }, // 100 requests per 15 minutes
	
	// Authentication endpoints (more restrictive)
	AUTH: { maxRequests: 5, windowMs: 15 * 60 * 1000 }, // 5 requests per 15 minutes
	
	// Search endpoints (moderate)
	SEARCH: { maxRequests: 30, windowMs: 60 * 1000 }, // 30 requests per minute
	
	// File upload endpoints (very restrictive)
	UPLOAD: { maxRequests: 10, windowMs: 60 * 60 * 1000 }, // 10 requests per hour
	
	// Create/modify operations (moderate)
	MUTATION: { maxRequests: 50, windowMs: 15 * 60 * 1000 }, // 50 requests per 15 minutes
};

/**
 * Create a rate limit identifier from request information
 */
export function createRateLimitIdentifier(
	request: Request,
	additionalKey?: string
): string {
	// Try to get IP from various headers (for production behind proxies)
	const forwarded = request.headers.get('x-forwarded-for');
	const realIp = request.headers.get('x-real-ip');
	const ip = forwarded?.split(',')[0] || realIp || 'unknown';
	
	const userAgent = request.headers.get('user-agent') || 'unknown';
	const baseKey = `${ip}:${userAgent.slice(0, 50)}`;
	
	return additionalKey ? `${baseKey}:${additionalKey}` : baseKey;
}

/**
 * Middleware function to apply rate limiting to API endpoints
 */
export function applyRateLimit(
	request: Request,
	config: { maxRequests: number; windowMs: number },
	additionalKey?: string
) {
	const identifier = createRateLimitIdentifier(request, additionalKey);
	const result = rateLimiter.checkLimit(identifier, config.maxRequests, config.windowMs);
	
	if (!result.allowed) {
		const resetTimeSeconds = Math.ceil((result.resetTime! - Date.now()) / 1000);
		throw ErrorTypes.RATE_LIMITED(
			`Too many requests. Try again in ${resetTimeSeconds} seconds.`
		);
	}
	
	return {
		remaining: result.remaining!,
		resetTime: result.resetTime
	};
}

/**
 * Helper function to add rate limit headers to responses
 */
export function addRateLimitHeaders(
	response: Response,
	remaining: number,
	resetTime?: number
): Response {
	const headers = new Headers(response.headers);
	headers.set('X-RateLimit-Remaining', remaining.toString());
	
	if (resetTime) {
		headers.set('X-RateLimit-Reset', Math.ceil(resetTime / 1000).toString());
	}
	
	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers
	});
}

// Export the rate limiter instance for advanced usage
export { rateLimiter };
