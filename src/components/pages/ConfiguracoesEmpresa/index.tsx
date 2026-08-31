import { FormEvent, useEffect, useState } from "react";
import { getCompany, updateCompany } from "../../../services/plataforma/companies";
import { getCurrentCompanyId } from "../../../services/shared/tenant";
import { ICompany } from "../../../types/company";
import Button from "../../common/Button";
import Badge from "../../common/Badge";
import FormField from "../../common/FormField";
import { useToast } from "../../common/Toast";
import "./styles.scss";

const PLAN_LABEL: Record<ICompany["plan"], string> = {
  trial: "Teste grátis",
  pago: "Pago",
};

const dateLabel = (value: ICompany["trialEndsAt"]) =>
  value ? value.toDate().toLocaleDateString("pt-BR") : "Sem data definida";

export default function ConfiguracoesEmpresa() {
  const { showToast } = useToast();

  const [company, setCompany] = useState<ICompany | null>(null);
  const [name, setName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const companyId = getCurrentCompanyId();
    if (!companyId) return;

    setLoading(true);
    try {
      const data = await getCompany(companyId);
      setCompany(data);
      setName(data?.name ?? "");
      setCnpj(data?.cnpj ?? "");
      setAddress(data?.address ?? "");
      setPhone(data?.phone ?? "");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Erro ao carregar a empresa.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    if (!company || !name.trim()) return;

    setSaving(true);
    try {
      await updateCompany(company.slug, {
        name: name.trim(),
        cnpj: cnpj.trim(),
        address: address.trim(),
        phone: phone.trim(),
      });
      showToast("Empresa atualizada.", "success");
      load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Erro ao salvar.", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="company_settings_page">
        <h1>Configurações da empresa</h1>
        <p className="company_settings_page__empty">Carregando...</p>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="company_settings_page">
        <h1>Configurações da empresa</h1>
        <p className="company_settings_page__empty">Empresa não encontrada.</p>
      </div>
    );
  }

  return (
    <div className="company_settings_page">
      <h1>Configurações da empresa</h1>

      <section className="company_settings_page__section">
        <h2>Dados da empresa</h2>
        <form onSubmit={handleSave} className="company_settings_page__form">
          <FormField label="Nome da empresa">
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
          </FormField>
          <FormField label="CNPJ">
            <input
              type="text"
              value={cnpj}
              onChange={(e) => setCnpj(e.target.value)}
              placeholder="00.000.000/0000-00"
            />
          </FormField>
          <FormField label="Endereço">
            <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} />
          </FormField>
          <FormField label="Telefone">
            <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </FormField>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </form>
      </section>

      <section className="company_settings_page__section">
        <h2>Plano e assinatura</h2>
        <div className="company_settings_page__info">
          <div className="company_settings_page__info_item">
            <span>Plano</span>
            <Badge tone={company.plan === "pago" ? "success" : "info"}>{PLAN_LABEL[company.plan]}</Badge>
          </div>
          <div className="company_settings_page__info_item">
            <span>Trial até</span>
            <strong>{dateLabel(company.trialEndsAt)}</strong>
          </div>
          <div className="company_settings_page__info_item">
            <span>Usuários</span>
            <strong>
              {company.userCount}/{company.maxUsers}
            </strong>
          </div>
        </div>
        <p className="company_settings_page__hint">
          Precisa mudar de plano ou aumentar o limite de usuários? Fale com o suporte.
        </p>
      </section>
    </div>
  );
}
