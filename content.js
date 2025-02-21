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

// Tab ismini al
function getTabName() {
    try {
        const activeTab = document.querySelector('.analysis-area-header .cdk-drag .step-tab-active');
        if (!activeTab) {
            throw new Error('Aktif tab bulunamadı');
        }

        const stepIndex = activeTab.closest(".cdk-drag").getAttribute('data-step-index');
        const tabName = activeTab.querySelector('.mat-mdc-input-element').getAttribute("aria-label");

        if (!stepIndex || !tabName) {
            throw new Error('Tab bilgileri eksik');
        }

        return `${stepIndex}-${tabName}`;
    } catch (error) {
        console.error('Tab ismi alma hatası:', error);
        throw error;
    }
}

// KPI verilerini kaydet
function saveKPIData(reportInfo, tableData, type) {
    try {
        const storedData = JSON.parse(sessionStorage.getItem('ga4_abtest_data') || '{}');
        const currentKPI = tableData.kpis[0];
        const segments = tableData.segments;

        // Tab ismini al
        const tabName = getTabName();

        // Kontrol ve varyant gruplarını bul
        const control = segments.find(segment => 
            segment.segment.toLowerCase().includes('v0') || 
            segment.segment.toLowerCase().includes('control')
        );
        const variant = segments.find(segment => 
            !(segment.segment.toLowerCase().includes('v0') || 
              segment.segment.toLowerCase().includes('control'))
        );

        if (!control || !variant) {
            throw new Error('Kontrol veya varyant grubu bulunamadı');
        }

        // Yeni veriyi hazırla
        const newData = {
            reportName: reportInfo.reportName,
            dateRange: reportInfo.dateRange,
            segments: reportInfo.segments,
            value: control.metrics[currentKPI],
            segment: control.segment,
            variantValue: variant.metrics[currentKPI],
            variantSegment: variant.segment,
            tabName: tabName
        };

        // Veri tipine göre kaydet
        if (type === 'session') {
            storedData.sessionData = newData;
            // Sadece aynı tab'deki dönüşüm verisini temizle
            if (storedData.conversionData && 
                storedData.conversionData.tabName === tabName) {
                delete storedData.conversionData;
            }
        } else if (type === 'conversion') {
            storedData.conversionData = newData;
            // Sadece aynı tab'deki session verisini temizle
            if (storedData.sessionData && 
                storedData.sessionData.tabName === tabName) {
                delete storedData.sessionData;
            }
        }

        sessionStorage.setItem('ga4_abtest_data', JSON.stringify(storedData));
        showNotification(`${type === 'session' ? 'Session' : 'Dönüşüm'} verisi "${tabName}" tabında kaydedildi.`, 'success');

        // Butonları güncelle
        const buttonContainer = document.querySelector('.ga4-abtest-buttons');
        if (buttonContainer) {
            checkKPIDataAndUpdateButton(buttonContainer, tableData, reportInfo);
        }
    } catch (error) {
        console.error('KPI kaydetme hatası:', error);
        showNotification('Veri kaydedilirken bir hata oluştu: ' + error.message, 'error');
    }
}

