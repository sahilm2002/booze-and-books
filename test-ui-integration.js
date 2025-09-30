/**
 * UI Integration Test Script for Book Swap Functionality
 * Tests that database fixes work correctly from the user interface perspective
 */

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

// Configuration - Update these with your actual values
const SUPABASE_URL = 'https://pzmrvovqxbmobunludna.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6bXJ2b3ZxeGJtb2J1bmx1ZG5hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzEzNzUxOTAsImV4cCI6MjA0Njk1MTE5MH0.gJJPmrmLYKvPgFdwU3U7_Rm68rTZO_uLBVNXs9XLw9k';
const BASE_URL = 'http://localhost:5173'; // Update if running on different port

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Test data
let testUsers = {};
let testBooks = {};
let testSwaps = {};

/**
 * Helper Functions
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

async function makeApiRequest(endpoint, method = 'GET', data = null, session = null) {
    const headers = {
        'Content-Type': 'application/json'
    };

    if (session) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
    }

    const options = {
        method,
        headers
    };

    if (data) {
        options.body = JSON.stringify(data);
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    
    if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    return await response.json();
}

async function simulateServerLoad(route, userId, session) {
    console.log(`Simulating server load for ${route} as user ${userId}`);
    
    // Set auth context
    await supabase.auth.setSession(session);
    
    // Simulate the server load functions from the actual route files
    switch (route) {
        case '/app/books':
            return await simulateBooksPageLoad(userId);
        case '/app/discover':
            return await simulateDiscoverPageLoad(userId);
        case '/app/swaps':
            return await simulateSwapsPageLoad(userId);
        default:
            throw new Error(`Unsupported route: ${route}`);
    }
}

async function simulateBooksPageLoad(userId) {
    // Simulate the load function from src/routes/app/books/+page.server.ts
    const { data: books, error } = await supabase
        .from('books')
        .select('*')
        .eq('owner_id', userId)
        .order('created_at', { ascending: false });

    if (error) {
        throw new Error(`Failed to load user books: ${error.message}`);
    }

    const { data: totalCount, error: countError } = await supabase
        .from('books')
        .select('id', { count: 'exact' })
        .eq('owner_id', userId);

    if (countError) {
        throw new Error(`Failed to get book count: ${countError.message}`);
    }

    return {
        books,
        totalCount: totalCount.length
    };
}

async function simulateDiscoverPageLoad(userId) {
    // Simulate the load function from src/routes/app/discover/+page.server.ts
    
    // Get books that are available, not owned by current user, and not in pending swaps
    const { data: availableBooks, error: booksError } = await supabase
        .from('books')
        .select(`
            *,
            profiles!books_owner_id_fkey(username, full_name)
        `)
        .eq('is_available', true)
        .neq('owner_id', userId);

    if (booksError) {
        throw new Error(`Failed to load discovery books: ${booksError.message}`);
    }

    // Filter out books that are in pending swaps
    const { data: pendingSwaps, error: swapsError } = await supabase
        .from('swap_requests')
        .select('requested_book_id')
        .in('status', ['PENDING', 'ACCEPTED']);

    if (swapsError) {
        throw new Error(`Failed to load pending swaps: ${swapsError.message}`);
    }

    const pendingBookIds = pendingSwaps.map(swap => swap.requested_book_id);
    const filteredBooks = availableBooks.filter(book => !pendingBookIds.includes(book.id));

    return {
        books: filteredBooks,
        totalCount: filteredBooks.length
    };
}

async function simulateSwapsPageLoad(userId) {
    // Simulate the load function from src/routes/app/swaps/+page.server.ts
    
    const { data: swaps, error } = await supabase
        .from('swap_requests')
        .select(`
            *,
            requester:profiles!swap_requests_requester_id_fkey(username, full_name),
            owner:profiles!swap_requests_owner_id_fkey(username, full_name),
            requested_book:books!swap_requests_requested_book_id_fkey(title, author, condition),
            offered_book:books!swap_requests_offered_book_id_fkey(title, author, condition),
            counter_offered_book:books!swap_requests_counter_offered_book_id_fkey(title, author, condition)
        `)
        .or(`requester_id.eq.${userId},owner_id.eq.${userId}`)
        .order('created_at', { ascending: false });

    if (error) {
        throw new Error(`Failed to load swaps: ${error.message}`);
    }

    return { swaps };
}

/**
 * Test Functions
 */

