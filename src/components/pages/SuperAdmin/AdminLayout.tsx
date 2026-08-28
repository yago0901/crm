import { ReactNode, useState } from 'react';
import { FaHome } from 'react-icons/fa';
import Navbar from '../../common/Navbar';
import { NavbarMenuItem } from '../../common/Navbar/types';
import '../Layout/styles.scss';

const MENU_STATE_KEY = 'navbarOpen';

const ADMIN_MENU: NavbarMenuItem[] = [
  { key: 'home', label: 'Home', icon: FaHome, path: '/admin' },
];

const AdminLayout = ({ children }: { children: ReactNode }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(() => {
    return localStorage.getItem(MENU_STATE_KEY) === 'true';
  });

  const handleToggleMenu = () => {
    setIsMenuOpen((current) => {
      const next = !current;
      localStorage.setItem(MENU_STATE_KEY, String(next));
      return next;
    });
  };

  return (
    <div className="home_background">
      <div className="home_background__container">
        <Navbar
          isMenuOpen={isMenuOpen}
          onToggleMenu={handleToggleMenu}
          menu={ADMIN_MENU}
          logoutRedirectTo="/admin"
        />
        <div className={`home_background__container__card_login ${isMenuOpen ? 'open' : ''}`}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
