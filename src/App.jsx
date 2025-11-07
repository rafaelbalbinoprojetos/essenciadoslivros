import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Layout from "./layout/Layout.jsx";
import DashboardPage from "./pages/Dashboard.jsx";
import ExpensesPage from "./pages/Expenses.jsx";
import IncomePage from "./pages/Income.jsx";
import InvestmentsPage from "./pages/Investments.jsx";
import ExtraPage from "./pages/Extra.jsx";
import LibraryPage from "./pages/Library.jsx";
import ChatbotPage from "./pages/Chatbot.jsx";
import SettingsPage from "./pages/Settings.jsx";
import GestorPage from "./pages/Gestor.jsx";
import CompoundInterestPage from "./pages/CompoundInterest.jsx";
import LoginPage from "./pages/auth/Login.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import ExpenseCreatePage from "./pages/ExpenseCreate.jsx";
import RevenueCreatePage from "./pages/RevenueCreate.jsx";
import InvestmentCreatePage from "./pages/InvestmentCreate.jsx";
import OvertimeCreatePage from "./pages/OvertimeCreate.jsx";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route index element={<DashboardPage />} />
            <Route path="biblioteca" element={<LibraryPage />} />
            <Route path="leituras" element={<IncomePage />} />
            <Route path="resumos" element={<ExpensesPage />} />
            <Route path="resumos/novo" element={<ExpenseCreatePage />} />
            <Route path="leituras/nova" element={<RevenueCreatePage />} />
            <Route path="audiobooks" element={<ExtraPage />} />
            <Route path="audiobooks/novo" element={<OvertimeCreatePage />} />
            <Route path="colecoes" element={<InvestmentsPage />} />
            <Route path="colecoes/novo" element={<InvestmentCreatePage />} />
            <Route path="descobertas" element={<GestorPage />} />
            <Route path="assistente" element={<ChatbotPage />} />
            <Route path="configuracoes" element={<SettingsPage />} />

            {/* Rotas antigas mantidas temporariamente para compatibilidade */}
            <Route path="despesas" element={<Navigate to="/resumos" replace />} />
            <Route path="despesas/nova" element={<Navigate to="/resumos/novo" replace />} />
            <Route path="rendas" element={<Navigate to="/leituras" replace />} />
            <Route path="rendas/nova" element={<Navigate to="/leituras/nova" replace />} />
            <Route path="receitas" element={<Navigate to="/leituras" replace />} />
            <Route path="investir" element={<Navigate to="/colecoes" replace />} />
            <Route path="investir/novo" element={<Navigate to="/colecoes/novo" replace />} />
            <Route path="juros-compostos" element={<CompoundInterestPage />} />
            <Route path="extra" element={<Navigate to="/audiobooks" replace />} />
            <Route path="extra/novo" element={<Navigate to="/audiobooks/novo" replace />} />
            <Route path="gestor" element={<Navigate to="/descobertas" replace />} />
            <Route path="chatbot" element={<Navigate to="/assistente" replace />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