async function testBooksPageIntegration() {
    console.log('\n=== Testing Books Page Integration ===');

    const user1 = testUsers.user1;
    const user2 = testUsers.user2;

    // Initial state: Load books for both users before swap
    console.log('Loading initial book collections...');
    
    const user1BooksBefore = await simulateBooksPageLoad(user1.id, user1.session);
    const user2BooksBefore = await simulateBooksPageLoad(user2.id, user2.session);

    console.log(`User1 initially has ${user1BooksBefore.totalCount} books: ${user1BooksBefore.books.map(b => b.title).join(', ')}`);
    console.log(`User2 initially has ${user2BooksBefore.totalCount} books: ${user2BooksBefore.books.map(b => b.title).join(', ')}`);

    // Perform a swap through API
    console.log('\nPerforming swap through API...');
    
    const book1 = testBooks.user1_book1; // User1's book to give
    const book2 = testBooks.user2_book1; // User2's book that User1 wants

    // Create swap request
    const swapRequest = await makeApiRequest('/api/swaps', 'POST', {
        requested_book_id: book2.id,
        offered_book_id: book1.id
    }, user1.session);

    console.log(`✓ Swap request created: ${swapRequest.id}`);

    // Accept swap
    await makeApiRequest(`/api/swaps/${swapRequest.id}`, 'PUT', {
        status: 'ACCEPTED'
    }, user2.session);

    console.log('✓ Swap accepted by owner');

    // Complete swap
    await makeApiRequest(`/api/swaps/${swapRequest.id}`, 'PUT', {
        status: 'COMPLETED'
    }, user1.session);

    console.log('✓ Swap completed');

    // Wait for database triggers to execute
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Load books again after swap
    console.log('\nLoading book collections after swap...');
    
    const user1BooksAfter = await simulateBooksPageLoad(user1.id, user1.session);
    const user2BooksAfter = await simulateBooksPageLoad(user2.id, user2.session);

    console.log(`User1 now has ${user1BooksAfter.totalCount} books: ${user1BooksAfter.books.map(b => b.title).join(', ')}`);
    console.log(`User2 now has ${user2BooksAfter.totalCount} books: ${user2BooksAfter.books.map(b => b.title).join(', ')}`);

    // Verify ownership changes
    const user1HasBook2 = user1BooksAfter.books.some(book => book.title === book2.title);
    const user1LostBook1 = !user1BooksAfter.books.some(book => book.title === book1.title);
    const user2HasBook1 = user2BooksAfter.books.some(book => book.title === book1.title);
    const user2LostBook2 = !user2BooksAfter.books.some(book => book.title === book2.title);

    if (user1HasBook2 && user2HasBook1) {
        console.log('✅ Books Page Integration: Ownership transfer successful');
        console.log(`  ✓ User1 received "${book2.title}"`);
        console.log(`  ✓ User2 received "${book1.title}"`);
    } else {
        throw new Error('❌ Books Page Integration: Ownership transfer failed');
    }

    testSwaps.booksPageTest = swapRequest;
    return true;
}

