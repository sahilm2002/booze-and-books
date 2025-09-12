import type { SupabaseClient } from '@supabase/supabase-js';
import type { Profile, ProfileUpdate } from '$lib/types/profile';

export class ProfileServiceServer {
	static async getProfile(supabase: SupabaseClient, userId: string): Promise<Profile | null> {
		const { data, error } = await supabase
			.from('profiles')
			.select('*')
			.eq('id', userId)
			.single();

		if (error) {
			if (error.code === 'PGRST116') {
				return null;
			}
			throw new Error(`Failed to fetch profile: ${error.message}`);
		}

		return data;
	}

	static async updateProfile(supabase: SupabaseClient, userId: string, updates: ProfileUpdate): Promise<Profile> {
		const { data, error } = await supabase
			.from('profiles')
			.update(updates)
			.eq('id', userId)
			.select()
			.single();

		if (error) {
			throw new Error(`Failed to update profile: ${error.message}`);
		}

		return data;
	}

	static async createProfile(supabase: SupabaseClient, userId: string, initialData?: Partial<ProfileUpdate>): Promise<Profile> {
		const profileData = {
			id: userId,
			username: initialData?.username || null,
			full_name: initialData?.full_name || null,
			bio: initialData?.bio || null,
			location: initialData?.location || null,
			avatar_url: initialData?.avatar_url || null
		};

		const { data, error } = await supabase
			.from('profiles')
			.insert(profileData)
			.select()
			.single();

		if (error) {
			throw new Error(`Failed to create profile: ${error.message}`);
		}

		return data;
	}

	static generateInitials(fullName: string | null, username: string | null, email?: string): string {
		if (fullName) {
			return fullName
				.split(' ')
				.map(name => name.charAt(0).toUpperCase())
				.slice(0, 2)
				.join('');
		}
		
		if (username) {
			return username.charAt(0).toUpperCase();
		}
		
		if (email) {
			return email.charAt(0).toUpperCase();
		}
		
		return '?';
	}

	static sanitizeUsername(email: string): string {
		// Extract local part before @ and sanitize it
		const localPart = email.split('@')[0];
		// Replace any non-allowed characters with underscores, then trim underscores from ends
		const sanitized = localPart.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/^_+|_+$/g, '');
		return sanitized || 'user';
	}
}