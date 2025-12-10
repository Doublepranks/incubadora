# Use a lightweight Apify base image without browsers (não precisamos de Playwright aqui)
FROM apify/actor-node:20

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install --include=dev

COPY tsconfig.json ./
COPY src ./src

RUN npm run build

CMD ["node", "dist/main.js"]
