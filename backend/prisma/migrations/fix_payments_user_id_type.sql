-- Migration: Fix payments.user_id type from UUID to TEXT
-- This migration changes payments.user_id to TEXT to store MongoDB ObjectIds
-- Run this migration after users.id has been changed to TEXT

-- Step 1: Drop foreign key constraint on payments.user_id
ALTER TABLE payments 
DROP CONSTRAINT IF EXISTS payments_user_id_fkey;

-- Step 2: Change payments.user_id column type from UUID to TEXT
ALTER TABLE payments 
ALTER COLUMN user_id TYPE TEXT USING user_id::text;

-- Step 3: Add comment explaining the column type
COMMENT ON COLUMN payments.user_id IS 'MongoDB ObjectId stored as TEXT (24-char hex string)';

-- Note: Index on user_id will remain and work with TEXT type
-- CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);

