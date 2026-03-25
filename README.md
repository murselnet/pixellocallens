# PixelLocalLens Desktop

PixelLocalLens Desktop, Windows üzerinde çalışan bir masaüstü uygulamasıdır. Yerel klasörlerdeki görselleri ve alt klasörleri tarar; dosyaları çözünürlük, boyut, tarih ve isim gibi kriterlere göre sıralamanızı sağlar. Amaç, çok sayıda görsel arasında hızlı seçim yapmak, büyük önizleme almak ve ihtiyaç duyulan dosyaları tek tıkla hedef klasöre kopyalamaktır.

Bu repo şu anda sadece masaüstü uygulamasını içerir.

## Neler Sunar?

- Alt klasörler dahil seçilen klasörü recursive olarak tarar.
- `JPG`, `JPEG`, `PNG`, `WEBP` ve `GIF` dosyalarını listeler.
- Görselleri çözünürlüğe göre gruplandırır.
- İsim, dosya boyutu, değiştirilme tarihi ve çözünürlüğe göre sıralama sunar.
- Yatay, dikey ve kare görseller için filtreleme yapar.
- Dosya adına göre hızlı arama yapar.
- Büyük görsel önizlemesi açar.
- Dosyayı Windows Explorer içinde buldurabilir.
- Seçilen görseli belirlenen hedef klasöre kopyalar.
- Hedef klasör bilgisini yerel olarak saklar.
- GitHub Releases tabanlı uygulama güncelleme akışını destekler.

## Kullanım Senaryosu

PixelLocalLens özellikle şu tip ihtiyaçlar için uygundur:

- Büyük bir görsel arşivinde doğru dosyayı hızlı bulmak
- Farklı çözünürlükteki görselleri ayıklamak
- Tasarım, e-ticaret veya medya klasörlerinde seçim yapmak
- Yerel dosyaları başka bir klasöre hızlıca toplamak

## Teknik Özet

Uygulama Electron tabanlı bir Windows desktop deneyimi sunar. Arayüz React ile geliştirilmiştir; renderer tarafı Vite ile çalışır. Dosya sistemi tarama, klasör seçimi, Explorer entegrasyonu ve otomatik güncelleme kontrolleri Electron main process tarafında yönetilir.

Kullanılan temel teknolojiler:

- Electron `37.2.0`
- React `19.0.0`
- React DOM `19.0.0`
- Vite `7.1.3`
- TypeScript `5.6.2`
- electron-builder `26.0.12`
- electron-updater `6.8.3`
- electron-store `10.1.0`

## Proje Yapısı

```text
.
|-- electron/       # Main process, preload ve native entegrasyonlar
|-- src/            # React arayüzü
|-- public/         # Statik varlıklar
|-- build/          # Uygulama ikonları ve paketleme girdileri
|-- dist/           # Web build çıktısı
`-- release/        # Installer ve release artefact'ları
```

## Geliştirme Ortamı

Gereksinimler:

- Node.js 20+ önerilir
- npm 10+
- Windows ortamında geliştirme önerilir

Kurulum:

```bash
npm install
```

Geliştirme modunda çalıştırma:

```bash
npm run dev
```

Bu komut:

- Vite geliştirme sunucusunu başlatır
- Electron uygulamasını geliştirme modunda açar
- Arayüz ve desktop katmanını birlikte çalıştırır

## Build ve Paketleme

Üretim build'i almak için:

```bash
npm run build
```

Windows installer oluşturmak için:

```bash
npm run dist
```

Paketleme sonrası çıktılar varsayılan olarak `release/` klasörüne yazılır.

## GitHub Release ve Güncelleme Akışı

Proje `electron-builder` ve `electron-updater` ile GitHub Releases üzerinden güncelleme dağıtımı için hazırlanmıştır.

Yayın akışı:

```bash
npm run publish:github
```

Bu komut:

- production build oluşturur
- Windows installer paketini üretir
- GitHub üzerinde draft release oluşturur
- gerekli release dosyalarını yükler

Uygulama paketli modda çalıştığında:

- arka planda güncelleme kontrolü yapabilir
- yeni sürüm bulunduğunda indirme sürecini başlatır
- indirme tamamlandığında kuruluma hazır hale gelir

## Desteklenen Özellikler

- Recursive klasör tarama
- Yerel dosya metadata okuma
- Çözünürlük bazlı gruplama
- Büyük önizleme penceresi
- Kayıtlı hedef klasör tercihi
- Explorer ile dosya konumunu açma
- GitHub tabanlı auto-update

## Lisans

Bu projenin `package.json` dosyasında lisans alanı şu anda `UNLICENSED` olarak tanımlıdır. Public repo olarak yayınlanmadan önce uygun lisansın açıkça eklenmesi önerilir.
