import { ReactNode } from "react";
import "./styles.scss";

export type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info" | "primary";

interface BadgeProps {
  tone: BadgeTone;
  children: ReactNode;
}

export default function Badge({ tone, children }: BadgeProps) {
  return <span className={`badge badge--${tone}`}>{children}</span>;
}
