(function() {
  const user = sessionStorage.getItem('profitprint_user');
  const role = sessionStorage.getItem('profitprint_role');
  if (!user || !role) { window.location.href = 'login.html'; return; }
  const currentPage = window.location.pathname.split('/').pop().toLowerCase();
  const ACCESS = {
    manager: { forbidden: ['otpcex.html', 'texkarta.html', 'statuses.html'] },
    designer: { allowed: ['index2.html', 'clients.html', 'otpcex.html', 'texkarta.html', 'statuses.html', 'settings.html'] }
  };
  const rules = ACCESS[role];
  if (!rules) { sessionStorage.clear(); window.location.href = 'login.html'; return; }
  if (rules.forbidden && rules.forbidden.includes(currentPage)) {
    window.location.href = 'dashboard.html?error=access'; return;
  }
  if (rules.allowed && !rules.allowed.includes(currentPage)) {
    window.location.href = 'dashboard.html?error=access'; return;
  }
})();