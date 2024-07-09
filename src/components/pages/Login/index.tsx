import { useNavigate } from 'react-router-dom';

import { useState } from 'react';
import { auth } from "../../../services/firebase"
import { signInWithEmailAndPassword } from 'firebase/auth';

import "./styles.scss";

const Login = () => {

  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();

  const handleClick = () => {
    navigate('/registro');
  };

  const handleSign = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/home")
      setError(null);
    } catch (error: any) {
      const errorCode = error.code;
      const errorMessage = error.message;

      if (errorCode === 'auth/weak-password') {
        setError('A senha é muito fraca. Tente outra.');
      } else {
        setError(errorMessage);
      }
    }
  };

  return (
    <div className="background">
      <div className="background__container">
        <div className="background__container__card_login">
          <div className="background__container__card_login__titles">
            <h1>Login</h1>
            <button onClick={handleClick}>Cadastro</button>
          </div>
          <form onSubmit={handleSign}>
            <input
              className="background__container__card_login__user"
              name='login'
              placeholder='Usuário/E-mail'
              type="text"
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              className="background__container__card_login__password"
              name='senha'
              placeholder='Senha'
              type="password"
              onChange={(e) => setPassword(e.target.value)}
            />
            <button>LOGIN</button>
            <div className="background__container__card_login__settings" >
              <div className="background__container__card_login__settings__remember">
                <input
                  type="checkbox"
                  className="background__container__card_login__settings__remember__checkbox"
                />
                <p>Lembre-me</p>
              </div>
              <div className="background__container__card_login__settings__forgot">
                <p>Esqueci a senha</p>
              </div>
            </div>
          </form>
          {error && <p style={{ color: "red" }}>{error}</p>}
        </div>
      </div>
    </div>
  );
};

export default Login;
