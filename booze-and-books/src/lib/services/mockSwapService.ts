// Simplified mock data for when database is unavailable
export class MockSwapService {
	static async getSwapRequestsForUser() {
		// Return minimal mock data structure
		return {
			incoming: [
				{
					id: 'mock-incoming-1',
					book_id: 'mock-book-1',
					requester_id: 'mock-user-1',
					owner_id: 'current-user',
					status: 'PENDING',
					message: 'Hi! I would love to read this book. Would you be interested in swapping?',
					offered_book_id: null,
					counter_offered_book_id: null,
					completion_date: null,
					requester_rating: null,
					owner_rating: null,
					requester_feedback: null,
					owner_feedback: null,
					created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
					updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
					book: {
						id: 'mock-book-1',
						title: 'The Great Gatsby',
						authors: ['F. Scott Fitzgerald'],
						thumbnail_url: null,
						condition: 'good'
					},
					requester_profile: {
						username: 'bookworm42',
						full_name: 'Sarah Johnson',
						avatar_url: null
					}
				},
				{
					id: 'mock-incoming-2',
					book_id: 'mock-book-2',
					requester_id: 'mock-user-2',
					owner_id: 'current-user',
					status: 'COUNTER_OFFER',
					message: 'Interested in your copy of 1984. I have some sci-fi books you might like!',
					offered_book_id: 'mock-offered-book-1',
					counter_offered_book_id: 'mock-counter-book-1',
					completion_date: null,
					requester_rating: null,
					owner_rating: null,
					requester_feedback: null,
					owner_feedback: null,
					created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
					updated_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
					book: {
						id: 'mock-book-2',
						title: '1984',
						authors: ['George Orwell'],
						thumbnail_url: null,
						condition: 'excellent'
					},
					requester_profile: {
						username: 'scifireader',
						full_name: 'Mike Chen',
						avatar_url: null
					},
					offered_book: {
						id: 'mock-offered-book-1',
						title: 'Dune',
						authors: ['Frank Herbert'],
						thumbnail_url: null,
						condition: 'good'
					},
					counter_offered_book: {
						id: 'mock-counter-book-1',
						title: 'Fahrenheit 451',
						authors: ['Ray Bradbury'],
						thumbnail_url: null,
						condition: 'very-good'
					}
				}
			],
			outgoing: [
				{
					id: 'mock-outgoing-1',
					book_id: 'mock-book-3',
					requester_id: 'current-user',
					owner_id: 'mock-user-3',
					status: 'PENDING',
					message: 'Would love to read this classic! Happy to trade or just borrow.',
					offered_book_id: 'mock-my-book-1',
					counter_offered_book_id: null,
					completion_date: null,
					requester_rating: null,
					owner_rating: null,
					requester_feedback: null,
					owner_feedback: null,
					created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
					updated_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
					book: {
						id: 'mock-book-3',
						title: 'To Kill a Mockingbird',
						authors: ['Harper Lee'],
						thumbnail_url: null,
						condition: 'good'
					},
					owner_profile: {
						username: 'classicslover',
						full_name: 'Emma Davis',
						avatar_url: null
					},
					offered_book: {
						id: 'mock-my-book-1',
						title: 'Pride and Prejudice',
						authors: ['Jane Austen'],
						thumbnail_url: null,
						condition: 'excellent'
					}
				},
				{
					id: 'mock-outgoing-2',
					book_id: 'mock-book-4',
					requester_id: 'current-user',
					owner_id: 'mock-user-4',
					status: 'ACCEPTED',
					message: 'This looks amazing! Would you be interested in any fantasy books?',
					offered_book_id: null,
					counter_offered_book_id: null,
					completion_date: null,
					requester_rating: null,
					owner_rating: null,
					requester_feedback: null,
					owner_feedback: null,
					created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
					updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
					book: {
						id: 'mock-book-4',
						title: 'The Hobbit',
						authors: ['J.R.R. Tolkien'],
						thumbnail_url: null,
						condition: 'very-good'
					},
					owner_profile: {
						username: 'fantasyfan',
						full_name: 'Alex Thompson',
						avatar_url: null
					}
				}
			]
		};
	}

	static async createSwapRequest(bookId: string, requesterId: string, ownerId: string, message?: string, offeredBookId?: string) {
		// Simulate API delay
		await new Promise(resolve => setTimeout(resolve, 500));
		
		const newRequest = {
			id: `mock-new-${Date.now()}`,
			book_id: bookId,
			requester_id: requesterId,
			owner_id: ownerId,
			status: 'PENDING',
			message,
			offered_book_id: offeredBookId,
			counter_offered_book_id: null,
			completion_date: null,
			requester_rating: null,
			owner_rating: null,
			requester_feedback: null,
			owner_feedback: null,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
			book: {
				id: bookId,
				title: 'Mock Book Title',
				authors: ['Mock Author'],
				thumbnail_url: null,
				condition: 'good'
			}
		};

		return newRequest;
	}

	static async updateSwapRequestStatus(requestId: string, status: string, counterOfferedBookId?: string) {
		// Simulate API delay
		await new Promise(resolve => setTimeout(resolve, 400));
		
		return {
			id: requestId,
			status: status,
			updated_at: new Date().toISOString(),
			counter_offered_book_id: counterOfferedBookId
		};
	}

	static addMockNotification(message: string) {
		console.log(`🔔 Mock Notification: ${message}`);
	}
}