import { useNavigate } from 'react-router-dom';
import "./styles.scss";
import Navbar from '../../common/Navbar';
import { useState } from 'react';

const Home = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navigate = useNavigate();

  const handleToggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleHome = () => {
    navigate('/');
  };

  return (
    <div className="home_background">
      <div className="home_background__container">
        <Navbar isMenuOpen={isMenuOpen} onToggleMenu={handleToggleMenu} />
        <div className={`home_background__container__card_login ${isMenuOpen ? 'open' : ''}`}>
          <div className="home_background__container__card_login__titles">
            <h1>Logado com sucesso</h1>
            <h1>HOME PAGE</h1>
            <button onClick={handleHome}>Voltar</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
