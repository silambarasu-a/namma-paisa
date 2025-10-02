# Deployment Guide - Vercel

This guide covers deploying the namma-paisa application to Vercel with automated cron jobs for monthly snapshots and SIP executions.

## 📋 Prerequisites

- Vercel account ([sign up here](https://vercel.com/signup))
- PostgreSQL database (Vercel Postgres, Supabase, or any PostgreSQL provider)
- GitHub/GitLab repository (for automatic deployments)

## 🚀 Deploy to Vercel

### 1. Connect Repository

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New Project"
3. Import your Git repository
4. Vercel will automatically detect Next.js

### 2. Configure Environment Variables

In your Vercel project settings → Environment Variables, add:

```bash
# Database
DATABASE_URL="your-postgresql-connection-string"

# NextAuth.js
NEXTAUTH_URL="https://your-app.vercel.app"
NEXTAUTH_SECRET="generate-with: openssl rand -base64 32"

# Email (SMTP)
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT="587"
EMAIL_SECURE="false"
EMAIL_USER="your-email@gmail.com"
EMAIL_PASSWORD="your-gmail-app-password"

# Cron Job Security
CRON_SECRET="generate-with: openssl rand -base64 32"

# Environment
NODE_ENV="production"
```

### 3. Deploy

Click "Deploy" and Vercel will:
- Build your application
- Run database migrations (if configured)
- Deploy to production

## ⏰ Cron Jobs Setup

The application has two automated cron jobs configured in `vercel.json`:

### 1. Monthly Snapshot Cron
- **Path**: `/api/cron/monthly-snapshot`
- **Schedule**: `0 0 1 * *` (Every 1st of the month at midnight UTC)
- **Purpose**: Creates monthly financial snapshots for all users

### 2. SIP Execution Cron
- **Path**: `/api/cron/sip-execution`
- **Schedule**: `0 9 * * *` (Every day at 9:00 AM UTC)
- **Purpose**: Executes scheduled SIP investments

### Understanding Cron Schedules

Cron format: `minute hour day month weekday`

```
0 0 1 * *   → Every 1st of month at 00:00 (Monthly Snapshot)
0 9 * * *   → Every day at 09:00 (SIP Execution)
```

**Common schedules:**
```bash
0 0 * * *     # Daily at midnight
0 */6 * * *   # Every 6 hours
0 0 * * 0     # Every Sunday at midnight
0 0 1,15 * *  # 1st and 15th of every month
```

### Customize Cron Schedule

Edit `vercel.json` to change the schedule:

```json
{
  "crons": [
    {
      "path": "/api/cron/monthly-snapshot",
      "schedule": "0 0 1 * *"  // Modify this
    },
    {
      "path": "/api/cron/sip-execution",
      "schedule": "0 9 * * *"  // Modify this
    }
  ]
}
```

## 🔒 Security

### Cron Job Authentication

All cron endpoints are protected with a secret token:

```typescript
// In your cron endpoint
const authHeader = request.headers.get("authorization")
if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}
```

Vercel automatically adds the correct `Authorization` header when calling your cron endpoints.

### Generate CRON_SECRET

```bash
# Generate a strong secret
openssl rand -base64 32
```

Add this to your Vercel environment variables as `CRON_SECRET`.

## 📊 Monitoring Cron Jobs

### View Cron Logs in Vercel

1. Go to your project in Vercel Dashboard
2. Navigate to "Deployments"
3. Click on your latest deployment
4. Go to "Functions" tab
5. Filter by your cron endpoints to see execution logs

### Check Cron Execution

You can also check the Vercel "Cron" tab in your project settings to see:
- Scheduled cron jobs
- Last execution time
- Success/failure status
- Execution logs

### Test Cron Endpoints Manually

During development, you can test cron endpoints locally:

```bash
# Test monthly snapshot
curl -X POST http://localhost:3000/api/cron/monthly-snapshot \
  -H "Authorization: Bearer your-cron-secret"

# Test SIP execution
curl -X GET http://localhost:3000/api/cron/sip-execution \
  -H "Authorization: Bearer your-cron-secret"
```

## 🔧 Troubleshooting

### Cron Not Running?

1. **Check Vercel Plan**: Cron jobs are available on Pro plans and above
2. **Verify vercel.json**: Ensure file is in root directory and properly formatted
3. **Check Logs**: Review function logs in Vercel dashboard
4. **Timezone**: Cron runs in UTC, adjust schedule if needed

### Common Issues

**Issue**: Cron returns 401 Unauthorized
- **Solution**: Verify `CRON_SECRET` is set in environment variables

**Issue**: Database connection timeout
- **Solution**: Ensure `DATABASE_URL` is correct and accessible from Vercel

**Issue**: Cron doesn't appear in dashboard
- **Solution**: Redeploy after adding/modifying `vercel.json`

## 🔄 Deployment Workflow

### Production Deployment

```bash
# 1. Commit changes
git add .
git commit -m "Update cron configuration"

# 2. Push to main branch
git push origin main

# 3. Vercel auto-deploys
# Monitor at: https://vercel.com/dashboard
```

### Preview Deployments

- Every branch push creates a preview deployment
- Cron jobs **DO NOT** run on preview deployments
- Only production deployments execute cron jobs

## 📝 Database Migrations

### Auto-run Migrations on Deploy

Add to `package.json`:

```json
{
  "scripts": {
    "build": "prisma generate && prisma migrate deploy && next build"
  }
}
```

Or use Vercel's build command override:
```bash
prisma generate && prisma migrate deploy && next build
```

### Manual Migration

```bash
# SSH into Vercel (if needed)
vercel env pull .env.production
npx prisma migrate deploy
```

## 🌍 Environment-Specific Configuration

### Development
- Cron jobs won't run locally
- Test cron endpoints manually with curl

### Staging
- Create a separate Vercel project
- Use staging database
- Different `CRON_SECRET`

### Production
- Use production database
- Secure `CRON_SECRET`
- Monitor cron execution logs

## 📚 Additional Resources

- [Vercel Cron Jobs Documentation](https://vercel.com/docs/cron-jobs)
- [Cron Expression Generator](https://crontab.guru/)
- [Next.js Deployment Guide](https://nextjs.org/docs/deployment)
- [Prisma with Vercel](https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-vercel)

## ✅ Deployment Checklist

- [ ] Repository connected to Vercel
- [ ] All environment variables configured
- [ ] `CRON_SECRET` generated and added
- [ ] Database connection tested
- [ ] `vercel.json` with cron configuration committed
- [ ] Application deployed successfully
- [ ] Cron jobs appear in Vercel dashboard
- [ ] Cron execution logs verified
- [ ] Email notifications tested (if applicable)
- [ ] Database migrations applied

## 🆘 Support

If you encounter issues:

1. Check [Vercel Status](https://vercel-status.com/)
2. Review [Vercel Documentation](https://vercel.com/docs)
3. Check application logs in Vercel dashboard
4. Verify all environment variables are set correctly
