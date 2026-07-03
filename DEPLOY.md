# Развёртывание на Railway.app

## Что нужно для полноценной работы

### 1. **MongoDB база данных**
   - Создайте бесплатный MongoDB кластер на [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
   - Получите строку подключения: `mongodb+srv://username:password@cluster.mongodb.net/profi-print`

### 2. **Переменные окружения на Railway**
   Добавьте в Railway переменные:
   - `MONGODB_URI` - строка подключения MongoDB
   - `PORT` - порт (Railway автоматически установит его, но можно задать явно)
   - `NODE_ENV` - установить на `production`

### 3. **Процесс деплоя**

   **Шаг 1: Подготовка GitHub репозитория**
   ```bash
   git add .
   git commit -m "Setup for Railway deployment"
   git push origin main
   ```

   **Шаг 2: На Railway.com**
   1. Создайте новый проект
   2. Выберите "Deploy from GitHub"
   3. Подключите ваш репозиторий
   4. Railway автоматически обнаружит `package.json` в корне
   5. Перейдите в Variables и добавьте `MONGODB_URI`

   **Шаг 3: Удалите старую ошибочную конфигурацию**
   - Если было "Remove start command" - просто пересоздайте деплой
   - Новый `package.json` содержит правильные команды

### 4. **Структура проекта**
   ```
   / (корень)
   ├── package.json          ← Добавлен для Railway
   ├── .env.example          ← Пример конфигурации
   ├── index.html
   ├── *.html                ← Статические HTML файлы
   ├── css/                  ← Стили
   ├── js/                   ← Клиентский JavaScript
   ├── assets/               ← Изображения и ресурсы
   └── server/
       ├── server.js         ← Express сервер
       ├── package.json      ← Зависимости сервера
       ├── models/           ← MongoDB модели
       └── bot.py            ← Python бот (опционально)
   ```

### 5. **Как работает приложение**

   **Статический сайт (клиент):**
   - HTML файлы (index.html, orders.html, etc.)
   - CSS стили в `/css`
   - Клиентский JavaScript в `/js`
   - Использует `localStorage` для локального хранилища заказов

   **API сервер (на Express):**
   - Запускается на PORT из переменной окружения
   - Подключается к MongoDB
   - Предоставляет REST API для:
     - `/api/clients` - контрагенты
     - `/api/products` - продукты
     - `/api/orders` - заказы
     - `/api/invoices` - накладные
     - `/api/payments` - платежи
     - `/api/reconciliations` - акты сверки

### 6. **Проверка статуса**

   После деплоя на Railway:
   - Откройте ваш домен (Railway выдаст адрес)
   - Система работает с `localStorage` локально
   - API доступна по адресу `https://your-railway-domain.up.railway.app/api/`

### 7. **Возможные проблемы и решения**

   | Проблема | Решение |
   |----------|---------|
   | Ошибка "npm start" | Используйте новый `package.json` из корня |
   | MongoDB не подключается | Проверьте переменную `MONGODB_URI` на Railway |
   | Статические файлы не загружаются | Express серверит их из корня автоматически |
   | PORT не совпадает | Railway инжектирует PORT в процесс - это нормально |

### 8. **Требования к MongoDB**

   - Кластер должен быть доступен из Railway
   - Добавьте IP адрес `0.0.0.0/0` в Network Access (или используйте Atlas Security)
   - База данных: `profi-print`

### 9. **Optional: Использование Railway CLI**

   ```bash
   # Установить Railway CLI
   npm install -g @railway/cli
   
   # Логин
   railway login
   
   # Инициировать проект
   railway init
   
   # Деплоить
   railway up
   ```

## Итог

После деплоя у вас будет:
- ✅ Работающий статический веб-сайт
- ✅ Express сервер с REST API
- ✅ MongoDB база данных
- ✅ Полная система управления печатным производством
