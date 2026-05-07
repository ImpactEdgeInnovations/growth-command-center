# Product Plan

## MVP Goal

Let a founder or company team run growth execution from one workspace:

1. Request company access.
2. Super admin approves the workspace.
3. Owner logs in by email code.
4. Owner uploads/pastes a growth plan.
5. Workspace converts the plan into targets, milestones, tasks, investor outreach, and marketing activities.
6. AI summarizes, advises, drafts, and flags next actions.
7. Humans approve before any external action.

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

- summarize a growth plan
- convert plan into draft targets/milestones/tasks
- suggest weekly priorities
- identify missed investor follow-ups
- draft investor follow-up emails
- summarize marketer performance
- generate founder weekly brief
- produce research-style notes from supplied context

AI cannot:

- send messages without approval
- approve companies
- change billing
- delete audit history
- make binding investment or employment decisions

## Upload Flow

1. User uploads MD/PDF/DOCX growth plan or pastes text manually.
2. File is stored privately.
3. Text is extracted.
4. AI summarizes the plan.
5. User reviews proposed targets/tasks.
6. User clicks approve to save them.

## Product Boundary

This is a separate SaaS product. CaseReady can be the first customer, but Growth Command Center must not depend on CaseReady code, database tables, or routes.
