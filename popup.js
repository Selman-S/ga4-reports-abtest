// DOM elementlerini seç
const captureButton = document.getElementById('captureData');
const analyzeButton = document.getElementById('analyzeData');
const targetKpisContainer = document.getElementById('targetKpis');
const resultTabs = document.getElementById('resultTabs');
const tabContent = document.getElementById('tabContent');

let capturedData = null;
let targetKpis = [];

// // KPI ekleme butonunu dinle
// document.querySelector('.add-kpi-button').addEventListener('click', () => {
//     const input = document.querySelector('.target-kpi-input');
//     const kpiName = input.value.trim().toLowerCase();
    
//     if (kpiName && !targetKpis.includes(kpiName)) {
//         targetKpis.push(kpiName);
//         input.value = '';
//         updateKpiList();
//     }
// });

// // KPI listesini güncelle
// function updateKpiList() {
//     const container = document.createElement('div');
//     container.className = 'kpi-list';
    
//     targetKpis.forEach(kpi => {
//         const kpiElement = document.createElement('div');
//         kpiElement.className = 'kpi-tag';
//         kpiElement.textContent = kpi;
        
//         const removeButton = document.createElement('button');
//         removeButton.textContent = '×';
//         removeButton.onclick = () => {
//             targetKpis = targetKpis.filter(k => k !== kpi);
//             updateKpiList();
//         };
        
//         kpiElement.appendChild(removeButton);
//         container.appendChild(kpiElement);
//     });
    
//     const existingList = document.querySelector('.kpi-list');
//     if (existingList) {
//         existingList.remove();
//     }
//     targetKpisContainer.insertBefore(container, targetKpisContainer.lastElementChild);
// }

// // Veri yakalama butonunu dinle
// captureButton.addEventListener('click', async () => {
//     // Aktif sekmedeki content script'i çalıştır
//     const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
//     chrome.tabs.sendMessage(tab.id, { action: 'captureData' }, response => {
//         if (response && response.success) {
//             capturedData = response.data;
//             analyzeButton.disabled = false;
//             showNotification('Veriler başarıyla yakalandı!', 'success');
//         } else {
//             showNotification('Veri yakalama başarısız: ' + (response?.error || 'Bilinmeyen hata'), 'error');
//         }
//     });
// });

// // Analiz butonunu dinle
// analyzeButton.addEventListener('click', async () => {
//     if (!capturedData || targetKpis.length === 0) {
//         showNotification('Lütfen önce veri yakalayın ve en az bir hedef KPI seçin', 'error');
//         return;
//     }
    
//     clearResults();
//     showLoadingState(true);
    
//     try {
//         for (const kpi of targetKpis) {
//             const analysis = await analyzeKpi(kpi);
//             createResultTab(kpi, analysis);
//         }
//     } catch (error) {
//         showNotification('Analiz sırasında hata oluştu: ' + error.message, 'error');
//     } finally {
//         showLoadingState(false);
//     }
// });

// // KPI analizi yap
// async function analyzeKpi(kpi) {
//     const controlSegment = capturedData.find(item => item.segment.toLowerCase().includes('control'));
//     const testSegment = capturedData.find(item => item.segment.toLowerCase().includes('v1'));
    
//     if (!controlSegment || !testSegment) {
//         throw new Error('Kontrol veya test segmenti bulunamadı');
//     }

//     const controlMetrics = {
//         sessions: controlSegment.metrics.sessions,
//         [kpi]: controlSegment.metrics[kpi]
//     };

//     const testMetrics = {
//         sessions: testSegment.metrics.sessions,
//         [kpi]: testSegment.metrics[kpi]
//     };

//     // Conversion oranlarını hesapla
//     const controlRate = (controlMetrics[kpi] / controlMetrics.sessions) * 100;
//     const testRate = (testMetrics[kpi] / testMetrics.sessions) * 100;
    
//     // İyileştirme yüzdesini hesapla
//     const improvement = ((testRate - controlRate) / controlRate) * 100;
    
//     // İstatistiksel anlamlılık hesapla (Chi-square test)
//     const { isSignificant, confidenceLevel } = calculateStatisticalSignificance(
//         controlMetrics.sessions,
//         controlMetrics[kpi],
//         testMetrics.sessions,
//         testMetrics[kpi]
//     );

//     // ChatGPT prompt'unu hazırla
//     const prompt = `
//         A/B test sonuçlarını analiz et:
        
