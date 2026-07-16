(function() {
  const user = sessionStorage.getItem('profitprint_user');
  const role = sessionStorage.getItem('profitprint_role');
  if (!user || !role) { window.location.href = 'login.html'; return; }

  const currentPage = window.location.pathname.split('/').pop().toLowerCase();

  // Все производственные станции имеют одинаковый доступ: техкарта + свои настройки.
  const stationRule = { allowed: ['texkarta.html', 'settings.html'], defaultRedirect: 'texkarta.html' };

  const ACCESS = {
    manager: {
        forbidden: ['otpcex.html', 'texkarta.html', 'statuses.html', 'sklad.html', 'rashodniki.html', 'bumaga.html', 'instrumenty.html', 'palety.html'],
        defaultRedirect: 'index.html'
    },
    designer: {
        allowed: ['index2.html', 'clients.html', 'otpcex.html', 'texkarta.html', 'statuses.html', 'settings.html', 'sklad.html', 'rashodniki.html', 'bumaga.html', 'instrumenty.html', 'palety.html'],
        defaultRedirect: 'index2.html'
    },
    warehouse: {
        allowed: ['sklad.html', 'rashodniki.html', 'bumaga.html', 'instrumenty.html', 'palety.html', 'settings.html'],
        defaultRedirect: 'sklad.html'
    },

    // ===== Производственные станции =====
    flotorezka:     stationRule,
    pechat:         stationRule,
    vysechka:       stationRule,
    tisnenie:       stationRule,
    rezka:          stationRule,
    skleyka:        stationRule,
    stp:            stationRule,
    lak:            stationRule,
    archish:        stationRule,
    sklad_otgruzka: stationRule
  };

  const rules = ACCESS[role];
  if (!rules) { sessionStorage.clear(); window.location.href = 'login.html'; return; }

  // Сравниваем без учёта регистра, чтобы 'texKarta.html' в правилах совпадал с 'texkarta.html' из URL
  const forbidden = (rules.forbidden || []).map(p => p.toLowerCase());
  const allowed = rules.allowed ? rules.allowed.map(p => p.toLowerCase()) : null;

  if (forbidden.includes(currentPage)) {
    window.location.href = rules.defaultRedirect + '?error=access'; return;
  }
  if (allowed && !allowed.includes(currentPage)) {
    window.location.href = rules.defaultRedirect + '?error=access'; return;
  }
})();