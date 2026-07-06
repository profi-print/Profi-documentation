(function() {
    const user = sessionStorage.getItem('profitprint_user');
    if (!user) return;
    const PREFIX = user + '_';
    const APP_KEYS = ['clients', 'orders', 'invoices', 'products', 'reconciliations', 'backups', 'payments', 'print_orders'];
    const origGet = localStorage.getItem.bind(localStorage);
    const origSet = localStorage.setItem.bind(localStorage);
    const origRem = localStorage.removeItem.bind(localStorage);
    localStorage.getItem = function(key) {
        return APP_KEYS.includes(key) ? origGet(PREFIX + key) : origGet(key);
    };
    localStorage.setItem = function(key, value) {
        if (APP_KEYS.includes(key)) return origSet(PREFIX + key, value);
        return origSet(key, value);
    };
    localStorage.removeItem = function(key) {
        if (APP_KEYS.includes(key)) return origRem(PREFIX + key);
        return origRem(key);
    };
})();