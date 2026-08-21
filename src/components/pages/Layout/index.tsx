import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../../common/Navbar';
import './styles.scss';

const MENU_STATE_KEY = 'navbarOpen';

const Layout = () => {
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
        <Navbar isMenuOpen={isMenuOpen} onToggleMenu={handleToggleMenu} />
        <div className={`home_background__container__card_login ${isMenuOpen ? 'open' : ''}`}>
            <Outlet />
        </div>
      </div>
    </div>
  );
};

export default Layout;