# Backup Strategy - Handled Platform

**Last Updated**: December 11, 2024

This document outlines the backup strategy for the Handled platform's split database architecture.

---

## Overview

The platform uses **two separate databases** requiring different backup strategies:

| Database | Type | Backup Method | Criticality |
|----------|------|---------------|-------------|
| **PRIMARY DB** | Digital Ocean DBaaS | Automated (managed) | 🔴 CRITICAL - Contains auth & customer data |
| **DATA DB** | VPS Local PostgreSQL | Manual scripts | 🟡 MEDIUM - Rebuildable from source files |

---

## PRIMARY Database Backups (DBaaS)

### Managed by Digital Ocean

**What's Backed Up:**
- `config` schema (users, sessions, roles, permissions, integration_runs)
- `customer` schema (organizations, facilities)

**Backup Configuration:**

1. **Automated Daily Backups**
   - Enabled by default in Digital Ocean
   - Retention: 7 days (configurable up to 30 days)
   - Timing: Daily during low-traffic window

2. **Point-in-Time Recovery (PITR)**
   - Available for last 7 days
   - Restore to any point within retention period
   - Useful for accidental data deletion

### How to Verify Backups

```bash
# Check via Digital Ocean Dashboard
https://cloud.digitalocean.com/databases
→ Select your database cluster
→ Settings tab → Backups section
```

### How to Restore PRIMARY DB

**Via Digital Ocean Dashboard:**

1. Go to your database cluster
2. Click **"Backups"** tab
3. Select backup to restore
4. Click **"Restore"**
5. Choose:
   - **New cluster** (recommended for testing)
   - **In-place restore** (overwrites current database)

**⚠️ Important:** Always test restore to a new cluster first!

### Manual Backup (Optional)

If you want an additional copy outside Digital Ocean:

```bash
# Export PRIMARY database
export PRIMARY_DATABASE_URL="postgresql://handled_user:PASSWORD@handled-backoffice-db-do-user-30423004-0.d.db.ondigitalocean.com:25060/handled_primary?sslmode=require"

# Create backup
pg_dump "$PRIMARY_DATABASE_URL" \
  --schema=config \
  --schema=customer \
  --format=custom \
  --file="/backups/primary_$(date +%Y%m%d).dump"
```

---

## DATA Database Backups (VPS Local)

### Automated Script-Based Backups

**What's Backed Up:**
- `workspace` schema (raw import data)
- `reference` schema (transformed data)

**Why This Is Less Critical:**
- Workspace data is disposable (can re-import from source files)
- Reference data is rebuildable (can re-run transformations)

### Setup Automated Backups

#### 1. Make Scripts Executable

```bash
cd /var/www/handled
chmod +x database/backup-data-db.sh
chmod +x database/restore-data-db.sh
```

#### 2. Test Backup Manually

```bash
# Run as handled user
sudo -u handled bash database/backup-data-db.sh
```

**Expected output:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Handled DATA DB Backup (Workspace + Reference)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

→ Backing up workspace and reference schemas...
✓ Backup created: handled_data_20241211_143022.sql.gz (2.3M)
→ Cleaning up backups older than 14 days...
✓ Deleted 0 old backup(s)

Backup Summary:
  Location: /var/backups/handled/data
  Latest: handled_data_20241211_143022.sql.gz
  Total backups: 1
  Total size: 2.3M

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✨ DATA DB Backup Complete!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

#### 3. Create Backup Directory

```bash
sudo mkdir -p /var/backups/handled/data
sudo chown -R handled:handled /var/backups/handled
```

#### 4. Schedule Daily Backups with Cron

```bash
# Edit crontab as handled user
sudo -u handled crontab -e

# Add this line (runs daily at 2 AM):
0 2 * * * /var/www/handled/database/backup-data-db.sh >> /var/log/handled-backup.log 2>&1
```

**Verify cron is scheduled:**
```bash
sudo -u handled crontab -l
```

### Backup Retention

- **Default**: 14 days
- **Configurable**: Edit `RETENTION_DAYS` in `backup-data-db.sh`
- Old backups are automatically deleted

### How to Restore DATA DB

#### 1. List Available Backups

```bash
ls -lh /var/backups/handled/data/
```

#### 2. Stop Application

```bash
pm2 stop handled-api
```

#### 3. Run Restore Script

```bash
# Restore from specific backup
sudo -u handled bash database/restore-data-db.sh /var/backups/handled/data/handled_data_20241211_143022.sql.gz

# Or provide just the filename
sudo -u handled bash database/restore-data-db.sh handled_data_20241211_143022.sql.gz
```

#### 4. Restart Application

```bash
pm2 restart handled-api
```

---

## Disaster Recovery Scenarios

### Scenario 1: DBaaS Failure (PRIMARY DB Down)

**Impact**: 🔴 CRITICAL - No authentication, no user access

**Recovery Steps:**

1. Check Digital Ocean status page
2. Contact Digital Ocean support
3. While waiting:
   - If < 7 days, request point-in-time restore
   - If backup available, restore to new cluster
   - Update `PRIMARY_DATABASE_URL` in `.env` to new cluster
   - Restart application

