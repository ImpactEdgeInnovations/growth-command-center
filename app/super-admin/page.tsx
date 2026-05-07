import Link from "next/link";
import SuperAdminClient from "./super-admin-client";
import { eyebrow, muted, navPill, pageTitle, shell } from "../ui/styles";

export default function SuperAdminPage() {
  return (
    <main style={shell}>
      <Link href="/" style={navPill}>Back</Link>
      <p style={{ ...eyebrow, marginTop: 34 }}>Super admin</p>
      <h1 style={pageTitle}>Approve companies and control subscriptions.</h1>
      <p style={{ ...muted, maxWidth: 760 }}>You are the platform owner. Companies apply, you approve them, and subscriptions can remain off until you are ready to charge.</p>
      <div style={{ marginTop: 28 }}><SuperAdminClient /></div>
    </main>
  );
}
