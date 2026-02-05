# ─── 1단계: 의존성 설치 ───────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# ─── 2단계: 빌드 ─────────────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# ─── 3단계: 프로덕션 이미지 ───────────────────────────────
FROM node:22-alpine AS prod
WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --only=production --ignore-scripts

COPY --from=build /app/dist ./dist

EXPOSE 3000

USER node

CMD ["node", "dist/main"]
