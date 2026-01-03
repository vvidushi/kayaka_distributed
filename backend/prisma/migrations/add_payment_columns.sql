-- Migration: Add idempotency_key and metadata columns to payments table
-- This migration adds support for idempotent payment requests and payment metadata

-- Add idempotency_key column (for idempotent payment requests)
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(255) UNIQUE;

-- Add metadata column (for storing additional payment information)
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Create index on idempotency_key for faster lookups
CREATE INDEX IF NOT EXISTS idx_payments_idempotency_key ON payments(idempotency_key);

-- Create index on metadata for JSON queries (optional, but useful for filtering)
CREATE INDEX IF NOT EXISTS idx_payments_metadata ON payments USING GIN(metadata);

