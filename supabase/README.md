# Supabase Configuration for Angular Checkers Master

## Setup Instructions

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the project to be fully initialized

### 2. Run the Database Schema

1. Go to **SQL Editor** in your Supabase dashboard
2. Copy and paste the contents of `supabase/schema.sql`
3. Run the SQL to create all tables, indexes, and policies

### 3. Configure Environment Variables

Update the environment files with your Supabase credentials:

**src/environments/environment.ts** (development):
```typescript
export const environment = {
  production: false,
  wsUrl: 'http://localhost:3000',
  supabase: {
    url: 'https://atmandnlqyyjaofezyig.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0bWFuZG5scXl5amFvZmV6eWlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2Nzc4OTUsImV4cCI6MjA4NjI1Mzg5NX0.MHmN5m1rqJvSnMHda9kYplXXnA7KsJBJBgnyptrpq1A',
  },
};
```

**src/environments/environment.prod.ts** (production):
```typescript
export const environment = {
  production: true,
  wsUrl: '',
  supabase: {
    url: 'https://YOUR_PROJECT_ID.supabase.co',
    anonKey: 'YOUR_ANON_KEY',
  },
};
```

You can find these values in your Supabase dashboard under **Settings > API**.

### 4. Configure Authentication Providers (Optional)

To enable OAuth providers (Google, GitHub, Discord):

1. Go to **Authentication > Providers** in Supabase
2. Enable and configure each provider with their respective OAuth credentials
3. Set the redirect URL to: `https://YOUR_DOMAIN/profile`

## Database Schema

### Tables

#### `user_profiles`
Stores user profile information including:
- Username and display name
- Avatar URL
- ELO rating
- Game statistics (wins, losses, draws)
- Win streak tracking

#### `game_history`
Stores completed games including:
- Player IDs and names
- Winner and reason
- Game variant
- Total moves and duration
- Full move history (JSON)
- Material history (JSON)
- Rating changes

### Views

#### `global_stats`
Aggregated statistics view including:
- Total games played
- Total players
- Average game duration
- Win percentages by color

## Features

### Online Mode (Authenticated)
When users are logged in with Supabase:
- Profiles are synced across devices
- Game history is stored in the cloud
- Leaderboard shows all registered players
- ELO ratings are globally tracked

### Offline Mode (Local)
When users are not authenticated:
- Profiles are stored in localStorage
- Game history is local only
- Leaderboard is local only
- Full offline functionality maintained

## Security

Row Level Security (RLS) is enabled on all tables:
- Users can view all profiles and games
- Users can only update their own profile
- Only authenticated users can create games

