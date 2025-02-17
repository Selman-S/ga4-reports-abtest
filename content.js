// Rapor bilgilerini al
function getReportInfo() {
    try {
        // Rapor adını al
        const reportNameElement = document.querySelector('.analysis-header-shared span');
        if (!reportNameElement) {
            throw new Error('Rapor adı elementi bulunamadı');
        }
        const reportName = reportNameElement.innerHTML.trim();

        // Tarih aralığını al
        const dateRangeElement = document.querySelector('.primary-date-range-text');
        if (!dateRangeElement) {
            throw new Error('Tarih aralığı elementi bulunamadı');
        }
        const dateRange = dateRangeElement.innerText.trim();

        // Segmentleri al
        const segments = Array.from(
            document.querySelectorAll('#segment_comparison [data-guidedhelpid="concept-chip-list-container-segment-comparison"] .chip-text-content .chip-title')
        ).map(el => el.textContent.trim());

        if (segments.length < 1) {
            throw new Error('En az bir segment seçilmelidir');
        }

        // KPI'ları (values) al
        const kpis = Array.from(
            document.querySelectorAll('#value .chip-text-content .chip-title')
        ).map(el => el.textContent.trim());

        if (kpis.length < 1) {
            throw new Error('En az bir KPI seçilmelidir');
        }

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
            error: error.message
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
        document.querySelectorAll('.row-headers-draw-area .header-value text.align-left:not(.row-index)')
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

// Extension'dan gelen mesajları dinle
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getReportName') {
        const result = getReportInfo();
        sendResponse(result);
    }
    return true; // Asenkron yanıt için gerekli
});

// Sayfa yüklendiğinde extension'a hazır olduğunu bildir
chrome.runtime.sendMessage({
    action: 'pageLoaded',
    url: window.location.href
}); 