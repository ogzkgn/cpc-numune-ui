import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "../lib/apiClient";
import { employeesQueryKey, fetchEmployees } from "./useEmployeesQuery";

type CreateEmployeeInput = {
  name: string;
  city?: string;
  status?: string;
  skills?: string[];
};

type UpdateEmployeeInput = {
  id: number;
  changes: {
    name?: string;
    city?: string;
    status?: string;
    skills?: string[];
  };
};

export const useCreateEmployeeMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateEmployeeInput) =>
      apiFetch("/employees", {
        method: "POST",
        body: {
          name: input.name,
          city: input.city,
          status: input.status ?? "available",
          skills: input.skills ?? []
        }
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: employeesQueryKey });
      // Ensure cache repopulates if empty
      queryClient.prefetchQuery({ queryKey: employeesQueryKey, queryFn: fetchEmployees }).catch(() => {});
    }
  });
};

export const useUpdateEmployeeMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateEmployeeInput) =>
      apiFetch(`/employees/${input.id}`, {
        method: "PUT",
        body: {
          name: input.changes.name,
          city: input.changes.city,
          status: input.changes.status ?? "available",
          skills: input.changes.skills ?? []
        }
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: employeesQueryKey });
      queryClient.prefetchQuery({ queryKey: employeesQueryKey, queryFn: fetchEmployees }).catch(() => {});
    }
  });
};

export const useDeleteEmployeeMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/employees/${id}`, {
        method: "DELETE"
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: employeesQueryKey });
      queryClient.prefetchQuery({ queryKey: employeesQueryKey, queryFn: fetchEmployees }).catch(() => {});
    }
  });
};
