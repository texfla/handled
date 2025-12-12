# Operations Runbook - Database Split Architecture

This guide covers operational procedures for the split database architecture.

## Architecture Overview

### Production Environment

```
┌──────────────────┐
│  VPS (Ubuntu 24) │
├──────────────────┤
│ • Fastify API    │
│ • DATA DB        │──────┐
│ • Nginx          │      │
│ • PM2            │      │ Queries
└──────────────────┘      │
         │                │
         │ Auth/Customer  │ Data
         │ Queries        │ Processing
         │                │
         ▼                ▼
┌──────────────────┐   ┌──────────────────┐
│ PRIMARY DB       │   │ DATA DB          │
│ (DBaaS)          │   │ (VPS Local)      │
├──────────────────┤   ├──────────────────┤
│ • config schema  │   │ • workspace      │
│ • customer       │   │ • reference      │
│ • Backed up      │   │ • Fast, local    │
└──────────────────┘   └──────────────────┘
```

### Connection Information

**PRIMARY DATABASE:**
```bash
# Location: Digital Ocean Managed PostgreSQL
# Connection: See PRIMARY_DATABASE_URL in .env
# SSL: Required
# Pool: PgBouncer enabled, 15 connection limit
```

**DATA DATABASE:**
```bash
# Location: VPS localhost
# Connection: See DATA_DATABASE_URL in .env
# SSL: Not required (local)
# Pool: Direct connections
```

---

## Health Monitoring

### Health Check Endpoint

```bash
curl http://ops.handledcommerce.com/api/health
```

**Expected response:**
```json
{
  "status": "healthy",
  "databases": {
    "primary": "connected",
    "data": "connected"
  },
  "timestamp": "2024-12-11T..."
}
```

### Database Connection Monitoring

**Check PRIMARY DB connections:**
```sql
-- Connect to PRIMARY
psql "$PRIMARY_DATABASE_URL"

-- Check active connections
SELECT count(*) as connections 
FROM pg_stat_activity 
WHERE datname = 'handled_primary';

-- Should be under 10 for typical backoffice usage
-- Alert if > 12 sustained
```

**Check DATA DB connections:**
```sql
-- Connect to DATA
psql "$DATA_DATABASE_URL"

-- Check active connections
SELECT count(*) as connections 
FROM pg_stat_activity 
WHERE datname = 'handled_data';

-- Can be higher during imports/transforms (20-30)
-- Alert if > 50
```

### Application Logs

```bash
# View API logs
pm2 logs backoffice-api --lines 100

# View recent errors
pm2 logs backoffice-api --err --lines 50

# Follow logs in real-time
pm2 logs backoffice-api
```

---

## Common Operations

### Restart Application

```bash
# Restart API
pm2 restart backoffice-api

# Restart web
pm2 restart backoffice-web

# Restart all
pm2 restart all

# View status
pm2 status
```

### Run Migrations

**After code deployment:**
```bash
cd /path/to/handled

# Run all migrations
pnpm db:migrate

# Or run specific database
pnpm db:migrate:primary
pnpm db:migrate:data
```

### Check Migration Status

```bash
# PRIMARY DB
pnpm db:migrate:status:primary

# DATA DB
pnpm db:migrate:status:data
```

### Backup Databases

**PRIMARY DB (DBaaS):**
- Automated daily backups (configured in Digital Ocean)
- Manual backup before major changes:
  ```bash
  pg_dump "$PRIMARY_DATABASE_URL" > backup_primary_$(date +%Y%m%d).sql
  ```

**DATA DB (VPS):**
```bash
# Manual backup
pg_dump -U handled_user handled_data > backup_data_$(date +%Y%m%d).sql

# Compress for storage
gzip backup_data_$(date +%Y%m%d).sql

# Upload to external storage (recommended)
# aws s3 cp backup_data_*.sql.gz s3://handled-backups/
```

---

## Troubleshooting

