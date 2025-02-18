// Belirli bir elementi bekle
function waitForSelector(selector, callback, maxAttempts = 50) {
    let attempts = 0;
    const interval = setInterval(() => {
        attempts++;
        const element = document.querySelector(selector);
        
        if (element) {
            clearInterval(interval);
            callback(element);
        } else if (attempts >= maxAttempts) {
            clearInterval(interval);
            console.log(`Element bulunamadı: ${selector}`);
        }
    }, 200);
}

// Tüm gerekli elementlerin yüklenmesini bekle
function waitForAllElements(callback) {
    const requiredSelectors = {
        reportName: '.analysis-header-shared span',
        dateRange: '.primary-date-range-text',
        segments: '#segment_comparison [data-guidedhelpid="concept-chip-list-container-segment-comparison"] .chip-text-content .chip-title',
        kpis: '#value .chip-text-content .chip-title',
        tableValues: '.cells-wrapper .cell text.align-right'
    };

    let loadedElements = {};
    let checkInterval;
    let attempts = 0;
    const maxAttempts = 50;

    function checkElements() {
        attempts++;
        let allFound = true;

        for (const [key, selector] of Object.entries(requiredSelectors)) {
            if (!loadedElements[key]) {
                const elements = document.querySelectorAll(selector);
                if (elements.length > 0) {
                    loadedElements[key] = true;
                } else {
                    allFound = false;
                }
            }
        }

        if (allFound) {
            clearInterval(checkInterval);
            callback(true);
        } else if (attempts >= maxAttempts) {
            clearInterval(checkInterval);
            console.log('Bazı elementler yüklenemedi:', 
                Object.entries(loadedElements)
                    .filter(([k, v]) => !v)
                    .map(([k]) => k)
            );
            callback(false);
        }
    }

    checkInterval = setInterval(checkElements, 200);
}

// Rapor bilgilerini al
function getReportInfo() {
    try {
        // Rapor adını al
        const reportNameElement = document.querySelector('.analysis-header-shared span');
        if (!reportNameElement) {
            return {
                success: false,
                error: 'Rapor elementleri henüz yüklenmedi. Lütfen sayfanın tamamen yüklenmesini bekleyin.'
            };
        }
        const reportName = reportNameElement.innerHTML.trim();

        // Tarih aralığını al
        const dateRangeElement = document.querySelector('.primary-date-range-text');
        if (!dateRangeElement) {
            return {
                success: false,
                error: 'Tarih aralığı elementi henüz yüklenmedi. Lütfen sayfanın tamamen yüklenmesini bekleyin.'
            };
        }
        const dateRange = dateRangeElement.innerText.trim();

        // Segmentleri al
        const segmentElements = document.querySelectorAll('#segment_comparison [data-guidedhelpid="concept-chip-list-container-segment-comparison"] .chip-text-content .chip-title');
        if (segmentElements.length < 1) {
            return {
                success: false,
                error: 'Lütfen en az bir segment seçin'
            };
        }
        const segments = Array.from(segmentElements).map(el => el.textContent.trim());

        // KPI'ları (values) al
        const kpiElements = document.querySelectorAll('#value .chip-text-content .chip-title');
        if (kpiElements.length < 1) {
            return {
                success: false,
                error: 'Lütfen en az bir KPI seçin'
            };
        }
        const kpis = Array.from(kpiElements).map(el => el.textContent.trim());

        // Tablo verilerini al
        const tableData = getTableData();

        return {
            success: true,
            data: {
                reportName: reportName,
                dateRange: dateRange,
                segments: segments,
                kpis: kpis,
                tableData: tableData
            }
        };
    } catch (error) {
        console.error('Rapor bilgileri alma hatası:', error);
        return {
            success: false,
            error: 'Rapor bilgileri alınırken bir hata oluştu. Lütfen sayfayı yenileyin.'
        };
    }
}