//         Kontrol Grubu (${controlSegment.segment}):
//         - Sessions: ${controlMetrics.sessions}
//         - ${kpi}: ${controlMetrics[kpi]}
//         - Conversion Rate: ${controlRate.toFixed(2)}%
        
//         Test Grubu (${testSegment.segment}):
//         - Sessions: ${testMetrics.sessions}
//         - ${kpi}: ${testMetrics[kpi]}
//         - Conversion Rate: ${testRate.toFixed(2)}%
        
//         Sonuçlar:
//         - İyileştirme: ${improvement.toFixed(2)}%
//         - İstatistiksel Anlamlılık: ${isSignificant ? 'Var' : 'Yok'}
//         - Güven Düzeyi: ${confidenceLevel}%
        
//         Lütfen bu sonuçları yorumla ve önerilerde bulun:
//         1. Test sonuçlarının genel değerlendirmesi
//         2. İyileştirmenin etkisi ve önemi
//         3. Güven düzeyinin yeterliliği
//         4. İleri adımlar için tavsiyeler
//     `;
    
//     // ChatGPT API'sini çağır
//     const analysis = await callChatGPT(prompt);
//     return analysis;
// }

// // İstatistiksel anlamlılık hesapla
// function calculateStatisticalSignificance(controlSessions, controlConversions, testSessions, testConversions) {
//     // Chi-square test uygula
//     const controlNonConv = controlSessions - controlConversions;
//     const testNonConv = testSessions - testConversions;
    
//     const observed = [
//         [controlConversions, controlNonConv],
//         [testConversions, testNonConv]
//     ];
    
//     const rowTotals = [controlSessions, testSessions];
//     const colTotals = [
//         controlConversions + testConversions,
//         controlNonConv + testNonConv
//     ];
//     const total = controlSessions + testSessions;
    
//     let chiSquare = 0;
//     for (let i = 0; i < 2; i++) {
//         for (let j = 0; j < 2; j++) {
//             const expected = (rowTotals[i] * colTotals[j]) / total;
//             chiSquare += Math.pow(observed[i][j] - expected, 2) / expected;
//         }
//     }
    
//     // p-value hesapla (basitleştirilmiş)
//     const isSignificant = chiSquare > 3.841; // 95% güven düzeyi için chi-square eşiği
//     const confidenceLevel = isSignificant ? 95 : Math.min(90, (chiSquare / 3.841) * 95);
    
//     return {
//         isSignificant,
//         confidenceLevel: Math.round(confidenceLevel)
//     };
// }

// // ChatGPT API çağrısı
// async function callChatGPT(prompt) {
//     // TODO: ChatGPT API entegrasyonu eklenecek
//     // Şimdilik örnek bir yanıt döndürelim
//     return `
//         Analiz Sonuçları:
        
//         1. Conversion Oranları:
//         - Kontrol: %2.5
//         - Test: %3.2
        
//         2. İyileştirme:
//         - %28 artış gözlemlendi
        
//         3. İstatistiksel Anlamlılık:
//         - 95% güven aralığında anlamlı
        
//         4. Tavsiyeler:
//         - Test varyantı daha iyi performans gösterdi
//         - Test varyantı uygulanabilir
//     `;
// }

// // Sonuç sekmesi oluştur
// function createResultTab(kpi, analysis) {
//     // Tab butonunu oluştur
//     const tabButton = document.createElement('button');
//     tabButton.className = 'tab';
//     tabButton.textContent = kpi.toUpperCase();
//     tabButton.onclick = () => switchTab(kpi);
//     resultTabs.appendChild(tabButton);
    
//     // Tab içeriğini oluştur
//     const tabPane = document.createElement('div');
//     tabPane.className = 'tab-pane';
//     tabPane.id = `tab-${kpi}`;
//     tabPane.innerHTML = `<pre>${analysis}</pre>`;
//     tabContent.appendChild(tabPane);
    
//     // İlk sekmeyi aktif yap
//     if (resultTabs.children.length === 1) {
//         switchTab(kpi);
//     }
// }

// // Sekme değiştir
// function switchTab(kpi) {
//     // Tüm sekmeleri pasif yap
//     document.querySelectorAll('.tab').forEach(tab => {
//         tab.classList.remove('active');
//     });
//     document.querySelectorAll('.tab-pane').forEach(pane => {
//         pane.style.display = 'none';
//     });
    
