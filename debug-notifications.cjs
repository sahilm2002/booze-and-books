require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugNotifications() {
    console.log('🔍 Debugging notifications and chat messages...\n');
    
    try {
        // Check recent notifications
        console.log('📋 Recent notifications (last 10):');
        const { data: notifications, error: notifError } = await supabase
            .from('notifications')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10);
            
        if (notifError) {
            console.error('Error fetching notifications:', notifError);
        } else {
            notifications.forEach((notif, i) => {
                console.log(`${i + 1}. [${notif.message_type}] ${notif.message || 'No message'}`);
                console.log(`   From: ${notif.sender_id || 'System'} → To: ${notif.recipient_id || notif.user_id}`);
                console.log(`   Created: ${notif.created_at}`);
                console.log(`   Read: ${notif.is_read ? 'Yes' : 'No'}`);
                console.log('');
            });
        }
        
        // Check recent swap requests
        console.log('📚 Recent swap requests (last 5):');
        const { data: swaps, error: swapError } = await supabase
            .from('swap_requests')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(5);
            
        if (swapError) {
            console.error('Error fetching swap requests:', swapError);
        } else {
            swaps.forEach((swap, i) => {
                console.log(`${i + 1}. Swap ID: ${swap.id}`);
                console.log(`   Book: ${swap.book_id} | Requester: ${swap.requester_id} → Owner: ${swap.owner_id}`);
                console.log(`   Status: ${swap.status} | Created: ${swap.created_at}`);
                console.log('');
            });
        }
        
        // Check profiles for context
        console.log('👥 User profiles:');
        const { data: profiles, error: profileError } = await supabase
            .from('profiles')
            .select('id, username, full_name')
            .limit(10);
            
        if (profileError) {
            console.error('Error fetching profiles:', profileError);
        } else {
            profiles.forEach((profile, i) => {
                console.log(`${i + 1}. ${profile.username} (${profile.full_name || 'No name'}) - ID: ${profile.id}`);
            });
        }
        
    } catch (error) {
        console.error('Debug error:', error);
    }
}

debugNotifications().catch(console.error);
