/*
 * Единый источник правды для этапов производства и их статусов.
 * И texKarta.html, и statuses.html подключают именно этот файл и работают
 * только через него — это устраняет проблему "нет синхронности", когда
 * страницы вели собственные копии одной и той же логики и расходились.
 */
(function (global) {
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

    // Единственный допустимый набор статусов во всём проекте.
    const STAGE_STATUSES = ['waiting', 'progress', 'done', 'paused', 'error'];

    // Общие подписи — используются и в техкарте, и на странице "Статусы",
    // чтобы один и тот же статус нигде не назывался по-разному.
    const STATUS_LABELS = { waiting: 'В очереди', progress: 'В процессе', done: 'Завершено', paused: 'Приостановлено', error: 'Проблема' };
    const STATUS_ICONS  = { waiting: '○', progress: '▶', done: '✓', paused: '❚❚', error: '!' };

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
                order.timeline[s.key] = { status: 'waiting', start: null, end: null, duration: 0, doneQty: 0, sentQty: 0, history: [] };
            }
            const t = order.timeline[s.key];
            if (!STAGE_STATUSES.includes(t.status)) t.status = 'waiting';
            t.doneQty = t.doneQty || 0;
            t.sentQty = t.sentQty || 0;
            if (!Array.isArray(t.history)) t.history = [];
        });
        // Этапы, которых больше нет в заказе (сняли услугу и т.п.) — убираем,
        // чтобы обе страницы видели один и тот же набор этапов.
        Object.keys(order.timeline).forEach(key => {
            if (!stages.find(s => s.key === key)) delete order.timeline[key];
        });
    }

    function getStageTotal(order, stageKey) {
        const originalSheets = Math.ceil(order.print_sheets || 0);
        if (stageKey === 'flotorezka') return order.divide_by_two ? Math.ceil(originalSheets / 2) : originalSheets;
        if (stageKey === 'pechat') return Math.max(0, originalSheets - (order.make_ready || 0));
        if (stageKey === 'gluing' || stageKey === 'skleyka') return order.order_qty || 0;
        return Math.max(0, originalSheets - (order.make_ready || 0));
    }

    function isStageAvailable(order, stageKey) {
        const stages = getOrderStages(order);
        const idx = stages.findIndex(s => s.key === stageKey);
        if (idx === -1) return false;
        if (idx === 0 || idx === 1) return true; // Флоторезка и СТП всегда доступны
        const prev = stages[idx - 1];
        const prevStatus = order.timeline?.[prev.key]?.status || 'waiting';
        return prevStatus !== 'waiting';
    }

    /*
     * Единственная точка, где меняется статус этапа. И кнопки в техкарте
     * (Начать / Пауза / Завершить), и кнопки на странице "Статусы" обязаны
     * идти через эту функцию — тогда данные не могут разойтись между
     * страницами: они буквально пишутся одной и той же функцией в один
     * и тот же order.timeline[stageKey].
     *
     * opts.doneQtyDelta — сколько добавить к "сделано" (например, при паузе).
     * opts.history       — объект для записи в историю этапа.
     */
    function setStageStatus(order, stageKey, newStatus, opts) {
        opts = opts || {};
        ensureTimeline(order);
        const t = order.timeline[stageKey];
        if (!t) return null;
        const now = Date.now();
        const total = getStageTotal(order, stageKey);

        if (typeof opts.doneQtyDelta === 'number' && opts.doneQtyDelta > 0) {
            t.doneQty = (t.doneQty || 0) + opts.doneQtyDelta;
        }

        if (newStatus === 'progress') {
            if (!t.start) t.start = now;
            t.end = null;
        } else if (newStatus === 'done') {
            if (!t.start) t.start = now;
            t.end = now;
            t.duration = Math.round((t.end - t.start) / 60000);
            if (t.doneQty < total) t.doneQty = total; // "готово" всегда значит весь тираж сделан
        } else if (newStatus === 'waiting') {
            t.start = null; t.end = null; t.duration = 0;
            t.doneQty = 0; // возврат "в очередь" обнуляет прогресс — иначе он тут же
                            // снова считался бы завершённым (см. правило ниже)
        } else if (newStatus === 'paused' || newStatus === 'error') {
            if (t.start && !t.end) t.duration = Math.round((now - t.start) / 60000);
        }

        // Правило синхронизации: если фактически сделано >= тиража, статус
        // не может остаться paused/progress — именно это раньше приводило
        // к тому, что в техкарте написано "Работа полностью выполнена",
        // а статус (в том числе на странице Статусы) показывал "На паузе".
        if (total > 0 && t.doneQty >= total && (newStatus === 'paused' || newStatus === 'progress')) {
            t.status = 'done';
            if (!t.end) t.end = now;
        } else {
            t.status = newStatus;
        }

        if (opts.history) {
            t.history.push(Object.assign({ date: new Date().toISOString().slice(0, 10), timestamp: now }, opts.history));
        }
        return t;
    }

    global.PPTimeline = {
        ALL_STAGES_ORDER, STAGE_STATUSES, STATUS_LABELS, STATUS_ICONS,
        getOrderStages, ensureTimeline, getStageTotal, isStageAvailable, setStageStatus
    };
})(window);