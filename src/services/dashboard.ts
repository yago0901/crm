import {
  collection,
  count,
  getAggregateFromServer,
  query,
  sum,
  where,
} from "firebase/firestore";
import { firestore } from "./firebase";

export interface IDashboardStats {
  leadsCount: number;
  clientesCount: number;
  contratosAtivosCount: number;
  valorContratosAtivos: number;
}

export async function getDashboardStats(): Promise<IDashboardStats> {
  const contactsRef = collection(firestore, "contacts");
  const contractsRef = collection(firestore, "contracts");

  const [leadsSnap, clientesSnap, contratosSnap] = await Promise.all([
    getAggregateFromServer(query(contactsRef, where("status", "==", "lead")), {
      total: count(),
    }),
    getAggregateFromServer(query(contactsRef, where("status", "==", "cliente")), {
      total: count(),
    }),
    getAggregateFromServer(query(contractsRef, where("status", "==", "ativo")), {
      total: count(),
      valor: sum("value"),
    }),
  ]);

  return {
    leadsCount: leadsSnap.data().total,
    clientesCount: clientesSnap.data().total,
    contratosAtivosCount: contratosSnap.data().total,
    valorContratosAtivos: contratosSnap.data().valor,
  };
}
