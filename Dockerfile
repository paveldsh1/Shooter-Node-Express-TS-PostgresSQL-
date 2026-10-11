FROM node:20-bookworm-slim

WORKDIR /app

RUN corepack enable

COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn/releases/ .yarn/releases/

RUN yarn install --immutable

COPY tsconfig.json ./
COPY src ./src
COPY public ./public

RUN yarn build

ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", "dist/server.js"]