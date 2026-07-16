/*
 * Клиент для связи фронтенда с сервером-хранилищем ProfitPrint.
 * Подключить на страницах:  <script src="pp-storage-client.js"></script>
 * Затем использовать глобальный объект  PPStorage.
 *
 * Если фронтенд открывается НЕ с того же сервера — впишите адрес сервера в BASE ниже.
 */
window.PPStorage = (function () {
  // Адрес сервера-хранилища. Если фронтенд отдаётся тем же контейнером — оставьте ''.
  // Иначе, например:  const BASE = 'http://192.168.1.50:8080';
  const BASE  = '';
  const TOKEN = ''; // если на сервере задан AUTH_TOKEN — впишите его сюда

  function headers(json) {
    const h = {};
    if (json) h['Content-Type'] = 'application/json';
    if (TOKEN) h['X-Auth-Token'] = TOKEN;
    return h;
  }
  async function jreq(method, url, body) {
    const res = await fetch(BASE + url, {
      method,
      headers: headers(!!body),
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.statusText);
    return res.status === 204 ? null : res.json();
  }

  return {
    // ── Техкарты ──
    listTechcards:  ()        => jreq('GET',    '/api/techcards'),
    getTechcard:    (id)      => jreq('GET',    '/api/techcards/' + encodeURIComponent(id)),
    saveTechcard:   (id, obj) => jreq('PUT',    '/api/techcards/' + encodeURIComponent(id), obj),
    deleteTechcard: (id)      => jreq('DELETE', '/api/techcards/' + encodeURIComponent(id)),

    // ── PDF / вложения к техкарте ──
    listPdfs:  (id)   => jreq('GET', '/api/techcards/' + encodeURIComponent(id) + '/pdf'),
    uploadPdf: (id, file) => {
      const fd = new FormData();
      fd.append('file', file);
      const h = {}; if (TOKEN) h['X-Auth-Token'] = TOKEN;
      return fetch(BASE + '/api/techcards/' + encodeURIComponent(id) + '/pdf', { method: 'POST', headers: h, body: fd })
        .then(r => r.ok ? r.json() : r.json().then(e => { throw new Error(e.error || r.statusText); }));
    },
    pdfUrl:    (id, name) => BASE + '/pdf/' + encodeURIComponent(id) + '/' + encodeURIComponent(name),
    deletePdf: (id, name) => jreq('DELETE', '/api/techcards/' + encodeURIComponent(id) + '/pdf/' + encodeURIComponent(name)),

    // ── Склад ──
    listWarehouseSections: ()              => jreq('GET',    '/api/warehouse'),
    listWarehouse:  (section)              => jreq('GET',    '/api/warehouse/' + encodeURIComponent(section)),
    getWarehouse:   (section, id)          => jreq('GET',    '/api/warehouse/' + encodeURIComponent(section) + '/' + encodeURIComponent(id)),
    saveWarehouse:  (section, id, obj)     => jreq('PUT',    '/api/warehouse/' + encodeURIComponent(section) + '/' + encodeURIComponent(id), obj),
    deleteWarehouse:(section, id)          => jreq('DELETE', '/api/warehouse/' + encodeURIComponent(section) + '/' + encodeURIComponent(id)),

    // ── Прочие данные (замена localStorage) ──
    getData:  (key)      => jreq('GET', '/api/data/' + encodeURIComponent(key)).catch(() => null),
    setData:  (key, obj) => jreq('PUT', '/api/data/' + encodeURIComponent(key), obj),
    listData: ()         => jreq('GET', '/api/data'),
  };
})();