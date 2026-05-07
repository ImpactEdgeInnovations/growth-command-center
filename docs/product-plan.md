# Product Plan

## MVP Goal

Let a founder or company team run growth execution from one workspace:

1. Request company access.
2. Super admin approves the workspace.
3. Owner logs in by email code.
4. Owner can ask AI to draft the first growth plan from a plain-language business brief.
5. Owner uploads/pastes an existing growth plan when one already exists.
6. Workspace converts the plan into targets, milestones, tasks, investor outreach, and marketing activities.
7. AI summarizes, advises, drafts, and flags next actions from the live workspace.
8. Humans approve before any external action.
9. Founder/team completes a weekly review to keep growth execution accountable.

## Target Customers

- Startups raising capital
- SMEs managing sales and marketing teams
- Agencies tracking client growth campaigns
- Founders who need accountability
- Investor-readiness advisors
- Internal growth teams

## SaaS Commercial Model

Super admin can keep subscriptions off during early beta.
Later subscription plans can be:

- Trial: limited workspace and AI use
- Starter: targets, tasks, weekly reviews
- Growth: investor CRM, marketing tracker, AI briefs
- Enterprise: multiple teams, advanced reporting, export, custom advisor prompts

## AI Advisor Guardrails

AI can:

- draft a first growth plan from a business brief
- summarize a growth plan
- convert plan into draft targets/milestones/tasks
- suggest weekly priorities
- identify missed investor follow-ups
- draft investor follow-up emails
- summarize marketer performance
- generate founder weekly brief
- summarize weekly reviews into wins, risks, and next actions
- generate a dashboard command brief from current plans, tasks, investors, marketing, and weekly reviews
- produce research-style notes from supplied context

AI cannot:

- send messages without approval
- approve companies
- change billing
- delete audit history
- make binding investment or employment decisions

## Upload Flow

1. User can start with AI by entering company, business type, stage, market, channels, and main goal.
2. AI drafts a Markdown growth plan.
3. User edits and saves the draft as the official workspace plan.
4. User can also upload a Markdown/text growth plan or paste text manually.
5. File uploads are stored privately in the Growth Command Center Supabase storage bucket.
6. Text is extracted from `.md`, `.markdown`, and `.txt` files in the safe MVP phase.
7. AI can draft targets, milestones, and team tasks from the saved plan.
8. User reviews proposed targets/tasks and deselects anything they do not want.
9. User clicks approve to save selected items.

PDF/DOCX extraction is intentionally queued as a later phase so the first upload release stays lightweight and does not introduce a heavy document-processing runtime.

## Product Boundary

This is a separate SaaS product. CaseReady can be the first customer, but Growth Command Center must not depend on CaseReady code, database tables, or routes.
