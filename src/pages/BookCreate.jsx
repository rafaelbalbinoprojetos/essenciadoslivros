import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  createAuthor,
  createBook,
  createCollection,
  getBookById,
  listAuthors,
  listCollections,
  listGenres,
  updateBook,
} from "../services/books.js";
import { BUCKETS, uploadToBucket, getPublicUrl, removeFromBucket } from "../lib/storage.js";
import { addNarrativeTracks, deleteNarrativeTrack, getNarrativeByBook, saveNarrative, updateNarrativeTrack as updateNarrativeTrackRecord } from "../services/narratives.js";

const STATUS_OPTIONS = [
  { value: "ativo", label: "Ativo" },
  { value: "rascunho", label: "Rascunho" },
  { value: "oculto", label: "Oculto" },
];

const INITIAL_STATE = {
  titulo: "",
  subtitulo: "",
  autor_id: "",
  genero_id: "",
  colecao_id: "",
  sinopse: "",
  capa_url: "",
  capa_cinematica_url: "",
  pdf_url: "",
  audio_url: "",
  tem_experiencia_cinematica: false,
  titulo_cinematico: "",
  descricao_cinematica: "",
  duracao_audio: "",
  data_lancamento: "",
  status: "ativo",
  destaque: false,
};

export default function BookCreatePage() {
  const navigate = useNavigate();
  const { bookId } = useParams();
  const isEdit = Boolean(bookId);
  const [bookLoading, setBookLoading] = useState(Boolean(bookId));
  const [formData, setFormData] = useState(INITIAL_STATE);
  const [loading, setLoading] = useState(false);
  const [metaLoading, setMetaLoading] = useState(true);
  const [metaError, setMetaError] = useState(null);
  const [authors, setAuthors] = useState([]);
  const [genres, setGenres] = useState([]);
  const [collections, setCollections] = useState([]);
  const [authorForm, setAuthorForm] = useState({ nome: "", nacionalidade: "", bio: "" });
  const [collectionForm, setCollectionForm] = useState({ nome: "", descricao: "", capa_url: "" });
  const [creatingAuthor, setCreatingAuthor] = useState(false);
  const [creatingCollection, setCreatingCollection] = useState(false);
  const [mediaFiles, setMediaFiles] = useState({ capa: null, capaCinematica: null, pdf: null, audio: null });
  const [uploading, setUploading] = useState(false);
  const [narrativeForm, setNarrativeForm] = useState({ titulo: "", descricao: "" });
  const [narrativeTracks, setNarrativeTracks] = useState([]);
  const [existingNarrative, setExistingNarrative] = useState(null);
  const [trackReplacements, setTrackReplacements] = useState({});
  const [deletingTrackIds, setDeletingTrackIds] = useState(() => new Set());

  const handleFileChange = (field) => (event) => {
    const file = event.target.files?.[0] ?? null;
    setMediaFiles((prev) => ({ ...prev, [field]: file }));
  };

  const handleNarrativeFiles = (event) => {
    const files = Array.from(event.target.files ?? []);
    setNarrativeTracks(
      files.map((file, index) => ({
        file,
        titulo: `Cena ${index + 1} — ${file.name.replace(/\.[^.]+$/, "")}`,
        descricao: "",
      })),
    );
  };

  const updateNarrativeTrack = (index, field, value) => {
    setNarrativeTracks((current) => current.map((track, trackIndex) => (
      trackIndex === index ? { ...track, [field]: value } : track
    )));
  };

  const removeNarrativeTrack = (index) => {
    setNarrativeTracks((current) => current.filter((_, trackIndex) => trackIndex !== index));
  };

  const moveNarrativeTrack = (index, direction) => {
    setNarrativeTracks((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const updateExistingTrack = (trackId, field, value) => {
    setExistingNarrative((current) => ({
      ...current,
      faixas: (current?.faixas ?? []).map((track) => (
        track.id === trackId ? { ...track, [field]: value } : track
      )),
    }));
  };

  const handleTrackReplacement = (trackId) => (event) => {
    const file = event.target.files?.[0] ?? null;
    setTrackReplacements((current) => ({ ...current, [trackId]: file }));
  };

  const handleDeleteExistingTrack = async (track) => {
    const confirmed = window.confirm(`Excluir definitivamente a cena ${track.ordem}: ${track.titulo}?`);
    if (!confirmed) return;

    setDeletingTrackIds((current) => new Set(current).add(track.id));
    try {
      await deleteNarrativeTrack(track.id);
      setExistingNarrative((current) => ({
        ...current,
        faixas: (current?.faixas ?? []).filter((item) => item.id !== track.id),
      }));
      setTrackReplacements((current) => {
        const next = { ...current };
        delete next[track.id];
        return next;
      });

      try {
        await removeFromBucket(BUCKETS.narrativas, [track.audio_path]);
      } catch (storageError) {
        console.error("[BookCreate] cena excluída, mas arquivo não removido:", storageError);
        toast.error("Cena excluída, mas o arquivo antigo precisa ser removido manualmente do Storage.");
        return;
      }
      toast.success("Cena excluída com sucesso.");
    } catch (deleteError) {
      console.error("[BookCreate] erro ao excluir cena:", deleteError);
      toast.error(deleteError.message ?? "Não foi possível excluir a cena.");
    } finally {
      setDeletingTrackIds((current) => {
        const next = new Set(current);
        next.delete(track.id);
        return next;
      });
    }
  };

  // Modo edição: carrega o livro e preenche o formulário.
  useEffect(() => {
    if (!bookId) return undefined;
    let active = true;
    (async () => {
      setBookLoading(true);
      try {
        const [book, narrative] = await Promise.all([
          getBookById(bookId),
          getNarrativeByBook(bookId),
        ]);
        if (!active || !book) return;
        setFormData({
          titulo: book.titulo ?? "",
          subtitulo: book.subtitulo ?? "",
          autor_id: book.autor?.id ?? "",
          genero_id: book.genero?.id ?? "",
          colecao_id: book.colecao?.id ?? "",
          sinopse: book.sinopse ?? "",
          capa_url: book.capa_url ?? "",
          capa_cinematica_url: book.capa_cinematica_url ?? "",
          pdf_url: book.pdf_url ?? "",
          audio_url: book.audio_url ?? "",
          tem_experiencia_cinematica: Boolean(book.tem_experiencia_cinematica),
          titulo_cinematico: book.titulo_cinematico ?? "",
          descricao_cinematica: book.descricao_cinematica ?? "",
          duracao_audio: book.duracao_audio != null ? String(book.duracao_audio) : "",
          data_lancamento: book.data_lancamento ?? "",
          status: book.status ?? "ativo",
          destaque: Boolean(book.destaque),
        });
        if (narrative) {
          setExistingNarrative(narrative);
          setNarrativeForm({
            titulo: narrative.titulo ?? "",
            descricao: narrative.descricao ?? "",
          });
        }
      } catch (err) {
        console.error("[BookCreate] erro ao carregar livro para edição:", err);
        toast.error("Não foi possível carregar o livro para edição.");
      } finally {
        if (active) setBookLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [bookId]);

  useEffect(() => {
    async function fetchMetadata() {
      setMetaLoading(true);
      setMetaError(null);
      try {
        const [authorsData, genresData, collectionsData] = await Promise.all([
          listAuthors(),
          listGenres(),
          listCollections(),
        ]);
        setAuthors(authorsData);
        setGenres(genresData);
        setCollections(collectionsData);
      } catch (error) {
        console.error("[BookCreate] Error fetching metadata:", error);
        setMetaError(error.message ?? "Não foi possível carregar autores, gêneros e coleções.");
        toast.error("Falha ao carregar listas auxiliares.");
      } finally {
        setMetaLoading(false);
      }
    }

    fetchMetadata();
  }, []);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleAuthorFormChange = (event) => {
    const { name, value } = event.target;
    setAuthorForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCollectionFormChange = (event) => {
    const { name, value } = event.target;
    setCollectionForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateAuthor = async (event) => {
    event?.preventDefault?.();
    if (!authorForm.nome.trim()) {
      toast.error("Informe o nome do autor.");
      return;
    }
    setCreatingAuthor(true);
    try {
      const payload = {
        nome: authorForm.nome.trim(),
        nacionalidade: authorForm.nacionalidade?.trim() || null,
        bio: authorForm.bio?.trim() || null,
      };
      const newAuthor = await createAuthor(payload);
      setAuthors((prev) => [...prev, newAuthor].sort((a, b) => a.nome.localeCompare(b.nome)));
      setFormData((prev) => ({ ...prev, autor_id: newAuthor.id }));
      setAuthorForm({ nome: "", nacionalidade: "", bio: "" });
      toast.success("Autor cadastrado!");
    } catch (error) {
      console.error("[BookCreate] erro ao criar autor:", error);
      toast.error(error.message ?? "Falha ao cadastrar autor.");
    } finally {
      setCreatingAuthor(false);
    }
  };

  const handleCreateCollection = async (event) => {
    event?.preventDefault?.();
    if (!collectionForm.nome.trim()) {
      toast.error("Informe o nome da coleção.");
      return;
    }
    setCreatingCollection(true);
    try {
      const payload = {
        nome: collectionForm.nome.trim(),
        descricao: collectionForm.descricao?.trim() || null,
        capa_url: collectionForm.capa_url?.trim() || null,
      };
      const newCollection = await createCollection(payload);
      setCollections((prev) => [...prev, newCollection].sort((a, b) => a.nome.localeCompare(b.nome)));
      setFormData((prev) => ({ ...prev, colecao_id: newCollection.id }));
      setCollectionForm({ nome: "", descricao: "", capa_url: "" });
      toast.success("Coleção cadastrada!");
    } catch (error) {
      console.error("[BookCreate] erro ao criar coleção:", error);
      toast.error(error.message ?? "Falha ao cadastrar coleção.");
    } finally {
      setCreatingCollection(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading) return;

    const requiredTitle = formData.titulo.trim();
    if (!requiredTitle) {
      toast.error("Informe um título para o livro.");
      return;
    }
    if (!formData.autor_id) {
      toast.error("Selecione um autor.");
      return;
    }
    if (!formData.genero_id) {
      toast.error("Selecione um gênero.");
      return;
    }

    setLoading(true);
    try {
      // Faz upload dos arquivos selecionados antes de salvar.
      let capaUrl = formData.capa_url?.trim() || null;
      let capaCinematicaUrl = formData.capa_cinematica_url?.trim() || null;
      let pdfPath = formData.pdf_url?.trim() || null;
      let audioPath = formData.audio_url?.trim() || null;

      if (mediaFiles.capa || mediaFiles.capaCinematica || mediaFiles.pdf || mediaFiles.audio) {
        setUploading(true);
        try {
          if (mediaFiles.capa) {
            const path = await uploadToBucket(BUCKETS.capas, mediaFiles.capa);
            capaUrl = getPublicUrl(BUCKETS.capas, path); // capa é pública
          }
          if (mediaFiles.capaCinematica) {
            const path = await uploadToBucket(BUCKETS.capas, mediaFiles.capaCinematica, {
              prefix: "cinematicas/",
            });
            capaCinematicaUrl = getPublicUrl(BUCKETS.capas, path);
          }
          if (mediaFiles.pdf) {
            // PDF é privado: guardamos o caminho; a leitura usa link assinado.
            pdfPath = await uploadToBucket(BUCKETS.pdfs, mediaFiles.pdf);
          }
          if (mediaFiles.audio) {
            audioPath = await uploadToBucket(BUCKETS.audios, mediaFiles.audio);
          }
        } finally {
          setUploading(false);
        }
      }

      const payload = {
        titulo: requiredTitle,
        subtitulo: formData.subtitulo?.trim() || null,
        autor_id: formData.autor_id || null,
        genero_id: formData.genero_id || null,
        colecao_id: formData.colecao_id || null,
        sinopse: formData.sinopse?.trim() || null,
        capa_url: capaUrl,
        capa_cinematica_url: capaCinematicaUrl,
        pdf_url: pdfPath,
        audio_url: audioPath,
        tem_experiencia_cinematica: Boolean(
          formData.tem_experiencia_cinematica
          || narrativeTracks.length
          || existingNarrative?.faixas?.length,
        ),
        titulo_cinematico: formData.titulo_cinematico?.trim() || null,
        descricao_cinematica: formData.descricao_cinematica?.trim() || null,
        duracao_audio: formData.duracao_audio ? Number(formData.duracao_audio) : null,
        data_lancamento: formData.data_lancamento || null,
        status: formData.status || "ativo",
        destaque: Boolean(formData.destaque),
      };

      if (payload.duracao_audio !== null && Number.isNaN(payload.duracao_audio)) {
        throw new Error("Informe um número válido para a duração do áudio.");
      }

      const savedBook = isEdit
        ? await updateBook(bookId, payload)
        : await createBook(payload);

      const shouldSaveNarrative = narrativeTracks.length > 0 || existingNarrative || formData.tem_experiencia_cinematica;
      if (shouldSaveNarrative) {
        const narrative = await saveNarrative(savedBook.id, {
          titulo: formData.titulo_cinematico?.trim() || narrativeForm.titulo.trim() || `${requiredTitle} — Memória Cinematográfica`,
          descricao: formData.descricao_cinematica?.trim() || narrativeForm.descricao.trim() || null,
          status: "ativo",
        });

        if (existingNarrative?.faixas?.length) {
          setUploading(true);
          try {
            for (const track of existingNarrative.faixas) {
              const replacement = trackReplacements[track.id];
              let nextAudioPath = track.audio_path;
              if (replacement) {
                nextAudioPath = await uploadToBucket(BUCKETS.narrativas, replacement, {
                  prefix: `${savedBook.id}/`,
                });
              }

              await updateNarrativeTrackRecord(track.id, {
                titulo: track.titulo.trim() || `Cena ${track.ordem}`,
                descricao: track.descricao?.trim() || null,
                audio_path: nextAudioPath,
              });

              if (replacement && track.audio_path && track.audio_path !== nextAudioPath) {
                await removeFromBucket(BUCKETS.narrativas, [track.audio_path]);
              }
            }
          } finally {
            setUploading(false);
          }
        }

        if (narrativeTracks.length > 0) {
          setUploading(true);
          try {
            const uploadedTracks = [];
            const currentLastOrder = Math.max(0, ...(existingNarrative?.faixas ?? []).map((track) => track.ordem || 0));
            for (let index = 0; index < narrativeTracks.length; index += 1) {
              const track = narrativeTracks[index];
              const audioPath = await uploadToBucket(BUCKETS.narrativas, track.file, {
                prefix: `${savedBook.id}/`,
              });
              uploadedTracks.push({
                titulo: track.titulo.trim() || `Cena ${index + 1}`,
                descricao: track.descricao.trim() || null,
                audio_path: audioPath,
                ordem: currentLastOrder + index + 1,
              });
            }
            await addNarrativeTracks(narrative.id, uploadedTracks);
          } finally {
            setUploading(false);
          }
        }
      }

      if (isEdit) {
        toast.success("Título atualizado com sucesso!");
        navigate(`/biblioteca/${bookId}`);
      } else {
        toast.success("Título cadastrado com sucesso!");
        navigate("/biblioteca");
      }
    } catch (error) {
      console.error("[BookCreate] erro ao salvar livro:", error);
      toast.error(error.message ?? "Não foi possível salvar o título.");
    } finally {
      setLoading(false);
    }
  };

  const isAuthorsLoading = useMemo(() => metaLoading && !authors.length, [metaLoading, authors.length]);
  const isGenresLoading = useMemo(() => metaLoading && !genres.length, [metaLoading, genres.length]);
  const hasCollections = useMemo(() => collections.length > 0, [collections]);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-[color:rgba(var(--color-secondary-primary),0.7)]">
            {isEdit ? "Edição" : "Cadastro"}
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-[rgb(var(--text-primary))]">
            {isEdit ? "Editar título" : "Novo título na biblioteca"}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[rgb(var(--text-secondary))]">
            {isEdit
              ? "Atualize os dados da obra. Para adicionar ou trocar capa, PDF ou áudio, selecione um novo arquivo — os atuais são mantidos se você não escolher outro."
              : "Registre metadados completos para um novo livro, conectando autor, gênero, coleções e recursos multimídia."}
            {isEdit && bookLoading ? " · Carregando…" : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/biblioteca")}
          className="rounded-2xl border border-[rgba(255,255,255,0.12)] bg-[rgba(var(--surface-card),0.7)] px-4 py-2 text-sm font-semibold text-[rgb(var(--text-primary))] shadow-sm transition hover:border-[rgba(var(--color-accent-primary),0.4)]"
        >
          Voltar para a biblioteca
        </button>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-8 rounded-[32px] border border-[rgba(255,255,255,0.08)] bg-[rgba(var(--surface-card),0.92)] p-6 shadow-[0_35px_80px_-60px_rgba(15,10,35,0.8)]"
      >
        <section className="space-y-4">
          <header>
            <p className="text-xs uppercase tracking-[0.35em] text-[color:rgba(var(--color-secondary-primary),0.8)]">Identidade</p>
            <h2 className="text-xl font-semibold text-[rgb(var(--text-primary))]">Informações principais</h2>
          </header>
          <div className="grid gap-5 md:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm font-medium text-[rgb(var(--text-secondary))]">
              Título*
              <input
                name="titulo"
                required
                value={formData.titulo}
                onChange={handleChange}
                placeholder="Ex.: Cartas ao Horizonte Interno"
                className="rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white/80 px-4 py-2 text-[rgb(var(--text-primary))] shadow-sm focus:border-[rgba(var(--color-accent-primary),0.6)] focus:outline-none focus:ring-2 focus:ring-[rgba(var(--color-accent-primary),0.25)]"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-[rgb(var(--text-secondary))]">
              Subtítulo
              <input
                name="subtitulo"
                value={formData.subtitulo}
                onChange={handleChange}
                placeholder="Complemento descritivo (opcional)"
                className="rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white/80 px-4 py-2 text-[rgb(var(--text-primary))] shadow-sm focus:border-[rgba(var(--color-accent-primary),0.6)] focus:outline-none focus:ring-2 focus:ring-[rgba(var(--color-accent-primary),0.25)]"
              />
            </label>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            <label className="flex flex-col gap-2 text-sm font-medium text-[rgb(var(--text-secondary))]">
              Autor*
              <select
                name="autor_id"
                value={formData.autor_id}
                onChange={handleChange}
                required
                className="rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white/80 px-4 py-2 text-[rgb(var(--text-primary))] shadow-sm focus:border-[rgba(var(--color-accent-primary),0.6)] focus:outline-none focus:ring-2 focus:ring-[rgba(var(--color-accent-primary),0.25)]"
                disabled={isAuthorsLoading}
              >
                <option value="">{isAuthorsLoading ? "Carregando autores..." : "Selecione"}</option>
                {authors.map((author) => (
                  <option key={author.id} value={author.id}>
                    {author.nome}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-[rgb(var(--text-secondary))]">
              Gênero*
              <select
                name="genero_id"
                value={formData.genero_id}
                onChange={handleChange}
                required
                className="rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white/80 px-4 py-2 text-[rgb(var(--text-primary))] shadow-sm focus:border-[rgba(var(--color-accent-primary),0.6)] focus:outline-none focus:ring-2 focus:ring-[rgba(var(--color-accent-primary),0.25)]"
                disabled={isGenresLoading}
              >
                <option value="">{isGenresLoading ? "Carregando gêneros..." : "Selecione"}</option>
                {genres.map((genre) => (
                  <option key={genre.id} value={genre.id}>
                    {genre.nome}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-[rgb(var(--text-secondary))]">
              Coleção
              <select
                name="colecao_id"
                value={formData.colecao_id}
                onChange={handleChange}
                className="rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white/80 px-4 py-2 text-[rgb(var(--text-primary))] shadow-sm focus:border-[rgba(var(--color-accent-primary),0.6)] focus:outline-none focus:ring-2 focus:ring-[rgba(var(--color-accent-primary),0.25)]"
                disabled={metaLoading && !collections.length}
              >
                <option value="">{metaLoading ? "Carregando coleções..." : hasCollections ? "Selecione" : "Nenhuma coleção cadastrada"}</option>
                {collections.map((collection) => (
                  <option key={collection.id} value={collection.id}>
                    {collection.nome}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-[28px] border border-[rgba(0,0,0,0.08)] bg-white/75 p-5 shadow-sm">
            <header className="mb-4 space-y-1">
              <p className="text-xs uppercase tracking-[0.35em] text-[color:rgba(var(--color-secondary-primary),0.8)]">Novo autor</p>
              <h3 className="text-lg font-semibold text-[rgb(var(--text-primary))]">Cadastrar autor rapidamente</h3>
              <p className="text-sm text-[rgb(var(--text-secondary))]">Inclua autores que ainda não constam na base.</p>
            </header>
            <div className="space-y-3">
              <input
                name="nome"
                value={authorForm.nome}
                onChange={handleAuthorFormChange}
                placeholder="Nome completo*"
                className="w-full rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white/90 px-3 py-2 text-sm"
              />
              <input
                name="nacionalidade"
                value={authorForm.nacionalidade}
                onChange={handleAuthorFormChange}
                placeholder="Nacionalidade"
                className="w-full rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white/90 px-3 py-2 text-sm"
              />
              <textarea
                name="bio"
                rows={2}
                value={authorForm.bio}
                onChange={handleAuthorFormChange}
                placeholder="Mini bio (opcional)"
                className="w-full rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white/90 px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={handleCreateAuthor}
                disabled={creatingAuthor}
                className="rounded-2xl bg-[rgb(var(--color-accent-primary))] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[rgb(var(--color-accent-dark))] disabled:opacity-70"
              >
                {creatingAuthor ? "Salvando autor..." : "Salvar autor"}
              </button>
            </div>
          </div>

          <div className="rounded-[28px] border border-[rgba(0,0,0,0.08)] bg-white/75 p-5 shadow-sm">
            <header className="mb-4 space-y-1">
              <p className="text-xs uppercase tracking-[0.35em] text-[color:rgba(var(--color-secondary-primary),0.8)]">Nova coleção</p>
              <h3 className="text-lg font-semibold text-[rgb(var(--text-primary))]">Curadoria inédita</h3>
              <p className="text-sm text-[rgb(var(--text-secondary))]">Organize conjuntos especiais diretamente daqui.</p>
            </header>
            <div className="space-y-3">
              <input
                name="nome"
                value={collectionForm.nome}
                onChange={handleCollectionFormChange}
                placeholder="Nome da coleção*"
                className="w-full rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white/90 px-3 py-2 text-sm"
              />
              <textarea
                name="descricao"
                rows={2}
                value={collectionForm.descricao}
                onChange={handleCollectionFormChange}
                placeholder="Descrição breve"
                className="w-full rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white/90 px-3 py-2 text-sm"
              />
              <input
                name="capa_url"
                type="url"
                value={collectionForm.capa_url}
                onChange={handleCollectionFormChange}
                placeholder="URL da capa (opcional)"
                className="w-full rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white/90 px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={handleCreateCollection}
                disabled={creatingCollection}
                className="rounded-2xl bg-[rgb(var(--color-secondary-primary))] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[rgb(var(--color-secondary-dark))] disabled:opacity-70"
              >
                {creatingCollection ? "Salvando coleção..." : "Salvar coleção"}
              </button>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <header>
            <p className="text-xs uppercase tracking-[0.35em] text-[color:rgba(var(--color-secondary-primary),0.8)]">Conteúdo</p>
            <h2 className="text-xl font-semibold text-[rgb(var(--text-primary))]">Descrição e mídia</h2>
          </header>
          <label className="flex flex-col gap-2 text-sm font-medium text-[rgb(var(--text-secondary))]">
            Sinopse
            <textarea
              name="sinopse"
              rows={5}
              value={formData.sinopse}
              onChange={handleChange}
              placeholder="Apresente o enredo, público ou provocações principais."
              className="rounded-3xl border border-[rgba(0,0,0,0.08)] bg-white/80 px-4 py-3 text-[rgb(var(--text-primary))] shadow-sm focus:border-[rgba(var(--color-accent-primary),0.6)] focus:outline-none focus:ring-2 focus:ring-[rgba(var(--color-accent-primary),0.25)]"
            />
          </label>
          <div className="grid gap-5 md:grid-cols-3">
            <label className="flex flex-col gap-2 text-sm font-medium text-[rgb(var(--text-secondary))]">
              Capa (imagem)
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/avif"
                onChange={handleFileChange("capa")}
                className="rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white/80 px-3 py-2 text-xs text-[rgb(var(--text-secondary))] file:mr-3 file:rounded-lg file:border-0 file:bg-[rgba(var(--color-accent-primary),0.15)] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-[rgb(var(--color-accent-dark))] hover:file:bg-[rgba(var(--color-accent-primary),0.25)]"
              />
              {mediaFiles.capa ? (
                <span className="truncate text-xs text-[rgb(var(--text-subtle))]">✓ {mediaFiles.capa.name}</span>
              ) : isEdit && formData.capa_url ? (
                <span className="truncate text-xs text-[rgb(var(--text-subtle))]">Capa atual mantida — escolha para trocar</span>
              ) : null}
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-[rgb(var(--text-secondary))]">
              PDF / ePub
              <input
                type="file"
                accept="application/pdf,.pdf,.epub,application/epub+zip"
                onChange={handleFileChange("pdf")}
                className="rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white/80 px-3 py-2 text-xs text-[rgb(var(--text-secondary))] file:mr-3 file:rounded-lg file:border-0 file:bg-[rgba(var(--color-accent-primary),0.15)] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-[rgb(var(--color-accent-dark))] hover:file:bg-[rgba(var(--color-accent-primary),0.25)]"
              />
              {mediaFiles.pdf ? (
                <span className="truncate text-xs text-[rgb(var(--text-subtle))]">✓ {mediaFiles.pdf.name}</span>
              ) : isEdit && formData.pdf_url ? (
                <span className="truncate text-xs text-[rgb(var(--text-subtle))]">PDF atual mantido — escolha para trocar</span>
              ) : null}
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-[rgb(var(--text-secondary))]">
              Áudio
              <input
                type="file"
                accept="audio/*"
                onChange={handleFileChange("audio")}
                className="rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white/80 px-3 py-2 text-xs text-[rgb(var(--text-secondary))] file:mr-3 file:rounded-lg file:border-0 file:bg-[rgba(var(--color-accent-primary),0.15)] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-[rgb(var(--color-accent-dark))] hover:file:bg-[rgba(var(--color-accent-primary),0.25)]"
              />
              {mediaFiles.audio ? (
                <span className="truncate text-xs text-[rgb(var(--text-subtle))]">✓ {mediaFiles.audio.name}</span>
              ) : isEdit && formData.audio_url ? (
                <span className="truncate text-xs text-[rgb(var(--text-subtle))]">Áudio atual mantido — escolha para adicionar/trocar</span>
              ) : (
                <span className="truncate text-xs text-[rgb(var(--text-subtle))]">{isEdit ? "Sem áudio ainda — adicione aqui" : ""}</span>
              )}
            </label>
          </div>
          <p className="text-xs text-[rgb(var(--text-subtle))]">
            A capa fica pública. PDF e áudio são privados — abrem por link temporário assinado.
          </p>

          <div className="rounded-[24px] border border-[rgba(var(--color-accent-primary),0.18)] bg-[rgba(var(--surface-card),0.62)] p-5 shadow-sm">
            <header className="mb-4">
              <p className="text-xs uppercase tracking-[0.3em] text-[rgb(var(--color-accent-dark))]">Narrativa cinematográfica</p>
              <h3 className="mt-1 text-lg font-semibold text-[rgb(var(--text-primary))]">Cenas em áudio</h3>
              <p className="mt-1 text-sm text-[rgb(var(--text-secondary))]">
                Selecione todos os arquivos de uma vez e ajuste os títulos e a ordem antes de salvar.
              </p>
            </header>

            <label className="mb-4 flex items-center gap-3 rounded-2xl border border-[rgba(var(--color-accent-primary),0.16)] bg-white/55 px-4 py-3 text-sm font-semibold text-[rgb(var(--text-secondary))]">
              <input
                name="tem_experiencia_cinematica"
                type="checkbox"
                checked={formData.tem_experiencia_cinematica}
                onChange={handleChange}
                className="h-4 w-4 rounded text-[rgb(var(--color-accent-primary))]"
              />
              Ativar Memória Cinematográfica
            </label>

            <div className="mb-4 grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm font-medium text-[rgb(var(--text-secondary))]">
                Capa da Memória Cinematográfica
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/avif"
                  onChange={handleFileChange("capaCinematica")}
                  className="rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white/80 px-3 py-2 text-xs file:mr-3 file:rounded-lg file:border-0 file:bg-[rgba(var(--color-accent-primary),0.15)] file:px-3 file:py-1.5 file:text-xs file:font-semibold"
                />
                {mediaFiles.capaCinematica && <span className="truncate text-xs text-[rgb(var(--text-subtle))]">✓ {mediaFiles.capaCinematica.name}</span>}
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-[rgb(var(--text-secondary))]">
                URL da capa cinematográfica (opcional)
                <input
                  name="capa_cinematica_url"
                  type="text"
                  value={formData.capa_cinematica_url}
                  onChange={handleChange}
                  placeholder="https://... ou caminho existente"
                  className="rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white/80 px-4 py-2 text-[rgb(var(--text-primary))]"
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm font-medium text-[rgb(var(--text-secondary))]">
                Título da experiência
                <input
                  type="text"
                  value={formData.titulo_cinematico}
                  onChange={(event) => setFormData((current) => ({ ...current, titulo_cinematico: event.target.value }))}
                  placeholder="Memória Cinematográfica"
                  className="rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white/80 px-4 py-2 text-[rgb(var(--text-primary))]"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-[rgb(var(--text-secondary))]">
                Descrição
                <input
                  type="text"
                  value={formData.descricao_cinematica}
                  onChange={(event) => setFormData((current) => ({ ...current, descricao_cinematica: event.target.value }))}
                  placeholder="Uma jornada narrada como lembrança — por alguém que esteve lá."
                  className="rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white/80 px-4 py-2 text-[rgb(var(--text-primary))]"
                />
              </label>
            </div>

            <label className="mt-4 flex flex-col gap-2 text-sm font-medium text-[rgb(var(--text-secondary))]">
              {existingNarrative ? "Adicionar novas cenas" : "Arquivos das cenas"}
              <input
                type="file"
                accept="audio/*"
                multiple
                onChange={handleNarrativeFiles}
                className="rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white/80 px-3 py-2 text-xs text-[rgb(var(--text-secondary))] file:mr-3 file:rounded-lg file:border-0 file:bg-[rgba(var(--color-accent-primary),0.15)] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-[rgb(var(--color-accent-dark))]"
              />
            </label>

            {existingNarrative?.faixas?.length > 0 && (
              <div className="mt-5 space-y-3">
                <div className="rounded-2xl border border-emerald-500/15 bg-emerald-50/60 px-4 py-3 text-sm text-emerald-800">
                  {existingNarrative.faixas.length} cenas cadastradas. Escolha um arquivo em uma cena específica apenas quando quiser substituí-la.
                </div>
                {existingNarrative.faixas.map((track) => (
                  <div key={track.id} className="rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white/65 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-[rgb(var(--color-accent-dark))]">Cena {track.ordem}</span>
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="max-w-64 truncate text-xs text-[rgb(var(--text-subtle))]">{track.audio_path}</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteExistingTrack(track)}
                          disabled={deletingTrackIds.has(track.id)}
                          className="min-h-9 shrink-0 rounded-xl border border-red-200 bg-red-50/70 px-3 py-1 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-wait disabled:opacity-60"
                        >
                          {deletingTrackIds.has(track.id) ? "Excluindo..." : "Excluir cena"}
                        </button>
                      </div>
                    </div>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <input
                        type="text"
                        value={track.titulo}
                        onChange={(event) => updateExistingTrack(track.id, "titulo", event.target.value)}
                        className="rounded-xl border border-[rgba(0,0,0,0.08)] bg-white/85 px-3 py-2 text-sm text-[rgb(var(--text-primary))]"
                        aria-label={`Título da cena ${track.ordem}`}
                      />
                      <input
                        type="text"
                        value={track.descricao ?? ""}
                        onChange={(event) => updateExistingTrack(track.id, "descricao", event.target.value)}
                        placeholder="Descrição opcional da cena"
                        className="rounded-xl border border-[rgba(0,0,0,0.08)] bg-white/85 px-3 py-2 text-sm text-[rgb(var(--text-primary))]"
                        aria-label={`Descrição da cena ${track.ordem}`}
                      />
                    </div>
                    <label className="mt-3 flex flex-col gap-2 text-xs font-semibold text-[rgb(var(--text-secondary))]">
                      Substituir somente esta cena
                      <input
                        type="file"
                        accept="audio/*"
                        onChange={handleTrackReplacement(track.id)}
                        className="rounded-xl border border-[rgba(0,0,0,0.08)] bg-white/80 px-3 py-2 text-xs file:mr-3 file:rounded-lg file:border-0 file:bg-[rgba(var(--color-accent-primary),0.15)] file:px-3 file:py-1 file:text-xs file:font-semibold"
                      />
                    </label>
                    {trackReplacements[track.id] && (
                      <p className="mt-2 text-xs font-medium text-amber-700">
                        Será substituída por: {trackReplacements[track.id].name}. O arquivo anterior será apagado após a atualização.
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {narrativeTracks.length > 0 && (
              <div className="mt-4 space-y-3">
                {narrativeTracks.map((track, index) => (
                  <div key={`${track.file.name}-${track.file.lastModified}`} className="rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white/65 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-[rgb(var(--color-accent-dark))]">
                        Nova cena {(existingNarrative?.faixas?.length || 0) + index + 1}
                      </span>
                      <div className="flex gap-1">
                        <button type="button" onClick={() => moveNarrativeTrack(index, -1)} disabled={index === 0} className="h-8 rounded-lg border px-2 text-xs disabled:opacity-30" aria-label="Mover cena para cima">↑</button>
                        <button type="button" onClick={() => moveNarrativeTrack(index, 1)} disabled={index === narrativeTracks.length - 1} className="h-8 rounded-lg border px-2 text-xs disabled:opacity-30" aria-label="Mover cena para baixo">↓</button>
                        <button type="button" onClick={() => removeNarrativeTrack(index)} className="h-8 rounded-lg border border-red-200 px-2 text-xs text-red-600" aria-label="Remover cena">Remover</button>
                      </div>
                    </div>
                    <input
                      type="text"
                      value={track.titulo}
                      onChange={(event) => updateNarrativeTrack(index, "titulo", event.target.value)}
                      className="mt-2 w-full rounded-xl border border-[rgba(0,0,0,0.08)] bg-white/85 px-3 py-2 text-sm text-[rgb(var(--text-primary))]"
                      aria-label={`Título da cena ${index + 1}`}
                    />
                    <input
                      type="text"
                      value={track.descricao}
                      onChange={(event) => updateNarrativeTrack(index, "descricao", event.target.value)}
                      placeholder="Descrição opcional da cena"
                      className="mt-2 w-full rounded-xl border border-[rgba(0,0,0,0.08)] bg-white/85 px-3 py-2 text-sm text-[rgb(var(--text-primary))]"
                      aria-label={`Descrição da cena ${index + 1}`}
                    />
                    <p className="mt-2 truncate text-xs text-[rgb(var(--text-subtle))]">{track.file.name}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            <label className="flex flex-col gap-2 text-sm font-medium text-[rgb(var(--text-secondary))]">
              Lançamento
              <input
                name="data_lancamento"
                type="date"
                value={formData.data_lancamento}
                onChange={handleChange}
                className="rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white/80 px-4 py-2"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-[rgb(var(--text-secondary))]">
              Duração do áudio (min)
              <input
                name="duracao_audio"
                type="number"
                min="0"
                step="1"
                value={formData.duracao_audio}
                onChange={handleChange}
                placeholder="Ex.: 120"
                className="rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white/80 px-4 py-2"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-[rgb(var(--text-secondary))]">
              Status
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white/80 px-4 py-2"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="flex items-center gap-3 rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white/75 px-4 py-3 text-sm font-medium text-[rgb(var(--text-secondary))]">
            <input
              name="destaque"
              type="checkbox"
              checked={formData.destaque}
              onChange={handleChange}
              className="h-4 w-4 rounded border-[rgba(0,0,0,0.2)] text-[rgb(var(--color-accent-primary))] focus:ring-[rgba(var(--color-accent-primary),0.35)]"
            />
            Destacar título nas vitrines principais
          </label>
        </section>

        <div className="flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-2xl border border-[rgba(0,0,0,0.15)] px-4 py-2 text-sm font-semibold text-[rgb(var(--text-secondary))] transition hover:border-[rgba(var(--color-accent-primary),0.3)]"
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-2xl bg-[rgb(var(--color-accent-primary))] px-5 py-2 text-sm font-semibold text-white shadow-[0_15px_30px_-18px_rgba(0,0,0,0.6)] transition hover:bg-[rgb(var(--color-accent-dark))] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {uploading ? "Enviando arquivos..." : loading ? "Salvando..." : isEdit ? "Salvar alterações" : "Salvar título"}
          </button>
        </div>
        {metaError ? <p className="text-sm text-red-500">⚠ {metaError}</p> : null}
      </form>
    </div>
  );
}
