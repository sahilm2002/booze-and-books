import { writable, derived, get } from 'svelte/store';
import { auth } from '$lib/stores/auth';
import { ProfileService } from '$lib/services/profileService';
import type { Profile, ProfileUpdate } from '$lib/types/profile';

export const profile = writable<Profile | null>(null);
export const profileLoading = writable<boolean>(false);
export const profileError = writable<string | null>(null);

export const profileWithUser = derived([profile, auth], ([$profile, $auth]) => {
	if (!$profile || !$auth.user) return null;
	
	return {
		...$profile,
		email: $auth.user.email || ''
	};
});

class ProfileStore {
	private static instance: ProfileStore;

	static getInstance(): ProfileStore {
		if (!ProfileStore.instance) {
			ProfileStore.instance = new ProfileStore();
		}
		return ProfileStore.instance;
	}

	async loadProfile(userId?: string) {
		const { user: currentUser } = get(auth);

		const targetUserId = userId || currentUser?.id;
		if (!targetUserId) {
			profileError.set('No user ID provided');
			return;
		}

		profileLoading.set(true);
		profileError.set(null);

		try {
			let userProfile = await ProfileService.getProfile(targetUserId);
			
			if (!userProfile && targetUserId === currentUser?.id) {
				const sanitizedUsername = this.sanitizeUsername(currentUser?.email || '');
				userProfile = await ProfileService.createProfile(targetUserId, {
					username: sanitizedUsername,
					full_name: currentUser?.email
				});
			}

			profile.set(userProfile);
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Failed to load profile';
			profileError.set(message);
			profile.set(null);
		} finally {
			profileLoading.set(false);
		}
	}

	async updateProfile(updates: ProfileUpdate): Promise<boolean> {
		const { user: currentUser } = get(auth);

		if (!currentUser?.id) {
			profileError.set('User not authenticated');
			return false;
		}

		profileLoading.set(true);
		profileError.set(null);

		try {
			const updatedProfile = await ProfileService.updateProfile(currentUser.id, updates);
			profile.set(updatedProfile);
			return true;
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Failed to update profile';
			profileError.set(message);
			return false;
		} finally {
			profileLoading.set(false);
		}
	}

	async uploadAvatar(file: File): Promise<string | null> {
		const { user: currentUser } = get(auth);

		if (!currentUser?.id) {
			profileError.set('User not authenticated');
			return null;
		}

		profileLoading.set(true);
		profileError.set(null);

		try {
			// Cache current avatar URL for potential deletion
			const currentProfile = get(profile);
			
			const currentAvatarUrl = currentProfile?.avatar_url;
			const avatarUrl = await ProfileService.uploadAvatar(currentUser.id, file);
			
			// Delete old avatar if it exists and is different from new one
			if (currentAvatarUrl && currentAvatarUrl !== avatarUrl) {
				try {
					await ProfileService.deleteAvatar(currentAvatarUrl);
				} catch (deleteError) {
					console.warn('Failed to delete old avatar:', deleteError);
				}
			}
			
			await this.updateProfile({ avatar_url: avatarUrl });
			
			return avatarUrl;
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Failed to upload avatar';
			profileError.set(message);
			return null;
		} finally {
			profileLoading.set(false);
		}
	}

	clearProfile() {
		profile.set(null);
		profileError.set(null);
		profileLoading.set(false);
	}

	private sanitizeUsername(email: string): string {
		// Extract local part before @ and sanitize it
		const localPart = email.split('@')[0];
		// Replace any non-allowed characters with underscores, then trim underscores from ends
		const sanitized = localPart.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/^_+|_+$/g, '');
		return sanitized || 'user';
	}
}

export const profileStore = ProfileStore.getInstance();

// Re-enable automatic profile loading
auth.subscribe(({ user: currentUser }) => {
	if (currentUser) {
		profileStore.loadProfile(currentUser.id);
	} else {
		profileStore.clearProfile();
	}
});
