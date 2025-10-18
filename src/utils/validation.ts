import type { Employee, ProductType } from "../types";

export const hasSkillCoverage = (employees: Employee[], requiredSkills: ProductType[]) => {
  const skillSet = new Set<ProductType>();
  employees.forEach((employee) => {
    employee.skills.forEach((skill) => skillSet.add(skill));
  });
  return requiredSkills.every((skill) => skillSet.has(skill));
};

export const isEmployeeAvailable = (employee: Employee) => employee.status === "available";