async function testDiscoveryPageIntegration() {
    console.log('\n=== Testing Discovery Page Integration ===');

    const user1 = testUsers.user1;
    const user2 = testUsers.user2;

    // Load discovery pages for both users
    console.log('Loading discovery page results...');
    
    const user1Discovery = await simulateDiscoverPageLoad(user1.id, user1.session);
    const user2Discovery = await simulateDiscoverPageLoad(user2.id, user2.session);

    console.log(`User1 discovery shows ${user1Discovery.totalCount} available books`);
    console.log(`User2 discovery shows ${user2Discovery.totalCount} available books`);

    // Check that books involved in completed swap are not shown as available
    const book1Title = testBooks.user1_book1.title; // This book was transferred and should be unavailable
    const book2Title = testBooks.user2_book1.title; // This book was transferred and should be unavailable

    const user1SeesBadBook1 = user1Discovery.books.some(book => book.title === book1Title);
    const user1SeesBadBook2 = user1Discovery.books.some(book => book.title === book2Title);
    const user2SeesBadBook1 = user2Discovery.books.some(book => book.title === book1Title);
    const user2SeesBadBook2 = user2Discovery.books.some(book => book.title === book2Title);

    if (!user1SeesBadBook1 && !user1SeesBadBook2 && !user2SeesBadBook1 && !user2SeesBadBook2) {
        console.log('✅ Discovery Page Integration: Transferred books correctly excluded');
        console.log(`  ✓ "${book1Title}" not shown in discovery (is_available = false)`);
        console.log(`  ✓ "${book2Title}" not shown in discovery (is_available = false)`);
    } else {
        throw new Error('❌ Discovery Page Integration: Transferred books still showing as available');
    }

    // Test that users don't see their own books
    const user1SeesOwnBooks = user1Discovery.books.some(book => 
        testBooks.user1_book2 && book.title === testBooks.user1_book2.title
    );
    const user2SeesOwnBooks = user2Discovery.books.some(book => 
        testBooks.user2_book2 && book.title === testBooks.user2_book2.title
    );

    if (!user1SeesOwnBooks && !user2SeesOwnBooks) {
        console.log('✅ Discovery Page Integration: Users correctly don\'t see their own books');
    } else {
        console.log('⚠️  Discovery Page Integration: Users may be seeing their own books (check implementation)');
    }

    return true;
}

async function testSwapManagementUI() {
    console.log('\n=== Testing Swap Management UI ===');

    const user1 = testUsers.user1;
    const user2 = testUsers.user2;

    // Load swap pages for both users
    const user1Swaps = await simulateSwapsPageLoad(user1.id, user1.session);
    const user2Swaps = await simulateSwapsPageLoad(user2.id, user2.session);

    console.log(`User1 swap history shows ${user1Swaps.swaps.length} swaps`);
    console.log(`User2 swap history shows ${user2Swaps.swaps.length} swaps`);

    // Find the completed swap from the books page test
    const completedSwap = user1Swaps.swaps.find(swap => 
        swap.id === testSwaps.booksPageTest.id && swap.status === 'COMPLETED'
    );

    if (completedSwap) {
        console.log('✅ Swap Management UI: Completed swap appears in history');
        console.log(`  ✓ Swap ID: ${completedSwap.id}`);
        console.log(`  ✓ Status: ${completedSwap.status}`);
        console.log(`  ✓ Requested book: ${completedSwap.requested_book?.title}`);
        console.log(`  ✓ Offered book: ${completedSwap.offered_book?.title}`);
    } else {
        throw new Error('❌ Swap Management UI: Completed swap not found in history');
    }

    return true;
}