**Recovery Time**: 30-60 minutes

### Scenario 2: VPS Failure (DATA DB Lost)

**Impact**: 🟡 MEDIUM - Workspace/reference data lost, but rebuildable

**Recovery Options:**

**Option A: Restore from Backup**
```bash
# Restore latest backup
bash database/restore-data-db.sh /var/backups/handled/data/handled_data_latest.sql.gz
```

**Option B: Rebuild from Source**
```bash
# Re-import raw data files
# Re-run transformations
# Faster if original files are large
```

**Recovery Time**: 1-4 hours (depending on data volume)

### Scenario 3: Accidental Data Deletion

**PRIMARY DB (Critical):**
- Use Digital Ocean point-in-time recovery
- Restore to moment before deletion
- Recovery Time: 15-30 minutes

**DATA DB (Non-critical):**
- Restore from most recent backup
- Or re-import/re-transform affected data
- Recovery Time: 30 minutes - 2 hours

### Scenario 4: Complete System Loss

**Full Recovery Process:**

1. **Provision new VPS** (30 minutes)
2. **Install dependencies** (15 minutes)
3. **Restore PRIMARY DB** from Digital Ocean backup (30 minutes)
4. **Restore DATA DB** from VPS backup (30 minutes)
5. **Deploy application** (15 minutes)
6. **Test and verify** (30 minutes)

**Total Recovery Time**: ~2.5 hours

---

## Backup Verification

### Weekly Backup Health Check

```bash
# Check PRIMARY DB backups in Digital Ocean dashboard
# Verify last backup date and status

# Check DATA DB backups
ls -lh /var/backups/handled/data/ | tail -5

# Verify backup sizes (should be consistent)
du -sh /var/backups/handled/data/
```

### Monthly Restore Test

**Test DATA DB Restore:**

1. Stop application
2. Restore to test database
3. Verify data integrity
4. Document any issues
5. Restart application

```bash
# Create test database
createdb -U handled_user handled_test

# Restore to test database
gunzip -c /var/backups/handled/data/handled_data_latest.sql.gz | \
  psql -U handled_user -d handled_test

# Verify
psql -U handled_user -d handled_test -c "\dt workspace.*"
psql -U handled_user -d handled_test -c "\dt reference.*"

# Cleanup
dropdb -U handled_user handled_test
```

---

## Backup Monitoring

### Set Up Alerts

**Digital Ocean Backups:**
- Monitor via Digital Ocean dashboard
- Set up email alerts for backup failures

**VPS Backups:**
- Monitor cron log: `/var/log/handled-backup.log`
- Set up alerts for backup script failures

### Create Monitoring Script

```bash
# Check if backup ran in last 24 hours
LATEST_BACKUP=$(find /var/backups/handled/data -name "handled_data_*.sql.gz" -mtime -1)

if [ -z "$LATEST_BACKUP" ]; then
    echo "⚠️ WARNING: No backup created in last 24 hours!"
    # Send alert (email, Slack, etc.)
else
    echo "✓ Backup is current"
fi
```

---

## Backup Checklist

### Daily (Automated)
- [x] PRIMARY DB automated backup (Digital Ocean)
- [x] DATA DB automated backup (cron)

### Weekly (Manual)
- [ ] Verify PRIMARY DB backup in Digital Ocean dashboard
- [ ] Check DATA DB backup directory and sizes
- [ ] Review backup logs for errors

### Monthly (Manual)
- [ ] Test DATA DB restore to test database
- [ ] Verify backup restoration process works
- [ ] Update this documentation if procedures change

### Quarterly (Manual)
- [ ] Full disaster recovery drill
- [ ] Document recovery time
- [ ] Update runbooks based on learnings

---

## Emergency Contacts

**Digital Ocean Support:**
- Dashboard: https://cloud.digitalocean.com/support
- Phone: Available in dashboard
- Priority: Based on your support plan

**Internal:**
- Primary: Nathan Jones (texfla@gmail.com)
- Secondary: Chuck Atkinson (chuck@handledcommerce.com)

---

## Quick Reference Commands

```bash
# Backup DATA DB manually
sudo -u handled bash /var/www/handled/database/backup-data-db.sh

# List available backups
ls -lh /var/backups/handled/data/

# Restore DATA DB
sudo -u handled bash /var/www/handled/database/restore-data-db.sh <backup-file>

# Check cron schedule
sudo -u handled crontab -l

# View backup logs
tail -f /var/log/handled-backup.log

# Check Digital Ocean backups
# → https://cloud.digitalocean.com/databases
```

---

## Notes

- **PRIMARY DB backups are CRITICAL** - Contains irreplaceable user and customer data
- **DATA DB backups are IMPORTANT** - But data is rebuildable from source files
- **Test restores regularly** - A backup is only as good as your ability to restore it
- **Monitor backup sizes** - Sudden changes may indicate issues
- **Keep documentation updated** - Update this file when procedures change
