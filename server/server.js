require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const app = express();
app.use(cors());

// Увеличиваем лимит для JSON и URL-encoded запросов до 2 ГБ
app.use(express.json({ limit: '2gb' }));
app.use(express.urlencoded({ limit: '2gb', extended: true }));

// Обслуживание статических файлов из корня проекта (клиентская часть)
app.use(express.static(path.join(__dirname, '../')));

// ===== Настройка хранилищ для загружаемых файлов =====
const uploadsDir = path.join(__dirname, 'uploads');
const pdfOrdersDir = path.join(uploadsDir, 'pdf');
const techCardsDir = path.join(uploadsDir, 'tech_cards');
const skladDir = path.join(uploadsDir, 'sklad'); // если потребуется

// Функция для автоматического создания папок
const createUploadDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// Создаём все нужные папки при старте
createUploadDir(pdfOrdersDir);
createUploadDir(techCardsDir);
createUploadDir(skladDir);

// Ограничение размера файла — 2 ГБ
const fileLimit = 2 * 1024 * 1024 * 1024; // 2 GB

// Хранилище для PDF заказов
const pdfStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    createUploadDir(pdfOrdersDir);
    cb(null, pdfOrdersDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    // Сохраняем с оригинальным именем, но добавляем префикс для уникальности
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

// Хранилище для сгенерированных техкарт
const techCardStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    createUploadDir(techCardsDir);
    cb(null, techCardsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'techcard-' + uniqueSuffix + '.pdf');
  }
});

