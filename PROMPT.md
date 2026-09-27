# Prompt — « Le Petit Étal » (jeu mobile chill, React Native)

> Copie le bloc ci-dessous tel quel dans ton assistant IA / générateur de code.

---

Tu es un développeur senior React Native spécialisé dans les jeux mobiles casual. Crée un jeu mobile complet, jouable et **très chill** avec **React Native + Expo (TypeScript)**, intitulé **« Le Petit Étal »**.

## 1. Concept

Le joueur tient un petit étal de fruits et légumes sur un marché de village. Chaque « journée de marché » se déroule en **2 phases** :

1. **Phase 1 — Achat & rangement (le matin)** : le joueur achète des fruits et légumes chez le grossiste, puis les range à la main sur son étalage.
2. **Phase 2 — Vente (la journée)** : des clients passent devant l'étal, choisissent des produits, et le joueur les sert et encaisse.

À la fin de la journée : un petit récapitulatif doux (recettes, clients satisfaits, produit star du jour), puis on passe au lendemain.

## 2. Ambiance « très chill » (priorité n°1)

- **Aucun game over, aucune pénalité punitive, aucun chrono stressant.** Pas d'écran rouge, pas de buzzer.
- Les invendus ne sont pas perdus brutalement : ils deviennent « un peu moins frais » (prix légèrement réduit) ou peuvent être transformés en « panier anti-gaspi » vendu à petit prix.
- Rythme lent et contemplatif : lever de soleil le matin, lumière dorée l'après-midi, coucher de soleil à la fermeture.
- Direction artistique : illustrations **flat / pastel**, formes arrondies, ombres douces, palette chaude (crème, vert sauge, terracotta, jaune miel).
- Musique lo-fi / acoustique douce en boucle + sons d'ambiance (oiseaux, murmures du marché, cloche de vélo au loin). Sons satisfaisants : « pop » en posant un fruit, tintement de pièces à l'encaissement.
- Retours haptiques légers (expo-haptics) lors des poses et des ventes.
- Clients bienveillants avec de petites bulles de texte mignonnes (« Oh, de belles fraises ! », « Merci, à samedi ! »).

## 3. Phase 1 — Achat & rangement

### Achat chez le grossiste
- Écran « Grossiste » avec une liste de produits en cartes : icône, nom, prix d'achat à l'unité/cagette, saisonnalité.
- Le joueur choisit les quantités avec des boutons +/- (ou un slider), voit son budget restant en direct.
- Les produits disponibles varient selon la **saison** (printemps, été, automne, hiver) → fraises au printemps, tomates en été, courges en automne, poireaux en hiver, etc.
- Prix d'achat qui fluctuent légèrement d'un jour à l'autre (petite info « bon plan du jour »).

### Rangement sur l'étalage
- L'étal est une **grille de cagettes** (ex. 3 rangées × 4 emplacements au départ, extensible).
- Le joueur **glisse-dépose (drag & drop)** les cagettes depuis son stock vers les emplacements de l'étal.
- Chaque emplacement a une capacité ; les fruits apparaissent visuellement empilés dans la cagette.
- **Bonus de présentation (doux, jamais obligatoire)** :
  - Harmonie de couleurs : produits de couleurs complémentaires côte à côte → petit bonus d'attractivité.
  - Produits de saison en première rangée → bonus.
  - Étal bien rempli → plus de clients attirés.
- Le joueur peut fixer le **prix de vente** de chaque produit (avec une suggestion indiquée).
- Bouton « Ouvrir l'étal ☀️ » pour passer à la phase 2.

## 4. Phase 2 — Vente

- Vue de l'étal de face ; les clients (personnages simples et variés : mamie avec cabas, cycliste, enfant, chef cuisinier…) arrivent tranquillement à pied.
- Chaque client affiche une **bulle de commande** avec des icônes (ex. 🍓×2, 🥕×3).
- Le joueur **tape** sur les produits de l'étal (ou les glisse dans le panier du client) pour préparer la commande, puis tape sur la caisse pour encaisser.
- Pas de minuterie visible : le client attend patiemment. S'il attend très longtemps, il repart simplement en souriant (« Je repasserai ! ») sans pénalité.
- Si un produit manque, le client peut accepter une alternative proposée par le joueur.
- La satisfaction dépend du prix (juste ou trop cher), de la fraîcheur et de la présentation → pourboires et étoiles de réputation.
- Les cagettes se vident visuellement au fil des ventes.
- La journée se termine quand le soleil se couche (durée ~3–5 min réelles) ou quand le joueur choisit « Fermer l'étal 🌙 ».

