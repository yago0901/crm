import Modal from "../Modal";
import ConfirmDialog from "../ConfirmDialog";
import Button from "../Button";
import FormField from "../FormField";
import Pagination from "../Pagination";
import { useResourceCrud } from "../../../hooks/useResourceCrud";
import { MAX_INPUT_DATE, MIN_INPUT_DATE, fromDateInput, toDateInput } from "../../../utils/dateInput";
import { ResourceFormField, ResourceSchema } from "./types";
import "./styles.scss";

interface ResourcePageProps<T extends { id: string }, TInput extends object> {
  schema: ResourceSchema<T, TInput>;
}

function renderField<TInput extends object>(
  field: ResourceFormField<TInput>,
  form: TInput,
  setField: (key: keyof TInput & string, value: unknown) => void
) {
  const value = form[field.key];

  switch (field.kind) {
    case "select":
      return (
        <select
          value={value as string}
          onChange={(e) => setField(field.key, e.target.value)}
        >
          {field.options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    case "textarea":
      return (
        <textarea
          value={(value as string) ?? ""}
          onChange={(e) => setField(field.key, e.target.value)}
        />
      );
    case "number":
      return (
        <input
          required={field.required}
          type="number"
          min="0"
          value={(value as number) ?? 0}
          onChange={(e) => setField(field.key, Number(e.target.value))}
        />
      );
    case "date":
      return (
        <input
          type="date"
          min={MIN_INPUT_DATE}
          max={MAX_INPUT_DATE}
          value={toDateInput(value as never)}
          onChange={(e) => setField(field.key, fromDateInput(e.target.value))}
        />
      );
    case "email":
      return (
        <input
          required={field.required}
          type="email"
          value={(value as string) ?? ""}
          onChange={(e) => setField(field.key, e.target.value)}
        />
      );
    default:
      return (
        <input
          required={field.required}
          value={(value as string) ?? ""}
          onChange={(e) => setField(field.key, e.target.value)}
        />
      );
  }
}

export default function ResourcePage<T extends { id: string }, TInput extends object>({
  schema,
}: ResourcePageProps<T, TInput>) {
  const crud = useResourceCrud(schema);
  const inlineFields = schema.fields.filter((f) => !f.fullWidth);
  const fullWidthFields = schema.fields.filter((f) => f.fullWidth);

  return (
    <div className="resource_page">
      <div className="resource_page__header">
        <h1>{schema.pageTitle}</h1>
        <Button variant="primary" onClick={crud.openCreateForm}>
          + {schema.newLabel}
        </Button>
      </div>

      {schema.summary && (
        <div
          className={`resource_page__summary resource_page__summary--${
            schema.summary.tone?.(crud.summaryValue) ?? "default"
          }`}
        >
          <span>{schema.summary.label}</span>
          <strong>{crud.summaryValue}</strong>
        </div>
      )}

      {schema.filterOptions && (
        <div className="resource_page__filters">
          <select value={crud.statusFilter} onChange={(e) => crud.setStatusFilter(e.target.value)}>
            <option value="all">Todos os status</option>
            {schema.filterOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {(crud.loadError || crud.pageError) && (
        <p className="resource_page__error">{crud.loadError ?? crud.pageError}</p>
      )}

      {crud.loading ? (
        <p className="resource_page__empty">{schema.loadingMessage}</p>
      ) : crud.items.length === 0 ? (
        <p className="resource_page__empty">{schema.emptyMessage}</p>
      ) : (
        <div className="resource_page__table_wrap">
          <table className="resource_page__table">
            <thead>
              <tr>
                {schema.columns.map((column) => (
                  <th key={column.key}>{column.label}</th>
                ))}
                <th />
              </tr>
            </thead>
            <tbody>
              {crud.items.map((item) => (
                <tr key={item.id}>
                  {schema.columns.map((column) => (
                    <td key={column.key}>{column.render(item)}</td>
                  ))}
                  <td>
                    <div className="resource_page__table__actions">
                      <Button variant="secondary" onClick={() => crud.openEditForm(item)}>
                        Editar
                      </Button>
                      <Button variant="danger" onClick={() => crud.setItemToDelete(item)}>
                        Excluir
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination
        currentPage={crud.currentPage}
        totalPages={crud.totalPages}
        onPageChange={crud.setCurrentPage}
      />

      <Modal
        isOpen={crud.isFormOpen}
        onClose={crud.closeForm}
        title={crud.editingId ? `Editar ${schema.entityLabel}` : schema.newLabel}
      >
        <form className="resource_page__form" onSubmit={crud.handleSubmit}>
          <div className="resource_page__form__grid">
            {inlineFields.map((field) => (
              <FormField key={field.key} label={field.required ? `${field.label}*` : field.label}>
                {renderField(field, crud.form, crud.setField)}
              </FormField>
            ))}
          </div>
          {fullWidthFields.map((field) => (
            <FormField key={field.key} label={field.required ? `${field.label}*` : field.label}>
              {renderField(field, crud.form, crud.setField)}
            </FormField>
          ))}
          <div className="resource_page__form__actions">
            <Button type="button" variant="secondary" onClick={crud.closeForm} disabled={crud.saving}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={crud.saving}>
              {crud.saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!crud.itemToDelete}
        title={`Excluir ${schema.entityLabel}`}
        message={crud.itemToDelete ? `Excluir "${schema.getRowLabel(crud.itemToDelete)}"?` : ""}
        confirmLabel="Excluir"
        danger
        onConfirm={crud.handleDelete}
        onCancel={() => crud.setItemToDelete(null)}
      />
    </div>
  );
}
