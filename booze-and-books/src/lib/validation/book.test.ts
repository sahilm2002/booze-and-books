import { describe, it, expect } from 'vitest';
import { validateBookInput, validateBookUpdate, getConditionDisplayName } from './book.js';
import { BookCondition } from '../types/book.js';

describe('Book Validation with Legacy Conditions', () => {
	describe('validateBookInput', () => {
		it('should accept current enum values', () => {
			const input = {
				title: 'Test Book',
				authors: ['Test Author'],
				condition: BookCondition.LIKE_NEW,
				genre: 'Fiction',
				description: 'A test book'
			};

			const result = validateBookInput(input);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.condition).toBe(BookCondition.LIKE_NEW);
			}
		});

		it('should map legacy AS_NEW to LIKE_NEW', () => {
			const input = {
				title: 'Test Book',
				authors: ['Test Author'],
				condition: 'AS_NEW' as any, // Legacy value
				genre: 'Fiction',
				description: 'A test book'
			};

			const result = validateBookInput(input);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.condition).toBe(BookCondition.LIKE_NEW);
			}
		});

		it('should map legacy FINE to LIKE_NEW', () => {
			const input = {
				title: 'Test Book',
				authors: ['Test Author'],
				condition: 'FINE' as any, // Legacy value
				genre: 'Fiction',
				description: 'A test book'
			};

			const result = validateBookInput(input);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.condition).toBe(BookCondition.LIKE_NEW);
			}
		});

		it('should preserve valid current condition values', () => {
			const conditions = [
				BookCondition.VERY_GOOD,
				BookCondition.GOOD,
				BookCondition.FAIR,
				BookCondition.POOR
			];

			conditions.forEach(condition => {
				const input = {
					title: 'Test Book',
					authors: ['Test Author'],
					condition,
					genre: 'Fiction',
					description: 'A test book'
				};

				const result = validateBookInput(input);
				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data.condition).toBe(condition);
				}
			});
		});
	});

	describe('validateBookUpdate', () => {
		it('should map legacy values in updates', () => {
			const update = {
				condition: 'AS_NEW' as any
			};

			const result = validateBookUpdate(update);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.condition).toBe(BookCondition.LIKE_NEW);
			}
		});
	});

	describe('getConditionDisplayName', () => {
		it('should return correct display names for current enum values', () => {
			expect(getConditionDisplayName(BookCondition.LIKE_NEW)).toBe('Like New');
			expect(getConditionDisplayName(BookCondition.VERY_GOOD)).toBe('Very Good');
			expect(getConditionDisplayName(BookCondition.GOOD)).toBe('Good');
			expect(getConditionDisplayName(BookCondition.FAIR)).toBe('Fair');
			expect(getConditionDisplayName(BookCondition.POOR)).toBe('Poor');
		});

		it('should handle legacy string values', () => {
			expect(getConditionDisplayName('AS_NEW')).toBe('Like New');
			expect(getConditionDisplayName('FINE')).toBe('Like New');
			expect(getConditionDisplayName('VERY_GOOD')).toBe('Very Good');
		});

		it('should fallback gracefully for unknown values', () => {
			expect(getConditionDisplayName('UNKNOWN_VALUE' as any)).toBe('UNKNOWN_VALUE');
		});
	});
});