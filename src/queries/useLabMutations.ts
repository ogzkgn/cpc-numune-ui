import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "../lib/apiClient";
import { fetchLabs, labsQueryKey } from "./useLabsQuery";

type CreateLabInput = {
  name: string;
  city?: string;
  email: string;
};

type UpdateLabInput = {
  id: number;
  changes: {
    name?: string;
    city?: string;
    email?: string;
  };
};

export const useCreateLabMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateLabInput) =>
      apiFetch("/labs", {
        method: "POST",
        body: {
          name: input.name,
          city: input.city,
          email: input.email
        }
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: labsQueryKey });
      queryClient.prefetchQuery({ queryKey: labsQueryKey, queryFn: fetchLabs }).catch(() => {});
    }
  });
};

export const useUpdateLabMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateLabInput) =>
      apiFetch(`/labs/${input.id}`, {
        method: "PUT",
        body: {
          name: input.changes.name,
          city: input.changes.city,
          email: input.changes.email
        }
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: labsQueryKey });
      queryClient.prefetchQuery({ queryKey: labsQueryKey, queryFn: fetchLabs }).catch(() => {});
    }
  });
};

export const useDeleteLabMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/labs/${id}`, {
        method: "DELETE"
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: labsQueryKey });
      queryClient.prefetchQuery({ queryKey: labsQueryKey, queryFn: fetchLabs }).catch(() => {});
    }
  });
};
