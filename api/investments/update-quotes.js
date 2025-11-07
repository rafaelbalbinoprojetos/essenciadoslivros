/* eslint-env node */
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const BATCH_SIZE = Number(process.env.YAHOO_BATCH_SIZE || 50);
const RAPID_API_KEY = process.env.RAPID_API_KEY;
const RAPID_API_HOST = process.env.RAPID_API_HOST || "yh-finance.p.rapidapi.com";
const RAPID_API_PATH = process.env.RAPID_API_PATH || "/market/v2/get-quotes";
const YAHOO_ENDPOINT = process.env.YAHOO_API_URL || "https://query1.finance.yahoo.com/v7/finance/quote";

const supabase =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })
    : null;

function chunk(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

function toISODate(value = Date.now()) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString().slice(0, 10) : date.toISOString().slice(0, 10);
}

async function fetchQuotes(symbols) {
  if (!symbols.length) {
    return { quotes: [], unauthorized: false };
  }
  const params = new URLSearchParams();
  params.set("symbols", symbols.join(","));
  // Ajusta a regiao automaticamente para ativos brasileiros (.SA) ou padrao EUA.
  const isBrazilian = symbols.some((symbol) => symbol.endsWith(".SA"));
  params.set("region", isBrazilian ? "BR" : "US");

  const usingRapidApi = Boolean(RAPID_API_KEY);
  const url = usingRapidApi
    ? `https://${RAPID_API_HOST}${RAPID_API_PATH}?${params.toString()}`
    : `${YAHOO_ENDPOINT}?${params.toString()}`;

  const headers = {
    "Content-Type": "application/json",
    "User-Agent": "GranaApp/1.0 (+https://grana.app)",
  };

  if (usingRapidApi) {
    headers["X-RapidAPI-Key"] = RAPID_API_KEY;
    headers["X-RapidAPI-Host"] = RAPID_API_HOST;
  }

  const response = await fetch(url, { headers });

  if (response.status === 401 || response.status === 403) {
    return { quotes: [], unauthorized: true };
  }

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Falha ao consultar Yahoo Finance (${response.status}): ${details}`);
  }

  const payload = await response.json();
  return { quotes: payload?.quoteResponse?.result ?? [], unauthorized: false };
}

function parseBody(req) {
  if (!req.body) return {};
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return req.body;
}

async function updateQuotes(targetSymbols = []) {
  if (!supabase) {
    throw new Error("Supabase não configurado (SUPABASE_URL/SUPABASE_SERVICE_KEY).");
  }

  let symbols = targetSymbols.filter(Boolean);

  if (!symbols.length) {
    const { data: assets, error: assetsError } = await supabase.from("ativos").select("symbol").not("symbol", "is", null);
    if (assetsError) {
      throw new Error(`Não foi possível recuperar símbolos cadastrados: ${assetsError.message}`);
    }

    symbols = (assets ?? []).map((item) => item.symbol).filter(Boolean);
  }

  if (!symbols.length) {
    return { updated: 0, history: 0, batches: 0, symbols: [] };
  }

  const batches = chunk(symbols, BATCH_SIZE);
  const now = new Date();
  const historyDate = toISODate(now);
  let updatedCount = 0;
  let historyCount = 0;
  const fetchedSymbols = [];
  const unauthorizedSymbols = new Set();

  for (const group of batches) {
    const { quotes, unauthorized } = await fetchQuotes(group);

    if (unauthorized) {
      group.forEach((symbol) => unauthorizedSymbols.add(symbol));
      continue;
    }

    if (!quotes.length) {
      continue;
    }

    const updates = [];
    const historyRows = [];

    for (const quote of quotes) {
      const symbol = quote.symbol;
      if (!symbol) continue;

      const lastPrice = Number(quote.regularMarketPrice ?? quote.bid ?? quote.ask ?? 0);
      if (!Number.isFinite(lastPrice) || lastPrice <= 0) {
        continue;
      }

      const changePercent = Number(quote.regularMarketChangePercent ?? quote.regularMarketChange ?? 0);
      const currency = quote.currency || "BRL";
      const lastUpdate = quote.regularMarketTime ? new Date(quote.regularMarketTime * 1000).toISOString() : now.toISOString();

      updates.push({
        symbol,
        ultimo_preco: lastPrice,
        variacao_percentual: Number.isFinite(changePercent) ? changePercent : null,
        moeda: currency,
        atualizado_em: lastUpdate,
        fonte: "Yahoo Finance",
      });

      historyRows.push({
        ativo_symbol: symbol,
        preco: lastPrice,
        variacao_percentual: Number.isFinite(changePercent) ? changePercent : null,
        moeda: currency,
        data_registro: historyDate,
      });

      fetchedSymbols.push(symbol);
    }

    if (updates.length) {
      const { error: updateError } = await supabase.from("ativos").upsert(updates, { onConflict: "symbol" });
      if (updateError) {
        throw new Error(`Erro ao atualizar preços: ${updateError.message}`);
      }
      updatedCount += updates.length;
    }

    if (historyRows.length) {
      const { error: historyError } = await supabase
        .from("historico_precos")
        .upsert(historyRows, { onConflict: "ativo_symbol,data_registro" });
      if (historyError) {
        throw new Error(`Erro ao registrar histórico: ${historyError.message}`);
      }
      historyCount += historyRows.length;
    }
  }

  return {
    updated: updatedCount,
    history: historyCount,
    batches: batches.length,
    symbols: fetchedSymbols,
    unauthorizedSymbols: Array.from(unauthorizedSymbols),
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST" && req.method !== "GET") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Método não suportado." });
  }

  try {
    let targetSymbols = [];

    if (req.method === "GET") {
      const url = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);
      const symbolsParam = url.searchParams.get("symbols");
      if (symbolsParam) {
        targetSymbols = symbolsParam
          .split(",")
          .map((symbol) => symbol.trim().toUpperCase())
          .filter(Boolean);
      }
    } else if (req.method === "POST") {
      const body = parseBody(req);
      if (Array.isArray(body.symbols)) {
        targetSymbols = body.symbols.map((symbol) => String(symbol).trim().toUpperCase()).filter(Boolean);
      } else if (typeof body.symbols === "string") {
        targetSymbols = body.symbols
          .split(",")
          .map((symbol) => symbol.trim().toUpperCase())
          .filter(Boolean);
      }
    }

    const result = await updateQuotes(targetSymbols);
    return res.status(200).json({
      ok: true,
      ...result,
      executedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[update-quotes] erro:", error);
    return res.status(500).json({
      ok: false,
      error: error.message || "Não foi possível atualizar as cotações.",
    });
  }
}
