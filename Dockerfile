# order-service/Dockerfile
FROM node:16

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 7000

CMD ["node", "src/index.js"]
