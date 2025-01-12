import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../../common/Navbar';
import './styles.scss';

const Layout = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleToggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
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