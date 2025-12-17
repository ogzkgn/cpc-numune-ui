import { useQuery } from "@tanstack/react-query";

import { apiFetch } from "../lib/apiClient";
import type { Employee } from "../types";

const mapApiEmployee = (row: any): Employee => ({
  id: Number(row.id),
  name: row.name,
  city: row.city ?? undefined,
  status: row.status ?? "available",
  skills: Array.isArray(row.skills) ? row.skills : []
});

export const employeesQueryKey = ["employees"];

export const fetchEmployees = async () => {
  const data = await apiFetch<any[]>("/employees");
  return data.map(mapApiEmployee);
};

export const useEmployeesQuery = (enabled = true) =>
  useQuery<Employee[]>({
    queryKey: employeesQueryKey,
    queryFn: fetchEmployees,
    staleTime: 5 * 60 * 1000,
    enabled
  });
