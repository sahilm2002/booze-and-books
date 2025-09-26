import { supabase } from '$lib/supabase';
import type { 
	Cocktail, 
	CocktailGenerationRequest, 
	CocktailGenerationResponse,
	CocktailRefreshSession,
	CocktailIngredient,
	AgeVerification,
	UserCocktailPreferences
} from '$lib/types/cocktail';

export class CocktailService {
	/**
	 * Generate themed cocktails for a book using AI
	 */
	static async generateCocktails(
		request: CocktailGenerationRequest,
		userId: string
	): Promise<CocktailGenerationResponse> {
		try {
			// Create or update refresh session
			const sessionId = await this.createRefreshSession(userId, request.bookId, request.themeAspect);

			// Generate cocktails using AI
			const cocktails = await this.generateCocktailsWithAI(request);

			// Save cocktails to database
			const savedCocktails = await this.saveCocktails(cocktails, userId, sessionId);

			return {
				cocktails: savedCocktails,
				sessionId
			};
		} catch (error) {
			console.error('Failed to generate cocktails:', error);
			throw new Error('Failed to generate cocktails. Please try again.');
		}
	}

	/**
	 * Refresh cocktails with new AI-generated options
	 */
	static async refreshCocktails(
		bookId: string,
		userId: string,
		excludeCocktailIds: string[] = []
	): Promise<CocktailGenerationResponse> {
		try {
			// Get book details for generation
			const { data: book, error: bookError } = await supabase
				.from('books')
				.select('title, authors, description')
				.eq('id', bookId)
				.single();

			if (bookError || !book) {
				throw new Error('Book not found');
			}

			// Get current refresh session
			const { data: session } = await supabase
				.from('cocktail_refresh_sessions')
				.select('*')
				.eq('user_id', userId)
				.eq('book_id', bookId)
				.order('created_at', { ascending: false })
				.limit(1)
				.single();

			// Determine next theme aspect for variety
			const nextThemeAspect = this.getNextThemeAspect(session?.last_theme_aspect);

			const request: CocktailGenerationRequest = {
				bookId,
				bookTitle: book.title,
				bookAuthors: Array.isArray(book.authors) ? book.authors : [book.authors],
				bookDescription: book.description,
				themeAspect: nextThemeAspect,
				excludeCocktailIds
			};

			return await this.generateCocktails(request, userId);
		} catch (error) {
			console.error('Failed to refresh cocktails:', error);
			throw new Error('Failed to refresh cocktails. Please try again.');
		}
	}

	/**
	 * Get user's cocktails for a specific book
	 */
	static async getUserCocktails(userId: string, bookId: string): Promise<Cocktail[]> {
		const { data, error } = await supabase
			.from('cocktails')
			.select('*')
			.eq('user_id', userId)
			.eq('book_id', bookId)
			.order('created_at', { ascending: false });

		if (error) {
			console.error('Failed to fetch user cocktails:', error);
			throw new Error('Failed to load cocktails');
		}

		return data.map(this.mapDatabaseToCocktail);
	}

	/**
	 * Get user's favorite cocktails
	 */
	static async getFavoriteCocktails(userId: string): Promise<Cocktail[]> {
		const { data, error } = await supabase
			.from('cocktails')
			.select(`
				*,
				books!inner(title, authors)
			`)
			.eq('user_id', userId)
			.eq('is_favorited', true)
			.order('created_at', { ascending: false });

		if (error) {
			console.error('Failed to fetch favorite cocktails:', error);
			throw new Error('Failed to load favorite cocktails');
		}

		return data.map(this.mapDatabaseToCocktail);
	}

	/**
	 * Toggle cocktail favorite status
	 */
	static async toggleFavorite(cocktailId: string, userId: string): Promise<boolean> {
		// First get current status
		const { data: current, error: fetchError } = await supabase
			.from('cocktails')
			.select('is_favorited')
			.eq('id', cocktailId)
			.eq('user_id', userId)
			.single();

		if (fetchError) {
			throw new Error('Cocktail not found');
		}

		const newStatus = !current.is_favorited;

		const { error } = await supabase
			.from('cocktails')
			.update({ is_favorited: newStatus })
			.eq('id', cocktailId)
			.eq('user_id', userId);

		if (error) {
			throw new Error('Failed to update favorite status');
		}

		return newStatus;
	}

