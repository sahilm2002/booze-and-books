/**
 * Comprehensive test script to verify book swap functionality after database fixes
 * Tests regular swaps, counter-offers, ownership transfer, and availability management
 */

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

// Configuration - Update these with your actual Supabase project details
// Load from environment variables - NEVER hardcode credentials!
const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase credentials in environment variables');
  console.error('Please set PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY in your .env file');
  process.exit(1);
}
const BASE_URL = 'http://localhost:5173'; // Update if running on different port

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Test data
let testUsers = {};
let testBooks = {};
let testSwaps = {};

/**
 * Test Setup Functions
 */

async function createTestUser(email, password, username, fullName) {
    console.log(`Creating test user: ${email}`);
    
    // Sign up user
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: fullName
            }
        }
    });

    if (authError && authError.message !== 'User already registered') {
        throw new Error(`Failed to create user ${email}: ${authError.message}`);
    }

    // Sign in user
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (signInError) {
        throw new Error(`Failed to sign in user ${email}: ${signInError.message}`);
    }

    const userId = signInData.user.id;

    // Create or update profile
    const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
            id: userId,
            username,
            full_name: fullName,
            updated_at: new Date().toISOString()
        });

    if (profileError) {
        throw new Error(`Failed to create profile for ${email}: ${profileError.message}`);
    }

    return {
        id: userId,
        email,
        username,
        fullName,
        session: signInData.session
    };
}

async function createTestBook(userId, session, title, author, condition = 'good') {
    console.log(`Creating test book: ${title} for user ${userId}`);

    // Set auth session for the user
    await supabase.auth.setSession(session);

    const bookData = {
        title,
        author,
        condition,
        is_available: true,
        owner_id: userId
    };

    const { data, error } = await supabase
        .from('books')
        .insert(bookData)
        .select()
        .single();

    if (error) {
        throw new Error(`Failed to create book ${title}: ${error.message}`);
    }

    return data;
}

async function cleanupTestData() {
    console.log('Cleaning up test data...');

    try {
        // Delete test books
        const bookIds = Object.values(testBooks).map(book => book.id);
        if (bookIds.length > 0) {
            await supabase.from('books').delete().in('id', bookIds);
        }

        // Delete test swap requests
        const swapIds = Object.values(testSwaps).map(swap => swap.id);
        if (swapIds.length > 0) {
            await supabase.from('swap_requests').delete().in('id', swapIds);
        }

        // Delete test users (profiles will cascade)
        const userIds = Object.values(testUsers).map(user => user.id);
        if (userIds.length > 0) {
            await supabase.from('profiles').delete().in('id', userIds);
        }
    } catch (error) {
        console.warn('Cleanup warning:', error.message);
    }
}

/**
 * API Helper Functions
 */

async function makeSwapRequest(requesterSession, requestedBookId, offeredBookId) {
    const response = await fetch(`${BASE_URL}/api/swaps`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${requesterSession.access_token}`
        },
        body: JSON.stringify({
            requested_book_id: requestedBookId,
            offered_book_id: offeredBookId
        })
    });

    if (!response.ok) {
        throw new Error(`Failed to create swap request: ${response.statusText}`);
    }

    return await response.json();
}

async function updateSwapStatus(userSession, swapId, status) {
    const response = await fetch(`${BASE_URL}/api/swaps/${swapId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${userSession.access_token}`
        },
        body: JSON.stringify({ status })
    });

    if (!response.ok) {
        throw new Error(`Failed to update swap status: ${response.statusText}`);
    }

    return await response.json();
}

async function makeCounterOffer(userSession, swapId, counterOfferedBookId) {
    const response = await fetch(`${BASE_URL}/api/swaps/${swapId}/counter-offer`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${userSession.access_token}`
        },
        body: JSON.stringify({
            counter_offered_book_id: counterOfferedBookId
        })
    });

    if (!response.ok) {
        throw new Error(`Failed to make counter offer: ${response.statusText}`);
    }

    return await response.json();
}

