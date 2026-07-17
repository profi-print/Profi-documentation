(function() {
  const user = sessionStorage.getItem('profitprint_user');
  const role = sessionStorage.getItem('profitprint_role');
  if (!user || !role) { window.location.href = 'login.html'; return; }

  const currentPage = window.location.pathname.split('/').pop().toLowerCase();

  // Все производственные станции могут смотреть статусы, техкарту и настройки
  const stationRule = { allowed: ['texkarta.html', 'settings.html', 'statuses.html'], defaultRedirect: 'texkarta.html' };

  const ACCESS = {
    manager: {
        forbidden: ['otpcex.html', 'texkarta.html', 'statuses.html', 'sklad.html',
                    'rashodniki.html', 'bumaga.html', 'instrumenty.html', 'palety.html'],
        defaultRedirect: 'index.html'
    },
    designer: {
        allowed: ['index2.html', 'clients.html', 'otpcex.html', 'texkarta.html',
                  'statuses.html', 'settings.html', 'sklad.html', 'rashodniki.html',
                  'bumaga.html', 'instrumenty.html', 'palety.html'],
        defaultRedirect: 'index2.html'
    },
    warehouse: {
        allowed: ['sklad.html', 'rashodniki.html', 'bumaga.html', 'instrumenty.html',
                  'palety.html', 'settings.html', 'statuses.html'],
        defaultRedirect: 'sklad.html'
    },
    pechat:           stationRule,
    flotorezka:       stationRule,
    stp:              stationRule,
    vysechka:         stationRule,
    tisnenie:         stationRule,
    kongrev:          stationRule,
    uf_lak:           stationRule,
    rezka:            stationRule,
    skleyka:          stationRule,
    lamination:       stationRule,
    tiska:            stationRule,
    manual_work:      stationRule,
    obloj_remove:     stationRule,
    sklad_otgruzka:   stationRule
  };

  const rules = ACCESS[role];
  if (!rules) { sessionStorage.clear(); window.location.href = 'login.html'; return; }

  const forbidden = (rules.forbidden || []).map(p => p.toLowerCase());
  const allowed = rules.allowed ? rules.allowed.map(p => p.toLowerCase()) : null;

  if (forbidden.includes(currentPage)) {
    window.location.href = rules.defaultRedirect + '?error=access'; return;
  }
  if (allowed && !allowed.includes(currentPage)) {
    window.location.href = rules.defaultRedirect + '?error=access'; return;
  }
})();