# Use a imagem com Puppeteer/Chrome para scraping do Kwai
FROM apify/actor-node-puppeteer-chrome:20

# Copiar package.json primeiro (para cache de layers)
COPY package*.json ./

# Instalar dependências
RUN npm install --include=dev --audit=false

# Copiar o resto do código
COPY . ./

# Build do TypeScript
RUN npm run build

# Comando de execução
CMD ["npm", "run", "start:prod"]

