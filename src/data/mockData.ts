import productCsv from "./Denemeeee.csv?raw";

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

const parseCsv = (raw: string): string[][] => {
  const rows: string[][] = [];
  let current = "";
  let row: string[] = [];
  let insideQuotes = false;
  const source = raw.replace(/\r\n/g, "\n");

  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (char === '"') {
      insideQuotes = !insideQuotes;
      continue;
    }

    if (char === ";" && !insideQuotes) {
      row.push(current);
      current = "";
      continue;
    }

    if (char === "\n" && !insideQuotes) {
      row.push(current);
      rows.push(row);
      row = [];
      current = "";
      continue;
    }

    current += char;
  }

  if (current.length > 0 || row.length > 0) {
    row.push(current);
    rows.push(row);
  }

  return rows.map((cols) => cols.map((value) => value.replace(/\s+/g, " ").trim()));
};

const parsedProducts = (() => {
  const rows = parseCsv(productCsv);
  if (rows.length === 0) return [];
  const header = rows.shift() ?? [];
  const normalize = (value: string) => value.toLowerCase().replace(/\ufeff/g, "");
  const groupIndex = header.findIndex((column) => normalize(column).includes("ürün grubu"));
  const standardIndex = header.findIndex((column) => normalize(column).includes("standart"));
  const sampleCountIndex = header.findIndex((column) => normalize(column).includes("numune sayısı"));
  const requiresIndex = header.findIndex((column) => normalize(column).includes("var/yok"));
  const labReturnIndex = header.findIndex((column) => normalize(column).includes("lab dönüş"));
  const toNumber = (value: string) => {
    const normalized = value.replace(",", ".").trim();
    if (!normalized) return undefined;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : undefined;
  };

  let lastGroup = "";
  let idCounter = 1;
  const products: Product[] = [];

  rows.forEach((row) => {
    const rawGroup = groupIndex >= 0 ? row[groupIndex] ?? "" : "";
    if (rawGroup) {
      lastGroup = rawGroup.replace(/\s+/g, " ").trim();
    }

    const standardRaw = standardIndex >= 0 ? row[standardIndex] ?? "" : "";
    const sampleCountRaw = sampleCountIndex >= 0 ? row[sampleCountIndex] ?? "" : "";
    const requiresRaw = requiresIndex >= 0 ? row[requiresIndex] ?? "" : "";
    const labReturnRaw = labReturnIndex >= 0 ? row[labReturnIndex] ?? "" : "";

    if (!lastGroup && !standardRaw) return;

    const requiresSampling = requiresRaw.toLowerCase() === "var";
    const samplingIntervalMonths = requiresSampling ? toNumber(sampleCountRaw) : undefined;
    const labReturnDays = toNumber(labReturnRaw);
    const standardNo = standardRaw ? standardRaw : undefined;
    const productType = lastGroup || standardRaw || "Tanımsız";
    const name = standardNo ?? productType;

    products.push({
      id: idCounter++,
      name,
      groupName: productType,
      productType,
      standardNo,
      requiresSampling,
      samplingIntervalMonths,
      labReturnDays,
      isCustom: true
    });
  });

  return products;
})();

export const companies: Company[] = [
  { id: 1, name: "Anadolu Hazır Beton", customerCode: "BT-001" },
  { id: 2, name: "Marmara Çimento", customerCode: "-" },
  { id: 3, name: "Ege Yapı Kimya", customerCode: "BT-448" },
  { id: 4, name: "Karadeniz Endüstri", customerCode: "BT-102" },
  { id: 5, name: "Toros Madencilik", customerCode: "-" },
  { id: 6, name: "Finike Altın Portakal", customerCode: "BT 5260" },
  { id: 7, name: "Kocaeli Beton", customerCode: "BT 5600" },
  { id: 8, name: "Kentçim Çimento Sanayi A.Ş.", customerCode: "BT 1310" },
  { id: 9, name: "OYAK Çimento Fabrikaları A.Ş. Adana Çimento Şubesi", customerCode: "BT 1530" },
  { id: 10, name: "Çan2 Termik Anonim Şirketi", customerCode: "BT 1710" },
  { id: 11, name: "Karçimsa Çimento Sanayi ve Ticaret A.Ş.", customerCode: "BT 2000" }
];

