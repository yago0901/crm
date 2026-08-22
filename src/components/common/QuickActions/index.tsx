import { useNavigate } from "react-router-dom";
import { FaBullseye, FaFileSignature, FaUserPlus } from "react-icons/fa";
import "./styles.scss";

export default function QuickActions() {
  const navigate = useNavigate();

  return (
    <div className="quick_actions">
      <button
        onClick={() => navigate("/vendas-crm/gestao-contatos")}
        title="Novo contato"
        aria-label="Novo contato"
      >
        <FaUserPlus />
      </button>
      <button
        onClick={() => navigate("/vendas-crm/gestao-contratos")}
        title="Novo contrato"
        aria-label="Novo contrato"
      >
        <FaFileSignature />
      </button>
      <button
        onClick={() => navigate("/vendas-crm/acompanhamento-leads")}
        title="Ver leads em aberto"
        aria-label="Ver leads em aberto"
      >
        <FaBullseye />
      </button>
    </div>
  );
}
