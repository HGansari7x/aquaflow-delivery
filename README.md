# AquaFlow Delivery — Phase 1

Core MVP starter for the AquaFlow Delivery water-delivery SaaS.

Implemented:
- Owner / Agent / Customer role-aware login UI
- Supabase authentication
- Multi-tenant database model
- Owner, agent, customer and order tables
- Row Level Security policies
- Realtime order subscriptions
- Owner customer/agent/order dashboard
- Customer order placement
- Agent assigned-order view

## 1. Create Supabase project
Create a project at https://supabase.com and copy:
- Project URL
- anon/publishable key

## 2. Configure database
Open Supabase SQL Editor and run `supabase/schema.sql`.

## 3. Configure local project
Copy `.env.example` to `.env` and fill:
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...

## 4. Run
npm install
npm run dev

## Important
This is Phase 1. Razorpay, Maps, delivery OTP, wallet, payroll, attendance and PWA hardening are intentionally scheduled for later phases. Do not put secret keys in the frontend.
