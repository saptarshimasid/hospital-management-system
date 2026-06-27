-- Health Copilot Database Schema & Seed Data
-- -------------------------------------------------------------
-- Target Database: Supabase PostgreSQL
-- Instructions: Copy and run this script in the Supabase SQL Editor.
-- -------------------------------------------------------------

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- For gen_random_uuid() if needed

-- NOTE ON LOGIN & USER PROFILE DATA:
-- 1. The login authentication credentials (Email: saptarshimasid@gmail.com / Password: asdasdasd) are
--    managed on the client side at `client/src/app/page.tsx`.
-- 2. The User Profile credentials (Image, Name, Age, Email, Designation) are maintained and persisted 
--    in the browser client's localStorage (under the key "user_profile") to enable swift, dynamic, 
--    stateful updates across layout widgets without backend delay.
-- Therefore, no backend login/profile tables are necessary.

-- Create Table: patients
CREATE TABLE IF NOT EXISTS patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  condition TEXT NOT NULL,
  admission TEXT DEFAULT 'Just now',
  status TEXT DEFAULT 'Pending',
  img TEXT,
  gender TEXT,
  age INTEGER,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Table: appointments
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  doctor TEXT NOT NULL,
  dept TEXT NOT NULL,
  "time" TEXT NOT NULL,
  date TEXT NOT NULL,
  status TEXT DEFAULT 'confirmed',
  img TEXT,
  gender TEXT,
  age INTEGER,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Table: transactions
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_name TEXT NOT NULL,
  type TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  method TEXT NOT NULL,
  date TEXT NOT NULL,
  gender TEXT,
  age INTEGER,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Table: beds
CREATE TABLE IF NOT EXISTS beds (
  id TEXT PRIMARY KEY,
  ward TEXT NOT NULL,
  status TEXT DEFAULT 'available',
  patient TEXT,
  diagnosis TEXT,
  timer INTEGER DEFAULT 0,
  gender TEXT,
  age INTEGER
);

-- Create Table: surgeries
CREATE TABLE IF NOT EXISTS surgeries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room TEXT NOT NULL,
  patient_name TEXT NOT NULL,
  surgeon TEXT NOT NULL,
  procedure TEXT NOT NULL,
  "time" TEXT NOT NULL,
  status TEXT DEFAULT 'scheduled',
  img TEXT,
  gender TEXT,
  age INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Table: invoices
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_name TEXT NOT NULL,
  dept TEXT NOT NULL,
  services TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  date TEXT NOT NULL,
  status TEXT DEFAULT 'Pending',
  gender TEXT,
  age INTEGER,
  insurance_claimed BOOLEAN DEFAULT FALSE,
  claimed_amount NUMERIC DEFAULT 0,
  approved_amount NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Safely add columns to invoices if the table already exists
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS insurance_claimed BOOLEAN DEFAULT FALSE;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS claimed_amount NUMERIC DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS approved_amount NUMERIC DEFAULT 0;


-- Create Table: medications
CREATE TABLE IF NOT EXISTS medications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  dosage TEXT NOT NULL,
  sku TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  status TEXT DEFAULT 'In Stock',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Table: prescriptions
CREATE TABLE IF NOT EXISTS prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_name TEXT NOT NULL,
  drug TEXT NOT NULL,
  dosage TEXT NOT NULL,
  date TEXT NOT NULL,
  status TEXT DEFAULT 'dispensed',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Table: reports
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  date TEXT NOT NULL,
  size TEXT NOT NULL,
  author TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Table: doctors
CREATE TABLE IF NOT EXISTS doctors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  dept TEXT NOT NULL,
  status TEXT DEFAULT 'available',
  img TEXT,
  gender TEXT,
  age INTEGER,
  email TEXT,
  schedule TEXT DEFAULT '08:00 - 16:00',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Table: staff
CREATE TABLE IF NOT EXISTS staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  dept TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  img TEXT,
  gender TEXT,
  age INTEGER,
  email TEXT,
  shift TEXT DEFAULT 'Day Shift',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Table: notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  "time" TEXT DEFAULT 'Just now',
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Table: pantry_orders
CREATE TABLE IF NOT EXISTS pantry_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_name TEXT NOT NULL,
  room TEXT NOT NULL,
  item TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  status TEXT DEFAULT 'Pending',
  delivery_time TEXT DEFAULT 'ASAP',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Table: diagnoses
CREATE TABLE IF NOT EXISTS diagnoses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_name TEXT NOT NULL,
  age INTEGER NOT NULL,
  gender TEXT NOT NULL,
  doctor_name TEXT NOT NULL,
  test_type TEXT NOT NULL,
  test_date TEXT NOT NULL,
  results TEXT NOT NULL,
  status TEXT DEFAULT 'Completed',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Table: chat_vectors
CREATE TABLE IF NOT EXISTS chat_vectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt TEXT NOT NULL,
  response TEXT NOT NULL,
  category TEXT,
  embedding vector(3072),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Table: pantry_inventory
CREATE TABLE IF NOT EXISTS pantry_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  stock INTEGER DEFAULT 0,
  unit TEXT DEFAULT 'plates',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Table: dashboard_pages
