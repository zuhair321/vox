FROM node:20-alpine

WORKDIR /app/backend

COPY backend/package*.json ./
RUN npm install

COPY backend/ ./

RUN npx prisma generate

EXPOSE 4000

CMD ["npm", "start"]
