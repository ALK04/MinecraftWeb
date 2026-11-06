// Tous les textes de la page « Star du jour ».
// Chaque jour, on avance dans chaque liste : pas de répétition avant d'avoir tout vu.
// Variables : {nom} {temps} {h} {blocs} {morts} {mobs} {km} {sauts}
// (Écrits sans « il » / « elle » exprès : on ne sait pas qui sera la star.)

export const VERDICTS = [
  '{nom} a passé {temps} sur le serveur. Les plantes vertes de la maison, elles, n’ont pas survécu.',
  '{temps} de jeu. Le travail ? Les études ? Le soleil ? Jamais entendu parler.',
  'Quand on a demandé à {nom} ce que cette journée avait apporté, la réponse a été : « des escaliers ».',
  '{nom} a joué {temps}. Quelque part, un lit attend toujours quelqu’un.',
  'Avec {temps} de jeu, {nom} vient officiellement d’obtenir la double nationalité : France et Overworld.',
  '{temps}. On ne juge pas. Enfin si, un peu. Beaucoup, en fait.',
  'Pendant que le reste du monde vivait sa vie, {nom} cumulait {temps} de minage intensif.',
  '{nom} n’est pas accro. {nom} peut arrêter quand {nom} veut. Juste pas aujourd’hui. Ni demain.',
  'Selon nos sources, {nom} a cligné des yeux 4 fois en {temps}. Un record.',
  'Le frigo a été ouvert zéro fois en {temps}. {nom} vit désormais de pain et de steaks virtuels.',
  '{temps} de jeu : il paraît que la chaise de {nom} a demandé un congé maladie.',
  '« Juste une petite partie », avait promis {nom}. C’était il y a {temps}.',
  '{nom} a passé tellement de temps en jeu que la vraie herbe ressemble maintenant à un bloc mal texturé.',
  'Le soleil s’est levé et couché dans le jeu plus souvent que dans la vraie vie de {nom}. {temps}, quand même.',
  'Si le temps de jeu était un métier, {nom} aurait demandé une augmentation après {temps}.',
  'Breaking news : {nom} a été aperçu·e dehors. Non, on rigole. {temps} de jeu.',
  '{nom} a confondu « vie sociale » et « serveur Minecraft ». {temps} plus tard, rien n’a changé.',
  'Un jour, on racontera aux enfants l’histoire de {nom} et de ses {temps} de jeu. Ils ne nous croiront pas.',
  '{temps}. La batterie de la manette/souris est fatiguée. {nom}, pas du tout.',
  'Le Secteur-3 tient à remercier {nom} pour ses {temps} de présence. La famille, un peu moins.',
  '{nom} a passé {temps} en jeu, soit l’équivalent d’un aller-retour Paris-Marseille. À pied. Presque.',
  'Diagnostic du docteur : {temps} de jeu, carence sévère en lumière du jour. Pronostic : encore une partie.',
  'On a vérifié deux fois : oui, {nom} a vraiment joué {temps}. On a même vérifié une troisième fois.',
  '{nom} vient de prouver qu’une journée de 24 h peut contenir {temps} de Minecraft. Bravo la science.',
  'Les villageois ont voté : {nom} est désormais considéré·e comme un·e habitant·e permanent·e. {temps}.',
  'Le chat de {nom} a dû apprendre à se nourrir tout seul. {temps} de jeu, ça laisse des traces.',
  '« Je me couche tôt ce soir », a dit {nom}. Le serveur garde des preuves : {temps}.',
  '{nom} n’a pas une vie. {nom} a un monde. Et {temps} pour le prouver.',
]

export const STATS_BLAGUES = {
  blocs: [
    '{blocs} blocs minés. Le sous-sol du serveur ressemble à un gruyère.',
    '{blocs} blocs cassés. Les taupes demandent des cours.',
    '{blocs} blocs. Il ne reste plus grand-chose sous nos pieds.',
    '{blocs} blocs minés. Tout ça pour 3 diamants, on parie ?',
  ],
  morts: [
    '{morts} morts. La gravité gagne toujours.',
    '{morts} morts. Le cimetière est complet, merci.',
    '{morts} morts. Mais avec style, à chaque fois.',
    '{morts} morts. Le bouton « réapparaître » est usé.',
  ],
  zeroMort: [
    'Zéro mort. Suspect. Très suspect.',
    'Aucune mort. Les creepers sont en deuil.',
    'Pas une seule mort. Le mode créatif, peut-être ?',
  ],
  mobs: [
    '{mobs} monstres éliminés. Les zombies ont fait une cellule de crise.',
    '{mobs} mobs. La nuit a peur de cette personne.',
    '{mobs} mobs tués. Les squelettes ont porté plainte.',
  ],
  distance: [
    '{km} parcourus. Toujours pas trouvé la sortie.',
    '{km} de balade. Sans jamais quitter le canapé.',
    '{km}. Les chaussures virtuelles sont trouées.',
  ],
  sauts: [
    '{sauts} sauts. Un kangourou en stage.',
    '{sauts} sauts. Le bouton espace demande grâce.',
    '{sauts} sauts. Toujours aussi mauvais en parkour, cela dit.',
  ],
}

