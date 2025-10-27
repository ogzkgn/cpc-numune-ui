import type {
  Company,
  CompanyProduct,
  Lab,
  Employee,
  LabForm,
  Product,
  Site,
  Trip,
  TripCompletion,
  TripItem
} from "../types";

export const companies: Company[] = [
  { id: 1, name: "Anadolu Hazır Beton", customerCode: "BT-001" },
  { id: 2, name: "Marmara Çimento", customerCode: "-" },
  { id: 3, name: "Ege Yapı Kimya", customerCode: "BT-448" },
  { id: 4, name: "Karadeniz Endüstri", customerCode: "BT-102" },
  { id: 5, name: "Toros Madencilik", customerCode: "-" }
];

export const sites: Site[] = [
  { id: 1, companyId: 1, city: "İstanbul", district: "Pendik", address: "Sanayi Cd. No:12", siteCode: "ST-145" },
  { id: 2, companyId: 2, city: "Kocaeli", district: "Gebze", address: "İMES OSB 2. Cadde", siteCode: "ST-198" },
  { id: 3, companyId: 3, city: "Bursa", district: "Nilüfer", address: "Organize Sanayi Bölgesi", siteCode: "ST-255" },
  { id: 4, companyId: 4, city: "İzmir", district: "Aliağa", address: "Liman Yolu 45", siteCode: "ST-312" },
  { id: 5, companyId: 5, city: "Trabzon", district: "Akçaabat", address: "Sanayi Sitesi", siteCode: "ST-401" }
];

export const products: Product[] = [
  { id: 1, name: "Beton", groupName: "Beton", productType: "concrete", standardNo: "TS EN 13515" },
  { id: 2, name: "Beton", groupName: "Beton", productType: "concrete", standardNo: "TS EN 13515" },
  { id: 3, name: "CEM II/A-M (P-LL) 42,5 N", groupName: "Çimento", productType: "cement", standardNo: "TS EN 197-1" },
  { id: 4, name: "CEM II/B-M (P-LL) 32,5 R", groupName: "Çimento", productType: "cement", standardNo: "TS EN 197-1" },
  { id: 5, name: "CEM II/B-S 42,5N ", groupName: "Cüruf", productType: "slag", standardNo: "TS EN 15167" },
  { id: 6, name: "Uçucu Kül - Kategori B", groupName: "Uçucu Kül", productType: "fly_ash", standardNo: "TS EN 450" }
];

export const companyProducts: CompanyProduct[] = [
  {
    id: 1,
    companyId: 1,
    siteId: 1,
    productId: 1,
    productCode: "CPC-1040.Ç1",
    certificateNo: "CPC-1980",
    certificateDate: "2023-11-10",
    lastSampleDate: "2025-07-12",
    lastInspectionDate: "2025-04-15",
    status: "devam",
    paymentStatus: "yapti"
  },
  {
    id: 2,
    companyId: 1,
    siteId: 2,
    productId: 2,
    productCode: "CPC-1040.Ç2",
    certificateNo: "CPC-1970",
    certificateDate: "2024-02-22",
    lastSampleDate: "2025-05-03",
    lastInspectionDate: "2025-01-05",
    status: "devam",
    paymentStatus: "yapmadi"
  },
  {
    id: 3,
    companyId: 2,
    siteId: 3,
    productId: 3,
    productCode: "CPC-2230.Ç4",
    certificateNo: "CPC-2020",
    certificateDate: "2023-09-18",
    lastSampleDate: "2025-03-14",
    lastInspectionDate: "2025-02-10",
    status: "devam",
    paymentStatus: "yapti"
  },
  {
    id: 4,
    companyId: 2,
    siteId: 3,
    productId: 4,
    productCode: "CPC-2230.Ç6",
    certificateNo: "CPC-2100",
    certificateDate: "2024-04-01",
    lastSampleDate: "2025-01-25",
    lastInspectionDate: "2024-12-20",
    status: "devam",
    paymentStatus: "muaf"
  },
  {
    id: 5,
    companyId: 3,
    siteId: 4,
    productId: 5,
    productCode: "CPC-2000.Ç1",
    certificateNo: "CPC-1870",
    certificateDate: "2024-05-30",
    lastSampleDate: "2024-12-19",
    lastInspectionDate: "2024-08-11",
    status: "devam",
    paymentStatus: "yapti"
  },
  {
    id: 6,
    companyId: 4,
    siteId: 5,
    productId: 1,
    productCode: "CPC-5310.Ç3",
    certificateNo: "CPC-1850",
    certificateDate: "2023-06-11",
    lastSampleDate: "2025-11-01",
    lastInspectionDate: "2025-01-30",
    status: "devam",
    paymentStatus: "yapmadi"
  },
  {
    id: 7,
    companyId: 5,
    productId: 6,
    productCode: "CPC-1540.U2",
    certificateNo: "CPC-1820",
    certificateDate: "2024-10-03",
    lastSampleDate: "2025-02-07",
    lastInspectionDate: "2024-09-18",
    status: "devam",
    paymentStatus: "muaf"
  },
  {
    id: 8,
    companyId: 3,
    siteId: 4,
    productId: 2,
    productCode: "CPC-2230.Ç2",
    certificateNo: "CPC-2000",
    certificateDate: "2025-01-19",
    lastSampleDate: "2025-07-29",
    lastInspectionDate: "2025-02-01",
    status: "devam",
    paymentStatus: "yapti"
  }
];

