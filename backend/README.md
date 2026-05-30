# Vixelry CRM Backend

This is the real Node.js + Express + SQLite backend for the Vixelry SaaS CRM dashboard.

## Stack

- Node.js
- Express
- SQLite via `better-sqlite3`
- JWT authentication
- bcrypt password hashing
- Role-based access control

## Setup

```bash
cd backend
copy .env.example .env
npm install
npm run seed
npm run dev
```

API runs at:

```text
http://localhost:4000/api
```

## First Accounts

Seed creates:

- Admin: `admin@vixelry.com`
- Client: `client@vixelry.com`

Passwords are created only in the database seed script. Do not display them on the website UI.

## Modules

Current API modules:

- Auth
- Clients
- Leads CRM
- Projects
- Tasks
- Reports
- Invoices
- Tickets
- Documents
- Notifications
- Meetings
- Dashboard summary

## Role Rules

Admin can access all CRM records.

Client can access only records with their own `client_id`.

Client cannot access:

- Admin clients API
- Leads CRM API
- Finance/settings/team admin modules
- Other client records
