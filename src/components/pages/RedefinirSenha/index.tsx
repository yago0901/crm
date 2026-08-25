import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../contexts/auth";
import "./styles.scss";

const MIN_PASSWORD_LENGTH = 6;

const RedefinirSenha = () => {
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const navigate = useNavigate();
  const { changePassword, logout } = useAuth();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`A senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`);
      return;
    }

    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    setSaving(true);
    try {
      await changePassword(password);
      navigate("/home");
    } catch (err: any) {
      const errorCode = err?.code;
      if (errorCode === "auth/weak-password") {
        setError("A senha é muito fraca. Tente outra.");
      } else if (errorCode === "auth/requires-recent-login") {
        setError("Sua sessão expirou. Saia e entre novamente para trocar a senha.");
      } else {
        setError(err instanceof Error ? err.message : "Erro ao definir a nova senha.");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <div className="redefinir_senha_background">
      <div className="redefinir_senha_background__container">
        <div className="redefinir_senha_background__container__card">
          <h1>Defina sua senha</h1>
          <p>
            Por segurança, defina uma nova senha antes de continuar.
            <span className="redefinir_senha_background__container__card__hint">
              Você só precisa fazer isso uma vez, no seu primeiro acesso.
            </span>
          </p>
          <form onSubmit={handleSubmit}>
            <input
              name="senha"
              placeholder="Nova senha"
              aria-label="Nova senha"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <input
              name="confirmarSenha"
              placeholder="Confirme a nova senha"
              aria-label="Confirme a nova senha"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            <div className="redefinir_senha_background__container__card__buttons">
              <button
                className="redefinir_senha_background__container__card__buttons__save"
                type="submit"
                disabled={saving}
              >
                {saving ? "Salvando..." : "Salvar"}
              </button>
              <button
                className="redefinir_senha_background__container__card__buttons__logout"
                type="button"
                onClick={handleLogout}
              >
                Sair
              </button>
            </div>
          </form>
          {error && <p className="redefinir_senha_background__container__card__error">{error}</p>}
        </div>
      </div>
    </div>
  );
};

export default RedefinirSenha;
