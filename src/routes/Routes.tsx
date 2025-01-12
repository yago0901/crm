import { Routes, Route, Navigate } from "react-router-dom";

// Importe os componentes correspondentes a cada funcionalidade
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
import IntegracaoSistemas from "../components/pages/IntegracaoSistemas";
import LogisticaDistribuicao from "../components/pages/LogisticaDistribuicao";
import Login from "../components/pages/Login";
import ManutencaoEquipamentos from "../components/pages/ManutencaoEquipamentos";
import OrdensProducao from "../components/pages/OrdensProducao";
import PaineisControle from "../components/pages/PaineisControle";
import PlanejamentoProducao from "../components/pages/PlanejamentoProducao";
import PlanejamentoProjetos from "../components/pages/PlanejamentoProjetos";
import PrevisaoTendencias from "../components/pages/PrevisaoTendencias";
import Recrutamento from "../components/pages/Recrutamento";
import Register from '../components/pages/Register';
import RelatoriosFinanceiros from "../components/pages/RelatoriosFinanceiros";
import RelatoriosPersonalizados from "../components/pages/RelatoriosPersonalizados";
import Treinamento from "../components/pages/Treinamento";
import FluxoCaixa from "../components/pages/FluxoCaixa";
import { useAuth } from '../contexts/auth';
import Layout from '../components/pages/Layout';

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { currentUser } = useAuth();
  return currentUser ? children : <Navigate to="/" />;
};

function Router() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route path="/home" element={<PrivateRoute><Home /></PrivateRoute>} />

        <Route path="/financeiro/contabilidade" element={<PrivateRoute><Contabilidade /></PrivateRoute>} />
        <Route path="/financeiro/contas-pagar" element={<PrivateRoute><ContasPagar /></PrivateRoute>} />
        <Route path="/financeiro/contas-receber" element={<PrivateRoute><ContasReceber /></PrivateRoute>} />
        <Route path="/financeiro/fluxo-caixa" element={<PrivateRoute><FluxoCaixa /></PrivateRoute>} />
        <Route path="/financeiro/relatorios-financeiros" element={<PrivateRoute><RelatoriosFinanceiros /></PrivateRoute>} />

        <Route path="/rh/gestao-funcionarios" element={<PrivateRoute><GestaoFuncionarios /></PrivateRoute>} />
        <Route path="/rh/folha-pagamento" element={<PrivateRoute><FolhaPagamento /></PrivateRoute>} />
        <Route path="/rh/recrutamento" element={<PrivateRoute><Recrutamento /></PrivateRoute>} />
        <Route path="/rh/treinamento" element={<PrivateRoute><Treinamento /></PrivateRoute>} />
        <Route path="/rh/avaliacao-desempenho" element={<PrivateRoute><AvaliacaoDesempenho /></PrivateRoute>} />

        <Route path="/estoques-logistica/controle-estoque" element={<PrivateRoute><ControleEstoque /></PrivateRoute>} />
        <Route path="/estoques-logistica/compras" element={<PrivateRoute><Compras /></PrivateRoute>} />
        <Route path="/estoques-logistica/gestao-fornecedores" element={<PrivateRoute><GestaoFornecedores /></PrivateRoute>} />
        <Route path="/estoques-logistica/logistica-distribuicao" element={<PrivateRoute><LogisticaDistribuicao /></PrivateRoute>} />
        <Route path="/estoques-logistica/gestao-armazens" element={<PrivateRoute><GestaoArmazens /></PrivateRoute>} />

        <Route path="/producao-manufatura/planejamento-producao" element={<PrivateRoute><PlanejamentoProducao /></PrivateRoute>} />
        <Route path="/producao-manufatura/controle-qualidade" element={<PrivateRoute><ControleQualidade /></PrivateRoute>} />
        <Route path="/producao-manufatura/ordens-producao" element={<PrivateRoute><OrdensProducao /></PrivateRoute>} />
        <Route path="/producao-manufatura/manutencao-equipamentos" element={<PrivateRoute><ManutencaoEquipamentos /></PrivateRoute>} />

        <Route path="/vendas-crm/gestao-contatos" element={<PrivateRoute><GestaoContatos /></PrivateRoute>} />
        <Route path="/vendas-crm/automacao-vendas" element={<PrivateRoute><AutomacaoVendas /></PrivateRoute>} />
        <Route path="/vendas-crm/acompanhamento-leads" element={<PrivateRoute><AcompanhamentoLeads /></PrivateRoute>} />
        <Route path="/vendas-crm/gestao-contratos" element={<PrivateRoute><GestaoContratos /></PrivateRoute>} />

        <Route path="/projetos/planejamento-projetos" element={<PrivateRoute><PlanejamentoProjetos /></PrivateRoute>} />
        <Route path="/projetos/alocacao-recursos" element={<PrivateRoute><AlocacaoRecursos /></PrivateRoute>} />
        <Route path="/projetos/controle-prazos-custos" element={<PrivateRoute><ControlePrazosCustos /></PrivateRoute>} />
        <Route path="/projetos/colaboracao-equipe" element={<PrivateRoute><ColaboracaoEquipe /></PrivateRoute>} />

        <Route path="/business-intelligence/relatorios-personalizados" element={<PrivateRoute><RelatoriosPersonalizados /></PrivateRoute>} />
        <Route path="/business-intelligence/analise-dados" element={<PrivateRoute><AnaliseDados /></PrivateRoute>} />
        <Route path="/business-intelligence/painels-controle" element={<PrivateRoute><PaineisControle /></PrivateRoute>} />
        <Route path="/business-intelligence/previsao-tendencias" element={<PrivateRoute><PrevisaoTendencias /></PrivateRoute>} />

        <Route path="/compliance-regulamentacoes/gestao-conformidade" element={<PrivateRoute><GestaoConformidade /></PrivateRoute>} />
        <Route path="/compliance-regulamentacoes/auditoria-interna" element={<PrivateRoute><AuditoriaInterna /></PrivateRoute>} />
        <Route path="/compliance-regulamentacoes/controle-regulamentacoes" element={<PrivateRoute><ControleRegulamentacoes /></PrivateRoute>} />

        <Route path="/integracao-colaboracao/integracao-sistemas" element={<PrivateRoute><IntegracaoSistemas /></PrivateRoute>} />
        <Route path="/integracao-colaboracao/comunicacao-interna" element={<PrivateRoute><ComunicacaoInterna /></PrivateRoute>} />
        <Route path="/integracao-colaboracao/colaboracao-departamentos" element={<PrivateRoute><ColaboracaoDepartamentos /></PrivateRoute>} />
      </Route>
    </Routes>
  );
}

export default Router;
