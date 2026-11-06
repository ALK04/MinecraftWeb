// Réglages du serveur, lus depuis les variables d'environnement.
// En local : fichier .env (copie de .env.example).
// Sur le serveur : section "minecraft-site" du docker-compose.yml.

const env = process.env

export const config = {
  port: Number(env.PORT ?? 3000),

  // Dossier de données de Minecraft (lecture seule) : stats, usercache.json
  mcData: env.MC_DATA ?? '/mc',
  // Nom du dossier du monde dans mcData
  mcMonde: env.MC_MONDE ?? 'world',

  // Adresse de BlueMap, pour savoir qui est connecté sans réveiller le serveur
  bluemapUrl: (env.BLUEMAP_URL ?? 'http://minecraft:8100').replace(/\/$/, ''),

  // Fichier de la base de données des objectifs
  dbPath: env.DB_PATH ?? '/app/data/objectifs.db',

  // Code à donner aux potes pour pouvoir écrire sur le tableau des objectifs.
  // Vide = tout le monde peut écrire (déconseillé sur Internet).
  codeObjectifs: env.CODE_OBJECTIFS ?? '',
}
