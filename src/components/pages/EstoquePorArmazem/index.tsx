import { useEffect, useMemo, useState } from "react";
import { orderBy, where } from "firebase/firestore";
import Pagination from "../../common/Pagination";
import { usePaginatedCollection } from "../../../hooks/usePaginatedCollection";
import { fetchActiveWarehouses } from "../../../services/estoques-logistica/warehouses";
import { mapWarehouseStock } from "../../../services/estoques-logistica/warehouseStock";
import { IWarehouse } from "../../../types/warehouse";
import { PAGE_SIZE } from "../../../constants/pagination";
import "./styles.scss";

export default function EstoquePorArmazem() {
  const [warehouses, setWarehouses] = useState<IWarehouse[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    fetchActiveWarehouses()
      .then((items) => {
        setWarehouses(items);
        if (items.length > 0) setSelectedWarehouseId(items[0].id);
      })
      .catch((err) => setLoadError(err.message));
  }, []);

  const constraints = useMemo(
    () => [where("warehouseId", "==", selectedWarehouseId), orderBy("itemName", "asc")],
    [selectedWarehouseId]
  );

  const {
    items: stock,
    currentPage,
    totalPages,
    setCurrentPage,
    loading,
    error: pageError,
  } = usePaginatedCollection({
    collectionPath: "warehouseStock",
    constraints,
    mapDoc: mapWarehouseStock,
    pageSize: PAGE_SIZE,
    resetKey: selectedWarehouseId,
  });

  return (
    <div className="warehouse_stock_page">
      <div className="warehouse_stock_page__header">
        <h1>Estoque por Armazém</h1>
      </div>

      {loadError && <p className="warehouse_stock_page__error">{loadError}</p>}

      {warehouses.length === 0 ? (
        <p className="warehouse_stock_page__empty">
          Nenhum armazém ativo cadastrado. Cadastre em Estoques e Logística → Gestão de
          Armazéns primeiro.
        </p>
      ) : (
        <>
          <div className="warehouse_stock_page__filters">
            <select
              value={selectedWarehouseId}
              onChange={(e) => setSelectedWarehouseId(e.target.value)}
            >
              {warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.name}
                </option>
              ))}
            </select>
          </div>

          {pageError && <p className="warehouse_stock_page__error">{pageError}</p>}

          {loading ? (
            <p className="warehouse_stock_page__empty">Carregando estoque...</p>
          ) : stock.length === 0 ? (
            <p className="warehouse_stock_page__empty">
              Nenhuma movimentação vinculada a este armazém ainda. O saldo aparece aqui
              assim que uma movimentação de estoque informar este armazém.
            </p>
          ) : (
            <div className="warehouse_stock_page__table_wrap">
              <table className="warehouse_stock_page__table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Saldo neste armazém</th>
                  </tr>
                </thead>
                <tbody>
                  {stock.map((row) => (
                    <tr key={row.id}>
                      <td>{row.itemName}</td>
                      <td>{row.quantity}</td>
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
        </>
      )}
    </div>
  );
}