	/**
	 * Verify user's age (21+ for US)
	 */
	static async verifyAge(userId: string): Promise<AgeVerification> {
		const { data, error } = await supabase
			.from('profiles')
			.update({
				age_verified: true,
				age_verification_date: new Date().toISOString()
			})
			.eq('id', userId)
			.select('age_verified, age_verification_date')
			.single();

		if (error) {
			throw new Error('Failed to verify age');
		}

		return {
			isVerified: data.age_verified,
			verificationDate: data.age_verification_date,
			minimumAge: 21
		};
	}

	/**
	 * Get user's age verification status
	 */
	static async getAgeVerificationStatus(userId: string): Promise<AgeVerification> {
		const { data, error } = await supabase
			.from('profiles')
			.select('age_verified, age_verification_date')
			.eq('id', userId)
			.single();

		if (error) {
			throw new Error('Failed to get age verification status');
		}

		return {
			isVerified: data.age_verified || false,
			verificationDate: data.age_verification_date,
			minimumAge: 21
		};
	}

	/**
	 * Update user's cocktail preferences
	 */
	static async updateUserPreferences(
		userId: string, 
		preferences: Partial<UserCocktailPreferences>
	): Promise<void> {
		const updateData: any = {};

		if (preferences.zipCode !== undefined) {
			updateData.zip_code = preferences.zipCode;
		}

		if (Object.keys(updateData).length > 0) {
			const { error } = await supabase
				.from('profiles')
				.update(updateData)
				.eq('id', userId);

			if (error) {
				throw new Error('Failed to update preferences');
			}
		}
	}

	/**
	 * Get user's cocktail preferences
	 */
	static async getUserPreferences(userId: string): Promise<UserCocktailPreferences> {
		const { data, error } = await supabase
			.from('profiles')
			.select('zip_code, age_verified, age_verification_date')
			.eq('id', userId)
			.single();

		if (error) {
			throw new Error('Failed to get user preferences');
		}

		return {
			zipCode: data.zip_code,
			ageVerified: data.age_verified || false,
			ageVerificationDate: data.age_verification_date
		};
	}

	// Private helper methods

	private static async generateCocktailsWithAI(
		request: CocktailGenerationRequest
	): Promise<Omit<Cocktail, 'id' | 'userId' | 'createdAt' | 'refreshSessionId' | 'isFavorited'>[]> {
		// This would integrate with OpenAI or Claude API
		// For now, return mock data that follows the theme
		const themeAspect = request.themeAspect || 'characters';
		
		// Generate themed cocktails based on the book
		const cocktails = await this.generateThemedCocktails(
			request.bookTitle,
			request.bookAuthors,
			request.bookDescription,
			themeAspect
		);

		return cocktails.map(cocktail => ({
			...cocktail,
			bookId: request.bookId,
			themeAspect
		}));
	}

	private static async generateThemedCocktails(
		title: string,
		authors: string[],
		description?: string,
		themeAspect: string = 'characters'
	): Promise<Omit<Cocktail, 'id' | 'bookId' | 'userId' | 'createdAt' | 'refreshSessionId' | 'isFavorited' | 'themeAspect'>[]> {
		// This is a simplified version - in production, this would call an AI API
		// For now, return themed examples based on the theme aspect and add variety
		
		// Clean up title for cocktail naming
		const cleanTitle = title.replace(/^(The|A|An)\s+/i, '').trim();
		const firstWord = cleanTitle.split(' ')[0] || 'Literary';
		const authorLastName = authors[0]?.split(' ').pop() || 'Author';
		
		// Generate different cocktails based on theme aspect
		const cocktailTemplates = this.getCocktailTemplatesByTheme(themeAspect, title, firstWord, authorLastName);
		
		// Add randomization to ensure variety
		const timestamp = Date.now();
		const randomSeed = (timestamp % 1000) / 1000; // Use timestamp for variety
		
		// Select different cocktails based on the random seed
		const selectedTemplates = this.selectVariedCocktails(cocktailTemplates, randomSeed);
		
		return selectedTemplates;
	}

