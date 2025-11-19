import React, { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext.jsx";
import { PLAN_LIST } from "../data/plans.js";

export default function SettingsPage() {
  const { user, updateUserMetadata } = useAuth();
  const metadata = useMemo(() => user?.user_metadata ?? {}, [user]);
  const [profileForm, setProfileForm] = useState(() => ({
    name: metadata.nome ?? user?.email ?? "",
    objective: metadata.objective ?? "Hipertrofia",
    level: metadata.level ?? "Intermedi�rio",
    height: metadata.height_cm ?? "",
    weight: metadata.weight_kg ?? "",
  }));
  const [savingProfile, setSavingProfile] = useState(false);

  const handleProfileChange = (field, value) => {
    setProfileForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveProfile = async (event) => {
    event.preventDefault();
    setSavingProfile(true);
    try {
      await updateUserMetadata({
        nome: profileForm.name,
        objective: profileForm.objective,
        level: profileForm.level,
        height_cm: profileForm.height,
        weight_kg: profileForm.weight,
      });
      toast.success("Perfil atualizado!");
    } catch (error) {
      console.error("[Settings] falha ao salvar perfil:", error);
      toast.error("N�o foi poss�vel atualizar seus dados agora.");
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <div className="space-y-10">
      <section className="rounded-[32px] border border-white/10 bg-gradient-to-br from-[#050914] via-[#0f1f3c] to-[#10203a] p-6 text-white shadow-2xl lg:p-10">
        <p className="text-xs uppercase tracking-[0.35em] text-white/60">Perfil & plano</p>
        <h1 className="mt-3 text-3xl font-semibold">Personalize treinos, notifica��es e assinatura.</h1>
        <p className="mt-4 max-w-3xl text-white/70">
          Quanto mais contexto voc� compartilhar, mais preciso fica o coach, a nutri��o automatizada e os ajustes de carga.
        </p>
      </section>

      <section className="rounded-[32px] border border-white/30 bg-white/80 p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900/70">
        <header className="mb-6">
          <p className="text-xs uppercase tracking-[0.3em] text-[rgb(var(--text-subtle))]">Dados pessoais</p>
          <h2 className="text-xl font-semibold text-[rgb(var(--text-primary))]">Bio de treino</h2>
        </header>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSaveProfile}>
          <label className="space-y-2 text-sm">
            <span className="text-[rgb(var(--text-secondary))]">Nome</span>
            <input
              value={profileForm.name}
              onChange={(event) => handleProfileChange("name", event.target.value)}
              className="w-full rounded-2xl border border-white/60 bg-white px-4 py-3 text-sm outline-none ring-2 ring-transparent focus:border-[#32C5FF] focus:ring-[#32C5FF]/30 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="text-[rgb(var(--text-secondary))]">Objetivo atual</span>
            <select
              value={profileForm.objective}
              onChange={(event) => handleProfileChange("objective", event.target.value)}
              className="w-full rounded-2xl border border-white/60 bg-white px-4 py-3 text-sm outline-none focus:border-[#32C5FF] focus:ring-[#32C5FF]/30 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            >
              <option>Hipertrofia</option>
              <option>Emagrecimento</option>
              <option>Sa�de geral</option>
            </select>
          </label>
          <label className="space-y-2 text-sm">
            <span className="text-[rgb(var(--text-secondary))]">N�vel</span>
            <select
              value={profileForm.level}
              onChange={(event) => handleProfileChange("level", event.target.value)}
              className="w-full rounded-2xl border border-white/60 bg-white px-4 py-3 text-sm outline-none focus:border-[#32C5FF] focus:ring-[#32C5FF]/30 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            >
              <option>Iniciante</option>
              <option>Intermedi�rio</option>
              <option>Avan�ado</option>
            </select>
          </label>
          <label className="space-y-2 text-sm">
            <span className="text-[rgb(var(--text-secondary))]">Altura (cm)</span>
            <input
              type="number"
              value={profileForm.height}
              onChange={(event) => handleProfileChange("height", event.target.value)}
              className="w-full rounded-2xl border border-white/60 bg-white px-4 py-3 text-sm outline-none focus:border-[#32C5FF] focus:ring-[#32C5FF]/30 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="text-[rgb(var(--text-secondary))]">Peso atual (kg)</span>
            <input
              type="number"
              value={profileForm.weight}
              onChange={(event) => handleProfileChange("weight", event.target.value)}
              className="w-full rounded-2xl border border-white/60 bg-white px-4 py-3 text-sm outline-none focus:border-[#32C5FF] focus:ring-[#32C5FF]/30 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </label>
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={savingProfile}
              className="w-full rounded-3xl bg-[#0f1f3c] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/30 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {savingProfile ? "Salvando..." : "Salvar altera��es"}
            </button>
          </div>
        </form>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-[32px] border border-white/30 bg-white/80 p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900/70">
          <header className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-[rgb(var(--text-subtle))]">Plano atual</p>
              <h2 className="text-xl font-semibold text-[rgb(var(--text-primary))]">
                {metadata.plan ?? "Free"} ??? {metadata.subscription_tier ?? "sem assinatura"}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent("meushape:open-plans"))}
              className="rounded-2xl border border-[#32C5FF] px-4 py-2 text-xs font-semibold text-[#32C5FF]"
            >
              Ver planos
            </button>
          </header>
          <p className="mt-4 text-sm text-[rgb(var(--text-secondary))]">
            Assinantes Premium desbloqueiam o Coach IA ilimitado, ajustes autom�ticos de carga e exporta��o de PDFs personalizados.
          </p>
          <ul className="mt-4 space-y-3 text-sm text-[rgb(var(--text-secondary))]">
            <li>??? Treinos ilimitados com v�deos e execu��es inteligentes.</li>
            <li>??? Nutri��o din�mica com proje��o de macros.</li>
            <li>??? Compara��o autom�tica de fotos com IA.</li>
          </ul>
        </article>

        <article className="rounded-[32px] border border-white/30 bg-white/80 p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900/70">
          <p className="text-xs uppercase tracking-[0.3em] text-[rgb(var(--text-subtle))]">Planos MEU SHAPE</p>
          <div className="mt-4 space-y-4">
            {PLAN_LIST.map((plan) => (
              <div key={plan.id} className="rounded-3xl border border-white/40 bg-white/70 p-4 dark:border-slate-700 dark:bg-slate-900/60">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg font-semibold text-[rgb(var(--text-primary))]">{plan.name}</p>
                    <p className="text-xs text-[rgb(var(--text-subtle))]">{plan.description}</p>
                  </div>
                  <p className="text-lg font-semibold text-[rgb(var(--text-primary))]">
                    {plan.price === 0 ? "Free" : `R$ ${plan.price}/m�s`}
                  </p>
                </div>
                <ul className="mt-3 space-y-1 text-xs text-[rgb(var(--text-secondary))]">
                  {plan.features.slice(0, 3).map((feature) => (
                    <li key={feature}>??? {feature}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}
