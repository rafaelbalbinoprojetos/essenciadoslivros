import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { createAuthor, createBook, createCollection, listAuthors, listCollections, listGenres } from "../services/books.js";

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
  pdf_url: "",
  audio_url: "",
  duracao_audio: "",
  data_lancamento: "",
  status: "ativo",
  destaque: false,
};

export default function BookCreatePage() {
  const navigate = useNavigate();
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
      const payload = {
        titulo: requiredTitle,
        subtitulo: formData.subtitulo?.trim() || null,
        autor_id: formData.autor_id || null,
        genero_id: formData.genero_id || null,
        colecao_id: formData.colecao_id || null,
        sinopse: formData.sinopse?.trim() || null,
        capa_url: formData.capa_url?.trim() || null,
        pdf_url: formData.pdf_url?.trim() || null,
        audio_url: formData.audio_url?.trim() || null,
        duracao_audio: formData.duracao_audio ? Number(formData.duracao_audio) : null,
        data_lancamento: formData.data_lancamento || null,
        status: formData.status || "ativo",
        destaque: Boolean(formData.destaque),
      };

      if (payload.duracao_audio !== null && Number.isNaN(payload.duracao_audio)) {
        throw new Error("Informe um número válido para a duração do áudio.");
      }

      await createBook(payload);
      toast.success("Título cadastrado com sucesso!");
      navigate("/biblioteca");
    } catch (error) {
      console.error("[BookCreate] erro ao cadastrar livro:", error);
      toast.error(error.message ?? "Não foi possível cadastrar o título.");
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
          <p className="text-xs uppercase tracking-[0.4em] text-[color:rgba(var(--color-secondary-primary),0.7)]">Cadastro</p>
          <h1 className="mt-2 text-3xl font-semibold text-[rgb(var(--text-primary))]">Novo título na biblioteca</h1>
          <p className="mt-2 max-w-2xl text-sm text-[rgb(var(--text-secondary))]">
            Registre metadados completos para um novo livro, conectando autor, gênero, coleções e recursos multimídia.
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
              URL da capa
              <input
                name="capa_url"
                type="url"
                value={formData.capa_url}
                onChange={handleChange}
                placeholder="https://..."
                className="rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white/80 px-4 py-2"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-[rgb(var(--text-secondary))]">
              PDF / ePub
              <input
                name="pdf_url"
                type="url"
                value={formData.pdf_url}
                onChange={handleChange}
                placeholder="https://..."
                className="rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white/80 px-4 py-2"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-[rgb(var(--text-secondary))]">
              Áudio / streaming
              <input
                name="audio_url"
                type="url"
                value={formData.audio_url}
                onChange={handleChange}
                placeholder="https://..."
                className="rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white/80 px-4 py-2"
              />
            </label>
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
            {loading ? "Salvando..." : "Salvar título"}
          </button>
        </div>
        {metaError ? <p className="text-sm text-red-500">⚠ {metaError}</p> : null}
      </form>
    </div>
  );
}
