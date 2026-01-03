#!/bin/bash

# Aiven MySQL Connection Script
# Usage: ./scripts/connect-mysql.sh
# 
# Required environment variables:
# - MYSQL_USER (default: avnadmin)
# - MYSQL_PASSWORD
# - MYSQL_HOST
# - MYSQL_PORT (default: 12308)
# - MYSQL_DATABASE (default: defaultdb)

MYSQL_USER="${MYSQL_USER:-avnadmin}"
MYSQL_PASSWORD="${MYSQL_PASSWORD}"
MYSQL_HOST="${MYSQL_HOST:-mysql-35ef1c03-shravan-3151.h.aivencloud.com}"
MYSQL_PORT="${MYSQL_PORT:-12308}"
MYSQL_DATABASE="${MYSQL_DATABASE:-defaultdb}"

if [ -z "$MYSQL_PASSWORD" ]; then
  echo "Error: MYSQL_PASSWORD environment variable is required"
  echo ""
  echo "Usage:"
  echo "  export MYSQL_PASSWORD='your-password'"
  echo "  ./scripts/connect-mysql.sh"
  echo ""
  echo "Or set all variables:"
  echo "  export MYSQL_USER='avnadmin'"
  echo "  export MYSQL_PASSWORD='your-password'"
  echo "  export MYSQL_HOST='your-host.aivencloud.com'"
  echo "  export MYSQL_PORT='12308'"
  echo "  export MYSQL_DATABASE='defaultdb'"
  exit 1
fi

echo "Connecting to Aiven MySQL database..."
echo "Host: $MYSQL_HOST"
echo "Port: $MYSQL_PORT"
echo "Database: $MYSQL_DATABASE"
echo ""

mysql \
  --user="$MYSQL_USER" \
  --password="$MYSQL_PASSWORD" \
  --host="$MYSQL_HOST" \
  --port="$MYSQL_PORT" \
  --ssl-mode=REQUIRED \
  "$MYSQL_DATABASE"
