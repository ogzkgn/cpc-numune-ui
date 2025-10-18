import { useId, type ChangeEvent } from "react";

import type { LabFormDocument } from "../../../types";
import type { LabFieldConfig } from "../labConstants";

type LabFormDetailsProps = {
  className?: string;
  fieldConfig: LabFieldConfig[];
  fieldValues: Record<string, string>;
  onFieldChange?: (key: string, value: string) => void;
  fieldsDisabled?: boolean;
  documents?: LabFormDocument[];
  onDocumentAdd?: (files: File[]) => void;
  onDocumentRemove?: (documentId: string) => void;
  documentActionsDisabled?: boolean;
  labNote: string;
  onLabNoteChange?: (value: string) => void;
  labNoteDisabled?: boolean;
  labNotePlaceholder?: string;
  cpcNote: string;
  onCpcNoteChange?: (value: string) => void;
  cpcNoteDisabled?: boolean;
  cpcNotePlaceholder?: string;
};

const formatFileSize = (bytes: number) => {
  if (!Number.isFinite(bytes)) return "-";
  if (bytes >= 1_000_000) {
    return `${(bytes / 1_000_000).toFixed(1)} MB`;
  }
  if (bytes >= 1_000) {
    return `${Math.round(bytes / 1_000)} KB`;
  }
  return `${bytes} B`;
};

const formatDateTime = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("tr-TR");
};

const LabFormDetails = ({
  className,
  fieldConfig,
  fieldValues,
  onFieldChange,
  fieldsDisabled = false,
  documents = [],
  onDocumentAdd,
  onDocumentRemove,
  documentActionsDisabled = false,
  labNote,
  onLabNoteChange,
  labNoteDisabled = false,
  labNotePlaceholder,
  cpcNote,
  onCpcNoteChange,
  cpcNoteDisabled = false,
  cpcNotePlaceholder
}: LabFormDetailsProps) => {
  const containerClassName = ["space-y-4", className].filter(Boolean).join(" ");
  const documentInputId = useId();

  const handleDocumentChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (!onDocumentAdd) return;
    const fileList = event.target.files;
    if (!fileList || fileList.length === 0) {
      return;
    }
    onDocumentAdd(Array.from(fileList));
    event.target.value = "";
  };

  return (
    <div className={containerClassName}>
      {fieldConfig.map((field) => (
        <label key={field.key} className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          {field.label}
          <input
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            type={field.isDate ? "date" : "text"}
            value={fieldValues[field.key] ?? ""}
            onChange={
              onFieldChange
                ? (event) => onFieldChange(field.key, event.target.value)
                : undefined
            }
            disabled={fieldsDisabled}
          />
        </label>
      ))}

      <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Dokümanlar
          </span>
          {onDocumentAdd && !documentActionsDisabled ? (
            <label
              htmlFor={documentInputId}
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-primary-200 bg-white px-3 py-1.5 text-xs font-medium text-primary-600 transition hover:bg-primary-50"
            >
              Dosya ekle
              <input
                id={documentInputId}
                type="file"
                multiple
                className="sr-only"
                onChange={handleDocumentChange}
              />
            </label>
          ) : null}
        </div>
        <div className="space-y-2">
          {documents.length > 0 ? (
            documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium text-slate-700">{doc.name}</p>
                  <p className="text-xs text-slate-500">
                    {formatFileSize(doc.size)}
                    {doc.uploadedAt ? ` • ${formatDateTime(doc.uploadedAt)}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {doc.dataUrl || doc.url ? (
                    <a
                      className="text-xs font-medium text-primary-600 hover:underline"
                      href={doc.dataUrl ?? doc.url}
                      download={doc.name}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      İndir
                    </a>
                  ) : null}
                  {onDocumentRemove && !documentActionsDisabled ? (
                    <button
                      type="button"
                      className="text-xs font-medium text-rose-600 hover:underline"
                      onClick={() => onDocumentRemove(doc.id)}
                    >
                      Kaldır
                    </button>
                  ) : null}
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500">Doküman eklenmedi.</p>
          )}
        </div>
      </div>

      <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
        Laboratuvar Notu
        <textarea
          className="min-h-[96px] rounded-lg border border-slate-300 px-3 py-2 text-sm"
          value={labNote}
          onChange={onLabNoteChange ? (event) => onLabNoteChange(event.target.value) : undefined}
          disabled={labNoteDisabled}
          placeholder={labNotePlaceholder}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
        CPC Notu
        <textarea
          className="min-h-[96px] rounded-lg border border-slate-300 px-3 py-2 text-sm"
          value={cpcNote}
          onChange={onCpcNoteChange ? (event) => onCpcNoteChange(event.target.value) : undefined}
          disabled={cpcNoteDisabled}
          placeholder={cpcNotePlaceholder}
        />
      </label>
    </div>
  );
};

export default LabFormDetails;
