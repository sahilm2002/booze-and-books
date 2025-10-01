<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import PublicProfile from '../../../../components/profile/PublicProfile.svelte';
	import ChatModal from '../../../../components/chat/ChatModal.svelte';
	import type { ProfilePageData } from '$lib/types/profile';
	import type { PublicProfile as PublicProfileType } from '$lib/types/profile';

	export let data: { profileData: ProfilePageData };

	let showChatModal = false;
	let chatConversationId = '';
	let chatOtherUser: PublicProfileType | null = null;
	let currentUserId = '';

	// Get current user ID from page data's safe user
	$: if ($page.data.user?.id) {
		currentUserId = $page.data.user.id;
	}

	function handleOpenChat(event: CustomEvent) {
		const { userId, username, conversationId } = event.detail;
		
		chatOtherUser = data.profileData.profile;
		chatConversationId = conversationId || data.profileData.conversation_id || '';
		showChatModal = true;
	}

	function handleCloseChat() {
		showChatModal = false;
		chatOtherUser = null;
		chatConversationId = '';
	}

	function handleMessageSent(event: CustomEvent) {
		// Message sent successfully, could show a toast or update UI
		console.log('Message sent:', event.detail);
	}
</script>

<svelte:head>
	<title>{data.profileData.profile.full_name || data.profileData.profile.username} - Profile</title>
	<meta name="description" content="View {data.profileData.profile.username}'s profile and swap history" />
</svelte:head>

<main class="profile-page">
	<PublicProfile 
		profileData={data.profileData}
		{currentUserId}
		on:openChat={handleOpenChat}
	/>
</main>

<!-- Chat Modal -->
{#if showChatModal && chatOtherUser && chatConversationId}
	<ChatModal
		isOpen={showChatModal}
		conversationId={chatConversationId}
		otherUser={chatOtherUser}
		{currentUserId}
		on:close={handleCloseChat}
		on:messageSent={handleMessageSent}
	/>
{/if}

<style>
	.profile-page {
		min-height: 100vh;
		background: #f9fafb;
		padding: 1rem 0;
	}

	@media (max-width: 640px) {
		.profile-page {
			padding: 0.5rem 0;
		}
	}
</style>
