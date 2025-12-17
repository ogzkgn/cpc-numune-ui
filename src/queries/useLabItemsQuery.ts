import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "../lib/apiClient";
import { mapApiTripItem } from "./useTripsQuery";
import type { LabForm, LabFormDocument, TripItem } from "../types";

const mapApiLabForm = (row: any): LabForm => {
  const normalizeDocument = (doc: any): LabFormDocument => {
    const baseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
    const rawUrl = doc.url ?? doc.downloadUrl ?? undefined;
    const fullUrl = typeof rawUrl === "string" && rawUrl.startsWith("/") ? `${baseUrl}${rawUrl}` : rawUrl;
    return {
      id: doc.id ?? doc.filename ?? crypto.randomUUID(),
      name: doc.name ?? doc.filename ?? "document",
      size: Number(doc.size ?? 0),
      type: doc.type ?? doc.mimetype,
      uploadedAt: doc.uploadedAt ?? new Date().toISOString(),
      url: fullUrl,
      dataUrl: doc.dataUrl
    };
  };

  return {
    id: Number(row.id),
    tripItemId: Number(row.trip_item_id ?? row.tripItemId),
    status: row.status,
    standardNo: row.standard_no ?? row.standardNo,
    data: row.data ?? {},
    labNotes: row.lab_notes ?? row.labNotes,
    cpcNotes: row.cpc_notes ?? row.cpcNotes,
    documents: Array.isArray(row.documents) ? row.documents.map(normalizeDocument) : undefined,
    updatedAt: row.updated_at ?? row.updatedAt ?? undefined
  };
};

export const labItemsQueryKey = (status?: string, roleKey = "any") => ["lab-items", status ?? "all", roleKey];

export const fetchLabItems = async (status?: string) => {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  const data = await apiFetch<{ tripItems: any[]; labForms: any[] }>(`/lab-items${query}`);
  const tripItems: TripItem[] = Array.isArray(data?.tripItems) ? data.tripItems.map((row) => mapApiTripItem(row)) : [];
  const labForms: LabForm[] = Array.isArray(data?.labForms) ? data.labForms.map((row) => mapApiLabForm(row)) : [];
  return { tripItems, labForms };
};

export const useLabItemsQuery = (status?: string, roleKey = "any") =>
  useQuery({
    queryKey: labItemsQueryKey(status, roleKey),
    queryFn: () => fetchLabItems(status),
    staleTime: 30_000
  });

type UpsertLabFormInput = {
  tripItemId: number;
  standardNo?: string;
  data: Record<string, unknown>;
  status: LabForm["status"];
  labNotes?: string;
  cpcNotes?: string;
  documents?: LabFormDocument[];
};

export const useUpsertLabFormMutation = (status?: string, roleKey = "any") => {
  const queryClient = useQueryClient();

  const dataUrlToBlob = (value: string, fallbackType?: string) => {
    const [meta, payload] = value.split(",");
    const mimeMatch = meta.match(/data:(.*?);/);
    const mime = mimeMatch?.[1] ?? fallbackType ?? "application/octet-stream";
    const binary = atob(payload ?? "");
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i += 1) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  };

  return useMutation({
    mutationFn: async ({ tripItemId, standardNo, data, status: nextStatus, labNotes, cpcNotes, documents }: UpsertLabFormInput) => {
      const hasFiles = documents?.some((doc) => Boolean(doc.dataUrl) || Boolean((doc as any).file));
      if (hasFiles) {
        const formData = new FormData();
        formData.append("status", nextStatus);
        if (standardNo) formData.append("standard_no", standardNo);
        formData.append("data", JSON.stringify(data ?? {}));
        if (labNotes) formData.append("lab_notes", labNotes);
        if (cpcNotes) formData.append("cpc_notes", cpcNotes);

        const existingDocs: LabFormDocument[] = [];
        (documents ?? []).forEach((doc) => {
          const maybeFile = (doc as any).file as File | undefined;
          if (maybeFile) {
            formData.append("files", maybeFile, maybeFile.name);
          } else if (doc.dataUrl) {
            const blob = dataUrlToBlob(doc.dataUrl, doc.type);
            formData.append("files", blob, doc.name || doc.id || "document");
          } else {
            existingDocs.push(doc);
          }
        });

        formData.append("documents", JSON.stringify(existingDocs));

        const response = await fetch(`${import.meta.env.VITE_API_URL ?? "http://localhost:4000"}/lab-forms/${tripItemId}/upload`, {
          method: "POST",
          body: formData,
          credentials: "include"
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return mapApiLabForm(await response.json());
      }

      const response = await apiFetch(`/lab-forms/${tripItemId}`, {
        method: "PUT",
        body: {
          status: nextStatus,
          standard_no: standardNo,
          data,
          lab_notes: labNotes,
          cpc_notes: cpcNotes,
          documents: documents?.map((doc) => ({ ...doc }))
        }
      });
      return mapApiLabForm(response);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["lab-items"] });
      await queryClient.invalidateQueries({ queryKey: labItemsQueryKey(status, roleKey) });
    }
  });
};
