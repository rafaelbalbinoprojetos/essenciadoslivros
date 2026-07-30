import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  Award,
  BookOpen,
  Camera,
  Crown,
  Flame,
  Headphones,
  Heart,
  LibraryBig,
  Play,
  ScrollText,
  Sparkles,
  Star,
  Trophy,
  Save,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { getProfileMuseumData } from "../services/profile.js";
import { ensureCoverSrc } from "../utils/covers.js";
import { hasCinematicExperience } from "../services/narratives.js";
import { getBookRatingAverage } from "../utils/bookSorting.js";
import { BUCKETS, getPublicUrl, uploadToBucket } from "../lib/storage.js";

function formatDate(value) {
  if (!value) return "Data não registrada";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value));
}

function formatHours(minutes = 0) {
  const total = Math.max(0, Math.round(minutes));
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  if (!hours) return `${mins} min`;
  return `${hours}h ${mins.toString().padStart(2, "0")}min`;
}

function percent(value) {
  return `${Math.max(0, Math.min(100, Math.round(value)))}%`;
}

function getName(user) {
  return (
    user?.user_metadata?.display_name
    || user?.user_metadata?.full_name
    || user?.user_metadata?.name
    || user?.email?.split("@")[0]
    || "Leitor Essência"
  );
}

function pickCover(book) {
  return ensureCoverSrc(book?.capa_cinematica_url || book?.capa_url);
}

function ProfileBookCard({ book, badge, compact = false }) {
  if (!book) return null;
  return (
    <Link to={`/biblioteca/${book.id}`} className={`group block flex-none ${compact ? "w-28" : "w-44"}`}>
      <div className="relative aspect-[3/4] overflow-hidden rounded-[18px] border border-[#7f612f]/45 bg-[#090806] shadow-[0_20px_48px_-32px_rgba(0,0,0,0.95)]">
        <img src={pickCover(book)} alt={book.titulo} loading="lazy" className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]" />
        <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/76 via-transparent to-black/10" />
        {badge && (
          <span className="absolute left-2.5 top-2.5 rounded-full border border-[#d4a657]/35 bg-black/62 px-2 py-1 text-[8px] font-bold uppercase tracking-[0.16em] text-[#f2d08b]">
            {badge}
          </span>
        )}
      </div>
      <p className="mt-2 line-clamp-2 font-display text-sm leading-tight text-[#f4dfb9]">{book.titulo}</p>
      {!compact && <p className="mt-1 truncate text-[11px] text-[#b6a283]">{book.autor?.nome || "Autor não informado"}</p>}
    </Link>
  );
}

function MuseumPanel({ title, action, children, className = "" }) {
  return (
    <section className={`rounded-[28px] border border-[#7f612f]/28 bg-[linear-gradient(145deg,rgba(255,232,181,0.055),rgba(255,255,255,0.012)),rgba(10,9,7,0.84)] p-5 shadow-[0_30px_70px_-55px_rgba(0,0,0,0.95)] ${className}`}>
      <header className="mb-5 flex items-center justify-between gap-4">
        <h2 className="font-display text-xl font-semibold text-[#f5ddb0]">{title}</h2>
        {action}
      </header>
      {children}
    </section>
  );
}