// Хранилище для документов склада (если понадобится)
const skladStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    createUploadDir(skladDir);
    cb(null, skladDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const uploadPdf = multer({ storage: pdfStorage, limits: { fileSize: fileLimit } });
const uploadTechCard = multer({ storage: techCardStorage, limits: { fileSize: fileLimit } });
const uploadSklad = multer({ storage: skladStorage, limits: { fileSize: fileLimit } });

// ===== Модели MongoDB =====
const Client = require('./models/Client');
const Product = require('./models/Product');
const Order = require('./models/Order');
const Invoice = require('./models/Invoice');
const Payment = require('./models/Payment');
const Reconciliation = require('./models/Reconciliation');
const OtpCex = require('./models/OtpCex');
const TexKarta = require('./models/TexKarta');

// Подключение к MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Универсальный роутер для CRUD-операций с моделями
function createRoutes(Model) {
  const router = express.Router();

  // GET все документы
  router.get('/', async (req, res) => {
    try {
      res.json(await Model.find().lean());
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET один документ по полю id (кастомный id)
  router.get('/:id', async (req, res) => {
    try {
      const doc = await Model.findOne({ id: req.params.id }).lean();
      if (!doc) return res.status(404).json({ error: 'Not found' });
      res.json(doc);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST создать документ
  router.post('/', async (req, res) => {
    try {
      const doc = new Model(req.body);
      await doc.save();
      res.json(doc);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // PUT обновить или создать (upsert) по id
  router.put('/:id', async (req, res) => {
    try {
      const body = { ...req.body };
      delete body._id;
      delete body.__v;
      const updated = await Model.findOneAndUpdate(
        { id: req.params.id },
        body,
        { new: true, upsert: true, runValidators: true }
      );
      res.json(updated);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE удалить по id
  router.delete('/:id', async (req, res) => {
    try {
      await Model.findOneAndDelete({ id: req.params.id });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}

// Монтируем CRUD-маршруты
app.use('/api/clients', createRoutes(Client));
app.use('/api/products', createRoutes(Product));
app.use('/api/orders', createRoutes(Order));
app.use('/api/invoices', createRoutes(Invoice));
app.use('/api/payments', createRoutes(Payment));
app.use('/api/reconciliations', createRoutes(Reconciliation));
app.use('/api/otpcex', createRoutes(OtpCex));
app.use('/api/texkartas', createRoutes(TexKarta));

// ===== Специальные маршруты для работы с данными целиком =====
app.get('/api/data', async (req, res) => {
  try {
    const [clients, products, orders, invoices, payments, reconciliations, otpcex, texkartas] = await Promise.all([
      Client.find().lean(),
      Product.find().lean(),
      Order.find().lean(),
      Invoice.find().lean(),
      Payment.find().lean(),
      Reconciliation.find().lean(),
      OtpCex.find().lean(),
      TexKarta.find().lean()
    ]);
    res.json({ clients, products, orders, invoices, payments, reconciliations, otpcex, texkartas });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/data', async (req, res) => {
  try {
    const { clients, products, orders, invoices, payments, reconciliations, otpcex, texkartas } = req.body;
    if (clients) { await Client.deleteMany({}); await Client.insertMany(clients); }
    if (products) { await Product.deleteMany({}); await Product.insertMany(products); }
    if (orders) { await Order.deleteMany({}); await Order.insertMany(orders); }
    if (invoices) { await Invoice.deleteMany({}); await Invoice.insertMany(invoices); }
    if (payments) { await Payment.deleteMany({}); await Payment.insertMany(payments); }
    if (reconciliations) { await Reconciliation.deleteMany({}); await Reconciliation.insertMany(reconciliations); }
    if (otpcex) { await OtpCex.deleteMany({}); await OtpCex.insertMany(otpcex); }
    if (texkartas) { await TexKarta.deleteMany({}); await TexKarta.insertMany(texkartas); }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== Маршруты для загрузки файлов =====
// ===== Маршруты для загрузки файлов =====

// Загрузка PDF к заказу (поле "pdf" в форме)
app.post('/api/upload/pdf/:orderId', uploadPdf.single('pdf'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Файл не загружен' });
  }
  res.json({
    filename: req.file.filename,           // уникальное системное имя
    originalname: req.file.originalname,   // оригинальное имя файла
    path: req.file.path
  });
});

// Просмотр / скачивание PDF с оригинальным именем
app.get('/view/pdf/:orderId/:filename', (req, res) => {
  const { orderId, filename } = req.params;
  const filePath = path.join(pdfOrdersDir, filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('PDF не найден');
  }
  const originalName = req.query.name || filename;
  res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(originalName)}"`);
  res.setHeader('Content-Type', 'application/pdf');
  res.sendFile(filePath);
});

// Загрузка сгенерированной техкарты (поле "techcard")
app.post('/api/upload/techcard', uploadTechCard.single('techcard'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Файл не загружен' });
  }
  res.json({
    filename: req.file.filename,
    path: req.file.path
  });
});

// Загрузка документов склада (поле "skladDoc")
app.post('/api/upload/sklad', uploadSklad.single('skladDoc'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Файл не загружен' });
  }
  res.json({
    filename: req.file.filename,
    originalname: req.file.originalname,
    path: req.file.path
  });
});

// ===== Отдача загруженных файлов (статическая раздача) =====
app.use('/uploads/pdf', express.static(pdfOrdersDir));
app.use('/uploads/tech_cards', express.static(techCardsDir));
app.use('/uploads/sklad', express.static(skladDir));

// ===== Отдача загруженных файлов (статическая раздача) =====
// Прямые ссылки на файлы будут доступны через /uploads/pdf/..., /uploads/tech_cards/... и т.д.
app.use('/uploads/pdf', express.static(pdfOrdersDir));
app.use('/uploads/tech_cards', express.static(techCardsDir));
app.use('/uploads/sklad', express.static(skladDir));

// ===== Мобильное приложение =====
app.get('/mobile', (req, res) => {
  res.sendFile(path.join(__dirname, '../mobile/index.html'));
});

// ===== Обработка 404 для SPA =====
app.use((req, res) => {
  if (req.path.startsWith('/mobile')) {
    return res.sendFile(path.join(__dirname, '../mobile/index.html'));
  }
  res.sendFile(path.join(__dirname, '../index.html'));
});

// ===== Запуск сервера =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));