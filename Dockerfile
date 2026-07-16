FROM node:18-alpine

WORKDIR /app

# 1. Сначала копируем зависимости сервера и устанавливаем их
COPY server/package*.json ./server/
WORKDIR /app/server
RUN npm install --production

# 2. Возвращаемся в корень и копируем абсолютно весь проект (включая фронтенд)
WORKDIR /app
COPY . .

# Наш сервер по умолчанию слушает порт 3000
EXPOSE 3000

# 3. Запуск сервера из его папки
WORKDIR /app/server
CMD ["node", "server.js"]