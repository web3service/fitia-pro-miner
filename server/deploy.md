# FITIA PRO MINER — Deployment Guide

## 📋 Prérequis

1. **Compte Supabase** — [supabase.com](https://supabase.com) (gratuit)
2. **Serveur Node.js** — VPS, Railway, Render, ou Fly.io
3. **Wallet Polygon** avec ~50-100 POL pour le relayer gas
4. **Contrats déployés** sur Polygon Mainnet (FitiaMiningV3_Core + FitiaMiningV3_Mine)

---

## 🗄️ Étape 1 : Supabase Database

### 1.1 Créer un projet Supabase

1. Aller sur [supabase.com](https://supabase.com) → New Project
2. Nom : `fitia-pro-miner`
3. Password : choisir un mot de passe fort (garder précieusement)
4. Region : choisir la plus proche de tes utilisateurs
5. Wait ~2 minutes for provisioning

### 1.2 Exécuter le schéma SQL

1. Dans Supabase Dashboard → **SQL Editor**
2. Ouvrir le fichier `server/supabase-schema.sql`
3. Copier TOUT le contenu
4. Coller dans l'éditeur SQL → **RUN**
5. Vérifier que les tables sont créées : **Table Editor** → voir `users`, `transactions`, etc.

### 1.3 Récupérer les clés API

Dans Supabase Dashboard → **Settings** → **API** :
- **Project URL** → `SUPABASE_URL` pour le `.env`
- **service_role key** → `SUPABASE_SERVICE_KEY` (⚠️ secret, jamais exposé)
- **anon public key** → `SUPABASE_ANON_KEY`

---

## 🔧 Étape 2 : Configuration du serveur

### 2.1 Cloner/configurer le serveur

```bash
cd fitia-pro-miner/server
cp .env.example .env
nano .env  # Remplir toutes les valeurs
```

### 2.2 Configuration du wallet gas relayer

1. **Créer un wallet dédié** (NE PAS utiliser ton wallet principal) :
```bash
# Avec ethers ou MetaMask, crée un nouveau wallet
# Garde la clé privée en sécurité
```

2. **Financer le wallet** avec ~50-100 POL :
   - Envoyer POL depuis un exchange (Binance, Coinbase) vers l'adresse du relayer
   - **Toujours sur Polygon Network**

3. **Configurer le `.env`** :
```env
RELAYER_PRIVATE_KEY=0x...ta_clé_privée
RELAYER_ADDRESS=0x...adresse_du_relayer
RELAYER_MIN_POL_BALANCE=10
RELAYER_MAX_GAS_PER_TX=0.05
RELAYER_ENABLED=true
```

### 2.3 Installer et lancer

```bash
npm install
npm run dev    # Mode développement
npm start      # Mode production
```

---

## 📱 Étape 3 : Configurer l'application frontend

Dans `app.js`, mettre à jour `CONFIG` :

```javascript
const CONFIG = {
 CORE:  "0x...ADRESSE_CORE...",   // ← Ton contrat Core
 MINE:  "0x...ADRESSE_MINE...",   // ← Ton contrat Mine
 USDT:  "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",  // OK
 FTA:   "0x...ADRESSE_FTA...",    // ← Token FTA
 CHAIN_ID: 137,
 WC_PROJECT_ID: "...",            // WalletConnect Project ID
 API_BASE: "https://TON_DOMAINE.com",  // ← URL de ton serveur
};
```

---

## 🚀 Étape 4 : Déploiement

### Option A : Railway (recommandé, simple)

1. [railway.app](https://railway.app) → New Project → Deploy from GitHub
2. Pointe vers le dossier `server/`
3. Ajoute toutes les variables d'environnement du `.env`
4. Deploy → obtient une URL publique

### Option B : VPS (DigitalOcean, Hetzner)

```bash
# Sur le VPS
git clone <ton-repo>
cd fitia-pro-miner/server
cp .env.example .env
nano .env  # Configurer
npm install
npm install -g pm2
pm2 start index.js --name fitia-api
pm2 save
pm2 startup
```

### Option C : Render

1. [render.com](https://render.com) → New Web Service
2. Root directory: `server/`
3. Build command: `npm install`
4. Start command: `node index.js`
5. Add environment variables

---

## 🔐 Sécurité

- ⚠️ **NE JAMAIS** commit le `.env` ou exposer `SUPABASE_SERVICE_KEY`
- ⚠️ Le wallet relayer doit avoir **juste assez de POL** (~50-100), pas plus
- 🔄 Mettre en place un **monitoring** pour être alerté quand le POL du relayer est bas
- 🔑 Changer `JWT_SECRET` pour une vraie valeur aléatoire (64+ caractères)
- 🌐 En production, restreindre `CORS_ORIGIN` au domaine exact de l'app

---

## 📊 Maintenance

### Rafraîchir le leaderboard (toutes les heures)

Ajouter ceci dans Supabase SQL Editor :
```sql
SELECT cron.schedule(
  'refresh-leaderboard',
  '0 * * * *',  -- Every hour
  'SELECT refresh_leaderboard();'
);
```

### Nettoyage automatique (déjà géré)

Les sessions et challenges expirés sont nettoyés toutes les 15 minutes par le serveur.

### Vérifier le solde POL du relayer

```bash
curl https://TON_API.com/api/health
# → "relayer": "active (45.23 POL)"
```

---

## 📞 Endpoints API

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/api/auth/challenge` | Demander un challenge de signature |
| POST | `/api/auth/login` | Connexion wallet (signature) |
| POST | `/api/auth/register` | Inscription email/mot de passe |
| POST | `/api/auth/login-email` | Connexion email/mot de passe |
| GET | `/api/auth/session` | Vérifier la session |
| PUT | `/api/user/profile` | Mettre à jour le profil |
| POST | `/api/transactions` | Enregistrer une transaction |
| GET | `/api/transactions` | Lister les transactions |
| POST | `/api/activity` | Logger une activité |
| GET | `/api/activity` | Activité récente |
| GET | `/api/leaderboard` | Classement |
| POST | `/api/relay` | Soumettre une méta-transaction |
| GET | `/api/health` | État du serveur |
