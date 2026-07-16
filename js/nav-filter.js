(function() {
    const role = sessionStorage.getItem('profitprint_role');
    if (!role) return;

    const menuItems = document.querySelectorAll('.nav-menu li a, .sidebar a');

    const forbiddenForManager = ['otpcex.html', 'texkarta.html', 'index2.html', 'statuses.html',
        'sklad.html', 'rashodniki.html', 'bumaga.html', 'instrumenty.html', 'palety.html'];
    const allowedForDesigner  = ['clients.html', 'otpcex.html', 'texkarta.html', 'statuses.html',
        'index2.html', 'settings.html', 'sklad.html', 'rashodniki.html', 'bumaga.html',
        'instrumenty.html', 'palety.html'];
    const allowedForWarehouse = ['sklad.html', 'rashodniki.html', 'bumaga.html', 'instrumenty.html',
        'palety.html', 'settings.html'];

    const STATION_ROLES = ['pechat', 'flotorezka', 'stp', 'vysechka', 'tisnenie', 'kongrev',
        'uf_lak', 'rezka', 'skleyka', 'lamination', 'tiska', 'manual_work', 'obloj_remove', 'sklad_otgruzka'];
    const allowedForStation = ['texkarta.html', 'settings.html'];

    function allowedListFor(r) {
        if (r === 'designer')  return allowedForDesigner;
        if (r === 'warehouse') return allowedForWarehouse;
        if (STATION_ROLES.includes(r)) return allowedForStation;
        return null;
    }

    const allowed = allowedListFor(role);

    menuItems.forEach(link => {
        const href = link.getAttribute('href');
        if (!href || href === '#') return;
        const page = href.split('?')[0].split('/').pop().toLowerCase();

        let hide = false;
        if (role === 'manager') {
            hide = forbiddenForManager.includes(page);
        } else if (allowed) {
            hide = !allowed.includes(page);
        }

        if (hide) {
            const li = link.closest('li');
            if (li) li.style.setProperty('display', 'none', 'important');
            link.style.display = 'none';
        }
    });

    const skladGroup = document.getElementById('skladNavGroup');
    if (skladGroup && role !== 'designer') {
        skladGroup.style.setProperty('display', 'none', 'important');
    }

    function injectLogout() {
        const menu = document.querySelector('.nav-menu');
        if (!menu || document.getElementById('ppLogoutItem')) return;

        const user = sessionStorage.getItem('profitprint_user') || '';
        const infoLi = document.createElement('li');
        infoLi.id = 'ppAccountInfo';
        infoLi.style.cssText = 'margin-top:12px;padding:8px 14px;color:rgba(255,255,255,0.6);font-size:12px;border-top:1px solid rgba(255,255,255,0.12);';
        infoLi.textContent = 'Аккаунт: ' + user;
        menu.appendChild(infoLi);

        const li = document.createElement('li');
        li.id = 'ppLogoutItem';
        const a = document.createElement('a');
        a.href = '#';
        a.id = 'ppLogout';
        a.textContent = '🚪 Выйти';
        a.style.color = '#fecaca';
        a.addEventListener('click', function(e) {
            e.preventDefault();
            if (confirm('Выйти из аккаунта?')) {
                try { sessionStorage.clear(); } catch (_) {}
                window.location.href = 'login.html';
            }
        });
        li.appendChild(a);
        menu.appendChild(li);
    }

    if (document.querySelector('.nav-menu')) {
        injectLogout();
    } else {
        document.addEventListener('DOMContentLoaded', injectLogout);
    }
})();