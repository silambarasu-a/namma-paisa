# Monthly Snapshot - Setup Guide

## Overview

The Monthly Snapshot system tracks your monthly finances and automatically carries forward surplus to the next month.

## How It Works

### Automatic (Recommended)

**On the 1st of every month**, a cron job automatically:
1. Closes the previous month for all users
2. Calculates all expenses, surplus, and obligations
3. Locks the data with `isClosed = true`
4. Makes surplus available for the new month

### Manual (Always Available)

Users can:
- View any month's snapshot at `/monthly-snapshot`
- Manually close the current month anytime
- Review before closing

---

## Setup Options

### Option 1: System Cron (Linux/Mac)

Add to your crontab:

```bash
# Edit crontab
crontab -e

# Add this line (runs at 12:01 AM on the 1st of every month)
1 0 1 * * curl -X POST http://localhost:3000/api/cron/monthly-snapshot -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### Option 2: Vercel Cron (If deployed on Vercel)

Create `vercel.json`:

```json
{
  "crons": [{
    "path": "/api/cron/monthly-snapshot",
    "schedule": "0 0 1 * *"
  }]
}
```

Then add `CRON_SECRET` to Vercel environment variables.

### Option 3: GitHub Actions

Create `.github/workflows/monthly-snapshot.yml`:

```yaml
name: Monthly Snapshot

on:
  schedule:
    # Runs at 00:01 on the 1st of every month
    - cron: '1 0 1 * *'
  workflow_dispatch: # Allow manual trigger

jobs:
  snapshot:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Monthly Snapshot
        run: |
          curl -X POST https://your-domain.com/api/cron/monthly-snapshot \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

Add `CRON_SECRET` to GitHub repository secrets.

### Option 4: EasyCron (Online Service)

1. Sign up at https://www.easycron.com
2. Create new cron job:
   - **URL**: `https://your-domain.com/api/cron/monthly-snapshot`
   - **Method**: POST
   - **Schedule**: `0 0 1 * *` (1st of every month at midnight)
   - **Headers**: `Authorization: Bearer YOUR_CRON_SECRET`

---

## Environment Variables

Add to your `.env` file:

```env
# Cron secret for automated tasks
CRON_SECRET=your-super-secret-key-change-this
```

⚠️ **Important**: Use a strong, random secret in production!

Generate one:
```bash
openssl rand -base64 32
```

---

## Manual Trigger (Admin/Testing)

You can manually trigger the snapshot via:

```bash
# Close previous month for all users
curl -X POST http://localhost:3000/api/cron/monthly-snapshot \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# Or via browser (GET request)
http://localhost:3000/api/cron/monthly-snapshot?secret=YOUR_CRON_SECRET
```

---

## What Gets Saved Each Month

### Income & Deductions
- Net Salary
- Tax Amount
- After Tax Amount

### Obligations
- Total Loan EMIs
- Total SIP Contributions

### Expenses Breakdown
- Total Expenses
- Expected vs Unexpected
- Needs vs Avoid categorization

### Surplus Calculation
```
Available = After Tax - Loans - SIPs
Surplus = Available - Total Expenses
```

### Carry Forward
The surplus automatically becomes `previousSurplus` for next month.

---

## Monthly Flow Example

**January 2025:**
- Salary: ₹100,000
- Tax: -₹20,000
- Loans: -₹10,000
- SIPs: -₹15,000
- Available: ₹55,000
- Expenses: ₹40,000
- **Surplus: ₹15,000** ✅ (Carried forward)

**February 2025:**
- Salary: ₹100,000
- Tax: -₹20,000
- Loans: -₹10,000
- SIPs: -₹15,000
- Available: ₹55,000
- **+ Previous Surplus: ₹15,000** ← From January
- **Total Available: ₹70,000** 🎉

---

## Testing

Test the cron manually:

```bash
# 1. Set your CRON_SECRET in .env
echo "CRON_SECRET=test-secret-123" >> .env

# 2. Trigger manually
curl -X POST http://localhost:3000/api/cron/monthly-snapshot \
  -H "Authorization: Bearer test-secret-123"

# 3. Check response
# Should return: { success: true, stats: {...} }
```

---

## Monitoring

The cron endpoint returns statistics:

```json
{
  "success": true,
  "month": 1,
  "year": 2025,
  "stats": {
    "totalUsers": 10,
    "created": 8,
    "updated": 1,
    "skipped": 1,
    "failed": 0
  }
}
```

Check server logs for details:
```
Starting monthly snapshot for 1/2025
Created snapshot for user@example.com
Updated snapshot for admin@example.com
Skipped existing@example.com - already closed
Monthly snapshot complete: 8 created, 1 updated, 1 skipped, 0 failed
```

---

## Best Practices

1. **Set up monitoring**: Get alerted if the cron fails
2. **Test first**: Run manually before setting up automated cron
3. **Backup**: Ensure database backups are running
4. **Review logs**: Check logs after the 1st of each month
5. **Manual override**: Users can still close months manually anytime

---

## Troubleshooting

**Cron not running?**
- Check CRON_SECRET matches
- Verify cron schedule syntax
- Check server logs for errors
- Test with manual trigger first

**Snapshots not closing?**
- Check if already closed (skipped)
- Verify user has salary/expenses data
- Check database permissions

**Wrong calculations?**
- Verify salary history is up to date
- Check loan/SIP dates and frequencies
- Review expense entries for the month

---

## Support

For issues, check:
1. Server logs: `npm run dev` output
2. Database: Check `monthly_snapshots` table
3. Manual trigger: Use GET endpoint for testing