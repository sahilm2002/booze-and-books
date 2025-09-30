import type { SupabaseClient } from '@supabase/supabase-js';
import type { PrivateProfile, ProfileUpdate } from '$lib/types/profile';

export class ProfileServiceServer {
	static async getProfile(supabase: SupabaseClient, userId: string): Promise<PrivateProfile | null> {
		const { data, error } = await supabase
			.from('profiles')
			.select('*, is_online, last_seen_at, first_login_at')
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

	static async updateProfile(supabase: SupabaseClient, userId: string, updates: ProfileUpdate): Promise<PrivateProfile> {
		// Only allow updating columns that actually exist in the profiles table
		const whitelist = ['full_name', 'bio', 'city', 'state', 'zip_code', 'avatar_url', 'email_notifications', 'email'] as const;
		const updateData: Record<string, unknown> = {};

		for (const key of whitelist) {
			const raw = (updates as any)[key];
			if (raw !== undefined) {
				if (typeof raw === 'string') {
					const trimmed = raw.trim();
					updateData[key] = trimmed === '' ? null : trimmed;
				} else {
					updateData[key] = raw;
				}
			}
		}

		// No valid fields to update - just return the current profile
		if (Object.keys(updateData).length === 0) {
			const { data: current, error: fetchError } = await supabase
				.from('profiles')
				.select('*')
				.eq('id', userId)
				.single();

			if (fetchError) {
				throw new Error(`Failed to fetch profile: ${fetchError.message}`);
			}
			return current as PrivateProfile;
		}

		const { data, error } = await supabase
			.from('profiles')
			.update(updateData)
			.eq('id', userId)
			.select()
			.single();

		if (error) {
			throw new Error(`Failed to update profile: ${error.message}`);
		}

		return data as PrivateProfile;
	}

	static async createProfile(supabase: SupabaseClient, userId: string, initialData?: Partial<ProfileUpdate>): Promise<PrivateProfile> {
		const profileData = {
			id: userId,
			username: initialData?.username || null,
			full_name: initialData?.full_name || null,
			bio: initialData?.bio || null,
			city: initialData?.city || null,
			state: initialData?.state || null,
			zip_code: initialData?.zip_code || null,
			avatar_url: initialData?.avatar_url || null,
			email: initialData?.email || null
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
