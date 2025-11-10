import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Layout from "./layout/Layout.jsx";
import DashboardPage from "./pages/Dashboard.jsx";
import LibraryPage from "./pages/Library.jsx";
import BookDetailsPage from "./pages/BookDetails.jsx";
import ChatbotPage from "./pages/Chatbot.jsx";
import SettingsPage from "./pages/Settings.jsx";
import CompoundInterestPage from "./pages/CompoundInterest.jsx";
import LoginPage from "./pages/auth/Login.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import BookCreatePage from "./pages/BookCreate.jsx";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route index element={<DashboardPage />} />
            <Route path="biblioteca" element={<LibraryPage />} />
            <Route path="biblioteca/:bookId" element={<BookDetailsPage />} />
            <Route path="biblioteca/novo" element={<BookCreatePage />} />
            <Route path="assistente" element={<ChatbotPage />} />
            <Route path="configuracoes" element={<SettingsPage />} />
            <Route path="juros-compostos" element={<CompoundInterestPage />} />

            {/* Rotas antigas mantidas temporariamente para compatibilidade */}
            <Route path="chatbot" element={<Navigate to="/assistente" replace />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

