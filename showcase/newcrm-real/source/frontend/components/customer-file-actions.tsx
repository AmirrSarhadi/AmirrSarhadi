"use client";
import { useEffect, useRef, useState } from "react";
import { Download, Upload, Printer } from "lucide-react";
import { customerFileRequest, downloadBlob } from "../lib/customer-files";
import { ActionButton, Feedback } from "./account-ui";
import type { Kind } from "../lib/customers";
export function CustomerFileActions({
  kind,
  organizationId,
  userId,
  query,
  canExport,
  canImport,
  onImport,
  disabled,
}: {
  kind: Kind | "products" | "sales/orders" | "leads" | "activities";
  organizationId: string;
  userId: number;
  query: string;
  canExport: boolean;
  canImport: boolean;
  onImport: () => void;
  disabled: boolean;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const controller = useRef<AbortController | null>(null);
  useEffect(
    () => () => controller.current?.abort(),
    [kind, query, organizationId, userId],
  );
  async function exportFile(type: "csv" | "xlsx") {
    if (busy) return;
    setBusy(true);
    setError("");
    const ctrl = new AbortController();
    controller.current = ctrl;
    try {
      const response = await customerFileRequest(
        `${kind}/export/?${query}&file_type=${type}`,
        organizationId,
        userId,
        { signal: ctrl.signal },
      );
      const blob = await response.blob();
      if (!ctrl.signal.aborted)
        downloadBlob(blob, `newcrm-${kind.replaceAll("/", "-")}.${type}`);
    } catch (e) {
      if (!ctrl.signal.aborted)
        setError(e instanceof Error ? e.message : "خروجی دریافت نشد.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="customer-file-actions">
      <div className="session-actions">
        {canExport && (
          <>
            <ActionButton
              className="secondary"
              disabled={disabled || busy}
              onClick={() => void exportFile("xlsx")}
            >
              <Download size={15} aria-hidden="true" />
              Excel
            </ActionButton>
            <ActionButton
              className="secondary"
              disabled={disabled || busy}
              onClick={() => void exportFile("csv")}
            >
              <Download size={15} aria-hidden="true" />
              خروجی CSV
            </ActionButton>
          </>
        )}
        {canImport && (
          <ActionButton
            className="secondary"
            disabled={disabled || busy}
            onClick={onImport}
          >
            <Upload size={15} aria-hidden="true" />
            ورود Excel / CSV
          </ActionButton>
        )}
        <ActionButton
          className="secondary"
          disabled={disabled || busy}
          onClick={() => window.print()}
        >
          <Printer size={15} aria-hidden="true" />
          چاپ
        </ActionButton>
      </div>
      <Feedback message={error} />
    </div>
  );
}
