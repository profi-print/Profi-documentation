(function (window) {
    const DB_NAME = 'pp_screenshots_db';
    const DB_VERSION = 1;
    const STORE_NAME = 'screenshots';

    function openDB() {
        return new Promise((resolve, reject) => {
            if (!window.indexedDB) {
                reject(new Error('IndexedDB не поддерживается этим браузером'));
                return;
            }
            const req = window.indexedDB.open(DB_NAME, DB_VERSION);
            req.onupgradeneeded = function (e) {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME);
                }
            };
            req.onsuccess = function (e) { resolve(e.target.result); };
            req.onerror = function (e) { reject(e.target.error || new Error('Не удалось открыть IndexedDB')); };
        });
    }

    function saveScreenshot(orderId, base64Data) {
        return openDB().then(db => new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            tx.objectStore(STORE_NAME).put(base64Data, String(orderId));
            tx.oncomplete = () => resolve(true);
            tx.onerror = (e) => reject(e.target.error || new Error('Ошибка записи скриншота'));
        }));
    }

    function getScreenshot(orderId) {
        return openDB().then(db => new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const req = tx.objectStore(STORE_NAME).get(String(orderId));
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = (e) => reject(e.target.error || new Error('Ошибка чтения скриншота'));
        }));
    }

    function deleteScreenshot(orderId) {
        return openDB().then(db => new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            tx.objectStore(STORE_NAME).delete(String(orderId));
            tx.oncomplete = () => resolve(true);
            tx.onerror = (e) => reject(e.target.error || new Error('Ошибка удаления скриншота'));
        }));
    }

    window.ppScreenshotStore = { saveScreenshot, getScreenshot, deleteScreenshot };

    // ===== Одноразовая миграция уже сохранённых скриншотов из localStorage в IndexedDB =====
    // Срабатывает автоматически при подключении файла на любой странице.
    // Идемпотентна: если мигрировать нечего, ничего не делает.
    (async function migrateScreenshotsToIndexedDB() {
        const keysToMigrate = ['pp_orders', 'pp_warehouse_orders'];
        for (const key of keysToMigrate) {
            let list;
            try {
                list = JSON.parse(localStorage.getItem(key) || '[]');
            } catch (e) {
                continue;
            }
            if (!Array.isArray(list) || list.length === 0) continue;

            let changed = false;
            for (const item of list) {
                if (item && item.screenshot_base64) {
                    try {
                        await saveScreenshot(item.id, item.screenshot_base64);
                        delete item.screenshot_base64;
                        item.has_screenshot = true;
                        changed = true;
                    } catch (e) {
                        console.error('Не удалось перенести скриншот заказа', item.id, e);
                    }
                }
            }

            if (changed) {
                try {
                    localStorage.setItem(key, JSON.stringify(list));
                    console.log('Скриншоты перенесены в IndexedDB для ключа', key, '— localStorage освобождён.');
                } catch (e) {
                    console.error('Не удалось сохранить localStorage после переноса скриншотов (' + key + '):', e);
                }
            }
        }
    })();
})(window);