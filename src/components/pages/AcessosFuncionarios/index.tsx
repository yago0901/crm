import { FormEvent, useEffect, useState } from "react";
import { useToast } from "../../common/Toast/ToastContext";
import Modal from "../../common/Modal";
import ConfirmDialog from "../../common/ConfirmDialog";
import Button from "../../common/Button";
import Badge from "../../common/Badge";
import FormField from "../../common/FormField";
import { fetchActiveEmployees } from "../../../services/rh/employees";
import {
  createEmployeeLogin,
  fetchCompanyUserProfiles,
  setEmployeeAccess,
  updateEmployeeModules,
} from "../../../services/rh/employeeAccess";
import { IEmployee } from "../../../types/employee";
import { IUserProfile } from "../../../types/user";
import { ALL_MODULE_KEYS, ModuleKey } from "../../../services/shared/modules";
import "./styles.scss";

const MODULE_LABELS: Record<ModuleKey, string> = {
  sales: "Vendas / CRM",
  financial: "Financeiro",
  "human-resources": "Recursos Humanos",
  "inventory-logistics": "Estoques e Logística",
  production: "Produção e Manufatura",
  projects: "Projetos",
  "business-intelligence": "Business Intelligence",
  compliance: "Compliance e Regulamentações",
  collaboration: "Colaboração",
};

interface EmployeeRow {
  employee: IEmployee;
  profile: IUserProfile | null;
}

