-- SQL function to efficiently get unread message counts by conversation
-- This should be added as a Supabase migration for optimal performance

CREATE OR REPLACE FUNCTION get_unread_counts_by_conversation(
    conversation_ids text[],
    user_id uuid
)
RETURNS TABLE(conversation_id text, unread_count bigint)
LANGUAGE sql
STABLE
AS $$
    SELECT 
        n.conversation_id,
        COUNT(*) as unread_count
    FROM notifications n
    WHERE 
        n.conversation_id = ANY(conversation_ids)
        AND n.recipient_id = user_id
        AND n.is_read = false
        AND n.message_type = 'CHAT_MESSAGE'
    GROUP BY n.conversation_id;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_unread_counts_by_conversation(text[], uuid) TO authenticated;

-- Example usage:
-- SELECT * FROM get_unread_counts_by_conversation(
--     ARRAY['user1_user2', 'user1_user3'], 
--     'user-uuid-here'
-- );
