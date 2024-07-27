import { useNavigate } from 'react-router-dom';
import "./styles.scss";

const Home = () => {

  const navigate = useNavigate();

  const handleHome = () => {
    navigate('/');
  };

  return (
    <div className="home_background">
      <div className="home_background__container">
        <div>Teste</div>
        <div className="home_background__container__card_login">
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
