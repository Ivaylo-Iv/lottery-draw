FROM node:20-bookworm

ENV PORT=3000

WORKDIR /app

COPY package*.json ./

RUN npm install \
  && npm cache clean --force

COPY . .

RUN mkdir -p /app/data \
  && chown -R node:node /app

USER node

EXPOSE 3000

CMD ["node", "server.js"]
