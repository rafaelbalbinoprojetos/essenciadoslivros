import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Compass,
  Droplets,
  Heart,
  Lightbulb,
  Plane,
  Shuffle,
  Smile,
  Sparkles,
  Sword,
  TrendingUp,
} from "lucide-react";
import { useBooksCatalog } from "../hooks/useBooksCatalog.js";
import { ensureCoverSrc } from "../utils/covers.js";

const MOODS = [
  { id: "surprise", label: "Me surpreender", icon: Sparkles, pattern: null },
  { id: "emotion", label: "Me emocionar", icon: Heart, pattern: /romance|drama|amor|emoç|biografia/i },
  { id: "learn", label: "Aprender algo novo", icon: Lightbulb, pattern: /história|ciência|filosofia|psicologia|negócio|desenvolvimento/i },
  { id: "laugh", label: "Rir", icon: Smile, pattern: /humor|comédia|diversão/i },
  { id: "cry", label: "Chorar", icon: Droplets, pattern: /drama|tragédia|guerra|memória|romance/i },
  { id: "adventure", label: "Aventurar-me", icon: Sword, pattern: /aventura|ação|fantasia|rpg|game/i },
  { id: "travel", label: "Viajar", icon: Plane, pattern: /viagem|história|fantasia|ficção|aventura/i },
  { id: "growth", label: "Crescer profissionalmente", icon: TrendingUp, pattern: /negócio|liderança|gestão|carreira|desenvolvimento/i },
];

const COLLAGE_SLOTS = [
  { left: 4, top: 3, rotate: -42, scale: 0.9 },
  { left: 19, top: -4, rotate: 88, scale: 1.02 },
  { left: 36, top: 5, rotate: -18, scale: 1.08 },
  { left: 55, top: -6, rotate: 176, scale: 0.92 },
  { left: 73, top: 4, rotate: -68, scale: 1.04 },
  { left: 87, top: -2, rotate: 38, scale: 0.82 },
  { left: -3, top: 29, rotate: 94, scale: 0.94 },
  { left: 14, top: 25, rotate: -29, scale: 1.08 },
  { left: 32, top: 31, rotate: 47, scale: 0.9 },
  { left: 48, top: 22, rotate: -8, scale: 1.16 },
  { left: 67, top: 28, rotate: 132, scale: 0.96 },
  { left: 84, top: 24, rotate: -46, scale: 1.02 },
  { left: 3, top: 58, rotate: -96, scale: 0.86 },
  { left: 20, top: 55, rotate: 24, scale: 1.04 },
  { left: 39, top: 62, rotate: -174, scale: 0.92 },
  { left: 56, top: 53, rotate: 52, scale: 1.1 },
  { left: 75, top: 59, rotate: -34, scale: 0.94 },
  { left: 90, top: 54, rotate: 103, scale: 0.84 },
];

function seededValue(seed, index) {
  const value = Math.sin(seed * 0.001 + index * 97.31) * 10000;
  return value - Math.floor(value);
}

function shuffleWithSeed(items, seed) {
  return [...items].sort((a, b) => seededValue(seed, String(a.id).length + items.indexOf(a)) - seededValue(seed, String(b.id).length + items.indexOf(b)));
}

function searchableText(book) {
  return [book.titulo, book.sinopse, book.genero?.nome, book.colecao?.nome].filter(Boolean).join(" ");
}