// KPI verilerini kontrol et ve buton metnini güncelle
function checkKPIDataAndUpdateButton(buttonContainer, tableData, reportInfo) {
    // Tüm butonları temizle
    buttonContainer.innerHTML = '';

    // Storage'dan mevcut verileri al
    const storedData = JSON.parse(sessionStorage.getItem('ga4_abtest_data') || '{}');
    const currentKPIs = tableData.kpis;

    if (currentKPIs.length === 2) {
        // İki KPI varsa doğrudan analiz butonu
        const analyzeButton = createButton('AB Test Analiz Et', 'analyze-direct');
        buttonContainer.appendChild(analyzeButton);
    } else if (currentKPIs.length === 1) {
        // Session Al butonu
        const sessionButton = createButton('Session Al', 'session');
        if (storedData.sessionData) {
            const sessionLabel = document.createElement('div');
            sessionLabel.className = 'button-label';
            sessionLabel.textContent = storedData.sessionData.tabName;
            sessionButton.appendChild(sessionLabel);
        }

        // Dönüşüm Al butonu
        const conversionButton = createButton('Dönüşüm Al', 'conversion');
        if (storedData.conversionData) {
            const conversionLabel = document.createElement('div');
            conversionLabel.className = 'button-label';
            conversionLabel.textContent = storedData.conversionData.tabName;
            conversionButton.appendChild(conversionLabel);
        }

        // Analiz Et butonu
        const analyzeButton = createButton('AB Test Analiz Et', 'analyze');
        analyzeButton.disabled = !(storedData.sessionData && storedData.conversionData);
        if (analyzeButton.disabled) {
            analyzeButton.classList.add('disabled');
        }

        buttonContainer.appendChild(sessionButton);
        buttonContainer.appendChild(conversionButton);
        buttonContainer.appendChild(analyzeButton);
    }

    // Buton stilleri için CSS ekle
    const style = document.createElement('style');
    style.textContent = `
        .ga4-abtest-buttons {
            display: inline-flex;
            gap: 12px;
            margin-left: 16px;
            align-items: center;
        }
        .ga4-abtest-button {
            position: relative;
            color: white;
            border: none;
            border-radius: 8px;
            padding: 10px 20px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            overflow: hidden;
            display: flex;
            flex-direction: column;
            align-items: center;
            min-width: 120px;
        }
        .ga4-abtest-button::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(rgba(255,255,255,0.1), rgba(255,255,255,0));
            opacity: 0;
            transition: opacity 0.3s ease;
        }
        .ga4-abtest-button:hover::before {
            opacity: 1;
        }
        .ga4-abtest-button:active {
            transform: translateY(1px);
        }
        .ga4-abtest-button.session {
            background: linear-gradient(135deg, #4285f4, #2b6cd4);
        }
        .ga4-abtest-button.conversion {
            background: linear-gradient(135deg, #34a853, #2d8f47);
        }
        .ga4-abtest-button.analyze,
        .ga4-abtest-button.analyze-direct {
            background: linear-gradient(135deg, #ea4335, #d62516);
        }
        .ga4-abtest-button.disabled {
            background: linear-gradient(135deg, #9aa0a6, #80868b);
            cursor: not-allowed;
            opacity: 0.8;
        }
        .button-label {
            font-size: 11px;
            margin-top: 6px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 200px;
            text-align: center;
            font-weight: 500;
            color: rgba(255,255,255,0.9);
            letter-spacing: 0.2px;
        }
        #ga4-abtest-results {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #ffffff;
            border-radius: 16px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.1);
            width: 700px;
            max-width: 90vw;
            max-height: 90vh;
            overflow-y: auto;
            z-index: 10000;
            display: none;
            padding: 32px;
            animation: slideIn 0.3s ease;
        }
        @keyframes slideIn {
            from {
                opacity: 0;
                transform: translate(-50%, -48%);
            }
            to {
                opacity: 1;
                transform: translate(-50%, -50%);
            }
        }
        #ga4-abtest-results .card {
            background: #ffffff;
            border: 1px solid #e8eaed;
            border-radius: 12px;
            padding: 24px;
            margin-bottom: 24px;
            transition: all 0.3s ease;
            box-shadow: 0 4px 6px rgba(0,0,0,0.02);
        }
        #ga4-abtest-results .card:hover {
            box-shadow: 0 6px 12px rgba(0,0,0,0.05);
            transform: translateY(-1px);
        }
        #ga4-abtest-results .card-title {
            color: #202124;
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 16px;
            letter-spacing: 0.3px;
        }
        #ga4-abtest-results .test-info {
            font-size: 14px;
            line-height: 1.6;
            color: #5f6368;
            margin-bottom: 12px;
        }
        #ga4-abtest-results .test-info strong {
            color: #202124;
            font-weight: 600;
        }
        #ga4-abtest-results .metrics-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin: 24px 0;
        }
        #ga4-abtest-results .metric-card {
            background: #f8f9fa;
            border: 1px solid #e8eaed;
            border-radius: 12px;
            padding: 20px;
            transition: all 0.3s ease;
        }
        #ga4-abtest-results .metric-card:hover {
            background: #ffffff;
            box-shadow: 0 6px 12px rgba(0,0,0,0.05);
            transform: translateY(-2px);
        }
        #ga4-abtest-results .metric-title {
            font-size: 13px;
            color: #5f6368;
            margin-bottom: 8px;
            font-weight: 500;
            letter-spacing: 0.3px;
        }
        #ga4-abtest-results .metric-value {
            font-size: 32px;
            font-weight: 600;
            color: #202124;
            margin-bottom: 16px;
            letter-spacing: -0.5px;
        }
        #ga4-abtest-results .metric-change {
            font-size: 16px;
            font-weight: 600;
            margin: 24px 0;
            text-align: center;
            padding: 16px;
            border-radius: 12px;
            background: #f8f9fa;
            transition: all 0.3s ease;
        }
        #ga4-abtest-results .metric-change.positive {
            color: #34a853;
            background: rgba(52,168,83,0.1);
        }
        #ga4-abtest-results .metric-change.negative {
            color: #ea4335;
            background: rgba(234,67,53,0.1);
        }
        #ga4-abtest-results .confidence {
            font-size: 14px;
            color: #5f6368;
            margin-top: 16px;
            padding: 16px;
            background: #f8f9fa;
            border-radius: 12px;
            text-align: center;
            font-weight: 500;
            letter-spacing: 0.2px;
            border: 1px solid #e8eaed;
        }
        #ga4-abtest-results .close-button {
            position: absolute;
            top: 16px;
            right: 16px;
            background: #f8f9fa;
            border: none;
            font-size: 20px;
            cursor: pointer;
            color: #5f6368;
            padding: 8px 12px;
            line-height: 1;
            border-radius: 8px;
            transition: all 0.3s ease;
        }
        #ga4-abtest-results .close-button:hover {
            background: #e8eaed;
            color: #202124;
        }
        #ga4-abtest-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(32,33,36,0.6);
            backdrop-filter: blur(4px);
            z-index: 9999;
            display: none;
            animation: fadeIn 0.3s ease;
        }
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        .ga4-notification {
            position: fixed;
            top: 116px;
            right: 16px;
            padding: 16px 24px;
            border-radius: 12px;
            background: #ffffff;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            font-size: 14px;
            line-height: 1.5;
            z-index: 10001;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            transform: translateX(150%);
            font-weight: 500;
            letter-spacing: 0.2px;
            min-width: 300px;
        }
        .ga4-notification.show {
            transform: translateX(0);
        }
        .ga4-notification.success {
            border-left: 4px solid #34a853;
            color: #0d652d;
            background: #e6f4ea;
        }
        .ga4-notification.error {
            border-left: 4px solid #ea4335;
            color: #b31412;
            background: #fce8e6;
        }
        .ga4-notification.info {
            border-left: 4px solid #4285f4;
            color: #174ea6;
            background: #e8f0fe;
        }
    `;
    document.head.appendChild(style);
}