// Tablo verilerini al
function getTableData() {
    // KPI başlıklarını al
    const kpiHeaders = Array.from(
        document.querySelectorAll('.column-headers-wrapper .header-value text')
    ).map(el => el.textContent.trim());

    // Segment isimlerini al
    const segmentNames = Array.from(
        document.querySelectorAll('.row-headers-draw-area .row-header-column:first-child .header-value text.align-left:not(.row-index)')
    ).map(el => el.textContent.trim());

    // Tüm değerleri al
    const allValues = Array.from(
        document.querySelectorAll('.cells-wrapper .cell text.align-right')
    ).map(el => {
        // Binlik ayracı olan virgülü kaldır ve sayıya çevir
        const rawValue = el.textContent.trim();
        const cleanValue = rawValue.replace(/,/g, '');
        return parseFloat(cleanValue);
    });

    // Verileri yapılandır
    const tableData = segmentNames.map((segment, segmentIndex) => {
        const segmentData = {
            segment: segment,
            metrics: {}
        };

        // Her KPI için değerleri eşleştir
        kpiHeaders.forEach((kpi, kpiIndex) => {
            // Her segment için KPI değerini bul
            // Değer dizisindeki index = (segment index * KPI sayısı) + KPI index
            const valueIndex = segmentIndex * kpiHeaders.length + kpiIndex;
            segmentData.metrics[kpi] = allValues[valueIndex];
        });

        return segmentData;
    });

    return {
        kpis: kpiHeaders,
        segments: tableData
    };
}

// KPI verilerini kontrol et ve buton metnini güncelle
function checkKPIDataAndUpdateButton(buttonContainer, tableData, reportInfo) {
    const storedData = JSON.parse(sessionStorage.getItem('ga4_abtest_data') || 'null');
    const currentKPIs = tableData.kpis;

    // Tüm butonları temizle
    buttonContainer.innerHTML = '';

    // Mevcut rapor bilgileri
    const currentReportInfo = {
        reportName: reportInfo.reportName,
        dateRange: reportInfo.dateRange,
        segments: reportInfo.segments.map(s => s.toLowerCase()).sort()
    };

    if (storedData) {
        // Kayıtlı rapor bilgileri
        const storedReportInfo = {
            reportName: storedData.reportName,
            dateRange: storedData.dateRange,
            segments: storedData.segments.map(s => s.toLowerCase()).sort()
        };

        // Rapor bilgilerinin eşleşip eşleşmediğini kontrol et
        const isMatchingReport = JSON.stringify(currentReportInfo) === JSON.stringify(storedReportInfo);

        if (currentKPIs.length === 1) {
            if (isMatchingReport) {
                if (currentKPIs[0] !== storedData.kpi) {
                    // Farklı KPI ve eşleşen rapor - her iki butonu da göster
                    const analyzeButton = createButton(`${storedData.kpi}'a Göre Analiz Et`, 'analyze');
                    const saveButton = createButton('Yeni KPI Kaydet', 'save');
                    buttonContainer.appendChild(analyzeButton);
                    buttonContainer.appendChild(saveButton);
                } else {
                    // Aynı KPI - sadece kaydet butonu
                    const saveButton = createButton('KPI Kaydet', 'save');
                    buttonContainer.appendChild(saveButton);
                }
            } else {
                // Rapor eşleşmiyor - sadece kaydet butonu
                const saveButton = createButton('KPI Kaydet', 'save');
                buttonContainer.appendChild(saveButton);
            }
        } else {
            // Birden fazla KPI - analiz butonu
            const analyzeButton = createButton('AB Test Analiz Et', 'analyze');
            buttonContainer.appendChild(analyzeButton);
        }
    } else {
        // Hiç kayıtlı veri yok
        if (currentKPIs.length === 1) {
            const saveButton = createButton('KPI Kaydet', 'save');
            buttonContainer.appendChild(saveButton);
        } else {
            const analyzeButton = createButton('AB Test Analiz Et', 'analyze');
            buttonContainer.appendChild(analyzeButton);
        }
    }
}

// Buton oluştur
function createButton(text, mode) {
    const button = document.createElement('button');
    button.className = `ga4-abtest-button ${mode}`;
    button.textContent = text;
    button.dataset.mode = mode;
    return button;
}

// KPI verilerini kaydet
function saveKPIData(reportInfo, tableData) {
    try {
        const dataToStore = {
            reportName: reportInfo.reportName,
            dateRange: reportInfo.dateRange,
            segments: reportInfo.segments,
            kpi: tableData.kpis[0],
            data: tableData
        };
        sessionStorage.setItem('ga4_abtest_data', JSON.stringify(dataToStore));
        showNotification('KPI verisi kaydedildi. Diğer KPI ile karşılaştırma yapmak için yeni bir KPI seçin.', 'success');
    } catch (error) {
        console.error('KPI kaydetme hatası:', error);
        showNotification('KPI verisi kaydedilirken bir hata oluştu: ' + error.message, 'error');
    }
}

