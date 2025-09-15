# Daily Reminder Notification System

## Overview

The daily reminder system automatically sends notifications to users who have active swap requests that need attention. This helps keep users engaged and ensures swap requests don't get forgotten.

## Features

### 🔔 **Three Types of Daily Reminders**

1. **Pending Swap Requests** - Reminds users about swap requests they've made that are still waiting for responses
2. **Counter Offers** - Reminds users about counter offers they've received that need their response  
3. **Accepted Swaps** - Reminds users about accepted swaps that need to be marked as completed

### 🛡️ **Smart Deduplication**
- Users only receive one reminder per day (prevents spam)
- System checks for existing reminders before sending new ones
- Only sends reminders to users with actual pending actions

### 📊 **Comprehensive Tracking**
- Tracks reminder counts and swap request IDs
- Provides detailed statistics for monitoring
- Logs all reminder activities for debugging

## Implementation Details

### 🏗️ **Architecture Components**

1. **NotificationService** (`src/lib/services/notificationService.ts`)
   - Core service handling all reminder logic
   - Methods for sending individual and bulk reminders
   - Deduplication and user filtering

2. **Notification Types** (`src/lib/types/notification.ts`)
   - New enum values for daily reminder types
   - Structured data interfaces for reminder metadata

3. **API Endpoint** (`src/routes/api/notifications/daily-reminders/+server.ts`)
   - Secure endpoint for triggering daily reminders
   - Authentication via bearer token
   - Statistics and monitoring capabilities

### 🔧 **Key Methods**

```typescript
// Send daily reminders to all users with active swaps
await NotificationService.sendDailyReminders();

// Send reminder to specific user
await NotificationService.sendUserDailyReminder(userId);

// Check if user already received reminder today
const hasReceived = await NotificationService.hasReceivedReminderToday(userId);

// Get list of users who need reminders
const userIds = await NotificationService.getUsersNeedingReminders();
```

## Usage

### 🚀 **Manual Trigger (Development)**

```bash
# Test the daily reminder system
curl -X POST http://localhost:5173/api/notifications/daily-reminders \
  -H "Authorization: Bearer your-secret-token" \
  -H "Content-Type: application/json"
```

### ⏰ **Production Scheduling**

Set up a cron job or scheduler to call the API endpoint daily:

```bash
# Example cron job (daily at 9 AM)
0 9 * * * curl -X POST https://your-domain.com/api/notifications/daily-reminders \
  -H "Authorization: Bearer $DAILY_REMINDER_TOKEN" \
  -H "Content-Type: application/json"
```

### 🔍 **Monitoring**

```bash
# Get statistics about users needing reminders (GET request with Authorization header)
curl -X GET http://localhost:5173/api/notifications/daily-reminders \
  -H "Authorization: Bearer your-secret-token" \
  -H "Content-Type: application/json"
```

## Configuration

### 🔐 **Environment Variables**

Add to your `.env` file:

```bash
# Token for securing the daily reminder API endpoint
DAILY_REMINDER_TOKEN=your-secure-random-token-here
```

### 🛠️ **Deployment Options**

1. **Vercel Cron Jobs** - Use Vercel's built-in cron functionality
2. **GitHub Actions** - Schedule workflow to call the API
3. **External Cron Service** - Use services like cron-job.org
4. **Server Cron** - Traditional cron job on your server

## Database Schema

The system uses the existing `notifications` table with new notification types:

```sql
-- New notification types added
'daily_reminder_pending_swaps'
'daily_reminder_counter_offers' 
'daily_reminder_accepted_swaps'
```

Each reminder notification includes:
- `swap_count`: Number of relevant swaps
- `swap_request_ids`: Array of specific swap request IDs
- `reminder_type`: Type of reminder for categorization

## Testing

### 🧪 **Test Script**

A test script is provided (`test-daily-reminders.js`) that demonstrates:
- Getting users who need reminders
- Checking reminder status
- Sending individual reminders
- Preventing duplicate reminders

### 🔍 **Manual Testing**

1. Create some swap requests in different states (PENDING, COUNTER_OFFER, ACCEPTED)
2. Call the API endpoint to trigger reminders
3. Check the notifications table for new reminder notifications
4. Verify no duplicate reminders are sent on subsequent calls

## Security

### 🔒 **Authentication**
- API endpoint requires bearer token authentication
- Token should be kept secret and rotated regularly
- Different tokens can be used for different environments

### 🛡️ **Rate Limiting**
- Built-in deduplication prevents spam
- Consider adding additional rate limiting in production
- Monitor API usage for unusual patterns

## Monitoring & Logging

### 📊 **Metrics to Track**
- Number of users receiving daily reminders
- Types of reminders being sent most frequently
- API endpoint response times and success rates
- User engagement after receiving reminders

### 🔍 **Debugging**
- All reminder activities are logged to console
- API responses include detailed statistics
- Error handling with descriptive messages

## Future Enhancements

### 🚀 **Potential Improvements**
- Email notifications in addition to in-app notifications
- User preferences for reminder frequency
- Different reminder schedules for different reminder types
- Analytics dashboard for reminder effectiveness
- A/B testing for reminder message optimization

## Troubleshooting

### ❓ **Common Issues**

1. **No reminders being sent**
   - Check if users have active swaps in the correct states
   - Verify API authentication token
   - Check server logs for errors

2. **Duplicate reminders**
   - Verify deduplication logic is working
   - Check if multiple cron jobs are running
   - Ensure proper timezone handling

3. **API authentication failures**
   - Verify DAILY_REMINDER_TOKEN environment variable
   - Check bearer token format in requests
   - Ensure token matches between client and server

## Summary

The daily reminder system is a comprehensive solution for keeping users engaged with their swap requests. It's designed to be:

- **Reliable**: Robust error handling and deduplication
- **Scalable**: Efficient queries and batch processing  
- **Secure**: Token-based authentication
- **Monitorable**: Detailed logging and statistics
- **Flexible**: Easy to customize and extend

The system is now fully implemented and ready for production use! 🎉
