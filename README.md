# CPC Numune UI

Bu proje, CPC numune/seyahat planlama ve laboratuvar süreçlerini yöneten bir **frontend (Vite + React + TypeScript)** ve **backend (Node.js + Express + PostgreSQL)** uygulamasıdır.

## Gereksinimler

- Node.js (öneri: 18+)
- npm
- PostgreSQL

## Kurulum

### 1) Bağımlılıkları yükleyin

Frontend:

```bash
cd cpc-numune-ui
npm install
```

Backend:

```bash
cd cpc-numune-ui/server
npm install
```

### 2) Veritabanı

Şema dosyası:

- `cpc-numune-ui/server/src/db/schema.sql`

PostgreSQL üzerinde bu şemayı çalıştırın.

### 3) Backend ortam değişkenleri

Backend `.env` dosyası:

- `cpc-numune-ui/server/.env`

Örnek değişkenler:

- `PORT=4000`
- `JWT_SECRET=...` (prod için güçlü bir değer kullanın)
- `JWT_EXPIRES_IN=1h` (opsiyonel)
- `ALLOWED_ORIGINS=http://localhost:5173`
- Veritabanı bağlantısı (kurulumunuza göre):
  - `DATABASE_URL=postgres://...` **veya**
  - `PGHOST / PGUSER / PGPASSWORD / PGDATABASE / PGPORT`

Not: Uygulama cookie tabanlı auth kullandığı için CORS’ta `credentials: true` aktiftir. `ALLOWED_ORIGINS` değerinin frontend origin’i ile uyumlu olması gerekir.

## Çalıştırma

### Backend (API)

```bash
cd cpc-numune-ui/server
npm start
```

Varsayılan: `http://localhost:4000`

Health endpoint:

- `GET http://localhost:4000/health`

### Frontend (UI)

```bash
cd cpc-numune-ui
npm run dev
```

Varsayılan: `http://localhost:5173`

## Roller ve Erişim

- `admin`: tüm ekranlara erişim
- `lab`: yalnızca laboratuvar ekranlarına erişim (`/laboratuvar`)

## Dosya Yükleme (Lab Form Dokümanları)

- Statik dosyalar: backend tarafından `/uploads` altında sunulur.
- Upload dizini: `cpc-numune-ui/server/uploads/lab-forms`
- Endpoint: `POST /lab-forms/:tripItemId/upload`
- Limitler:
  - Dosya başına 15 MB
  - En fazla 10 dosya
  - Tip allowlist (sunucuda kontrol edilir): PDF / Word / Excel / CSV / JPG / PNG

## Proje Yapısı (Özet)

Frontend:

- `cpc-numune-ui/src/features/*`: ekranlar (companyProducts, trips, laboratory, samples, settings vb.)
- `cpc-numune-ui/src/queries/*`: React Query fetch/mutation hook’ları
- `cpc-numune-ui/src/state/*`: UI state (rol, toast vb.) ve auth store
- `cpc-numune-ui/src/lib/apiClient.ts`: API istemcisi (`credentials: "include"`)

Backend:

- `cpc-numune-ui/server/src/server.js`: Express giriş noktası
- `cpc-numune-ui/server/src/routes/*`: endpoint’ler
- `cpc-numune-ui/server/src/middleware/*`: auth/rate limit vb.
- `cpc-numune-ui/server/src/db/*`: DB client/şema

## Sık Karşılaşılan Sorunlar

- **CORS / Cookie problemi**: `ALLOWED_ORIGINS` değerinin `http://localhost:5173` (veya prod domain) ile aynı olduğundan emin olun.
- **401 Unauthorized**: login olmadan `/auth/me` ve korumalı endpoint’ler 401 döner (beklenen davranış).
- **DB bağlantı hatası**: `.env` içindeki DB parametrelerini kontrol edin.
