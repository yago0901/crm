import { useEffect, useState } from "react";
import { FaCoins, FaFileContract, FaUserCheck, FaUserClock } from "react-icons/fa";
import { useAuth } from "../../../contexts/auth/AuthContext";
import QuickActions from "../../common/QuickActions";
import ContactsStatusChart from "./charts/ContactsStatusChart";
import ContractsStatusChart from "./charts/ContractsStatusChart";
import CashFlowChart from "../../common/charts/CashFlowChart";
import PayrollByDepartmentChart from "./charts/PayrollByDepartmentChart";
import EmployeeStatusChart from "./charts/EmployeeStatusChart";
import FinanceStatusChart from "../../common/charts/FinanceStatusChart";
import {
  getContactStatusBreakdown,
  getContractStatusBreakdown,
  getDashboardStats,
  getEmployeeStatusBreakdown,
  getFinanceStatusBreakdown,
  getMonthlyCashFlow,
  getPayrollByDepartment,
  IDashboardStats,
  IDepartmentPayroll,
  IStatusCount,
} from "../../../services/shared/dashboard";
import { IMonthlyCashFlow } from "../../../services/financeiro/finance";
import "./styles.scss";

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const Home = () => {
  const { currentUser } = useAuth();

  const [stats, setStats] = useState<IDashboardStats | null>(null);
  const [contactsByStatus, setContactsByStatus] = useState<IStatusCount[]>([]);
  const [contractsByStatus, setContractsByStatus] = useState<IStatusCount[]>([]);
  const [employeesByStatus, setEmployeesByStatus] = useState<IStatusCount[]>([]);
  const [financeByStatus, setFinanceByStatus] = useState<IStatusCount[]>([]);
  const [cashFlow, setCashFlow] = useState<IMonthlyCashFlow[]>([]);
  const [payroll, setPayroll] = useState<IDepartmentPayroll[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      getDashboardStats(),
      getContactStatusBreakdown(),
      getContractStatusBreakdown(),
      getEmployeeStatusBreakdown(),
      getFinanceStatusBreakdown(),
      getMonthlyCashFlow(),
      getPayrollByDepartment(),
    ])
      .then(
        ([
          statsData,
          contactsData,
          contractsData,
          employeesData,
          financeData,
          cashFlowData,
          payrollData,
        ]) => {
          setStats(statsData);
          setContactsByStatus(contactsData);
          setContractsByStatus(contractsData);
          setEmployeesByStatus(employeesData);
          setFinanceByStatus(financeData);
          setCashFlow(cashFlowData);
          setPayroll(payrollData);
        }
      )
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Erro ao carregar o dashboard")
      )
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="home_page">
      <div className="home_page__header">
        <h1>Olá, {currentUser?.displayName || currentUser?.email}</h1>
        <QuickActions />
      </div>

      {error && <p className="home_page__error">{error}</p>}

      {loading ? (
        <p className="home_page__empty">Carregando painel...</p>
      ) : (
        <>
          <div className="home_page__cards">
            <div className="home_page__card home_page__card--amber">
              <div className="home_page__card__icon">
                <FaUserClock />
              </div>
              <div className="home_page__card__text">
                <span>Leads ativos</span>
                <strong>{stats?.leadsCount ?? 0}</strong>
              </div>
            </div>
            <div className="home_page__card home_page__card--teal">
              <div className="home_page__card__icon">
                <FaUserCheck />
              </div>
              <div className="home_page__card__text">
                <span>Clientes</span>
                <strong>{stats?.clientesCount ?? 0}</strong>
              </div>
            </div>
            <div className="home_page__card home_page__card--blue">
              <div className="home_page__card__icon">
                <FaFileContract />
              </div>
              <div className="home_page__card__text">
                <span>Contratos ativos</span>
                <strong>{stats?.contratosAtivosCount ?? 0}</strong>
              </div>
            </div>
            <div className="home_page__card home_page__card--violet">
              <div className="home_page__card__icon">
                <FaCoins />
              </div>
              <div className="home_page__card__text">
                <span>Valor em contratos ativos</span>
                <strong>{currency.format(stats?.valorContratosAtivos ?? 0)}</strong>
              </div>
            </div>
          </div>

          <div className="home_page__charts">
            <ContactsStatusChart data={contactsByStatus} />
            <ContractsStatusChart data={contractsByStatus} />
            <CashFlowChart data={cashFlow} />
            <PayrollByDepartmentChart data={payroll} />
            <EmployeeStatusChart data={employeesByStatus} />
            <FinanceStatusChart data={financeByStatus} />
          </div>
        </>
      )}
    </div>
  );
};

export default Home;