// Buton oluştur
function createButton(text, mode) {
    const button = document.createElement('button');
    button.className = `ga4-abtest-button ${mode}`;
    button.textContent = text;
    button.dataset.mode = mode;
    return button;
}

// Analiz için verileri hazırla
function prepareAnalysisData(storedData) {
    if (!storedData.sessionData || !storedData.conversionData) {
        throw new Error('Session ve dönüşüm verileri eksik');
    }

    return {
        kpis: ['Sessions', 'Conversions'],
        segments: [
            {
                segment: storedData.sessionData.segment,
                metrics: {
                    'Sessions': storedData.sessionData.value,
                    'Conversions': storedData.conversionData.value
                }
            },
            {
                segment: storedData.sessionData.variantSegment,
                metrics: {
                    'Sessions': storedData.sessionData.variantValue,
                    'Conversions': storedData.conversionData.variantValue
                }
            }
        ],
        sessionTab: storedData.sessionData.tabName,
        conversionTab: storedData.conversionData.tabName
    };
}

// İki KPI'lı tablo için analiz verilerini hazırla
function prepareDirectAnalysisData(tableData) {
    const kpis = tableData.kpis;
    if (kpis.length !== 2) {
        throw new Error('Doğrudan analiz için tabloda tam olarak 2 KPI olmalıdır');
    }

    // Kontrol ve varyant gruplarını bul
    const control = tableData.segments.find(segment => 
        segment.segment.toLowerCase().includes('v0') || 
        segment.segment.toLowerCase().includes('control')
    );
    const variant = tableData.segments.find(segment => 
        !(segment.segment.toLowerCase().includes('v0') || 
          segment.segment.toLowerCase().includes('control'))
    );

    if (!control || !variant) {
        throw new Error('Kontrol veya varyant grubu bulunamadı');
    }

    return {
        kpis: ['Sessions', 'Conversions'],
        segments: [
            {
                segment: control.segment,
                metrics: {
                    'Sessions': control.metrics[kpis[0]],
                    'Conversions': control.metrics[kpis[1]]
                }
            },
            {
                segment: variant.segment,
                metrics: {
                    'Sessions': variant.metrics[kpis[0]],
                    'Conversions': variant.metrics[kpis[1]]
                }
            }
        ]
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
            gap: 12px;
            margin-left: 16px;
            align-items: center;
        }
        .ga4-abtest-button {
            position: relative;
            color: white;
            border: none;
            border-radius: 8px;
            padding: 10px 20px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            overflow: hidden;
            display: flex;
            flex-direction: column;
            align-items: center;
            min-width: 120px;
        }
        .ga4-abtest-button::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(rgba(255,255,255,0.1), rgba(255,255,255,0));
            opacity: 0;
            transition: opacity 0.3s ease;
        }
        .ga4-abtest-button:hover::before {
            opacity: 1;
        }
        .ga4-abtest-button:active {
            transform: translateY(1px);
        }
        .ga4-abtest-button.session {
            background: linear-gradient(135deg, #4285f4, #2b6cd4);
        }
        .ga4-abtest-button.conversion {
            background: linear-gradient(135deg, #34a853, #2d8f47);
        }
        .ga4-abtest-button.analyze,
        .ga4-abtest-button.analyze-direct {
            background: linear-gradient(135deg, #ea4335, #d62516);
        }
        .ga4-abtest-button.disabled {
            background: linear-gradient(135deg, #9aa0a6, #80868b);
            cursor: not-allowed;
            opacity: 0.8;
        }
        .button-label {
            font-size: 11px;
            margin-top: 6px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 200px;
            text-align: center;
            font-weight: 500;
            color: rgba(255,255,255,0.9);
            letter-spacing: 0.2px;
        }
        #ga4-abtest-results {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #ffffff;
            border-radius: 16px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.1);
            width: 700px;
            max-width: 90vw;
            max-height: 90vh;
            overflow-y: auto;
            z-index: 10000;
            display: none;
            padding: 32px;
            animation: slideIn 0.3s ease;
        }
        @keyframes slideIn {
            from {
                opacity: 0;
                transform: translate(-50%, -48%);
            }
            to {
                opacity: 1;
                transform: translate(-50%, -50%);
            }
        }
        #ga4-abtest-results .card {
            background: #ffffff;
            border: 1px solid #e8eaed;
            border-radius: 12px;
            padding: 24px;
            margin-bottom: 24px;
            transition: all 0.3s ease;
            box-shadow: 0 4px 6px rgba(0,0,0,0.02);
        }
        #ga4-abtest-results .card:hover {
            box-shadow: 0 6px 12px rgba(0,0,0,0.05);
            transform: translateY(-1px);
        }
        #ga4-abtest-results .card-title {
            color: #202124;
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 16px;
            letter-spacing: 0.3px;
        }
        #ga4-abtest-results .test-info {
            font-size: 14px;
            line-height: 1.6;
            color: #5f6368;
            margin-bottom: 12px;
        }
        #ga4-abtest-results .test-info strong {
            color: #202124;
            font-weight: 600;
        }
        #ga4-abtest-results .metrics-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin: 24px 0;
        }
        #ga4-abtest-results .metric-card {
            background: #f8f9fa;
            border: 1px solid #e8eaed;
            border-radius: 12px;
            padding: 20px;
            transition: all 0.3s ease;
        }
        #ga4-abtest-results .metric-card:hover {
            background: #ffffff;
            box-shadow: 0 6px 12px rgba(0,0,0,0.05);
            transform: translateY(-2px);
        }
        #ga4-abtest-results .metric-title {
            font-size: 13px;
            color: #5f6368;
            margin-bottom: 8px;
            font-weight: 500;
            letter-spacing: 0.3px;
        }
        #ga4-abtest-results .metric-value {
            font-size: 32px;
            font-weight: 600;
            color: #202124;
            margin-bottom: 16px;
            letter-spacing: -0.5px;
        }
        #ga4-abtest-results .metric-change {
            font-size: 16px;
            font-weight: 600;
            margin: 24px 0;
            text-align: center;
            padding: 16px;
            border-radius: 12px;
            background: #f8f9fa;
            transition: all 0.3s ease;
        }
        #ga4-abtest-results .metric-change.positive {
            color: #34a853;
            background: rgba(52,168,83,0.1);
        }
        #ga4-abtest-results .metric-change.negative {
            color: #ea4335;
            background: rgba(234,67,53,0.1);
        }
        #ga4-abtest-results .confidence {
            font-size: 14px;
            color: #5f6368;
            margin-top: 16px;
            padding: 16px;
            background: #f8f9fa;
            border-radius: 12px;
            text-align: center;
            font-weight: 500;
            letter-spacing: 0.2px;
            border: 1px solid #e8eaed;
        }
        #ga4-abtest-results .close-button {
            position: absolute;
            top: 16px;
            right: 16px;
            background: #f8f9fa;
            border: none;
            font-size: 20px;
            cursor: pointer;
            color: #5f6368;
            padding: 8px 12px;
            line-height: 1;
            border-radius: 8px;
            transition: all 0.3s ease;
        }
        #ga4-abtest-results .close-button:hover {
            background: #e8eaed;
            color: #202124;
        }
        #ga4-abtest-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(32,33,36,0.6);
            backdrop-filter: blur(4px);
            z-index: 9999;
            display: none;
            animation: fadeIn 0.3s ease;
        }
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        .ga4-notification {
            position: fixed;
            top: 116px;
            right: 16px;
            padding: 16px 24px;
            border-radius: 12px;
            background: #ffffff;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            font-size: 14px;
            line-height: 1.5;
            z-index: 10001;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            transform: translateX(150%);
            font-weight: 500;
            letter-spacing: 0.2px;
            min-width: 300px;
        }
        .ga4-notification.show {
            transform: translateX(0);
        }
        .ga4-notification.success {
            border-left: 4px solid #34a853;
            color: #0d652d;
            background: #e6f4ea;
        }
        .ga4-notification.error {
            border-left: 4px solid #ea4335;
            color: #b31412;
            background: #fce8e6;
        }
        .ga4-notification.info {
            border-left: 4px solid #4285f4;
            color: #174ea6;
            background: #e8f0fe;
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

            // Buton tipine göre işlem yap
            switch (button.dataset.mode) {
                case 'session':
                    saveKPIData(results.data, results.data.tableData, 'session');
                    break;
                case 'conversion':
                    saveKPIData(results.data, results.data.tableData, 'conversion');
                    break;
                case 'analyze':
                    if (button.disabled) {
                        showNotification('Analiz için hem session hem de dönüşüm verisi gerekli', 'error');
                        return;
                    }

                    const storedData = JSON.parse(sessionStorage.getItem('ga4_abtest_data') || '{}');
                    const analysisData = prepareAnalysisData(storedData);
                    const analysis = analyzeABTest(analysisData);
                    displayResults(
                        document.getElementById('ga4-abtest-content'),
                        {
                            reportName: results.data.reportName,
                            dateRange: results.data.dateRange,
                            analysis
                        }
                    );
                    break;
                case 'analyze-direct':
                    const directAnalysisData = prepareDirectAnalysisData(results.data.tableData);
                    const directAnalysis = analyzeABTest(directAnalysisData);
                    displayDirectResults(
                        document.getElementById('ga4-abtest-content'),
                        {
                            reportName: results.data.reportName,
                            dateRange: results.data.dateRange,
                            analysis: directAnalysis,
                            kpis: results.data.tableData.kpis
                        }
                    );
                    break;
            }

            // Popup'ı göster (analiz durumlarında)
            if (button.dataset.mode === 'analyze' || button.dataset.mode === 'analyze-direct') {
                document.getElementById('ga4-abtest-overlay').style.display = 'block';
                document.getElementById('ga4-abtest-results').style.display = 'block';
            }

            // İşlem sonrası storage durumunu konsola yazdır
            const storageData = JSON.parse(sessionStorage.getItem('ga4_abtest_data') || '{}');
            console.log('Buton tıklandı - Storage durumu:', storageData);
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
        // Storage durumunu konsola yazdır
        const storageData = JSON.parse(sessionStorage.getItem('ga4_abtest_data') || '{}');
  
    }
}

