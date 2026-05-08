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

The interface should feel AI-native and modern: blue command-center palette, clear action cards, visible AI prompts, and human approval language near every AI workflow.

## Target Customers

- Startups raising capital
- SMEs managing sales and marketing teams
- Agencies tracking client growth campaigns
- Founders who need accountability
- Investor-readiness advisors
- Internal growth teams

## SaaS Commercial Model

Super admin can keep subscriptions off during early beta.
Super admin can manually set workspace plan, subscription status, billing notes, and suspension state from the owner panel.
Plan limits are enforced server-side for team seats, plans, targets, milestones, tasks, investor records, marketing logs, weekly reviews, and AI briefs.
The workspace dashboard shows usage against limits so founders know when they are approaching an upgrade moment.
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
- research likely investors, partners, companies, or customer prospects from the web with visible source links
- prepopulate outreach records only after the user selects and approves the researched prospects
- act like a lightweight growth operator by suggesting who to contact, weekly outreach targets, next tasks, first-message angles, and feedback questions

AI cannot:

- send messages without approval
- silently save researched prospects without human review
- approve companies
- change billing
- delete audit history
- make binding investment or employment decisions

## Upload Flow

1. User can start with AI by entering company, business type, stage, market, channels, and main goal.
2. User can attach a Markdown/text business plan, weekly target checklist, investor/company table, or outreach notes as AI-only context.
3. AI drafts a Markdown growth plan.
4. User edits and saves the draft as the official workspace plan.
5. User can also upload a Markdown/text growth plan or paste text manually.
6. File uploads are stored privately in the Growth Command Center Supabase storage bucket.
7. Text is extracted from `.md`, `.markdown`, and `.txt` files in the safe MVP phase.
8. AI can draft targets, milestones, team tasks, and investor/company outreach records from the saved plan.
9. User reviews proposed targets/tasks/outreach records and deselects anything they do not want.
10. User clicks approve to save selected items.
11. User can also run AI prospect research from the plan builder. AI returns a sourced draft list first; selected rows can then be saved directly to the outreach table or added back into plan context.
12. Prospect research can also save selected weekly outreach targets and next tasks, so research turns into execution rather than a static list.

PDF/DOCX extraction is intentionally queued as a later phase so the first upload release stays lightweight and does not introduce a heavy document-processing runtime.

## Team Access

Workspace owners/admins can invite teammates by email from the workspace dashboard.
Invited teammates log in through the same email-code flow, so there is no password surface to maintain.
Roles are intentionally simple for the first SaaS release:

- Admin: manages workspace execution and invites
- Member: contributes tasks, investor outreach, marketing activity, and reviews
- Viewer: reads the workspace without changing execution data

Role enforcement is still server-side. UI labels are helpers, not the security boundary.
Viewer accounts can load dashboards and workspace history, but they are blocked from saving plans, targets, tasks, outreach logs, weekly reviews, or workspace-bound AI briefs.
Owner access is intentionally locked out of the workspace member panel so super admin remains the clear escalation path for ownership changes.

## Product Boundary

This is a separate SaaS product. CaseReady can be the first customer, but Growth Command Center must not depend on CaseReady code, database tables, or routes.
