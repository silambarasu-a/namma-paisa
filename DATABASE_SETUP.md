# Database Setup Guide

This guide explains how to set up and manage separate development and production databases for Namma Paisa.

## Environment Files

We use different environment files for different environments:

- `.env` - Default environment file (currently set to development)
- `.env.development` - Development environment variables
- `.env.production` - Production environment variables
- `.env.example` - Template file (safe to commit to git)

## Database Configuration

### Current Setup:
- **Development DB**: `ep-lively-star-adstq7b5` (Neon)
- **Production DB**: `ep-sweet-shape-adxvscai` (Neon)

## Usage

### Development (Local)

```bash
# Use development database
npm run dev

# Or explicitly set NODE_ENV
NODE_ENV=development npm run dev
```

### Production

```bash
# Build for production
npm run build

# Start production server
NODE_ENV=production npm start
```

## Prisma Commands

### Development Database

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations on development database
npx prisma migrate dev

# Open Prisma Studio (Development DB)
npx prisma studio

# Reset development database (WARNING: Deletes all data)
npx prisma migrate reset
```

### Production Database

```bash
# Deploy migrations to production (use with caution!)
npx prisma migrate deploy

# To use production database for studio:
DATABASE_URL=$DATABASE_URL_PROD npx prisma studio
```

## Creating New Databases

### Option 1: Neon (Cloud PostgreSQL)

1. Go to [Neon Console](https://console.neon.tech)
2. Create a new project
3. Copy the connection string
4. Add it to your `.env.development` or `.env.production`

### Option 2: Local PostgreSQL

1. Install PostgreSQL locally
2. Create a database:
   ```bash
   createdb nammapaisa_dev
   ```
3. Update `.env.development`:
   ```
   DATABASE_URL="postgresql://username@localhost:5432/nammapaisa_dev"
   ```

## Environment-Specific Migrations

### To migrate development database:
```bash
npx prisma migrate dev --name your_migration_name
```

### To migrate production database:
```bash
# Set production DATABASE_URL temporarily
DATABASE_URL=$DATABASE_URL_PROD npx prisma migrate deploy
```

## Best Practices

1. **Never commit `.env` files** - They contain sensitive credentials
2. **Always test migrations in development first** before applying to production
3. **Backup production database** before running migrations
4. **Use connection pooling** in production (Neon provides this automatically)
5. **Monitor database usage** on Neon dashboard

## Switching Databases

To switch between databases, update the `DATABASE_URL` in your `.env` file:

```bash
# For development
DATABASE_URL='<your-dev-database-url>'

# For production
DATABASE_URL='<your-prod-database-url>'
```

Or use environment-specific files with the appropriate NODE_ENV.

## Troubleshooting

### Connection Issues
- Verify your IP is allowed in Neon's IP whitelist (if applicable)
- Check that SSL mode is set correctly (`sslmode=require`)
- Ensure connection pooling is enabled for production

### Migration Issues
- If migrations fail, check the Prisma migration logs
- Verify you have the correct permissions on the database
- Ensure the schema is in sync: `npx prisma migrate resolve`

### Performance
- Use connection pooling (enabled by default in Neon pooler URLs)
- Monitor slow queries in Neon console
- Consider adding database indexes for frequently queried fields

## Security Notes

⚠️ **Important**:
- Never expose database credentials in client-side code
- Rotate database passwords regularly
- Use different credentials for dev and production
- Enable 2FA on your Neon account
- Monitor database access logs

## Support

For issues related to:
- Neon Database: [Neon Documentation](https://neon.tech/docs)
- Prisma: [Prisma Documentation](https://www.prisma.io/docs)
