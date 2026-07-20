import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext.jsx";
import { supabase } from "../../lib/supabase.js";
import ThemeSwitcher from "../../components/ThemeSwitcher.jsx";
import loginHeroImage from "../../assets/imagem-login.png";

const TERMS_URL = import.meta.env.VITE_TERMS_URL ?? "#";
const PRIVACY_URL = import.meta.env.VITE_PRIVACY_URL ?? "#";

export default function LoginPage() {
  const { signIn, session, error } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState(null);
  const [authNotice, setAuthNotice] = useState(null);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [emailStatus, setEmailStatus] = useState("idle"); // idle | typing | checking | new | existing
  const [resettingPassword, setResettingPassword] = useState(false);

  useEffect(() => {
    if (session) {
      const redirectTo = location.state?.from?.pathname ?? "/";
      navigate(redirectTo, { replace: true });
    }
  }, [navigate, location.state, session]);

  const emailHelperText = useMemo(() => {
    if (!formData.email) {
      return "Digite seu email para fazer login ou criar um cadastro em segundos.";
    }
    if (!formData.email.includes("@")) {
      return "Use um email válido, por exemplo: voce@exemplo.com";
    }
    if (emailStatus === "new") {
      return "Detectamos um novo email. Enviaremos um link de confirmação para o seu endereço.";
    }
    return "Se já existir uma conta, faremos o login. Caso contrário, criaremos uma para você.";
  }, [emailStatus, formData.email]);

  const emailHelperTone = emailStatus === "new" ? "text-emerald-600 dark:text-emerald-300" : "text-slate-500 dark:text-slate-400";

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
    if (name === "email") {
      setEmailStatus(value ? "typing" : "idle");
      setAuthNotice(null);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading) return;

    setLoading(true);
    setFormError(null);
    setAuthNotice(null);
    setEmailStatus("checking");

    try {
      const result = await signIn({ email: formData.email, password: formData.password });

      if (result.status === "sign-up") {
        setEmailStatus("new");
        const normalizedEmail = formData.email.trim().toLowerCase();

        if (result.requiresEmailConfirmation) {
          toast.success(`Conta criada! Confirme pelo link enviado para ${normalizedEmail}.`);
          setAuthNotice(`🚀 Conta criada! Confirme o email ${normalizedEmail} para começar a usar a Essência dos Livros.`);
        } else {
          toast.success("Conta criada com sucesso! Estamos preparando o seu ambiente.");
          setAuthNotice("🚀 Conta criada! Aproveite seu período de teste Premium por 7 dias.");
        }
      } else {
        setEmailStatus("existing");
        toast.success("Login realizado com sucesso.");
      }
    } catch (submitError) {
      const message = submitError?.message ?? "Não foi possível entrar. Verifique os dados.";
      setFormError(message);
      setEmailStatus(submitError?.code === "existing_user_wrong_password" ? "existing" : "idle");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    const trimmedEmail = formData.email.trim();
    if (!trimmedEmail) {
      setFormError("Informe seu email para receber o link de recuperação.");
      return;
    }

    setResettingPassword(true);
    setFormError(null);
    setAuthNotice(null);
    try {
      const redirectTo = import.meta.env.VITE_SUPABASE_RESET_REDIRECT ?? `${window.location.origin}/recuperar-senha`;

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo,
      });

      if (resetError) {
        throw resetError;
      }

      toast.success(`Enviamos um link de recuperação para ${trimmedEmail}.`);
      setAuthNotice(`Enviamos um link de recuperação para ${trimmedEmail}. Verifique sua caixa de entrada e spam.`);
    } catch (resetError) {
      const message = resetError?.message ?? "Não foi possível enviar o link de recuperação.";
      setFormError(message);
    } finally {
      setResettingPassword(false);
    }
  };

  const togglePasswordVisibility = () => {
    setPasswordVisible((previous) => !previous);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#090705] px-4 py-8 sm:px-6 lg:py-10">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <img src={loginHeroImage} alt="" className="h-full w-full scale-110 object-cover opacity-30 blur-2xl" aria-hidden="true" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_35%_48%,rgba(191,137,63,0.18),transparent_38%),linear-gradient(90deg,rgba(8,6,4,0.45),rgba(8,6,4,0.88))]" />
      </div>

      <div className="relative w-full max-w-7xl overflow-hidden rounded-[34px] border border-[#d5b06a]/25 bg-[#120d08]/70 shadow-[0_45px_120px_-45px_rgba(0,0,0,0.95)] backdrop-blur-3xl">
        <div
          className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-black/15"
          aria-hidden="true"
        />

        <div className="relative grid grid-cols-1 overflow-hidden md:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.8fr)]">
          <div className="relative min-h-[280px] overflow-hidden bg-black md:min-h-[720px]">
            <img
              src={loginHeroImage}
              alt="Essência dos Livros — leia o essencial, no seu ritmo"
              className="absolute inset-0 h-full w-full object-cover object-center md:object-[52%_center]"
            />
            <div className="absolute inset-0 border border-white/10 shadow-[inset_-35px_0_55px_-45px_rgba(0,0,0,0.9)]" aria-hidden="true" />
          </div>

          <div className="relative bg-[#fbf6ea]/[0.97] px-7 py-9 sm:px-10 sm:py-10 md:flex md:flex-col md:justify-center md:px-11 dark:bg-[#100d0a]/[0.96]">
            <div className="absolute -top-16 right-10 h-32 w-32 rounded-full bg-amber-300/10 blur-3xl" aria-hidden="true" />
            <div className="absolute bottom-0 left-0 h-24 w-24 rounded-full bg-amber-200/10 blur-3xl" aria-hidden="true" />

            <div className="relative flex items-start justify-between">
              <div className="space-y-2">
                <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">Bem-vindo</h1>
                <p className="text-sm text-slate-500 dark:text-slate-300">Use o mesmo formulário para entrar ou criar sua conta em segundos.</p>
              </div>
              <div className="-mr-2">
                <ThemeSwitcher />
              </div>
            </div>

            <form className="relative mt-8 space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label htmlFor="email" className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoCapitalize="none"
                  autoComplete="email"
                  autoCorrect="off"
                  enterKeyHint="next"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-[#d7c8ac] bg-white/70 px-4 py-3 text-sm text-slate-900 shadow-[0_15px_40px_-20px_rgba(58,39,17,0.3)] focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/25 dark:border-[#4c4032] dark:bg-black/25 dark:text-slate-100 dark:focus:border-amber-300"
                  placeholder="voce@exemplo.com"
                />
                <p className={`text-xs leading-relaxed ${emailHelperTone}`}>{emailHelperText}</p>
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                  Senha
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={passwordVisible ? "text" : "password"}
                    autoComplete="current-password"
                    enterKeyHint="done"
                    required
                    minLength={6}
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-[#d7c8ac] bg-white/70 px-4 py-3 pr-12 text-sm text-slate-900 shadow-[0_15px_40px_-20px_rgba(58,39,17,0.3)] focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/25 dark:border-[#4c4032] dark:bg-black/25 dark:text-slate-100 dark:focus:border-amber-300"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-xs font-semibold uppercase tracking-[0.16em] text-amber-700 transition hover:text-amber-600 dark:text-amber-300 dark:hover:text-amber-200"
                    aria-pressed={passwordVisible}
                  >
                    {passwordVisible ? "Ocultar" : "Mostrar"}
                  </button>
                </div>
                <div>
                  <button
                    type="button"
                    onClick={handlePasswordReset}
                    disabled={resettingPassword || loading}
                    className="text-xs font-semibold text-amber-700 transition hover:text-amber-600 disabled:cursor-not-allowed disabled:opacity-60 dark:text-amber-300 dark:hover:text-amber-200"
                  >
                    {resettingPassword ? "Enviando link de recuperação..." : "Esqueci minha senha"}
                  </button>
                </div>
              </div>

              {(formError || error) && (
                <div
                  className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-600 shadow-inner dark:border-rose-400/30 dark:bg-rose-500/15 dark:text-rose-200"
                  role="alert"
                >
                  {formError || error?.message || "Não foi possível entrar. Verifique os dados."}
                </div>
              )}

              {authNotice && (
                <div
                  className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 shadow-inner dark:border-emerald-400/30 dark:bg-emerald-500/15 dark:text-emerald-200"
                  role="status"
                >
                  {authNotice}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center rounded-xl bg-[rgb(var(--color-accent-primary))] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[rgba(var(--color-accent-primary),0.28)] transition hover:bg-[rgb(var(--color-accent-dark))] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Conectando..." : "Entrar ou Criar conta"}
              </button>

              <p className="text-center text-[11px] leading-relaxed text-slate-400 dark:text-slate-500">
                Ao criar, você concorda com nossos{" "}
                <a href={TERMS_URL} target="_blank" rel="noreferrer" className="font-semibold text-amber-700 hover:text-amber-600 dark:text-amber-300">
                  termos de uso
                </a>{" "}
                e{" "}
                <a href={PRIVACY_URL} target="_blank" rel="noreferrer" className="font-semibold text-amber-700 hover:text-amber-600 dark:text-amber-300">
                  política de privacidade
                </a>
                .
              </p>
            </form>

            <p className="relative mt-8 text-center text-xs text-slate-400 dark:text-slate-500">
              Em breve: login com Google ou Apple para agilizar ainda mais seu acesso.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