// URL değişikliklerini izle ve eklentiyi başlat
function initializeExtension() {
    let currentUrl = window.location.href;
    let checkInterval = null;

    // Butonları ve ilgili elementleri temizle
    function cleanupExtension() {
        // Buton container'ı kaldır
        const buttonContainer = document.querySelector('.ga4-abtest-buttons');
        if (buttonContainer) {
            buttonContainer.remove();
        }

        // Popup ve overlay'i kaldır
        const resultsPopup = document.getElementById('ga4-abtest-results');
        const overlay = document.getElementById('ga4-abtest-overlay');
        if (resultsPopup) resultsPopup.remove();
        if (overlay) overlay.remove();

        // Varsa notification'ı kaldır
        const notification = document.querySelector('.ga4-notification');
        if (notification) notification.remove();

        // Interval'i temizle
        if (checkInterval) {
            clearInterval(checkInterval);
            checkInterval = null;
        }
    }

    // URL değişikliklerini izle
    function watchUrlChanges() {
        if (checkInterval) {
            clearInterval(checkInterval);
        }

        console.log('URL değişti:', window.location.href);

        // Önce mevcut butonları ve elementleri temizle
        cleanupExtension();

        // Analysis panels elementini kontrol et
        function checkAnalysisPanels() {
            const analysisPanel = document.querySelector('.analysis-panels');
            if (analysisPanel) {
                console.log('Analysis panel bulundu, eklenti başlatılıyor...');
                clearInterval(checkInterval);
                waitForSelector(".gmp-header-spacer", () => {
                    injectAnalyzeButton();
                });
            }
        }

        // 5 saniye boyunca her 500ms'de bir kontrol et
        let attempts = 0;
        const maxAttempts = 10; // 5 saniye = 10 deneme * 500ms
        
        checkInterval = setInterval(() => {
            attempts++;
            if (attempts >= maxAttempts) {
                console.log('Analysis panel bulunamadı, kontrol sonlandırılıyor');
                clearInterval(checkInterval);
                return;
            }
            checkAnalysisPanels();
        }, 500);
    }

    // History API'yi izle
    const pushState = history.pushState;
    history.pushState = function() {
        pushState.apply(history, arguments);
        if (currentUrl !== window.location.href) {
            currentUrl = window.location.href;
            watchUrlChanges();
        }
    };

    // popstate eventi için listener ekle
    window.addEventListener('popstate', () => {
        if (currentUrl !== window.location.href) {
            currentUrl = window.location.href;
            watchUrlChanges();
        }
    });

    // URL değişikliklerini sürekli kontrol et
    setInterval(() => {
        if (currentUrl !== window.location.href) {
            currentUrl = window.location.href;
            watchUrlChanges();
        }
    }, 1000);

    // İlk yüklemede kontrol başlat
    console.log('İlk URL:', currentUrl);
    watchUrlChanges();
}

