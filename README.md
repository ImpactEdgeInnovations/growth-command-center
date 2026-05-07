# Growth Command Center

Growth Command Center is a standalone, multi-company SaaS Growth OS for founders and operators.
It is intentionally separate from CaseReady so it can become its own product.

## Current MVP Foundation

- Public company access request
- Email-code login
- Super-admin company approval
- Workspace/member model
- Subscription on/off fields controlled by super admin
- Growth plan manual paste/upload-ready model
- Targets and milestones
- Team task, investor outreach, marketing activity schema
- AI advisor API integration point with safe fallback if no API key is configured

## What It Helps Companies Track

- Company growth targets
- Founder priorities
- Marketer/team execution
- Investor outreach CRM
- Social/media growth
- Weekly reports
- AI-assisted recommendations
- Uploaded growth plans in MD/PDF/DOCX form later

## CaseReady Boundary

This project must not import or share CaseReady borrower, lender, agreement, payment, legal, or admin modules.
If integration is needed later, use read-only export/import or a separate API bridge.

## Local Setup

1. Copy `.env.example` to `.env.local`.
2. Create a separate Supabase project for Growth Command Center.
3. Run `supabase/sql/001_growth_os_foundation.sql` in that separate project.
4. Set `SUPER_ADMIN_EMAILS` to your owner emails.
5. Run `npm install`.
6. Run `npm run dev`.
7. Open `http://127.0.0.1:3010`.

## AI Advisor

Set `OPENAI_API_KEY` and optionally `OPENAI_MODEL` to enable live AI advice.
If no key is set, the app returns safe rules-based advice so the workflow can be tested.

AI can summarize, suggest, research from supplied context, and draft messages.
AI cannot approve companies, send messages, change billing, or delete audit history.
