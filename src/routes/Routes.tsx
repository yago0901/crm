import { Routes, Route, Navigate, useLocation } from "react-router-dom";

import ConfiguracoesEmpresa from "../components/pages/ConfiguracoesEmpresa";
import AcompanhamentoLeads from "../components/pages/AcompanhamentoLeads";
import Historico from "../components/pages/Historico";
import Notificacoes from "../components/pages/Notificacoes";
import Home from '../components/pages/Home';
import Landing from "../components/pages/Landing";
import Login from "../components/pages/Login";
import RedefinirSenha from "../components/pages/RedefinirSenha";
import Register from '../components/pages/Register';
import SuperAdmin from "../components/pages/SuperAdmin";
import AdminLayout from "../components/pages/SuperAdmin/AdminLayout";
import AdminLogin from "../components/pages/SuperAdmin/AdminLogin";
import TrialExpirado from "../components/pages/TrialExpirado";
import Layout from '../components/pages/Layout';
import { useAuth } from '../contexts/auth/AuthContext';
import { NavGroupDef, NavPageDef, NAV_GROUPS } from '../navigation';

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { currentUser, loading, mustChangePassword, trialExpired } = useAuth();
  const location = useLocation();

  if (loading) return null;
  if (!currentUser) return <Navigate to="/entrar" />;
  if (trialExpired && location.pathname !== "/trial-expirado") {
    return <Navigate to="/trial-expirado" />;
  }
  if (mustChangePassword && location.pathname !== "/redefinir-senha") {
    return <Navigate to="/redefinir-senha" />;
  }

  return children;
};

const AdminOnlyRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAdmin } = useAuth();
  if (!isAdmin) return <Navigate to="/home" />;
  return children;
};

const ModuleRoute = ({
  requiredModule,
  children,
}: {
  requiredModule: NavGroupDef["key"];
  children: React.ReactNode;
}) => {
  const { isAdmin, modules } = useAuth();
  if (!isAdmin && !modules.includes(requiredModule)) return <Navigate to="/home" />;
  return children;
};

const SuperAdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { currentUser, loading, isSuperAdmin } = useAuth();

  if (loading) return null;
  if (!currentUser) return <AdminLogin />;
  if (!isSuperAdmin) return <Navigate to="/home" />;

  return <AdminLayout>{children}</AdminLayout>;
};

/**
 * Renders one page from the NAV_GROUPS manifest with its access gates:
 * always PrivateRoute (signed in); ModuleRoute for the page's group unless
 * it opts out (noModuleGate, e.g. Acessos); AdminOnlyRoute on top when the
 * page itself is admin-only.
 */
const renderPageRoute = (page: NavPageDef, group: NavGroupDef) => {
  let element = <page.component />;
  if (page.adminOnly) {
    element = <AdminOnlyRoute>{element}</AdminOnlyRoute>;
  }
  if (!page.noModuleGate) {
    element = <ModuleRoute requiredModule={group.key}>{element}</ModuleRoute>;
  }

  return (
    <Route key={page.path} path={page.path} element={<PrivateRoute>{element}</PrivateRoute>} />
  );
};

function Router() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/entrar" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/redefinir-senha" element={<PrivateRoute><RedefinirSenha /></PrivateRoute>} />
      <Route path="/trial-expirado" element={<PrivateRoute><TrialExpirado /></PrivateRoute>} />
      <Route path="/admin" element={<SuperAdminRoute><SuperAdmin /></SuperAdminRoute>} />
      <Route element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route path="/home" element={<PrivateRoute><Home /></PrivateRoute>} />
        <Route path="/configuracoes" element={<PrivateRoute><AdminOnlyRoute><ConfiguracoesEmpresa /></AdminOnlyRoute></PrivateRoute>} />
        <Route path="/historico" element={<PrivateRoute><AdminOnlyRoute><Historico /></AdminOnlyRoute></PrivateRoute>} />
        <Route path="/notificacoes" element={<PrivateRoute><Notificacoes /></PrivateRoute>} />

        {NAV_GROUPS.flatMap((group) => group.pages.map((page) => renderPageRoute(page, group)))}

        <Route path="/vendas-crm/acompanhamento-leads/:contactId" element={<PrivateRoute><ModuleRoute requiredModule="sales"><AcompanhamentoLeads /></ModuleRoute></PrivateRoute>} />
      </Route>
    </Routes>
  );
}

export default Router;