// Analiz için verileri birleştir
function combineKPIData(currentData, storedData) {
    // Segment sıralamasını kontrol et ve eşleştir
    const combinedSegments = currentData.segments.map(segment => {
        const storedSegment = storedData.data.segments.find(s => 
            s.segment.toLowerCase() === segment.segment.toLowerCase()
        );

        return {
            segment: segment.segment,
            metrics: {
                ...storedSegment.metrics,
                ...segment.metrics
            }
        };
    });

    return {
        kpis: [storedData.kpi, ...currentData.kpis],
        segments: combinedSegments
    };
}

// Analiz butonunu ve sonuç popup'ını sayfaya ekle
function injectAnalyzeButton() {
    // Eğer butonlar zaten varsa tekrar ekleme
    if (document.querySelector('.ga4-abtest-buttons')) {
        return;
    }

    // Buton container'ı oluştur
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'ga4-abtest-buttons';
    
    // Container'ı header'a ekle
    const headerSpacer = document.querySelector('.gmp-header-spacer');
    if (headerSpacer) {
        headerSpacer.parentNode.insertBefore(buttonContainer, headerSpacer.nextSibling);
    }

    // Buton stillerini ekle
    const style = document.createElement('style');
    style.textContent = `
        .ga4-abtest-buttons {
            display: inline-flex;
            gap: 8px;
            margin-left: 16px;
        }
        .ga4-abtest-button {
            background-color: #4285f4;
            color: white;
            border: none;
            border-radius: 4px;
            padding: 8px 16px;
            font-size: 14px;
            cursor: pointer;
            font-weight: 500;
        }
        .ga4-abtest-button:hover {
            background-color: #3367d6;
        }
        .ga4-abtest-button.save {
            background-color: #34a853;
        }
        .ga4-abtest-button.save:hover {
            background-color: #2d8f47;
        }
        #ga4-abtest-results {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.08);
            width: 600px;
            max-width: 90vw;
            max-height: 90vh;
            overflow-y: auto;
            z-index: 10000;
            display: none;
            padding: 20px;
        }
        #ga4-abtest-results .card {
            background: #f8f9fa;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 16px;
        }
        #ga4-abtest-results .card-title {
            color: #1a73e8;
            font-size: 14px;
            font-weight: 500;
            margin-bottom: 8px;
        }
        #ga4-abtest-results .test-info {
            font-size: 13px;
            line-height: 1.5;
            margin-bottom: 8px;
        }
        #ga4-abtest-results .metrics-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            margin-top: 12px;
        }
        #ga4-abtest-results .metric-card {
            background: white;
            border: 1px solid #e0e0e0;
            border-radius: 4px;
            padding: 12px;
        }
        #ga4-abtest-results .metric-title {
            font-size: 12px;
            color: #5f6368;
            margin-bottom: 4px;
        }
        #ga4-abtest-results .metric-value {
            font-size: 24px;
            font-weight: 500;
            color: #1a73e8;
            margin-bottom: 8px;
        }
        #ga4-abtest-results .metric-change {
            font-size: 14px;
            font-weight: 500;
            margin-top: 12px;
            text-align: center;
            padding: 8px;
            border-radius: 4px;
            background: #f8f9fa;
        }
        #ga4-abtest-results .positive {
            color: #34a853;
        }
        #ga4-abtest-results .negative {
            color: #ea4335;
        }
        #ga4-abtest-results .confidence {
            font-size: 13px;
            color: #5f6368;
            margin-top: 12px;
            padding: 8px;
            background: #f1f3f4;
            border-radius: 4px;
            text-align: center;
        }
        #ga4-abtest-results .close-button {
            position: absolute;
            top: 12px;
            right: 12px;
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: #5f6368;
            padding: 4px 8px;
            line-height: 1;
        }
        #ga4-abtest-results .close-button:hover {
            color: #1a73e8;
        }
        #ga4-abtest-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            z-index: 9999;
            display: none;
        }
        .ga4-notification {
            position: fixed;
            top: 16px;
            right: 16px;
            padding: 12px 24px;
            border-radius: 8px;
            background: white;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.08);
            font-size: 14px;
            line-height: 1.5;
            z-index: 10001;
            transition: all 0.3s ease;
            transform: translateX(150%);
        }
        .ga4-notification.show {
            transform: translateX(0);
        }
        .ga4-notification.success {
            border-left: 4px solid #34a853;
            color: #1e8e3e;
        }
        .ga4-notification.error {
            border-left: 4px solid #ea4335;
            color: #d93025;
        }
        .ga4-notification.info {
            border-left: 4px solid #4285f4;
            color: #1a73e8;
        }
    `;
    document.head.appendChild(style);

    // Tablo ve sekme değişikliklerini izle
    const observer = new MutationObserver((mutations) => {
        let shouldUpdate = false;
        
        for (const mutation of mutations) {
            // Tablo içeriği değişti mi?
            if (mutation.target.classList.contains('table-area') ||
                mutation.target.classList.contains('cells-wrapper') ||
                mutation.target.classList.contains('header-value')) {
                shouldUpdate = true;
                break;
            }
            
            // KPI değişti mi?
            if (mutation.target.closest('#value')) {
                shouldUpdate = true;
                break;
            }

            // Sekme değişti mi?
            if (mutation.target.closest('.tab-content-wrapper')) {
                shouldUpdate = true;
                break;
            }
        }

        if (shouldUpdate) {
            // Kısa bir gecikme ekleyerek DOM'un güncellenmesini bekle
            setTimeout(() => updateButtonState(buttonContainer), 100);
        }
    });

    // Crosstab elementini bekle ve observer'ı başlat
    function setupObserver() {
        const contentArea = document.querySelector('.crosstab');
        if (contentArea) {
            console.log('Crosstab bulundu, observer başlatılıyor');
            observer.observe(contentArea, { 
                childList: true, 
                subtree: true,
                characterData: true,
                attributes: true
            });
            // İlk durumu ayarla
            updateButtonState(buttonContainer);
        } else {
            console.log('Crosstab bekleniyor...');
            setTimeout(setupObserver, 500);
        }
    }

    // Tüm elementlerin yüklenmesini bekle
    waitForAllElements((loaded) => {
        if (loaded) {
            buttonContainer.style.display = 'inline-flex';
            setupObserver(); // Observer'ı başlat
        }
    });

    // Sonuç popup'ı için container'ları oluştur
    const overlay = document.createElement('div');
    overlay.id = 'ga4-abtest-overlay';
    
    const resultsPopup = document.createElement('div');
    resultsPopup.id = 'ga4-abtest-results';
    resultsPopup.innerHTML = `
        <button class="close-button">×</button>
        <div id="ga4-abtest-content"></div>
    `;

    document.body.appendChild(overlay);
    document.body.appendChild(resultsPopup);

    // Buton tıklamalarını dinle
    buttonContainer.addEventListener('click', async (event) => {
        const button = event.target.closest('.ga4-abtest-button');
        if (!button) return;

        try {
            const results = getReportInfo();
            if (!results.success) {
                showNotification('Hata: ' + (results.error || 'Bilinmeyen bir hata oluştu'), 'error');
                return;
            }

            if (button.dataset.mode === 'save') {
                // KPI verilerini kaydet
                saveKPIData(results.data, results.data.tableData);
                return;
            }

            // Analiz yap
            let analysisData = results.data.tableData;
            const storedData = JSON.parse(sessionStorage.getItem('ga4_abtest_data') || 'null');

            if (storedData && results.data.tableData.kpis.length === 1) {
                // Kayıtlı veriyle birleştir
                analysisData = combineKPIData(results.data.tableData, storedData);
            }

            const analysis = analyzeABTest(analysisData);
            displayResults(
                document.getElementById('ga4-abtest-content'),
                {
                    reportName: results.data.reportName,
                    dateRange: results.data.dateRange,
                    analysis
                }
            );
            
            // Popup'ı göster
            overlay.style.display = 'block';
            resultsPopup.style.display = 'block';
        } catch (error) {
            console.error('İşlem hatası:', error);
            showNotification('İşlem sırasında bir hata oluştu: ' + error.message, 'error');
        }
    });

    // Kapatma butonunu ve overlay'i dinle
    resultsPopup.querySelector('.close-button').addEventListener('click', () => {
        overlay.style.display = 'none';
        resultsPopup.style.display = 'none';
    });

    overlay.addEventListener('click', () => {
        overlay.style.display = 'none';
        resultsPopup.style.display = 'none';
    });
}

