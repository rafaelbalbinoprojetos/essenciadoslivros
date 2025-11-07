import { createClient } from "@supabase/supabase-js";

// Importa as variáveis da Vercel / .env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Cria o cliente Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

// Função para testar a conexão
async function testarConexao() {
  const { data, error } = await supabase.from("profiles").select("*").limit(1);

  if (error) {
    console.error("❌ Erro ao conectar:", error.message);
  } else {
    console.log("✅ Conexão bem-sucedida! Exemplo de dado:", data);
  }
}

testarConexao();