// « Avec ce temps, {nom} aurait pu… » : n = nombre calculé à partir des heures
export const A_LA_PLACE: { texte: string; parHeure: number }[] = [
  { texte: 'regarder {n} films (avec le générique)', parHeure: 0.5 },
  { texte: 'dormir {n} nuits complètes', parHeure: 1 / 8 },
  { texte: 'faire {n} machines à laver', parHeure: 1 / 1.5 },
  { texte: 'lire {n} pages d’un vrai livre', parHeure: 40 },
  { texte: 'marcher {n} km pour de vrai', parHeure: 5 },
  { texte: 'apprendre {n} mots d’italien', parHeure: 15 },
  { texte: 'appeler sa grand-mère {n} fois', parHeure: 4 },
  { texte: 'cuire {n} pizzas maison', parHeure: 1.5 },
  { texte: 'écouter {n} albums entiers', parHeure: 1.3 },
  { texte: 'ranger sa chambre {n} fois (ça ne serait pas du luxe)', parHeure: 2 },
  { texte: 'faire {n} siestes de 20 minutes', parHeure: 3 },
  { texte: 'arroser {n} plantes (les pauvres)', parHeure: 60 },
  { texte: 'faire {n} pompes (on rigole, personne ne fait ça)', parHeure: 300 },
  { texte: 'boire {n} cafés en terrasse', parHeure: 2 },
  { texte: 'courir {n} semi-marathons', parHeure: 0.45 },
]

export const INTERVIEWS = [
  '« Je ne suis pas accro, je fais du repérage. »',
  '« Le soleil ? Oui, j’en ai vu un. Dans le jeu. »',
  '« Je voulais juste finir mon toit. Le toit n’est toujours pas fini. »',
  '« Mes parents pensent que je travaille. Techniquement, je mine. »',
  '« Quand je ferme les yeux, je vois des blocs. C’est normal ? »',
  '« J’ai perdu mon stuff 3 fois. Je reste positif·ve. »',
  '« Dormir, c’est pour les gens qui n’ont pas de ferme à finir. »',
  '« Je remercie ma pioche, mon lit, et surtout personne d’autre. »',
  '« Un creeper ? Où ça ? AH. »',
  '« Je reviens dans 5 minutes. » (n’est jamais revenu·e)',
  '« J’ai une vie sociale : je parle aux villageois. »',
  '« Je ne creuse jamais sous mes pieds. Enfin, presque jamais. »',
  '« Ce trophée, je le dédie à mon canapé. »',
  '« Demain, je touche de l’herbe. Promis. »',
  '« La lave ? Je savais qu’elle était là. Si si. »',
  '« Mon record ? Mon record, c’est aujourd’hui. »',
]

export const HOROSCOPES = [
  'Mars entre dans la maison du Nether : évite de dormir là-bas.',
  'Une rencontre inattendue t’attend… elle fait « tsssss ».',
  'Les astres conseillent de poser des torches. Beaucoup de torches.',
  'Jupiter recommande de ne pas creuser tout droit. Jupiter a raison.',
  'Ta chance du jour : 3 diamants. Ta malchance du jour : la lave juste derrière.',
  'Vénus te sourit, mais pas les squelettes.',
  'Journée idéale pour enfin finir ce toit.',
  'La Lune est pleine : les zombies aussi.',
  'Saturne te déconseille de faire confiance aux loups non apprivoisés.',
  'Un coffre plein t’attend. Ou un coffre vide. Les astres hésitent.',
  'Mercure rétrograde : tu vas oublier où est ta base.',
  'Le cosmos te conseille de dormir. Le cosmos te connaît mal.',
]

export const DAUPHINS = [
  '{nom} : presque. Comme d’habitude.',
  '{nom} : la médaille du « j’ai essayé ».',
  '{nom} : un peu de vie sociale, visiblement.',
  '{nom} : battu·e, mais avec dignité.',
  '{nom} : le podium, c’est déjà pas mal.',
  '{nom} : dans l’ombre de la star. Comme toujours.',
]

// ------------------------------------------------------------------

// Numéro du jour (identique pour tout le monde, change à minuit)
export const numeroJour = (jour: string) => Math.floor(new Date(jour + 'T12:00:00Z').getTime() / 86_400_000)

// Le k-ième texte du jour dans une liste, sans répétition tant que la liste n'est pas épuisée
export function duJour<T>(liste: T[], jour: number, k = 0, combien = 1): T {
  // Ordre mélangé fixe, pour éviter de suivre l'ordre d'écriture
  const ordre = liste.map((_, i) => i).sort((a, b) => ((a * 7919) % 101) - ((b * 7919) % 101))
  return liste[ordre[(jour * combien + k) % liste.length]]
}

export function remplir(texte: string, valeurs: Record<string, string>) {
  return texte.replace(/\{(\w+)\}/g, (_, cle: string) => valeurs[cle] ?? '')
}
