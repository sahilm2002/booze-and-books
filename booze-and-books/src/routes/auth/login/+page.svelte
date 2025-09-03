<script lang="ts">
	import Login from '../../../components/auth/Login.svelte';
	import { page } from '$app/stores';
	$: redirectTo = $page.url.searchParams.get('redirectTo') ?? '/app';
</script>

<svelte:head>
	<title>Sign In - Booze and Books</title>
	<meta name="description" content="Sign in to your Booze and Books account" />
</svelte:head>

<Login {redirectTo} />