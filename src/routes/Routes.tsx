import { Routes, Route } from "react-router-dom";

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


function Router() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/home" element={<Home />} />
      <Route path="/registro" element={<Register />} />

      <Route path="/financeiro/contabilidade" element={<Contabilidade />} />
      <Route path="/financeiro/contas-pagar" element={<ContasPagar />} />
      <Route path="/financeiro/contas-receber" element={<ContasReceber />} />
      <Route path="/financeiro/fluxo-caixa" element={<FluxoCaixa />} />
      <Route
        path="/financeiro/relatorios-financeiros"
        element={<RelatoriosFinanceiros />}
      />

      <Route path="/rh/gestao-funcionarios" element={<GestaoFuncionarios />} />
      <Route path="/rh/folha-pagamento" element={<FolhaPagamento />} />
      <Route path="/rh/recrutamento" element={<Recrutamento />} />
      <Route path="/rh/treinamento" element={<Treinamento />} />
      <Route
        path="/rh/avaliacao-desempenho"
        element={<AvaliacaoDesempenho />}
      />

      <Route
        path="/estoques-logistica/controle-estoque"
        element={<ControleEstoque />}
      />
      <Route path="/estoques-logistica/compras" element={<Compras />} />
      <Route
        path="/estoques-logistica/gestao-fornecedores"
        element={<GestaoFornecedores />}
      />
      <Route
        path="/estoques-logistica/logistica-distribuicao"
        element={<LogisticaDistribuicao />}
      />
      <Route
        path="/estoques-logistica/gestao-armazens"
        element={<GestaoArmazens />}
      />

      <Route
        path="/producao-manufatura/planejamento-producao"
        element={<PlanejamentoProducao />}
      />
      <Route
        path="/producao-manufatura/controle-qualidade"
        element={<ControleQualidade />}
      />
      <Route
        path="/producao-manufatura/ordens-producao"
        element={<OrdensProducao />}
      />
      <Route
        path="/producao-manufatura/manutencao-equipamentos"
        element={<ManutencaoEquipamentos />}
      />

      <Route path="/vendas-crm/gestao-contatos" element={<GestaoContatos />} />
      <Route
        path="/vendas-crm/automacao-vendas"
        element={<AutomacaoVendas />}
      />
      <Route
        path="/vendas-crm/acompanhamento-leads"
        element={<AcompanhamentoLeads />}
      />
      <Route
        path="/vendas-crm/gestao-contratos"
        element={<GestaoContratos />}
      />

      <Route
        path="/projetos/planejamento-projetos"
        element={<PlanejamentoProjetos />}
      />
      <Route
        path="/projetos/alocacao-recursos"
        element={<AlocacaoRecursos />}
      />
      <Route
        path="/projetos/controle-prazos-custos"
        element={<ControlePrazosCustos />}
      />
      <Route
        path="/projetos/colaboracao-equipe"
        element={<ColaboracaoEquipe />}
      />

      <Route
        path="/business-intelligence/relatorios-personalizados"
        element={<RelatoriosPersonalizados />}
      />
      <Route
        path="/business-intelligence/analise-dados"
        element={<AnaliseDados />}
      />
      <Route
        path="/business-intelligence/painels-controle"
        element={<PaineisControle />}
      />
      <Route
        path="/business-intelligence/previsao-tendencias"
        element={<PrevisaoTendencias />}
      />

      <Route
        path="/compliance-regulamentacoes/gestao-conformidade"
        element={<GestaoConformidade />}
      />
      <Route
        path="/compliance-regulamentacoes/auditoria-interna"
        element={<AuditoriaInterna />}
      />
      <Route
        path="/compliance-regulamentacoes/controle-regulamentacoes"
        element={<ControleRegulamentacoes />}
      />

      <Route
        path="/integracao-colaboracao/integracao-sistemas"
        element={<IntegracaoSistemas />}
      />
      <Route
        path="/integracao-colaboracao/comunicacao-interna"
        element={<ComunicacaoInterna />}
      />
      <Route
        path="/integracao-colaboracao/colaboracao-departamentos"
        element={<ColaboracaoDepartamentos />}
      />
    </Routes>
  );
}

export default Router;
