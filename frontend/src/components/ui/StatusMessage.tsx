
import type { ReactNode } from "react";
import "./statusMessage.css";

type StatusMessageProps = {
  type: "error" | "success" | "info";
  message: string;
  action?: ReactNode;
};

export default function StatusMessage({
  type,
  message,
  action,
}: StatusMessageProps) {
  return (
    <div
      className={`status-message status-message--${type}`}
      role={type === "error" ? "alert" : "status"}
      aria-live={type === "error" ? "assertive" : "polite"}
    >
      <p>{message}</p>
      {action && <div className="status-message__action">{action}</div>}
    </div>
  );
}
