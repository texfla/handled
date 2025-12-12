# Database Split - Deployment Checklist

Use this checklist to track progress through the deployment phases.

---

## Pre-Deployment

### Infrastructure Setup
- [ ] Digital Ocean DBaaS PostgreSQL 17 instance provisioned
  - [ ] Basic 1GB plan (or higher) selected
  - [ ] NYC3 region (same as VPS)
  - [ ] Connection pooling enabled (PgBouncer, transaction mode)
  - [ ] Pool size set to 15
  - [ ] SSL/TLS enabled and required
  - [ ] Automated daily backups configured
  - [ ] Maintenance window configured (off-peak hours)

- [ ] Network configuration
  - [ ] VPS IP address whitelisted on DBaaS
  - [ ] SSL CA certificate downloaded
  - [ ] Connection string tested from VPS
  - [ ] Connection string saved in secure secrets manager

- [ ] Environment variables prepared
  - [ ] `PRIMARY_DATABASE_URL` with connection pooling params
  - [ ] `DATA_DATABASE_URL` for VPS local
  - [ ] `SPLIT_DB_MODE=true`
  - [ ] Secure `AUTH_SECRET` generated

### Code Validation
- [ ] All developers have pulled latest code
- [ ] Local testing completed (single-DB mode)
- [ ] Integration tests passing
- [ ] TypeScript builds without errors
- [ ] No linter errors
- [ ] Prisma clients generate successfully

---

## Phase 1: Development Testing (Week 1)

### Local Testing
- [ ] Single-DB mode tested
  - [ ] Created `handled_dev` database
  - [ ] Set `SPLIT_DB_MODE=false`
  - [ ] Ran migrations: `pnpm db:migrate`
  - [ ] Generated clients: `pnpm db:generate`
  - [ ] Started dev server: `pnpm dev`
  - [ ] Tested authentication flow
  - [ ] Tested data imports
  - [ ] Tested transformations
  - [ ] No errors in console

- [ ] Split-DB mode tested locally
  - [ ] Created `handled_primary_dev` database
  - [ ] Created `handled_data_dev` database
  - [ ] Set `SPLIT_DB_MODE=true`
  - [ ] Ran both migration sets
  - [ ] Generated both Prisma clients
  - [ ] Started dev server
  - [ ] All features work identically to single-DB mode

### Integration Tests
- [ ] Test suite runs and passes
  - [ ] PRIMARY DB tests pass
  - [ ] DATA DB tests pass
  - [ ] Customer schema tests pass
  - [ ] Session cache tests pass
  - [ ] Data isolation tests pass

---

## Phase 2: DBaaS Initialization (Week 2)

### PRIMARY Database Setup
- [ ] Connect to DBaaS from VPS
  ```bash
  psql "$PRIMARY_DATABASE_URL" -c "SELECT version();"
  ```

- [ ] Run PRIMARY migrations
  ```bash
  export PRIMARY_DATABASE_URL="<dbaas-connection-string>"
  pnpm db:migrate:primary
  ```

- [ ] Verify schema creation
  ```bash
  psql "$PRIMARY_DATABASE_URL" -c "\dn"
  # Should show: config, customer
  ```

- [ ] Verify tables created
  ```bash
  psql "$PRIMARY_DATABASE_URL" -c "
    SELECT schemaname, tablename 
    FROM pg_tables 
    WHERE schemaname IN ('config', 'customer')
    ORDER BY schemaname, tablename;
  "
  ```

- [ ] Test connection pooling
  - [ ] Verified `pgbouncer=true` in connection string
  - [ ] Checked pool size in Digital Ocean UI
  - [ ] Tested concurrent connections

---

## Phase 3: Staging Environment (Week 2-3)

### Staging Setup
- [ ] Staging VPS configured
- [ ] Staging PRIMARY DB created (separate DBaaS or same instance)
- [ ] Staging DATA DB created on staging VPS

### Data Migration Test
- [ ] Created staging copy of production database
  ```bash
  pg_dump -h production-vps -U handled_user handled | \
    psql -h staging-vps handled_staging_single
  ```

- [ ] Ran `migrate-production-data.sh` on staging
- [ ] Verified all row counts match
  - [ ] Users
  - [ ] Roles
  - [ ] Permissions
  - [ ] Integration runs
  - [ ] Carriers
  - [ ] Services
  - [ ] Delivery matrix
  - [ ] Workspace tables

- [ ] Deployed application code to staging
- [ ] Set `SPLIT_DB_MODE=true` on staging
- [ ] Tested all features work
  - [ ] User login
  - [ ] Role management
  - [ ] File imports
  - [ ] Transformations
  - [ ] Exports
  - [ ] Integration history

### Staging Validation (1 Week)
- [ ] Staging running for 1 week without issues
- [ ] No connection errors
- [ ] No authentication failures
- [ ] Performance acceptable
- [ ] Session caching working (check logs)
- [ ] Both databases healthy

---

## Phase 4: Production Deployment (Week 4)

### Pre-Deployment
- [ ] **Backup everything**
  ```bash
  pg_dump -h localhost -U handled_user handled > \
    backup_pre_split_$(date +%Y%m%d_%H%M%S).sql
  gzip backup_pre_split_*.sql
  ```

