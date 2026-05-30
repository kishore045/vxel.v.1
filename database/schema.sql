CREATE TABLE IF NOT EXISTS Users (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'client')),
  client_id VARCHAR(64),
  status VARCHAR(24) NOT NULL DEFAULT 'active',
  reset_token_hash TEXT,
  reset_token_expires_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Clients (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(180) NOT NULL,
  owner_user_id VARCHAR(64),
  status VARCHAR(40) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_user_id) REFERENCES Users(id)
);

CREATE TABLE IF NOT EXISTS Projects (
  id VARCHAR(64) PRIMARY KEY,
  client_id VARCHAR(64) NOT NULL,
  name VARCHAR(220) NOT NULL,
  status VARCHAR(60) NOT NULL,
  progress INTEGER NOT NULL DEFAULT 0,
  start_date DATE,
  due_date DATE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES Clients(id)
);

CREATE TABLE IF NOT EXISTS Reports (
  id VARCHAR(64) PRIMARY KEY,
  client_id VARCHAR(64) NOT NULL,
  project_id VARCHAR(64),
  title VARCHAR(220) NOT NULL,
  file_url TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES Clients(id),
  FOREIGN KEY (project_id) REFERENCES Projects(id)
);

CREATE TABLE IF NOT EXISTS Invoices (
  id VARCHAR(64) PRIMARY KEY,
  client_id VARCHAR(64) NOT NULL,
  invoice_number VARCHAR(80) NOT NULL UNIQUE,
  amount DECIMAL(12,2) NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'pending',
  file_url TEXT,
  issued_at DATE,
  due_at DATE,
  FOREIGN KEY (client_id) REFERENCES Clients(id)
);

CREATE TABLE IF NOT EXISTS Tickets (
  id VARCHAR(64) PRIMARY KEY,
  client_id VARCHAR(64) NOT NULL,
  created_by VARCHAR(64) NOT NULL,
  subject VARCHAR(220) NOT NULL,
  description TEXT,
  status VARCHAR(40) NOT NULL DEFAULT 'open',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES Clients(id),
  FOREIGN KEY (created_by) REFERENCES Users(id)
);

CREATE TABLE IF NOT EXISTS Leads (
  id VARCHAR(64) PRIMARY KEY,
  client_id VARCHAR(64),
  name VARCHAR(180) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(60),
  source VARCHAR(120),
  status VARCHAR(40) NOT NULL DEFAULT 'new',
  value DECIMAL(12,2) DEFAULT 0,
  assigned_to VARCHAR(64),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES Clients(id),
  FOREIGN KEY (assigned_to) REFERENCES Users(id)
);

CREATE TABLE IF NOT EXISTS Tasks (
  id VARCHAR(64) PRIMARY KEY,
  project_id VARCHAR(64),
  client_id VARCHAR(64),
  assigned_to VARCHAR(64),
  title VARCHAR(220) NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'todo',
  due_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES Projects(id),
  FOREIGN KEY (client_id) REFERENCES Clients(id),
  FOREIGN KEY (assigned_to) REFERENCES Users(id)
);

CREATE TABLE IF NOT EXISTS Meetings (
  id VARCHAR(64) PRIMARY KEY,
  client_id VARCHAR(64) NOT NULL,
  title VARCHAR(220) NOT NULL,
  meeting_at TIMESTAMP NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'scheduled',
  created_by VARCHAR(64) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES Clients(id),
  FOREIGN KEY (created_by) REFERENCES Users(id)
);

CREATE TABLE IF NOT EXISTS Notifications (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64),
  client_id VARCHAR(64),
  role VARCHAR(20),
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES Users(id),
  FOREIGN KEY (client_id) REFERENCES Clients(id)
);

CREATE TABLE IF NOT EXISTS Documents (
  id VARCHAR(64) PRIMARY KEY,
  client_id VARCHAR(64) NOT NULL,
  project_id VARCHAR(64),
  uploaded_by VARCHAR(64) NOT NULL,
  title VARCHAR(220) NOT NULL,
  file_url TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES Clients(id),
  FOREIGN KEY (project_id) REFERENCES Projects(id),
  FOREIGN KEY (uploaded_by) REFERENCES Users(id)
);

CREATE INDEX IF NOT EXISTS idx_users_role ON Users(role);
CREATE INDEX IF NOT EXISTS idx_projects_client ON Projects(client_id);
CREATE INDEX IF NOT EXISTS idx_reports_client ON Reports(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client ON Invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_tickets_client ON Tickets(client_id);
CREATE INDEX IF NOT EXISTS idx_documents_client ON Documents(client_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON Leads(status);
CREATE INDEX IF NOT EXISTS idx_tasks_project ON Tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_meetings_client ON Meetings(client_id);