export default function UnexpectedEncounterPage() {
  const { items: books, loading, error, reload } = useBooksCatalog({ limit: 60, status: "ativo" });
  const [seed, setSeed] = useState(() => Date.now());
  const [moodId, setMoodId] = useState("surprise");

  const mood = MOODS.find((item) => item.id === moodId) ?? MOODS[0];
  const eligibleBooks = useMemo(() => {
    if (!mood.pattern) return books;
    const filtered = books.filter((book) => mood.pattern.test(searchableText(book)));
    return filtered.length ? filtered : books;
  }, [books, mood.pattern]);

  const encounter = useMemo(() => {
    if (!eligibleBooks.length) return null;
    return eligibleBooks[Math.floor(seededValue(seed, 41) * eligibleBooks.length)];
  }, [eligibleBooks, seed]);

  const collage = useMemo(() => {
    const ordered = shuffleWithSeed(books, seed).filter((book) => book.id !== encounter?.id);
    const visible = ordered.slice(0, COLLAGE_SLOTS.length - (encounter ? 1 : 0));
    if (encounter) {
      const selectedSlot = Math.floor(seededValue(seed, 77) * COLLAGE_SLOTS.length);
      visible.splice(selectedSlot, 0, encounter);
    }
    return visible.slice(0, COLLAGE_SLOTS.length);
  }, [books, encounter, seed]);

  const mixArchive = () => setSeed(Date.now() + Math.random() * 100000);
  const chooseMood = (id) => {
    setMoodId(id);
    setSeed(Date.now() + Math.random() * 100000);
  };

  if (loading && !books.length) {
    return <p className="py-24 text-center text-sm text-[rgb(var(--text-secondary))]">Misturando as estantes do acervo...</p>;
  }

  return (
    <section className="relative min-h-[calc(100vh-9rem)] overflow-hidden rounded-[32px] border border-[#d5b06a]/20 bg-[#090705] text-[#f4ead8] shadow-[0_45px_110px_-55px_rgba(22,13,3,0.98)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_68%_48%,rgba(184,126,51,0.16),transparent_42%),linear-gradient(105deg,rgba(7,5,3,0.99)_0%,rgba(10,7,4,0.95)_31%,rgba(9,6,3,0.63)_58%,rgba(5,4,3,0.88)_100%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.12] [background-image:linear-gradient(rgba(255,255,255,.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.025)_1px,transparent_1px)] [background-size:54px_54px]" />

      <div className="relative grid min-h-[calc(100vh-9rem)] lg:grid-cols-[330px_minmax(0,1fr)]">
        <aside className="relative z-30 border-b border-[#d5b06a]/15 bg-black/25 p-7 backdrop-blur-sm lg:border-b-0 lg:border-r lg:p-10">
          <p className="text-[9px] font-bold uppercase tracking-[0.42em] text-[#d5b06a]">Deixe o acervo escolher você</p>
          <h1 className="mt-5 font-display text-4xl font-semibold uppercase leading-[0.95] text-[#f8efdf] sm:text-5xl">Encontro<br />inesperado</h1>
          <div className="mt-6 h-px w-36 bg-gradient-to-r from-[#d5b06a]/80 to-transparent" />
          <p className="mt-6 max-w-xs text-sm leading-6 text-[#d5c7b3]/75">Um passeio pelas estantes do Essência. Você não escolhe a obra. Ela pode escolher você.</p>

          <button type="button" onClick={mixArchive} className="mt-8 inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-full border border-[#d5b06a]/70 bg-[#d5b06a]/5 px-5 text-sm font-semibold text-[#f2d7a5] transition hover:bg-[#d5b06a]/15">
            <Shuffle className="h-4 w-4" /> Misturar acervo
          </button>

          <div className="mt-10">
            <p className="text-[9px] font-bold uppercase tracking-[0.34em] text-[#d5b06a]">Hoje eu quero...</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
              {MOODS.map((item) => {
                const active = item.id === moodId;
                return (
                  <button key={item.id} type="button" onClick={() => chooseMood(item.id)} className={`flex min-h-10 items-center gap-3 rounded-full border px-4 text-left text-xs transition ${active ? "border-[#d5b06a]/80 bg-[#d5b06a]/12 text-[#f5ddae]" : "border-[#d5b06a]/20 text-[#cbbda9]/78 hover:border-[#d5b06a]/45 hover:text-[#f1e3cf]"}`}>
                    <item.icon className="h-4 w-4 flex-none" /> {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        <div className="relative min-h-[720px] overflow-hidden lg:min-h-0">
          {error && (
            <div className="absolute left-1/2 top-8 z-50 flex -translate-x-1/2 items-center gap-4 rounded-full border border-red-300/20 bg-red-950/80 px-5 py-3 text-xs text-red-100 backdrop-blur-xl">
              {error}<button type="button" onClick={reload} className="font-bold underline">Tentar novamente</button>
            </div>
          )}

          <div className="absolute inset-0">
            {collage.map((book, index) => {
              const slot = COLLAGE_SLOTS[index];
              const selected = book.id === encounter?.id;
              const left = slot.left + (seededValue(seed, index + 101) - 0.5) * 9;
              const top = slot.top + (seededValue(seed, index + 211) - 0.5) * 8;
              const rotation = slot.rotate + (seededValue(seed, index + 307) - 0.5) * 18;
              return (
                <Link
                  key={`${book.id}-${seed}`}
                  to={`/biblioteca/${book.id}`}
                  title={book.titulo}
                  className={`group absolute block aspect-[3/4] w-[clamp(105px,13vw,190px)] transition duration-500 hover:z-50 hover:scale-110 ${selected ? "drop-shadow-[0_0_20px_rgba(224,183,95,0.72)]" : "drop-shadow-[0_22px_22px_rgba(0,0,0,0.72)]"}`}
                  style={{ left: `${left}%`, top: `${top}%`, transform: `rotate(${rotation}deg) scale(${slot.scale})`, zIndex: selected ? 40 : 10 + index }}
                >
                  <img src={ensureCoverSrc(book.capa_url || book.capa_cinematica_url)} alt={book.titulo} className="h-full w-full object-contain brightness-[0.82] saturate-[0.84] transition duration-500 group-hover:brightness-100 group-hover:saturate-100" />
                </Link>
              );
            })}
          </div>

          {encounter && (
            <div className="absolute inset-x-5 bottom-5 z-50 mx-auto flex max-w-2xl flex-col gap-4 rounded-[24px] border border-[#d5b06a]/25 bg-black/75 p-5 shadow-2xl backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-[#d5b06a]">Seu encontro de agora</p>
                <h2 className="mt-1 truncate font-display text-xl font-semibold text-[#fff5e5]">{encounter.titulo}</h2>
                <p className="mt-1 truncate text-xs text-[#cdbfae]/70">{encounter.autor?.nome ?? "Curadoria Essência"} · {encounter.genero?.nome ?? "Acervo Essência"}</p>
              </div>
              <Link to={`/biblioteca/${encounter.id}`} className="inline-flex min-h-11 flex-none items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#b98232] via-[#d5a04c] to-[#9c671f] px-5 text-sm font-semibold text-white transition hover:brightness-110">
                Abrir encontro <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}

          <div className="pointer-events-none absolute right-6 top-6 z-40 hidden items-center gap-2 rounded-full border border-[#d5b06a]/20 bg-black/45 px-4 py-2 text-[10px] text-[#d5c7b3]/65 backdrop-blur lg:flex">
            <Compass className="h-4 w-4 text-[#d5b06a]" /> Clique em qualquer capa para romper o acaso
          </div>
        </div>
      </div>
    </section>
  );
}