- [ ] **Upload backup to external storage**
  ```bash
  # S3, DigitalOcean Spaces, or similar
  ```

- [ ] **Maintenance window scheduled**
  - Date: __________
  - Time: __________
  - Duration: 2 hours
  - Stakeholders notified: Yes / No

- [ ] **Team availability confirmed**
  - [ ] Lead developer available
  - [ ] Ops engineer available
  - [ ] On-call engineer notified

### Deployment Steps

**Executed during maintenance window:**

- [ ] **Step 1: Run data migration**
  ```bash
  export OLD_DATABASE_URL="postgresql://localhost:5432/handled"
  export PRIMARY_DATABASE_URL="<dbaas-connection>"
  export DATA_DATABASE_URL="postgresql://localhost:5432/handled_data"
  bash database/migrate-production-data.sh
  ```
  Duration: ~15-30 minutes

- [ ] **Step 2: Validate migration**
  - [ ] All row counts match
  - [ ] No data loss
  - [ ] Foreign keys intact

- [ ] **Step 3: Update application environment**
  ```bash
  nano /path/to/api/.env
  # Set SPLIT_DB_MODE=true
  # Update PRIMARY_DATABASE_URL
  # Update DATA_DATABASE_URL
  ```

- [ ] **Step 4: Rebuild application**
  ```bash
  pnpm install
  pnpm build
  ```

- [ ] **Step 5: Restart services**
  ```bash
  pm2 restart backoffice-api
  pm2 restart backoffice-web
  ```

- [ ] **Step 6: Verify health**
  ```bash
  curl http://ops.handledcommerce.com/api/health
  ```

### Post-Deployment Validation (First Hour)

- [ ] Health check shows both databases connected
- [ ] User can log in successfully
- [ ] Can create/edit users
- [ ] Can manage roles and permissions
- [ ] File upload works
- [ ] Data transformation works
- [ ] Exports work
- [ ] No errors in PM2 logs
- [ ] No errors in PostgreSQL logs

### Monitoring (First 48 Hours)

- [ ] **Hour 1**: Check every 15 minutes
- [ ] **Hours 2-24**: Check every hour
- [ ] **Hours 25-48**: Check every 4 hours

**What to monitor:**
- [ ] Application logs: `pm2 logs backoffice-api`
- [ ] PRIMARY DB connections
- [ ] DATA DB connections
- [ ] Response times
- [ ] Error rates
- [ ] Session cache effectiveness

### Post-Deployment (Week 1)

- [ ] No critical issues reported
- [ ] Performance acceptable
- [ ] Team comfortable with new architecture
- [ ] Documentation reviewed and approved
- [ ] Old database archived but kept as backup
- [ ] Monitoring alerts configured

---

## Rollback Procedure

**If critical issues arise, execute this rollback plan:**

### Quick Rollback (< 5 minutes)

```bash
# 1. Stop application
pm2 stop backoffice-api

# 2. Update .env
cd /path/to/handled/apps/backoffice/api
nano .env
# Change:
# SPLIT_DB_MODE=false
# PRIMARY_DATABASE_URL="postgresql://handled_user:pass@localhost:5432/handled"
# Comment out DATA_DATABASE_URL

# 3. Restart
pm2 start backoffice-api

# 4. Verify
curl http://localhost:3001/api/health
```

### Full Database Restore (If Needed)

```bash
# 1. Drop split databases
dropdb handled_data

# 2. Restore from backup
gunzip backup_pre_split_*.sql.gz
psql -U handled_user handled < backup_pre_split_*.sql

# 3. Verify restoration
psql -U handled_user handled -c "
  SELECT COUNT(*) FROM config.users;
  SELECT COUNT(*) FROM reference.carriers;
"

# 4. Application should work in single-DB mode now
```

---

## Communication Plan

### Before Deployment
- [ ] Email to all users: Maintenance window scheduled
- [ ] Slack announcement in #general
- [ ] Update status page (if applicable)

### During Deployment
- [ ] Post in #engineering: "Deployment in progress"
- [ ] Keep stakeholders updated every 30 minutes

### After Deployment
- [ ] Email to all users: "Maintenance complete"
- [ ] Post success message in #engineering
- [ ] Update status page

### If Issues Arise
- [ ] Immediate notification to tech lead
- [ ] Decision on rollback within 15 minutes
- [ ] Communicate to stakeholders
- [ ] Post-mortem document

---

## Sign-Off

### Code Review
- [ ] Reviewed by: _____________ Date: _______
- [ ] Approved by Tech Lead: _____________ Date: _______

### Testing
- [ ] Local testing complete: _____________ Date: _______
- [ ] Staging testing complete: _____________ Date: _______
- [ ] Integration tests passing: _____________ Date: _______

### Infrastructure
- [ ] DBaaS provisioned by: _____________ Date: _______
- [ ] Network configured by: _____________ Date: _______
- [ ] Staging validated by: _____________ Date: _______

### Deployment
- [ ] Executed by: _____________ Date: _______
- [ ] Validated by: _____________ Date: _______
- [ ] Documentation updated: _____________ Date: _______

---

**Deployment Status**: 🟡 Ready for Testing

**Next Action**: Begin Phase 1 developer testing
