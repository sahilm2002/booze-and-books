import { supabase } from '$lib/supabase';
import type { Profile, ProfileUpdate } from '$lib/types/profile';

export class ProfileService {
	static async getProfile(userId: string): Promise<Profile | null> {
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

	static async updateProfile(userId: string, updates: ProfileUpdate): Promise<Profile> {
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

	static async uploadAvatar(userId: string, file: File): Promise<string> {
		// Determine file extension, preferring file.name, then file.type, defaulting to png
		let fileExt = file.name.split('.').pop();
		if (!fileExt || fileExt === file.name) {
			// No extension found in filename, try to derive from MIME type
			const mimeToExt: { [key: string]: string } = {
				'image/jpeg': 'jpg',
				'image/jpg': 'jpg', 
				'image/png': 'png',
				'image/gif': 'gif',
				'image/webp': 'webp'
			};
			fileExt = mimeToExt[file.type] || 'png';
		}

		const fileName = `${userId}/avatar.${fileExt}`;

		const { error: uploadError } = await supabase.storage
			.from('avatars')
			.upload(fileName, file, {
				cacheControl: '3600',
				upsert: true
			});

		if (uploadError) {
			throw new Error(`Failed to upload avatar: ${uploadError.message}`);
		}

		const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);

		return data.publicUrl;
	}

	static async deleteAvatar(avatarUrlOrKey: string): Promise<void> {
		let filePath = avatarUrlOrKey;
		
		// If it's a full URL, extract the storage key
		if (avatarUrlOrKey.includes('/storage/v1/object/public/avatars/')) {
			const urlParts = avatarUrlOrKey.split('/storage/v1/object/public/avatars/');
			filePath = urlParts[1];
		}

		const { error } = await supabase.storage
			.from('avatars')
			.remove([filePath]);

		if (error) {
			throw new Error(`Failed to delete avatar: ${error.message}`);
		}
	}

	static async createProfile(userId: string, initialData?: Partial<ProfileUpdate>): Promise<Profile> {
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

	static getAvatarUrl(avatarUrl: string | null): string | null {
		if (!avatarUrl) return null;
		
		if (avatarUrl.startsWith('http')) {
			return avatarUrl;
		}
		
		const { data } = supabase.storage.from('avatars').getPublicUrl(avatarUrl);
		return data.publicUrl;
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
}