	private static getCocktailTemplatesByTheme(
		themeAspect: string,
		title: string,
		firstWord: string,
		authorLastName: string
	) {
		const templates = {
			characters: [
				{
					name: `${firstWord} Character Martini`,
					type: 'alcoholic' as const,
					description: `A sophisticated cocktail inspired by the complex characters in ${title}`,
					themeExplanation: `This martini reflects the intricate personalities and relationships between characters in ${title}. Each ingredient represents a different character trait.`,
					ingredients: [
						{ name: 'Gin', amount: '2.5', unit: 'oz', category: 'spirit' as const, isAlcoholic: true },
						{ name: 'Dry Vermouth', amount: '0.5', unit: 'oz', category: 'liqueur' as const, isAlcoholic: true },
						{ name: 'Lemon Twist', amount: '1', unit: 'piece', category: 'garnish' as const, isAlcoholic: false }
					],
					instructions: 'Stir gin and vermouth with ice. Strain into a chilled martini glass. Garnish with lemon twist.',
					difficulty: 'easy' as const,
					prepTimeMinutes: 3
				},
				{
					name: `${authorLastName}'s Whiskey Sour`,
					type: 'alcoholic' as const,
					description: `A bold cocktail representing the strong personalities in ${title}`,
					themeExplanation: `Like the characters in ${title}, this cocktail balances sweet and sour elements to create something memorable.`,
					ingredients: [
						{ name: 'Bourbon', amount: '2', unit: 'oz', category: 'spirit' as const, isAlcoholic: true },
						{ name: 'Lemon Juice', amount: '1', unit: 'oz', category: 'mixer' as const, isAlcoholic: false },
						{ name: 'Simple Syrup', amount: '0.75', unit: 'oz', category: 'mixer' as const, isAlcoholic: false },
						{ name: 'Cherry', amount: '1', unit: 'piece', category: 'garnish' as const, isAlcoholic: false }
					],
					instructions: 'Shake all ingredients with ice. Strain into a rocks glass over ice. Garnish with cherry.',
					difficulty: 'easy' as const,
					prepTimeMinutes: 4
				}
			],
			plot: [
				{
					name: `${firstWord} Plot Twist`,
					type: 'alcoholic' as const,
					description: `A surprising cocktail that mirrors the unexpected turns in ${title}`,
					themeExplanation: `Just like the plot of ${title}, this cocktail starts one way and surprises you with unexpected flavors.`,
					ingredients: [
						{ name: 'Vodka', amount: '2', unit: 'oz', category: 'spirit' as const, isAlcoholic: true },
						{ name: 'Blue Curacao', amount: '0.5', unit: 'oz', category: 'liqueur' as const, isAlcoholic: true },
						{ name: 'Pineapple Juice', amount: '2', unit: 'oz', category: 'mixer' as const, isAlcoholic: false },
						{ name: 'Lime Wheel', amount: '1', unit: 'piece', category: 'garnish' as const, isAlcoholic: false }
					],
					instructions: 'Shake vodka and pineapple juice with ice. Strain into glass. Slowly add blue curacao for color effect. Garnish with lime.',
					difficulty: 'medium' as const,
					prepTimeMinutes: 5
				},
				{
					name: `${title} Narrative Negroni`,
					type: 'alcoholic' as const,
					description: `A complex cocktail that unfolds like the story in ${title}`,
					themeExplanation: `Each sip reveals new layers, much like how the plot of ${title} develops with each chapter.`,
					ingredients: [
						{ name: 'Gin', amount: '1', unit: 'oz', category: 'spirit' as const, isAlcoholic: true },
						{ name: 'Campari', amount: '1', unit: 'oz', category: 'liqueur' as const, isAlcoholic: true },
						{ name: 'Sweet Vermouth', amount: '1', unit: 'oz', category: 'liqueur' as const, isAlcoholic: true },
						{ name: 'Orange Peel', amount: '1', unit: 'piece', category: 'garnish' as const, isAlcoholic: false }
					],
					instructions: 'Stir all ingredients with ice. Strain into rocks glass over ice. Express orange peel oils and garnish.',
					difficulty: 'medium' as const,
					prepTimeMinutes: 4
				}
			],
			setting: [
				{
					name: `${firstWord} Atmosphere`,
					type: 'alcoholic' as const,
					description: `A cocktail that captures the mood and setting of ${title}`,
					themeExplanation: `This drink embodies the atmosphere and environment where ${title} takes place.`,
					ingredients: [
						{ name: 'Rum', amount: '2', unit: 'oz', category: 'spirit' as const, isAlcoholic: true },
						{ name: 'Coconut Cream', amount: '1', unit: 'oz', category: 'mixer' as const, isAlcoholic: false },
						{ name: 'Pineapple Juice', amount: '2', unit: 'oz', category: 'mixer' as const, isAlcoholic: false },
						{ name: 'Pineapple Wedge', amount: '1', unit: 'piece', category: 'garnish' as const, isAlcoholic: false }
					],
					instructions: 'Blend all ingredients with ice. Pour into hurricane glass. Garnish with pineapple wedge.',
					difficulty: 'easy' as const,
					prepTimeMinutes: 3
				},
				{
					name: `${title} Environment`,
					type: 'alcoholic' as const,
					description: `A cocktail inspired by the world of ${title}`,
					themeExplanation: `The ingredients reflect the setting and time period of ${title}.`,
					ingredients: [
						{ name: 'Brandy', amount: '2', unit: 'oz', category: 'spirit' as const, isAlcoholic: true },
						{ name: 'Honey Syrup', amount: '0.5', unit: 'oz', category: 'mixer' as const, isAlcoholic: false },
						{ name: 'Lemon Juice', amount: '0.5', unit: 'oz', category: 'mixer' as const, isAlcoholic: false },
						{ name: 'Thyme Sprig', amount: '1', unit: 'piece', category: 'garnish' as const, isAlcoholic: false }
					],
					instructions: 'Shake all ingredients with ice. Strain into coupe glass. Garnish with fresh thyme sprig.',
					difficulty: 'medium' as const,
					prepTimeMinutes: 4
				}
			],
			mood: [
				{
					name: `${firstWord} Emotion`,
					type: 'alcoholic' as const,
					description: `A cocktail that captures the emotional tone of ${title}`,
					themeExplanation: `This drink reflects the feelings and emotions evoked by reading ${title}.`,
					ingredients: [
						{ name: 'Tequila', amount: '2', unit: 'oz', category: 'spirit' as const, isAlcoholic: true },
						{ name: 'Lime Juice', amount: '1', unit: 'oz', category: 'mixer' as const, isAlcoholic: false },
						{ name: 'Agave Syrup', amount: '0.75', unit: 'oz', category: 'mixer' as const, isAlcoholic: false },
						{ name: 'Salt Rim', amount: '1', unit: 'pinch', category: 'garnish' as const, isAlcoholic: false }
					],
					instructions: 'Rim glass with salt. Shake tequila, lime juice, and agave with ice. Strain into glass over ice.',
					difficulty: 'easy' as const,
					prepTimeMinutes: 3
				},
				{
					name: `${title} Feeling`,
					type: 'alcoholic' as const,
					description: `A cocktail that embodies the spirit of ${title}`,
					themeExplanation: `Each ingredient was chosen to represent the emotional journey of ${title}.`,
					ingredients: [
						{ name: 'Rye Whiskey', amount: '2', unit: 'oz', category: 'spirit' as const, isAlcoholic: true },
						{ name: 'Maple Syrup', amount: '0.5', unit: 'oz', category: 'mixer' as const, isAlcoholic: false },
						{ name: 'Bitters', amount: '2', unit: 'dashes', category: 'mixer' as const, isAlcoholic: true },
						{ name: 'Orange Peel', amount: '1', unit: 'piece', category: 'garnish' as const, isAlcoholic: false }
					],
					instructions: 'Stir all ingredients with ice. Strain into rocks glass over large ice cube. Express orange oils and garnish.',
					difficulty: 'medium' as const,
					prepTimeMinutes: 4
				}
			],
			title: [
				{
					name: `The ${firstWord} Special`,
					type: 'alcoholic' as const,
					description: `A signature cocktail directly inspired by ${title}`,
					themeExplanation: `This cocktail takes its name and inspiration directly from ${title}, creating a drink as memorable as the book itself.`,
					ingredients: [
						{ name: 'Champagne', amount: '4', unit: 'oz', category: 'spirit' as const, isAlcoholic: true },
						{ name: 'Elderflower Liqueur', amount: '0.5', unit: 'oz', category: 'liqueur' as const, isAlcoholic: true },
						{ name: 'Lemon Juice', amount: '0.25', unit: 'oz', category: 'mixer' as const, isAlcoholic: false },
						{ name: 'Lemon Twist', amount: '1', unit: 'piece', category: 'garnish' as const, isAlcoholic: false }
					],
					instructions: 'Add elderflower liqueur and lemon juice to flute. Top with champagne. Garnish with lemon twist.',
					difficulty: 'easy' as const,
					prepTimeMinutes: 2
				},
				{
					name: `${title} Signature`,
					type: 'alcoholic' as const,
					description: `The definitive cocktail for ${title}`,
					themeExplanation: `This signature drink captures everything that makes ${title} special and unique.`,
					ingredients: [
						{ name: 'Scotch Whisky', amount: '2', unit: 'oz', category: 'spirit' as const, isAlcoholic: true },
						{ name: 'Amaretto', amount: '0.5', unit: 'oz', category: 'liqueur' as const, isAlcoholic: true },
						{ name: 'Lemon Juice', amount: '0.5', unit: 'oz', category: 'mixer' as const, isAlcoholic: false },
						{ name: 'Cherry', amount: '1', unit: 'piece', category: 'garnish' as const, isAlcoholic: false }
					],
					instructions: 'Shake all ingredients with ice. Strain into rocks glass over ice. Garnish with cherry.',
					difficulty: 'medium' as const,
					prepTimeMinutes: 4
				}
			]
		};

		// Always include a non-alcoholic option
		const nonAlcoholicCocktail = {
			name: `${title} Mocktail`,
			type: 'non_alcoholic' as const,
			description: `A refreshing non-alcoholic drink inspired by ${title}`,
			themeExplanation: `This mocktail captures the essence of ${title} through carefully selected flavors.`,
			ingredients: [
				{ name: 'Ginger Beer', amount: '4', unit: 'oz', category: 'mixer' as const, isAlcoholic: false },
				{ name: 'Lime Juice', amount: '1', unit: 'oz', category: 'mixer' as const, isAlcoholic: false },
				{ name: 'Simple Syrup', amount: '0.5', unit: 'oz', category: 'mixer' as const, isAlcoholic: false },
				{ name: 'Lime Wedge', amount: '1', unit: 'piece', category: 'garnish' as const, isAlcoholic: false }
			],
			instructions: 'Combine lime juice and simple syrup in glass with ice. Top with ginger beer. Garnish with lime wedge.',
			difficulty: 'easy' as const,
			prepTimeMinutes: 2
		};

		return [...(templates[themeAspect as keyof typeof templates] || templates.characters), nonAlcoholicCocktail];
	}

