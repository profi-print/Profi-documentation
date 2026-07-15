(function() {
    const role = sessionStorage.getItem('profitprint_role');
    if (!role) return;

    const menuItems = document.querySelectorAll('.nav-menu li a, .sidebar a');

    // Все списки приводим к нижнему регистру заранее, чтобы сравнение не зависело
    // от того, с какими буквами (otpCex.html / otpcex.html) написан href в разметке.
    const forbiddenForManager = ['otpcex.html', 'texkarta.html', 'index2.html', 'statuses.html', 'sklad.html', 'rashodniki.html', 'bumaga.html', 'instrumenty.html', 'palety.html'];
    const allowedForDesigner = ['clients.html', 'otpcex.html', 'texkarta.html', 'statuses.html', 'index2.html', 'settings.html', 'sklad.html', 'rashodniki.html', 'bumaga.html', 'instrumenty.html', 'palety.html'];
    const allowedForWarehouse = ['sklad.html', 'rashodniki.html', 'bumaga.html', 'instrumenty.html', 'palety.html', 'settings.html'];
    const allowedForFlotorezka = ['texkarta.html'];
    const allowedForPechat = ['texkarta.html'];

    menuItems.forEach(link => {
        const href = link.getAttribute('href');
        if (!href) return;
        // Стрелочка-переключатель подменю "Склад" (href="#") видимостью управляется
        // отдельно ниже (по группе), а не как обычная ссылка на страницу.
        if (href === '#') return;
        const page = href.split('?')[0].split('/').pop().toLowerCase();

        if (role === 'manager') {
            if (forbiddenForManager.includes(page)) {
                link.closest('li')?.style.setProperty('display', 'none', 'important');
                link.style.display = 'none';
            }
        } else if (role === 'designer') {
            if (!allowedForDesigner.includes(page)) {
                link.closest('li')?.style.setProperty('display', 'none', 'important');
                link.style.display = 'none';
            }
        } else if (role === 'warehouse') {
            if (!allowedForWarehouse.includes(page)) {
                link.closest('li')?.style.setProperty('display', 'none', 'important');
                link.style.display = 'none';
            }
        } else if (role === 'flotorezka') {
            if (!allowedForFlotorezka.includes(page)) {
                link.closest('li')?.style.setProperty('display', 'none', 'important');
                link.style.display = 'none';
            }
        } else if (role === 'pechat') {
            if (!allowedForPechat.includes(page)) {
                link.closest('li')?.style.setProperty('display', 'none', 'important');
                link.style.display = 'none';
            }
        }
    });

    // Группа "Склад" (аккордеон) в общем синем сайдбаре — видна только Диёру (designer).
    // Менеджеру скрываем целиком (все страницы склада ему и так запрещены индивидуально,
    // но без этой строчки родительский пункт "Склад" остался бы висеть пустым).
    const skladGroup = document.getElementById('skladNavGroup');
    if (skladGroup && role !== 'designer') {
        skladGroup.style.setProperty('display', 'none', 'important');
    }
})();