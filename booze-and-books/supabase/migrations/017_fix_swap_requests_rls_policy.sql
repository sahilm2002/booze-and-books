-- Fix RLS policy for swap_requests table
-- The previous policy was too restrictive and causing insert failures

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can create swap requests" ON swap_requests;

-- Create a simpler, working policy for INSERT
CREATE POLICY "Allow authenticated users to create swap requests" ON swap_requests
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL
        AND auth.uid() = requester_id
    );

-- Ensure we have proper SELECT policy
DROP POLICY IF EXISTS "Users can view their own swap requests" ON swap_requests;
CREATE POLICY "Users can view their own swap requests" ON swap_requests
    FOR SELECT USING (
        auth.uid() = requester_id OR auth.uid() = owner_id
    );

-- Ensure we have proper UPDATE policy  
DROP POLICY IF EXISTS "Users can update swap request status" ON swap_requests;
CREATE POLICY "Users can update swap request status" ON swap_requests
    FOR UPDATE USING (
        auth.uid() = owner_id OR auth.uid() = requester_id
    )
    WITH CHECK (
        auth.uid() = owner_id OR auth.uid() = requester_id
    );