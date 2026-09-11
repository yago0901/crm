import { FormEvent, useEffect, useMemo, useState } from "react";
import { orderBy, where } from "firebase/firestore";
import { useAuth } from "../contexts/auth/AuthContext";
import { useToast } from "../components/common/Toast/ToastContext";
import { PAGE_SIZE } from "../constants/pagination";
import { ResourceSchema } from "../components/common/ResourcePage/types";
import { usePaginatedCollection } from "./usePaginatedCollection";

export function useResourceCrud<T extends { id: string }, TInput extends object>(
  schema: ResourceSchema<T, TInput>
) {
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const filterField = schema.filterField ?? "status";
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [summaryValue, setSummaryValue] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);

  const constraints = useMemo(() => {
    const order = orderBy(schema.orderByField ?? "createdAt", schema.orderDirection ?? "desc");
    return statusFilter === "all" ? [order] : [where(filterField, "==", statusFilter), order];
  }, [statusFilter, filterField, schema.orderByField, schema.orderDirection]);

  const {
    items,
    currentPage,
    totalPages,
    setCurrentPage,
    loading,
    error: pageError,
    refresh,
  } = usePaginatedCollection<T>({
    collectionPath: schema.collectionPath,
    constraints,
    mapDoc: schema.mapDoc,
    pageSize: PAGE_SIZE,
    resetKey: statusFilter,
  });

  const refreshSummary = () => {
    if (!schema.summary) return;
    schema.summary
      .fetch()
      .then(setSummaryValue)
      .catch((err) => setLoadError(err instanceof Error ? err.message : String(err)));
  };

  useEffect(() => {
    refreshSummary();
    // only on mount — refreshSummary is re-triggered explicitly after writes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TInput>(schema.emptyForm);
  const [saving, setSaving] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<T | null>(null);

  const openCreateForm = () => {
    setEditingId(null);
    setForm(schema.emptyForm);
    setIsFormOpen(true);
  };

  const openEditForm = (item: T) => {
    setEditingId(item.id);
    setForm(schema.toInput(item));
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
    setForm(schema.emptyForm);
  };

  const setField = (key: keyof TInput & string, value: unknown) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!currentUser) return;

    setSaving(true);
    try {
      if (editingId) {
        await schema.update(editingId, form);
        showToast(schema.messages.updated, "success");
      } else {
        await schema.create(form, {
          uid: currentUser.uid,
          name: currentUser.displayName ?? currentUser.email,
        });
        showToast(schema.messages.created, "success");
      }
      refresh();
      refreshSummary();
      closeForm();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : `Erro ao salvar ${schema.entityLabel}`,
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    try {
      await schema.remove(itemToDelete.id);
      showToast(schema.messages.deleted, "success");
      refresh();
      refreshSummary();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : `Erro ao excluir ${schema.entityLabel}`,
        "error"
      );
    } finally {
      setItemToDelete(null);
    }
  };

  return {
    items,
    currentPage,
    totalPages,
    setCurrentPage,
    loading,
    pageError,
    loadError,
    statusFilter,
    setStatusFilter,
    summaryValue,
    isFormOpen,
    editingId,
    form,
    setField,
    saving,
    openCreateForm,
    openEditForm,
    closeForm,
    handleSubmit,
    itemToDelete,
    setItemToDelete,
    handleDelete,
  };
}