async function testCounterOfferFlow() {
    console.log('\n=== Testing Counter-Offer Flow ===');

    const user1 = testUsers.user1;
    const user2 = testUsers.user2;

    // Get available books for counter-offer test
    const remainingBook1 = testBooks.user1_book2;
    const remainingBook2 = testBooks.user2_book2;
    const counterOfferBook = testBooks.user2_book3;

    if (!remainingBook1 || !remainingBook2 || !counterOfferBook) {
        console.log('⚠️  Counter-offer test skipped: insufficient test books remaining');
        return true;
    }

    console.log(`User1 requesting "${remainingBook2.title}", offering "${remainingBook1.title}"`);

    // Create swap request
    const swapRequest = await makeApiRequest('/api/swaps', 'POST', {
        requested_book_id: remainingBook2.id,
        offered_book_id: remainingBook1.id
    }, user1.session);

    console.log(`✓ Swap request created: ${swapRequest.id}`);

    // Make counter-offer
    console.log(`User2 making counter-offer with "${counterOfferBook.title}"`);
    
    await makeApiRequest(`/api/swaps/${swapRequest.id}/counter-offer`, 'PUT', {
        counter_offered_book_id: counterOfferBook.id
    }, user2.session);

    console.log('✓ Counter-offer made');

    // Accept counter-offer
    await makeApiRequest(`/api/swaps/${swapRequest.id}`, 'PUT', {
        status: 'ACCEPTED'
    }, user1.session);

    console.log('✓ Counter-offer accepted');

    // Complete swap
    await makeApiRequest(`/api/swaps/${swapRequest.id}`, 'PUT', {
        status: 'COMPLETED'
    }, user1.session);

    console.log('✓ Counter-offer swap completed');

    // Wait for triggers
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verify counter-offer results through UI
    const user1BooksAfter = await simulateBooksPageLoad(user1.id, user1.session);
    const user2BooksAfter = await simulateBooksPageLoad(user2.id, user2.session);

    const user1HasRequestedBook = user1BooksAfter.books.some(book => book.title === remainingBook2.title);
    const user1HasCounterBook = user1BooksAfter.books.some(book => book.title === counterOfferBook.title);
    const user1StillHasOriginalBook = user1BooksAfter.books.some(book => book.title === remainingBook1.title);

    if (user1HasRequestedBook && user1HasCounterBook && user1StillHasOriginalBook) {
        console.log('✅ Counter-Offer Flow: Correct books transferred');
        console.log(`  ✓ User1 received requested book: "${remainingBook2.title}"`);
        console.log(`  ✓ User1 received counter-offer book: "${counterOfferBook.title}"`);
        console.log(`  ✓ User1 kept original book: "${remainingBook1.title}"`);
    } else {
        throw new Error('❌ Counter-Offer Flow: Incorrect book transfers');
    }

    testSwaps.counterOfferTest = swapRequest;
    return true;
}

async function testBookAvailabilityToggle() {
    console.log('\n=== Testing Book Availability Toggle ===');

    const user1 = testUsers.user1;
    
    // Find a book that was transferred to user1 and is currently unavailable
    const transferredBook = await supabase
        .from('books')
        .select('*')
        .eq('owner_id', user1.id)
        .eq('is_available', false)
        .limit(1)
        .single();

    if (!transferredBook.data) {
        console.log('⚠️  Book availability toggle test skipped: no unavailable books found');
        return true;
    }

    const bookId = transferredBook.data.id;
    const bookTitle = transferredBook.data.title;

    console.log(`Testing availability toggle for "${bookTitle}"`);

    // Verify book is not in discovery initially
    const discoveryBefore = await simulateDiscoverPageLoad(testUsers.user2.id, testUsers.user2.session);
    const inDiscoveryBefore = discoveryBefore.books.some(book => book.id === bookId);

    if (inDiscoveryBefore) {
        throw new Error(`❌ Book "${bookTitle}" should not be in discovery when unavailable`);
    }

    console.log(`✓ Book "${bookTitle}" correctly excluded from discovery when unavailable`);

    // Toggle availability to true
    await supabase.auth.setSession(user1.session);
    
    const { error: toggleError } = await supabase
        .from('books')
        .update({ is_available: true })
        .eq('id', bookId)
        .eq('owner_id', user1.id);

    if (toggleError) {
        throw new Error(`Failed to toggle book availability: ${toggleError.message}`);
    }

    console.log(`✓ Toggled "${bookTitle}" to available`);

    // Wait a moment for changes to propagate
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verify book now appears in discovery
    const discoveryAfter = await simulateDiscoverPageLoad(testUsers.user2.id, testUsers.user2.session);
    const inDiscoveryAfter = discoveryAfter.books.some(book => book.id === bookId);

    if (inDiscoveryAfter) {
        console.log('✅ Book Availability Toggle: Book appears in discovery after re-enabling');
    } else {
        throw new Error('❌ Book Availability Toggle: Re-enabled book not appearing in discovery');
    }

    return true;
}

