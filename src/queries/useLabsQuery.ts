import { useQuery } from "@tanstack/react-query";

import { apiFetch } from "../lib/apiClient";
import type { Lab } from "../types";

const mapApiLab = (row: any): Lab => ({
  id: Number(row.id),
  name: row.name,
  city: row.city ?? undefined,
  email: row.email ?? ""
});

export const labsQueryKey = ["labs"];

export const fetchLabs = async () => {
  const data = await apiFetch<any[]>("/labs");
  return data.map(mapApiLab);
};

export const useLabsQuery = () =>
  useQuery<Lab[]>({
    queryKey: labsQueryKey,
    queryFn: fetchLabs,
    staleTime: 5 * 60 * 1000
  });
