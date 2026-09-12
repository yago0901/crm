import { INavbar, NavbarMenuItem } from "./types";
import "./styles.scss";
import { useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import {
  FaBell,
  FaChevronDown,
  FaCog,
  FaHistory,
  FaHome,
  FaMoon,
  FaSignOutAlt,
  FaSun,
} from 'react-icons/fa';
import { useTheme } from '../../../hooks/useTheme';
import { useAuth } from '../../../contexts/auth/AuthContext';
import { subscribeToOpenNotificationCount } from '../../../services/shared/notifications';
import { NAV_GROUPS } from '../../../navigation';

const DEFAULT_MENU: NavbarMenuItem[] = [
  { key: 'home', label: 'Home', icon: FaHome, path: '/home' },
  ...NAV_GROUPS.map((group) => ({
    key: group.key,
    requiredModule: group.key,
    label: group.label,
    icon: group.icon,
    children: group.pages.map((page) => ({
      label: page.label,
      path: page.path,
      adminOnly: page.adminOnly,
    })),
  })),
];

const findActiveKey = (menu: NavbarMenuItem[], pathname: string): string | null => {
  const item = menu.find(
    (menuItem) =>
      menuItem.path === pathname ||
      menuItem.children?.some((child) => pathname.startsWith(child.path))
  );
  return item?.key ?? null;
};

const Navbar: React.FC<INavbar> = ({
  isMenuOpen,
  onToggleMenu,
  menu = DEFAULT_MENU,
  logoutRedirectTo = '/entrar',
  showNotifications = true,
}) => {
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
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    if (!showNotifications) return;
    const unsubscribe = subscribeToOpenNotificationCount(setNotificationCount);
    return unsubscribe;
  }, [showNotifications]);

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

            {showNotifications && (
              <button className="navbar__settings" onClick={() => handleNavigate('/notificacoes')}>
                <FaBell />
                <span>Notificações</span>
                {notificationCount > 0 && (
                  <span className="navbar__badge">{notificationCount}</span>
                )}
              </button>
            )}

            {isAdmin && (
              <button onClick={() => handleNavigate('/configuracoes')}>
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

            <button
              className={`navbar__theme_toggle ${!isAdmin ? 'navbar__settings' : ''}`}
              onClick={toggleTheme}
            >
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
