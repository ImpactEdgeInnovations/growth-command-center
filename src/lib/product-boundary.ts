export const PRODUCT_BOUNDARY = {
  productName: "Growth Command Center",
  standalone: true,
  caseReadyIntegration: "none",
  forbiddenImports: [
    "CaseReady borrower routes",
    "CaseReady lender routes",
    "CaseReady agreements",
    "CaseReady payments",
    "CaseReady legal workflows",
  ],
};
