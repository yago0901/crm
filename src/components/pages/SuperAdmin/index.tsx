import { FormEvent, useEffect, useMemo, useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { Timestamp } from "firebase/firestore";
import { auth } from "../../../services/shared/firebase";
import { subscribeToCompanies, updateCompany } from "../../../services/plataforma/companies";
import { provisionCompanyWithPrimaryAccount } from "../../../services/plataforma/provisioning";
import { ICompany } from "../../../types/company";
import Badge, { BadgeTone } from "../../common/Badge";
import Button from "../../common/Button";
import { useToast } from "../../common/Toast/ToastContext";
import "./styles.scss";

const dateInputValue = (value: Timestamp | null) =>
  value ? value.toDate().toISOString().slice(0, 10) : "";

const formatDate = (value: Timestamp | null) =>
  value ? value.toDate().toLocaleDateString("pt-BR") : "—";

const daysUntil = (value: Timestamp | null): number | null =>
  value ? Math.ceil((value.toMillis() - Date.now()) / (24 * 60 * 60 * 1000)) : null;

const daysSince = (value: Timestamp | null): number | null =>
  value ? Math.floor((Date.now() - value.toMillis()) / (24 * 60 * 60 * 1000)) : null;

const INACTIVITY_THRESHOLD_DAYS = 14;

const lastAccessLabel = (value: Timestamp | null) => {
  const days = daysSince(value);
  if (days === null) return "Nunca acessou";
  if (days === 0) return "Hoje";
  if (days === 1) return "Ontem";
  return `Há ${days} dias`;
};

const trialBadgeTone = (days: number | null): BadgeTone => {
  if (days === null) return "neutral";
  if (days < 0) return "danger";
  if (days <= 5) return "warning";
  return "success";
};

const trialBadgeLabel = (days: number | null) => {
  if (days === null) return "Sem data";
  if (days < 0) return `Expirou há ${Math.abs(days)}d`;
  if (days === 0) return "Expira hoje";
  return `${days}d restantes`;
};

const SuperAdmin = () => {
  const { showToast } = useToast();

  const [companies, setCompanies] = useState<ICompany[]>([]);
  const [loading, setLoading] = useState(true);

  const [companyName, setCompanyName] = useState("");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createdInfo, setCreatedInfo] = useState<{ login: string; tempPassword: string } | null>(
    null
  );

  useEffect(() => {
    const unsubscribe = subscribeToCompanies(
      (data) => {
        setCompanies(data);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return unsubscribe;
  }, []);

  const stats = useMemo(() => {
    const totalCompanies = companies.length;
    const totalUsers = companies.reduce((sum, company) => sum + (company.userCount ?? 0), 0);
    const payingCompanies = companies.filter((company) => company.plan === "pago").length;
    const trialCompanies = totalCompanies - payingCompanies;
    const conversionRate = totalCompanies > 0 ? Math.round((payingCompanies / totalCompanies) * 100) : 0;
    const expiringTrials = companies.filter((company) => {
      if (company.plan !== "trial") return false;
      const days = daysUntil(company.trialEndsAt);
      return days !== null && days <= 5;
    }).length;
    const inactiveCompanies = companies.filter((company) => {
      const days = daysSince(company.lastLoginAt);
      return days === null || days > INACTIVITY_THRESHOLD_DAYS;
    }).length;
    return {
      totalCompanies,
      totalUsers,
      payingCompanies,
      trialCompanies,
      conversionRate,
      expiringTrials,
      inactiveCompanies,
    };
  }, [companies]);

  const handleTrialChange = async (slug: string, value: string) => {
    const trialEndsAt = value ? Timestamp.fromDate(new Date(`${value}T00:00:00`)) : null;
    try {
      await updateCompany(slug, { trialEndsAt });
      showToast("Data do trial atualizada.", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Erro ao atualizar o trial", "error");
    }
  };

  const handleResetPassword = async (company: ICompany) => {
    if (!company.primaryEmail) {
      showToast("Essa empresa não tem e-mail principal registrado.", "error");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, company.primaryEmail);
      showToast(`E-mail de redefinição enviado para ${company.primaryEmail}.`, "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Erro ao enviar e-mail de reset", "error");
    }
  };

  const handleCreateCompany = async (event: FormEvent) => {
    event.preventDefault();
    setCreateError(null);
    setCreatedInfo(null);

    if (!companyName.trim() || !name.trim() || !username.trim() || !email.trim()) {
      setCreateError("Preencha o nome da empresa, o nome do responsável, o usuário e o e-mail.");
      return;
    }

    setCreating(true);
    try {
      const result = await provisionCompanyWithPrimaryAccount({
        companyName: companyName.trim(),
        name: name.trim(),
        username: username.trim(),
        email: email.trim(),
        skipAutoSignIn: true,
      });
      setCreatedInfo({ login: result.login, tempPassword: result.tempPassword });
      setCompanyName("");
      setName("");
      setUsername("");
      setEmail("");
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Erro ao criar a empresa.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="super_admin_page">
      <h1>Painel do Super Admin</h1>

      <section className="super_admin_page__stats">
        <div className="super_admin_page__stat_card">
          <span className="super_admin_page__stat_value">{stats.totalCompanies}</span>
          <span className="super_admin_page__stat_label">Empresas cadastradas</span>
        </div>
        <div className="super_admin_page__stat_card">
          <span className="super_admin_page__stat_value">{stats.trialCompanies}</span>
          <span className="super_admin_page__stat_label">Em trial</span>
        </div>
        <div className="super_admin_page__stat_card">
          <span className="super_admin_page__stat_value">{stats.payingCompanies}</span>
          <span className="super_admin_page__stat_label">Empresas pagantes</span>
        </div>
        <div className="super_admin_page__stat_card">
          <span className="super_admin_page__stat_value">{stats.conversionRate}%</span>
          <span className="super_admin_page__stat_label">Taxa de conversão</span>
        </div>
        <div className="super_admin_page__stat_card">
          <span className="super_admin_page__stat_value">{stats.totalUsers}</span>
          <span className="super_admin_page__stat_label">Usuários no total</span>
        </div>
        <div
          className={`super_admin_page__stat_card ${
            stats.expiringTrials > 0 ? "super_admin_page__stat_card--alert" : ""
          }`}
        >
          <span className="super_admin_page__stat_value">{stats.expiringTrials}</span>
          <span className="super_admin_page__stat_label">Trials expirando (≤5 dias)</span>
        </div>
        <div
          className={`super_admin_page__stat_card ${
            stats.inactiveCompanies > 0 ? "super_admin_page__stat_card--alert" : ""
          }`}
        >
          <span className="super_admin_page__stat_value">{stats.inactiveCompanies}</span>
          <span className="super_admin_page__stat_label">
            Sem acesso há mais de {INACTIVITY_THRESHOLD_DAYS} dias
          </span>
        </div>
      </section>

      <section className="super_admin_page__section">
        <h2>Empresas</h2>
        {loading ? (
          <p className="super_admin_page__empty">Carregando...</p>
        ) : companies.length === 0 ? (
          <p className="super_admin_page__empty">Nenhuma empresa cadastrada ainda.</p>
        ) : (
          <div className="super_admin_page__table_wrapper">
            <table>
              <thead>
                <tr>
                  <th>Empresa</th>
                  <th>Slug</th>
                  <th>Plano</th>
                  <th>Cliente desde</th>
                  <th>Último acesso</th>
                  <th>Trial até</th>
                  <th>Usuários</th>
                  <th>E-mail do dono</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {companies.map((company) => {
                  const trialDays = daysUntil(company.trialEndsAt);
                  const seatsFull = company.maxUsers > 0 && company.userCount / company.maxUsers >= 0.9;
                  const inactiveDays = daysSince(company.lastLoginAt);
                  const inactive = inactiveDays === null || inactiveDays > INACTIVITY_THRESHOLD_DAYS;
                  return (
                    <tr key={company.id}>
                      <td>{company.name}</td>
                      <td>{company.slug}</td>
                      <td>
                        <Badge tone={company.plan === "pago" ? "success" : "info"}>
                          {company.plan === "pago" ? "Pago" : "Trial"}
                        </Badge>
                      </td>
                      <td>{formatDate(company.createdAt)}</td>
                      <td>
                        <span className={inactive ? "super_admin_page__warning_text" : ""}>
                          {lastAccessLabel(company.lastLoginAt)}
                        </span>
                      </td>
                      <td>
                        <div className="super_admin_page__trial_cell">
                          <input
                            type="date"
                            defaultValue={dateInputValue(company.trialEndsAt)}
                            onBlur={(e) => handleTrialChange(company.slug, e.target.value)}
                          />
                          {company.plan === "trial" && (
                            <Badge tone={trialBadgeTone(trialDays)}>{trialBadgeLabel(trialDays)}</Badge>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className={seatsFull ? "super_admin_page__warning_text" : ""}>
                          {company.userCount}/{company.maxUsers}
                        </span>
                      </td>
                      <td>{company.primaryEmail}</td>
                      <td>
                        <Button variant="secondary" onClick={() => handleResetPassword(company)}>
                          Resetar senha
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="super_admin_page__section">
        <h2>Criar empresa manualmente</h2>
        <p className="super_admin_page__hint">
          Fallback para quando você mesmo precisar criar uma conta pra alguém, em vez da pessoa
          se cadastrar sozinha.
        </p>
        <form onSubmit={handleCreateCompany}>
          <input
            placeholder="Nome da empresa"
            aria-label="Nome da empresa"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
          />
          <input
            placeholder="Nome do responsável"
            aria-label="Nome do responsável"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            placeholder="Usuário"
            aria-label="Usuário"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            placeholder="E-mail"
            aria-label="E-mail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button type="submit" variant="primary" disabled={creating}>
            {creating ? "Criando..." : "Criar empresa"}
          </Button>
        </form>
        {createError && <p className="super_admin_page__error">{createError}</p>}
        {createdInfo && (
          <div className="super_admin_page__created">
            <p>Empresa criada! Repasse esses dados para o cliente:</p>
            <p>
              <strong>Usuário:</strong> {createdInfo.login}
            </p>
            <p>
              <strong>Senha:</strong> {createdInfo.tempPassword}
            </p>
          </div>
        )}
      </section>
    </div>
  );
};

export default SuperAdmin;
