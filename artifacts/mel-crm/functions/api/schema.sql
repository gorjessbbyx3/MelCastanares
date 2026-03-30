-- Mel's CRM · D1 Schema
-- Run: npx wrangler d1 execute mel-crm-db --file=artifacts/mel-crm/functions/api/schema.sql --remote

CREATE TABLE IF NOT EXISTS crm_sessions (
  id TEXT PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS crm_leads (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT, phone TEXT,
  intent TEXT DEFAULT 'buy', status TEXT DEFAULT 'new', source TEXT DEFAULT 'website',
  price_min INTEGER DEFAULT 0, price_max INTEGER DEFAULT 0, neighborhoods TEXT,
  beds_min REAL DEFAULT 0, baths_min REAL DEFAULT 0,
  pre_approval TEXT DEFAULT 'unknown', pre_approval_amount INTEGER DEFAULT 0,
  timeline TEXT, property_address TEXT, estimated_value INTEGER DEFAULT 0,
  notes TEXT, next_step TEXT, next_step_date TEXT,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS crm_tasks (
  id TEXT PRIMARY KEY, title TEXT NOT NULL, type TEXT DEFAULT 'follow-up',
  lead_id TEXT, lead_name TEXT, due_date TEXT, due_time TEXT,
  priority TEXT DEFAULT 'medium', completed INTEGER DEFAULT 0, notes TEXT, created_at TEXT NOT NULL,
  FOREIGN KEY (lead_id) REFERENCES crm_leads(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS crm_commissions (
  id TEXT PRIMARY KEY, lead_id TEXT, client_name TEXT NOT NULL, property_address TEXT NOT NULL,
  sale_price INTEGER DEFAULT 0, commission_rate REAL DEFAULT 3, commission_amount INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending', close_date TEXT, notes TEXT, created_at TEXT NOT NULL,
  FOREIGN KEY (lead_id) REFERENCES crm_leads(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS crm_events (
  id TEXT PRIMARY KEY, title TEXT NOT NULL, type TEXT DEFAULT 'appointment',
  date TEXT NOT NULL, time TEXT, end_time TEXT,
  lead_id TEXT, lead_name TEXT, location TEXT, notes TEXT, created_at TEXT NOT NULL,
  FOREIGN KEY (lead_id) REFERENCES crm_leads(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS crm_todos (
  id TEXT PRIMARY KEY, title TEXT NOT NULL, category TEXT DEFAULT 'general',
  completed INTEGER DEFAULT 0, due_date TEXT, created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS crm_files (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, category TEXT DEFAULT 'other',
  url TEXT, notes TEXT, size TEXT, created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS crm_content_ideas (
  id TEXT PRIMARY KEY, text TEXT NOT NULL, topic TEXT, pinned INTEGER DEFAULT 1, created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_leads_status ON crm_leads(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON crm_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_completed ON crm_tasks(completed);
CREATE INDEX IF NOT EXISTS idx_commissions_status ON crm_commissions(status);
CREATE INDEX IF NOT EXISTS idx_events_date ON crm_events(date);
CREATE INDEX IF NOT EXISTS idx_todos_completed ON crm_todos(completed);

CREATE TABLE IF NOT EXISTS crm_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS crm_expenses (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  category TEXT DEFAULT 'Other',
  vendor TEXT NOT NULL,
  description TEXT,
  amount REAL DEFAULT 0,
  receipt_url TEXT,
  tax_deductible INTEGER DEFAULT 1,
  notes TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_expenses_date ON crm_expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON crm_expenses(category);

CREATE TABLE IF NOT EXISTS crm_transactions (
  id TEXT PRIMARY KEY,
  lead_id TEXT,
  client_name TEXT NOT NULL,
  property_address TEXT NOT NULL,
  transaction_type TEXT DEFAULT 'buy',
  status TEXT DEFAULT 'active',
  list_price INTEGER DEFAULT 0,
  sale_price INTEGER DEFAULT 0,
  commission_rate REAL DEFAULT 3,
  commission_amount INTEGER DEFAULT 0,
  contract_date TEXT,
  escrow_open_date TEXT,
  inspection_deadline TEXT,
  disclosure_deadline TEXT,
  loan_contingency_date TEXT,
  title_clear_date TEXT,
  hoa_docs_date TEXT,
  closing_date TEXT,
  milestones TEXT DEFAULT '[]',
  notes TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (lead_id) REFERENCES crm_leads(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON crm_transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_closing_date ON crm_transactions(closing_date);

-- Lead DNA columns (ALTER TABLE at runtime if not present)
-- ALTER TABLE crm_leads ADD COLUMN lead_dna TEXT;
-- ALTER TABLE crm_leads ADD COLUMN lead_dna_updated TEXT;