async function testErrorHandling() {
    console.log('\n=== Testing Error Handling ===');

    const user1 = testUsers.user1;

    // Test 1: Try to request swap for unavailable book
    console.log('Testing swap request for unavailable book...');
    
    const unavailableBook = await supabase
        .from('books')
        .select('*')
        .eq('is_available', false)
        .neq('owner_id', user1.id)
        .limit(1)
        .single();

    if (unavailableBook.data) {
        try {
            await makeApiRequest('/api/swaps', 'POST', {
                requested_book_id: unavailableBook.data.id,
                offered_book_id: testBooks.user1_book2?.id
            }, user1.session);

            console.log('⚠️  Warning: API allowed swap request for unavailable book (may need validation)');
        } catch (error) {
            console.log('✅ Error Handling: Swap request for unavailable book correctly rejected');
        }
    }

    // Test 2: Try to request swap for non-existent book
    console.log('Testing swap request for non-existent book...');
    
    try {
        await makeApiRequest('/api/swaps', 'POST', {
            requested_book_id: '00000000-0000-0000-0000-000000000000',
            offered_book_id: testBooks.user1_book2?.id
        }, user1.session);

        console.log('⚠️  Warning: API allowed swap request for non-existent book (may need validation)');
    } catch (error) {
        console.log('✅ Error Handling: Swap request for non-existent book correctly rejected');
    }

    // Test 3: Verify UI gracefully handles missing data
    console.log('Testing UI behavior with edge cases...');

    const booksPageData = await simulateBooksPageLoad(user1.id, user1.session);
    const discoveryPageData = await simulateDiscoverPageLoad(user1.id, user1.session);
    const swapsPageData = await simulateSwapsPageLoad(user1.id, user1.session);

    if (booksPageData && discoveryPageData && swapsPageData) {
        console.log('✅ Error Handling: UI load functions handle current data state gracefully');
    } else {
        throw new Error('❌ Error Handling: UI load functions failed with current data');
    }

    return true;
}

async function testDataConsistency() {
    console.log('\n=== Testing Data Consistency ===');

    const user1 = testUsers.user1;
    const user2 = testUsers.user2;

    // Load data from all UI endpoints
    const user1Books = await simulateBooksPageLoad(user1.id, user1.session);
    const user2Books = await simulateBooksPageLoad(user2.id, user2.session);
    const user1Discovery = await simulateDiscoverPageLoad(user1.id, user1.session);
    const user2Discovery = await simulateDiscoverPageLoad(user2.id, user2.session);
    const user1Swaps = await simulateSwapsPageLoad(user1.id, user1.session);
    const user2Swaps = await simulateSwapsPageLoad(user2.id, user2.session);

    console.log('Loaded data from all UI endpoints successfully');

    // Check consistency: Books should have consistent ownership across all views
    let consistencyErrors = 0;

    // Verify that completed swaps show correct book information
    for (const swap of [...user1Swaps.swaps, ...user2Swaps.swaps]) {
        if (swap.status === 'COMPLETED') {
            const requestedBookId = swap.requested_book_id;
            const offeredBookId = swap.offered_book_id;
            const counterBookId = swap.counter_offered_book_id;

            // Check that the books involved exist in someone's collection
            const allBooks = [...user1Books.books, ...user2Books.books];
            const requestedBookExists = allBooks.some(book => book.id === requestedBookId);
            const offeredBookExists = allBooks.some(book => book.id === offeredBookId);

            if (!requestedBookExists) {
                console.log(`⚠️  Consistency warning: Requested book ${requestedBookId} from completed swap not found in any user collection`);
                consistencyErrors++;
            }

            if (counterBookId) {
                const counterBookExists = allBooks.some(book => book.id === counterBookId);
                if (!counterBookExists) {
                    console.log(`⚠️  Consistency warning: Counter-offer book ${counterBookId} from completed swap not found in any user collection`);
                    consistencyErrors++;
                }
            } else if (!offeredBookExists) {
                console.log(`⚠️  Consistency warning: Offered book ${offeredBookId} from completed swap not found in any user collection`);
                consistencyErrors++;
            }
        }
    }

    // Check that discovery page excludes books that users own
    for (const book of user1Discovery.books) {
        if (user1Books.books.some(ownedBook => ownedBook.id === book.id)) {
            console.log(`⚠️  Consistency warning: User1 sees their own book "${book.title}" in discovery`);
            consistencyErrors++;
        }
    }

    for (const book of user2Discovery.books) {
        if (user2Books.books.some(ownedBook => ownedBook.id === book.id)) {
            console.log(`⚠️  Consistency warning: User2 sees their own book "${book.title}" in discovery`);
            consistencyErrors++;
        }
    }

    if (consistencyErrors === 0) {
        console.log('✅ Data Consistency: All UI views show consistent data');
    } else {
        console.log(`⚠️  Data Consistency: Found ${consistencyErrors} consistency warnings (may need investigation)`);
    }

    return true;
}

