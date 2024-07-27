import { useState } from 'react';
import { auth } from "../../../services/firebase"
import { createUserWithEmailAndPassword } from 'firebase/auth';

import "./styles.scss";
import { useNavigate } from 'react-router-dom';


const Register = () => {
  const [password, setPassword] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();

  const handleHome = () => {
    navigate('/');
  };

  const handleSignUp = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      await createUserWithEmailAndPassword(auth, email, password);
      navigate("/")
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
              type="email"
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              className="register_background__container__card_login__password"
              name='senha'
              placeholder='Senha'
              type="password"
              onChange={(e) => setPassword(e.target.value)}
            />
            <button>Register</button>
          </form>
          {error && <p style={{ color: "red" }}>{error}</p>}
        </div>
      </div>
    </div>
  );
};

export default Register;
