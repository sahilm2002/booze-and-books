import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function findLostWorld() {
    try {
        // Search for "Lost World" book
        console.log('Searching for "Lost World" book...');
        
        const { data: books, error: bookError } = await supabase
            .from('books')
            .select(`
                id,
                title,
                authors,
                is_available,
                owner_id,
                created_at
            `)
            .ilike('title', '%Lost World%');

        if (bookError) {
            console.error('Error searching books:', bookError);
            return;
        }

        if (!books || books.length === 0) {
            console.log('No books found with "Lost World" in the title');
            return;
        }

        console.log('Found books:', books);

        // For each book, get owner information
        for (const book of books) {
            console.log(`\n--- Book: ${book.title} ---`);
            console.log(`Authors: ${book.authors}`);
            console.log(`Available: ${book.is_available}`);
            console.log(`Created: ${book.created_at}`);

            // Get owner profile
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('username, full_name, email')
                .eq('id', book.owner_id)
                .single();

            if (profileError) {
                console.error('Error getting owner profile:', profileError);
            } else {
                console.log(`Owner: ${profile.full_name || profile.username} (${profile.email})`);
            }

            // Check if this book is involved in any swap requests
            const { data: swapRequests, error: swapError } = await supabase
                .from('swap_requests')
                .select(`
                    id,
                    status,
                    created_at,
                    requester_id,
                    offered_book_id
                `)
                .eq('book_id', book.id);

            if (swapError) {
                console.error('Error getting swap requests:', swapError);
            } else if (swapRequests && swapRequests.length > 0) {
                console.log(`Swap requests: ${swapRequests.length}`);
                swapRequests.forEach(req => {
                    console.log(`  - Status: ${req.status}, Created: ${req.created_at}`);
                });
            } else {
                console.log('No swap requests for this book');
            }
        }

    } catch (error) {
        console.error('Unexpected error:', error);
    }
}

findLostWorld();