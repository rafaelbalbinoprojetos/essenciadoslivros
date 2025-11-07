import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const SUGGESTED_PROMPTS = [
  "Registrar despesa: gastei 25 reais com lanche hoje.",
  "Recebi 5.000 reais de salário no dia 5.",
  "Quanto gastei com alimentação neste mês?",
  "Cadastre que comprei 10 ações da Petrobras por 300 reais.",
  "Resumo das rendas na última semana.",
];

const INITIAL_ASSISTANT_MESSAGE =
  "Olá! Sou o assistente do GranaApp. Posso registrar despesas, rendas, investimentos, horas extras e gerar resumos. Como posso ajudar?";

const API_BASE = (import.meta.env.VITE_API_BASE || "").replace(/\/$/, "");

function MessageBubble({ role, content }) {
  const isAssistant = role !== "user";
  return (
    <div
      className={`flex ${isAssistant ? "justify-start" : "justify-end"}`}
    >
      <div
        className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm shadow-sm sm:max-w-[75%] ${
          isAssistant
            ? "bg-white text-gray-800 dark:bg-gray-900 dark:text-gray-100"
            : "bg-temaSky text-white dark:bg-temaEmerald"
        }`}
      >
        {content.split("\n").map((line, index) => (
          <p key={`${line}-${index}`} className="whitespace-pre-wrap">
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-1 rounded-full bg-white px-4 py-2 text-xs text-gray-500 shadow dark:bg-gray-900 dark:text-gray-300">
        <span className="h-2 w-2 animate-bounce rounded-full bg-temaSky dark:bg-temaEmerald" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-temaSky dark:bg-temaEmerald" style={{ animationDelay: "0.15s" }} />
        <span className="h-2 w-2 animate-bounce rounded-full bg-temaSky dark:bg-temaEmerald" style={{ animationDelay: "0.3s" }} />
      </div>
    </div>
  );
}

function MicIcon({ active }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className={`h-5 w-5 ${active ? "text-white" : ""}`}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.6}
        d="M12 16a3 3 0 003-3V7a3 3 0 00-6 0v6a3 3 0 003 3z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.6}
        d="M19 11a7 7 0 01-14 0M12 19v3"
      />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
      <path d="M3.4 5.3l16.2 6.3a1 1 0 010 1.86L3.4 19.7a.75.75 0 01-.99-.88l1.52-6.14a1 1 0 010-.46L2.4 6.18A.75.75 0 013.4 5.3z" />
    </svg>
  );
}

export default function ChatbotPage() {
  const { user } = useAuth();
  const userMetadata = React.useMemo(() => user?.user_metadata ?? {}, [user]);
  const plan = userMetadata.plan ?? "free";
  const trialStatus = userMetadata.trial_status ?? "eligible";
  const trialEndsAt = userMetadata.trial_expires_at ? new Date(userMetadata.trial_expires_at) : null;
  const trialExpired = trialEndsAt ? trialEndsAt.getTime() <= Date.now() : false;
  const trialActive = trialStatus === "active" && !trialExpired;
  const hasPremiumAccess = plan === "premium" || trialActive;
  const canStartTrial = !hasPremiumAccess && (!userMetadata.trial_status || userMetadata.trial_status === "eligible");
  const requestOpenPlans = useCallback(() => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("granaapp:open-plans"));
    }
  }, []);
  const requestActivateTrial = useCallback(() => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("granaapp:activate-trial"));
    }
  }, []);
  const [searchParams, setSearchParams] = useSearchParams();
  const [messages, setMessages] = useState(() => [
    { role: "assistant", content: INITIAL_ASSISTANT_MESSAGE },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSupported, setRecordingSupported] = useState(true);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const bottomRef = useRef(null);
  const processedPromptRef = useRef("");

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setRecordingSupported(false);
    }
  }, []);

  const conversationPayload = useMemo(
    () =>
      messages.map((message) => ({
        role: message.role === "assistant" ? "assistant" : "user",
        content: message.content,
      })),
    [messages],
  );

  const sendMessage = useCallback(async (text) => {
    if (!text.trim()) return;
    if (!user) {
      toast.error("Entre na sua conta para usar o assistente.");
      return;
    }

    const userMessage = { role: "user", content: text.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...conversationPayload, userMessage],
          userId: user.id,
        }),
      });

      const rawText = await response.text();
      let data = null;
      if (rawText) {
        try {
          data = JSON.parse(rawText);
        } catch (parseError) {
          console.error("Erro ao interpretar resposta do assistente:", parseError);
          data = null;
        }
      }

      if (!response.ok) {
        throw new Error(data?.error || `Erro ${response.status}`);
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      const assistantText =
        typeof data.reply === "string" ? data.reply : data.reply?.content;

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            assistantText ??
            "Não consegui gerar uma resposta agora. Pode tentar reformular?",
        },
      ]);
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Não foi possível processar sua solicitação.");
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Desculpe, ocorreu um erro ao processar sua solicitação. Tente novamente em instantes.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [conversationPayload, user]);

  const promptParam = searchParams.get("prompt");

  useEffect(() => {
    if (!promptParam) {
      processedPromptRef.current = "";
      return;
    }

    const trimmedPrompt = promptParam.trim();
    if (!trimmedPrompt || processedPromptRef.current === trimmedPrompt) {
      return;
    }

    processedPromptRef.current = trimmedPrompt;
    setInput(trimmedPrompt);
    sendMessage(trimmedPrompt);
    setSearchParams({}, { replace: true });
  }, [promptParam, sendMessage, setSearchParams]);

  const handleSubmit = (event) => {
    event.preventDefault();
    sendMessage(input);
  };

  const handleSuggestionClick = (prompt) => {
    setInput(prompt);
  };

  const handleStartRecording = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error("Seu navegador não suporta gravação de áudio.");
      setRecordingSupported(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        setIsRecording(false);
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType });
        await transcribeAudio(blob);
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível iniciar a gravação.");
      setRecordingSupported(false);
    }
  };

  async function transcribeAudio(blob) {
    try {
      const base64 = await blobToBase64(blob);
      const response = await fetch(`${API_BASE}/api/transcribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audio: base64,
          mimeType: blob.type || "audio/webm",
        }),
      });

      const rawText = await response.text();
      let data = null;
      if (rawText) {
        try {
          data = JSON.parse(rawText);
        } catch (parseError) {
          console.error("Erro ao interpretar retorno da transcrição:", parseError);
          data = null;
        }
      }

      if (!response.ok) {
        throw new Error(data?.error || `Erro ${response.status}`);
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      if (data?.text) {
        sendMessage(data.text);
      } else {
        toast.error("Não consegui entender o áudio. Tente novamente.");
      }
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Não foi possível transcrever o áudio.");
    }
  }

  function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result.split(",")[1];
        resolve(base64data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  if (!hasPremiumAccess) {
    return (
      <div className="space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold text-gray-900 dark:text-gray-100">Assistente financeiro</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Desbloqueie o assistente com IA para registrar lançamentos por texto ou voz, gerar relatórios inteligentes e
            receber recomendações em tempo real.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr),minmax(0,1fr)]">
          <section className="relative overflow-hidden rounded-3xl border border-emerald-200 bg-emerald-50 p-8 text-emerald-700 shadow-sm dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-100">
            <div className="absolute -right-24 -top-24 h-48 w-48 rounded-full bg-emerald-400/20 blur-3xl" aria-hidden="true" />
            <div className="absolute -left-16 bottom-0 h-40 w-40 rounded-full bg-sky-400/15 blur-3xl" aria-hidden="true" />
            <div className="relative space-y-5">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200">
                🔒 Premium
              </span>
              <h2 className="text-xl font-semibold text-emerald-900 dark:text-emerald-100">Função exclusiva do plano Premium</h2>
              <p className="text-sm leading-relaxed">
                {canStartTrial
                  ? "Ative agora o teste Premium gratuito para conversar com o assistente inteligente, entender seus gastos e cadastrar lançamentos por voz."
                  : "Seu teste gratuito já foi utilizado. Faça o upgrade para continuar com os comandos por voz, relatórios inteligentes e recomendações automáticas."}
              </p>

              <div className="flex flex-wrap items-center gap-3">
                {canStartTrial && (
                  <button
                    type="button"
                    onClick={requestActivateTrial}
                    className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-sky-500 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:from-emerald-500 hover:to-sky-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30"
                  >
                    Testar Premium grátis por 7 dias
                  </button>
                )}
                <button
                  type="button"
                  onClick={requestOpenPlans}
                  className="inline-flex items-center justify-center rounded-full border border-emerald-400/70 px-4 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30 dark:border-emerald-500/40 dark:text-emerald-200 dark:hover:bg-emerald-900/40"
                >
                  Ver planos Premium
                </button>
              </div>

              <ul className="space-y-2 text-sm text-emerald-800/90 dark:text-emerald-100/90">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-lg leading-none">•</span>
                  <span>Gerencie despesas, rendas, investimentos e horas extras apenas descrevendo o movimento.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-lg leading-none">•</span>
                  <span>Use comandos de voz e deixe o app transcrever automaticamente para você.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-lg leading-none">•</span>
                  <span>Receba relatórios inteligentes e resumos prontos em poucos segundos.</span>
                </li>
              </ul>

              <p className="text-xs text-emerald-600/80 dark:text-emerald-200/70">
                Cancelamento simples, sem cartão até o fim do teste. Experimente e faça upgrade quando sentir o valor.
              </p>
            </div>
          </section>

          <aside className="flex flex-col gap-4 rounded-3xl border border-gray-200 bg-white p-6 text-sm text-gray-600 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Prévia do que você desbloqueia</h3>
            <ul className="space-y-2">
              <li>• “Registre que paguei 120 reais na conta de luz ontem, categoria moradia.”</li>
              <li>• “Quanto gastei com alimentação nas últimas 2 semanas?”</li>
              <li>• “Cadastre que recebi 300 reais de freelance hoje.”</li>
              <li>• “Quais investimentos renderam mais neste mês?”</li>
            </ul>

            <div className="rounded-2xl border border-dashed border-temaSky/40 bg-temaSky/5 p-4 text-xs text-gray-500 dark:border-temaEmerald/40 dark:bg-temaEmerald/10 dark:text-gray-200">
              <p className="font-semibold text-gray-700 dark:text-gray-100">Dica</p>
              <p className="mt-2">
                Combine comandos (“registra e já me fala o total do mês”) para ganhar ainda mais velocidade no seu controle financeiro.
              </p>
            </div>
          </aside>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-gray-900 dark:text-gray-100">
          Assistente financeiro
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Converse com o bot para registrar despesas, rendas, investimentos e consultar resumos usando texto ou voz.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr),minmax(0,1fr)]">
        <section className="flex h-[70vh] flex-col rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            {messages.map((message, index) => (
              <MessageBubble key={`${message.role}-${index}-${message.content.slice(0, 10)}`} role={message.role} content={message.content} />
            ))}
            {loading && <TypingIndicator />}
            <div ref={bottomRef} />
          </div>

          <form onSubmit={handleSubmit} className="border-t border-gray-200 dark:border-gray-800">
            <div className="flex items-end gap-3 p-3 sm:p-4">
              <button
                type="button"
                onClick={handleStartRecording}
                disabled={!recordingSupported}
                className={`inline-flex h-11 w-11 flex-none items-center justify-center rounded-full border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-temaSky/40 dark:focus-visible:ring-temaEmerald/40 ${
                  isRecording
                    ? "border-transparent bg-rose-500 text-white hover:bg-rose-600"
                    : "border-gray-300 text-gray-500 hover:border-temaSky hover:text-temaSky dark:border-gray-700 dark:text-gray-300 dark:hover:border-temaEmerald dark:hover:text-temaEmerald"
                }`}
                aria-label={isRecording ? "Encerrar gravação" : "Iniciar gravação"}
              >
                <MicIcon active={isRecording} />
              </button>
              <div className="flex-1">
                <textarea
                  rows={2}
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="Digite sua mensagem..."
                  className="w-full resize-none rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-temaSky focus:outline-none focus:ring-2 focus:ring-temaSky/20 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-temaEmerald dark:focus:ring-temaEmerald/20"
                  disabled={loading}
                />
              </div>
              <button
                type="submit"
                className="inline-flex h-11 w-11 flex-none items-center justify-center rounded-full bg-temaSky text-white shadow transition hover:bg-temaSky-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-temaSky/40 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-temaEmerald dark:hover:bg-temaEmerald-dark dark:focus-visible:ring-temaEmerald/40"
                disabled={loading}
                aria-label="Enviar mensagem"
              >
                <SendIcon />
              </button>
            </div>
            {isRecording && (
              <p className="px-4 pb-3 text-xs font-medium text-rose-500 dark:text-rose-300">
                Gravando... toque novamente no microfone para finalizar.
              </p>
            )}
          </form>
        </section>

        <aside className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Sugestões rápidas</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Clique em uma opção para preencher automaticamente.
            </p>
            <ul className="mt-4 space-y-3 text-sm text-gray-600 dark:text-gray-300">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <li key={prompt}>
                  <button
                    type="button"
                    onClick={() => handleSuggestionClick(prompt)}
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-left transition hover:border-temaSky hover:text-temaSky focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-temaSky/40 dark:border-gray-700 dark:bg-gray-950 dark:hover:border-temaEmerald dark:hover:text-temaEmerald dark:focus-visible:ring-temaEmerald/40"
                  >
                    {prompt}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-dashed border-temaSky/40 bg-temaSky/5 p-4 text-xs text-gray-600 dark:border-temaEmerald/40 dark:bg-temaEmerald/10 dark:text-gray-200">
            <p className="font-semibold text-gray-800 dark:text-gray-100">Como o assistente ajuda:</p>
            <ul className="mt-2 space-y-1">
              <li>• Identifica automaticamente se a mensagem é despesa, renda, investimento ou horas extras.</li>
              <li>• Classifica categorias (alimentação, transporte, etc.) e usa a data atual quando necessário.</li>
              <li>• Pode consultar totais por período, como “quanto gastei com alimentação este mês?”.</li>
              <li>• Suporte a mensagens ditadas por voz (transcrição automática).</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
