import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "../lib/apiClient";
import { productsQueryKey, fetchProducts } from "./useProductsQuery";

type CreateProductInput = {
  name: string;
  productType: string;
  requiresSampling?: boolean;
  samplingIntervalMonths?: number;
  labReturnDays?: number;
  standardNo?: string;
};

export const useCreateProductMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateProductInput) =>
      apiFetch("/products", {
        method: "POST",
        body: {
          name: input.name,
          product_type: input.productType,
          requires_sampling: input.requiresSampling ?? false,
          sampling_interval_months: input.samplingIntervalMonths,
          lab_return_days: input.labReturnDays,
          standard_no: input.standardNo
        }
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: productsQueryKey });
      queryClient.prefetchQuery({ queryKey: productsQueryKey, queryFn: fetchProducts }).catch(() => {});
    }
  });
};

export const useDeleteProductMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/products/${id}`, {
        method: "DELETE"
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: productsQueryKey });
      queryClient.prefetchQuery({ queryKey: productsQueryKey, queryFn: fetchProducts }).catch(() => {});
    }
  });
};
