import { ReactNode } from "react";
import "./styles.scss";

interface ChartCardProps {
  title: string;
  children: ReactNode;
}

export default function ChartCard({ title, children }: ChartCardProps) {
  return (
    <div className="chart_card">
      <h3>{title}</h3>
      <div className="chart_card__body">{children}</div>
    </div>
  );
}
