import type { ComponentType } from "react";
import {
  FaChartLine,
  FaClipboardCheck,
  FaCommentDots,
  FaHandshake,
  FaIndustry,
  FaMoneyBillWave,
  FaProjectDiagram,
  FaUsers,
  FaWarehouse,
} from "react-icons/fa";
import type { ModuleKey } from "./services/shared/modules";

import AcessosFuncionarios from "./components/pages/AcessosFuncionarios";
import AcompanhamentoLeads from "./components/pages/AcompanhamentoLeads";
import AlocacaoRecursos from "./components/pages/AlocacaoRecursos";
import AnaliseDados from "./components/pages/AnaliseDados";
import AuditoriaInterna from "./components/pages/AuditoriaInterna";
import AutomacaoVendas from "./components/pages/AutomacaoVendas";
import AvaliacaoDesempenho from "./components/pages/AvaliacaoDesempenho";
import ColaboracaoDepartamentos from "./components/pages/ColaboracaoDepartamentos";
import ColaboracaoEquipe from "./components/pages/ColaboracaoEquipe";
import Comissoes from "./components/pages/Comissoes";
import Compras from "./components/pages/Compras";
import ComunicacaoInterna from "./components/pages/ComunicacaoInterna";
import Contabilidade from "./components/pages/Contabilidade";
import ContasPagar from "./components/pages/ContasPagar";
import ContasReceber from "./components/pages/ContasReceber";
import ControleEstoque from "./components/pages/ControleEstoque";
import ControlePrazosCustos from "./components/pages/ControlePrazosCustos";
import ControleQualidade from "./components/pages/ControleQualidade";
import ControleRegulamentacoes from "./components/pages/ControleRegulamentacoes";
import EstoquePorArmazem from "./components/pages/EstoquePorArmazem";
import FluxoCaixa from "./components/pages/FluxoCaixa";
import FolhaPagamento from "./components/pages/FolhaPagamento";
import GestaoArmazens from "./components/pages/GestaoArmazens";
import GestaoConformidade from "./components/pages/GestaoConformidade";
import GestaoContatos from "./components/pages/GestaoContatos";
import GestaoContratos from "./components/pages/GestaoContratos";
import GestaoFornecedores from "./components/pages/GestaoFornecedores";
import GestaoFuncionarios from "./components/pages/GestaoFuncionarios";
import LogisticaDistribuicao from "./components/pages/LogisticaDistribuicao";
import ManutencaoEquipamentos from "./components/pages/ManutencaoEquipamentos";
import Negocios from "./components/pages/Negocios";
import OrdensProducao from "./components/pages/OrdensProducao";
import PaineisControle from "./components/pages/PaineisControle";
import PedidosDeVenda from "./components/pages/PedidosDeVenda";
import PlanejamentoProducao from "./components/pages/PlanejamentoProducao";
import PlanejamentoProjetos from "./components/pages/PlanejamentoProjetos";
import PrevisaoTendencias from "./components/pages/PrevisaoTendencias";
import Produtos from "./components/pages/Produtos";
import Propostas from "./components/pages/Propostas";
import Recrutamento from "./components/pages/Recrutamento";
import RelatoriosFinanceiros from "./components/pages/RelatoriosFinanceiros";
import RelatoriosPersonalizados from "./components/pages/RelatoriosPersonalizados";
import Treinamento from "./components/pages/Treinamento";

export interface NavPageDef {
  path: string;
  label: string;
  component: ComponentType;
  adminOnly?: boolean;
  /** Opts this one page out of the group's module gate (e.g. Acessos is admin-only, not module-gated). */
  noModuleGate?: boolean;
}

export interface NavGroupDef {
  key: ModuleKey;
  label: string;
  icon: ComponentType;
  pages: NavPageDef[];
}

/**
 * Single source of truth for every module-gated page: which route it lives at,
 * which component renders it, its menu label/icon/group, and its access gates
 * (module + optional admin-only). Both Routes.tsx and the Navbar menu are
 * generated from this list, so adding a page only means editing it here once.
 *
 * Pages outside any module (Home, Configurações, Histórico, Notificações,
 * auth screens, the super-admin panel) aren't part of this — they're not in
 * the sidebar's module sections and stay declared directly in Routes.tsx.
 */