	private static selectVariedCocktails(templates: any[], randomSeed: number) {
		// Use the random seed to select different cocktails each time
		const alcoholicTemplates = templates.filter(t => t.type === 'alcoholic');
		const nonAlcoholicTemplates = templates.filter(t => t.type === 'non_alcoholic');
		
		// Select 2 alcoholic cocktails based on random seed
		const selectedAlcoholic = [];
		if (alcoholicTemplates.length >= 2) {
			const index1 = Math.floor(randomSeed * alcoholicTemplates.length);
			const index2 = Math.floor((randomSeed * 1000) % alcoholicTemplates.length);
			selectedAlcoholic.push(alcoholicTemplates[index1]);
			if (index1 !== index2) {
				selectedAlcoholic.push(alcoholicTemplates[index2]);
			} else {
				// If same index, pick the next one (with wrap-around)
				selectedAlcoholic.push(alcoholicTemplates[(index1 + 1) % alcoholicTemplates.length]);
			}
		} else {
			selectedAlcoholic.push(...alcoholicTemplates);
		}
		
		// Always include one non-alcoholic option
		const selectedNonAlcoholic = nonAlcoholicTemplates[0];
		
		return [...selectedAlcoholic, selectedNonAlcoholic];
	}

	private static async createRefreshSession(
		userId: string, 
		bookId: string, 
		themeAspect?: string
	): Promise<string> {
		// Check for existing session
		const { data: existingSession } = await supabase
			.from('cocktail_refresh_sessions')
			.select('*')
			.eq('user_id', userId)
			.eq('book_id', bookId)
			.order('created_at', { ascending: false })
			.limit(1)
			.single();

		if (existingSession) {
			// Update existing session
			const { data, error } = await supabase
				.from('cocktail_refresh_sessions')
				.update({
					refresh_count: existingSession.refresh_count + 1,
					last_theme_aspect: themeAspect
				})
				.eq('id', existingSession.id)
				.select('id')
				.single();

			if (error) throw error;
			return data.id;
		} else {
			// Create new session
			const { data, error } = await supabase
				.from('cocktail_refresh_sessions')
				.insert({
					user_id: userId,
					book_id: bookId,
					refresh_count: 1,
					last_theme_aspect: themeAspect
				})
				.select('id')
				.single();

			if (error) throw error;
			return data.id;
		}
	}

