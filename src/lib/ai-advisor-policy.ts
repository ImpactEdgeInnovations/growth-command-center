export const AI_ADVISOR_POLICY = {
  can: [
    "summarize growth plans",
    "suggest targets and team tasks",
    "flag missed investor follow-ups",
    "draft investor or customer messages",
    "summarize weekly team progress",
  ],
  cannot: [
    "send messages without approval",
    "approve companies",
    "change billing",
    "delete audit history",
    "make binding investment or employment decisions",
  ],
  approvalRequired: true,
};
