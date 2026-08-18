import { INavbar } from "./types";
import "./styles.scss";
import { useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import {
  FaChevronDown,
  FaHandshake,
  FaHome,
  FaMoneyBillWave,
  FaUsers,
} from 'react-icons/fa';

interface MenuChild {
  label: string;
  path: string;
}

interface MenuItem {
  key: string;
  label: string;
  icon: React.ComponentType;
  path?: string;
  children?: MenuChild[];
}

const MENU: MenuItem[] = [
  { key: 'home', label: 'Home', icon: FaHome, path: '/home' },
  {
    key: 'human-resources',
    label: 'Recursos Humanos',
    icon: FaUsers,
    children: [
      { label: 'Funcionários', path: '/rh/gestao-funcionarios' },
      { label: 'Recrutamento', path: '/rh/recrutamento' },
      { label: 'Treinamento', path: '/rh/treinamento' },
    ],
  },
  {
    key: 'sales',
    label: 'Vendas / CRM',
    icon: FaHandshake,
    children: [
      { label: 'Gestão de Contatos', path: '/vendas-crm/gestao-contatos' },
      { label: 'Acompanhamento de Leads', path: '/vendas-crm/acompanhamento-leads' },
      { label: 'Automação de Vendas', path: '/vendas-crm/automacao-vendas' },
      { label: 'Gestão de Contratos', path: '/vendas-crm/gestao-contratos' },
    ],
  },
  {
    key: 'financial',
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
];

const findActiveKey = (pathname: string): string | null => {
  const item = MENU.find(
    (menuItem) =>
      menuItem.path === pathname ||
      menuItem.children?.some((child) => pathname.startsWith(child.path))
  );
  return item?.key ?? null;
};

const Navbar: React.FC<INavbar> = ({ isMenuOpen, onToggleMenu }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [openKey, setOpenKey] = useState<string | null>(findActiveKey(location.pathname));

  useEffect(() => {
    const activeKey = findActiveKey(location.pathname);
    if (activeKey) setOpenKey(activeKey);
  }, [location.pathname]);

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
              {MENU.map((item) => {
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
                        {item.children.map((child) => (
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
          </nav>
        )}
        <button className='navbar__button_close' onClick={onToggleMenu}>
          {isMenuOpen ? 'X' : '>'}
        </button>
      </div>
    </>
  )
}

export default Navbar;
