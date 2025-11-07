/* eslint-env node */
import { createClient } from "@supabase/supabase-js";
import { OpenAI } from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: { persistSession: false },
      })
    : null;

async function fetchLibrarySnapshot() {
  if (!supabase) {
    return null;
  }

  try {
    const [{ data: books }, { data: authors }, { data: genres }, { data: collections }] = await Promise.all([
      supabase.from("livros").select("id, titulo, autor_id, genero_id, colecao_id, destaque").order("criado_em", {
        ascending: false,
      }).limit(8),
      supabase.from("autores").select("id, nome, nacionalidade").order("criado_em", { ascending: false }).limit(8),
      supabase.from("generos").select("id, nome").order("nome", { ascending: true }),
      supabase.from("colecoes").select("id, nome").order("nome", { ascending: true }),
    ]);

    return {
      books: books ?? [],
      authors: authors ?? [],
      genres: genres ?? [],
      collections: collections ?? [],
    };
  } catch (error) {
    console.error("[chat] Falha ao consultar snapshot da biblioteca:", error);
    return null;
  }
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    response.status(405).json({ error: "Método não permitido." });
    return;
  }

  const { messages = [], systemPrompt } = request.body ?? {};
  if (!Array.isArray(messages) || messages.length === 0) {
    response.status(400).json({ error: "Envie ao menos uma mensagem." });
    return;
  }

  try {
    const snapshot = await fetchLibrarySnapshot();
    const snapshotSummary = snapshot
      ? `Contexto da biblioteca:\n- Livros: ${snapshot.books
          .slice(0, 5)
          .map((book) => `"${book.titulo}"`)
          .join(", ") || "sem registros ainda"}\n- Autores cadastrados: ${snapshot.authors.length}\n- Gêneros disponíveis: ${
          snapshot.genres.length
        }\n- Coleções ativas: ${snapshot.collections.length}`
      : "Contexto indisponível.";

    const chatMessages = [
      {
        role: "system",
        content:
          systemPrompt ??
          "Você é o assistente editorial da Essência dos Livros. Sugira leituras, cadastros e melhorias no acervo.",
      },
      {
        role: "system",
        content: snapshotSummary,
      },
      ...messages.map((message) => ({
        role: message.role ?? "user",
        content: message.content ?? "",
      })),
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: chatMessages,
      temperature: 0.4,
    });

    const reply = completion.choices[0]?.message?.content?.trim() ?? "Não consegui formular uma resposta agora.";
    response.status(200).json({ reply });
  } catch (error) {
    console.error("[chat] Erro ao processar conversa:", error);
    response.status(500).json({ error: "Não foi possível responder no momento." });
  }
}
