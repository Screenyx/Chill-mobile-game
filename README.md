# 🍓 Le Petit Étal

Un jeu mobile **très chill** en React Native (Expo) : tu tiens un petit étal de fruits et légumes sur un marché de village.
Pas de chrono stressant, pas de game over, juste le plaisir de ranger de jolies cagettes et de servir des clients bienveillants.

Le prompt de game design d'origine est dans [`PROMPT.md`](./PROMPT.md).

## Une journée de marché

1. **Le matin, chez le grossiste 🚚** : achète des cagettes de produits de saison. Les prix varient un peu chaque jour, et un produit est en « bon plan du jour ».
2. **Le rangement 🧺** : glisse tes cagettes depuis la camionnette vers l'étal (ou touche une cagette puis un emplacement). Tu peux régler tes prix 🏷️.
   Des bonus récompensent un bel étal, sans jamais être obligatoires :
   - étal bien rempli,
   - couleurs complémentaires côte à côte (✨),
   - produits de saison sur la rangée de devant,
   - variété et décorations.
3. **La vente ☀️** : les clients arrivent tranquillement avec leur commande dans une bulle. Touche un produit pour le leur donner, puis « 💰 Caisse ».
   - S'il manque un produit, le client accepte volontiers un produit de la même famille à la place.
   - Si un prix est vraiment trop élevé, il décline gentiment.
   - S'il attend longtemps, il repart en souriant, sans pénalité.
4. **Le récap 🌙** : recettes, pourboires, clients ravis, produit star du jour, nouveautés du carnet.
   - Les invendus restent pour le lendemain (« un peu moins frais », −20 %).
   - Au-delà, ils partent en paniers anti-gaspi : on récupère toujours un peu d'argent.

**Progression** :
- réputation ⭐ qui débloque des produits rares et de nouveaux clients ;
- boutique d'améliorations (parasol, nappe, ardoises, balance, rangée en plus…) ;
- carnet de collection illustré avec anecdotes, et clients habitués 💚 ;
- les saisons changent tous les 7 jours.

La partie est **sauvegardée automatiquement**.

## Lancer le jeu

```bash
npm install
npx expo start
```

Ensuite, scanne le QR code avec **Expo Go** (iOS / Android), ou appuie sur `i` / `a` pour un simulateur, ou `w` pour la version web.

## Scripts utiles

| Commande                  | Rôle                                                 |
| ------------------------- | ---------------------------------------------------- |
| `npm test`                | Tests unitaires de la logique de jeu (Jest)          |
| `npm run typecheck`       | Vérification TypeScript                              |
| `npm run lint`            | ESLint (config Expo)                                 |
| `npm run generate-sounds` | Régénère les sons d'ambiance dans `assets/sounds/`   |

## Architecture

```
src/
  app/                    # écrans (expo-router)
    index.tsx             # accueil
    wholesaler.tsx        # phase 1a : achat chez le grossiste
    stall-setup.tsx       # phase 1b : rangement (glisser-déposer) + prix
    market.tsx            # phase 2 : vente
    summary.tsx           # récap de fin de journée
    shop.tsx · collection.tsx · settings.tsx
  components/             # Crate, StallGrid, CustomerCard, Sky, Awning, PriceSheet, UI de base
  game/
    config.ts             # tous les réglages d'équilibrage
    types.ts
    data/                 # catalogue : produits, types de clients, améliorations
    logic/                # logique pure et testée : économie, étal, clients, calendrier
  store/gameStore.ts      # état global (Zustand) + sauvegarde (AsyncStorage)
  audio/sound.ts          # musique, effets sonores, vibrations
  theme/                  # couleurs, rayons, espacements
```

La logique de jeu (`src/game/logic`) est en TypeScript pur, indépendante de l'interface et couverte par des tests Jest.

**Stack** :
- Expo SDK 57, expo-router ;
- react-native-reanimated et react-native-gesture-handler ;
- Zustand et AsyncStorage ;
- expo-audio et expo-haptics.

## Ajouter un nouveau produit

Ajoute simplement une entrée dans `src/game/data/produce.ts` :

```ts
{
  id: 'fig',
  name: 'Figues',
  emoji: '🟣',             // ou un sprite plus tard
  kind: 'fruit',           // 'fruit' | 'vegetable'
  color: 'purple',         // famille de couleur, pour les bonus d'harmonie
  seasons: ['summer', 'autumn'],
  buyPrice: 1.5,           // prix d'achat unitaire ; revente conseillée = × 2
  minReputation: 3,        // niveau de réputation pour le débloquer (1 = dès le début)
  fact: 'Une anecdote pour le carnet de collection.',
},
```

Le produit apparaît alors automatiquement :
- chez le grossiste pendant ses saisons,
- dans les commandes des clients,
- dans le carnet de collection.

Les autres contenus fonctionnent pareil :
- nouveaux clients : `src/game/data/customers.ts` ;
- améliorations : `src/game/data/upgrades.ts` ;
- équilibrage (durée de journée, capacité, marges…) : `src/game/config.ts`.

## Graphismes et sons

Les visuels utilisent des emojis et des formes simples, faciles à remplacer par de vrais sprites.

Les sons sont générés par `scripts/generate-sounds.js` :
- un « pop » quand on pose ou sert un produit,
- des pièces à l'encaissement,
- une clochette à l'arrivée d'un client,
- une boucle lo-fi pentatonique.

Tu peux remplacer librement les fichiers de `assets/sounds/`.
