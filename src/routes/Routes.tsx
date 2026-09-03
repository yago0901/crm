import { Routes, Route, Navigate, useLocation } from "react-router-dom";

import AcessosFuncionarios from "../components/pages/AcessosFuncionarios";
import ConfiguracoesEmpresa from "../components/pages/ConfiguracoesEmpresa";
import AcompanhamentoLeads from "../components/pages/AcompanhamentoLeads";
import AlocacaoRecursos from "../components/pages/AlocacaoRecursos";
import AnaliseDados from "../components/pages/AnaliseDados";
import AuditoriaInterna from "../components/pages/AuditoriaInterna";
import AutomacaoVendas from "../components/pages/AutomacaoVendas";
import AvaliacaoDesempenho from "../components/pages/AvaliacaoDesempenho";
import ColaboracaoDepartamentos from "../components/pages/ColaboracaoDepartamentos";
import ColaboracaoEquipe from "../components/pages/ColaboracaoEquipe";
import Compras from "../components/pages/Compras";
import ComunicacaoInterna from "../components/pages/ComunicacaoInterna";
import Contabilidade from "../components/pages/Contabilidade";
import ContasPagar from "../components/pages/ContasPagar";
import ContasReceber from "../components/pages/ContasReceber";
import ControleEstoque from "../components/pages/ControleEstoque";
import ControlePrazosCustos from "../components/pages/ControlePrazosCustos";
import ControleQualidade from "../components/pages/ControleQualidade";
import ControleRegulamentacoes from "../components/pages/ControleRegulamentacoes";
import FolhaPagamento from "../components/pages/FolhaPagamento";
import GestaoArmazens from "../components/pages/GestaoArmazens";
import GestaoConformidade from "../components/pages/GestaoConformidade";
import GestaoContatos from "../components/pages/GestaoContatos";
import GestaoContratos from "../components/pages/GestaoContratos";
import GestaoFornecedores from "../components/pages/GestaoFornecedores";
import GestaoFuncionarios from "../components/pages/GestaoFuncionarios";
import Home from '../components/pages/Home';
import LogisticaDistribuicao from "../components/pages/LogisticaDistribuicao";
import Login from "../components/pages/Login";
import ManutencaoEquipamentos from "../components/pages/ManutencaoEquipamentos";
import OrdensProducao from "../components/pages/OrdensProducao";
import PaineisControle from "../components/pages/PaineisControle";
import PlanejamentoProducao from "../components/pages/PlanejamentoProducao";
import PlanejamentoProjetos from "../components/pages/PlanejamentoProjetos";
import PrevisaoTendencias from "../components/pages/PrevisaoTendencias";
import Recrutamento from "../components/pages/Recrutamento";
import RedefinirSenha from "../components/pages/RedefinirSenha";
import Register from '../components/pages/Register';
import SuperAdmin from "../components/pages/SuperAdmin";
import AdminLayout from "../components/pages/SuperAdmin/AdminLayout";
import AdminLogin from "../components/pages/SuperAdmin/AdminLogin";
import RelatoriosFinanceiros from "../components/pages/RelatoriosFinanceiros";
import RelatoriosPersonalizados from "../components/pages/RelatoriosPersonalizados";
import Treinamento from "../components/pages/Treinamento";
import FluxoCaixa from "../components/pages/FluxoCaixa";
import { useAuth } from '../contexts/auth/AuthContext';
import { ModuleKey } from '../services/shared/modules';
import Layout from '../components/pages/Layout';

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { currentUser, loading, mustChangePassword } = useAuth();
  const location = useLocation();

  if (loading) return null;
  if (!currentUser) return <Navigate to="/" />;
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
  requiredModule: ModuleKey;
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

