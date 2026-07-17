/**
 * Роуты для точечных действий над техкартой — используются вместо
 * localStorage. Подключаются в server/index.js:
 *
 *   const registerTexKartaActions = require('./routes/texkarta-actions');
 *   registerTexKartaActions(app, { TexKarta, uploadSklad, skladDir });
 *
 * Важно: работа идёт через findOne + save (а не через один большой PUT
 * всего заказа с фронта), чтобы два разных планшета, отправляющих
 * действия почти одновременно, не перетирали изменения друг друга.
 */
const StageLogic = require('../../js/stage-logic.js');

module.exports = function registerTexKartaActions(app, { TexKarta, uploadSklad }) {

    // ===== Действие по этапу: start / pause / finish / send_full / send_partial
    // ===== либо прямая правка статуса (waiting/running/paused/completed) из "Статусов"
    app.post('/api/texkartas/:id/stage-event', async (req, res) => {
        try {
            const { stageKey, type, qty, comment, operator } = req.body;
            if (!stageKey || !type) {
                return res.status(400).json({ error: 'stageKey и type обязательны' });
            }
            const order = await TexKarta.findOne({ id: req.params.id });
            if (!order) return res.status(404).json({ error: 'Заказ не найден' });

            StageLogic.ensureTimeline(order);

            // Защита: нельзя стартовать этап, если он ещё не доступен по графу
            // зависимостей (это дублирует проверку на фронте — на случай, если
            // кто-то дёргает API напрямую, минуя интерфейс).
            if (type === 'start' && !StageLogic.isStageAvailable(order, stageKey)) {
                return res.status(409).json({ error: 'Этап ещё недоступен — предыдущий этап не начат' });
            }

            StageLogic.applyStageEvent(order, stageKey, type, qty, comment, operator);
            order.markModified('timeline');
            await order.save();
            res.json(order);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // ===== Приход на склад (полностью/частично) =====
    app.post('/api/texkartas/:id/receive', async (req, res) => {
        try {
            const { qty, date, comment } = req.body;
            const order = await TexKarta.findOne({ id: req.params.id });
            if (!order) return res.status(404).json({ error: 'Заказ не найден' });

            order.received_qty = (order.received_qty || 0) + (qty || 0);
            if (!Array.isArray(order.receive_history)) order.receive_history = [];
            order.receive_history.push({
                qty: qty || 0,
                date: date || new Date().toISOString().slice(0, 10),
                comment: comment || '',
                timestamp: Date.now()
            });
            order.markModified('receive_history');
            await order.save();
            res.json(order);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // ===== Отгрузка со склада: дата, кол-во, вес, коробки, фото грузовика =====
    app.post('/api/texkartas/:id/shipment', uploadSklad.single('photo'), async (req, res) => {
        try {
            const order = await TexKarta.findOne({ id: req.params.id });
            if (!order) return res.status(404).json({ error: 'Заказ не найден' });

            const { date, qty, weight_kg, boxes, comment } = req.body;
            const photoUrl = req.file ? `/uploads/sklad/${req.file.filename}` : null;

            if (!Array.isArray(order.shipment_history)) order.shipment_history = [];
            const entry = {
                date: date || new Date().toISOString().slice(0, 10),
                qty: Number(qty) || 0,
                weight_kg: Number(weight_kg) || 0,
                boxes: Number(boxes) || 0,
                comment: comment || '',
                photo_url: photoUrl,
                timestamp: Date.now()
            };
            order.shipment_history.push(entry);
            order.shipped_qty = (order.shipped_qty || 0) + entry.qty;
            order.markModified('shipment_history');
            await order.save();
            res.json(order);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
};