-- Add SQL function to efficiently get unread message counts by conversation
-- This optimizes the N+1 query problem in chat conversations

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
        AND n.message_type = 'chat_message'
    GROUP BY n.conversation_id;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_unread_counts_by_conversation(text[], uuid) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION get_unread_counts_by_conversation(text[], uuid) IS 
'Efficiently retrieves unread message counts for multiple conversations in a single query, preventing N+1 query problems in chat systems';
