-- Restore proper business validation for swap requests
-- Migration 017 was too permissive and removed critical validation

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Allow authenticated users to create swap requests" ON swap_requests;

-- Recreate the proper INSERT policy with all business validation
CREATE POLICY "Users can create valid swap requests" ON swap_requests
    FOR INSERT WITH CHECK (
        -- Basic authentication
        auth.uid() IS NOT NULL
        AND auth.uid() = requester_id
        
        -- Ensure user is not requesting their own book
        AND requester_id != owner_id
        
        -- Ensure the requested book exists, is available, and not owned by requester
        AND EXISTS (
            SELECT 1 FROM books 
            WHERE books.id = book_id 
            AND books.is_available = true
            AND books.owner_id != auth.uid()
            AND books.owner_id = swap_requests.owner_id
        )
        
        -- If offered_book_id is provided, ensure it belongs to the requester and is available
        AND (
            offered_book_id IS NULL
            OR EXISTS (
                SELECT 1 FROM books 
                WHERE books.id = offered_book_id 
                AND books.owner_id = auth.uid()
                AND books.is_available = true
            )
        )
        
        -- Ensure offered book and requested book are different
        AND (offered_book_id IS NULL OR offered_book_id != book_id)
    );