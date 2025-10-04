# Quick Start - Database Management

## 🚀 Common Commands

### Development Workflow

```bash
# Start development server (uses DATABASE_URL from .env)
npm run dev

# Create a new migration
npm run db:migrate -- --name your_migration_name

# Open Prisma Studio to view/edit data
npm run db:studio

# Reset database (WARNING: Deletes all data!)
npm run db:reset
```

### Production Workflow

```bash
# Deploy migrations to production
npm run db:migrate:prod

# View production database in Prisma Studio
npm run db:studio:prod

# Build and start production server
npm run build
npm start
```

## 🔧 Environment Setup

Your `.env` file currently has:
- `DATABASE_URL` - Active database (currently dev)
- `DATABASE_URL_DEV` - Development database
- `DATABASE_URL_PROD` - Production database

### Switch Between Databases

Just update `DATABASE_URL` in `.env`:

**For Development:**
```env
DATABASE_URL='postgresql://...-adstq7b5-...'  # ep-lively-star
```

**For Production:**
```env
DATABASE_URL='postgresql://...-adxvscai-...'  # ep-sweet-shape
```

## 📝 Quick Tips

1. **Always test migrations in dev first!**
   ```bash
   npm run db:migrate -- --name add_new_feature
   # Test thoroughly, then deploy to prod
   npm run db:migrate:prod
   ```

2. **View data safely:**
   ```bash
   # Development data
   npm run db:studio

   # Production data (read-only recommended)
   npm run db:studio:prod
   ```

3. **After schema changes:**
   ```bash
   # This auto-generates Prisma client
   npm run db:migrate
   ```

## ⚠️ Important Notes

- Never commit `.env` files to git
- Always backup production before migrations
- Current setup uses Neon (PostgreSQL cloud)
- Both dev and prod databases are on Neon

## 📚 For More Details

See [DATABASE_SETUP.md](./DATABASE_SETUP.md) for complete documentation.