export const NAV_GROUPS: NavGroupDef[] = [
  {
    key: "human-resources",
    label: "Recursos Humanos",
    icon: FaUsers,
    pages: [
      { path: "/rh/gestao-funcionarios", label: "Funcionários", component: GestaoFuncionarios },
      {
        path: "/rh/acessos",
        label: "Acessos",
        component: AcessosFuncionarios,
        adminOnly: true,
        noModuleGate: true,
      },
      { path: "/rh/folha-pagamento", label: "Folha de Pagamento", component: FolhaPagamento },
      { path: "/rh/recrutamento", label: "Recrutamento", component: Recrutamento },
      { path: "/rh/treinamento", label: "Treinamento", component: Treinamento },
      {
        path: "/rh/avaliacao-desempenho",
        label: "Avaliação de Desempenho",
        component: AvaliacaoDesempenho,
      },
    ],
  },
  {
    key: "sales",
    label: "Vendas / CRM",
    icon: FaHandshake,
    pages: [
      { path: "/vendas-crm/gestao-contatos", label: "Gestão de Contatos", component: GestaoContatos },
      {
        path: "/vendas-crm/acompanhamento-leads",
        label: "Acompanhamento de Leads",
        component: AcompanhamentoLeads,
      },
      { path: "/vendas-crm/negocios", label: "Negócios", component: Negocios },
      { path: "/vendas-crm/propostas", label: "Propostas", component: Propostas },
      { path: "/vendas-crm/pedidos-de-venda", label: "Pedidos de Venda", component: PedidosDeVenda },
      { path: "/vendas-crm/comissoes", label: "Comissões", component: Comissoes },
      { path: "/vendas-crm/automacao-vendas", label: "Automação de Vendas", component: AutomacaoVendas },
      { path: "/vendas-crm/gestao-contratos", label: "Gestão de Contratos", component: GestaoContratos },
      { path: "/vendas-crm/produtos", label: "Produtos", component: Produtos },
    ],
  },
  {
    key: "financial",
    label: "Financeiro",
    icon: FaMoneyBillWave,
    pages: [
      { path: "/financeiro/fluxo-caixa", label: "Fluxo de Caixa", component: FluxoCaixa },
      { path: "/financeiro/contabilidade", label: "Contabilidade", component: Contabilidade },
      { path: "/financeiro/contas-pagar", label: "Contas a Pagar", component: ContasPagar },
      { path: "/financeiro/contas-receber", label: "Contas a Receber", component: ContasReceber },
      {
        path: "/financeiro/relatorios-financeiros",
        label: "Relatórios Financeiros",
        component: RelatoriosFinanceiros,
      },
    ],
  },
  {
    key: "inventory-logistics",
    label: "Estoques e Logística",
    icon: FaWarehouse,
    pages: [
      {
        path: "/estoques-logistica/gestao-fornecedores",
        label: "Gestão de Fornecedores",
        component: GestaoFornecedores,
      },
      {
        path: "/estoques-logistica/controle-estoque",
        label: "Controle de Estoque",
        component: ControleEstoque,
      },
      { path: "/estoques-logistica/compras", label: "Compras", component: Compras },
      {
        path: "/estoques-logistica/logistica-distribuicao",
        label: "Logística e Distribuição",
        component: LogisticaDistribuicao,
      },
      {
        path: "/estoques-logistica/gestao-armazens",
        label: "Gestão de Armazéns",
        component: GestaoArmazens,
      },
      {
        path: "/estoques-logistica/estoque-por-armazem",
        label: "Estoque por Armazém",
        component: EstoquePorArmazem,
      },
    ],
  },
  {
    key: "production",
    label: "Produção e Manufatura",
    icon: FaIndustry,
    pages: [
      {
        path: "/producao-manufatura/planejamento-producao",
        label: "Planejamento de Produção",
        component: PlanejamentoProducao,
      },
      {
        path: "/producao-manufatura/ordens-producao",
        label: "Ordens de Produção",
        component: OrdensProducao,
      },
      {
        path: "/producao-manufatura/controle-qualidade",
        label: "Controle de Qualidade",
        component: ControleQualidade,
      },
      {
        path: "/producao-manufatura/manutencao-equipamentos",
        label: "Manutenção de Equipamentos",
        component: ManutencaoEquipamentos,
      },
    ],
  },
  {
    key: "projects",
    label: "Projetos",
    icon: FaProjectDiagram,
    pages: [
      {
        path: "/projetos/planejamento-projetos",
        label: "Planejamento de Projetos",
        component: PlanejamentoProjetos,
      },
      { path: "/projetos/alocacao-recursos", label: "Alocação de Recursos", component: AlocacaoRecursos },
      {
        path: "/projetos/controle-prazos-custos",
        label: "Controle de Prazos e Custos",
        component: ControlePrazosCustos,
      },
      { path: "/projetos/colaboracao-equipe", label: "Colaboração de Equipe", component: ColaboracaoEquipe },
    ],
  },
  {
    key: "business-intelligence",
    label: "Business Intelligence",
    icon: FaChartLine,
    pages: [
      {
        path: "/business-intelligence/painels-controle",
        label: "Painéis de Controle",
        component: PaineisControle,
      },
      { path: "/business-intelligence/analise-dados", label: "Análise de Dados", component: AnaliseDados },
      {
        path: "/business-intelligence/relatorios-personalizados",
        label: "Relatórios Personalizados",
        component: RelatoriosPersonalizados,
      },
      {
        path: "/business-intelligence/previsao-tendencias",
        label: "Previsão de Tendências",
        component: PrevisaoTendencias,
      },
    ],
  },
  {
    key: "compliance",
    label: "Compliance",
    icon: FaClipboardCheck,
    pages: [
      {
        path: "/compliance-regulamentacoes/gestao-conformidade",
        label: "Gestão de Conformidade",
        component: GestaoConformidade,
      },
      {
        path: "/compliance-regulamentacoes/auditoria-interna",
        label: "Auditoria Interna",
        component: AuditoriaInterna,
      },
      {
        path: "/compliance-regulamentacoes/controle-regulamentacoes",
        label: "Controle de Regulamentações",
        component: ControleRegulamentacoes,
      },
    ],
  },
  {
    key: "collaboration",
    label: "Colaboração",
    icon: FaCommentDots,
    pages: [
      {
        path: "/integracao-colaboracao/comunicacao-interna",
        label: "Comunicação Interna",
        component: ComunicacaoInterna,
      },
      {
        path: "/integracao-colaboracao/colaboracao-departamentos",
        label: "Colaboração de Departamentos",
        component: ColaboracaoDepartamentos,
      },
    ],
  },
];