export const sites: Site[] = [
  { id: 1, companyId: 1, city: "İstanbul", district: "Pendik", address: "Sanayi Cd. No:12", siteCode: "ST-145" },
  { id: 2, companyId: 2, city: "Kocaeli", district: "Gebze", address: "İMES OSB 2. Cadde", siteCode: "ST-198" },
  { id: 3, companyId: 3, city: "Bursa", district: "Nilüfer", address: "Organize Sanayi Bölgesi", siteCode: "ST-255" },
  { id: 4, companyId: 4, city: "İzmir", district: "Aliağa", address: "Liman Yolu 45", siteCode: "ST-312" },
  { id: 5, companyId: 5, city: "Trabzon", district: "Akçaabat", address: "Sanayi Sitesi", siteCode: "ST-401" },
  { id: 6, companyId: 6, city: "Antalya", district: "Finike" },
  { id: 7, companyId: 7, city: "Kocaeli", district: "Kartepe" },
  { id: 8, companyId: 8, city: "Manisa", district: "Turgutlu" },
  { id: 9, companyId: 9, city: "Adana", district: "Yüreğir" },
  { id: 10, companyId: 10, city: "Çanakkale", district: "Çan" },
  { id: 11, companyId: 11, city: "Karabük" }
];

export const products: Product[] = parsedProducts;

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
  },
  {
    id: 9,
    companyId: 6,
    siteId: 6,
    productId: 7,
    productCode: undefined,
    certificateDate: "2017-11-17",
    lastSampleDate: "2025-09-09",
    status: "devam"
  },
  {
    id: 10,
    companyId: 7,
    siteId: 7,
    productId: 7,
    productCode: undefined,
    certificateDate: "2017-12-15",
    lastSampleDate: "2025-08-12",
    status: "devam"
  },
  {
    id: 11,
    companyId: 8,
    siteId: 8,
    productId: 8,
    productCode: "1310.Ç7.T1.0925",
    certificateDate: "2018-09-12",
    lastSampleDate: "2025-09-11",
    status: "devam"
  },
  {
    id: 12,
    companyId: 8,
    siteId: 8,
    productId: 8,
    productCode: "1310.Ç9.T1.0925",
    certificateDate: "2018-09-12",
    lastSampleDate: "2025-09-11",
    status: "devam"
  },
  {
    id: 13,
    companyId: 9,
    siteId: 9,
    productId: 10,
    productCode: "1530.Ç3.T1.1025",
    certificateDate: "2025-07-14",
    lastSampleDate: "2025-10-17",
    status: "devam"
  },
  {
    id: 14,
    companyId: 9,
    siteId: 9,
    productId: 9,
    productCode: "1530.Ç4.T3.1025",
    certificateDate: "2022-02-14",
    lastSampleDate: "2025-10-17",
    status: "devam"
  },
  {
    id: 15,
    companyId: 9,
    siteId: 9,
    productId: 8,
    productCode: "1530.Ç5.T2.1025",
    certificateDate: "2022-02-08",
    lastSampleDate: "2025-10-17",
    status: "devam"
  },
  {
    id: 16,
    companyId: 9,
    siteId: 9,
    productId: 8,
    productCode: "1530.Ç6.T5.1025",
    certificateDate: "2024-01-08",
    lastSampleDate: "2025-10-17",
    status: "devam"
  },
  {
    id: 17,
    companyId: 9,
    siteId: 9,
    productId: 11,
    productCode: "1530.Ç9.ITT.0325",
    certificateDate: "2025-05-02",
    lastSampleDate: "2025-03-17",
    status: "devam"
  },
  {
    id: 18,
    companyId: 10,
    siteId: 10,
    productId: 12,
    productCode: "1710.U1.T1.0825",
    certificateDate: "2019-02-28",
    lastSampleDate: "2025-08-08",
    status: "devam"
  },
  {
    id: 19,
    companyId: 10,
    siteId: 10,
    productId: 13,
    productCode: "1710.U2.T1.1024",
    certificateDate: "2020-07-16",
    lastSampleDate: "2024-10-25",
    status: "devam"
  },
  {
    id: 20,
    companyId: 11,
    siteId: 11,
    productId: 14,
    productCode: "2000.CRF.T5.0825",
    certificateDate: "2021-02-01",
    lastSampleDate: "2025-08-28",
    status: "devam"
  },
  {
    id: 21,
    companyId: 11,
    siteId: 11,
    productId: 8,
    productCode: "2000.Ç1.T5.0825",
    certificateDate: "2021-01-13",
    lastSampleDate: "2025-08-28",
    status: "devam"
  },
  {
    id: 22,
    companyId: 11,
    siteId: 11,
    productId: 8,
    productCode: "2000.Ç2.T5.0825",
    certificateDate: "2021-01-13",
    lastSampleDate: "2025-08-28",
    status: "devam"
  }
];

export const companyProductRecords: CompanyProductRecord[] = [];


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
  { id: 6, name: "Çukurova Enerji Lab." },
  { id: 7, name: "ARMADA-Antalya" },
  { id: 8, name: "GÜRSU SİSMİK-Kocaeli" },
  { id: 9, name: "KAYYAP LAB-Kayseri" },
  { id: 10, name: "STANDART LAB-Kocaeli" }
];

export const tripCompletions: TripCompletion[] = [];
