import { useQuery } from "@tanstack/react-query";

import { apiFetch } from "../lib/apiClient";
import type { Product } from "../types";

const mapApiProduct = (row: any): Product => ({
  id: row.id,
  name: row.name,
  productType: row.product_type ?? row.productType,
  requiresSampling: row.requires_sampling ?? row.requiresSampling,
  samplingIntervalMonths: row.sampling_interval_months ?? row.samplingIntervalMonths,
  labReturnDays: row.lab_return_days ?? row.labReturnDays,
  standardNo: row.standard_no ?? row.standardNo,
  isCustom: row.isCustom ?? true,
  groupName: row.groupName ?? row.group_name
});

export const productsQueryKey = ["products"];

export const fetchProducts = async () => {
  const data = await apiFetch<any[]>("/products");
  return data.map(mapApiProduct);
};

export const useProductsQuery = (enabled = true) =>
  useQuery<Product[]>({
    queryKey: productsQueryKey,
    queryFn: fetchProducts,
    staleTime: 5 * 60 * 1000,
    enabled
  });
