-- ============================================================================
-- Migration: Create customers table for customer information registration
-- ============================================================================
-- Run this SQL in your Supabase SQL Editor to create the customers table
-- with proper Row Level Security (RLS) policies.

-- Create the customers table
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  national_id TEXT NOT NULL,
  company_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Policy: Allow public (anon key) to INSERT customer records
-- This allows the registration form to submit data without authentication
CREATE POLICY "Allow public insert on customers"
  ON public.customers
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Policy: Allow only authenticated users to SELECT customer records
-- This protects customer data from unauthorized access
-- Admin users (who have admin session) can read through the admin dashboard
CREATE POLICY "Allow authenticated read on customers"
  ON public.customers
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Allow only authenticated users to UPDATE customer records
CREATE POLICY "Allow authenticated update on customers"
  ON public.customers
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Allow only authenticated users to DELETE customer records
CREATE POLICY "Allow authenticated delete on customers"
  ON public.customers
  FOR DELETE
  TO authenticated
  USING (true);

-- Add helpful comments
COMMENT ON TABLE public.customers IS 'Customer registration data collected from the user-information page';
COMMENT ON COLUMN public.customers.national_id IS 'Egyptian National ID - 14 digits, masked in admin dashboard';
COMMENT ON COLUMN public.customers.company_name IS 'Optional company name';

-- ============================================================================
-- Realtime: Enable realtime for customers table
-- ============================================================================
-- Enable realtime replication for the customers table so new registrations
-- appear automatically in the admin dashboard without refreshing.
-- Run this in Supabase SQL Editor or via the Realtime API in the Supabase Dashboard.

-- Note: Realtime must be enabled in the Supabase Dashboard under
-- Realtime > Tables > customers for the postgres_changes subscription to work.

-- ============================================================================
-- Indexes for performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON public.customers(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customers_national_id ON public.customers(national_id);
CREATE INDEX IF NOT EXISTS idx_customers_email ON public.customers(email);