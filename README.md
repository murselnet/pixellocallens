# PixelLocalLens Desktop

PixelLocalLens Desktop, Windows uzerinde calisan bir masaustu uygulamasidir. Yerel klasorlerdeki gorselleri ve alt klasorleri tarar; dosyalari cozunurluk, boyut, tarih ve isim gibi kriterlere gore siralamanizi saglar. Amac, cok sayida gorsel arasinda hizli secim yapmak, buyuk onizleme almak ve ihtiyac duyulan dosyalari tek tikla hedef klasore kopyalamaktir.

Bu repo su anda sadece masaustu uygulamasini icerir.

## Neler Sunar?

- Alt klasorler dahil secilen klasoru recursive olarak tarar.
- `JPG`, `JPEG`, `PNG`, `WEBP` ve `GIF` dosyalarini listeler.
- Gorselleri cozunurluge gore gruplandirir.
- Isim, dosya boyutu, degistirilme tarihi ve cozunurluge gore siralama sunar.
- Yatay, dikey ve kare gorseller icin filtreleme yapar.
- Dosya adina gore hizli arama yapar.
- Buyuk gorsel onizlemesi acar.
- Dosyayi Windows Explorer icinde buldurabilir.
- Secilen gorseli belirlenen hedef klasore kopyalar.
- Hedef klasor bilgisini yerel olarak saklar.
- GitHub Releases tabanli uygulama guncelleme akislarini destekler.

## Kullanim Senaryosu

PixelLocalLens ozellikle su tip ihtiyaclar icin uygundur:

- Buyuk bir gorsel arsivinde dogru dosyayi hizli bulmak
- Farkli cozunurlukteki gorselleri ayiklamak
- Tasarim, e-ticaret veya medya klasorlerinde secim yapmak
- Yerel dosyalari baska bir klasore hizlica toplamak

## Teknik Ozet

Uygulama Electron tabanli bir Windows desktop deneyimi sunar. Arayuz React ile gelistirilmistir; renderer tarafi Vite ile calisir. Dosya sistemi tarama, klasor secimi, Explorer entegrasyonu ve otomatik guncelleme kontrolleri Electron main process tarafinda yonetilir.

Kullanilan temel teknolojiler:

- Electron `37.2.0`
- React `19.0.0`
- React DOM `19.0.0`
- Vite `7.1.3`
- TypeScript `5.6.2`
- electron-builder `26.0.12`
- electron-updater `6.8.3`
- electron-store `10.1.0`

## Proje Yapisi

```text
.
|-- electron/       # Main process, preload ve native entegrasyonlar
|-- src/            # React arayuzu
|-- public/         # Statik varliklar
|-- build/          # Uygulama ikonlari ve paketleme girdileri
|-- dist/           # Web build ciktisi
`-- release/        # Local test paketleri ve release artefact'lari
```

## Kullanici Kurulumu

Uygulamayi kendi bilgisayarina kurmak isteyen bir kullanici icin en kolay yol GitHub Releases sayfasini kullanmaktir.

Kurulum adimlari:

1. GitHub repo sayfasindaki `Releases` bolumunu acin.
2. En son surumu secin.
3. `Assets` altindan `PixelLocalLens-Desktop-Setup-x.y.z.exe` dosyasini indirin.
4. Indirilen `.exe` dosyasini calistirin.
5. Kurulum tamamlandiktan sonra uygulamayi Windows Baslat menusunden acin.

Notlar:

- Son kullanicinin yalnizca `.exe` kurulum dosyasini indirmesi yeterlidir.
- `latest.yml` ve `.blockmap` dosyalari otomatik guncelleme sistemi icindir; elle indirilmesine gerek yoktur.
- Uygulama kurulduktan sonra yeni surumler GitHub Releases uzerinden otomatik olarak algilanabilir.

## Gelistirme Ortami

Gereksinimler:

- Node.js 20+ onerilir
- npm 10+
- Windows ortaminda gelistirme onerilir

Kurulum:

```bash
npm install
```

Gelistirme modunda calistirma:

```bash
npm run dev
```

Bu komut:

- Vite gelistirme sunucusunu baslatir
- Electron uygulamasini gelistirme modunda acar
- Arayuz ve desktop katmanini birlikte calistirir

## Build ve Paketleme

Uretim build'i almak icin:

```bash
npm run build
```

Windows installer olusturmak icin:

```bash
npm run dist
```

Paketleme sonrasi ciktilar varsayilan olarak `release/` klasorune yazilir.

## GitHub Release ve Guncelleme Akisi

Proje `electron-builder` ve `electron-updater` ile GitHub Releases uzerinden guncelleme dagitimi icin hazirlanmistir.

Yerel yayin akisi:

```bash
npm run publish:github
```

GitHub Actions tabanli yayin akisi:

- `main` branch'ine push yapildiginda workflow otomatik calisir
- Windows release paketini GitHub runner uzerinde olusturur
- GitHub Release'i otomatik olarak yayinlar

Uygulama paketli modda calistiginda:

- arka planda guncelleme kontrolu yapabilir
- yeni surum bulundugunda indirme surecini baslatir
- indirme tamamlandiginda kuruluma hazir hale gelir

## Desteklenen Ozellikler

- Recursive klasor tarama
- Yerel dosya metadata okuma
- Cozunurluk bazli gruplama
- Buyuk onizleme penceresi
- Kayitli hedef klasor tercihi
- Explorer ile dosya konumunu acma
- GitHub tabanli auto-update

## Lisans

Bu projenin `package.json` dosyasinda lisans alani su anda `UNLICENSED` olarak tanimlidir. Public repo olarak yayinlanmadan once uygun lisansin acikca eklenmesi onerilir.
