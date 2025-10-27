#!/bin/bash

# Script to run all pending migrations on Supabase
# Usage: ./run-migrations.sh

echo "🚀 Running Skills Intelligence System Migrations..."
echo ""

# Load environment variables
source .env.local

# Database connection string (from Supabase)
DB_HOST="aws-0-us-east-1.pooler.supabase.com"
DB_PORT="6543"
DB_NAME="postgres"
DB_USER="postgres.ytknzkfdyvuwazoigisd"
DB_PASSWORD="BxMF5PjPJ1wOLfMo"

# Function to run a migration
run_migration() {
    local migration_file=$1
    local migration_name=$(basename "$migration_file")

    echo "📄 Running: $migration_name"

    PGPASSWORD="$DB_PASSWORD" psql \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        -f "$migration_file" \
        2>&1

    if [ $? -eq 0 ]; then
        echo "✅ $migration_name completed successfully"
    else
        echo "❌ $migration_name failed"
        return 1
    fi

    echo ""
}

# Run migrations in order
migrations=(
    "010_per_tenant_module_configuration.sql"
    "011_modules_and_features_schema.sql"
    "012_role_based_module_features.sql"
)

for migration in "${migrations[@]}"; do
    if [ -f "$migration" ]; then
        run_migration "$migration"
    else
        echo "⚠️  Migration file not found: $migration"
        echo "   Skipping..."
        echo ""
    fi
done

echo "🎉 All migrations completed!"
echo ""
echo "Next steps:"
echo "1. Visit: http://localhost:3001/super-admin"
echo "2. Add Demo1 organization"
echo "3. Configure reports and modules"
