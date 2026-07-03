require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Обслуживание статических файлов из корня проекта
app.use(express.static(path.join(__dirname, '../')));

const Client = require('./models/Client');
const Product = require('./models/Product');
const Order = require('./models/Order');
const Invoice = require('./models/Invoice');
const Payment = require('./models/Payment');
const Reconciliation = require('./models/Reconciliation');

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

function createRoutes(Model) {
  const router = express.Router();
  router.get('/', async (req, res) => { try { res.json(await Model.find().lean()); } catch (err) { res.status(500).json({ error: err.message }); } });
  router.post('/', async (req, res) => { try { const doc = new Model(req.body); await doc.save(); res.json(doc); } catch (err) { res.status(500).json({ error: err.message }); } });
  router.put('/:id', async (req, res) => {
    try {
      const body = { ...req.body }; delete body._id; delete body.__v;
      const updated = await Model.findOneAndUpdate({ id: req.params.id }, body, { new: true, upsert: true, runValidators: true });
      res.json(updated);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });
  router.delete('/:id', async (req, res) => { try { await Model.findOneAndDelete({ id: req.params.id }); res.json({ success: true }); } catch (err) { res.status(500).json({ error: err.message }); } });
  return router;
}

app.use('/api/clients', createRoutes(Client));
app.use('/api/products', createRoutes(Product));
app.use('/api/orders', createRoutes(Order));
app.use('/api/invoices', createRoutes(Invoice));
app.use('/api/payments', createRoutes(Payment));
app.use('/api/reconciliations', createRoutes(Reconciliation));

app.get('/api/data', async (req, res) => {
  try {
    const [clients, products, orders, invoices, payments, reconciliations] = await Promise.all([
      Client.find().lean(), Product.find().lean(), Order.find().lean(), Invoice.find().lean(), Payment.find().lean(), Reconciliation.find().lean()
    ]);
    res.json({ clients, products, orders, invoices, payments, reconciliations });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/data', async (req, res) => {
  try {
    const { clients, products, orders, invoices, payments, reconciliations } = req.body;
    if (clients) { await Client.deleteMany({}); await Client.insertMany(clients); }
    if (products) { await Product.deleteMany({}); await Product.insertMany(products); }
    if (orders) { await Order.deleteMany({}); await Order.insertMany(orders); }
    if (invoices) { await Invoice.deleteMany({}); await Invoice.insertMany(invoices); }
    if (payments) { await Payment.deleteMany({}); await Payment.insertMany(payments); }
    if (reconciliations) { await Reconciliation.deleteMany({}); await Reconciliation.insertMany(reconciliations); }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Обработка 404 - редирект на index.html для SPA
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));