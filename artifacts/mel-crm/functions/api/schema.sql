-- Mel's CRM · D1 Schema
-- Run: npx wrangler d1 execute mel-crm-db --file=functions/api/schema.sql --remote

CREATE TABLE IF NOT EXISTS crm_sessions (
  id TEXT PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS crm_leads (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  intent TEXT DEFAULT 'buy',
  status TEXT DEFAULT 'new',
  source TEXT DEFAULT 'website',
  price_min INTEGER DEFAULT 0,
  price_max INTEGER DEFAULT 0,
  neighborhoods TEXT,
  beds_min REAL DEFAULT 0,
  baths_min REAL DEFAULT 0,
  pre_approval TEXT DEFAULT 'unknown',
  pre_approval_amount INTEGER DEFAULT 0,
  timeline TEXT,
  property_address TEXT,
  estimated_value INTEGER DEFAULT 0,
  notes TEXT,
  next_step TEXT,
  next_step_date TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS crm_tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT DEFAULT 'follow-up',
  lead_id TEXT,
  lead_name TEXT,
  due_date TEXT,
  due_time TEXT,
  priority TEXT DEFAULT 'medium',
  completed INTEGER DEFAULT 0,
  notes TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (lead_id) REFERENCES crm_leads(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS crm_commissions (
  id TEXT PRIMARY KEY,
  lead_id TEXT,
  client_name TEXT NOT NULL,
  property_address TEXT NOT NULL,
  sale_price INTEGER DEFAULT 0,
  commission_rate REAL DEFAULT 3,
  commission_amount INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',
  close_date TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (lead_id) REFERENCES crm_leads(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_leads_status ON crm_leads(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON crm_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_completed ON crm_tasks(completed);
CREATE INDEX IF NOT EXISTS idx_commissions_status ON crm_commissions(status);
