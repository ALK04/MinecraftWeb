# =============================================================
#  Site Minecraft (React + petit serveur Node) dans une image Docker.
#  Construit par GitHub Actions à chaque push, puis récupéré par
#  Watchtower sur le serveur.
# =============================================================

# --- 1. Construction du site React ---
FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# --- 2. Image finale : juste le serveur Node + le site construit ---
FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY server ./server
COPY --from=build /app/dist ./dist
# Dossier de la base de données (objectifs, succès, scores) : à monter en volume
RUN mkdir -p /app/data && chown node:node /app/data
USER node
EXPOSE 3000
CMD ["node", "server/index.ts"]
