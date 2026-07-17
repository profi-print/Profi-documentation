/**
 * PPApi — замена localStorage на реальные запросы к серверу.
 * Все заказы теперь хранятся в MongoDB (модель TexKarta) и доступны
 * с любого устройства/планшета одинаково.
 *
 * ВАЖНО: в мангуст-модели TexKarta поле должно допускать произвольную
 * вложенную структуру (timeline, shipment_history и т.д.). Если схема
 * строгая — переключите её на Schema.Types.Mixed для этих полей, иначе
 * Mongoose будет обрезать вложенные объекты при сохранении.
 */
(function (global) {

    async function fetchOrders() {
        const res = await fetch('/api/texkartas');
        if (!res.ok) throw new Error('Не удалось загрузить заказы');
        return await res.json();
    }

    async function fetchOrder(id) {
        const res = await fetch('/api/texkartas/' + encodeURIComponent(id));
        if (res.status === 404) return null;
        if (!res.ok) throw new Error('Не удалось загрузить заказ');
        return await res.json();
    }

    // Полная перезапись заказа (используется редко — предпочтительно
    // применять точечные действия ниже, чтобы не перетирать
    // параллельные изменения с других станций).
    async function saveOrder(order) {
        const res = await fetch('/api/texkartas/' + encodeURIComponent(order.id), {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(order)
        });
        if (!res.ok) throw new Error('Не удалось сохранить заказ');
        return await res.json();
    }

    // Атомарное действие по этапу: start / pause / finish / send_full /
    // send_partial, а также прямая правка статуса (waiting/running/paused/completed)
    // из экрана "Статусы". Сервер сам находит нужный заказ и обновляет timeline —
    // это исключает конфликт, если два человека одновременно открыли один заказ.
    async function stageEvent(orderId, stageKey, type, qty, comment, operator) {
        const res = await fetch(`/api/texkartas/${encodeURIComponent(orderId)}/stage-event`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ stageKey, type, qty: qty || 0, comment: comment || '', operator: operator || '' })
        });
        if (!res.ok) throw new Error('Не удалось обновить этап');
        return await res.json();
    }

    // Приход на склад (полностью/частично)
    async function warehouseReceive(orderId, qty, dateStr, comment) {
        const res = await fetch(`/api/texkartas/${encodeURIComponent(orderId)}/receive`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ qty, date: dateStr, comment: comment || '' })
        });
        if (!res.ok) throw new Error('Не удалось зафиксировать приход');
        return await res.json();
    }

    // Отгрузка (кг, коробки, фото)
    async function shipOrder(orderId, formData) {
        // formData — FormData с полями date, qty, weight_kg, boxes, comment, photo
        const res = await fetch(`/api/texkartas/${encodeURIComponent(orderId)}/shipment`, {
            method: 'POST',
            body: formData
        });
        if (!res.ok) throw new Error('Не удалось зафиксировать отгрузку');
        return await res.json();
    }

    // Простой поллинг вместо WebSocket — обновляет список каждые N секунд,
    // чтобы разные планшеты видели чужие изменения без перезагрузки страницы.
    // Для более мгновенной синхронизации в будущем можно заменить на
    // WebSocket/SSE, интерфейс вызова (onUpdate) останется тем же.
    function startPolling(onUpdate, intervalMs) {
        intervalMs = intervalMs || 8000;
        let stopped = false;
        async function tick() {
            if (stopped) return;
            try {
                const orders = await fetchOrders();
                onUpdate(orders);
            } catch (e) {
                console.error('Polling error:', e);
            }
            if (!stopped) setTimeout(tick, intervalMs);
        }
        tick();
        return function stop() { stopped = true; };
    }

    global.PPApi = { fetchOrders, fetchOrder, saveOrder, stageEvent, warehouseReceive, shipOrder, startPolling };

})(window);