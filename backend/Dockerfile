FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY tsconfig.json ./
COPY prisma ./prisma
ENV DATABASE_URL=postgresql://postgres:postgres@postgres:5432/dashboard?schema=public
RUN npx prisma generate

COPY src ./src

EXPOSE 3000

CMD ["npm", "run", "dev"]
