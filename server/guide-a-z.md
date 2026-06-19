# FITIA PRO MINER — Guide Complet A à Z 🚀

Suis chaque étape dans l'ordre. Coche au fur et à mesure. ✅

---

## ÉTAPE 1 : Créer le wallet Gas Relayer (5 min)

Tu as besoin d'un wallet qui va payer les frais de gas POL pour tes utilisateurs.

### Méthode facile (MetaMask) :

1. Ouvre MetaMask dans ton navigateur
2. Clique sur l'icône de ton compte → **"Create Account"**
3. Nomme-le `Fitia Relayer`
4. Passe sur le réseau **Polygon Mainnet**
5. Copie l'adresse (commence par `0x...`) → garde-la

### Pour avoir la clé privée :
1. MetaMask → 3 points ⋮ à droite du compte → **"Account Details"**
2. **"Export Private Key"** → entre ton mot de passe
3. Copie la clé privée (commence par `0x...`) → ⚠️ GARDE-LA EN SÉCURITÉ

### Financer le wallet :
- Envoie **20-50 POL** depuis Binance/Coinbase vers cette adresse
- Vérifie sur polygonscan.com que les POL sont arrivés

**Tu as maintenant :**
- Adresse relayer : `0x...` ← note-la
- Clé privée relayer : `0x...` ← garde-la secrète
- Solde : ~20-50 POL

---

## ÉTAPE 2 : Créer Supabase (10 min)

