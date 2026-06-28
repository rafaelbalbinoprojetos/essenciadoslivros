/* eslint-env node */
/* global process */
// =============================================================
// Helper de autenticação para os endpoints serverless (/api).
// Valida o JWT do Supabase enviado no header Authorization e
// expõe o usuário verificado + checagens de plano.
// =============================================================
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

// Cliente administrativo (service key) reutilizado entre invocações.
const adminClient =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;

export function getSupabaseAdmin() {
  return adminClient;
}

/** Extrai o token "Bearer <jwt>" do header Authorization. */
export function getBearerToken(req) {
  const header = req.headers?.authorization || req.headers?.Authorization || "";
  if (typeof header !== "string") return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

/**
 * Valida o token e retorna o usuário autenticado.
 * @returns {Promise<{user: object|null, error: string|null, status: number}>}
 */
export async function authenticate(req) {
  if (!adminClient) {
    return {
      user: null,
      error: "Servidor sem credenciais Supabase (SUPABASE_URL / SUPABASE_SERVICE_KEY).",
      status: 500,
    };
  }

  const token = getBearerToken(req);
  if (!token) {
    return { user: null, error: "Autenticação necessária.", status: 401 };
  }

  try {
    const { data, error } = await adminClient.auth.getUser(token);
    if (error || !data?.user) {
      return { user: null, error: "Sessão inválida ou expirada.", status: 401 };
    }
    return { user: data.user, error: null, status: 200 };
  } catch (err) {
    console.error("[auth] Falha ao validar token:", err);
    return { user: null, error: "Não foi possível validar a sessão.", status: 401 };
  }
}

/**
 * Garante que a requisição está autenticada. Em caso de falha já
 * responde com o status apropriado e retorna null.
 * @returns {Promise<object|null>} usuário verificado ou null (resposta já enviada).
 */
export async function requireUser(req, res) {
  const { user, error, status } = await authenticate(req);
  if (!user) {
    res.status(status).json({ error });
    return null;
  }
  return user;
}

/**
 * Verifica se o usuário possui acesso premium ativo.
 *
 * Fonte primária: tabela `assinaturas` (plano pago + ativo), que deve ser
 * a fonte de verdade alimentada pelo webhook do Mercado Pago.
 * Fallback: metadados do usuário (plan === "premium" ou trial ativo),
 * para manter compatibilidade enquanto o webhook não está ligado.
 *
 * OBS: metadados são graváveis pelo próprio usuário; a checagem via
 * `assinaturas` é a única realmente confiável. Priorize ligar o webhook.
 */
export async function hasActivePremium(user) {
  if (!user) return false;

  // 1) Fonte confiável: tabela de assinaturas.
  if (adminClient) {
    try {
      const { data } = await adminClient
        .from("assinaturas")
        .select("plano, ativo, data_fim")
        .eq("usuario_id", user.id)
        .eq("ativo", true)
        .order("criado_em", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        const notExpired = !data.data_fim || new Date(data.data_fim).getTime() > Date.now();
        const paidPlan = data.plano && data.plano !== "Free";
        if (paidPlan && notExpired) return true;
      }
    } catch (err) {
      console.error("[auth] Falha ao consultar assinaturas:", err);
    }
  }

  // 2) Fallback por metadados (compatibilidade com o comportamento atual).
  const meta = user.user_metadata ?? {};
  if (meta.plan === "premium") return true;

  if (meta.trial_status === "active" && meta.trial_expires_at) {
    const trialOk = new Date(meta.trial_expires_at).getTime() > Date.now();
    if (trialOk) return true;
  }

  return false;
}
