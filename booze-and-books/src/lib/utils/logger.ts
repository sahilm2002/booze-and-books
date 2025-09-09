/**
 * Centralized logging utility for the application
 * Provides environment-aware logging with different levels
 */

export enum LogLevel {
	DEBUG = 0,
	INFO = 1,
	WARN = 2,
	ERROR = 3,
	NONE = 4
}

class Logger {
	private level: LogLevel;
	private isDevelopment: boolean;

	constructor() {
		this.isDevelopment = process.env.NODE_ENV === 'development';
		// Set log level based on environment
		this.level = this.isDevelopment ? LogLevel.DEBUG : LogLevel.WARN;
	}

	private shouldLog(level: LogLevel): boolean {
		return level >= this.level;
	}

	private formatMessage(level: string, message: string, context?: any): string {
		const timestamp = new Date().toISOString();
		const contextStr = context ? ` | Context: ${JSON.stringify(context)}` : '';
		return `[${timestamp}] ${level}: ${message}${contextStr}`;
	}

	debug(message: string, context?: any): void {
		if (this.shouldLog(LogLevel.DEBUG)) {
			console.log(this.formatMessage('DEBUG', message, context));
		}
	}

	info(message: string, context?: any): void {
		if (this.shouldLog(LogLevel.INFO)) {
			console.info(this.formatMessage('INFO', message, context));
		}
	}

	warn(message: string, context?: any): void {
		if (this.shouldLog(LogLevel.WARN)) {
			console.warn(this.formatMessage('WARN', message, context));
		}
	}

	error(message: string, error?: Error | any, context?: any): void {
		if (this.shouldLog(LogLevel.ERROR)) {
			const errorInfo = error instanceof Error 
				? { message: error.message, stack: error.stack }
				: error;
			
			const fullContext = { ...context, error: errorInfo };
			console.error(this.formatMessage('ERROR', message, fullContext));
		}
	}

	// For development debugging - always logs regardless of level
	devLog(message: string, data?: any): void {
		if (this.isDevelopment) {
			console.log(`🔧 DEV: ${message}`, data || '');
		}
	}
}

// Export singleton instance
export const logger = new Logger();

// Convenience functions for common use cases
export const logError = (message: string, error?: Error | any, context?: any) => 
	logger.error(message, error, context);

export const logWarn = (message: string, context?: any) => 
	logger.warn(message, context);

export const logInfo = (message: string, context?: any) => 
	logger.info(message, context);

export const logDebug = (message: string, context?: any) => 
	logger.debug(message, context);