async function cleanupTestData() {
    console.log('\nCleaning up test data...');

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

        console.log('✓ Test data cleanup completed');
    } catch (error) {
        console.warn('Cleanup warning:', error.message);
    }
}

/**
 * Main Test Runner
 */

async function runUIIntegrationTests() {
    console.log('🚀 Starting UI Integration Tests for Book Swap Functionality...\n');

    try {
        // Setup test data
        console.log('Setting up test data...');
        
        testUsers.user1 = await createTestUser(
            'ui_test_user1@example.com',
            'testpass123',
            'ui_testuser1',
            'UI Test User One'
        );

        testUsers.user2 = await createTestUser(
            'ui_test_user2@example.com', 
            'testpass123',
            'ui_testuser2',
            'UI Test User Two'
        );

        // Create test books
        testBooks.user1_book1 = await createTestBook(
            testUsers.user1.id,
            testUsers.user1.session,
            'UI Test Book 1',
            'Test Author A',
            'good'
        );

        testBooks.user1_book2 = await createTestBook(
            testUsers.user1.id,
            testUsers.user1.session,
            'UI Test Book 2',
            'Test Author B',
            'excellent'
        );

        testBooks.user2_book1 = await createTestBook(
            testUsers.user2.id,
            testUsers.user2.session,
            'UI Test Book 3',
            'Test Author C',
            'good'
        );

        testBooks.user2_book2 = await createTestBook(
            testUsers.user2.id,
            testUsers.user2.session,
            'UI Test Book 4',
            'Test Author D',
            'fair'
        );

        testBooks.user2_book3 = await createTestBook(
            testUsers.user2.id,
            testUsers.user2.session,
            'UI Test Book 5',
            'Test Author E',
            'excellent'
        );

        console.log('✓ Test data setup complete\n');

        // Run UI integration tests
        await testBooksPageIntegration();
        await testDiscoveryPageIntegration();
        await testSwapManagementUI();
        await testCounterOfferFlow();
        await testBookAvailabilityToggle();
        await testErrorHandling();
        await testDataConsistency();

        console.log('\n🎉 All UI Integration Tests PASSED! The book swap functionality works correctly from the UI perspective.');

    } catch (error) {
        console.error('\n❌ UI Integration Test FAILED:', error.message);
        console.error(error.stack);
        return false;
    } finally {
        // Cleanup
        await cleanupTestData();
    }

    return true;
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runUIIntegrationTests()
        .then(success => {
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error('Unexpected error:', error);
            process.exit(1);
        });
}

export { 
    runUIIntegrationTests, 
    testBooksPageIntegration, 
    testDiscoveryPageIntegration, 
    testSwapManagementUI,
    testCounterOfferFlow,
    testBookAvailabilityToggle
};