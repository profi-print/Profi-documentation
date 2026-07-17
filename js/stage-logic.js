/**
 * PPStageLogic — единый модуль логики этапов техкарты.
 * Подключается и в texKarta.html, и в statuses.html.
 * ВАЖНО: это единственное место, где описана последовательность
 * этапов, зависимости между ними и работа с timeline.
 * Если нужно поменять граф зависимостей — меняем ТОЛЬКО здесь.
 */
(function (global) {

    // ===== Полный список этапов в порядке отображения =====
    const ALL_STAGES_ORDER = [
        { key: 'flotorezka',   label: 'Флоторезка' },
        { key: 'stp',          label: 'СТП' },
        { key: 'cutting_pre',  label: 'Резка' },
        { key: 'pechat',       label: 'Печать' },
        { key: 'cutting_post', label: 'Резка пост печати' },
        { key: 'uf_lak',       label: 'УФ лак' },
        { key: 'tisnenie',     label: 'Тиснение' },
        { key: 'lamination',   label: 'Ламинация' },
        { key: 'kongrev',      label: 'Конгрев' },
        { key: 'vysechka',     label: 'Высечка' },
        { key: 'obloj_remove', label: 'Удаление облоя' },
        { key: 'manual_work',  label: 'Ручные работы' },
        { key: 'skleyka',      label: 'Склейка' },
        { key: 'sklad',        label: 'Склад' }
    ];

    // ===== ЯВНЫЕ ЗАВИСИМОСТИ (граф) =====
    // Если этапа нет в этом объекте — используется дефолтное правило:
    // первые 2 этапа в отфильтрованном списке всегда доступны,
    // остальные ждут предыдущий по списку этап.
    //
    // Резка (до печати) ждёт только СТП — без формы печати резать нечего,
    // Флоторезка тут не имеет значения.
    // Печать ждёт СТП (форма) и Флоторезку (если рулонный материал, т.к.
    // нужен нарезанный материал). Если материал не рулонный — этапа
    // flotorezka в списке этого заказа просто нет, и зависимость по нему
    // игнорируется автоматически.
    // Резка и Печать НЕ зависят друг от друга — могут идти параллельно.
    const STAGE_EXPLICIT_DEPS = {
        cutting_pre: ['stp'],
        pechat:      ['stp', 'flotorezka']
    };

    function getOrderStages(order) {
        const services = order.services || [];
        const has = (name) => services.some(s => s.name === name);
        const hasCuttingPre = services.some(s => s.name === 'cutting' && (s.type === 'pre' || s.type === 'до печать' || s.type === 'оба' || s.type === 'both'));
        const hasCuttingPost = services.some(s => s.name === 'cutting' && (s.type === 'post' || s.type === 'пост печать' || s.type === 'оба' || s.type === 'both'));

        const stages = [];
        for (let s of ALL_STAGES_ORDER) {
            if (s.key === 'flotorezka') {
                if ((order.material_type || 'roll') !== 'roll') continue;
            } else if (s.key === 'cutting_pre') {
                if (!hasCuttingPre) continue;
            } else if (s.key === 'cutting_post') {
                if (!hasCuttingPost) continue;
            } else if (['uf_lak', 'tisnenie', 'lamination', 'kongrev', 'vysechka', 'obloj_remove', 'manual_work', 'skleyka'].includes(s.key)) {
                if (!has(s.key)) continue;
            }
            stages.push(s);
        }
        return stages;
    }

    function ensureTimeline(order) {
        if (!order.timeline) order.timeline = {};
        const stages = getOrderStages(order);
        stages.forEach(s => {
            if (!order.timeline[s.key]) {
                order.timeline[s.key] = { status: 'waiting', operator: '', start: null, end: null, duration: 0, doneQty: 0, sentQty: 0, history: [] };
            }
            const t = order.timeline[s.key];
            t.doneQty = t.doneQty || 0;
            t.sentQty = t.sentQty || 0;
            if (!Array.isArray(t.history)) t.history = [];
        });
        return order;
    }

    function getStageTotal(order, stageKey) {
        const originalSheets = Math.ceil(order.print_sheets || 0);
        if (stageKey === 'flotorezka') return order.divide_by_two ? Math.ceil(originalSheets / 2) : originalSheets;
        if (stageKey === 'pechat') return Math.max(0, originalSheets - (order.make_ready || 0));
        if (stageKey === 'gluing' || stageKey === 'skleyka') return order.order_qty || 0;
        return Math.max(0, originalSheets - (order.make_ready || 0));
    }

    /**
     * Доступен ли этап для старта прямо сейчас.
     * Использует явные зависимости (STAGE_EXPLICIT_DEPS), если они заданы,
     * иначе — дефолтное правило "первые два всегда доступны, остальные
     * ждут предыдущий по списку".
     */
    function isStageAvailable(order, stageKey) {
        const stages = getOrderStages(order);
        const presentKeys = stages.map(s => s.key);
        const idx = stages.findIndex(s => s.key === stageKey);
        if (idx === -1) return false;

        const explicitDeps = STAGE_EXPLICIT_DEPS[stageKey];
        if (explicitDeps) {
            const relevantDeps = explicitDeps.filter(dep => presentKeys.includes(dep));
            // Если ни одна из зависимостей не присутствует в заказе (например,
            // материал не рулонный — flotorezka отсутствует) — считаем доступным.
            if (relevantDeps.length === 0) return true;
            return relevantDeps.every(dep => (order.timeline?.[dep]?.status || 'waiting') !== 'waiting');
        }

        if (idx === 0 || idx === 1) return true;
        const prevStage = stages[idx - 1];
        const prevStatus = order.timeline?.[prevStage.key]?.status || 'waiting';
        return prevStatus !== 'waiting';
    }

    /**
     * Текущий "активный" этап заказа для списков — вычисляется
     * ИЗ timeline, а не из отдельного счётчика (workflow_stage_index
     * больше не используется и не хранится).
     */
    function getCurrentStageIndex(order) {
        ensureTimeline(order);
        const stages = getOrderStages(order);
        for (let i = 0; i < stages.length; i++) {
            const status = order.timeline[stages[i].key]?.status || 'waiting';
            if (status !== 'completed') return i;
        }
        return stages.length - 1; // всё завершено — последний этап
    }

    function overallStatus(order) {
        ensureTimeline(order);
        const stages = getOrderStages(order);
        const statuses = stages.map(s => order.timeline[s.key]?.status || 'waiting');
        if (statuses.every(s => s === 'completed')) return 'done';
        if (statuses.includes('paused')) return 'paused';
        if (statuses.includes('running')) return 'progress';
        return 'waiting';
    }

    function applyStageEvent(order, stageKey, type, qty, comment, operator) {
        ensureTimeline(order);
        const t = order.timeline[stageKey];
        if (!t) return order;
        const total = getStageTotal(order, stageKey);
        const dateStr = new Date().toISOString().slice(0, 10);

        if (type === 'start') {
            t.status = 'running';
            if (!t.start) t.start = Date.now();
            if (operator) t.operator = operator;
        } else if (type === 'pause') {
            t.doneQty = (t.doneQty || 0) + (qty || 0);
            t.status = 'paused';
            if (t.start) t.duration = Math.round((Date.now() - t.start) / 60000);
        } else if (type === 'finish') {
            t.doneQty = Math.max(t.doneQty || 0, total);
            t.status = 'completed';
            t.end = Date.now();
            if (t.start) t.duration = Math.round((t.end - t.start) / 60000);
        } else if (type === 'send_full' || type === 'send_partial') {
            t.sentQty = (t.sentQty || 0) + (qty || 0);
        } else if (['waiting', 'running', 'paused', 'completed'].includes(type)) {
            // Ручная правка статуса напрямую (используется в statuses.html)
            const now = Date.now();
            if (type === 'running' && t.status !== 'running') {
                if (!t.start) t.start = now;
                t.end = null;
            } else if (type === 'completed') {
                if (!t.start) t.start = now;
                t.end = now;
                t.duration = Math.round((t.end - t.start) / 60000);
                if (t.doneQty < total) t.doneQty = total;
            } else if (type === 'waiting') {
                t.start = null; t.end = null; t.duration = 0;
            } else if (type === 'paused') {
                if (t.start && !t.end) t.duration = Math.round((now - t.start) / 60000);
            }
            t.status = type;
        }

        t.history.push({ type, qty: qty || 0, date: dateStr, comment: comment || '', operator: operator || '', timestamp: Date.now() });
        return order;
    }

    const STAGE_STATUS_LABELS = { waiting: '⏳ Не начато', running: '▶️ В работе', paused: '⏸️ На паузе', completed: '✅ Завершено' };
    const STAGE_HISTORY_LABELS = {
        start: '▶️ Начал работу', pause: '⏸️ Сделано на паузе', finish: '✅ Отмечено завершённым',
        send_full: '📤 Отправлено полностью', send_partial: '📤 Отправлено частично'
    };

    const PPStageLogic = {
        ALL_STAGES_ORDER,
        STAGE_EXPLICIT_DEPS,
        STAGE_STATUS_LABELS,
        STAGE_HISTORY_LABELS,
        getOrderStages,
        ensureTimeline,
        getStageTotal,
        isStageAvailable,
        getCurrentStageIndex,
        overallStatus,
        applyStageEvent
    };

    // Универсально: работает и в браузере (window.PPStageLogic),
    // и в Node.js на сервере (require('./stage-logic')) — так граф
    // зависимостей описан ровно в одном месте для клиента и сервера.
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = PPStageLogic;
    } else {
        global.PPStageLogic = PPStageLogic;
    }

})(typeof window !== 'undefined' ? window : globalThis);