export const employees: Employee[] = [
  { id: 1, name: "Ayşe Yıldız", city: "İstanbul", status: "available", skills: ["concrete", "cement"] },
  { id: 2, name: "Mert Demir", city: "Kocaeli", status: "busy", skills: ["concrete"] },
  { id: 3, name: "Selin Çelik", city: "İzmir", status: "available", skills: ["cement", "slag"] },
  { id: 4, name: "Emir Kaya", city: "Ankara", status: "available", skills: ["concrete", "fly_ash"] },
  { id: 5, name: "Zeynep Korkmaz", city: "Bursa", status: "busy", skills: ["cement"] },
  { id: 6, name: "Onur Arslan", city: "Trabzon", status: "available", skills: ["concrete", "slag"] }
];

export const trips: Trip[] = [
  
];

export const tripItems: TripItem[] = [
  {
    id: 1,
    tripId: 1,
    companyProductId: 1,
    sampled: false,
    labStatus: "PENDING",
    dutyType: "NUMUNE",
    dutyAssigneeIds: [1, 4]
  },
  {
    id: 2,
    tripId: 1,
    companyProductId: 2,
    sampled: false,
    labStatus: "PENDING",
    dutyType: "GÖZETİM",
    dutyAssigneeIds: [4]
  },
  {
    id: 3,
    tripId: 1,
    companyProductId: 3,
    sampled: false,
    labStatus: "PENDING",
    dutyType: "NUMUNE",
    dutyAssigneeIds: [1]
  },
  {
    id: 4,
    tripId: 2,
    companyProductId: 5,
    sampled: false,
    labStatus: "PENDING",
    dutyType: "BOTH",
    dutyAssigneeIds: [3]
  },
  {
    id: 5,
    tripId: 2,
    companyProductId: 7,
    sampled: false,
    labStatus: "PENDING",
    dutyType: "NUMUNE",
    dutyAssigneeIds: [3]
  }
];

export const labForms: LabForm[] = [];

export const labs: Lab[] = [
  { id: 1, name: "İstanbul Merkez Lab." },
  { id: 2, name: "Gebze Numune Lab." },
  { id: 3, name: "Bursa Çimento Lab." },
  { id: 4, name: "Ege Malzeme Lab." },
  { id: 5, name: "Trabzon Analiz Merkezi" },
  { id: 6, name: "Çukurova Enerji Lab." }
];

export const tripCompletions: TripCompletion[] = [];