### 2.1 Créer le compte
1. Va sur **[supabase.com](https://supabase.com)**
2. Clique **"Start your project"**
3. Connecte-toi avec GitHub (le plus simple)
4. Clique **"New Project"**

### 2.2 Créer le projet
1. **Name** : `fitia-pro-miner`
2. **Database Password** : choisis un mot de passe fort → **NOTE-LE**
3. **Region** : `Frankfurt` ou `London` (plus proche = plus rapide)
4. Clique **"Create new project"**
5. Attends 2 minutes que ça se crée

### 2.3 Exécuter le schéma SQL
1. Dans Supabase, menu gauche → **SQL Editor** (icône `</>`)
2. Clique **"New query"**
3. Ouvre le fichier `fitia-pro-miner/server/supabase-schema.sql` sur ton PC
4. **Copie TOUT** le contenu (Ctrl+A → Ctrl+C)
5. **Colle** dans l'éditeur SQL de Supabase (Ctrl+V)
6. Clique le bouton vert **"RUN"** en bas à droite
7. Tu dois voir : `✅ Results` ou `Success. No rows returned`

### 2.4 Vérifier les tables
1. Menu gauche → **Table Editor**
2. Tu dois voir ces tables :
   - ✅ `users`
   - ✅ `auth_challenges`
   - ✅ `auth_sessions`
   - ✅ `transactions`
   - ✅ `activity_log`
   - ✅ `leaderboard`
   - ✅ `referrals`
   - ✅ `relay_log`
   - ✅ `server_config`

### 2.5 Récupérer les clés API
1. Menu gauche → ⚙️ **Settings** → **API**
2. Copie ces DEUX valeurs :
   - **Project URL** → `https://xxxxxxxxxxxx.supabase.co`
   - **service_role key** → `eyJhbGciOi...` (⚠️ clé secrète)

**Tu as maintenant :**
- SUPABASE_URL : `https://xxxxxxxxxxxx.supabase.co`
- SUPABASE_SERVICE_KEY : `eyJhbGciOi...` (longue chaîne)
- SUPABASE_ANON_KEY : `eyJhbGciOi...` (sur la même page)

---

## ÉTAPE 3 : Déployer le serveur (10 min)

On va utiliser **Render.com** (gratuit, pas de carte bancaire).

### 3.1 Préparer les fichiers sur GitHub

1. Crée un nouveau repo sur GitHub : `fitia-pro-miner`
2. Pousse tous les fichiers dedans :

```bash
cd fitia-pro-miner
git init
git add .
git commit -m "Fitia Pro Miner v1"
git remote add origin https://github.com/TON_COMPTE/fitia-pro-miner.git
git push -u origin main
```

### 3.2 Déployer sur Render

1. Va sur **[render.com](https://render.com)**
2. Connecte-toi avec GitHub
3. Clique **"New +"** → **"Web Service"**
4. Choisis ton repo `fitia-pro-miner`
5. Configure :
   - **Name** : `fitia-api`
   - **Region** : `Frankfurt`
   - **Root Directory** : `server`
   - **Runtime** : `Node`
   - **Build Command** : `npm install`
   - **Start Command** : `node index.js`

### 3.3 Ajouter les variables d'environnement

Dans Render, section **Environment Variables**, ajoute :

| Clé | Valeur |
|-----|--------|
| `SUPABASE_URL` | `https://xxxxxxxxxxxx.supabase.co` (de l'étape 2.5) |
| `SUPABASE_SERVICE_KEY` | `eyJhbGciOi...` (de l'étape 2.5) |
| `SUPABASE_ANON_KEY` | `eyJhbGciOi...` (de l'étape 2.5) |
| `POLYGON_RPC_URL` | `https://polygon-rpc.com` |
| `CHAIN_ID` | `137` |
| `CORE_CONTRACT` | `0x...` (ton contrat Core) |
| `MINE_CONTRACT` | `0x...` (ton contrat Mine) |
| `FTA_CONTRACT` | `0x...` (ton token FTA) |
| `USDT_CONTRACT` | `0xc2132D05D31c914a87C6611C10748AEb04B58e8F` |
| `RELAYER_PRIVATE_KEY` | `0x...` (clé privée de l'étape 1) |
| `RELAYER_ADDRESS` | `0x...` (adresse de l'étape 1) |
| `RELAYER_ENABLED` | `true` |
| `RELAYER_MIN_POL_BALANCE` | `10` |
| `JWT_SECRET` | `(mets n'importe quelle chaîne de 64 caractères aléatoires)` |

### 3.4 Lancer le déploiement

1. Clique **"Create Web Service"**
2. Attends 2-3 minutes que ça build
3. Tu verras : `✅ Your service is live`
4. Copie l'URL (ex: `https://fitia-api.onrender.com`)

**Test :**
- Ouvre `https://fitia-api.onrender.com/api/health`
- Tu dois voir : `{"server":"ok","supabase":"ok",...}`

---

## ÉTAPE 4 : Configurer l'application frontend (5 min)

Dans `app.js`, mets tes vraies adresses :

```javascript
const CONFIG = {
 CORE:  "0x...TON_ADRESSE_CORE...",
 MINE:  "0x...TON_ADRESSE_MINE...",
 USDT:  "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
 FTA:   "0x...TON_ADRESSE_FTA...",
 CHAIN_ID: 137,
 API_BASE: "https://fitia-api.onrender.com",  // ← L'URL Render
 // ...
};
```

---

## ÉTAPE 5 : Héberger l'app (5 min)

### Gratuit avec Netlify ou Vercel :

#### Netlify :
1. Va sur **[netlify.com](https://netlify.com)** → Login with GitHub
2. **"Add new site"** → **"Deploy manually"**
3. Glisse-dépose le dossier `fitia-pro-miner/` (celui avec index.html)
4. C'est en ligne ! Tu reçois une URL comme `https://fitia-pro-miner.netlify.app`

#### OU GitHub Pages :
```bash
git checkout -b gh-pages
git push origin gh-pages
```
Puis dans GitHub → Settings → Pages → Source: `gh-pages` → Save

---

## 🔄 Résumé du flow complet

```
📱 Utilisateur ouvre l'app (Netlify/Pages)
  ↓
🔌 Connecte MetaMask → sélectionne Polygon
  ↓
💰 Dépose USDT/FTA → App appelle Core.depositUsdt()
  ↓
⛏️ Achète machine → App appelle Mine.buyMachine()
  ↓
🔋 Achète batterie → App appelle Mine.buyBattery()
  ↓
⚡ Plug in → Machine active, mining commence
  ↓
🎁 Claim rewards → App appelle Mine.claimRewards()
  ↓
💱 Swap → App appelle Core.swapUForF()
  ↓
📤 Withdraw → App appelle Core.withdrawUsdt()
```

```
🗄️ Supabase (données)
  ↑↓
🖥️ API Render (auth, transactions, leaderboard)
  ↑↓
📱 App frontend (UI)
  ↑↓
⛽ Relayer wallet (paye le gas POL des méta-tx)
```

---

## ✅ Checklist finale

- [ ] Wallet relayer créé et financé (20-50 POL)
- [ ] Supabase créé, SQL exécuté, tables visibles
- [ ] Serveur déployé sur Render, `/api/health` répond OK
- [ ] `CONFIG` dans app.js rempli avec les bonnes adresses
- [ ] App hébergée (Netlify/Vercel/Pages)
- [ ] Test complet : connect → deposit → buy → mine → claim → swap

---

## 🆘 Si quelque chose bloque

Dis-moi exactement à quelle étape et quel message d'erreur tu vois.

Exemples :
- "Supabase me dit 'syntax error' à la ligne X"
- "Render ne trouve pas le dossier server"
- "L'app reste sur 'Connecting...'"

Je t'aide immédiatement. 💪
