#!/bin/bash

# Load environment variables from .env file
# Usage: source ./scripts/load-env.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$PROJECT_ROOT/.env"

if [ -f "$ENV_FILE" ]; then
    # Export all variables from .env
    set -a
    source "$ENV_FILE"
    set +a
    
    echo "Environment variables loaded from .env"
    echo "  AWS Profile: $AWS_PROFILE"
    echo "  AWS Region: $AWS_REGION"
    echo "  AWS Account: $AWS_ACCOUNT_ID"
    echo "  Project: $TF_VAR_project"
    echo "  Environment: $TF_VAR_environment"
else
    echo "Error: .env file not found at: $ENV_FILE"
    echo "Copy .env.example to .env and fill in your values"
    return 1
fi

