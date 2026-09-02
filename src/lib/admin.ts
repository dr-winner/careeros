// Comma-separated ADMIN_EMAILS env gate, shared by the admin page and any
// route that returns operator-only detail (e.g. raw AI provider errors).
export function isAdminEmail(email: string | null | undefined): boolean {
  const raw = process.env.ADMIN_EMAILS ?? "";
  if (!raw || !email) return false;
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
    .includes(email.toLowerCase());
}
