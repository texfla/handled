#!/bin/bash
# Handled Database - Developer Setup Script
# Run this once per machine to set up local development database
set -e

echo "================================================"
echo "Handled Database - Developer Setup"
echo "================================================"
echo ""

# Detect PostgreSQL version and set PATH
if [ -d "/opt/homebrew/opt/postgresql@17/bin" ]; then
    export PATH="/opt/homebrew/opt/postgresql@17/bin:$PATH"
    echo "✓ Found PostgreSQL 17"
elif [ -d "/opt/homebrew/opt/postgresql@16/bin" ]; then
    export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"
    echo "✓ Found PostgreSQL 16"
elif [ -d "/opt/homebrew/bin" ]; then
    export PATH="/opt/homebrew/bin:$PATH"
    echo "✓ Using Homebrew PostgreSQL"
elif [ -d "/usr/local/bin" ]; then
    export PATH="/usr/local/bin:$PATH"
    echo "✓ Using system PostgreSQL"
fi

echo ""

# Check PostgreSQL is running
echo "Checking PostgreSQL status..."
if ! pg_isready > /dev/null 2>&1; then
  echo "❌ PostgreSQL is not running"
  echo ""
  echo "To start PostgreSQL:"
  echo "  macOS (Homebrew): brew services start postgresql@17"
  echo "                    or: brew services start postgresql@16"
  echo "  Linux: sudo systemctl start postgresql"
  echo ""
  exit 1
fi

echo "✓ PostgreSQL is running"
echo ""

# Create handled_user (for migrations and app)
echo "Creating handled_user (superuser for local dev)..."
if psql postgres -tAc "SELECT 1 FROM pg_roles WHERE rolname='handled_user'" 2>/dev/null | grep -q 1; then
  echo "  ℹ  handled_user already exists"
else
  createuser -s handled_user 2>/dev/null  # Superuser, no password needed locally
  if [ $? -eq 0 ]; then
    echo "  ✓ Created handled_user (superuser)"
  else
    echo "  ❌ Failed to create handled_user"
    exit 1
  fi
fi

# Create handled_dev database
echo ""
echo "Creating handled_dev database..."
if psql postgres -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw handled_dev; then
  echo "  ℹ  handled_dev already exists"
else
  createdb -O handled_user handled_dev 2>/dev/null
  if [ $? -eq 0 ]; then
    echo "  ✓ Created handled_dev (owner: handled_user)"
  else
    echo "  ❌ Failed to create handled_dev"
    exit 1
  fi
fi

# Grant your user access (convenience for direct queries)
echo ""
echo "Granting permissions to $(whoami)..."
psql handled_dev -c "GRANT ALL ON DATABASE handled_dev TO $(whoami);" > /dev/null 2>&1
echo "  ✓ Granted permissions"

# Set environment variables for migration
export PRIMARY_DATABASE_URL="postgresql://handled_user@localhost:5432/handled_dev"
export DATA_DATABASE_URL="postgresql://handled_user@localhost:5432/handled_dev"

# Run migrations
echo ""
echo "Running initial migrations..."
if [ -f "database/migrate-all.sh" ]; then
  bash database/migrate-all.sh
  if [ $? -eq 0 ]; then
    echo "  ✓ Migrations complete"
  else
    echo "  ⚠  Some migrations may have failed"
  fi
else
  echo "  ⚠  migrate-all.sh not found, run migrations manually later"
fi

# Test connections
echo ""
echo "Testing connections..."

# Test as current user
if psql handled_dev -c "SELECT 1;" > /dev/null 2>&1; then
  echo "  ✓ Can connect as $(whoami)"
else
  echo "  ⚠  Cannot connect as $(whoami) (not critical)"
fi

# Test as handled_user
if psql "postgresql://handled_user@localhost:5432/handled_dev" -c "SELECT 1;" > /dev/null 2>&1; then
  echo "  ✓ Can connect as handled_user"
else
  echo "  ❌ Cannot connect as handled_user"
  exit 1
fi

echo ""
echo "================================================"
echo "✅ Setup complete!"
echo "================================================"
echo ""
echo "Next steps:"
echo "  1. Copy environment template:"
echo "     cp apps/backoffice/api/env-template.txt apps/backoffice/api/.env"
echo ""
echo "  2. Install dependencies:"
echo "     pnpm install"
echo ""
echo "  3. Start development server:"
echo "     pnpm dev"
echo ""
echo "Database info:"
echo "  Database: handled_dev"
echo "  User: handled_user"
echo "  Connect: psql -U handled_user handled_dev"
echo ""
echo "Tip: Add to ~/.zshrc or ~/.bashrc for convenience:"
echo "  export PGUSER=handled_user"
echo "  # Then you can just use: psql handled_dev"
echo ""
