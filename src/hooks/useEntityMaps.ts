import { useMemo } from "react";

import { useAppStore } from "../state/useAppStore";
import { mapById } from "../utils/mappers";

export const useEntityMaps = () => {
  const companies = useAppStore((state) => state.companies);
  const sites = useAppStore((state) => state.sites);
  const products = useAppStore((state) => state.products);
  const companyProducts = useAppStore((state) => state.companyProducts);
  const employees = useAppStore((state) => state.employees);
  const trips = useAppStore((state) => state.trips);
  const tripItems = useAppStore((state) => state.tripItems);
  const labForms = useAppStore((state) => state.labForms);

  return useMemo(
    () => ({
      companyMap: mapById(companies),
      siteMap: mapById(sites),
      productMap: mapById(products),
      companyProductMap: mapById(companyProducts),
      employeeMap: mapById(employees),
      tripMap: mapById(trips),
      tripItemMap: mapById(tripItems),
      labFormMap: new Map(labForms.map((form) => [form.tripItemId, form]))
    }),
    [companies, sites, products, companyProducts, employees, trips, tripItems, labForms]
  );
};