export default function AcessosFuncionarios() {
  const { showToast } = useToast();

  const [rows, setRows] = useState<EmployeeRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [employees, profiles] = await Promise.all([
        fetchActiveEmployees(),
        fetchCompanyUserProfiles(),
      ]);
      const profileByEmployeeId = new Map(
        profiles.filter((profile) => profile.employeeId).map((profile) => [profile.employeeId, profile])
      );
      setRows(
        employees.map((employee) => ({
          employee,
          profile: employee.userId ? profileByEmployeeId.get(employee.id) ?? null : null,
        }))
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Erro ao carregar acessos.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [creatingFor, setCreatingFor] = useState<IEmployee | null>(null);
  const [username, setUsername] = useState("");
  const [creating, setCreating] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{ login: string; tempPassword: string } | null>(
    null
  );

  const openCreate = (employee: IEmployee) => {
    setCreatingFor(employee);
    setUsername("");
    setCreatedCredentials(null);
  };

  const closeCreate = () => {
    setCreatingFor(null);
    setUsername("");
    setCreatedCredentials(null);
    load();
  };

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    if (!creatingFor || !username.trim()) return;

    setCreating(true);
    try {
      const result = await createEmployeeLogin(creatingFor, username.trim());
      setCreatedCredentials(result);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Erro ao criar acesso.", "error");
    } finally {
      setCreating(false);
    }
  };

  const [managingRow, setManagingRow] = useState<EmployeeRow | null>(null);
  const [selectedModules, setSelectedModules] = useState<ModuleKey[]>([]);
  const [savingModules, setSavingModules] = useState(false);
  const [togglingAccess, setTogglingAccess] = useState(false);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);

  const openManage = (row: EmployeeRow) => {
    setManagingRow(row);
    setSelectedModules((row.profile?.modules as ModuleKey[]) ?? []);
  };

  const closeManage = () => setManagingRow(null);

  const toggleModule = (key: ModuleKey) => {
    setSelectedModules((current) =>
      current.includes(key) ? current.filter((moduleKey) => moduleKey !== key) : [...current, key]
    );
  };

  const handleSaveModules = async () => {
    if (!managingRow?.profile) return;
    setSavingModules(true);
    try {
      await updateEmployeeModules(managingRow.profile.uid, selectedModules);
      showToast("Módulos atualizados.", "success");
      closeManage();
      load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Erro ao salvar módulos.", "error");
    } finally {
      setSavingModules(false);
    }
  };

  const handleToggleAccess = async (disabled: boolean) => {
    if (!managingRow?.profile) return;
    setTogglingAccess(true);
    try {
      await setEmployeeAccess(managingRow.profile.uid, disabled);
      showToast(disabled ? "Acesso desativado." : "Acesso reativado.", "success");
      setConfirmDeactivate(false);
      closeManage();
      load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Erro ao atualizar o acesso.", "error");
    } finally {
      setTogglingAccess(false);
    }
  };

  return (
    <div className="employee_access_page">
      <h1>Acessos</h1>
      <p className="employee_access_page__hint">
        Gerencie login e módulos liberados para cada funcionário ativo.
      </p>

      {loading ? (
        <p className="employee_access_page__empty">Carregando...</p>
      ) : rows.length === 0 ? (
        <p className="employee_access_page__empty">Nenhum funcionário ativo cadastrado.</p>
      ) : (
        <div className="employee_access_page__table_wrapper">
          <table>
            <thead>
              <tr>
                <th>Funcionário</th>
                <th>Cargo</th>
                <th>Login</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ employee, profile }) => (
                <tr key={employee.id}>
                  <td>{employee.name}</td>
                  <td>{employee.role}</td>
                  <td>{profile?.login ?? "—"}</td>
                  <td>
                    {!profile && <Badge tone="neutral">Sem acesso</Badge>}
                    {profile && !profile.disabled && <Badge tone="success">Ativo</Badge>}
                    {profile && profile.disabled && <Badge tone="danger">Desativado</Badge>}
                  </td>
                  <td>
                    {!profile ? (
                      <Button variant="secondary" onClick={() => openCreate(employee)}>
                        Criar acesso
                      </Button>
                    ) : (
                      <Button variant="secondary" onClick={() => openManage({ employee, profile })}>
                        Gerenciar
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={!!creatingFor} onClose={closeCreate} title={`Criar acesso — ${creatingFor?.name ?? ""}`}>
        {!createdCredentials ? (
          <form onSubmit={handleCreate} className="employee_access_page__create_form">
            <FormField label="Nome de usuário">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ex: joao"
                required
              />
            </FormField>
            <Button type="submit" variant="primary" disabled={creating}>
              {creating ? "Criando..." : "Criar acesso"}
            </Button>
          </form>
        ) : (
          <div className="employee_access_page__created">
            <p>Acesso criado! Copie e repasse para o funcionário agora — a senha não aparece de novo.</p>
            <p>
              <strong>Login:</strong> {createdCredentials.login}
            </p>
            <p>
              <strong>Senha temporária:</strong> {createdCredentials.tempPassword}
            </p>
            <Button variant="primary" onClick={closeCreate}>
              Fechar
            </Button>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={!!managingRow}
        onClose={closeManage}
        title={`Gerenciar acesso — ${managingRow?.employee.name ?? ""}`}
      >
        {managingRow?.profile && (
          <div className="employee_access_page__manage">
            <p>
              <strong>Login:</strong> {managingRow.profile.login}
            </p>

            <div className="employee_access_page__modules">
              <span className="employee_access_page__modules_label">Módulos liberados</span>
              {ALL_MODULE_KEYS.map((key) => (
                <label key={key} className="employee_access_page__module_option">
                  <input
                    type="checkbox"
                    checked={selectedModules.includes(key)}
                    onChange={() => toggleModule(key)}
                  />
                  {MODULE_LABELS[key]}
                </label>
              ))}
            </div>

            <div className="employee_access_page__manage_actions">
              <Button variant="primary" onClick={handleSaveModules} disabled={savingModules}>
                {savingModules ? "Salvando..." : "Salvar módulos"}
              </Button>

              <Button variant="ghost" disabled title="Em breve: link para o funcionário definir a própria senha">
                Enviar link de primeiro acesso
              </Button>

              {managingRow.profile.disabled ? (
                <Button
                  variant="secondary"
                  onClick={() => handleToggleAccess(false)}
                  disabled={togglingAccess}
                >
                  {togglingAccess ? "Reativando..." : "Reativar acesso"}
                </Button>
              ) : (
                <Button variant="danger" onClick={() => setConfirmDeactivate(true)} disabled={togglingAccess}>
                  Desativar acesso
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={confirmDeactivate}
        title="Desativar acesso"
        message={`Tem certeza que quer desativar o acesso de ${managingRow?.employee.name ?? ""}? A pessoa não vai mais conseguir acessar o sistema.`}
        confirmLabel="Desativar"
        danger
        onConfirm={() => handleToggleAccess(true)}
        onCancel={() => setConfirmDeactivate(false)}
      />
    </div>
  );
}
