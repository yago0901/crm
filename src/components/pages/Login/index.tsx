import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../../../contexts/auth';
import './styles.scss';

const Login = () => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();
  const { login } = useAuth();

  const handleClick = () => {
    navigate('/registro');
  };

  const handleSign = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      await login(email, password);
      navigate("/home");
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
    <div className="login_background">
      <div className="login_background__container">
        <div className="login_background__container__card_login">
          <div className="login_background__container__card_login__titles">
            <div className="login_background__container__card_login__titles__icon">

            </div>
            <h1>Login</h1>
          </div>
          <form onSubmit={handleSign} >
            <input
              className="login_background__container__card_login__user"
              name='login'
              placeholder='Usuário/E-mail'
              type="text"
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              className="login_background__container__card_login__password"
              name='senha'
              placeholder='Senha'
              type="password"
              onChange={(e) => setPassword(e.target.value)}
            />
            <div className="login_background__container__card_login__buttons">
              <button className="login_background__container__card_login__buttons__login">LOGIN</button>
              <button className="login_background__container__card_login__buttons__register" onClick={handleClick}>REGISTRO</button>
            </div>
            <div className="login_background__container__card_login__settings" >
              <div className="login_background__container__card_login__settings__remember">
                <input
                  type="checkbox"
                  className="login_background__container__card_login__settings__remember__checkbox"
                />
                <p>Lembre-me</p>
              </div>
              <div className="login_background__container__card_login__settings__forgot">
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
