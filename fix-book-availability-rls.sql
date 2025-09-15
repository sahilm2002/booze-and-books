-- Fix RLS issue preventing book availability updates during swap creation
-- Create a function that can bypass RLS to update book availability

-- Create function to update book availability (bypasses RLS)
CREATE OR REPLACE FUNCTION update_book_availability(
    p_book_id UUID,