//     // Seçili sekmeyi aktif yap
//     document.querySelector(`.tab:contains('${kpi.toUpperCase()}')`).classList.add('active');
//     document.getElementById(`tab-${kpi}`).style.display = 'block';
// }

// // Sonuçları temizle
// function clearResults() {
//     resultTabs.innerHTML = '';
//     tabContent.innerHTML = '';
// }

// // Yükleniyor durumunu göster/gizle
// function showLoadingState(isLoading) {
//     analyzeButton.disabled = isLoading;
//     analyzeButton.textContent = isLoading ? 'Analiz Ediliyor...' : 'Analiz Et';
// }

// // Bildirim göster
// function showNotification(message, type) {
//     const notification = document.createElement('div');
//     notification.className = `notification ${type}`;
//     notification.textContent = message;
    
//     document.body.appendChild(notification);
//     setTimeout(() => notification.remove(), 3000);
// }

// // jQuery benzeri contains selector
// Element.prototype.matches = Element.prototype.matches || Element.prototype.msMatchesSelector;
// window.jQuery = {
//     expr: {
//         pseudos: {
//             contains: (elem, i, match) => {
//                 return (elem.textContent || elem.innerText || '').toLowerCase()
//                     .indexOf((match[3] || '').toLowerCase()) >= 0;
//             }
//         }
//     }
// };

document.getElementById('runButton').addEventListener('click', async () => {
    const resultDiv = document.getElementById('result');
    resultDiv.textContent = 'Analiz yapılıyor...';
    
    try {
        // Aktif sekmeyi bul
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        // Content script'i çalıştır
        chrome.tabs.sendMessage(tab.id, { action: 'getReportName' }, response => {
            if (response && response.success) {
                const { reportName, dateRange, segments, kpis, tableData } = response.data;
                
                // AB Test analizi yap
                const analysis = analyzeABTest(tableData);
                
                // Sonuçları göster
                displayResults(resultDiv, {
                    reportName,
                    dateRange,
                    segments,
                    kpis,
                    analysis
                });
            } else {
                resultDiv.innerHTML = `
                    <div class="card">
                        <div class="card-title" style="color: #ea4335;">Hata</div>
                        <div class="test-info">${response?.error || 'Bilinmeyen hata'}</div>
                    </div>
                `;
            }
        });
    } catch (error) {
        resultDiv.innerHTML = `
            <div class="card">
                <div class="card-title" style="color: #ea4335;">Hata</div>
                <div class="test-info">${error.message}</div>
            </div>
        `;
    }
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

    // Conversion Rate hesapla
    const controlCR = (control.metrics[goalMetric] / control.metrics[primaryMetric]) * 100;
    const variantCR = (variant.metrics[goalMetric] / variant.metrics[primaryMetric]) * 100;
    
    // Değişim oranı
    const improvement = ((variantCR - controlCR) / controlCR) * 100;
    
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
    // Z-score hesapla
    const controlCR = controlConversions / controlSessions;
    const variantCR = variantConversions / variantSessions;
    
    const controlSE = Math.sqrt((controlCR * (1 - controlCR)) / controlSessions);
    const variantSE = Math.sqrt((variantCR * (1 - variantCR)) / variantSessions);
    
    const zScore = Math.abs(variantCR - controlCR) / Math.sqrt(Math.pow(controlSE, 2) + Math.pow(variantSE, 2));
    
    // Güven düzeyi hesapla (basitleştirilmiş)
    const confidence = (1 - 2 * (1 - normalCDF(zScore))) * 100;
    
    return {
        confidence,
        isSignificant: confidence >= 95
    };
}

function normalCDF(x) {
    const t = 1 / (1 + 0.2316419 * Math.abs(x));
    const d = 0.3989423 * Math.exp(-x * x / 2);
    const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return x > 0 ? 1 - p : p;
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
                ${Math.abs(analysis.improvement).toFixed(2)}% ${analysis.improvement >= 0 ? 'artış' : 'düşüş'}
            </div>
            <div class="confidence">
                ${analysis.stats.isSignificant 
                    ? `✓ ${analysis.stats.confidence.toFixed(1)}% güven düzeyi ile istatistiksel olarak anlamlı` 
                    : `⚠️ ${analysis.stats.confidence.toFixed(1)}% güven düzeyi (95% güven düzeyi için yeterli değil)`}
            </div>
        </div>
    `;
} 