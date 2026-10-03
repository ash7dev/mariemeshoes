# Mariemeshoes — Récapitulatif du projet

> **Sneakers for everyone**
> Site e-commerce de vente de sneakers neuves au Sénégal.

---

## 1. Vue d'ensemble

| Élément | Décision |
|---|---|
| Type | Boutique e-commerce mono-vendeur |
| Produits | Sneakers **neuves uniquement** (pas de seconde main, pas d'état ni de paire unique) |
| Parcours client | Repris des projets Mamou's Accessories et Maison Adama Tchurayy |
| Paiements | Wave (via le **code marchand** du vendeur) et paiement à la livraison |
| Livraison | Frais de livraison flexibles |
| Devise | FCFA |
| Changement principal par rapport aux projets précédents | Le **modèle de données** (gestion modèle → coloris → pointure) |

---

## 2. Structure du catalogue

Le stock ne se gère pas au niveau du produit mais au niveau de la **paire précise** : modèle × coloris × pointure.

```
Brand        Nike, Adidas, New Balance…
Product      Modèle : "Air Force 1 '07"          → marque, catégorie, genre, description
 └ Colorway  Coloris : "Triple White"            → images, prix, code style  (= une page produit)
    └ Variant Pointure : 43 EU                   → SKU, stock
```

Principes :

- **Une page produit = un coloris.** Chaque coloris a sa propre URL, ses propres images, et affiche les autres coloris du modèle en vignettes.
- **Le prix est porté par le coloris.** Un `price_override` nullable sur la variante permet un prix différent pour une pointure si besoin.
- **Le stock est porté par la variante (pointure).**
- **La ligne de commande fige** le nom du produit, le coloris, la pointure et le prix au moment de l'achat.

---

## 3. Modèle de données (PostgreSQL)

### 3.1 Catalogue

```sql
brands (
  id, name, slug, logo_url, created_at
)

categories (
  id, name, slug              -- Lifestyle, Basket, Running
)

products (
  id, brand_id, category_id,
  name, slug, description,
  gender,                     -- 'homme' | 'femme' | 'unisexe' | 'enfant'
  is_active, created_at
)

colorways (
  id, product_id,
  name,                       -- "Triple White"
  slug,
  style_code,                 -- "CW2288-111" (optionnel)
  price,                      -- en FCFA
  compare_at_price,           -- prix barré (promo), nullable
  is_active, created_at
)

colorway_images (
  id, colorway_id, url, position
)

variants (
  id, colorway_id,
  size_eu,                    -- 43 (entier, référence)
  sku,
  stock,
  price_override,             -- nullable
  UNIQUE (colorway_id, size_eu)
)
```

### 3.2 Collections (mise en avant gérée par la vendeuse)

Un mécanisme unique pour « Tendances », « Bestsellers », « Spécial Tabaski », « Moins de 50 000 FCFA », etc. Aucune collection n'est codée en dur.

```sql
collections (
  id, name, slug,
  description, cover_image_url,
  show_on_home,               -- affichée en section sur l'accueil
  home_position,              -- ordre des sections sur l'accueil
  starts_at, ends_at,         -- optionnel : collection limitée dans le temps
  is_active, created_at
)

collection_items (
  collection_id, colorway_id,
  position,                   -- ordre choisi par la vendeuse
  PRIMARY KEY (collection_id, colorway_id)
)
```

- Les collections sont liées au **coloris**, pas au modèle.
- La page d'accueil se construit automatiquement à partir des collections `show_on_home = true`, triées par `home_position`, et filtrées par `starts_at` / `ends_at`.
- Le champ `is_featured` n'existe pas : il serait en doublon avec une collection « À la une ».
- Un coloris en rupture sur toutes ses pointures reste dans la collection mais est affiché en fin de liste (ou masqué), sans intervention manuelle.
- Les bestsellers sont **manuels** au lancement. Évolution prévue : un champ `type` (`manual` | `auto_bestsellers`) calculé à partir des ventes, sans autre changement de schéma.

### 3.3 Commandes

Reprend la structure des projets Mamou / MAT. Partie spécifique aux sneakers :

```sql
order_items (
  id, order_id, variant_id,
  product_name,               -- figé à l'achat
  colorway_name,              -- figé à l'achat
  size_eu,                    -- figé à l'achat
  unit_price,                 -- figé à l'achat
  quantity
)
```

### 3.4 Index recommandés

```sql
CREATE INDEX ON variants (size_eu, stock);
CREATE INDEX ON variants (colorway_id);
CREATE INDEX ON colorways (product_id);
CREATE INDEX ON products (brand_id, category_id, gender);
CREATE INDEX ON collection_items (collection_id, position);
```

---

## 4. Logique métier

### 4.1 Gestion du stock

Le stock par pointure est souvent faible (1 ou 2 paires). Avec le paiement à la livraison, deux clients peuvent commander la même dernière paire : le stock doit donc être **décrémenté dès la création de la commande**, dans une transaction.

```sql
UPDATE variants
SET stock = stock - :qty
WHERE id = :variant_id AND stock >= :qty;
-- 0 ligne modifiée → paire indisponible, la commande est refusée et le client prévenu
```

- **Annulation** (client injoignable, refus à la livraison, paiement Wave non abouti) : le stock est **remis** sur la variante.
- **Retour** : la paire retournée est **remise en vente comme neuve** (stock remis sur la variante).
- Toute la création de commande (vérification du stock, décrément, insertion des lignes) se fait dans une **seule transaction**.

### 4.2 Navigation et filtres

| Niveau | Contenu |
|---|---|
| Menu principal | Nouveautés · Marques · Homme · Femme · Enfant |
| Filtres boutique | **Pointure** (en premier) · Marque · Catégorie · Prix |

- **Nouveautés** : simple tri sur `colorways.created_at`, pas de table dédiée.
- **Genre** : les produits `unisexe` apparaissent dans Homme et Femme.
- **Filtre pointure** : coloris actifs ayant au moins une variante de la pointure demandée avec `stock > 0`.

```sql
SELECT DISTINCT c.*
FROM colorways c
JOIN variants v ON v.colorway_id = c.id
WHERE c.is_active = true
  AND v.size_eu = :size
  AND v.stock > 0;
```

### 4.3 Pointures

- Système de référence : **EU, en entiers** (pas de demi-pointures) : adulte **36 à 46**, enfant **16 à 35**.
- Prévoir un **guide des tailles par marque** (les pointures varient d'une marque à l'autre).

### 4.4 Paiement et livraison

- **Wave** : paiement via le code marchand du vendeur (pas d'intégration API comme sur AutoLoc).
- **Paiement à la livraison**.
- **Frais de livraison flexibles**.

---

## 5. Traitement des photos produit

La vendeuse publie des photos de sneakers sur fond blanc ou gris très clair (ex. photo fournie : fond `#EFEFEF`).

### 5.1 Côté upload (NestJS)

Normaliser chaque image à l'upload avec **sharp** :

- correction de niveaux pour ramener le fond gris clair au **blanc pur** ;
- conversion en **WebP** ;
- redimensionnement en plusieurs tailles (vignette, carte, fiche produit).

### 5.2 Côté affichage (Next.js)

Le blanc de la photo se fond dans la couleur de la carte grâce à `mix-blend-mode: multiply` :

```tsx
<div className="aspect-square rounded-2xl bg-[#F3EDE6] p-6">
  <img
    src={image.url}
    alt={`${product.name} ${colorway.name}`}
    className="h-full w-full object-contain mix-blend-multiply"
  />
</div>
```

- Le fond de carte doit rester **très clair**, sinon les sneakers blanches deviennent grisâtres.
- `object-contain` + padding : marge identique pour chaque paire, quel que soit le cadrage de la photo.
- Même traitement sur la galerie de la fiche produit.

### 5.3 Consignes photo pour la vendeuse

- Format **carré**.
- Chaussure **entière et centrée**.
- Toujours orientée dans le même sens (**pointe vers la gauche**).
- **Photo de profil en premier**.

---

## 6. Couleurs

| Rôle | Nom | Hex |
|---|---|---|
| Fond de page | Ivoire | `#FAF7F2` |
| Fond des cartes produit | Sable clair | `#F3EDE6` |
| Bordures | Lin | `#E4DDD5` |
| Fond de section (collections) | Rose thé | `#F4DEE6` |
| Texte secondaire | Taupe | `#8E857D` |
| Accent (boutons, pointure sélectionnée, logo) | Magenta | `#E6007E` |
| Texte principal | Noir doux | `#161315` |
| Zones fortes sans photo (footer, bannière) | Aubergine | `#2A0E1E` |
| Texte sur aubergine | Crème | `#FBF4EE` |

```css
:root {
  --color-page: #FAF7F2;
  --color-card: #F3EDE6;
  --color-border: #E4DDD5;
  --color-section: #F4DEE6;
  --color-muted: #8E857D;
  --color-accent: #E6007E;
  --color-ink: #161315;
  --color-deep: #2A0E1E;
  --color-cream: #FBF4EE;
}
```

---

## 7. Typographie

| Usage | Police | Source |
|---|---|---|
| Titres | **Marcellus** | Google Fonts |
| Interface (texte, prix FCFA, pointures, boutons) | **Schibsted Grotesk** (400, 600) | Google Fonts |

```ts
// app/fonts.ts (Next.js)
import { Marcellus, Schibsted_Grotesk } from "next/font/google";

export const marcellus = Marcellus({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
});

export const schibsted = Schibsted_Grotesk({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-sans",
});
```

---

## 8. Évolutions prévues (V2)

- **Bestsellers automatiques** : `collections.type = 'auto_bestsellers'`, calculés à partir des ventes.
- **Alerte réassort** : « Préviens-moi quand ma pointure revient ».

```sql
restock_alerts (
  id, variant_id, phone, notified_at
)
```

---

## 9. Points à confirmer

- Liste des **marques** proposées (pour remplir `brands` dès le départ).
- Validation des **catégories** (Lifestyle, Basket, Running) selon le stock réel.
