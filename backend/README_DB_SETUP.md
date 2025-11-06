# Database setup (Supabase Postgres)

1. Create a `.env` file in `backend/` with:

```
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@YOUR_PROJECT_HOST:5432/postgres
DB_SSL=true
```

- In Supabase, copy the Connection string (URI) from Database settings and paste into `DATABASE_URL`.
- Keep `DB_SSL=true` for Supabase.

2. Start the NestJS app; TypeORM will connect using the URL and auto-load entities.

Note: `synchronize: true` is enabled for development. Disable in production and use migrations.
