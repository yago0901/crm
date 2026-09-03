import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../../common/Navbar';
import { useAuth } from '../../../contexts/auth/AuthContext';
import './styles.scss';

const MENU_STATE_KEY = 'navbarOpen';
const TRIAL_WARNING_DAYS = 5;

const Layout = () => {
  const { trialDaysRemaining } = useAuth();
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

  const showTrialBanner =
    trialDaysRemaining !== null && trialDaysRemaining >= 0 && trialDaysRemaining <= TRIAL_WARNING_DAYS;

  return (
    <div className="home_background">
      <div className="home_background__container">
        <Navbar isMenuOpen={isMenuOpen} onToggleMenu={handleToggleMenu} />
        <div className={`home_background__container__card_login ${isMenuOpen ? 'open' : ''}`}>
            {showTrialBanner && (
              <div className="trial_banner">
                {trialDaysRemaining === 0
                  ? 'Seu período de teste termina hoje.'
                  : `Seu período de teste termina em ${trialDaysRemaining} dia${trialDaysRemaining === 1 ? '' : 's'}.`}
              </div>
            )}
            <Outlet />
        </div>
      </div>
    </div>
  );
};

export default Layout;
