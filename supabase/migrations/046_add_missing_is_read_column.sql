-- Add the missing is_read column to notifications table
-- The column should exist from migration 007 but appears to be missing

-- First check if the column exists, if not add it
DO $$
BEGIN
    -- Check if is_read column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications' 
        AND column_name = 'is_read'
        AND table_schema = 'public'
    ) THEN
        -- Add the missing is_read column
        ALTER TABLE notifications ADD COLUMN is_read BOOLEAN DEFAULT false NOT NULL;
        
        -- Create index for performance
        CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
        CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read);
        
        RAISE NOTICE 'Added missing is_read column to notifications table';
    ELSE
        RAISE NOTICE 'is_read column already exists in notifications table';
    END IF;
END $$;

-- Ensure proper permissions for updating notifications
GRANT UPDATE ON notifications TO authenticated;

-- Ensure the RLS policy allows users to update their own notifications
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
CREATE POLICY "Users can update their own notifications" ON notifications
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Verify the column now exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications' 
        AND column_name = 'is_read'
        AND table_schema = 'public'
    ) THEN
        RAISE EXCEPTION 'Failed to add is_read column to notifications table';
    END IF;
END $$;

SELECT 'is_read column added successfully to notifications table' as status;