CREATE TABLE IF NOT EXISTS dashboard_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  href TEXT NOT NULL UNIQUE,
  icon TEXT NOT NULL,
  subtitle TEXT,
  status TEXT DEFAULT 'active',
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Table: admin (dynamic tables schema)
CREATE TABLE IF NOT EXISTS "admin" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  status TEXT,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- -------------------------------------------------------------
-- SEED DATA SECTION
-- -------------------------------------------------------------

-- 1. Seed default dashboard navigation pages (if not already seeded)
INSERT INTO dashboard_pages (name, href, icon, subtitle, order_index)
VALUES 
  ('Dashboard', '/admin-dashboard', 'LayoutDashboard', 'Clinical Command Center', 1),
  ('Appointments', '/admin-dashboard/appointments', 'Calendar', 'Patient Intake & Scheduling', 2),
  ('Bed Availability', '/admin-dashboard/bed-availability', 'Bed', 'Bed Occupancy & Sanitation', 3),
  ('OT', '/admin-dashboard/ot', 'Scissors', 'Surgical Suites & Cases', 4),
  ('Doctor', '/admin-dashboard/doctor', 'User', 'Physician Registry', 5),
  ('Patients', '/admin-dashboard/patients', 'Users', 'Admitted Patients', 6),
  ('Staff', '/admin-dashboard/staff', 'Briefcase', 'Clinical Personnel Shifts', 7),
  ('Pharmacy', '/admin-dashboard/pharmacy', 'Pill', 'Medications & Stock', 8),
  ('Diagnosis', '/admin-dashboard/diagnosis', 'Activity', 'Laboratory Results', 9),
  ('Pantry', '/admin-dashboard/pantry', 'Utensils', 'Diet & Meals', 10),
  ('Billing', '/admin-dashboard/billing', 'DollarSign', 'Patient Ledger', 11),
  ('Revenue', '/admin-dashboard/revenue', 'TrendingUp', 'Revenue Telemetry', 12),
  ('Reports', '/admin-dashboard/reports', 'BarChart', 'Medical Records & Docs', 13)
ON CONFLICT (href) DO UPDATE 
SET name = EXCLUDED.name, icon = EXCLUDED.icon, subtitle = EXCLUDED.subtitle, order_index = EXCLUDED.order_index;

-- 2. Seed pantry food inventory items (if not already seeded)
INSERT INTO pantry_inventory (name, stock, unit)
VALUES 
  ('Chicken Meal', 100, 'plates'),
  ('Veg Meal', 100, 'plates'),
  ('Soup', 150, 'plates'),
  ('Idly', 200, 'plates'),
  ('Fried Rice (Chicken)', 80, 'plates'),
  ('Fried Rice (Veg)', 80, 'plates'),
  ('Tea', 300, 'cups'),
  ('Coffee', 300, 'cups'),
  ('Cookies', 500, 'pieces')
ON CONFLICT (name) DO UPDATE 
SET stock = EXCLUDED.stock, unit = EXCLUDED.unit;

-- 3. Seed 570 hospital beds (using generate_series for optimization)
-- Delete existing beds to avoid duplicates during seeding
TRUNCATE TABLE beds;

-- 50 ICU beds
INSERT INTO beds (id, ward, status, patient, diagnosis, timer)
SELECT 'ICU-' || lpad(g.id::text, 2, '0'), 'ICU', 'available', '', '', 0
FROM generate_series(1, 50) AS g(id);

-- 20 VIP suite beds
INSERT INTO beds (id, ward, status, patient, diagnosis, timer)
SELECT 'VIP-' || lpad(g.id::text, 2, '0'), 'VIP', 'available', '', '', 0
FROM generate_series(1, 20) AS g(id);

-- 200 Men's Ward beds (under General ward)
INSERT INTO beds (id, ward, status, patient, diagnosis, timer)
SELECT 'M-' || lpad(g.id::text, 3, '0'), 'General', 'available', '', '', 0
FROM generate_series(1, 200) AS g(id);

-- 200 Women's Ward beds (under General ward)
INSERT INTO beds (id, ward, status, patient, diagnosis, timer)
SELECT 'W-' || lpad(g.id::text, 3, '0'), 'General', 'available', '', '', 0
FROM generate_series(1, 200) AS g(id);

-- 50 ER beds
INSERT INTO beds (id, ward, status, patient, diagnosis, timer)
SELECT 'ER-' || lpad(g.id::text, 2, '0'), 'ER', 'available', '', '', 0
FROM generate_series(1, 50) AS g(id);

-- 50 Pediatric beds
INSERT INTO beds (id, ward, status, patient, diagnosis, timer)
SELECT 'PED-' || lpad(g.id::text, 2, '0'), 'Pediatrics', 'available', '', '', 0
FROM generate_series(1, 50) AS g(id);

-- -------------------------------------------------------------
-- DISABLE ROW LEVEL SECURITY (RLS) FOR CLIENT-SIDE ANONYMOUS ACCESS
-- -------------------------------------------------------------
ALTER TABLE IF EXISTS patients DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS appointments DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS beds DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS surgeries DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS medications DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS prescriptions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS reports DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS doctors DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS staff DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS pantry_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS diagnoses DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS chat_vectors DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS pantry_inventory DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS dashboard_pages DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "admin" DISABLE ROW LEVEL SECURITY;