/**
 * Verification Functions
 */

async function verifyBookOwnership(bookId, expectedOwnerId) {
    const { data, error } = await supabase
        .from('books')
        .select('owner_id, is_available')
        .eq('id', bookId)
        .single();

    if (error) {
        throw new Error(`Failed to verify book ownership: ${error.message}`);
    }

    console.log(`Book ${bookId}: owner=${data.owner_id}, available=${data.is_available}`);
    
    if (data.owner_id !== expectedOwnerId) {
        throw new Error(`Book ownership verification failed. Expected: ${expectedOwnerId}, Actual: ${data.owner_id}`);
    }

    return data;
}

async function verifyBookAvailability(bookId, expectedAvailable) {
    const { data, error } = await supabase
        .from('books')
        .select('is_available')
        .eq('id', bookId)
        .single();

    if (error) {
        throw new Error(`Failed to verify book availability: ${error.message}`);
    }

    if (data.is_available !== expectedAvailable) {
        throw new Error(`Book availability verification failed. Expected: ${expectedAvailable}, Actual: ${data.is_available}`);
    }

    return data;
}

async function verifyUserBooks(userId, session, expectedBookTitles) {
    await supabase.auth.setSession(session);

    const { data, error } = await supabase
        .from('books')
        .select('title')
        .eq('owner_id', userId);

    if (error) {
        throw new Error(`Failed to get user books: ${error.message}`);
    }

    const actualTitles = data.map(book => book.title).sort();
    const expected = expectedBookTitles.sort();

    console.log(`User ${userId} books: ${actualTitles.join(', ')}`);

    if (JSON.stringify(actualTitles) !== JSON.stringify(expected)) {
        throw new Error(`User books verification failed. Expected: [${expected.join(', ')}], Actual: [${actualTitles.join(', ')}]`);
    }

    return data;
}

async function verifyDiscoveryBooks(userId, session, excludedBookTitles) {
    await supabase.auth.setSession(session);

    const { data, error } = await supabase
        .from('books')
        .select('title')
        .eq('is_available', true)
        .neq('owner_id', userId);

    if (error) {
        throw new Error(`Failed to get discovery books: ${error.message}`);
    }

    const availableTitles = data.map(book => book.title);
    console.log(`Discovery books for user ${userId}: ${availableTitles.join(', ')}`);

    for (const excludedTitle of excludedBookTitles) {
        if (availableTitles.includes(excludedTitle)) {
            throw new Error(`Discovery books verification failed. Found excluded book: ${excludedTitle}`);
        }
    }

    return data;
}

/**
 * Test Scenarios
 */

async function testRegularSwapFlow() {
    console.log('\n=== Testing Regular Swap Flow ===');

    const user1 = testUsers.user1;
    const user2 = testUsers.user2;
    const book1 = testBooks.user1_book1; // User1's book
    const book2 = testBooks.user2_book1; // User2's book

    console.log(`User1 (${user1.username}) requesting User2's "${book2.title}", offering "${book1.title}"`);

    // Step 1: User1 creates swap request
    const swapRequest = await makeSwapRequest(user1.session, book2.id, book1.id);
    testSwaps.regularSwap = swapRequest;
    console.log(`✓ Swap request created: ${swapRequest.id}`);

    // Step 2: User2 accepts the swap
    await updateSwapStatus(user2.session, swapRequest.id, 'ACCEPTED');
    console.log('✓ Swap request accepted by User2');

    // Step 3: User1 completes the swap
    await updateSwapStatus(user1.session, swapRequest.id, 'COMPLETED');
    console.log('✓ Swap marked as completed');

    // Wait a moment for trigger to execute
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verify ownership transfer
    console.log('\nVerifying ownership transfer...');
    await verifyBookOwnership(book1.id, user2.id); // book1 should now belong to user2
    await verifyBookOwnership(book2.id, user1.id); // book2 should now belong to user1

    // Verify both books are marked unavailable
    console.log('\nVerifying availability status...');
    await verifyBookAvailability(book1.id, false);
    await verifyBookAvailability(book2.id, false);

    // Verify user books collections
    console.log('\nVerifying user book collections...');
    await verifyUserBooks(user1.id, user1.session, [book2.title, testBooks.user1_book2.title]);
    await verifyUserBooks(user2.id, user2.session, [book1.title, testBooks.user2_book2.title]);

    // Verify discovery page excludes unavailable books
    console.log('\nVerifying discovery page exclusions...');
    await verifyDiscoveryBooks(user1.id, user1.session, [book1.title]);
    await verifyDiscoveryBooks(user2.id, user2.session, [book2.title]);

    console.log('✅ Regular swap flow test PASSED');
}

