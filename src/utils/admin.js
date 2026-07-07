// Espelha a função is_admin() do banco para gating de UI.
// Fonte de verdade continua sendo a RLS no Supabase; isto é só
// para mostrar/ocultar controles de administração.
const ADMIN_EMAILS = ["balbino10@hotmail.com"];

export function isAdminUser(user) {
  if (!user) return false;
  const email = (user.email || "").toLowerCase();
  if (ADMIN_EMAILS.includes(email)) return true;
  return Boolean(user.app_metadata?.is_admin);
}
