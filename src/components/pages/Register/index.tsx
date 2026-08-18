import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import "./styles.scss";

const Register = () => {
  const [password, setPassword] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [notice, setNotice] = useState<string | null>(null);

  const navigate = useNavigate();

  const handleHome = () => {
    navigate('/');
  };

  const handleSignUp = (event: React.FormEvent) => {
    event.preventDefault();
    setNotice(
      'Cadastro público desabilitado nesta demonstração. Novas contas são criadas manualmente pelo administrador.'
    );
  };

  return (
    <div className="register_background">
      <div className="register_background__container">
        <div className="register_background__container__card_login">
          <h1>Cadastro</h1>
          <button onClick={handleHome}>Voltar</button>
          <form onSubmit={handleSignUp}>
            <input
              className="register_background__container__card_login__password"
              name='email'
              placeholder='E-mail'
              aria-label='E-mail'
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              className="register_background__container__card_login__password"
              name='senha'
              placeholder='Senha'
              aria-label='Senha'
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button>Register</button>
          </form>
          {notice && <p style={{ color: "red" }}>{notice}</p>}
        </div>
      </div>
    </div>
  );
};

export default Register;