// Buton durumunu güncelle
function updateButtonState(buttonContainer) {
    const results = getReportInfo();
    if (results.success) {
        checkKPIDataAndUpdateButton(buttonContainer, results.data.tableData, results.data);
    }
}

// Sayfa yüklendiğinde buton enjekte et
waitForSelector(".gmp-header-spacer", () => {
    injectAnalyzeButton();
});

// Sayfa yüklendiğinde extension'a hazır olduğunu bildir
chrome.runtime.sendMessage({
    action: 'pageLoaded',
    url: window.location.href
});

// Extension'dan gelen mesajları dinle
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getReportName') {
        const result = getReportInfo();
   
        
        sendResponse(result);
    }    return true;
});

function analyzeABTest(tableData) {
    // Kontrol grubunu bul (V0 veya control içeren)
    const control = tableData.segments.find(segment => 
        segment.segment.toLowerCase().includes('v0') || 
        segment.segment.toLowerCase().includes('control')
    );
    
    // Varyant grubunu bul (kontrol olmayan)
    const variant = tableData.segments.find(segment => 
        !(segment.segment.toLowerCase().includes('v0') || 
          segment.segment.toLowerCase().includes('control'))
    );

    if (!control || !variant) {
        throw new Error('Kontrol veya varyant grubu bulunamadı');
    }

    const primaryMetric = tableData.kpis[0]; // Sessions
    const goalMetric = tableData.kpis[1];    // Transactions veya diğer hedef metrik

    // Conversion Rate hesapla (sıfır kontrolü ile)
    const controlCR = control.metrics[primaryMetric] > 0 
        ? (control.metrics[goalMetric] / control.metrics[primaryMetric]) * 100 
        : 0;
    const variantCR = variant.metrics[primaryMetric] > 0 
        ? (variant.metrics[goalMetric] / variant.metrics[primaryMetric]) * 100 
        : 0;
    
    // Değişim oranı (sıfır kontrolü ile)
    const improvement = controlCR > 0 
        ? ((variantCR - controlCR) / controlCR) * 100 
        : variantCR > 0 ? Infinity : 0;
    
    // İstatistiksel anlamlılık hesapla
    const stats = calculateSignificance(
        control.metrics[primaryMetric],
        control.metrics[goalMetric],
        variant.metrics[primaryMetric],
        variant.metrics[goalMetric]
    );

    return {
        control: {
            name: control.segment,
            sessions: control.metrics[primaryMetric],
            conversions: control.metrics[goalMetric],
            cr: controlCR
        },
        variant: {
            name: variant.segment,
            sessions: variant.metrics[primaryMetric],
            conversions: variant.metrics[goalMetric],
            cr: variantCR
        },
        improvement,
        stats
    };
}

