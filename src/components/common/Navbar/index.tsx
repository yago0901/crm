import { INavbar, NavbarMenuItem } from "./types";
import "./styles.scss";
import { useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import {
  FaChartLine,
  FaChevronDown,
  FaClipboardCheck,
  FaCog,
  FaCommentDots,
  FaHandshake,
  FaHistory,
  FaHome,
  FaIndustry,
  FaMoneyBillWave,
  FaMoon,
  FaProjectDiagram,
  FaSignOutAlt,
  FaSun,
  FaUsers,
  FaWarehouse,
} from 'react-icons/fa';
import { useTheme } from '../../../hooks/useTheme';
import { useAuth } from '../../../contexts/auth/AuthContext';

const DEFAULT_MENU: NavbarMenuItem[] = [
  { key: 'home', label: 'Home', icon: FaHome, path: '/home' },
  {
    key: 'human-resources',
    requiredModule: 'human-resources',
    label: 'Recursos Humanos',
    icon: FaUsers,
    children: [
      { label: 'Funcionários', path: '/rh/gestao-funcionarios' },
      { label: 'Acessos', path: '/rh/acessos', adminOnly: true },
      { label: 'Folha de Pagamento', path: '/rh/folha-pagamento' },
      { label: 'Recrutamento', path: '/rh/recrutamento' },
      { label: 'Treinamento', path: '/rh/treinamento' },
      { label: 'Avaliação de Desempenho', path: '/rh/avaliacao-desempenho' },
    ],
  },
  {
    key: 'sales',
    requiredModule: 'sales',
    label: 'Vendas / CRM',
    icon: FaHandshake,
    children: [
      { label: 'Gestão de Contatos', path: '/vendas-crm/gestao-contatos' },
      { label: 'Acompanhamento de Leads', path: '/vendas-crm/acompanhamento-leads' },
      { label: 'Automação de Vendas', path: '/vendas-crm/automacao-vendas' },
      { label: 'Gestão de Contratos', path: '/vendas-crm/gestao-contratos' },
      { label: 'Produtos', path: '/vendas-crm/produtos' },
    ],
  },
  {
    key: 'financial',
    requiredModule: 'financial',
    label: 'Financeiro',
    icon: FaMoneyBillWave,
    children: [
      { label: 'Fluxo de Caixa', path: '/financeiro/fluxo-caixa' },
      { label: 'Contabilidade', path: '/financeiro/contabilidade' },
      { label: 'Contas a Pagar', path: '/financeiro/contas-pagar' },
      { label: 'Contas a Receber', path: '/financeiro/contas-receber' },
      { label: 'Relatórios Financeiros', path: '/financeiro/relatorios-financeiros' },
    ],
  },
  {
    key: 'inventory-logistics',
    requiredModule: 'inventory-logistics',
    label: 'Estoques e Logística',
    icon: FaWarehouse,
    children: [
      { label: 'Gestão de Fornecedores', path: '/estoques-logistica/gestao-fornecedores' },
      { label: 'Controle de Estoque', path: '/estoques-logistica/controle-estoque' },
      { label: 'Compras', path: '/estoques-logistica/compras' },
      { label: 'Logística e Distribuição', path: '/estoques-logistica/logistica-distribuicao' },
      { label: 'Gestão de Armazéns', path: '/estoques-logistica/gestao-armazens' },
    ],
  },
  {
    key: 'production',
    requiredModule: 'production',
    label: 'Produção e Manufatura',
    icon: FaIndustry,
    children: [
      { label: 'Planejamento de Produção', path: '/producao-manufatura/planejamento-producao' },
      { label: 'Ordens de Produção', path: '/producao-manufatura/ordens-producao' },
      { label: 'Controle de Qualidade', path: '/producao-manufatura/controle-qualidade' },
      { label: 'Manutenção de Equipamentos', path: '/producao-manufatura/manutencao-equipamentos' },
    ],
  },
  {
    key: 'projects',
    requiredModule: 'projects',
    label: 'Projetos',
    icon: FaProjectDiagram,
    children: [
      { label: 'Planejamento de Projetos', path: '/projetos/planejamento-projetos' },
      { label: 'Alocação de Recursos', path: '/projetos/alocacao-recursos' },
      { label: 'Controle de Prazos e Custos', path: '/projetos/controle-prazos-custos' },
      { label: 'Colaboração de Equipe', path: '/projetos/colaboracao-equipe' },
    ],
  },
  {
    key: 'business-intelligence',
    requiredModule: 'business-intelligence',
    label: 'Business Intelligence',
    icon: FaChartLine,
    children: [
      { label: 'Painéis de Controle', path: '/business-intelligence/painels-controle' },
      { label: 'Análise de Dados', path: '/business-intelligence/analise-dados' },
      { label: 'Relatórios Personalizados', path: '/business-intelligence/relatorios-personalizados' },
      { label: 'Previsão de Tendências', path: '/business-intelligence/previsao-tendencias' },
    ],
  },
  {
    key: 'compliance',
    requiredModule: 'compliance',
    label: 'Compliance e Regulamentações',
    icon: FaClipboardCheck,
    children: [
      { label: 'Gestão de Conformidade', path: '/compliance-regulamentacoes/gestao-conformidade' },
      { label: 'Auditoria Interna', path: '/compliance-regulamentacoes/auditoria-interna' },
      { label: 'Controle de Regulamentações', path: '/compliance-regulamentacoes/controle-regulamentacoes' },
    ],
  },
  {
    key: 'collaboration',
    requiredModule: 'collaboration',
    label: 'Colaboração',
    icon: FaCommentDots,
    children: [
      { label: 'Comunicação Interna', path: '/integracao-colaboracao/comunicacao-interna' },
      { label: 'Colaboração de Departamentos', path: '/integracao-colaboracao/colaboracao-departamentos' },
    ],
  },
];

const findActiveKey = (menu: NavbarMenuItem[], pathname: string): string | null => {
  const item = menu.find(
    (menuItem) =>
      menuItem.path === pathname ||
      menuItem.children?.some((child) => pathname.startsWith(child.path))
  );
  return item?.key ?? null;
};

const Navbar: React.FC<INavbar> = ({ isMenuOpen, onToggleMenu, menu = DEFAULT_MENU, logoutRedirectTo = '/' }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { logout, isAdmin, modules } = useAuth();

  const visibleMenu = useMemo(
    () =>
      isAdmin ? menu : menu.filter((item) => !item.requiredModule || modules.includes(item.requiredModule)),
    [menu, isAdmin, modules]
  );

  const [openKey, setOpenKey] = useState<string | null>(findActiveKey(visibleMenu, location.pathname));

  const handleLogout = async () => {
    await logout();
    navigate(logoutRedirectTo);
  };

  useEffect(() => {
    const activeKey = findActiveKey(visibleMenu, location.pathname);
    if (activeKey) setOpenKey(activeKey);
  }, [location.pathname, visibleMenu]);

  const handleNavigate = (where: string) => {
    navigate(where);
  };

  const toggleSection = (key: string, path?: string) => {
    if (path) {
      handleNavigate(path);
      setOpenKey(key);
      return;
    }
    setOpenKey((current) => (current === key ? null : key));
  };

  return (
    <>
      {isMenuOpen && <div className="navbar_backdrop" onClick={onToggleMenu} />}
      <div className={`navbar ${isMenuOpen ? 'open' : 'closed'}`}>
        {isMenuOpen && (
          <nav>
            <ul>
              {visibleMenu.map((item) => {
                const Icon = item.icon;
                const isSectionActive = openKey === item.key;
                return (
                  <li key={item.key}>
                    <button
                      onClick={() => toggleSection(item.key, item.path)}
                      className={isSectionActive ? 'navbar__selected' : ''}
                    >
                      <Icon />
                      <span>{item.label}</span>
                      {item.children && (
                        <FaChevronDown
                          className={`navbar__chevron ${isSectionActive ? 'navbar__chevron--open' : ''}`}
                        />
                      )}
                    </button>
                    {item.children && isSectionActive && (
                      <ul>
                        {item.children
                          .filter((child) => !child.adminOnly || isAdmin)
                          .map((child) => (
                            <li key={child.path}>
                              <button
                                onClick={() => handleNavigate(child.path)}
                                className={
                                  location.pathname.startsWith(child.path)
                                    ? 'navbar__selected'
                                    : ''
                                }
                              >
                                {child.label}
                              </button>
                            </li>
                          ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>

            {isAdmin && (
              <button className="navbar__settings" onClick={() => handleNavigate('/configuracoes')}>
                <FaCog />
                <span>Configurações</span>
              </button>
            )}

            {isAdmin && (
              <button className="navbar__settings" onClick={() => handleNavigate('/historico')}>
                <FaHistory />
                <span>Histórico</span>
              </button>
            )}

            <button className="navbar__theme_toggle" onClick={toggleTheme}>
              {theme === 'light' ? <FaMoon /> : <FaSun />}
              <span>{theme === 'light' ? 'Modo escuro' : 'Modo claro'}</span>
            </button>

            <button className="navbar__logout" onClick={handleLogout}>
              <FaSignOutAlt />
              <span>Sair</span>
            </button>
          </nav>
        )}
        <button
          className='navbar__button_close'
          onClick={onToggleMenu}
          aria-label={isMenuOpen ? 'Fechar menu' : 'Abrir menu'}
        >
          {isMenuOpen ? '<' : '>'}
        </button>
      </div>
    </>
  )
}

export default Navbar;
