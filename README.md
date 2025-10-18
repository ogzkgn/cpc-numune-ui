# CPC Numune Uygulaması (UI Prototip)

Bu depo, CPC inşaat malzemeleri numune yönetimi sürecini uçtan uca simüle eden **frontend prototipini** içerir. Prototip yalnızca istemci tarafı bileşenlerinden oluşur; tüm veri ve etkileşimler mock durum yönetimi (zustand) ile sağlanır.

## Başlarken

```
npm install
npm run dev
```

`npm run dev` komutu ile uygulama varsayılan olarak `http://localhost:5173` adresinde yayına alınır.

## Mimari Özeti

- **Vite + React + TypeScript**
- **Tailwind CSS** tabanlı tasarım sistemi
- **zustand** ile tekil mock store
- Temel bileşenler: `Button`, `Badge`, `Table`, `Modal`, `Drawer`, `Stepper`, `Toast`

### Dizim

```
src/
 ├─ components/ui      # Paylaşılan UI bileşenleri
 ├─ data               # Mock veriler ve TR kopya dosyası
 ├─ features           # Ekran bazlı modüller
 ├─ hooks              # Yardımcı React hookları
 ├─ layout             # Sidebar, Topbar ve AppLayout
 ├─ pages              # Router sayfaları
 ├─ state              # zustand store
 └─ utils              # Tarih, etiket ve doğrulama yardımcıları
```

## Senaryo Akışları

1. **Önceliklendirme → Seyahat Planlama**
   - `Bu Ay Vadesi` ekranında kayıtları filtrele ve seç.
   - `Seyahat Oluştur` ile 3 adımlı planlayıcıyı tamamla.
   - Yeni seyahat `Seyahatler` listesinde görünür, ekipler otomatik olarak "sahada" işaretlenir.

2. **Sahadan Laboratuvara**
   - Seyahat detayında `Numune Alındı` işlemi ile tarih seçildiği anda ilgili firma-ürün kaydının son numune tarihi güncellenir.
   - `Laba Gönder` ile durum `ACCEPTED` olur ve `Laboratuvar` gelen kutusunda görünür.

3. **Laboratuvar Formu**
   - Gelen kutusunda `Kabul Et` ve `Formu Aç` kullanılır.
   - Standarda göre dinamik alanlar doldurulur; `Taslak Kaydet`, `Onaya Gönder`, `Onayla` adımları statüleri değiştirir.
   - Onay sonrası seyahat detayındaki laboratuvar durumu yeşil olarak güncellenir.

## Erişilebilirlik & Kısayollar

- `/` global arama kutusuna odaklanır.
- `Esc` açık modal/drawer bileşenlerini kapatır.
- Odak halkaları Tailwind ile belirginleştirilmiştir.

## Kopya Dosyası

Tüm Türkçe metinlerin referansı için `src/data/tr.json` dosyasını kullanabilirsiniz.

## Bilinen Sınırlamalar

- Kalıcı veri bulunmaz; sayfa yenilendiğinde mock durum sıfırlanır.
- Chunk boyutu uyarısı (Vite) yalnızca prototip aşamasında göz ardı edilmiştir.
- Çok kullanıcılı eşzamanlılık senaryoları simüle edilmemiştir.