function calculateSignificance(controlSessions, controlConversions, variantSessions, variantConversions) {
    // Sıfır kontrolü
    if (controlSessions === 0 || variantSessions === 0) {
        return {
            confidence: 0,
            isSignificant: false,
            probability: 0
        };
    }

    // Beta dağılımı parametreleri
    const controlAlpha = controlConversions + 1; // +1 for prior
    const controlBeta = controlSessions - controlConversions + 1;
    const variantAlpha = variantConversions + 1;
    const variantBeta = variantSessions - variantConversions + 1;

    // Monte Carlo simülasyonu için örnek sayısı
    const iterations = 10000;
    let winCount = 0;

    // Monte Carlo simülasyonu
    for (let i = 0; i < iterations; i++) {
        // Basitleştirilmiş Beta örneklemesi için normal dağılım yaklaşımı
        const controlMean = controlAlpha / (controlAlpha + controlBeta);
        const controlVar = (controlAlpha * controlBeta) / (Math.pow(controlAlpha + controlBeta, 2) * (controlAlpha + controlBeta + 1));
        const controlSample = normalApproximation(controlMean, Math.sqrt(controlVar));

        const variantMean = variantAlpha / (variantAlpha + variantBeta);
        const variantVar = (variantAlpha * variantBeta) / (Math.pow(variantAlpha + variantBeta, 2) * (variantAlpha + variantBeta + 1));
        const variantSample = normalApproximation(variantMean, Math.sqrt(variantVar));

        if (variantSample > controlSample) {
            winCount++;
        }
    }

    // Varyantın kazanma olasılığı
    const probability = winCount / iterations;
    
    // Güven düzeyi ve anlamlılık
    const confidence = probability * 100;
    const isSignificant = probability >= 0.95;

    return {
        confidence,
        isSignificant,
        probability
    };
}

