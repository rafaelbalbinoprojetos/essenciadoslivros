import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import Layout from "./layout/Layout.jsx";
import CinematicPlayer from "./components/player/CinematicPlayer.jsx";
import DashboardPage from "./pages/Dashboard.jsx";
import LibraryPage from "./pages/Library.jsx";
import BookDetailsPage from "./pages/BookDetails.jsx";
import ChatbotPage from "./pages/Chatbot.jsx";
import SettingsPage from "./pages/Settings.jsx";
import LoginPage from "./pages/auth/Login.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import BookCreatePage from "./pages/BookCreate.jsx";
import BookImportLotePage from "./pages/BookImportLote.jsx";
import JourneysPage from "./pages/Journeys.jsx";
import JourneyDetailPage from "./pages/JourneyDetail.jsx";
import MuralPage from "./pages/Mural.jsx";
import CinematicMemoriesPage from "./pages/CinematicMemories.jsx";
import UnexpectedEncounterPage from "./pages/UnexpectedEncounter.jsx";
import EngineSolicitarObra from "./pages/EngineSolicitarObra.jsx";
import EngineProcessarLote from "./pages/EngineProcessarLote.jsx";
import EngineCustosIA from "./pages/EngineCustosIA.jsx";
import EssenciaEmCoresPage from "./pages/EssenciaEmCores.jsx";


function AppRoutes() {
  const location = useLocation();
  const backgroundLocation = location.state?.backgroundLocation;

  return (
    <>
      <Routes location={backgroundLocation || location}>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route index element={<DashboardPage />} />
            <Route path="jornadas" element={<JourneysPage />} />
            <Route path="jornadas/:slug" element={<JourneyDetailPage />} />
            <Route path="mural" element={<MuralPage />} />
            <Route path="memorias-cinematicas" element={<CinematicMemoriesPage />} />
            <Route path="encontro-inesperado" element={<UnexpectedEncounterPage />} />
            <Route path="biblioteca" element={<LibraryPage />} />
            <Route path="biblioteca/:bookId" element={<BookDetailsPage />} />
            <Route path="biblioteca/novo" element={<BookCreatePage />} />
            <Route path="biblioteca/lote" element={<BookImportLotePage />} />
            <Route path="biblioteca/:bookId/editar" element={<BookCreatePage />} />
            <Route path="assistente" element={<ChatbotPage />} />
            <Route path="engine" element={<EngineSolicitarObra />} />
            <Route path="engine/lote" element={<EngineProcessarLote />} />
            <Route path="engine/custos" element={<EngineCustosIA />} />
            <Route path="colorir" element={<EssenciaEmCoresPage />} />
            <Route path="configuracoes" element={<SettingsPage />} />


            {/* Rotas antigas mantidas temporariamente para compatibilidade */}
            <Route path="chatbot" element={<Navigate to="/assistente" replace />} />
          </Route>
          {/* Fora do <Layout/>: sem sidebar/topbar por trás, fullscreen real */}
          <Route path="obra/:slug/player" element={<CinematicPlayer />} />
          {/* :cenaSegment vem inteiro ("cena-<id>") — React Router não
              faz match de prefixo fixo + parâmetro no mesmo segmento. */}
          <Route path="obra/:slug/player/:cenaSegment" element={<CinematicPlayer />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {backgroundLocation && (
        <Routes>
          <Route path="obra/:slug/player" element={<CinematicPlayer />} />
          {/* :cenaSegment vem inteiro ("cena-<id>") — React Router não
              faz match de prefixo fixo + parâmetro no mesmo segmento. */}
          <Route path="obra/:slug/player/:cenaSegment" element={<CinematicPlayer />} />
        </Routes>
      )}
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
