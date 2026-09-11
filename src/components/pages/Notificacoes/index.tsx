import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Badge from "../../common/Badge";
import Button from "../../common/Button";
import { subscribeToNotifications } from "../../../services/shared/notifications";
import { INotification, NotificationStatus } from "../../../types/notification";
import "./styles.scss";

const TYPE_LABEL: Record<string, string> = {
  estoque_baixo: "Estoque baixo",
};

const RELATED_MODULE_PATH: Record<string, string> = {
  "Estoques e Logística": "/estoques-logistica/controle-estoque",
};

const formatWhen = (notification: INotification) => {
  const ts = notification.status === "resolvido"
    ? notification.resolvedAt ?? notification.updatedAt
    : notification.createdAt;
  if (!ts) return "";
  try {
    return ts.toDate().toLocaleString("pt-BR");
  } catch {
    return "";
  }
};

export default function Notificacoes() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<NotificationStatus | "all">("aberto");
  const [notifications, setNotifications] = useState<INotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToNotifications(
      filter,
      (items) => {
        setNotifications(items);
        setLoading(false);
      },
      (err) => {
        setLoadError(err.message);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, [filter]);

  const openCount = useMemo(
    () => notifications.filter((n) => n.status === "aberto").length,
    [notifications]
  );

  return (
    <div className="notifications_page">
      <div className="notifications_page__header">
        <h1>Notificações</h1>
      </div>

      <div className="notifications_page__summary">
        <span>Abertas</span>
        <strong>{filter === "resolvido" ? "—" : openCount}</strong>
      </div>

      <div className="notifications_page__filters">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as NotificationStatus | "all")}
        >
          <option value="aberto">Abertas</option>
          <option value="resolvido">Resolvidas</option>
          <option value="all">Todas</option>
        </select>
      </div>

      {loadError && <p className="notifications_page__error">{loadError}</p>}

      {loading ? (
        <p className="notifications_page__empty">Carregando notificações...</p>
      ) : notifications.length === 0 ? (
        <p className="notifications_page__empty">Nenhuma notificação.</p>
      ) : (
        <ul className="notifications_page__list">
          {notifications.map((notification) => {
            const path = RELATED_MODULE_PATH[notification.relatedModule];
            return (
              <li key={notification.id} className="notifications_page__item">
                <div className="notifications_page__item__main">
                  <div className="notifications_page__item__title">
                    <Badge tone={notification.status === "aberto" ? "warning" : "success"}>
                      {notification.status === "aberto" ? "Aberta" : "Resolvida"}
                    </Badge>
                    <span>{TYPE_LABEL[notification.type] ?? notification.type}</span>
                    <strong>{notification.title}</strong>
                  </div>
                  <p className="notifications_page__item__message">{notification.message}</p>
                  <p className="notifications_page__item__when">{formatWhen(notification)}</p>
                </div>
                {path && (
                  <Button variant="secondary" onClick={() => navigate(path)}>
                    Abrir {notification.relatedModule}
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
