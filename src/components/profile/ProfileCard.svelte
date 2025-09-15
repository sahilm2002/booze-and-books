<script lang="ts">
  import { profileWithUser, profileLoading } from '$lib/stores/profile';
  import { ProfileService } from '$lib/services/profileService';

  export let showEditButton = true;
  export let onEdit: (() => void) | undefined = undefined;

  $: avatarUrl = ProfileService.getAvatarUrl($profileWithUser?.avatar_url ?? null);
  $: initials = ProfileService.generateInitials(
    $profileWithUser?.full_name ?? '',
    $profileWithUser?.username ?? '',
    $profileWithUser?.email ?? ''
  );
</script>

{#if $profileLoading}
  <div class="profile-card">
    <div class="skeleton">
      <div class="avatar-skel" />
      <div class="line short" />
      <div class="line mid" />
      <div class="line long" />
    </div>
  </div>
{:else if $profileWithUser}
  <div class="profile-card" role="region" aria-label="User summary">
    <div class="avatar">
      {#if avatarUrl}
        <img src={avatarUrl} alt="Profile avatar" class="avatar-image" />
      {:else}
        <div class="avatar-initials" aria-hidden="true">{initials}</div>
      {/if}
    </div>

    <div class="content">
      <h2 class="name">{$profileWithUser.full_name || $profileWithUser.username || 'Anonymous User'}</h2>

      {#if $profileWithUser.username && $profileWithUser.full_name}
        <p class="handle">@{$profileWithUser.username}</p>
      {/if}

      <p class="email">{$profileWithUser.email}</p>

      {#if $profileWithUser.bio}
        <p class="bio">{$profileWithUser.bio}</p>
      {/if}

      {#if $profileWithUser.location}
        <p class="location">📍 {$profileWithUser.location}</p>
      {/if}
    </div>

    {#if showEditButton && onEdit}
      <div class="edit-row">
        <button type="button" class="btn-edit" on:click={onEdit} aria-label="Edit profile">Edit Profile</button>
      </div>
    {/if}
  </div>
{:else}
  <div class="profile-card empty-card">
    <p>Profile not found</p>
  </div>
{/if}

<style>
  /* Rebuilt profile card — clean, single-responsibility layout */
  .profile-card {
    background: white;
    border: 1px solid #eaeff4;
    border-radius: 12px;
    box-shadow: 0 6px 18px rgba(16, 24, 40, 0.04);
    padding: 1.5rem;
    box-sizing: border-box;
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
  }

  .skeleton {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
  }
  .avatar-skel {
    width: 5rem;
    height: 5rem;
    border-radius: 9999px;
    background: #eef2f7;
  }
  .line {
    height: 10px;
    background: #eef2f7;
    border-radius: 6px;
    width: 70%;
  }
  .line.short { width: 40%; }
  .line.mid { width: 55%; }
  .line.long { width: 85%; }

  .avatar {
    width: 5rem;
    height: 5rem;
    border-radius: 9999px;
    background: linear-gradient(135deg, #f8f9fa 0%, #f1f3f4 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 8px 30px rgba(16, 24, 40, 0.06);
    overflow: hidden;
  }

  .avatar-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .avatar-initials {
    font-weight: 700;
    color: #6b7280;
    font-size: 1.25rem;
  }

  .content {
    width: 100%;
    text-align: center;
  }

  .name {
    margin: 0;
    font-size: 1.125rem;
    color: #111827;
    font-weight: 700;
    line-height: 1.2;
  }

  .handle {
    margin: 0.25rem 0 0;
    color: #6b7280;
    font-size: 0.95rem;
  }

  .email {
    margin: 0.5rem 0 0;
    color: #6b7280;
    font-size: 0.95rem;
  }

  .bio {
    margin: 0.5rem 0 0;
    color: #374151;
    font-size: 0.95rem;
  }

  .location {
    margin: 0.5rem 0 0;
    color: #6b7280;
    font-size: 0.95rem;
  }

  .edit-row {
    width: 100%;
    display: flex;
    justify-content: center;
    margin-top: 0.5rem;
  }

  .btn-edit {
    background: linear-gradient(135deg, #8B2635 0%, #722F37 100%);
    color: #F5F5DC;
    border: none;
    padding: 0.6rem 1rem;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 6px 20px rgba(139, 38, 53, 0.12);
  }

  .btn-edit:hover { transform: translateY(-2px); }

  /* empty state */
  .empty-card {
    padding: 1.5rem;
    text-align: center;
    color: #6b7280;
  }

  @media (max-width: 640px) {
    .profile-card { padding: 1rem; }
    .avatar { width: 4.25rem; height: 4.25rem; }
    .name { font-size: 1rem; }
    .btn-edit { width: 100%; justify-content: center; }
  }
</style>
