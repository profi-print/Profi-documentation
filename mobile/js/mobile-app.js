/* ============================================
   ProfitPrint Mobile App
   ============================================ */
(function () {
    'use strict';

    // ─── Config ───
    const ACCOUNTS = [
        { login: 'Bekzod', password: '0505', role: 'manager', name: 'Бекзод' },
        { login: 'Diyor', password: 'diyorbek', role: 'designer', name: 'Дийор' }
    ];

    const STATUS_STEPS = [
        { key: 'design', label: 'Дизайн', icon: '🎨' },
        { key: 'approval', label: 'Утверждение', icon: '✅' },
        { key: 'print', label: 'Печать', icon: '🖨️' },
        { key: 'lamination', label: 'Ламинация', icon: '📄' },
        { key: 'cutting', label: 'Резка', icon: '✂️' },
        { key: 'gluing', label: 'Склейка', icon: '📦' },
        { key: 'ready', label: 'Готово', icon: '🏁' }
    ];

    const MANAGER_MODULES = [
        { id: 'orders', icon: '📋', label: 'Заказы' },
        { id: 'invoices', icon: '🧾', label: 'Накладные' },
        { id: 'clients', icon: '👥', label: 'Контрагенты' },
        { id: 'products', icon: '📦', label: 'Продукты' },
        { id: 'reconciliations', icon: '📊', label: 'Акты сверки' },
        { id: 'payments', icon: '💰', label: 'Платежи' },
        { id: 'production', icon: '🏭', label: 'Производство' },
        { id: 'trash', icon: '🗑️', label: 'Корзина' }
    ];

    const DESIGNER_MODULES = [
        { id: 'workshop', icon: '🔧', label: 'В цех' },
        { id: 'techcards', icon: '📑', label: 'Техкарты' },
        { id: 'statuses', icon: '📈', label: 'Статусы' },
        { id: 'clients', icon: '👥', label: 'Контрагенты' }
    ];

    const NAV_MANAGER = [
        { id: 'home', icon: '🏠', label: 'Главная' },
        { id: 'orders', icon: '📋', label: 'Заказы' },
        { id: 'invoices', icon: '🧾', label: 'Накладные' },
        { id: 'more', icon: '☰', label: 'Ещё' }
    ];

    const NAV_DESIGNER = [
        { id: 'home', icon: '🏠', label: 'Главная' },
        { id: 'workshop', icon: '🔧', label: 'В цех' },
        { id: 'statuses', icon: '📈', label: 'Статусы' },
        { id: 'more', icon: '☰', label: 'Ещё' }
    ];

    // ─── State ───
    let currentView = 'home';
    let viewStack = [];
    let searchQuery = '';
    let filterStatus = 'all';

    // ─── DOM refs ───
    const $ = (sel) => document.querySelector(sel);
    const screenLogin = $('#screen-login');
    const screenApp = $('#screen-app');
    const appContent = $('#app-content');
    const headerTitle = $('#header-title');
    const headerSubtitle = $('#header-subtitle');
    const bottomNav = $('#bottom-nav');
    const btnBack = $('#btn-back');
    const fab = $('#fab');
    const modalOverlay = $('#modal-overlay');
    const modalTitle = $('#modal-title');
    const modalBody = $('#modal-body');
    const modalFooter = $('#modal-footer');

    // ─── Auth ───
    function getUser() {
        return {
            login: sessionStorage.getItem('profitprint_user'),
            role: sessionStorage.getItem('profitprint_role'),
            name: sessionStorage.getItem('profitprint_name') || 'Пользователь'
        };
    }

    function isLoggedIn() {
        return !!sessionStorage.getItem('profitprint_user');
    }

    function login(loginVal, password) {
        const acc = ACCOUNTS.find(a => a.login === loginVal && a.password === password);
        if (!acc) return false;
        sessionStorage.setItem('profitprint_user', acc.login);
        sessionStorage.setItem('profitprint_role', acc.role);
        sessionStorage.setItem('profitprint_name', acc.name);
        return true;
    }

    function logout() {
        sessionStorage.clear();
        showScreen('login');
    }

    // ─── Theme ───
    function setTheme(mode) {
        document.body.className = mode;
        localStorage.setItem('theme', mode);
        $('#theme-icon').textContent = mode === 'dark' ? '☀️' : '🌙';
    }

    function initTheme() {
        setTheme(localStorage.getItem('theme') || 'light');
    }

    // ─── Navigation ───
    function showScreen(name) {
        screenLogin.classList.toggle('active', name === 'login');
        screenApp.classList.toggle('active', name === 'app');
    }

    function navigate(view, title, subtitle = '', pushStack = true) {
        if (pushStack && currentView !== view) viewStack.push(currentView);
        currentView = view;
        searchQuery = '';
        filterStatus = 'all';
        headerTitle.textContent = title;
        headerSubtitle.textContent = subtitle;
        btnBack.hidden = viewStack.length === 0 || ['home', 'orders', 'invoices', 'workshop', 'statuses', 'more'].includes(view);
        updateFab();
        updateNavActive();
        renderView(view);
        appContent.scrollTop = 0;
    }

    function goBack() {
        if (viewStack.length > 0) {
            const prev = viewStack.pop();
            navigate(prev, getViewTitle(prev), '', false);
        }
    }

    function getViewTitle(view) {
        const titles = {
            home: 'Главная', orders: 'Заказы', invoices: 'Накладные',
            clients: 'Контрагенты', products: 'Продукты',
            reconciliations: 'Акты сверки', payments: 'Платежи',
            production: 'Производство', workshop: 'Отправка в цех',
            techcards: 'Техкарты', statuses: 'Статусы',
            trash: 'Корзина', more: 'Ещё', settings: 'Настройки'
        };
        return titles[view] || view;
    }

    function buildNav() {
        const user = getUser();
        const items = user.role === 'designer' ? NAV_DESIGNER : NAV_MANAGER;
        bottomNav.innerHTML = items.map(n =>
            `<button class="nav-item" data-nav="${n.id}">
                <span class="nav-icon">${n.icon}</span>
                <span>${n.label}</span>
            </button>`
        ).join('');
        bottomNav.querySelectorAll('.nav-item').forEach(btn => {
            btn.addEventListener('click', () => {
                viewStack = [];
                navigate(btn.dataset.nav, getViewTitle(btn.dataset.nav), '', false);
            });
        });
    }

    function updateNavActive() {
        bottomNav.querySelectorAll('.nav-item').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.nav === currentView);
        });
    }

    function updateFab() {
        const fabViews = ['orders', 'clients', 'products', 'invoices', 'payments', 'workshop'];
        fab.hidden = !fabViews.includes(currentView);
    }

    // ─── UI Helpers ───
    function toast(msg, type = 'success') {
        const el = document.createElement('div');
        el.className = `toast ${type}`;
        el.textContent = msg;
        $('#toast-container').appendChild(el);
        setTimeout(() => el.remove(), 3000);
    }

    function openModal(title, bodyHtml, footerHtml = '') {
        modalTitle.textContent = title;
        modalBody.innerHTML = bodyHtml;
        modalFooter.innerHTML = footerHtml;
        modalOverlay.hidden = false;
    }

    function closeModal() {
        modalOverlay.hidden = true;
    }

    function calcTotal(items) {
        if (!Array.isArray(items)) return 0;
        return items.reduce((s, i) => s + (parseFloat(i.cost) || parseFloat(i.price) * parseFloat(i.quantity) || 0), 0);
    }

    function getClientName(id) {
        const c = Storage.getClient(id);
        return c ? c.name : '—';
    }

    function statusBadge(status) {
        const map = {
            'В работе': 'badge-yellow',
            'Проведён': 'badge-blue',
            'Завершён': 'badge-green'
        };
        return `<span class="badge ${map[status] || 'badge-gray'}">${escapeHtml(status || '—')}</span>`;
    }

    // ─── Render Views ───
    function renderView(view) {
        const renderers = {
            home: renderHome,
            orders: renderOrders,
            invoices: renderInvoices,
            clients: renderClients,
            products: renderProducts,
            reconciliations: renderReconciliations,
            payments: renderPayments,
            production: renderProduction,
            workshop: renderWorkshop,
            techcards: renderTechcards,
            statuses: renderStatuses,
            trash: renderTrash,
            more: renderMore,
            settings: renderSettings
        };
        const fn = renderers[view];
        if (fn) fn();
        else appContent.innerHTML = '<div class="empty-state"><div class="empty-icon">🔍</div><h3>Раздел не найден</h3></div>';
    }

    // ─── HOME ───
    function renderHome() {
        const user = getUser();
        const clients = Storage.getClients();
        const products = Storage.getProducts();
        const orders = Storage.getOrders();
        const invoices = Storage.getInvoices();
        const payments = Storage.getPayments();
        const recons = Storage.getReconciliations();
        const rates = JSON.parse(localStorage.getItem('pp_currency_rates') || '{"CNY":12.5,"KZT":0.024,"EUR":12000}');

        const totalReal = invoices.reduce((s, inv) => s + calcTotal(inv.items), 0);
        const totalPay = payments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
        const totalDebt = totalReal - totalPay;

        const modules = user.role === 'designer' ? DESIGNER_MODULES : MANAGER_MODULES;
        const roleLabel = user.role === 'manager' ? 'Менеджер' : 'Дизайнер';

        appContent.innerHTML = `
            <div class="greeting-card">
                <h2>Привет, ${escapeHtml(user.name)}!</h2>
                <p>${new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                <span class="greeting-role">${roleLabel}</span>
            </div>

            <div class="rates-bar">
                <div class="rate-chip">🇨🇳 CNY <strong>${rates.CNY}</strong></div>
                <div class="rate-chip">🇰🇿 KZT <strong>${rates.KZT}</strong></div>
                <div class="rate-chip">🇪🇺 EUR <strong>${rates.EUR}</strong></div>
            </div>

            ${user.role === 'manager' ? `
            <div class="stats-grid">
                <div class="stat-card highlight">
                    <div class="stat-label">Долг</div>
                    <div class="stat-value small">${formatCurrency(totalDebt)}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Реализация</div>
                    <div class="stat-value small">${formatCurrency(totalReal)}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Заказы</div>
                    <div class="stat-value">${orders.length}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Клиенты</div>
                    <div class="stat-value">${clients.length}</div>
                </div>
            </div>` : `
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-label">В цехе</div>
                    <div class="stat-value">${getPrintOrders().length}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Техкарты</div>
                    <div class="stat-value">${Storage.getTechCards().length}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Клиенты</div>
                    <div class="stat-value">${clients.length}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Заказы</div>
                    <div class="stat-value">${orders.length}</div>
                </div>
            </div>`}

            <div class="section-title">Разделы</div>
            <div class="module-grid">
                ${modules.map(m => `
                    <div class="module-card" data-module="${m.id}">
                        <span class="module-icon">${m.icon}</span>
                        <span class="module-label">${m.label}</span>
                    </div>
                `).join('')}
            </div>

            <div class="section-title">Последние заказы</div>
            ${renderOrderCards(orders.slice(-3).reverse())}
        `;

        appContent.querySelectorAll('[data-module]').forEach(el => {
            el.addEventListener('click', () => navigate(el.dataset.module, getViewTitle(el.dataset.module)));
        });
        bindCardClicks();
    }

    function renderOrderCards(orders) {
        if (!orders.length) return '<div class="empty-state"><p>Нет заказов</p></div>';
        return orders.map(o => {
            const total = calcTotal(o.items);
            return `<div class="card" data-order-id="${escapeHtml(o.id)}">
                <div class="card-header">
                    <div>
                        <div class="card-title">№${escapeHtml(o.number)}</div>
                        <div class="card-subtitle">${escapeHtml(getClientName(o.clientId))}</div>
                    </div>
                    <div class="card-amount">${formatCurrency(total)}</div>
                </div>
                <div class="card-footer">
                    <span>${formatDate(o.date)}</span>
                    ${statusBadge(o.status)}
                </div>
            </div>`;
        }).join('');
    }

    // ─── ORDERS ───
    function renderOrders() {
        let orders = Storage.getOrders().slice().reverse();
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            orders = orders.filter(o =>
                (o.number || '').toLowerCase().includes(q) ||
                getClientName(o.clientId).toLowerCase().includes(q)
            );
        }
        if (filterStatus !== 'all') {
            orders = orders.filter(o => o.status === filterStatus);
        }

        appContent.innerHTML = `
            <div class="search-bar">
                <input type="search" placeholder="Поиск заказов..." value="${escapeHtml(searchQuery)}" id="search-input">
            </div>
            <div class="filter-chips">
                <button class="chip ${filterStatus === 'all' ? 'active' : ''}" data-filter="all">Все</button>
                <button class="chip ${filterStatus === 'В работе' ? 'active' : ''}" data-filter="В работе">В работе</button>
                <button class="chip ${filterStatus === 'Проведён' ? 'active' : ''}" data-filter="Проведён">Проведён</button>
                <button class="chip ${filterStatus === 'Завершён' ? 'active' : ''}" data-filter="Завершён">Завершён</button>
            </div>
            ${orders.length ? renderOrderCards(orders) : '<div class="empty-state"><div class="empty-icon">📋</div><h3>Нет заказов</h3><p>Создайте первый заказ</p></div>'}
        `;

        bindSearch();
        bindFilters();
        bindCardClicks();
    }

    function showOrderDetail(id) {
        const order = Storage.getOrder(id);
        if (!order) return;
        const total = calcTotal(order.items);
        const items = (order.items || []).map(i => `
            <tr><td>${escapeHtml(i.name)}</td><td>${i.quantityOrdered || i.quantity || '—'}</td><td>${formatCurrency(i.price)}</td><td>${formatCurrency(i.cost)}</td></tr>
        `).join('');

        openModal(`Заказ №${order.number}`, `
            <div class="detail-section">
                <div class="detail-row"><span class="label">Дата</span><span class="value">${formatDate(order.date)}</span></div>
                <div class="detail-row"><span class="label">Клиент</span><span class="value">${escapeHtml(getClientName(order.clientId))}</span></div>
                <div class="detail-row"><span class="label">Статус</span><span class="value">${statusBadge(order.status)}</span></div>
                <div class="detail-row"><span class="label">Завершение</span><span class="value">${formatDate(order.completionDate)}</span></div>
                <div class="detail-row"><span class="label">Итого</span><span class="value" style="color:var(--primary)">${formatCurrency(total)}</span></div>
            </div>
            <div class="detail-section">
                <h4>Позиции (${(order.items || []).length})</h4>
                <div class="items-table-wrap">
                    <table class="items-table">
                        <thead><tr><th>Наименование</th><th>Кол-во</th><th>Цена</th><th>Сумма</th></tr></thead>
                        <tbody>${items || '<tr><td colspan="4">Нет позиций</td></tr>'}</tbody>
                    </table>
                </div>
            </div>
        `, `
            <button class="btn-danger btn-sm" id="modal-delete-order">Удалить</button>
            <button class="btn-secondary" id="modal-close-btn">Закрыть</button>
        `);

        $('#modal-delete-order')?.addEventListener('click', async () => {
            if (confirm('Переместить заказ в корзину?')) {
                await Storage.deleteOrder(id);
                closeModal();
                toast('Заказ удалён');
                renderView(currentView);
            }
        });
        $('#modal-close-btn')?.addEventListener('click', closeModal);
    }

    // ─── INVOICES ───
    function renderInvoices() {
        let invoices = Storage.getInvoices().slice().reverse();
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            invoices = invoices.filter(i =>
                (i.number || '').toLowerCase().includes(q) ||
                getClientName(i.clientId).toLowerCase().includes(q)
            );
        }

        appContent.innerHTML = `
            <div class="search-bar">
                <input type="search" placeholder="Поиск накладных..." value="${escapeHtml(searchQuery)}" id="search-input">
            </div>
            ${invoices.length ? invoices.map(inv => {
                const total = calcTotal(inv.items);
                return `<div class="card" data-invoice-id="${escapeHtml(inv.id)}">
                    <div class="card-header">
                        <div>
                            <div class="card-title">№${escapeHtml(inv.number)}</div>
                            <div class="card-subtitle">${escapeHtml(getClientName(inv.clientId))}</div>
                        </div>
                        <div class="card-amount">${formatCurrency(total)}</div>
                    </div>
                    <div class="card-footer"><span>${formatDate(inv.date)}</span></div>
                </div>`;
            }).join('') : '<div class="empty-state"><div class="empty-icon">🧾</div><h3>Нет накладных</h3></div>'}
        `;

        bindSearch();
        appContent.querySelectorAll('[data-invoice-id]').forEach(el => {
            el.addEventListener('click', () => showInvoiceDetail(el.dataset.invoiceId));
        });
    }

    function showInvoiceDetail(id) {
        const inv = Storage.getInvoice(id);
        if (!inv) return;
        const total = calcTotal(inv.items);
        const items = (inv.items || []).map(i => `
            <tr><td>${escapeHtml(i.name)}</td><td>${i.quantity}</td><td>${formatCurrency(i.price)}</td><td>${formatCurrency(i.cost)}</td></tr>
        `).join('');

        openModal(`Накладная №${inv.number}`, `
            <div class="detail-section">
                <div class="detail-row"><span class="label">Дата</span><span class="value">${formatDate(inv.date)}</span></div>
                <div class="detail-row"><span class="label">Клиент</span><span class="value">${escapeHtml(getClientName(inv.clientId))}</span></div>
                <div class="detail-row"><span class="label">Итого</span><span class="value" style="color:var(--primary)">${formatCurrency(total)}</span></div>
            </div>
            <div class="detail-section">
                <h4>Позиции</h4>
                <div class="items-table-wrap">
                    <table class="items-table">
                        <thead><tr><th>Наименование</th><th>Кол-во</th><th>Цена</th><th>Сумма</th></tr></thead>
                        <tbody>${items}</tbody>
                    </table>
                </div>
            </div>
        `, `<button class="btn-secondary btn-full" id="modal-close-btn">Закрыть</button>`);
        $('#modal-close-btn')?.addEventListener('click', closeModal);
    }

    // ─── CLIENTS ───
    function renderClients() {
        let clients = Storage.getClients();
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            clients = clients.filter(c => (c.name || '').toLowerCase().includes(q) || (c.phone || '').includes(q));
        }

        appContent.innerHTML = `
            <div class="search-bar">
                <input type="search" placeholder="Поиск контрагентов..." value="${escapeHtml(searchQuery)}" id="search-input">
            </div>
            <div class="list-group">
                ${clients.length ? clients.map(c => `
                    <div class="list-item" data-client-id="${escapeHtml(c.id)}">
                        <div class="list-item-icon">👤</div>
                        <div class="list-item-content">
                            <div class="list-item-title">${escapeHtml(c.name)}</div>
                            <div class="list-item-subtitle">${escapeHtml(c.type || 'Контрагент')} · ${escapeHtml(c.phone || c.contact || '—')}</div>
                        </div>
                        <span class="list-item-arrow">›</span>
                    </div>
                `).join('') : '<div class="empty-state"><div class="empty-icon">👥</div><h3>Нет контрагентов</h3></div>'}
            </div>
        `;

        bindSearch();
        appContent.querySelectorAll('[data-client-id]').forEach(el => {
            el.addEventListener('click', () => showClientDetail(el.dataset.clientId));
        });
    }

    function showClientDetail(id) {
        const c = Storage.getClient(id);
        if (!c) return;
        openModal(c.name, `
            <div class="detail-section">
                <div class="detail-row"><span class="label">Тип</span><span class="value">${escapeHtml(c.type || '—')}</span></div>
                <div class="detail-row"><span class="label">Телефон</span><span class="value">${escapeHtml(c.phone || c.contact || '—')}</span></div>
                <div class="detail-row"><span class="label">Email</span><span class="value">${escapeHtml(c.email || '—')}</span></div>
                <div class="detail-row"><span class="label">ИНН</span><span class="value">${escapeHtml(c.inn || '—')}</span></div>
                <div class="detail-row"><span class="label">Адрес</span><span class="value">${escapeHtml(c.address || '—')}</span></div>
            </div>
        `, `
            <button class="btn-danger btn-sm" id="modal-delete-client">Удалить</button>
            <button class="btn-secondary" id="modal-close-btn">Закрыть</button>
        `);
        $('#modal-delete-client')?.addEventListener('click', async () => {
            if (confirm('Удалить контрагента?')) {
                await Storage.deleteClient(id);
                closeModal();
                toast('Контрагент удалён');
                renderView(currentView);
            }
        });
        $('#modal-close-btn')?.addEventListener('click', closeModal);
    }

    function showAddClientForm() {
        openModal('Новый контрагент', `
            <div class="form-group"><label>Название *</label><input class="form-input" id="f-client-name" placeholder="ООО Компания"></div>
            <div class="form-group"><label>Тип</label>
                <select class="form-select" id="f-client-type">
                    <option>Юр. лицо</option><option>Физ. лицо</option><option>ИП</option>
                </select>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Телефон</label><input class="form-input" id="f-client-phone" type="tel"></div>
                <div class="form-group"><label>Email</label><input class="form-input" id="f-client-email" type="email"></div>
            </div>
            <div class="form-group"><label>Адрес</label><input class="form-input" id="f-client-address"></div>
        `, `<button class="btn-primary" id="modal-save-client">Сохранить</button>`);

        $('#modal-save-client').addEventListener('click', async () => {
            const name = $('#f-client-name').value.trim();
            if (!name) { toast('Введите название', 'error'); return; }
            await Storage.saveClient({
                id: generateId(),
                name,
                type: $('#f-client-type').value,
                phone: $('#f-client-phone').value.trim(),
                email: $('#f-client-email').value.trim(),
                address: $('#f-client-address').value.trim(),
                buyer: true, supplier: false
            });
            closeModal();
            toast('Контрагент создан');
            renderView(currentView);
        });
    }

    // ─── PRODUCTS ───
    function renderProducts() {
        let products = Storage.getProducts();
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            products = products.filter(p => (p.name || '').toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q));
        }

        appContent.innerHTML = `
            <div class="search-bar">
                <input type="search" placeholder="Поиск продуктов..." value="${escapeHtml(searchQuery)}" id="search-input">
            </div>
            <div class="list-group">
                ${products.length ? products.map(p => `
                    <div class="list-item" data-product-id="${escapeHtml(p.id)}">
                        <div class="list-item-icon">📦</div>
                        <div class="list-item-content">
                            <div class="list-item-title">${escapeHtml(p.name)}</div>
                            <div class="list-item-subtitle">${escapeHtml(p.sku || '—')} · ${formatCurrency(p.price)}</div>
                        </div>
                        <span class="list-item-arrow">›</span>
                    </div>
                `).join('') : '<div class="empty-state"><div class="empty-icon">📦</div><h3>Нет продуктов</h3></div>'}
            </div>
        `;

        bindSearch();
        appContent.querySelectorAll('[data-product-id]').forEach(el => {
            el.addEventListener('click', () => {
                const p = Storage.getProduct(el.dataset.productId);
                if (!p) return;
                openModal(p.name, `
                    <div class="detail-row"><span class="label">Артикул</span><span class="value">${escapeHtml(p.sku)}</span></div>
                    <div class="detail-row"><span class="label">Цена</span><span class="value">${formatCurrency(p.price)}</span></div>
                    <div class="detail-row"><span class="label">Ед. изм.</span><span class="value">${escapeHtml(p.unit || 'шт')}</span></div>
                    <div class="detail-row"><span class="label">На складе</span><span class="value">${p.quantity || 0}</span></div>
                `, `<button class="btn-secondary btn-full" id="modal-close-btn">Закрыть</button>`);
                $('#modal-close-btn')?.addEventListener('click', closeModal);
            });
        });
    }

    function showAddProductForm() {
        openModal('Новый продукт', `
            <div class="form-group"><label>Артикул *</label><input class="form-input" id="f-product-sku"></div>
            <div class="form-group"><label>Наименование *</label><input class="form-input" id="f-product-name"></div>
            <div class="form-row">
                <div class="form-group"><label>Цена</label><input class="form-input" id="f-product-price" type="number" inputmode="decimal"></div>
                <div class="form-group"><label>Ед. изм.</label><input class="form-input" id="f-product-unit" value="шт"></div>
            </div>
        `, `<button class="btn-primary" id="modal-save-product">Сохранить</button>`);

        $('#modal-save-product').addEventListener('click', async () => {
            const sku = $('#f-product-sku').value.trim();
            const name = $('#f-product-name').value.trim();
            if (!sku || !name) { toast('Заполните обязательные поля', 'error'); return; }
            await Storage.saveProduct({
                id: generateId(), sku, name,
                price: parseFloat($('#f-product-price').value) || 0,
                unit: $('#f-product-unit').value.trim() || 'шт',
                quantity: 0
            });
            closeModal();
            toast('Продукт создан');
            renderView(currentView);
        });
    }

    // ─── RECONCILIATIONS ───
    function renderReconciliations() {
        const recons = Storage.getReconciliations().slice().reverse();
        appContent.innerHTML = recons.length ? recons.map(r => `
            <div class="card" data-recon-id="${escapeHtml(r.id)}">
                <div class="card-header">
                    <div>
                        <div class="card-title">Акт №${escapeHtml(r.number)}</div>
                        <div class="card-subtitle">${escapeHtml(getClientName(r.clientId))}</div>
                    </div>
                </div>
                <div class="card-footer">
                    <span>${formatDate(r.periodFrom)} — ${formatDate(r.periodTo)}</span>
                </div>
            </div>
        `).join('') : '<div class="empty-state"><div class="empty-icon">📊</div><h3>Нет актов сверки</h3></div>';

        appContent.querySelectorAll('[data-recon-id]').forEach(el => {
            el.addEventListener('click', () => {
                const r = Storage.getReconciliation(el.dataset.reconId);
                if (!r) return;
                const ending = (r.items || []).length ? r.items[r.items.length - 1].endingBalance : 0;
                openModal(`Акт №${r.number}`, `
                    <div class="detail-row"><span class="label">Клиент</span><span class="value">${escapeHtml(getClientName(r.clientId))}</span></div>
                    <div class="detail-row"><span class="label">Период</span><span class="value">${formatDate(r.periodFrom)} — ${formatDate(r.periodTo)}</span></div>
                    <div class="detail-row"><span class="label">Конечный остаток</span><span class="value" style="color:var(--primary)">${formatCurrency(ending)}</span></div>
                `, `<button class="btn-secondary btn-full" id="modal-close-btn">Закрыть</button>`);
                $('#modal-close-btn')?.addEventListener('click', closeModal);
            });
        });
    }

    // ─── PAYMENTS ───
    function renderPayments() {
        const payments = Storage.getPayments().slice().reverse();
        appContent.innerHTML = payments.length ? payments.map(p => `
            <div class="card">
                <div class="card-header">
                    <div>
                        <div class="card-title">${escapeHtml(getClientName(p.clientId))}</div>
                        <div class="card-subtitle">${escapeHtml(p.description || 'Платёж')}</div>
                    </div>
                    <div class="card-amount" style="color:var(--success)">${formatCurrency(p.amount)}</div>
                </div>
                <div class="card-footer"><span>${formatDate(p.date)}</span></div>
            </div>
        `).join('') : '<div class="empty-state"><div class="empty-icon">💰</div><h3>Нет платежей</h3></div>';
    }

    function showAddPaymentForm() {
        const clients = Storage.getClients();
        openModal('Новый платёж', `
            <div class="form-group"><label>Клиент</label>
                <select class="form-select" id="f-payment-client">
                    ${clients.map(c => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.name)}</option>`).join('')}
                </select>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Сумма *</label><input class="form-input" id="f-payment-amount" type="number" inputmode="decimal"></div>
                <div class="form-group"><label>Дата</label><input class="form-input" id="f-payment-date" type="date" value="${getCurrentDate()}"></div>
            </div>
            <div class="form-group"><label>Описание</label><input class="form-input" id="f-payment-desc"></div>
        `, `<button class="btn-primary" id="modal-save-payment">Сохранить</button>`);

        $('#modal-save-payment').addEventListener('click', async () => {
            const amount = parseFloat($('#f-payment-amount').value);
            if (!amount) { toast('Введите сумму', 'error'); return; }
            await Storage.savePayment({
                id: generateId(),
                clientId: $('#f-payment-client').value,
                amount,
                date: $('#f-payment-date').value,
                description: $('#f-payment-desc').value.trim()
            });
            closeModal();
            toast('Платёж сохранён');
            renderView(currentView);
        });
    }

    // ─── PRODUCTION ───
    function renderProduction() {
        const orders = Storage.getProductionOrders().slice().reverse();
        appContent.innerHTML = orders.length ? orders.map(o => `
            <div class="card">
                <div class="card-header">
                    <div>
                        <div class="card-title">${escapeHtml(o.productName || o.name || 'Заказ')}</div>
                        <div class="card-subtitle">Заказ №${escapeHtml(o.orderNumber || '—')}</div>
                    </div>
                    ${statusBadge(o.status || 'В работе')}
                </div>
                <div class="card-footer"><span>${formatDate(o.date)}</span><span>Кол-во: ${o.quantity || '—'}</span></div>
            </div>
        `).join('') : '<div class="empty-state"><div class="empty-icon">🏭</div><h3>Нет производственных заказов</h3></div>';
    }

    // ─── WORKSHOP (OtpCex) ───
    function getPrintOrders() {
        return JSON.parse(localStorage.getItem('print_orders') || '[]');
    }

    function renderWorkshop() {
        const orders = getPrintOrders().slice().reverse();
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            // filtered below in map
        }

        appContent.innerHTML = `
            <div class="search-bar">
                <input type="search" placeholder="Поиск техкарт..." id="search-input" value="${escapeHtml(searchQuery)}">
            </div>
            ${orders.length ? orders.filter(o => {
                if (!searchQuery) return true;
                const q = searchQuery.toLowerCase();
                return (o.product_name || '').toLowerCase().includes(q) ||
                    (o.customer || '').toLowerCase().includes(q) ||
                    String(o.techcard_no).includes(q);
            }).map(o => `
                <div class="card" data-workshop-id="${escapeHtml(o.id || o.techcard_no)}">
                    <div class="card-header">
                        <div>
                            <div class="card-title">ТК №${escapeHtml(o.techcard_no)}</div>
                            <div class="card-subtitle">${escapeHtml(o.product_name || '—')}</div>
                        </div>
                        <span class="badge badge-blue">${escapeHtml(o.print_type || '—')}</span>
                    </div>
                    <div class="card-footer">
                        <span>${escapeHtml(o.customer || '—')}</span>
                        <span>${escapeHtml(o.manager || '—')}</span>
                    </div>
                </div>
            `).join('') : '<div class="empty-state"><div class="empty-icon">🔧</div><h3>Нет отправок в цех</h3><p>Создайте первую техкарту</p></div>'}
        `;

        bindSearch();
        appContent.querySelectorAll('[data-workshop-id]').forEach(el => {
            el.addEventListener('click', () => {
                const orders = getPrintOrders();
                const o = orders.find(x => (x.id || String(x.techcard_no)) === el.dataset.workshopId);
                if (!o) return;
                openModal(`Техкарта №${o.techcard_no}`, `
                    <div class="detail-row"><span class="label">Продукт</span><span class="value">${escapeHtml(o.product_name)}</span></div>
                    <div class="detail-row"><span class="label">Заказчик</span><span class="value">${escapeHtml(o.customer)}</span></div>
                    <div class="detail-row"><span class="label">Менеджер</span><span class="value">${escapeHtml(o.manager)}</span></div>
                    <div class="detail-row"><span class="label">Тип печати</span><span class="value">${escapeHtml(o.print_type)}</span></div>
                    <div class="detail-row"><span class="label">Носитель</span><span class="value">${escapeHtml(o.media_type)}</span></div>
                    <div class="detail-row"><span class="label">Бумага</span><span class="value">${escapeHtml(o.paper_type)} ${o.gsm || ''}г</span></div>
                    <div class="detail-row"><span class="label">Размер</span><span class="value">${o.width || '—'}×${o.height || '—'} мм</span></div>
                    <div class="detail-row"><span class="label">Тираж</span><span class="value">${o.circulation || '—'}</span></div>
                `, `<button class="btn-secondary btn-full" id="modal-close-btn">Закрыть</button>`);
                $('#modal-close-btn')?.addEventListener('click', closeModal);
            });
        });
    }

    function showAddWorkshopForm() {
        const clients = Storage.getClients();
        const nextNo = getPrintOrders().length + 1;
        openModal('Отправка в цех', `
            <div class="form-group"><label>№ техкарты</label><input class="form-input" id="f-ws-no" value="${nextNo}" readonly></div>
            <div class="form-group"><label>Заказчик</label>
                <select class="form-select" id="f-ws-customer">
                    <option value="">— Выберите —</option>
                    ${clients.map(c => `<option value="${escapeHtml(c.name)}">${escapeHtml(c.name)}</option>`).join('')}
                </select>
            </div>
            <div class="form-group"><label>Название продукта *</label><input class="form-input" id="f-ws-product"></div>
            <div class="form-group"><label>Менеджер</label><input class="form-input" id="f-ws-manager" value="${escapeHtml(getUser().name)}"></div>
            <div class="form-row">
                <div class="form-group"><label>Тип печати</label>
                    <select class="form-select" id="f-ws-print">
                        <option>Офсет</option><option>Цифра</option><option>Шелкография</option>
                    </select>
                </div>
                <div class="form-group"><label>Тираж</label><input class="form-input" id="f-ws-circ" type="number" inputmode="numeric"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Ширина, мм</label><input class="form-input" id="f-ws-width" type="number"></div>
                <div class="form-group"><label>Высота, мм</label><input class="form-input" id="f-ws-height" type="number"></div>
            </div>
            <div class="form-group"><label>Тип бумаги</label><input class="form-input" id="f-ws-paper" placeholder="мелованная"></div>
        `, `<button class="btn-primary" id="modal-save-ws">Отправить в цех</button>`);

        $('#modal-save-ws').addEventListener('click', async () => {
            const product = $('#f-ws-product').value.trim();
            if (!product) { toast('Введите название продукта', 'error'); return; }
            const order = {
                id: generateId(),
                techcard_no: parseInt($('#f-ws-no').value) || nextNo,
                customer: $('#f-ws-customer').value,
                product_name: product,
                manager: $('#f-ws-manager').value.trim(),
                print_type: $('#f-ws-print').value,
                circulation: parseInt($('#f-ws-circ').value) || 0,
                width: parseInt($('#f-ws-width').value) || 0,
                height: parseInt($('#f-ws-height').value) || 0,
                paper_type: $('#f-ws-paper').value.trim(),
                media_type: 'лист',
                gsm: 300,
                color: '4+4',
                services: [],
                createdAt: new Date().toISOString(),
                status: 'design',
                statusHistory: { design: new Date().toISOString() }
            };
            const orders = getPrintOrders();
            orders.push(order);
            localStorage.setItem('print_orders', JSON.stringify(orders));

            try {
                await fetch(`${API_CONFIG.BASE_URL}/api/otpcex`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(order)
                });
            } catch (e) { console.warn('Sync failed', e); }

            closeModal();
            toast('Техкарта отправлена в цех');
            renderView(currentView);
        });
    }

    // ─── TECHCARDS ───
    function renderTechcards() {
        const cards = Storage.getTechCards().slice().reverse();
        appContent.innerHTML = cards.length ? cards.map(c => `
            <div class="card">
                <div class="card-header">
                    <div>
                        <div class="card-title">ТК №${escapeHtml(c.techcard_no || c.number || '—')}</div>
                        <div class="card-subtitle">${escapeHtml(c.product_name || c.name || '—')}</div>
                    </div>
                </div>
                <div class="card-footer"><span>${formatDate(c.createdAt || c.date)}</span></div>
            </div>
        `).join('') : '<div class="empty-state"><div class="empty-icon">📑</div><h3>Нет техкарт</h3></div>';
    }

    // ─── STATUSES ───
    function renderStatuses() {
        const orders = getPrintOrders().slice().reverse();
        appContent.innerHTML = orders.length ? orders.map(o => {
            const currentStep = o.status || 'design';
            const stepIdx = STATUS_STEPS.findIndex(s => s.key === currentStep);
            return `<div class="card" data-status-id="${escapeHtml(o.id || String(o.techcard_no))}">
                <div class="card-header">
                    <div>
                        <div class="card-title">ТК №${escapeHtml(o.techcard_no)} — ${escapeHtml(o.product_name || '')}</div>
                        <div class="card-subtitle">${escapeHtml(o.customer || '')}</div>
                    </div>
                </div>
                <div class="status-timeline">
                    ${STATUS_STEPS.map((s, i) => `
                        <div class="status-step ${i < stepIdx ? 'done' : i === stepIdx ? 'active' : ''}">
                            <div class="status-dot">${s.icon}</div>
                            <div class="status-step-label">${s.label}</div>
                        </div>
                    `).join('')}
                </div>
            </div>`;
        }).join('') : '<div class="empty-state"><div class="empty-icon">📈</div><h3>Нет техкарт для отслеживания</h3></div>';

        appContent.querySelectorAll('[data-status-id]').forEach(el => {
            el.addEventListener('click', () => showStatusUpdate(el.dataset.statusId));
        });
    }

    function showStatusUpdate(id) {
        const orders = getPrintOrders();
        const o = orders.find(x => (x.id || String(x.techcard_no)) === id);
        if (!o) return;
        const current = o.status || 'design';
        const currentIdx = STATUS_STEPS.findIndex(s => s.key === current);

        openModal(`Статус ТК №${o.techcard_no}`, `
            <p style="margin-bottom:12px;color:var(--text-secondary);font-size:14px">${escapeHtml(o.product_name)}</p>
            <div class="list-group">
                ${STATUS_STEPS.map((s, i) => `
                    <div class="list-item" data-step="${s.key}" style="${i < currentIdx ? 'opacity:0.5' : ''}">
                        <div class="list-item-icon">${s.icon}</div>
                        <div class="list-item-content">
                            <div class="list-item-title">${s.label}</div>
                            <div class="list-item-subtitle">${o.statusHistory?.[s.key] ? formatDate(o.statusHistory[s.key].split('T')[0]) : 'Не начато'}</div>
                        </div>
                        ${s.key === current ? '<span class="badge badge-blue">Текущий</span>' : ''}
                    </div>
                `).join('')}
            </div>
        `);

        modalBody.querySelectorAll('[data-step]').forEach(el => {
            el.addEventListener('click', () => {
                const step = el.dataset.step;
                const idx = STATUS_STEPS.findIndex(s => s.key === step);
                if (idx < currentIdx) return;
                o.status = step;
                o.statusHistory = o.statusHistory || {};
                o.statusHistory[step] = new Date().toISOString();
                const all = getPrintOrders();
                const i = all.findIndex(x => (x.id || String(x.techcard_no)) === id);
                if (i >= 0) all[i] = o;
                localStorage.setItem('print_orders', JSON.stringify(all));
                closeModal();
                toast(`Статус: ${STATUS_STEPS[idx].label}`);
                renderView(currentView);
            });
        });
    }

    // ─── TRASH ───
    function renderTrash() {
        const trash = Storage.getTrash().slice().reverse();
        const typeLabels = { order: 'Заказ', invoice: 'Накладная', client: 'Контрагент', product: 'Продукт', payment: 'Платёж', reconciliation: 'Акт', techcard: 'Техкарта' };

        appContent.innerHTML = trash.length ? trash.map((t, i) => `
            <div class="card" data-trash-idx="${i}">
                <div class="card-header">
                    <div>
                        <div class="card-title">${typeLabels[t.type] || t.type}</div>
                        <div class="card-subtitle">${escapeHtml(t.item.name || t.item.number || t.item.id || '—')}</div>
                    </div>
                    <span class="badge badge-red">Удалено</span>
                </div>
                <div class="card-footer">
                    <span>${formatDate(t.deletedAt?.split('T')[0])}</span>
                    <button class="btn-sm btn-secondary" data-restore="${i}">Восстановить</button>
                </div>
            </div>
        `).join('') : '<div class="empty-state"><div class="empty-icon">🗑️</div><h3>Корзина пуста</h3></div>';

        appContent.querySelectorAll('[data-restore]').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const reversedIdx = parseInt(btn.dataset.restore);
                const allTrash = Storage.getTrash();
                const originalIdx = allTrash.length - 1 - reversedIdx;
                await Storage.restoreFromTrash(originalIdx);
                toast('Восстановлено');
                renderView(currentView);
            });
        });
    }

    // ─── MORE / SETTINGS ───
    function renderMore() {
        const user = getUser();
        const modules = user.role === 'designer' ? DESIGNER_MODULES : MANAGER_MODULES;

        appContent.innerHTML = `
            <div class="greeting-card" style="margin-bottom:20px">
                <h2>${escapeHtml(user.name)}</h2>
                <p>${escapeHtml(user.login)} · ${user.role === 'manager' ? 'Менеджер' : 'Дизайнер'}</p>
            </div>

            <div class="section-title">Все разделы</div>
            <div class="list-group">
                ${modules.map(m => `
                    <div class="list-item" data-module="${m.id}">
                        <div class="list-item-icon">${m.icon}</div>
                        <div class="list-item-content">
                            <div class="list-item-title">${m.label}</div>
                        </div>
                        <span class="list-item-arrow">›</span>
                    </div>
                `).join('')}
            </div>

            <div class="section-title">Система</div>
            <div class="list-group">
                <div class="list-item" data-module="settings">
                    <div class="list-item-icon">⚙️</div>
                    <div class="list-item-content"><div class="list-item-title">Настройки</div></div>
                    <span class="list-item-arrow">›</span>
                </div>
                <div class="list-item" id="btn-sync">
                    <div class="list-item-icon">🔄</div>
                    <div class="list-item-content"><div class="list-item-title">Синхронизация</div><div class="list-item-subtitle">Загрузить данные с сервера</div></div>
                    <span class="list-item-arrow">›</span>
                </div>
                <div class="list-item" id="btn-logout" style="color:var(--danger)">
                    <div class="list-item-icon">🚪</div>
                    <div class="list-item-content"><div class="list-item-title">Выйти</div></div>
                </div>
            </div>
        `;

        appContent.querySelectorAll('[data-module]').forEach(el => {
            el.addEventListener('click', () => navigate(el.dataset.module, getViewTitle(el.dataset.module)));
        });
        $('#btn-logout').addEventListener('click', logout);
        $('#btn-sync').addEventListener('click', async () => {
            toast('Синхронизация...');
            Storage._initPromise = null;
            STORAGE_SYNC_KEYS.forEach(k => localStorage.removeItem(k));
            await Storage.init();
            toast('Данные обновлены');
            renderView(currentView);
        });
    }

    function renderSettings() {
        const theme = localStorage.getItem('theme') || 'light';
        appContent.innerHTML = `
            <div class="list-group">
                <div class="settings-item">
                    <div>
                        <div class="settings-label">Тёмная тема</div>
                        <div class="settings-desc">Переключить оформление</div>
                    </div>
                    <button class="btn-secondary btn-sm" id="toggle-theme">${theme === 'dark' ? '☀️ Светлая' : '🌙 Тёмная'}</button>
                </div>
            </div>
            <div class="section-title">О приложении</div>
            <div class="card">
                <div class="detail-row"><span class="label">Версия</span><span class="value">1.0.0 Mobile</span></div>
                <div class="detail-row"><span class="label">Компания</span><span class="value">PROFITPRINT2024</span></div>
                <div class="detail-row"><span class="label">Город</span><span class="value">Наманган</span></div>
            </div>
        `;
        $('#toggle-theme').addEventListener('click', () => {
            const next = document.body.classList.contains('dark') ? 'light' : 'dark';
            setTheme(next);
            renderSettings();
        });
    }

    // ─── ADD ORDER FORM ───
    function showAddOrderForm() {
        const clients = Storage.getClients();
        const products = Storage.getProducts();
        const orders = Storage.getOrders();
        const nextNum = orders.length ? Math.max(...orders.map(o => parseInt(o.number) || 0)) + 1 : 1;

        openModal('Новый заказ', `
            <div class="form-row">
                <div class="form-group"><label>№ заказа</label><input class="form-input" id="f-order-num" value="${nextNum}"></div>
                <div class="form-group"><label>Дата</label><input class="form-input" id="f-order-date" type="date" value="${getCurrentDate()}"></div>
            </div>
            <div class="form-group"><label>Клиент *</label>
                <select class="form-select" id="f-order-client">
                    <option value="">— Выберите —</option>
                    ${clients.map(c => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.name)}</option>`).join('')}
                </select>
            </div>
            <div class="form-group"><label>Продукт</label>
                <select class="form-select" id="f-order-product">
                    <option value="">— Выберите —</option>
                    ${products.map(p => `<option value="${escapeHtml(p.id)}" data-name="${escapeHtml(p.name)}" data-price="${p.price}">${escapeHtml(p.name)} — ${formatCurrency(p.price)}</option>`).join('')}
                </select>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Количество</label><input class="form-input" id="f-order-qty" type="number" value="1" inputmode="numeric"></div>
                <div class="form-group"><label>Цена</label><input class="form-input" id="f-order-price" type="number" inputmode="decimal"></div>
            </div>
        `, `<button class="btn-primary" id="modal-save-order">Создать заказ</button>`);

        $('#f-order-product').addEventListener('change', function () {
            const opt = this.selectedOptions[0];
            if (opt?.dataset.price) $('#f-order-price').value = opt.dataset.price;
        });

        $('#modal-save-order').addEventListener('click', async () => {
            const clientId = $('#f-order-client').value;
            if (!clientId) { toast('Выберите клиента', 'error'); return; }
            const productSelect = $('#f-order-product');
            const opt = productSelect.selectedOptions[0];
            const qty = parseInt($('#f-order-qty').value) || 1;
            const price = parseFloat($('#f-order-price').value) || 0;
            const items = opt?.value ? [{
                name: opt.dataset.name || 'Позиция',
                quantityOrdered: qty,
                quantityProduced: 0,
                price,
                cost: qty * price
            }] : [];

            await Storage.saveOrder({
                id: generateId(),
                number: String($('#f-order-num').value),
                date: $('#f-order-date').value,
                clientId,
                status: 'В работе',
                items,
                completionDate: addDays($('#f-order-date').value, 14)
            });
            closeModal();
            toast('Заказ создан');
            renderView(currentView);
        });
    }

    // ─── Bind helpers ───
    function bindSearch() {
        const input = $('#search-input');
        if (!input) return;
        let debounce;
        input.addEventListener('input', () => {
            clearTimeout(debounce);
            debounce = setTimeout(() => {
                searchQuery = input.value.trim();
                renderView(currentView);
            }, 300);
        });
    }

    function bindFilters() {
        appContent.querySelectorAll('.chip[data-filter]').forEach(chip => {
            chip.addEventListener('click', () => {
                filterStatus = chip.dataset.filter;
                renderView(currentView);
            });
        });
    }

    function bindCardClicks() {
        appContent.querySelectorAll('[data-order-id]').forEach(el => {
            el.addEventListener('click', () => showOrderDetail(el.dataset.orderId));
        });
    }

    // ─── FAB handler ───
    function handleFab() {
        const actions = {
            orders: showAddOrderForm,
            clients: showAddClientForm,
            products: showAddProductForm,
            invoices: () => toast('Создание накладной — в полной версии'),
            payments: showAddPaymentForm,
            workshop: showAddWorkshopForm
        };
        const fn = actions[currentView];
        if (fn) fn();
    }

    // ─── Init ───
    async function initApp() {
        initTheme();
        buildNav();
        appContent.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
        await Storage.init();
        showScreen('app');
        navigate('home', 'Главная', '', false);
    }

    // ─── Event listeners ───
    $('#login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const loginVal = $('#login-input').value.trim();
        const pass = $('#password-input').value.trim();
        if (!login(loginVal, pass)) {
            $('#login-error').textContent = 'Неверный логин или пароль';
            return;
        }
        $('#login-error').textContent = '';
        await initApp();
    });

    btnBack.addEventListener('click', goBack);
    $('#btn-theme').addEventListener('click', () => {
        setTheme(document.body.classList.contains('dark') ? 'light' : 'dark');
    });
    $('#modal-close').addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeModal();
    });
    fab.addEventListener('click', handleFab);

    // Auto-login
    if (isLoggedIn()) {
        initApp();
    } else {
        showScreen('login');
    }
})();
