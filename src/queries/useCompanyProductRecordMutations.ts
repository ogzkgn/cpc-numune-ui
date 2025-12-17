import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "../lib/apiClient";
import { companyProductRecordsQueryKey, fetchCompanyProductRecords } from "./useCompanyProductRecordsQuery";

type BaseInput = {
  companyName?: string;
  productName?: string;
  productType?: string;
  productId?: number;
  btCode?: string;
  code?: string;
  productCode?: string;
  location?: string;
  certificateDate?: string;
  lastSampleDate?: string;
  lastInspectionDate?: string;
  paymentStatus?: string;
  requiresSampling?: boolean;
  samplingIntervalMonths?: number;
  labReturnDays?: number;
  standard?: string;
  status?: string;
};

export const useCreateCompanyProductRecordMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: BaseInput) =>
      apiFetch("/company-products", {
        method: "POST",
        body: {
          company_name: input.companyName,
          product_name: input.productName,
          product_type: input.productType,
          product_id: input.productId,
          bt_code: input.btCode,
          code: input.code,
          product_code: input.productCode,
          location: input.location,
          certificate_date: input.certificateDate,
          last_sample_date: input.lastSampleDate,
          last_inspection_date: input.lastInspectionDate,
          payment_status: input.paymentStatus,
          requires_sampling: input.requiresSampling ?? false,
          sampling_interval_months: input.samplingIntervalMonths,
          lab_return_days: input.labReturnDays,
          standard_no: input.standard,
          status: input.status ?? "devam"
        }
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: companyProductRecordsQueryKey });
      queryClient
        .prefetchQuery({ queryKey: companyProductRecordsQueryKey, queryFn: fetchCompanyProductRecords })
        .catch(() => {});
    }
  });
};

export const useUpdateCompanyProductRecordMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: BaseInput & { id: number }) =>
      apiFetch(`/company-products/${input.id}`, {
        method: "PUT",
        body: {
          company_name: input.companyName,
          product_name: input.productName,
          product_type: input.productType,
          product_id: input.productId,
          bt_code: input.btCode,
          code: input.code,
          product_code: input.productCode,
          location: input.location,
          certificate_date: input.certificateDate,
          last_sample_date: input.lastSampleDate,
          last_inspection_date: input.lastInspectionDate,
          payment_status: input.paymentStatus,
          requires_sampling: input.requiresSampling ?? false,
          sampling_interval_months: input.samplingIntervalMonths,
          lab_return_days: input.labReturnDays,
          standard_no: input.standard,
          status: input.status ?? "devam"
        }
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: companyProductRecordsQueryKey });
      queryClient
        .prefetchQuery({ queryKey: companyProductRecordsQueryKey, queryFn: fetchCompanyProductRecords })
        .catch(() => {});
    }
  });
};

export const useDeleteCompanyProductRecordMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: number }) =>
      apiFetch(`/company-products/${input.id}`, {
        method: "DELETE"
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: companyProductRecordsQueryKey });
      queryClient
        .prefetchQuery({ queryKey: companyProductRecordsQueryKey, queryFn: fetchCompanyProductRecords })
        .catch(() => {});
    }
  });
};
