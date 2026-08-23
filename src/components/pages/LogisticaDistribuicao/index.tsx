import { FormEvent, useEffect, useMemo, useState } from "react";
import { Timestamp, orderBy, where } from "firebase/firestore";
import { useAuth } from "../../../contexts/auth";
import { useToast } from "../../common/Toast";
import Modal from "../../common/Modal";
import ConfirmDialog from "../../common/ConfirmDialog";
import Button from "../../common/Button";
import Badge from "../../common/Badge";
import FormField from "../../common/FormField";
import Pagination from "../../common/Pagination";
import { usePaginatedCollection } from "../../../hooks/usePaginatedCollection";
import {
  createShipment,
  deleteShipment,
  getInTransitShipmentsCount,
  mapShipment,
  updateShipment,
} from "../../../services/estoques-logistica/shipments";
import { IShipment, ShipmentInput, ShipmentStatus } from "../../../types/shipment";
import "./styles.scss";

const STATUS_LABEL: Record<ShipmentStatus, string> = {
  preparando: "Preparando",
  em_transito: "Em trânsito",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

const STATUS_TONE: Record<ShipmentStatus, "neutral" | "warning" | "success" | "danger"> = {
  preparando: "neutral",
  em_transito: "warning",
  entregue: "success",
  cancelado: "danger",
};

const EMPTY_FORM: ShipmentInput = {
  description: "",
  destination: "",
  carrier: "",
  trackingCode: "",
  status: "preparando",
  shipDate: null,
  notes: "",
};

const toDateInput = (value: Timestamp | null) =>
  value ? value.toDate().toISOString().slice(0, 10) : "";

const fromDateInput = (value: string): Timestamp | null =>
  value ? Timestamp.fromDate(new Date(`${value}T00:00:00`)) : null;

const PAGE_SIZE = 10;

export default function LogisticaDistribuicao() {
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [inTransitCount, setInTransitCount] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<ShipmentStatus | "all">("all");

  const constraints = useMemo(
    () =>
      statusFilter === "all"
        ? [orderBy("shipDate", "asc")]
        : [where("status", "==", statusFilter), orderBy("shipDate", "asc")],
    [statusFilter]
  );

  const {
    items: shipments,
    currentPage,
    totalPages,
    setCurrentPage,
    loading,
    error: pageError,
    refresh,
  } = usePaginatedCollection({
    collectionPath: "shipments",
    constraints,
    mapDoc: mapShipment,
    pageSize: PAGE_SIZE,
    resetKey: statusFilter,
  });

  const refreshInTransitCount = () => {
    getInTransitShipmentsCount()
      .then(setInTransitCount)
      .catch((err) => setLoadError(err.message));
  };

  useEffect(() => {
    refreshInTransitCount();
  }, []);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ShipmentInput>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [shipmentToDelete, setShipmentToDelete] = useState<IShipment | null>(null);

  const openCreateForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setIsFormOpen(true);
  };

  const openEditForm = (shipment: IShipment) => {
    setEditingId(shipment.id);
    setForm({
      description: shipment.description,
      destination: shipment.destination,
      carrier: shipment.carrier,
      trackingCode: shipment.trackingCode,
      status: shipment.status,
      shipDate: shipment.shipDate,
      notes: shipment.notes,
    });
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!currentUser) return;

    setSaving(true);
    try {
      if (editingId) {
        await updateShipment(editingId, form);
        showToast("Envio atualizado com sucesso.", "success");
      } else {
        await createShipment(form, {
          uid: currentUser.uid,
          name: currentUser.displayName ?? currentUser.email,
        });
        showToast("Envio criado com sucesso.", "success");
      }
      refresh();
      refreshInTransitCount();
      closeForm();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Erro ao salvar envio",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!shipmentToDelete) return;
    try {
      await deleteShipment(shipmentToDelete.id);
      showToast("Envio excluído.", "success");
      refresh();
      refreshInTransitCount();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Erro ao excluir envio",
        "error"
      );
    } finally {
      setShipmentToDelete(null);
    }
  };

  return (
    <div className="shipments_page">
      <div className="shipments_page__header">
        <h1>Logística e Distribuição</h1>
        <Button variant="primary" onClick={openCreateForm}>
          + Novo envio
        </Button>
      </div>

      <div className="shipments_page__summary">
        <span>Em trânsito</span>
        <strong>{inTransitCount}</strong>
      </div>

      <div className="shipments_page__filters">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ShipmentStatus | "all")}
        >
          <option value="all">Todos os status</option>
          <option value="preparando">Preparando</option>
          <option value="em_transito">Em trânsito</option>
          <option value="entregue">Entregue</option>
          <option value="cancelado">Cancelado</option>
        </select>
      </div>

      {(loadError || pageError) && (
        <p className="shipments_page__error">{loadError ?? pageError}</p>
      )}

      {loading ? (
        <p className="shipments_page__empty">Carregando envios...</p>
      ) : shipments.length === 0 ? (
        <p className="shipments_page__empty">Nenhum envio encontrado.</p>
      ) : (
        <div className="shipments_page__table_wrap">
          <table className="shipments_page__table">
            <thead>
              <tr>
                <th>Descrição</th>
                <th>Destino</th>
                <th>Transportadora</th>
                <th>Envio</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {shipments.map((shipment) => (
                <tr key={shipment.id}>
                  <td>{shipment.description}</td>
                  <td>{shipment.destination}</td>
                  <td>{shipment.carrier || "—"}</td>
                  <td>{toDateInput(shipment.shipDate) || "—"}</td>
                  <td>
                    <Badge tone={STATUS_TONE[shipment.status]}>
                      {STATUS_LABEL[shipment.status]}
                    </Badge>
                  </td>
                  <td>
                    <div className="shipments_page__table__actions">
                      <Button variant="secondary" onClick={() => openEditForm(shipment)}>
                        Editar
                      </Button>
                      <Button variant="danger" onClick={() => setShipmentToDelete(shipment)}>
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
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />

      <Modal
        isOpen={isFormOpen}
        onClose={closeForm}
        title={editingId ? "Editar envio" : "Novo envio"}
      >
        <form className="shipments_page__form" onSubmit={handleSubmit}>
          <div className="shipments_page__form__grid">
            <FormField label="Descrição*">
              <input
                required
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </FormField>
            <FormField label="Destino*">
              <input
                required
                value={form.destination}
                onChange={(e) => setForm({ ...form, destination: e.target.value })}
              />
            </FormField>
            <FormField label="Transportadora">
              <input
                value={form.carrier}
                onChange={(e) => setForm({ ...form, carrier: e.target.value })}
              />
            </FormField>
            <FormField label="Código de rastreio">
              <input
                value={form.trackingCode}
                onChange={(e) => setForm({ ...form, trackingCode: e.target.value })}
              />
            </FormField>
            <FormField label="Data de envio">
              <input
                type="date"
                value={toDateInput(form.shipDate)}
                onChange={(e) =>
                  setForm({ ...form, shipDate: fromDateInput(e.target.value) })
                }
              />
            </FormField>
            <FormField label="Status">
              <select
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value as ShipmentStatus })
                }
              >
                <option value="preparando">Preparando</option>
                <option value="em_transito">Em trânsito</option>
                <option value="entregue">Entregue</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </FormField>
          </div>
          <FormField label="Observações">
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </FormField>
          <div className="shipments_page__form__actions">
            <Button type="button" variant="secondary" onClick={closeForm} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!shipmentToDelete}
        title="Excluir envio"
        message={`Excluir "${shipmentToDelete?.description}"?`}
        confirmLabel="Excluir"
        danger
        onConfirm={handleDelete}
        onCancel={() => setShipmentToDelete(null)}
      />
    </div>
  );
}
