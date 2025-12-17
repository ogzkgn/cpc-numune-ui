import { useQuery } from "@tanstack/react-query";

import { apiFetch } from "../lib/apiClient";
import type { CompanyProductRecord } from "../types";

const mapApiCompanyProductRecord = (row: any): CompanyProductRecord => ({
  id: row.id !== undefined ? Number(row.id) : undefined,
  productType: row.product_type ?? row.productType,
  productCode: row.product_code ?? row.productCode,
  btCode: row.bt_code ?? row.btCode,
  code: row.code,
  companyName: row.company_name ?? row.companyName,
  location: row.location,
  lastSampleDate: row.last_sample_date ?? row.lastSampleDate,
  lastInspectionDate: row.last_inspection_date ?? row.lastInspectionDate,
  paymentStatus: row.payment_status ?? row.paymentStatus,
  certificateDate: row.certificate_date ?? row.certificateDate,
  standard: row.standard_no ?? row.standard,
  productName: row.product_name ?? row.productName,
  status: row.status ?? "devam",
  productId: row.product_id ?? row.productId,
  requiresSampling: row.requires_sampling ?? row.requiresSampling,
  samplingIntervalMonths: row.sampling_interval_months ?? row.samplingIntervalMonths,
  labReturnDays: row.lab_return_days ?? row.labReturnDays
});

export const companyProductRecordsQueryKey = ["company-product-records"];

export const fetchCompanyProductRecords = async () => {
  const data = await apiFetch<any[]>("/company-products");
  return data.map(mapApiCompanyProductRecord);
};

export const useCompanyProductRecordsQuery = () =>
  useQuery<CompanyProductRecord[]>({
    queryKey: companyProductRecordsQueryKey,
    queryFn: fetchCompanyProductRecords,
    staleTime: 5 * 60 * 1000
  });
