#!/bin/bash

# Database Switcher Script
# Usage: ./scripts/switch-db.sh [dev|prod|local]

ENV_FILE=".env"

case "$1" in
  dev)
    echo "Switching to DEVELOPMENT database..."
    sed -i.bak 's|^DATABASE_URL=.*|DATABASE_URL=${DATABASE_URL_DEV}|' $ENV_FILE
    echo "✅ Now using development database"
    ;;
  prod)
    echo "⚠️  Switching to PRODUCTION database..."
    read -p "Are you sure? (yes/no): " confirm
    if [ "$confirm" = "yes" ]; then
      sed -i.bak 's|^DATABASE_URL=.*|DATABASE_URL=${DATABASE_URL_PROD}|' $ENV_FILE
      echo "✅ Now using production database"
    else
      echo "❌ Cancelled"
    fi
    ;;
  local)
    echo "Switching to LOCAL database..."
    sed -i.bak 's|^DATABASE_URL=.*|DATABASE_URL=${DATABASE_URL_LOCAL}|' $ENV_FILE
    echo "✅ Now using local database"
    ;;
  *)
    echo "Usage: $0 [dev|prod|local]"
    echo ""
    echo "Examples:"
    echo "  $0 dev    - Switch to development database"
    echo "  $0 prod   - Switch to production database"
    echo "  $0 local  - Switch to local database"
    exit 1
    ;;
esac

# Show current database
echo ""
echo "Current DATABASE_URL in .env:"
grep "^DATABASE_URL=" $ENV_FILE