	private static async saveCocktails(
		cocktails: Omit<Cocktail, 'id' | 'userId' | 'createdAt' | 'refreshSessionId' | 'isFavorited'>[],
		userId: string,
		sessionId: string
	): Promise<Omit<Cocktail, 'id' | 'userId' | 'createdAt' | 'refreshSessionId' | 'isFavorited'>[]> {
		const cocktailsToInsert = cocktails.map(cocktail => ({
			book_id: cocktail.bookId,
			user_id: userId,
			name: cocktail.name,
			type: cocktail.type,
			description: cocktail.description,
			theme_explanation: cocktail.themeExplanation,
			theme_aspect: cocktail.themeAspect,
			ingredients: cocktail.ingredients,
			instructions: cocktail.instructions,
			difficulty: cocktail.difficulty,
			prep_time_minutes: cocktail.prepTimeMinutes,
			refresh_session_id: sessionId,
			is_favorited: false
		}));

		const { data, error } = await supabase
			.from('cocktails')
			.insert(cocktailsToInsert)
			.select('*');

		if (error) {
			throw new Error('Failed to save cocktails');
		}

		return data.map(this.mapDatabaseToCocktail);
	}

	private static getNextThemeAspect(lastAspect?: string): 'title' | 'characters' | 'plot' | 'setting' | 'mood' {
		const aspects: ('title' | 'characters' | 'plot' | 'setting' | 'mood')[] = 
			['characters', 'plot', 'setting', 'mood', 'title'];
		
		if (!lastAspect) return 'characters';
		
		const currentIndex = aspects.indexOf(lastAspect as any);
		return aspects[(currentIndex + 1) % aspects.length];
	}

	private static mapDatabaseToCocktail(dbCocktail: any): Cocktail {
		return {
			id: dbCocktail.id,
			bookId: dbCocktail.book_id,
			userId: dbCocktail.user_id,
			name: dbCocktail.name,
			type: dbCocktail.type,
			description: dbCocktail.description,
			themeExplanation: dbCocktail.theme_explanation,
			themeAspect: dbCocktail.theme_aspect,
			ingredients: dbCocktail.ingredients,
			instructions: dbCocktail.instructions,
			difficulty: dbCocktail.difficulty,
			prepTimeMinutes: dbCocktail.prep_time_minutes,
			createdAt: dbCocktail.created_at,
			refreshSessionId: dbCocktail.refresh_session_id,
			isFavorited: dbCocktail.is_favorited
		};
	}
}