export default function ProfilePage() {
  const { user, updateUserMetadata } = useAuth();
  const [data, setData] = useState({ books: [], journeys: [], progress: [], reviews: [], likes: [], saves: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [profileName, setProfileName] = useState(() => getName(user));
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    getProfileMuseumData(user?.id)
      .then((payload) => {
        if (active) setData(payload);
      })
      .catch((loadError) => {
        console.error("[Profile] erro ao carregar museu pessoal:", loadError);
        if (active) setError(loadError?.message || "Não foi possível carregar seu perfil agora.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user?.id]);

  useEffect(() => {
    setProfileName(getName(user));
    setAvatarFile(null);
    setAvatarPreview("");
  }, [user]);

  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreview("");
      return undefined;
    }
    const preview = URL.createObjectURL(avatarFile);
    setAvatarPreview(preview);
    return () => URL.revokeObjectURL(preview);
  }, [avatarFile]);

  const view = useMemo(() => {
    const booksById = new Map(data.books.map((book) => [book.id, book]));
    const likedBooks = data.likes.map((row) => booksById.get(row.livro_id)).filter(Boolean);
    const savedBooks = data.saves.map((row) => booksById.get(row.livro_id)).filter(Boolean);
    const ratedBooks = data.reviews.map((row) => ({ ...booksById.get(row.livro_id), myRating: Number(row.nota) || 0, ratedAt: row.criado_em })).filter((book) => book.id);
    const progressRows = data.progress.filter((row) => booksById.has(row.livro_id));
    const progressBooks = progressRows.map((row) => ({ ...booksById.get(row.livro_id), progress: row }));
    const cinematicBooks = data.books.filter(hasCinematicExperience);
    const completedJourneys = data.journeys.filter((journey) => journey.progresso?.status === "concluida");
    const activeJourney = data.journeys.find((journey) => journey.progresso?.status === "em_andamento");
    const continueBook = progressBooks[0] || cinematicBooks[0] || data.books[0] || null;

    const genreCounts = new Map();
    [...likedBooks, ...ratedBooks, ...progressBooks].forEach((book) => {
      const genre = book.genero?.nome;
      if (genre) genreCounts.set(genre, (genreCounts.get(genre) || 0) + 1);
    });
    const favoriteGenres = [...genreCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    const favoriteGenre = favoriteGenres[0]?.[0] || data.books[0]?.genero?.nome || "Acervo Essência";

    const exploredIds = new Set([
      ...progressRows.map((row) => row.livro_id),
      ...data.reviews.map((row) => row.livro_id),
      ...data.likes.map((row) => row.livro_id),
      ...data.saves.map((row) => row.livro_id),
    ]);
    const exploredPercent = data.books.length ? (exploredIds.size / data.books.length) * 100 : 0;
    const totalListeningMinutes = data.progress.reduce((sum, row) => sum + (Number(row.tempo_reproduzido) || 0) / 60, 0);
    const journeyMinutes = data.journeys.reduce((sum, journey) => sum + (Number(journey.progresso?.tempo_estudado_min) || 0), 0);

    const recommendations = data.books
      .filter((book) => !exploredIds.has(book.id))
      .map((book) => ({
        ...book,
        compatibility: Math.min(96, 72 + (book.genero?.nome === favoriteGenre ? 14 : 0) + Math.round(getBookRatingAverage(book) * 2)),
      }))
      .sort((a, b) => b.compatibility - a.compatibility)
      .slice(0, 8);

    const recentActivity = [
      ...data.reviews.slice(0, 4).map((row) => ({ type: "Avaliação", title: booksById.get(row.livro_id)?.titulo, detail: `${row.nota} estrelas`, date: row.criado_em, icon: Star })),
      ...data.likes.slice(0, 4).map((row) => ({ type: "Curtida", title: booksById.get(row.livro_id)?.titulo, detail: "Você curtiu esta obra", date: row.criado_em, icon: Heart })),
      ...progressBooks.slice(0, 4).map((book) => ({ type: "Progresso", title: book.titulo, detail: `${Math.round(Number(book.progress?.progresso_percentual) || 0)}% concluído`, date: book.progress?.ultima_atividade, icon: Play })),
    ].filter((item) => item.title).sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)).slice(0, 6);

    return {
      activeJourney,
      cinematicBooks,
      completedJourneys,
      continueBook,
      exploredIds,
      exploredPercent,
      favoriteGenre,
      favoriteGenres,
      journeyMinutes,
      likedBooks,
      progressBooks,
      ratedBooks,
      recentActivity,
      recommendations,
      savedBooks,
      totalListeningMinutes,
    };
  }, [data]);

  const displayName = getName(user);
  const metadata = user?.user_metadata ?? {};
  const plan = metadata.subscription_tier ?? metadata.plan ?? "free";
  const isPremium = plan === "premium";
  const avatarUrl = metadata.avatar_url || metadata.picture;
  const currentAvatar = avatarPreview || avatarUrl;
  const initials = displayName.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  const profileDirty = profileName.trim() !== displayName.trim() || Boolean(avatarFile);
  const completedBooks = view.progressBooks.filter((book) => Number(book.progress?.progresso_percentual) >= 95).length;
  const achievementCount = [
    view.exploredIds.size >= 1,
    view.likedBooks.length >= 1,
    view.ratedBooks.length >= 1,
    view.cinematicBooks.length >= 1,
    view.completedJourneys.length >= 1,
    view.totalListeningMinutes >= 60,
  ].filter(Boolean).length;

  async function handleSaveProfile(event) {
    event.preventDefault();
    if (!profileDirty || !updateUserMetadata || !user?.id) return;

    const nextName = profileName.trim();
    if (!nextName) {
      toast.error("Informe um nome para o perfil.");
      return;
    }

    try {
      setProfileSaving(true);
      let nextAvatarUrl = avatarUrl || null;
      if (avatarFile) {
        if (!avatarFile.type?.startsWith("image/")) {
          throw new Error("Escolha uma imagem válida para a foto de perfil.");
        }
        const avatarPath = await uploadToBucket(BUCKETS.capas, avatarFile, {
          prefix: `avatars/${user.id}/`,
        });
        nextAvatarUrl = getPublicUrl(BUCKETS.capas, avatarPath);
      }

      await updateUserMetadata({
        display_name: nextName,
        full_name: nextName,
        avatar_url: nextAvatarUrl,
        picture: nextAvatarUrl,
      });

      setAvatarFile(null);
      setAvatarPreview("");
      toast.success("Perfil atualizado com sucesso.");
    } catch (saveError) {
      console.error("[Profile] erro ao salvar perfil:", saveError);
      toast.error(saveError?.message || "Não foi possível atualizar seu perfil.");
    } finally {
      setProfileSaving(false);
    }
  }

  if (loading) {
    return <p className="py-20 text-center text-sm text-[rgb(var(--text-secondary))]">Abrindo seu museu pessoal...</p>;
  }

  return (
    <div className="profile-museum relative -mx-4 -mt-6 min-h-full overflow-hidden bg-[#050504] px-4 pb-20 pt-7 text-[#e9dcc4] md:-mx-8 md:px-8">
      <div className="pointer-events-none absolute inset-0 opacity-80 [background-image:radial-gradient(circle_at_18%_4%,rgba(207,157,74,0.19),transparent_29%),radial-gradient(circle_at_83%_10%,rgba(115,69,255,0.16),transparent_27%),linear-gradient(115deg,rgba(255,255,255,0.025)_1px,transparent_1px)] [background-size:auto,auto,42px_42px]" />
      <div className="relative mx-auto max-w-[1500px] space-y-7">
        {error && <div className="rounded-2xl border border-red-500/30 bg-red-950/30 p-4 text-sm text-red-100">{error}</div>}

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <form onSubmit={handleSaveProfile} className="rounded-[34px] border border-[#8b6b32]/30 bg-[linear-gradient(135deg,rgba(255,234,188,0.07),rgba(255,255,255,0.015)),rgba(9,8,6,0.82)] p-6 shadow-[0_38px_100px_-62px_rgba(0,0,0,0.98)]">
            <p className="text-[10px] font-bold uppercase tracking-[0.42em] text-[#d3ac68]">Essência dos Livros</p>
            <div className="mt-8 flex flex-col gap-6 sm:flex-row sm:items-center">
              <div className="relative h-36 w-36 flex-none rounded-full border border-[#d4a657]/55 bg-[#14100b] p-1 shadow-[0_20px_60px_-30px_rgba(212,166,87,0.6)]">
                <div className="h-full w-full overflow-hidden rounded-full">
                {currentAvatar ? (
                  <img src={currentAvatar} alt={displayName} className="h-full w-full rounded-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center rounded-full bg-[radial-gradient(circle,rgba(139,92,246,0.25),rgba(14,10,7,1))] font-display text-4xl text-[#f5ddb0]">{initials}</div>
                )}
                </div>
                <label className="absolute bottom-1 right-1 grid h-11 w-11 cursor-pointer place-items-center rounded-full border border-[#d4a657]/45 bg-[#d4a657] text-[#160f07] shadow-lg transition hover:bg-[#f0c879]" title="Trocar foto">
                  <Camera className="h-5 w-5" />
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/avif"
                    className="sr-only"
                    onChange={(event) => setAvatarFile(event.target.files?.[0] ?? null)}
                  />
                </label>
              </div>
              <div className="min-w-0">
                <p className="font-display text-xl text-[#dcc9a9]">Bem-vindo de volta,</p>
                <input
                  type="text"
                  value={profileName}
                  onChange={(event) => setProfileName(event.target.value)}
                  className="mt-1 w-full min-w-0 rounded-2xl border border-[#d4a657]/18 bg-black/22 px-0 py-1 font-display text-5xl font-semibold leading-none text-[#fff1d2] outline-none transition placeholder:text-[#8c785b] focus:border-[#d4a657]/45 focus:bg-black/34 focus:px-4 md:text-6xl"
                  placeholder="Seu nome"
                  aria-label="Nome de exibição"
                />
                <p className="mt-5 max-w-xl font-display text-lg italic leading-relaxed text-[#c7b596]">
                  "Não contamos a história. Apenas devolvemos a sensação de vivê-la."
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <span className="inline-flex items-center gap-2 rounded-full border border-[#8b5cf6]/35 bg-[#8b5cf6]/12 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-[#d7c3ff]">
                    <Crown className="h-3.5 w-3.5" /> {isPremium ? "Membro Premium" : "Membro Essência"}
                  </span>
                  <span className="rounded-full border border-[#d4a657]/25 bg-black/24 px-3 py-1.5 text-xs text-[#b9a17a]">Desde {formatDate(user?.created_at)}</span>
                </div>
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <button
                    type="submit"
                    disabled={!profileDirty || profileSaving}
                    className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[#d4a657] px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-[#160f07] transition hover:bg-[#f0c879] disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    <Save className="h-4 w-4" /> {profileSaving ? "Salvando..." : "Salvar perfil"}
                  </button>
                  {avatarFile && <span className="max-w-[220px] truncate text-xs text-[#b8a78b]">{avatarFile.name}</span>}
                </div>
              </div>
            </div>
          </form>

          <MuseumPanel title="Sua jornada em números" className="flex flex-col justify-between">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { label: "Obras exploradas", value: view.exploredIds.size, icon: Sparkles },
                { label: "Jornadas concluídas", value: view.completedJourneys.length, icon: Trophy },
                { label: "Horas vividas", value: Math.round((view.totalListeningMinutes + view.journeyMinutes) / 60), icon: Headphones },
                { label: "Conquistas", value: achievementCount, icon: Award },
              ].map(({ label, value, icon }) => (
                <div key={label} className="rounded-2xl border border-white/8 bg-white/[0.035] p-3">
                  {React.createElement(icon, { className: "h-5 w-5 text-[#9b6cff]" })}
                  <strong className="mt-3 block font-display text-2xl text-[#fff1d2]">{value}</strong>
                  <span className="text-[10px] uppercase tracking-[0.12em] text-[#a89678]">{label}</span>
                </div>
              ))}
            </div>
            <div className="mt-6 overflow-hidden rounded-2xl border border-[#7f612f]/20 bg-black/22 p-5">
              <p className="font-display text-lg italic text-[#d8c29d]">Cada obra é um portal. Sua essência fica para sempre.</p>
            </div>
          </MuseumPanel>
        </section>

        <section className="grid gap-5 xl:grid-cols-[1fr_0.9fr_0.8fr]">
          <MuseumPanel title="Continue de onde parou">
            {view.continueBook ? (
              <div className="grid gap-5 sm:grid-cols-[160px_1fr]">
                <img src={pickCover(view.continueBook)} alt={view.continueBook.titulo} className="aspect-[3/4] w-full rounded-2xl object-cover" />
                <div className="flex flex-col justify-center">
                  <h3 className="font-display text-2xl text-[#fff1d2]">{view.continueBook.titulo}</h3>
                  <p className="mt-2 text-sm text-[#b8a78b]">{view.continueBook.autor?.nome || view.continueBook.genero?.nome || "Curadoria Essência"}</p>
                  <div className="mt-6 h-2 rounded-full bg-white/10">
                    <span className="block h-full rounded-full bg-gradient-to-r from-[#d4a657] to-[#8b5cf6]" style={{ width: percent(view.continueBook.progress?.progresso_percentual || 18) }} />
                  </div>
                  <p className="mt-2 text-xs text-[#b8a78b]">{percent(view.continueBook.progress?.progresso_percentual || 18)} explorado</p>
                  <Link to={`/biblioteca/${view.continueBook.id}${hasCinematicExperience(view.continueBook) ? "#narrativa" : ""}`} className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#8b5cf6] to-[#6d28d9] px-5 py-3 text-sm font-semibold text-white shadow-[0_22px_46px_-26px_rgba(139,92,246,0.95)]">
                    <Play className="h-4 w-4" fill="currentColor" /> Continuar jornada
                  </Link>
                </div>
              </div>
            ) : (
              <p className="text-sm text-[#b8a78b]">Explore uma obra para iniciar seu museu pessoal.</p>
            )}
          </MuseumPanel>

          <MuseumPanel title="Atividade recente">
            <div className="space-y-3">
              {view.recentActivity.length ? view.recentActivity.map((item, index) => (
                <div key={`${item.type}-${item.title}-${index}`} className="grid grid-cols-[42px_1fr_auto] items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.035] p-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#d4a657]/10 text-[#d4a657]">{React.createElement(item.icon, { className: "h-4 w-4" })}</span>
                  <span className="min-w-0">
                    <strong className="block truncate text-sm text-[#f2dfbd]">{item.title}</strong>
                    <span className="text-xs text-[#9f8f75]">{item.type} - {item.detail}</span>
                  </span>
                  <span className="text-[10px] text-[#7d6f5b]">{formatDate(item.date)}</span>
                </div>
              )) : <p className="text-sm text-[#b8a78b]">Suas próximas ações aparecerão como uma linha do tempo.</p>}
            </div>
          </MuseumPanel>

          <MuseumPanel title="Seu progresso geral">
            <div className="grid place-items-center py-4">
              <div className="grid h-48 w-48 place-items-center rounded-full border-[14px] border-[#30281f]" style={{ borderRightColor: "#8b5cf6", borderTopColor: "#8b5cf6" }}>
                <span className="text-center">
                  <strong className="block font-display text-5xl text-[#fff1d2]">{percent(view.exploredPercent)}</strong>
                  <span className="text-xs text-[#ad9b7f]">da biblioteca explorada</span>
                </span>
              </div>
              <div className="mt-6 grid w-full grid-cols-2 gap-3 text-center text-sm">
                <span><strong className="block font-display text-2xl text-[#d4a657]">{formatHours(view.totalListeningMinutes + view.journeyMinutes)}</strong><span className="text-xs text-[#9f8f75]">Tempo total</span></span>
                <span><strong className="block font-display text-2xl text-[#d4a657]">{completedBooks}</strong><span className="text-xs text-[#9f8f75]">Obras concluídas</span></span>
              </div>
            </div>
          </MuseumPanel>
        </section>

        <section className="grid gap-5 xl:grid-cols-3">
          <MuseumPanel title="Obras que você curtiu" action={<Link to="/mural" className="text-xs text-[#d4a657]">Ver todas</Link>}>
            <div className="flex gap-4 overflow-x-auto pb-2">{(view.likedBooks.length ? view.likedBooks : data.books.slice(0, 5)).slice(0, 8).map((book) => <ProfileBookCard key={book.id} book={book} badge="Curtida" compact />)}</div>
          </MuseumPanel>
          <MuseumPanel title="Obras que você avaliou" action={<Link to="/mural?ordem=rating_desc" className="text-xs text-[#d4a657]">Ver notas</Link>}>
            <div className="flex gap-4 overflow-x-auto pb-2">{(view.ratedBooks.length ? view.ratedBooks : data.books.slice(0, 5)).slice(0, 8).map((book) => <ProfileBookCard key={book.id} book={book} badge={book.myRating ? `${book.myRating} estrelas` : "Avaliação"} compact />)}</div>
          </MuseumPanel>
          <MuseumPanel title="Memórias em exposição" action={<Link to="/memorias-cinematicas" className="text-xs text-[#d4a657]">Ver todas</Link>}>
            <div className="flex gap-4 overflow-x-auto pb-2">{(view.cinematicBooks.length ? view.cinematicBooks : data.books.slice(0, 5)).slice(0, 8).map((book) => <ProfileBookCard key={book.id} book={book} badge="Cinemática" compact />)}</div>
          </MuseumPanel>
        </section>

        <MuseumPanel title="Recomendações para você" action={<Link to="/encontro-inesperado" className="text-xs text-[#d4a657]">Ver recomendações</Link>}>
          <div className="flex gap-5 overflow-x-auto pb-3">
            {(view.recommendations.length ? view.recommendations : data.books.slice(0, 8)).map((book, index) => (
              <div key={book.id} className="flex-none">
                <ProfileBookCard book={book} badge={`${book.compatibility || 80 + index}% compatível`} />
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {[book.genero?.nome, hasCinematicExperience(book) && "Memória", book.audio_url && "Áudio"].filter(Boolean).slice(0, 3).map((tag) => (
                    <span key={tag} className="rounded-full border border-white/12 px-2 py-1 text-[9px] text-[#b8a78b]">{tag}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </MuseumPanel>

        <section className="grid gap-5 lg:grid-cols-[0.85fr_1fr_0.85fr]">
          <MuseumPanel title="Seus gêneros favoritos">
            <div className="space-y-4">
              {(view.favoriteGenres.length ? view.favoriteGenres : [[view.favoriteGenre, 1]]).map(([genre, count], index) => (
                <div key={genre}>
                  <div className="flex justify-between text-sm"><span>{genre}</span><span className="text-[#d4a657]">{count}</span></div>
                  <div className="mt-2 h-2 rounded-full bg-white/10"><span className="block h-full rounded-full bg-gradient-to-r from-[#d4a657] to-[#8b5cf6]" style={{ width: `${Math.max(18, 88 - index * 14)}%` }} /></div>
                </div>
              ))}
            </div>
          </MuseumPanel>
          <MuseumPanel title="Suas conquistas">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ["Explorador Curioso", "1 obra", Sparkles, view.exploredIds.size >= 1],
                ["Viajante de Mundos", "5 obras", LibraryBig, view.exploredIds.size >= 5],
                ["Guardião de Histórias", "50 obras", BookOpen, view.exploredIds.size >= 50],
                ["Mestre das Jornadas", "100 horas", Crown, view.totalListeningMinutes + view.journeyMinutes >= 6000],
              ].map(([title, goal, icon, unlocked]) => (
                <div key={title} className={`rounded-2xl border p-4 text-center ${unlocked ? "border-[#d4a657]/35 bg-[#d4a657]/8" : "border-white/10 bg-white/[0.03] opacity-60"}`}>
                  {React.createElement(icon, { className: "mx-auto h-8 w-8 text-[#d4a657]" })}
                  <strong className="mt-3 block text-xs text-[#f2dfbd]">{title}</strong>
                  <span className="text-[10px] text-[#a89678]">{goal}</span>
                </div>
              ))}
            </div>
          </MuseumPanel>
          <MuseumPanel title="Metas de leitura/escuta">
            <div className="space-y-6">
              <Goal icon={BookOpen} label="Explorar 100 obras" value={view.exploredIds.size} total={100} />
              <Goal icon={Headphones} label="Viver 200 horas de histórias" value={Math.round((view.totalListeningMinutes + view.journeyMinutes) / 60)} total={200} />
              <Goal icon={ScrollText} label="Avaliar 50 obras" value={view.ratedBooks.length} total={50} />
            </div>
          </MuseumPanel>
        </section>
      </div>
    </div>
  );
}

function Goal({ icon, label, value, total }) {
  const width = percent((value / total) * 100);
  return (
    <div className="grid grid-cols-[32px_1fr] items-center gap-3">
      {React.createElement(icon, { className: "h-7 w-7 text-[#9b6cff]" })}
      <div>
        <div className="flex justify-between text-sm"><span>{label}</span><span className="text-[#b8a78b]">{value} / {total}</span></div>
        <div className="mt-2 h-2 rounded-full bg-white/10"><span className="block h-full rounded-full bg-gradient-to-r from-[#8b5cf6] to-[#d4a657]" style={{ width }} /></div>
      </div>
    </div>
  );
}
