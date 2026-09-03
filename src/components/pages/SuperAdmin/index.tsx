import { FormEvent, useEffect, useMemo, useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { Timestamp } from "firebase/firestore";
import { auth } from "../../../services/shared/firebase";
import { subscribeToCompanies, updateCompany } from "../../../services/plataforma/companies";
import { provisionCompanyWithPrimaryAccount } from "../../../services/plataforma/provisioning";
import { ICompany } from "../../../types/company";
import Button from "../../common/Button";
import { useToast } from "../../common/Toast/ToastContext";
import "./styles.scss";

const dateInputValue = (value: Timestamp | null) =>
  value ? value.toDate().toISOString().slice(0, 10) : "";

const SuperAdmin = () => {
  const { showToast } = useToast();

  const [companies, setCompanies] = useState<ICompany[]>([]);
  const [loading, setLoading] = useState(true);

  const [companyName, setCompanyName] = useState("");
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
    return { totalCompanies, totalUsers, payingCompanies };
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

    if (!companyName.trim() || !username.trim() || !email.trim()) {
      setCreateError("Preencha o nome da empresa, o usuário e o e-mail.");
      return;
    }

    setCreating(true);
    try {
      const result = await provisionCompanyWithPrimaryAccount({
        companyName: companyName.trim(),
        username: username.trim(),
        email: email.trim(),
        skipAutoSignIn: true,
      });
      setCreatedInfo({ login: result.login, tempPassword: result.tempPassword });
      setCompanyName("");
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
          <span className="super_admin_page__stat_value">{stats.totalUsers}</span>
          <span className="super_admin_page__stat_label">Usuários no total</span>
        </div>
        <div className="super_admin_page__stat_card">
          <span className="super_admin_page__stat_value">{stats.payingCompanies}</span>
          <span className="super_admin_page__stat_label">Empresas pagantes</span>
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
                  <th>Trial até</th>
                  <th>Usuários</th>
                  <th>E-mail do dono</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {companies.map((company) => (
                  <tr key={company.id}>
                    <td>{company.name}</td>
                    <td>{company.slug}</td>
                    <td>{company.plan}</td>
                    <td>
                      <input
                        type="date"
                        defaultValue={dateInputValue(company.trialEndsAt)}
                        onBlur={(e) => handleTrialChange(company.slug, e.target.value)}
                      />
                    </td>
                    <td>
                      {company.userCount}/{company.maxUsers}
                    </td>
                    <td>{company.primaryEmail}</td>
                    <td>
                      <Button variant="secondary" onClick={() => handleResetPassword(company)}>
                        Resetar senha
                      </Button>
                    </td>
                  </tr>
                ))}
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
