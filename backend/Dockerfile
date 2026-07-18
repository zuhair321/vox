FROM node:20-alpine

WORKDIR /app/backend

COPY backend/package*.json ./
RUN npm install

COPY backend/ ./

ENV DATABASE_URL="postgresql://postgres:postgres@localhost:5432/postgres?schema=public"
RUN npx prisma generate

EXPOSE 4000

CMD ["npm", "start"]
