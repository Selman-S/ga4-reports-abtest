# GA4 AB Test Analyzer Chrome Extension

Bu Chrome uzantısı, Google Analytics 4'teki A/B test sonuçlarını otomatik olarak analiz eder ve ChatGPT 3.5 kullanarak yorumlar.

## Özellikler

- GA4 A/B test sonuçlarını otomatik yakalama
- Session bazlı KPI karşılaştırması
- Birden fazla hedef KPI analizi
- ChatGPT 3.5 ile otomatik sonuç yorumlama
- Her KPI için ayrı sekmelerde detaylı raporlama
- Modern ve kullanıcı dostu arayüz

## Kurulum

1. Bu repository'yi bilgisayarınıza klonlayın
2. Chrome tarayıcınızda `chrome://extensions/` adresine gidin
3. Sağ üst köşedeki "Geliştirici modu"nu aktif edin
4. "Paketlenmemiş öğe yükle" butonuna tıklayın
5. Klonladığınız klasörü seçin

## Kullanım

1. Google Analytics 4 hesabınızda A/B test sonuçlarının bulunduğu sayfaya gidin
2. Chrome uzantı simgesine tıklayın
3. "Veri Yakala" butonuna tıklayarak test sonuçlarını yakalayın
4. Hedef KPI'ları ekleyin (örn: transaction, tıklama vb.)
5. "Analiz Et" butonuna tıklayarak sonuçları görüntüleyin

## Gereksinimler

- Chrome tarayıcısı (v88 veya üzeri)
- Google Analytics 4 hesabı
- A/B test sonuçlarına erişim yetkisi
- ChatGPT API anahtarı (analiz için gerekli)

## Teknik Detaylar

Extension aşağıdaki ana bileşenlerden oluşur:

- `manifest.json`: Extension konfigürasyonu
- `popup.html`: Kullanıcı arayüzü
- `popup.js`: Arayüz fonksiyonları
- `content.js`: GA4 veri yakalama
- `background.js`: Arka plan işlemleri
- `styles.css`: Arayüz stilleri

## Katkıda Bulunma

1. Bu repository'yi fork edin
2. Yeni bir branch oluşturun (`git checkout -b feature/yeniOzellik`)
3. Değişikliklerinizi commit edin (`git commit -am 'Yeni özellik: Detay'`)
4. Branch'inizi push edin (`git push origin feature/yeniOzellik`)
5. Pull Request oluşturun

## Lisans

Bu proje MIT lisansı altında lisanslanmıştır. Detaylar için `LICENSE` dosyasına bakın. 