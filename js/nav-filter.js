(function() {
    const role = sessionStorage.getItem('profitprint_role');
    if (!role) return;

    // Селекторы пунктов меню в сайдбаре (подгоните под свою вёрстку)
    const menuItems = document.querySelectorAll('.nav-menu li a, .sidebar a'); // все ссылки в сайдбаре

    const forbiddenForManager = ['otpCex.html', 'texKarta.html', 'index2.html', 'statuses.html'];
    const allowedForDesigner = ['clients.html', 'otpCex.html', 'texKarta.html', 'statuses.html', 'index2.html'];

    menuItems.forEach(link => {
        const href = link.getAttribute('href');
        if (!href) return;

        // Убираем якоря и параметры
        const page = href.split('?')[0].split('/').pop();

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
        }
    });
})();