### Issue: PRIMARY DB Connection Failures

**Symptoms:**
- Users cannot log in
- "Authentication required" errors
- PRIMARY DB shows "disconnected" in health check

**Diagnosis:**
```bash
# Test PRIMARY DB connectivity
psql "$PRIMARY_DATABASE_URL" -c "SELECT 1;"

# Check Digital Ocean DBaaS status
# Visit: cloud.digitalocean.com/databases

# Check VPS can reach DBaaS
ping db-postgresql-nyc3-xxx.ondigitalocean.com
```

**Resolution:**
1. Check Digital Ocean DBaaS dashboard for issues
2. Verify VPS IP is whitelisted
3. Check SSL certificate validity
4. Verify connection string is correct
5. If DBaaS is down, consider temporary rollback (see below)

### Issue: DATA DB Connection Failures

**Symptoms:**
- File imports fail
- Transformations fail
- Export queries fail

**Diagnosis:**
```bash
# Test DATA DB connectivity
psql "$DATA_DATABASE_URL" -c "SELECT 1;"

# Check PostgreSQL service
sudo systemctl status postgresql

# Check disk space
df -h
```

**Resolution:**
```bash
# Restart PostgreSQL
sudo systemctl restart postgresql

# Check logs
sudo tail -f /var/log/postgresql/postgresql-17-main.log

# Verify DATA DB exists
psql -l | grep handled_data
```

### Issue: Connection Pool Exhausted

**Symptoms:**
- "Too many clients already" error
- Slow response times
- 502 errors from nginx

**Diagnosis:**
```sql
-- PRIMARY DB
SELECT count(*), state 
FROM pg_stat_activity 
WHERE datname = 'handled_primary'
GROUP BY state;

-- DATA DB
SELECT count(*), state 
FROM pg_stat_activity 
WHERE datname = 'handled_data'
GROUP BY state;
```

**Resolution:**
```bash
# 1. Restart application to clear connections
pm2 restart backoffice-api

# 2. If persistent, check for connection leaks in code
pm2 logs backoffice-api --err

# 3. For PRIMARY DB, verify connection pooling is enabled:
# PRIMARY_DATABASE_URL should have: ?pgbouncer=true&connection_limit=15

# 4. For DATA DB, increase max connections if needed:
sudo nano /etc/postgresql/17/main/postgresql.conf
# Set: max_connections = 100
sudo systemctl restart postgresql
```

### Issue: Slow Authentication

**Symptoms:**
- Login takes > 2 seconds
- Dashboard loads slowly
- `/api/auth/me` endpoint slow

**Diagnosis:**
```bash
# Check session cache is working
pm2 logs backoffice-api | grep "SessionCache"

# Test PRIMARY DB latency
time psql "$PRIMARY_DATABASE_URL" -c "SELECT 1;"
```

**Resolution:**
1. Verify session caching is enabled (should be by default)
2. Check PRIMARY DB connection pooling
3. Monitor DBaaS performance in Digital Ocean dashboard
4. Consider upgrading DBaaS tier if consistently slow

### Issue: Migration Failures

**Symptoms:**
- Migration script exits with error
- Database in inconsistent state

**Recovery:**
```bash
# 1. Check which migration failed
pnpm db:migrate:status:primary
pnpm db:migrate:status:data

# 2. Review error in logs
cat /path/to/error.log

# 3. If migration partially applied, manually fix or:
# Remove from tracking
psql "$PRIMARY_DATABASE_URL" -c "DELETE FROM config.schema_migrations WHERE version = '010';"

# 4. Fix migration file

# 5. Re-run
pnpm db:migrate:primary
```

---

## Emergency Procedures

### Rollback to Single Database

If critical issues arise with split database:

