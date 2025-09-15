# Database Management

This folder contains all database-related files for the Score Squad application.

## Folder Structure

```
supabase/
├── config.toml           # Supabase configuration
├── migrations/           # SQL migration files
├── seed.sql             # Sample data for development
└── README.md           # This file
```

## Migration Files Naming Convention

Migration files follow the format: `YYYYMMDDHHMMSS_description.sql`

Example: `20240115000001_initial_schema.sql`

- `YYYYMMDD` - Date (Year, Month, Day)
- `HHMMSS` - Time (Hour, Minute, Second)
- `description` - Brief description of the migration

## Available Commands

### Database Management
```bash
# Start local Supabase instance
npm run db:start

# Stop local Supabase instance
npm run db:stop

# Check database status
npm run db:status

# Reset database (WARNING: This will delete all data)
npm run db:reset

# Apply all pending migrations
npm run db:migrate

# Seed database with sample data
npm run db:seed

# Link to remote Supabase project
npm run db:link

# Generate TypeScript types from database schema
npm run db:generate-types

# Create a new migration file
npm run db:new-migration "migration_name"
```

### Typical Workflow

1. **First time setup:**
   ```bash
   npm run db:start
   npm run db:migrate
   npm run db:seed
   ```

2. **Creating new migrations:**
   ```bash
   npm run db:new-migration "add_new_table"
   # Edit the generated file in supabase/migrations/
   npm run db:migrate
   ```

3. **Generate types after schema changes:**
   ```bash
   npm run db:generate-types
   ```

## Current Schema

### Tables:
- `profiles` - User profiles (extends auth.users)
- `games` - Available games
- `game_sessions` - Game sessions/matches
- `game_session_participants` - Players in game sessions
- `scores` - Individual scores for each player in a session

### Features:
- Row Level Security (RLS) enabled on all tables
- Automatic `updated_at` timestamp triggers
- User profile auto-creation on registration
- Proper foreign key relationships

## Environment Variables

Make sure your `.env` file contains:
```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Notes

- All migrations are version-controlled
- Local development uses Docker containers
- Production migrations are applied via Supabase CLI
- Always test migrations locally before applying to production