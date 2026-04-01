-- ============================================================
-- Mel Castanares CRM — Level-Up Migration
-- Features: Email Inbox, Activity Log, Follow-ups, 
--           Notifications, Outreach Templates,
--           Bookings with Routes, Financial Dashboard
-- ============================================================

-- ── 1. Email System (from TechSavvy Admin) ──────────────────

CREATE TABLE IF NOT EXISTS crm_email_config (
  id TEXT PRIMARY KEY DEFAULT 'default',
  enabled INTEGER NOT NULL DEFAULT 1,
  from_email TEXT NOT NULL DEFAULT 'melcastanares@techsavvyhawaii.com',
  from_name TEXT NOT NULL DEFAULT 'Mel Castanares - Hawaii Realtor',
  auto_confirm_enabled INTEGER NOT NULL DEFAULT 1,
  forward_copy_to TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO crm_email_config (id, enabled, from_email, from_name, auto_confirm_enabled, forward_copy_to, updated_at)
VALUES ('default', 1, 'melcastanares@techsavvyhawaii.com', 'Mel Castanares - Hawaii Realtor', 1, '', datetime('now'));

CREATE TABLE IF NOT EXISTS crm_email_threads (
  id TEXT PRIMARY KEY,
  subject TEXT NOT NULL DEFAULT '',
  lead_id TEXT NOT NULL DEFAULT '',
  contact_email TEXT NOT NULL DEFAULT '',
  contact_name TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT 'direct',  -- direct, contact-form, outreach, outreach-reply, showing-followup
  status TEXT NOT NULL DEFAULT 'open',    -- open, replied, closed, archived
  folder TEXT NOT NULL DEFAULT 'inbox',   -- inbox, sent, drafts, spam, archived
  starred INTEGER NOT NULL DEFAULT 0,
  ai_intent TEXT NOT NULL DEFAULT '',
  ai_priority TEXT NOT NULL DEFAULT 'normal',
  ai_sentiment TEXT NOT NULL DEFAULT 'neutral',
  unread INTEGER NOT NULL DEFAULT 1,
  last_message_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  email_account TEXT NOT NULL DEFAULT 'melcastanares@techsavvyhawaii.com'
);

CREATE TABLE IF NOT EXISTS crm_email_messages (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL,
  direction TEXT NOT NULL DEFAULT 'inbound',  -- inbound, outbound
  from_email TEXT NOT NULL DEFAULT '',
  from_name TEXT NOT NULL DEFAULT '',
  to_email TEXT NOT NULL DEFAULT '',
  subject TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  html_body TEXT NOT NULL DEFAULT '',
  resend_id TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'sent',
  sent_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (thread_id) REFERENCES crm_email_threads(id)
);

CREATE TABLE IF NOT EXISTS crm_outreach_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT 'custom',  -- showing-followup, open-house-followup, new-listing, price-change, closing-congrats, buyer-nurture, seller-nurture, custom
  subject TEXT NOT NULL DEFAULT '',
  html_body TEXT NOT NULL DEFAULT '',
  text_body TEXT NOT NULL DEFAULT '',
  variables TEXT NOT NULL DEFAULT '[]',  -- JSON array of template variable names
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_email_threads_lead ON crm_email_threads(lead_id);
CREATE INDEX IF NOT EXISTS idx_email_threads_contact ON crm_email_threads(contact_email);
CREATE INDEX IF NOT EXISTS idx_email_threads_folder ON crm_email_threads(folder);
CREATE INDEX IF NOT EXISTS idx_email_messages_thread ON crm_email_messages(thread_id);

-- ── 2. Activity Log (from TechSavvy Admin) ──────────────────

CREATE TABLE IF NOT EXISTS crm_activity_log (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL DEFAULT '',
  details TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT 'general',  -- email, call, showing, note, meeting, offer, closing, general
  timestamp TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS crm_lead_activities (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL DEFAULT '',
  transaction_id TEXT NOT NULL DEFAULT '',
  user_id TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT 'note',  -- note, email, call, showing, open-house, offer, counter-offer, inspection, appraisal, closing, meeting, text, document
  title TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  metadata TEXT NOT NULL DEFAULT '{}',  -- JSON for extra structured data
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_lead_activities_lead ON crm_lead_activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_activities_tx ON crm_lead_activities(transaction_id);

-- ── 3. Follow-up System (from ProFlow) ──────────────────────

CREATE TABLE IF NOT EXISTS crm_followups (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL DEFAULT '',
  lead_name TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT 'general',  -- showing, open-house, inquiry, offer, closing, check-in, anniversary, referral-ask
  method TEXT NOT NULL DEFAULT 'email',  -- email, call, text
  due_date TEXT NOT NULL DEFAULT '',
  due_time TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',  -- pending, completed, skipped, overdue
  notes TEXT NOT NULL DEFAULT '',
  completed_at TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_followups_lead ON crm_followups(lead_id);
CREATE INDEX IF NOT EXISTS idx_followups_status ON crm_followups(status);
CREATE INDEX IF NOT EXISTS idx_followups_due ON crm_followups(due_date);

-- ── 4. Notifications Engine (from ProFlow) ──────────────────

CREATE TABLE IF NOT EXISTS crm_notifications (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL DEFAULT 'general',  -- deadline, followup, overdue, lead-cold, showing-reminder, closing-update, new-lead, system
  title TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL DEFAULT '',
  action_url TEXT NOT NULL DEFAULT '',
  lead_id TEXT NOT NULL DEFAULT '',
  transaction_id TEXT NOT NULL DEFAULT '',
  read INTEGER NOT NULL DEFAULT 0,
  dismissed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_notifications_read ON crm_notifications(read);

-- ── 5. Outreach Templates are created above with crm_outreach_templates

-- ── 10. Showings/Bookings with Route Optimization ───────────
-- (Extends existing crm_events with showing-specific fields)

CREATE TABLE IF NOT EXISTS crm_showings (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL DEFAULT '',
  lead_name TEXT NOT NULL DEFAULT '',
  property_address TEXT NOT NULL DEFAULT '',
  property_mls TEXT NOT NULL DEFAULT '',
  date TEXT NOT NULL DEFAULT '',
  time TEXT NOT NULL DEFAULT '',
  end_time TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'scheduled',  -- scheduled, confirmed, completed, cancelled, no-show
  feedback TEXT NOT NULL DEFAULT '',         -- client feedback after showing
  rating INTEGER NOT NULL DEFAULT 0,         -- 1-5 client interest rating
  lat REAL,
  lng REAL,
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_showings_lead ON crm_showings(lead_id);
CREATE INDEX IF NOT EXISTS idx_showings_date ON crm_showings(date);

-- ── 12. Client Follow-up Cadences ───────────────────────────

CREATE TABLE IF NOT EXISTS crm_followup_cadences (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT 'buyer',  -- buyer, seller, past-client, referral-partner
  steps TEXT NOT NULL DEFAULT '[]',    -- JSON array: [{day: 1, method: "email", template: "showing-followup"}, ...]
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS crm_cadence_enrollments (
  id TEXT PRIMARY KEY,
  cadence_id TEXT NOT NULL,
  lead_id TEXT NOT NULL,
  current_step INTEGER NOT NULL DEFAULT 0,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  next_action_date TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active',  -- active, paused, completed, cancelled
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (cadence_id) REFERENCES crm_followup_cadences(id),
  FOREIGN KEY (lead_id) REFERENCES crm_leads(id)
);

CREATE INDEX IF NOT EXISTS idx_enrollments_lead ON crm_cadence_enrollments(lead_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_next ON crm_cadence_enrollments(next_action_date);

-- ── 13. Financial Dashboard (enhanced) ──────────────────────

CREATE TABLE IF NOT EXISTS crm_income (
  id TEXT PRIMARY KEY,
  transaction_id TEXT NOT NULL DEFAULT '',
  lead_id TEXT NOT NULL DEFAULT '',
  client_name TEXT NOT NULL DEFAULT '',
  property_address TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT 'commission',  -- commission, referral-fee, consulting, bonus
  amount REAL NOT NULL DEFAULT 0,
  date TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_income_date ON crm_income(date);
CREATE INDEX IF NOT EXISTS idx_income_type ON crm_income(type);

-- Add category index on existing expenses
CREATE INDEX IF NOT EXISTS idx_expenses_date ON crm_expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON crm_expenses(category);

-- ── Seed default outreach templates ─────────────────────────

INSERT OR IGNORE INTO crm_outreach_templates (id, name, type, subject, text_body, variables, created_at, updated_at)
VALUES 
  ('tmpl-showing-followup', 'Showing Follow-Up', 'showing-followup', 
   'Great seeing you at {{propertyAddress}}!', 
   'It was great showing you the property. Let me know if you have any questions!',
   '["clientName","propertyAddress","agentName"]', datetime('now'), datetime('now')),
  ('tmpl-open-house', 'Open House Follow-Up', 'open-house-followup',
   'Thanks for visiting the open house at {{propertyAddress}}',
   'Thanks for stopping by! I would love to help you find your perfect home.',
   '["clientName","propertyAddress","agentName"]', datetime('now'), datetime('now')),
  ('tmpl-new-listing', 'New Listing Alert', 'new-listing',
   'New listing I think you will love — {{propertyAddress}}',
   'A new property just hit the market that matches what you are looking for!',
   '["clientName","propertyAddress","price","beds","baths","agentName"]', datetime('now'), datetime('now')),
  ('tmpl-price-change', 'Price Change Alert', 'price-change',
   'Price update on {{propertyAddress}}',
   'The property you were interested in just had a price change.',
   '["clientName","propertyAddress","oldPrice","newPrice","agentName"]', datetime('now'), datetime('now')),
  ('tmpl-closing-congrats', 'Closing Congratulations', 'closing-congrats',
   'Congratulations on your new home! 🏡',
   'It has been an honor helping you find your dream home. Welcome to your new chapter!',
   '["clientName","propertyAddress","agentName"]', datetime('now'), datetime('now')),
  ('tmpl-buyer-nurture', 'Buyer Nurture', 'buyer-nurture',
   'Still searching? Here is your Hawaii market update',
   'Just checking in on your home search. The market is moving and I want to keep you updated.',
   '["clientName","agentName"]', datetime('now'), datetime('now')),
  ('tmpl-seller-nurture', 'Seller Nurture', 'seller-nurture',
   'Thinking about selling? Here is what your home could be worth',
   'I have been watching the market in your area and wanted to share some insights.',
   '["clientName","neighborhood","agentName"]', datetime('now'), datetime('now'));

-- ── Seed default follow-up cadences ─────────────────────────

INSERT OR IGNORE INTO crm_followup_cadences (id, name, type, steps, active, created_at)
VALUES
  ('cad-buyer', 'New Buyer Lead', 'buyer', 
   '[{"day":0,"method":"email","template":"showing-followup","note":"Welcome email"},{"day":1,"method":"call","note":"Intro call to discuss needs"},{"day":3,"method":"email","template":"new-listing","note":"Send matching listings"},{"day":7,"method":"call","note":"Check-in call"},{"day":14,"method":"email","template":"buyer-nurture","note":"Market update"},{"day":30,"method":"call","note":"Monthly check-in"}]',
   1, datetime('now')),
  ('cad-seller', 'New Seller Lead', 'seller',
   '[{"day":0,"method":"email","template":"seller-nurture","note":"Initial CMA offer"},{"day":2,"method":"call","note":"Discuss pricing strategy"},{"day":7,"method":"email","note":"Market comp update"},{"day":14,"method":"call","note":"Follow up on listing decision"},{"day":30,"method":"email","note":"Monthly market update"}]',
   1, datetime('now')),
  ('cad-past-client', 'Past Client Nurture', 'past-client',
   '[{"day":90,"method":"email","note":"90-day check-in"},{"day":180,"method":"call","note":"6-month check-in"},{"day":365,"method":"email","template":"closing-congrats","note":"Home anniversary"}]',
   1, datetime('now'));