// Normal dağılım yaklaşımı için yardımcı fonksiyon
function normalApproximation(mean, stddev) {
    let u1 = 0, u2 = 0;
    while (u1 === 0) u1 = Math.random();
    while (u2 === 0) u2 = Math.random();
    
    const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    let result = mean + z * stddev;
    
    // 0-1 aralığında sınırla
    return Math.max(0, Math.min(1, result));
}

function calculateTestDuration(dateRange) {
    // "1 Oca 2024 - 31 Oca 2024" formatındaki string'i parse et
    const dates = dateRange.split(' - ');
    if (dates.length !== 2) return null;

    // Türkçe ay isimlerini İngilizce'ye çevir
    const monthMap = {
        'Oca': 'Jan',
        'Şub': 'Feb',
        'Mar': 'Mar',
        'Nis': 'Apr',
        'May': 'May',
        'Haz': 'Jun',
        'Tem': 'Jul',
        'Ağu': 'Aug',
        'Eyl': 'Sep',
        'Eki': 'Oct',
        'Kas': 'Nov',
        'Ara': 'Dec'
    };

    function parseDate(dateStr) {
        // "1 Oca 2024" formatındaki tarihi parse et
        const parts = dateStr.trim().split(' ');
        const day = parts[0];
        const month = monthMap[parts[1]] || parts[1];
        const year = parts[2] || new Date().getFullYear(); // Yıl yoksa mevcut yılı kullan
        
        return new Date(`${month} ${day}, ${year}`);
    }

    const startDate = parseDate(dates[0]);
    const endDate = parseDate(dates[1]);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        console.error('Tarih parse edilemedi:', dates);
        return null;
    }
    
    // Milisaniyeyi güne çevir
    const diffTime = Math.abs(endDate - startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays + 1; // Başlangıç gününü de dahil etmek için +1
}

function displayResults(resultDiv, data) {
    const { reportName, dateRange, analysis } = data;
    const testDuration = calculateTestDuration(dateRange);
    
    // Improvement değeri için özel format
    let improvementText = '';
    if (isFinite(analysis.improvement)) {
        improvementText = `${Math.abs(analysis.improvement).toFixed(2)}% ${analysis.improvement >= 0 ? 'artış' : 'düşüş'}`;
    } else if (analysis.improvement === Infinity) {
        improvementText = 'Sonsuz artış';
    } else {
        improvementText = 'Değişim hesaplanamıyor';
    }
    
    resultDiv.innerHTML = `
        <div class="card">
            <div class="card-title">Test Bilgileri</div>
            <div class="test-info">
                <strong>${reportName}</strong><br>
                ${dateRange}<br>
                ${testDuration ? `Test Süresi: ${testDuration} gün` : ''}
            </div>
        </div>

        <div class="card">
            <div class="card-title">Test Sonuçları</div>
            <div class="metrics-grid">
                <div class="metric-card">
                    <div class="metric-title">Kontrol (${analysis.control.name})</div>
                    <div class="metric-value">${analysis.control.cr.toFixed(2)}%</div>
                    <div class="test-info">
                        ${analysis.control.sessions.toLocaleString()} session<br>
                        ${analysis.control.conversions.toLocaleString()} conversion
                    </div>
                </div>
                <div class="metric-card">
                    <div class="metric-title">Varyant (${analysis.variant.name})</div>
                    <div class="metric-value">${analysis.variant.cr.toFixed(2)}%</div>
                    <div class="test-info">
                        ${analysis.variant.sessions.toLocaleString()} session<br>
                        ${analysis.variant.conversions.toLocaleString()} conversion
                    </div>
                </div>
            </div>
            <div class="metric-change ${analysis.improvement >= 0 ? 'positive' : 'negative'}">
                ${improvementText}
            </div>
            <div class="confidence">
                ${analysis.stats.isSignificant 
                    ? `✓ ${analysis.stats.probability.toFixed(1)}% olasılıkla varyant daha iyi performans gösteriyor` 
                    : `⚠️ Varyantın daha iyi olma olasılığı: ${analysis.stats.probability.toFixed(1)}% (95% için yeterli değil)`}
            </div>
        </div>
    `;
}

// Notification göster
function showNotification(message, type = 'info', duration = 3000) {
    // Varsa eski notification'ı kaldır
    const existingNotification = document.querySelector('.ga4-notification');
    if (existingNotification) {
        existingNotification.remove();
    }

    // Yeni notification oluştur
    const notification = document.createElement('div');
    notification.className = `ga4-notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    // Animasyon için setTimeout kullan
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);

    // Belirtilen süre sonra kaldır
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, duration);
}