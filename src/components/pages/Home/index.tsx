import { useNavigate } from 'react-router-dom';
import "./styles.scss";

const Home = () => {

  const navigate = useNavigate();

  const handleHome = () => {
    navigate('/');
  };

  return (
    <div className="background">
      <div className="background__container">
        <div className="background__container__card_login">
          <div className="background__container__card_login__titles">
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
