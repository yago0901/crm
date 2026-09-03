import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { FirebaseError } from 'firebase/app';
import { useAuth } from '../../../contexts/auth/AuthContext';
import './styles.scss';

const Login = () => {
  const [loginId, setLoginId] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const [mode, setMode] = useState<'login' | 'reset'>('login');
  const [resetLoginId, setResetLoginId] = useState<string>('');
  const [resetSending, setResetSending] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const navigate = useNavigate();
  const { login, resetPassword } = useAuth();

  const handleClick = () => {
    navigate('/register');
  };

  const handleSign = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      await login(loginId, password);
      navigate("/home");
      setError(null);
    } catch (error) {
      if (error instanceof FirebaseError && error.code === 'auth/weak-password') {
        setError('A senha é muito fraca. Tente outra.');
      } else if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('Erro ao entrar.');
      }
    }
  };

  const openReset = () => {
    setMode('reset');
    setResetLoginId(loginId);
    setResetSent(false);
  };

  const backToLogin = () => {
    setMode('login');
    setResetSent(false);
  };

  const handleReset = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!resetLoginId.trim() || resetSending) return;

    setResetSending(true);
    try {
      await resetPassword(resetLoginId.trim());
    } finally {
      setResetSending(false);
      setResetSent(true);
    }
  };

  if (mode === 'reset') {
    return (
      <div className="login_background" key="reset">
        <div className="login_background__container">
          <div className="login_background__container__card_login">
            <div className="login_background__container__card_login__titles">
              <div className="login_background__container__card_login__titles__icon"></div>
              <h1>Redefinir senha</h1>
            </div>

            {resetSent ? (
              <p className="login_background__container__card_login__reset_hint">
                Se esse usuário existir, enviamos um e-mail com o link para redefinir a senha.
                Confira também a caixa de spam.
              </p>
            ) : (
              <form onSubmit={handleReset}>
                <p className="login_background__container__card_login__reset_hint">
                  Digite seu usuário (empresa.usuario) e enviaremos um link de redefinição para o
                  e-mail cadastrado.
                </p>
                <input
                  className="login_background__container__card_login__user"
                  name="login"
                  placeholder="empresa.usuario"
                  aria-label="Usuário (empresa.usuario)"
                  type="text"
                  value={resetLoginId}
                  onChange={(e) => setResetLoginId(e.target.value)}
                />
                <div className="login_background__container__card_login__buttons">
                  <button
                    className="login_background__container__card_login__buttons__login"
                    type="submit"
                    disabled={resetSending}
                  >
                    {resetSending ? 'ENVIANDO...' : 'ENVIAR LINK'}
                  </button>
                </div>
              </form>
            )}

            <div className="login_background__container__card_login__settings">
              <div className="login_background__container__card_login__settings__forgot">
                <p onClick={backToLogin}>Voltar ao login</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login_background" key="login">
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
              placeholder='empresa.usuario'
              aria-label='Usuário (empresa.usuario)'
              type="text"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
            />
            <input
              className="login_background__container__card_login__password"
              name='senha'
              placeholder='Senha'
              aria-label='Senha'
              type="password"
              onChange={(e) => setPassword(e.target.value)}
            />
            <div className="login_background__container__card_login__buttons">
              <button className="login_background__container__card_login__buttons__login" type="submit">LOGIN</button>
              <button className="login_background__container__card_login__buttons__register" type="button" onClick={handleClick}>REGISTRO</button>
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
                <p onClick={openReset}>Esqueci a senha</p>
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
