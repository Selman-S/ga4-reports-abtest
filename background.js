// Extension yüklendiğinde çalışacak
chrome.runtime.onInstalled.addListener(() => {
    console.log('GA4 AB Test Analyzer yüklendi');
});

// Content script'ten gelen mesajları dinle
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'pageLoaded') {
        // GA4 sayfasında olup olmadığımızı kontrol et
        const isGA4Page = request.url.includes('analytics.google.com');
        
        // Extension ikonunu güncelle
        chrome.action.setIcon({
            path: {
                "16": isGA4Page ? "images/icon16.png" : "images/icon16_disabled.png",
                "48": isGA4Page ? "images/icon48.png" : "images/icon48_disabled.png",
                "128": isGA4Page ? "images/icon128.png" : "images/icon128_disabled.png"
            }
        });
        
        // Extension'ı aktif/pasif yap
        chrome.action.setPopup({
            popup: isGA4Page ? "popup.html" : "disabled.html"
        });
    }
});

// ChatGPT API anahtarını sakla
chrome.storage.sync.get(['openaiApiKey'], (result) => {
    if (!result.openaiApiKey) {
        // İlk kurulumda API anahtarı ayarlanmamışsa
        chrome.runtime.openOptionsPage();
    }
});

// Hata yakalama
chrome.runtime.onError.addListener((error) => {
    console.error('Extension error:', error.message);
}); 