## 5. Progression (légère et motivante)

- **Pièces** : servent à acheter les produits et des améliorations.
- **Réputation** (étoiles) : débloque de nouveaux types de clients et des produits rares (figues, fruits de la passion, champignons…).
- **Améliorations cosmétiques et pratiques** : parasol, nappe à carreaux, ardoises à prix écrites à la craie, fleurs décoratives, emplacements de cagettes supplémentaires, petite balance ancienne.
- **Carnet de collection** : chaque nouveau produit vendu est ajouté à un joli carnet illustré avec une anecdote.
- **Clients habitués** : certains reviennent, on apprend leur prénom et leurs préférences.
- Cycle des saisons tous les 7 jours de jeu.

## 6. Écrans à réaliser

1. **Écran d'accueil** : étal illustré, bouton « Nouvelle journée », accès carnet et boutique d'améliorations.
2. **Grossiste** (achat).
3. **Rangement de l'étal** (drag & drop + prix).
4. **Marché** (vente).
5. **Récap de fin de journée**.
6. **Boutique d'améliorations**.
7. **Carnet de collection**.
8. **Réglages** (musique, effets sonores, haptique).

## 7. Stack technique

- **Expo SDK récent + TypeScript**, navigation avec **expo-router**.
- **react-native-reanimated** + **react-native-gesture-handler** pour les animations et le drag & drop fluide (60 fps).
- **@shopify/react-native-skia** (optionnel) pour les effets visuels (lumière du jour, particules douces).
- **Zustand** pour l'état global du jeu (argent, stock, étal, jour, saison, réputation, améliorations).
- **AsyncStorage** (ou MMKV) pour la **sauvegarde automatique** de la progression.
- **expo-av / expo-audio** pour musique et sons, **expo-haptics** pour les vibrations.
- Assets : utiliser des emojis ou des SVG simples comme placeholders, facilement remplaçables par de vrais sprites.

## 8. Architecture attendue

```
app/                 # écrans (expo-router)
  index.tsx          # accueil
  wholesaler.tsx     # phase 1a : achat
  stall-setup.tsx    # phase 1b : rangement
  market.tsx         # phase 2 : vente
  summary.tsx        # récap de journée
  shop.tsx
  collection.tsx
  settings.tsx
src/
  components/        # Crate, ProduceItem, Customer, OrderBubble, CashRegister, SunSky…
  game/
    data/produce.ts  # catalogue produits (id, nom, emoji, couleur, saison, prix base, fraîcheur)
    data/customers.ts
    logic/           # économie, génération de clients, satisfaction, bonus de présentation
  store/gameStore.ts # Zustand + persistance
  audio/
  theme/             # couleurs, typo, espacements
```

- Logique de jeu **pure et testée** (Jest) séparée de l'UI : calcul des prix, satisfaction, bonus d'harmonie, génération de commandes.
- Données de jeu dans des fichiers de configuration pour équilibrer facilement.

## 9. Livrables

1. Le projet Expo complet, qui se lance avec `npx expo start` sur iOS et Android.
2. Une boucle de jeu entièrement jouable : accueil → achat → rangement → vente → récap → jour suivant.
3. Au moins **12 produits** (fruits et légumes) répartis sur les 4 saisons et **6 types de clients**.
4. Sauvegarde automatique fonctionnelle.
5. Un `README.md` expliquant comment lancer le jeu et comment ajouter un nouveau produit.

Commence par proposer le plan d'implémentation et le modèle de données, puis implémente écran par écran en gardant toujours le jeu jouable à chaque étape. Garde en tête à chaque décision : **le joueur doit se sentir détendu, jamais pressé.**
