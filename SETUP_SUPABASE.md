# Reconstruir o banco no Supabase — Essência dos Livros

Guia para configurar um **projeto Supabase novo** do zero e religar o app.

---

## 1. Criar o projeto

1. Acesse https://supabase.com e entre na conta nova.
2. **New project** → escolha um nome (ex: `essencia-dos-livros`), uma senha forte de banco (guarde-a) e a região mais próxima (ex: *South America (São Paulo)*).
3. Espere ~2 min até o projeto provisionar.

## 2. Rodar o script do banco

1. Menu lateral → **SQL Editor** → **New query**.
2. Abra o arquivo `src/sql/supabase_setup.sql`, copie **tudo** e cole no editor.
3. Clique em **Run**. Deve terminar sem erros (cria tabelas, RLS, gêneros).

## 3. Virar admin

Ainda no SQL Editor, rode (em nova query) o bloco que está comentado no fim do `supabase_setup.sql` — basta descomentar:

```sql
update auth.users
  set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
      || jsonb_build_object('is_admin', true)
  where email = 'rafaelbalbinoprojetos@gmail.com';
```

> Só rode isso **depois** de criar sua conta no app (passo 6), senão o usuário ainda não existe. Depois de rodar, faça **logout/login** no app para o token recarregar a flag de admin.

## 4. Pegar as chaves

Menu → **Project Settings** → **API**. Você vai precisar de 3 coisas:

| Onde | O que copiar |
|------|--------------|
| Project URL | `https://SEU-PROJETO.supabase.co` |
| Project API keys → `anon` `public` | chave pública (frontend) |
| Project API keys → `service_role` | chave **secreta** (backend) |

## 5. Configurar as variáveis de ambiente

**Local:** copie `.env.example` para `.env.local` e preencha:

```
VITE_SUPABASE_URL      = Project URL
VITE_SUPABASE_ANON_KEY = anon public
SUPABASE_URL           = Project URL (a mesma)
SUPABASE_SERVICE_KEY   = service_role  (NUNCA suba no GitHub)
```

**Na Vercel:** Project → **Settings → Environment Variables**, adicione as mesmas 4 (mais `OPENAI_API_KEY` e `MERCADOPAGO_ACCESS_TOKEN`). Depois **Redeploy**.

## 6. Ajustar a autenticação

Menu → **Authentication → Providers → Email**: deixe **Email** habilitado.

- Em **Authentication → Providers → Email**, a opção *Confirm email* controla se o usuário precisa confirmar o email antes de logar. Para testar rápido, pode deixar **desligada**; em produção, ligada é mais seguro.
- Crie sua conta entrando normalmente pela tela de login do app (o fluxo já faz o cadastro automático). Depois volte ao **passo 3** para virar admin.

## 7. (Opcional) Storage para capas/áudios

Hoje os áudios vêm do Google Drive e as capas de URLs. Se quiser hospedar no próprio Supabase:

1. **Storage → New bucket** → `capas` (público) e `audios` (público ou com URL assinada).
2. Suba os arquivos e use as URLs geradas nos campos `capa_url` / `audio_url` da tabela `livros`.

---

## Checklist rápido

- [ ] Projeto criado no Supabase
- [ ] `supabase_setup.sql` rodado sem erro
- [ ] Conta criada no app (login)
- [ ] Bloco de admin rodado + logout/login
- [ ] `.env.local` preenchido (4 vars Supabase)
- [ ] Variáveis na Vercel + redeploy
- [ ] Login e biblioteca funcionando
