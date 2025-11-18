FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build
RUN npm prune --production

ENTRYPOINT ["node", "dist/index.js"]
CMD ["--http"]
