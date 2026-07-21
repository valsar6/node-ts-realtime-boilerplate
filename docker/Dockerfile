# syntax=docker/dockerfile:1

FROM node:20-alpine AS dependencies
WORKDIR /app
RUN apk add --no-cache openssl
COPY package.json package-lock.json* ./
RUN npm ci

FROM dependencies AS test
WORKDIR /app
COPY . .
RUN npx prisma generate
RUN npm run test:coverage

FROM test AS build
WORKDIR /app
RUN npm run build
RUN npm ci --omit=dev && npx prisma generate

FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

RUN apk add --no-cache openssl
RUN addgroup -S nodejs && adduser -S nodejs -G nodejs

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/package.json ./package.json

USER nodejs
EXPOSE 3000

CMD ["node", "dist/server.js"]
