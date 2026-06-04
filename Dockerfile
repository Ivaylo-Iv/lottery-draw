FROM node:20-bookworm-slim

ENV NODE_ENV=production
ENV PORT=3000

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./

RUN npm ci --omit=dev \
  && npm cache clean --force

COPY . .

RUN mkdir -p /app/data \
  && useradd --system --create-home --home-dir /home/nodeapp --shell /usr/sbin/nologin nodeapp \
  && chown -R nodeapp:nodeapp /app

USER nodeapp

EXPOSE 3000

CMD ["node", "server.js"]