```bash
# 1. Stop application
pm2 stop backoffice-api

# 2. Update environment
cd /path/to/handled/apps/backoffice/api
nano .env

# Change:
# SPLIT_DB_MODE=false
# PRIMARY_DATABASE_URL="postgresql://handled_user:pass@localhost:5432/handled"
# Comment out DATA_DATABASE_URL

# 3. Restart application
pm2 start backoffice-api

# 4. Verify health
curl http://localhost:3001/api/health

# 5. Restore from backup if needed
psql -U handled_user handled < /path/to/backup.sql
```

**Note**: Keep old single database backup for at least 1 week after split.

### PRIMARY DB Failure (DBaaS Down)

**Immediate Action:**
1. Check Digital Ocean status page
2. Contact Digital Ocean support
3. Monitor recovery

**Temporary Workaround**: None - authentication requires PRIMARY DB

**Prevention**: 
- Use Professional tier DBaaS for 99.99% uptime
- Set up monitoring alerts
- Have backup connection string ready

### DATA DB Failure (VPS PostgreSQL Down)

**Immediate Action:**
```bash
# Restart PostgreSQL
sudo systemctl restart postgresql

# Check logs
sudo tail -f /var/log/postgresql/postgresql-17-main.log

# Verify it's running
sudo systemctl status postgresql
```

**Recovery:**
- DATA DB can be fully rebuilt from source files
- Run imports and transformations again
- Typically < 30 minutes to restore

---

## Monitoring Checklist

### Daily
- [ ] Check health endpoint
- [ ] Monitor PM2 status
- [ ] Check disk usage: `df -h`

### Weekly
- [ ] Review PRIMARY DB connection counts
- [ ] Review DATA DB disk usage trend
- [ ] Check backup integrity
- [ ] Review error logs

### Monthly
- [ ] Test backup restoration (PRIMARY)
- [ ] Review DBaaS performance metrics
- [ ] Review and rotate logs
- [ ] Update dependencies

---

## Deployment Procedures

### Deploying Code Changes

```bash
# 1. SSH to VPS
ssh user@ops.handledcommerce.com

# 2. Pull latest code
cd /path/to/handled
git pull origin main

# 3. Install dependencies
pnpm install

# 4. Run migrations (if any)
pnpm db:migrate

# 5. Rebuild application
pnpm build

# 6. Restart services
pm2 restart all

# 7. Verify health
curl http://localhost:3001/api/health

# 8. Monitor logs
pm2 logs backoffice-api --lines 50
```

### Deploying Schema Changes

```bash
# If PRIMARY schema changed:
pnpm db:migrate:primary
pnpm --filter @handled/api db:generate:primary

# If DATA schema changed:
pnpm db:migrate:data
pnpm --filter @handled/api db:generate:data

# Rebuild and restart
pnpm build
pm2 restart backoffice-api
```

---

## Performance Optimization

### Session Caching

Session caching is **enabled by default** and reduces PRIMARY DB load by 90%.

**Monitor cache effectiveness:**
```bash
# Check logs for cache hits
pm2 logs backoffice-api | grep "SessionCache"

# Cache stats are logged every 60 seconds during cleanup
```

### Connection Pooling

**PRIMARY DB** (DBaaS):
- Uses PgBouncer: `?pgbouncer=true&connection_limit=15`
- Pool mode: Transaction
- Max connections: 15 (plenty for backoffice)

**DATA DB** (VPS):
- Direct connections (no pooling needed)
- Max connections: 100 (default)

---

## Contact Information

- **Platform Lead**: [Your Name]
- **On-Call**: [Rotation schedule]
- **Digital Ocean Support**: https://cloud.digitalocean.com/support
- **Emergency Escalation**: [Phone number]

---

## Useful Links

- [Developer Setup Guide](DEVELOPER_SETUP.md)
- [Database Split Plan](../database-split-plan.md)
- [Digital Ocean DBaaS Dashboard](https://cloud.digitalocean.com/databases)
- [Application Health](http://ops.handledcommerce.com/api/health)

---

**Last Updated**: December 2024