// Eklentiyi başlat
initializeExtension();

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
                ${testDuration ? `Test Süresi: ${testDuration} gün` : ''}<br>
                <div class="metrics-info">
                    <div class="metric-source">
                        <span class="metric-label">Session Metriği:</span>
                        <span class="metric-tab">${analysis.sessionTab || 'Aynı tablo'}</span>
                    </div>
                    <div class="metric-source">
                        <span class="metric-label">Dönüşüm Metriği:</span>
                        <span class="metric-tab">${analysis.conversionTab || 'Aynı tablo'}</span>
                    </div>
                </div>
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

    // Yeni stil ekle
    const style = document.createElement('style');
    style.textContent = `
        .metrics-info {
            margin-top: 12px;
            padding: 12px;
            background: #f8f9fa;
            border-radius: 8px;
            border: 1px solid #e8eaed;
        }
        .metric-source {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 4px 0;
        }
        .metric-source:not(:last-child) {
            border-bottom: 1px solid #e8eaed;
            margin-bottom: 4px;
            padding-bottom: 8px;
        }
        .metric-label {
            color: #5f6368;
            font-weight: 500;
        }
        .metric-tab {
            color: #1a73e8;
            font-weight: 500;
            padding: 4px 8px;
            background: rgba(26,115,232,0.1);
            border-radius: 4px;
            font-size: 13px;
        }
    `;
    document.head.appendChild(style);
}

// İki KPI'lı tablo için sonuçları göster
function displayDirectResults(resultDiv, data) {
    const { reportName, dateRange, analysis, kpis } = data;
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
                ${testDuration ? `Test Süresi: ${testDuration} gün` : ''}<br>
                Metrikler: ${kpis[0]} → ${kpis[1]} dönüşüm oranı
            </div>
        </div>

        <div class="card">
            <div class="card-title">Test Sonuçları</div>
            <div class="metrics-grid">
                <div class="metric-card">
                    <div class="metric-title">Kontrol (${analysis.control.name})</div>
                    <div class="metric-value">${analysis.control.cr.toFixed(2)}%</div>
                    <div class="test-info">
                        ${analysis.control.sessions.toLocaleString()} ${kpis[0]}<br>
                        ${analysis.control.conversions.toLocaleString()} ${kpis[1]}
                    </div>
                </div>
                <div class="metric-card">
                    <div class="metric-title">Varyant (${analysis.variant.name})</div>
                    <div class="metric-value">${analysis.variant.cr.toFixed(2)}%</div>
                    <div class="test-info">
                        ${analysis.variant.sessions.toLocaleString()} ${kpis[0]}<br>
                        ${analysis.variant.conversions.toLocaleString()} ${kpis[1]}
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