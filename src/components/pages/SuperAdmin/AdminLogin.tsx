import { FormEvent, useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../../services/shared/firebase";
import "./adminLoginStyles.scss";

const AdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSigningIn(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao entrar.");
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <div className="admin_login_background">
      <div className="admin_login_background__card">
        <h1>Acesso restrito</h1>
        <form onSubmit={handleSubmit}>
          <input
            placeholder="E-mail"
            aria-label="E-mail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            placeholder="Senha"
            aria-label="Senha"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="submit" disabled={signingIn}>
            {signingIn ? "Entrando..." : "Entrar"}
          </button>
        </form>
        {error && <p className="admin_login_background__error">{error}</p>}
      </div>
    </div>
  );
};

export default AdminLogin;
