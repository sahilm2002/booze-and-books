// TypeScript types for the cocktail system

export interface CocktailIngredient {
	name: string;
	amount: string;
	unit: string;
	category: 'spirit' | 'liqueur' | 'mixer' | 'garnish' | 'tool';
	isAlcoholic: boolean;
	optional?: boolean;
}

export interface Cocktail {
	id: string;
	bookId: string;
	userId: string;
	name: string;
	type: 'alcoholic' | 'non_alcoholic';
	description?: string;
	themeExplanation: string; // Why this cocktail fits the book
	themeAspect: 'title' | 'characters' | 'plot' | 'setting' | 'mood';
	ingredients: CocktailIngredient[];
	instructions: string;
	difficulty: 'easy' | 'medium' | 'hard';
	prepTimeMinutes: number;
	createdAt: string;
	refreshSessionId?: string;
	isFavorited: boolean;
}

export interface CocktailGenerationRequest {
	bookId: string;
	bookTitle: string;
	bookAuthors: string[];
	bookDescription?: string;
	themeAspect?: 'title' | 'characters' | 'plot' | 'setting' | 'mood';
	excludeCocktailIds?: string[]; // For refresh functionality
}

export interface CocktailGenerationResponse {
	cocktails: Omit<Cocktail, 'id' | 'userId' | 'createdAt' | 'refreshSessionId' | 'isFavorited'>[];
	sessionId: string;
}

export interface CocktailRefreshSession {
	id: string;
	userId: string;
	bookId: string;
	sessionStart: string;
	refreshCount: number;
	lastThemeAspect?: string;
	createdAt: string;
}

export interface USStore {
	id: string;
	name: string;
	chain: 'target' | 'walmart' | 'kroger' | 'bevmo' | 'total_wine' | 'safeway' | 'publix' | 'heb' | 'meijer' | 'costco' | 'sams_club' | 'whole_foods' | 'trader_joes' | 'cvs' | 'walgreens';
	address: string;
	city: string;
	state: string; // US state abbreviation
	zipCode: string;
	latitude?: number;
	longitude?: number;
	phone?: string;
	websiteUrl: string;
	supportsAlcohol: boolean;
	supportsDelivery: boolean;
	supportsPickup: boolean;
	apiIntegration: boolean;
	cartBaseUrl?: string;
	hours?: StoreHours;
	distance?: number; // Calculated distance from user
}

export interface StoreHours {
	monday?: string;
	tuesday?: string;
	wednesday?: string;
	thursday?: string;
	friday?: string;
	saturday?: string;
	sunday?: string;
}

export interface StoreLocatorRequest {
	zipCode: string;
	radiusMiles?: number; // Default 10 miles
	includeAlcoholOnly?: boolean; // Default true
}

export interface CocktailIngredientData {
	id: string;
	name: string;
	category: 'spirit' | 'liqueur' | 'mixer' | 'garnish' | 'tool';
	alcoholContent?: number; // ABV percentage
	commonBrands: string[];
	substitutes?: string[];
	averagePriceUsd?: number;
	isAlcoholic: boolean;
}

export interface AgeVerification {
	isVerified: boolean;
	verificationDate?: string;
	minimumAge: 21; // US standard
}

export interface UserCocktailPreferences {
	zipCode?: string;
	ageVerified: boolean;
	ageVerificationDate?: string;
	preferredStoreChains?: string[];
	favoriteSpirits?: string[];
}

export interface ShoppingCartItem {
	ingredientName: string;
	quantity: number;
	estimatedPrice?: number;
	storeProductId?: string;
	storeProductUrl?: string;
}

export interface ShoppingCartRequest {
	storeId: string;
	cocktailId: string;
	items: ShoppingCartItem[];
}

// API Response types
export interface CocktailApiResponse {
	success: boolean;
	data?: Cocktail[];
	error?: string;
	sessionId?: string;
}

export interface StoreLocatorApiResponse {
	success: boolean;
	data?: USStore[];
	error?: string;
}

export interface AgeVerificationApiResponse {
	success: boolean;
	data?: AgeVerification;
	error?: string;
}

// UI State types
export interface CocktailUIState {
	isLoading: boolean;
	isGenerating: boolean;
	isRefreshing: boolean;
	showAgeVerification: boolean;
	showCocktailModal: boolean;
	showStoreSelector: boolean;
	selectedCocktail?: Cocktail;
	currentCocktails: Cocktail[];
	availableStores: USStore[];
	error?: string;
}

export interface CocktailModalProps {
	cocktail: Cocktail;
	isOpen: boolean;
	onClose: () => void;
	onFavorite: (cocktailId: string) => void;
	onOrderIngredients: (cocktail: Cocktail) => void;
}

export interface AgeVerificationModalProps {
	isOpen: boolean;
	onVerify: () => void;
	onCancel: () => void;
}

export interface StoreSelectionModalProps {
	isOpen: boolean;
	stores: USStore[];
	cocktail: Cocktail;
	onStoreSelect: (store: USStore, cocktail: Cocktail) => void;
	onClose: () => void;
	userZipCode?: string;
}

// Validation schemas
export const US_ZIP_CODE_REGEX = /^\d{5}(-\d{4})?$/;
export const US_STATES = [
	'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
	'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
	'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
	'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
	'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

export const SUPPORTED_STORE_CHAINS = [
	'target', 'walmart', 'kroger', 'bevmo', 'total_wine',
	'safeway', 'publix', 'heb', 'meijer',
	'costco', 'sams_club', 'whole_foods', 'trader_joes', 'cvs', 'walgreens'
] as const;

export type SupportedStoreChain = typeof SUPPORTED_STORE_CHAINS[number];

// Utility functions
export function validateZipCode(zipCode: string): boolean {
	return US_ZIP_CODE_REGEX.test(zipCode);
}

export function isValidState(state: string): boolean {
	return US_STATES.includes(state.toUpperCase());
}

export function formatCocktailType(type: Cocktail['type']): string {
	return type === 'alcoholic' ? 'Alcoholic' : 'Non-Alcoholic';
}

export function formatDifficulty(difficulty: Cocktail['difficulty']): string {
	return difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
}

export function formatPrepTime(minutes: number): string {
	if (minutes < 60) {
		return `${minutes} min`;
	}
	const hours = Math.floor(minutes / 60);
	const remainingMinutes = minutes % 60;
	return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

export function getStoreDisplayName(chain: string): string {
	const storeNames: Record<string, string> = {
		target: 'Target',
		walmart: 'Walmart',
		kroger: 'Kroger',
		bevmo: 'BevMo!',
		total_wine: 'Total Wine & More',
		safeway: 'Safeway',
		publix: 'Publix',
		heb: 'H-E-B',
		meijer: 'Meijer',
		costco: 'Costco',
		sams_club: "Sam's Club",
		whole_foods: 'Whole Foods Market',
		trader_joes: "Trader Joe's",
		cvs: 'CVS Pharmacy',
		walgreens: 'Walgreens'
	};
	return storeNames[chain] || chain;
}

export function calculateDistance(
	lat1: number, 
	lon1: number, 
	lat2: number, 
	lon2: number
): number {
	const R = 3959; // Earth's radius in miles
	const dLat = (lat2 - lat1) * Math.PI / 180;
	const dLon = (lon2 - lon1) * Math.PI / 180;
	const a = 
		Math.sin(dLat/2) * Math.sin(dLat/2) +
		Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
		Math.sin(dLon/2) * Math.sin(dLon/2);
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
	return R * c; // Distance in miles
}