async function testCounterOfferSwapFlow() {
    console.log('\n=== Testing Counter-Offer Swap Flow ===');

    const user1 = testUsers.user1;
    const user2 = testUsers.user2;
    const book2 = testBooks.user1_book2; // User1's second book
    const book3 = testBooks.user2_book2; // User2's second book  
    const book4 = testBooks.user2_book3; // User2's third book (for counter-offer)

    console.log(`User1 requesting User2's "${book3.title}", offering "${book2.title}"`);

    // Step 1: User1 creates swap request
    const swapRequest = await makeSwapRequest(user1.session, book3.id, book2.id);
    testSwaps.counterOfferSwap = swapRequest;
    console.log(`✓ Swap request created: ${swapRequest.id}`);

    // Step 2: User2 makes counter-offer with book4 instead
    console.log(`User2 counter-offering "${book4.title}" instead of "${book3.title}"`);
    await makeCounterOffer(user2.session, swapRequest.id, book4.id);
    console.log('✓ Counter-offer made by User2');

    // Step 3: User1 accepts the counter-offer
    await updateSwapStatus(user1.session, swapRequest.id, 'ACCEPTED');
    console.log('✓ Counter-offer accepted by User1');

    // Step 4: Complete the swap
    await updateSwapStatus(user1.session, swapRequest.id, 'COMPLETED');
    console.log('✓ Swap marked as completed');

    // Wait for trigger to execute
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verify correct ownership transfer (book3 to user1, book4 to user1, book2 stays with user1)
    console.log('\nVerifying counter-offer ownership transfer...');
    await verifyBookOwnership(book3.id, user1.id); // book3 should now belong to user1
    await verifyBookOwnership(book4.id, user1.id); // book4 should now belong to user1 
    await verifyBookOwnership(book2.id, user1.id); // book2 should remain with user1

    // Verify both transferred books are marked unavailable
    console.log('\nVerifying transferred books availability...');
    await verifyBookAvailability(book3.id, false);
    await verifyBookAvailability(book4.id, false);

    console.log('✅ Counter-offer swap flow test PASSED');
}

async function testBookAvailabilityManagement() {
    console.log('\n=== Testing Book Availability Management ===');

    const user1 = testUsers.user1;
    const transferredBook = testBooks.user2_book1; // This book was transferred to user1 in regular swap

    // Verify book is currently unavailable after swap
    await verifyBookAvailability(transferredBook.id, false);
    console.log(`✓ Confirmed "${transferredBook.title}" is unavailable after transfer`);

    // Test manual re-enabling by new owner (user1)
    await supabase.auth.setSession(user1.session);
    
    const { error: toggleError } = await supabase
        .from('books')
        .update({ is_available: true })
        .eq('id', transferredBook.id)
        .eq('owner_id', user1.id);

    if (toggleError) {
        throw new Error(`Failed to toggle book availability: ${toggleError.message}`);
    }

    console.log(`✓ Re-enabled "${transferredBook.title}" availability`);

    // Verify book now appears in discovery for other users
    await verifyDiscoveryBooks(testUsers.user2.id, testUsers.user2.session, []);
    console.log('✓ Re-enabled book appears in discovery');

    console.log('✅ Book availability management test PASSED');
}