function Router() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/redefinir-senha" element={<PrivateRoute><RedefinirSenha /></PrivateRoute>} />
      <Route path="/admin" element={<SuperAdminRoute><SuperAdmin /></SuperAdminRoute>} />
      <Route element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route path="/home" element={<PrivateRoute><Home /></PrivateRoute>} />
        <Route path="/configuracoes" element={<PrivateRoute><AdminOnlyRoute><ConfiguracoesEmpresa /></AdminOnlyRoute></PrivateRoute>} />

        <Route path="/financeiro/contabilidade" element={<PrivateRoute><ModuleRoute requiredModule="financial"><Contabilidade /></ModuleRoute></PrivateRoute>} />
        <Route path="/financeiro/contas-pagar" element={<PrivateRoute><ModuleRoute requiredModule="financial"><ContasPagar /></ModuleRoute></PrivateRoute>} />
        <Route path="/financeiro/contas-receber" element={<PrivateRoute><ModuleRoute requiredModule="financial"><ContasReceber /></ModuleRoute></PrivateRoute>} />
        <Route path="/financeiro/fluxo-caixa" element={<PrivateRoute><ModuleRoute requiredModule="financial"><FluxoCaixa /></ModuleRoute></PrivateRoute>} />
        <Route path="/financeiro/relatorios-financeiros" element={<PrivateRoute><ModuleRoute requiredModule="financial"><RelatoriosFinanceiros /></ModuleRoute></PrivateRoute>} />

        <Route path="/rh/gestao-funcionarios" element={<PrivateRoute><ModuleRoute requiredModule="human-resources"><GestaoFuncionarios /></ModuleRoute></PrivateRoute>} />
        <Route path="/rh/acessos" element={<PrivateRoute><AdminOnlyRoute><AcessosFuncionarios /></AdminOnlyRoute></PrivateRoute>} />
        <Route path="/rh/folha-pagamento" element={<PrivateRoute><ModuleRoute requiredModule="human-resources"><FolhaPagamento /></ModuleRoute></PrivateRoute>} />
        <Route path="/rh/recrutamento" element={<PrivateRoute><ModuleRoute requiredModule="human-resources"><Recrutamento /></ModuleRoute></PrivateRoute>} />
        <Route path="/rh/treinamento" element={<PrivateRoute><ModuleRoute requiredModule="human-resources"><Treinamento /></ModuleRoute></PrivateRoute>} />
        <Route path="/rh/avaliacao-desempenho" element={<PrivateRoute><ModuleRoute requiredModule="human-resources"><AvaliacaoDesempenho /></ModuleRoute></PrivateRoute>} />

        <Route path="/estoques-logistica/controle-estoque" element={<PrivateRoute><ModuleRoute requiredModule="inventory-logistics"><ControleEstoque /></ModuleRoute></PrivateRoute>} />
        <Route path="/estoques-logistica/compras" element={<PrivateRoute><ModuleRoute requiredModule="inventory-logistics"><Compras /></ModuleRoute></PrivateRoute>} />
        <Route path="/estoques-logistica/gestao-fornecedores" element={<PrivateRoute><ModuleRoute requiredModule="inventory-logistics"><GestaoFornecedores /></ModuleRoute></PrivateRoute>} />
        <Route path="/estoques-logistica/logistica-distribuicao" element={<PrivateRoute><ModuleRoute requiredModule="inventory-logistics"><LogisticaDistribuicao /></ModuleRoute></PrivateRoute>} />
        <Route path="/estoques-logistica/gestao-armazens" element={<PrivateRoute><ModuleRoute requiredModule="inventory-logistics"><GestaoArmazens /></ModuleRoute></PrivateRoute>} />

        <Route path="/producao-manufatura/planejamento-producao" element={<PrivateRoute><ModuleRoute requiredModule="production"><PlanejamentoProducao /></ModuleRoute></PrivateRoute>} />
        <Route path="/producao-manufatura/controle-qualidade" element={<PrivateRoute><ModuleRoute requiredModule="production"><ControleQualidade /></ModuleRoute></PrivateRoute>} />
        <Route path="/producao-manufatura/ordens-producao" element={<PrivateRoute><ModuleRoute requiredModule="production"><OrdensProducao /></ModuleRoute></PrivateRoute>} />
        <Route path="/producao-manufatura/manutencao-equipamentos" element={<PrivateRoute><ModuleRoute requiredModule="production"><ManutencaoEquipamentos /></ModuleRoute></PrivateRoute>} />

        <Route path="/vendas-crm/gestao-contatos" element={<PrivateRoute><ModuleRoute requiredModule="sales"><GestaoContatos /></ModuleRoute></PrivateRoute>} />
        <Route path="/vendas-crm/automacao-vendas" element={<PrivateRoute><ModuleRoute requiredModule="sales"><AutomacaoVendas /></ModuleRoute></PrivateRoute>} />
        <Route path="/vendas-crm/acompanhamento-leads" element={<PrivateRoute><ModuleRoute requiredModule="sales"><AcompanhamentoLeads /></ModuleRoute></PrivateRoute>} />
        <Route path="/vendas-crm/acompanhamento-leads/:contactId" element={<PrivateRoute><ModuleRoute requiredModule="sales"><AcompanhamentoLeads /></ModuleRoute></PrivateRoute>} />
        <Route path="/vendas-crm/gestao-contratos" element={<PrivateRoute><ModuleRoute requiredModule="sales"><GestaoContratos /></ModuleRoute></PrivateRoute>} />

        <Route path="/projetos/planejamento-projetos" element={<PrivateRoute><ModuleRoute requiredModule="projects"><PlanejamentoProjetos /></ModuleRoute></PrivateRoute>} />
        <Route path="/projetos/alocacao-recursos" element={<PrivateRoute><ModuleRoute requiredModule="projects"><AlocacaoRecursos /></ModuleRoute></PrivateRoute>} />
        <Route path="/projetos/controle-prazos-custos" element={<PrivateRoute><ModuleRoute requiredModule="projects"><ControlePrazosCustos /></ModuleRoute></PrivateRoute>} />
        <Route path="/projetos/colaboracao-equipe" element={<PrivateRoute><ModuleRoute requiredModule="projects"><ColaboracaoEquipe /></ModuleRoute></PrivateRoute>} />

        <Route path="/business-intelligence/relatorios-personalizados" element={<PrivateRoute><ModuleRoute requiredModule="business-intelligence"><RelatoriosPersonalizados /></ModuleRoute></PrivateRoute>} />
        <Route path="/business-intelligence/analise-dados" element={<PrivateRoute><ModuleRoute requiredModule="business-intelligence"><AnaliseDados /></ModuleRoute></PrivateRoute>} />
        <Route path="/business-intelligence/painels-controle" element={<PrivateRoute><ModuleRoute requiredModule="business-intelligence"><PaineisControle /></ModuleRoute></PrivateRoute>} />
        <Route path="/business-intelligence/previsao-tendencias" element={<PrivateRoute><ModuleRoute requiredModule="business-intelligence"><PrevisaoTendencias /></ModuleRoute></PrivateRoute>} />

        <Route path="/compliance-regulamentacoes/gestao-conformidade" element={<PrivateRoute><ModuleRoute requiredModule="compliance"><GestaoConformidade /></ModuleRoute></PrivateRoute>} />
        <Route path="/compliance-regulamentacoes/auditoria-interna" element={<PrivateRoute><ModuleRoute requiredModule="compliance"><AuditoriaInterna /></ModuleRoute></PrivateRoute>} />
        <Route path="/compliance-regulamentacoes/controle-regulamentacoes" element={<PrivateRoute><ModuleRoute requiredModule="compliance"><ControleRegulamentacoes /></ModuleRoute></PrivateRoute>} />

        <Route path="/integracao-colaboracao/comunicacao-interna" element={<PrivateRoute><ModuleRoute requiredModule="collaboration"><ComunicacaoInterna /></ModuleRoute></PrivateRoute>} />
        <Route path="/integracao-colaboracao/colaboracao-departamentos" element={<PrivateRoute><ModuleRoute requiredModule="collaboration"><ColaboracaoDepartamentos /></ModuleRoute></PrivateRoute>} />
      </Route>
    </Routes>
  );
}

export default Router;
