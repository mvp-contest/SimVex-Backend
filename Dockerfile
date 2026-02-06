FROM node:22-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps --ignore-scripts

FROM node:22-alpine AS build
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npx prisma generate
RUN npm run build

FROM node:22-alpine AS prod
WORKDIR /app

ENV NODE_ENV=production

RUN apk add --no-cache openssl

COPY package.json package-lock.json ./
RUN npm ci --only=production --legacy-peer-deps

COPY --from=build /app/dist ./dist
COPY prisma ./prisma

RUN npx prisma generate

EXPOSE 8000

CMD sh -c "npx prisma migrate deploy && node dist/main"
