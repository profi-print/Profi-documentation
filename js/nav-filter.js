(function() {
    const role = sessionStorage.getItem('profitprint_role');
    if (!role) return;

    const menuItems = document.querySelectorAll('.nav-menu li a, .sidebar a');

    // Все списки — в нижнем регистре, чтобы сравнение не зависело от написания href
    // (otpCex.html / otpcex.html, texKarta.html / texkarta.html).
    const forbiddenForManager = ['otpcex.html', 'texkarta.html', 'index2.html', 'statuses.html', 'sklad.html', 'rashodniki.html', 'bumaga.html', 'instrumenty.html', 'palety.html'];
    const allowedForDesigner  = ['clients.html', 'otpcex.html', 'texkarta.html', 'statuses.html', 'index2.html', 'settings.html', 'sklad.html', 'rashodniki.html', 'bumaga.html', 'instrumenty.html', 'palety.html'];
    const allowedForWarehouse = ['sklad.html', 'rashodniki.html', 'bumaga.html', 'instrumenty.html', 'palety.html', 'settings.html'];

    // Производственные станции видят в меню только техкарту и свои настройки.
    const STATION_ROLES = ['flotorezka', 'pechat', 'vysechka', 'tisnenie', 'rezka', 'skleyka', 'stp', 'lak', 'archish', 'sklad_otgruzka'];
    const allowedForStation = ['texkarta.html', 'settings.html'];

    function allowedListFor(r) {
        if (r === 'designer')  return allowedForDesigner;
        if (r === 'warehouse') return allowedForWarehouse;
        if (STATION_ROLES.includes(r)) return allowedForStation;
        return null; // manager обрабатывается через forbidden ниже
    }

    const allowed = allowedListFor(role);

    menuItems.forEach(link => {
        const href = link.getAttribute('href');
        if (!href) return;
        // Стрелка-переключатель подменю "Склад" (href="#") — управляется отдельно ниже.
        if (href === '#') return;
        const page = href.split('?')[0].split('/').pop().toLowerCase();

        let hide = false;
        if (role === 'manager') {
            hide = forbiddenForManager.includes(page);
        } else if (allowed) {
            hide = !allowed.includes(page);
        }

        if (hide) {
            link.closest('li')?.style.setProperty('display', 'none', 'important');
            link.style.display = 'none';
        }
    });

    // Группа "Склад" (аккордеон) — видна только дизайнеру.
    const skladGroup = document.getElementById('skladNavGroup');
    if (skladGroup && role !== 'designer') {
        skladGroup.style.setProperty('display', 'none', 'important');
    }

    // ===== Кнопка "Выйти" — добавляется автоматически в меню на всех страницах =====
    function injectLogout() {
        const menu = document.querySelector('.nav-menu');
        if (!menu || document.getElementById('ppLogoutItem')) return;

        // Имя текущего аккаунта — маленькой подписью над кнопкой выхода
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