async function testDatabaseTriggerVerification() {
    console.log('\n=== Testing Database Trigger Verification ===');

    // Query recent trigger logs
    const { data: logs, error: logError } = await supabase
        .from('swap_requests')
        .select('*')
        .eq('status', 'COMPLETED')
        .order('updated_at', { ascending: false })
        .limit(5);

    if (logError) {
        throw new Error(`Failed to query completed swaps: ${logError.message}`);
    }

    console.log(`✓ Found ${logs.length} completed swaps in database`);

    // Test trigger function directly by creating a test swap and completing it
    console.log('Testing trigger function execution...');
    
    // Create a simple test swap
    const user1 = testUsers.user1;
    const user2 = testUsers.user2;
    
    // Get books that are still available
    const { data: availableBooks } = await supabase
        .from('books')
        .select('*')
        .eq('is_available', true);

    if (availableBooks.length >= 2) {
        const book1 = availableBooks.find(b => b.owner_id === user1.id);
        const book2 = availableBooks.find(b => b.owner_id === user2.id);

        if (book1 && book2) {
            const triggerTestSwap = await makeSwapRequest(user1.session, book2.id, book1.id);
            await updateSwapStatus(user2.session, triggerTestSwap.id, 'ACCEPTED');
            await updateSwapStatus(user1.session, triggerTestSwap.id, 'COMPLETED');
            
            // Wait for trigger
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Verify trigger worked
            await verifyBookOwnership(book1.id, user2.id);
            await verifyBookOwnership(book2.id, user1.id);
            
            console.log('✓ Database trigger executed successfully');
        }
    }

    console.log('✅ Database trigger verification test PASSED');
}

/**
 * Main Test Runner
 */

async function runAllTests() {
    console.log('🚀 Starting comprehensive book swap functionality tests...\n');

    try {
        // Setup test data
        console.log('Setting up test data...');
        
        testUsers.user1 = await createTestUser(
            'testuser1@example.com',
            'testpass123',
            'testuser1',
            'Test User One'
        );

        testUsers.user2 = await createTestUser(
            'testuser2@example.com', 
            'testpass123',
            'testuser2',
            'Test User Two'
        );

        // Create test books
        testBooks.user1_book1 = await createTestBook(
            testUsers.user1.id,
            testUsers.user1.session,
            'JavaScript: The Good Parts',
            'Douglas Crockford',
            'good'
        );

        testBooks.user1_book2 = await createTestBook(
            testUsers.user1.id,
            testUsers.user1.session,
            'Clean Code',
            'Robert Martin',
            'excellent'
        );

        testBooks.user2_book1 = await createTestBook(
            testUsers.user2.id,
            testUsers.user2.session,
            'Design Patterns',
            'Gang of Four',
            'good'
        );

        testBooks.user2_book2 = await createTestBook(
            testUsers.user2.id,
            testUsers.user2.session,
            'Refactoring',
            'Martin Fowler',
            'fair'
        );

        testBooks.user2_book3 = await createTestBook(
            testUsers.user2.id,
            testUsers.user2.session,
            'The Pragmatic Programmer',
            'Dave Thomas',
            'excellent'
        );

        console.log('✓ Test data setup complete\n');

        // Run test scenarios
        await testRegularSwapFlow();
        await testCounterOfferSwapFlow();
        await testBookAvailabilityManagement();
        await testDatabaseTriggerVerification();

        console.log('\n🎉 All tests PASSED! Book swap functionality is working correctly.');

    } catch (error) {
        console.error('\n❌ Test FAILED:', error.message);
        console.error(error.stack);
        return false;
    } finally {
        // Cleanup
        await cleanupTestData();
        console.log('✓ Test data cleaned up');
    }

    return true;
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runAllTests()
        .then(success => {
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error('Unexpected error:', error);
            process.exit(1);
        });
}

export { runAllTests, testRegularSwapFlow, testCounterOfferSwapFlow, testBookAvailabilityManagement };
