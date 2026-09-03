import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../contexts/auth/AuthContext";
import "./styles.scss";

export default function TrialExpirado() {
  const navigate = useNavigate();
  const { isAdmin, companyName, trialEndsAt, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const expiredOn = trialEndsAt ? trialEndsAt.toDate().toLocaleDateString("pt-BR") : null;

  return (
    <div className="trial_expirado_background">
      <div className="trial_expirado_background__container">
        <div className="trial_expirado_background__container__card">
          <h1>Período de teste encerrado</h1>

          {isAdmin ? (
            <>
              <p>
                O período de teste gratuito da <strong>{companyName ?? "sua empresa"}</strong>
                {expiredOn ? ` terminou em ${expiredOn}` : " terminou"}.
              </p>
              <p className="trial_expirado_background__container__card__hint">
                Para continuar usando o sistema, é necessário renovar o plano. Entre em
                contato com o suporte para renovar o acesso.
              </p>
            </>
          ) : (
            <p>
              O acesso da <strong>{companyName ?? "sua empresa"}</strong> está pausado
              porque o período de teste gratuito terminou. Fale com o administrador da sua
              empresa para reativar.
            </p>
          )}

          <button
            className="trial_expirado_background__container__card__logout"
            type="button"
            onClick={handleLogout}
          >
            Sair
          </button>
        </div>
      </div>
    </div>
  );
}
