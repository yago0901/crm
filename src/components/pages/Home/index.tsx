import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../contexts/auth";
import Button from "../../common/Button";
import { getDashboardStats, IDashboardStats } from "../../../services/dashboard";
import "./styles.scss";

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const Home = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState<IDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getDashboardStats()
      .then(setStats)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Erro ao carregar o dashboard")
      )
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="home_page">
      <h1>Olá, {currentUser?.displayName || currentUser?.email}</h1>

      {error && <p className="home_page__error">{error}</p>}

      {loading ? (
        <p className="home_page__empty">Carregando painel...</p>
      ) : (
        <>
          <div className="home_page__cards">
            <div className="home_page__card">
              <span>Leads ativos</span>
              <strong>{stats?.leadsCount ?? 0}</strong>
            </div>
            <div className="home_page__card">
              <span>Clientes</span>
              <strong>{stats?.clientesCount ?? 0}</strong>
            </div>
            <div className="home_page__card">
              <span>Contratos ativos</span>
              <strong>{stats?.contratosAtivosCount ?? 0}</strong>
            </div>
            <div className="home_page__card home_page__card--highlight">
              <span>Valor em contratos ativos</span>
              <strong>{currency.format(stats?.valorContratosAtivos ?? 0)}</strong>
            </div>
          </div>

          <div className="home_page__actions">
            <Button variant="primary" onClick={() => navigate("/vendas-crm/gestao-contatos")}>
              + Novo contato
            </Button>
            <Button variant="secondary" onClick={() => navigate("/vendas-crm/gestao-contratos")}>
              + Novo contrato
            </Button>
            <Button variant="secondary" onClick={() => navigate("/vendas-crm/acompanhamento-leads")}>
              Ver leads em aberto
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default Home;
