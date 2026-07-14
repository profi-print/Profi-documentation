(function() {
    const role = sessionStorage.getItem('profitprint_role');
    if (!role) return;

    const menuItems = document.querySelectorAll('.nav-menu li a, .sidebar a');

    // Все списки приводим к нижнему регистру заранее, чтобы сравнение не зависело
    // от того, с какими буквами (otpCex.html / otpcex.html) написан href в разметке.
    const forbiddenForManager = ['otpcex.html', 'texkarta.html', 'index2.html', 'statuses.html', 'sklad.html', 'rashodniki.html', 'bumaga.html', 'instrumenty.html', 'palety.html'];
    const allowedForDesigner = ['clients.html', 'otpcex.html', 'texkarta.html', 'statuses.html', 'index2.html', 'settings.html'];
    const allowedForWarehouse = ['sklad.html', 'rashodniki.html', 'bumaga.html', 'instrumenty.html', 'palety.html', 'settings.html'];

    menuItems.forEach(link => {
        const href = link.getAttribute('href');
        if (!href) return;
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
        }
    });
})();