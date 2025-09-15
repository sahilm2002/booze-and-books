# Claude Code Rules and Preferences

## User Environment
- **Operating System**: macOS
- **Platform**: MacBook

## Development Preferences
- Never suggest Windows keyboard shortcuts (like F12)
- Use macOS equivalents:
  - Developer Tools: `Cmd+Option+I` (not F12)
  - Refresh: `Cmd+R` (not F5)
  - Hard Refresh: `Cmd+Shift+R` (not Ctrl+F5)
  - Find: `Cmd+F` (not Ctrl+F)

## Git Workflow Rules
- **NEVER commit changes directly to main branch**
- **ALWAYS ask the user which branch to commit to before making any commits**
- User manages branching strategy - wait for explicit instructions
- Do not assume branch names or merge strategies

## Project Context
- This is a SvelteKit + Supabase book swapping application
- Database triggers and notifications have been implemented with migration 021
- User authentication issues with UUID format have been addressed

## Database and SQL Preferences
- **ALWAYS provide complete SQL statements directly in the response**
- When creating database migrations or fixes, include the full SQL code in the chat
- Do NOT just reference migration file paths - the user wants to copy SQL immediately
- Include SQL in code blocks for easy copying to Supabase Dashboard SQL Editor
- **ALWAYS provide full SQL file contents when user requests SQL files for manual execution**
- User prefers complete copy-paste ready SQL blocks over file path references

## Current Issues Tracking
- Discovery page UUID errors (resolved but still showing in logs)
- Swap functionality debugging in progress
- "My Requests" tab functionality investigation