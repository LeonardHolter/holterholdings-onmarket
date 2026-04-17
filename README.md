# Holter Holdings – On-Market Deal Pipeline

A spreadsheet-style M&A deal pipeline CRM built with Next.js, AG Grid, and Supabase.

## Pages

| Route | Description |
|-------|-------------|
| `/awaiting-cim` | Businesses waiting on a Confidential Information Memorandum |
| `/cim-received` | Deals where the CIM has been received (includes data room link) |
| `/loi-sent` | Deals where a Letter of Intent has been submitted |
| `/brokers` | Broker contact tracker with outreach cadence reminders |

## Setup

### 1. Supabase

1. Go to your Supabase project → **SQL Editor**
2. Paste the contents of `supabase-schema.sql` and run it
3. Copy your project URL and anon key from **Settings → API**

### 2. Environment variables

```bash
cp .env.example .env.local
```

Fill in your Supabase URL and anon key in `.env.local`.

### 3. Install and run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Features

- Inline cell editing (click any cell to edit, changes auto-save)
- Auto-computed multiple (asking price / EBITDA or SDE)
- Status promotion (move deals between pipeline stages)
- Broker dropdown linked to the broker tracker
- Contact cadence tracking (highlights brokers not contacted in 14+ days)
- Column sorting and filtering
