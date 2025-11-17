FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .
RUN npm run build

ENTRYPOINT ["node", "dist/index.js"]
CMD ["--http"]
