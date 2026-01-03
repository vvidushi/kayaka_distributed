#!/bin/bash
# Script to generate requirements.txt from pyproject.toml using uv

set -e

# Check if uv is installed
if ! command -v uv &> /dev/null; then
    echo "Error: uv is not installed. Please install it first:"
    echo "  curl -LsSf https://astral.sh/uv/install.sh | sh"
    exit 1
fi

# Create virtual environment if it doesn't exist
if [ ! -d ".venv" ]; then
    echo "Creating virtual environment with Python 3.12..."
    uv venv --python 3.12
fi

# Sync dependencies from pyproject.toml
echo "Syncing dependencies from pyproject.toml..."
uv sync --no-dev

# Export requirements.txt using uv pip freeze, excluding the local package and file references
echo "Generating requirements.txt..."
uv pip freeze | grep -v "kayak-ai-agent" | grep -v "file://" > requirements.txt

echo "requirements.txt generated successfully"

