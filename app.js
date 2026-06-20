/**
 * FITIA PRO MINER — app.js v7 (zero-server)
 * ==============================================================
 * No backend server needed. Talks directly to Supabase.
 * Dual-contract architecture: Core (balances/swaps) + Mine (machines/mining).
 */

/* ═════════════════════════════════════════════════════════════
 CONFIG
 ═════════════════════════════════════════════════════════════ */
const CONFIG = {
 CORE:  "0xAaba9Ae712d501474351C252C931f95189895126",
 MINE:  "0x9eEaBEf8369812932B5f846949861fEBcFC37E73",
 USDT:  "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
 FTA:   "0x5c418b12c7e9c2A8e9A71A68c6d9b319E7B1d1fd",
 CHAIN_ID: 137,
 WC_PROJECT_ID: "2c10ee910a836551fbabbf7c8cc4542a",
 // Supabase (direct connection — no API server needed)
 SUPABASE_URL: "https://brcojzkgclqobxmqqzop.supabase.co",
 SUPABASE_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyY29qemtnY2xxb2J4bXFxem9wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3NTYwOTksImV4cCI6MjA5NzMzMjA5OX0.Py9u6tx2pVjlITel74WF1c4dBvqbCI2EqgU6PMf-670", // anon key
 // Gas Relayer (Supabase Edge Function — optional)
 SUPABASE_RELAY_URL: "https://brcojzkgclqobxmqqzop.supabase.co/functions/v1/relay",
 RELAY_ENABLED: false, // set to true after deploying the edge function
 WHATSAPP_GROUP: "https://chat.whatsapp.com/BDsvPCB6xp8H8X0YaRmPFP",
 WHATSAPP_CHANNEL: "https://whatsapp.com/channel/0029VbCQhI38PgsPLbBJdV1e"
};

/* ═════════════════════════════════════════════════════════════
 SECURITY UTILITIES
 ═════════════════════════════════════════════════════════════ */
function escapeHtml(str) {
 if (!str) return '';
 const s = String(str);
 return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}

/* ═════════════════════════════════════════════════════════════
 i18n
 ═════════════════════════════════════════════════════════════ */
const i18n = {
en: {
 connect:"Connect",home:"Home",shop:"Shop",assets:"Wallet",swapNav:"Swap",historyNav:"History",
 refTitle:"👥 Referral System",refDesc:"Enter your referrer's address to link.",bindRef:"BIND",
 power:"POWER",ftaSec:"Hashrate",pending:"PENDING",fta:"FTA",miningActive:"MINING ACTIVE",
 noMachine:"NO MACHINE",claim:"CLAIM",totalBal:"Total Balance",
 shopTitle:"⛏️ Shop",machines:"Machines",batteries:"Batteries",buy:"BUY",
 myAssets:"⚙️ Wallet & Assets",walletBal:"💰 Balances",
 plugMachine:"🔌 Plug in a machine",plugDesc:"Enter your offline machine ID and choose a battery.",
 machineId:"Machine ID (0, 1...)",plug:"PLUG IN ⚡",
 activeMachines:"⛏️ Active Machines",myMachines:"⛏️ My Machines",myBatteries:"🔋 My Batteries",
 active:"Active",expired:"Expired",inactive:"Inactive",available:"Available",
 plugged:"Plugged",notPlugged:"Not Plugged",timeRemaining:"Remaining",
 noMachines:"No machines yet",noBatteries:"No batteries yet",batteryLabel:"Battery",
 noActiveMachines:"No active machines",
 deposit:"Deposit",depositDesc:"Deposit tokens to internal balance for purchases & swaps.",depositBtn:"DEPOSIT",
 withdraw:"Withdraw",withdrawDesc:"Move tokens from internal balance back to wallet.",withdrawBtn:"WITHDRAW",
 saveProfile:"💾 Save Profile",invested:"Invested",earned:"Earned",txCount:"Tx",
 swapTitle:"💱 Swap",youPay:"You pay",balance:"Balance:",youReceive:"You receive",swap:"SWAP",
 currentRate:"1 FTA = ",usdtPerFta:" USDT",
 exchangeRate:"Exchange Rate",priceImpact:"Price Impact",swapFee:"Swap Fee (4%)",
 minimumReceived:"Minimum Received",slippageTolerance:"Slippage Tolerance",networkFee:"Network Fee",
 liquidityReserve:"Protocol Liquidity (FTA)",liquidityHint:"Backed by smart contract reserves on Polygon",
 totalTx:"Total",swaps:"Swaps",claims:"Claims",all:"All",
 noHistory:"No transactions yet. Start mining!",noActivity:"No recent activity",
 viewOnPolygon:"View on Polygonscan",
 send:"Send",receive:"Receive",recipientAddr:"Recipient address (0x...)",amount:"Amount",
 confirmSend:"CONFIRM SEND",receiveHint:"Send only POL, USDT or FTA to this address on Polygon.",
 tapToCopy:"Tap to copy",
 loading:"Loading...",connWallet:"Connecting...",linking:"Linking...",
 buyingMachine:"Buying Machine",approveUsdt:"Approving USDT...",approveFta:"Approving FTA...",
 confirming:"Confirming...",calcFta:"Calculating price...",
 buyingBattery:"Buying Battery",pluggingIn:"Plugging in...",swapping:"Swapping...",
 claiming:"Claiming...",sending:"Sending...",depositing:"Depositing...",withdrawing:"Withdrawing...",
 machineBought:"Machine purchased!",batteryBought:"Battery purchased!",
 pluggedIn:"Machine plugged in! ⚡",swapSuccess:"Swap successful!",
 claimed:"Rewards claimed!",sentSuccess:"Sent successfully!",
 addrCopied:"Address copied!",refLinked:"Referrer linked!",
 profileUpdated:"Profile updated!",deposited:"Deposited successfully!",withdrawn:"Withdrawn!",
 error:"Error",connFirst:"Connect first",invalidId:"Invalid Machine ID",
 invalidAmount:"Invalid amount",invalidAddr:"Invalid address",
 wcIdMissing:"WalletConnect ID missing!",days:"Days",rig:"RIG",
 errRejected:"Transaction cancelled",errInsufficientFunds:"Insufficient balance",
 errNetwork:"Network error. Please try again.",errTimeout:"Transaction timed out.",
 errContract:"Transaction failed. Please try again.",errGeneric:"An error occurred. Please try again.",
 errAlreadyPending:"A transaction is already pending. Please wait.",
 errNonce:"Transaction nonce error. Please restart the app.",
 errLowLiquidity:"Liquidity too low. Use USDT or deposit USDT→swap first.",
 errNoFtaLiquidity:"No FTA liquidity yet. Deposit USDT & swap USDT→FTA first.",
 errMaxFtaSell:"Cannot sell more than {max} FTA. Deposit USDT & swap USDT→FTA first.",
 errSwapRejected:"Swap rejected. Check balances & liquidity.",
 errApprovalFailed:"Approval failed. Check wallet balance.",
 errNoBal:"Insufficient internal balance. Deposit first.",
 useUsdtInstead:"Use USDT — always works.",
},
fr: {
 connect:"Connecter",home:"Accueil",shop:"Boutique",assets:"Wallet",swapNav:"Swap",historyNav:"Historique",
 refTitle:"👥 Parrainage",refDesc:"Entrez l'adresse de votre parrain.",bindRef:"LIER",
 power:"PUISSANCE",ftaSec:"Hashrate",pending:"EN ATTENTE",fta:"FTA",miningActive:"MINAGE ACTIF",
 noMachine:"AUCUNE MACHINE",claim:"RÉCLAMER",totalBal:"Solde Total",
 shopTitle:"⛏️ Boutique",machines:"Machines",batteries:"Batteries",buy:"ACHETER",
 myAssets:"⚙️ Wallet & Actifs",walletBal:"💰 Soldes",
 plugMachine:"🔌 Brancher une machine",plugDesc:"Entrez l'ID de votre machine.",machineId:"ID Machine (0, 1...)",plug:"BRANCHER ⚡",
 activeMachines:"⛏️ Machines Actives",myMachines:"⛏️ Mes Machines",myBatteries:"🔋 Mes Batteries",
 active:"Actif",expired:"Expiré",inactive:"Inactif",available:"Disponible",
 plugged:"Branché",notPlugged:"Non branché",timeRemaining:"Restant",
 noMachines:"Aucune machine",noBatteries:"Aucune batterie",batteryLabel:"Batterie",
 noActiveMachines:"Aucune machine active",
 deposit:"Déposer",depositDesc:"Déposez des tokens dans le solde interne.",depositBtn:"DÉPOSER",
 withdraw:"Retirer",withdrawDesc:"Retirez les tokens vers votre wallet.",withdrawBtn:"RETIRER",
 saveProfile:"💾 Sauvegarder",invested:"Investi",earned:"Gagné",txCount:"Tx",
 swapTitle:"💱 Échange",youPay:"Vous payez",balance:"Solde:",youReceive:"Vous recevez",swap:"ÉCHANGER",
 currentRate:"1 FTA = ",usdtPerFta:" USDT",
 exchangeRate:"Taux de change",priceImpact:"Impact prix",swapFee:"Frais (4%)",
 minimumReceived:"Minimum reçu",slippageTolerance:"Tolérance slippage",networkFee:"Frais réseau",
 liquidityReserve:"Liquidité du Protocole (FTA)",liquidityHint:"Garanti par les réserves smart contract sur Polygon",
 totalTx:"Total",swaps:"Swaps",claims:"Réclamations",all:"Tout",
 noHistory:"Aucune transaction. Commencez à miner!",noActivity:"Aucune activité",
 viewOnPolygon:"Voir sur Polygonscan",
 send:"Envoyer",receive:"Recevoir",recipientAddr:"Destinataire (0x...)",amount:"Montant",
 confirmSend:"CONFIRMER ENVOI",receiveHint:"Envoyez POL, USDT ou FTA sur Polygon.",
 tapToCopy:"Appuyez pour copier",
 loading:"Chargement...",connWallet:"Connexion...",linking:"Liaison...",
 buyingMachine:"Achat Machine",approveUsdt:"Approbation USDT...",approveFta:"Approbation FTA...",
 confirming:"Confirmation...",calcFta:"Calcul prix...",
 buyingBattery:"Achat Batterie",pluggingIn:"Branchement...",swapping:"Swap...",
 claiming:"Claim...",sending:"Envoi...",depositing:"Dépôt...",withdrawing:"Retrait...",
 machineBought:"Machine achetée!",batteryBought:"Batterie achetée!",
 pluggedIn:"Machine branchée! ⚡",swapSuccess:"Échange réussi!",
 claimed:"Gains réclamés!",sentSuccess:"Envoi réussi!",
 addrCopied:"Adresse copiée!",refLinked:"Parrain lié!",
 profileUpdated:"Profil mis à jour!",deposited:"Dépôt réussi!",withdrawn:"Retiré!",
 error:"Erreur",connFirst:"Connectez-vous",invalidId:"ID invalide",
 invalidAmount:"Montant invalide",invalidAddr:"Adresse invalide",
 wcIdMissing:"ID WalletConnect manquant!",days:"Jours",rig:"RIG",
 errRejected:"Transaction annulée",errInsufficientFunds:"Solde insuffisant",
 errNetwork:"Erreur réseau.",errTimeout:"Délai expiré.",
 errContract:"Transaction échouée.",errGeneric:"Une erreur est survenue.",
 errAlreadyPending:"Transaction en cours.",errNonce:"Erreur de nonce.",
 errLowLiquidity:"Liquidité trop faible.",errNoFtaLiquidity:"Pas de liquidité FTA.",
 errMaxFtaSell:"Max {max} FTA.",errSwapRejected:"Échange rejeté.",
 errApprovalFailed:"Approbation échouée.",errNoBal:"Solde interne insuffisant. Déposez d'abord.",
 useUsdtInstead:"Utilisez USDT.",
},
zh: {
 connect:"连接",home:"首页",shop:"商店",assets:"钱包",swapNav:"兑换",historyNav:"历史",
 refTitle:"👥 推荐系统",refDesc:"输入推荐人地址。",bindRef:"绑定",
 power:"算力",ftaSec:"Hashrate",pending:"待领取",fta:"FTA",miningActive:"挖矿中",
 noMachine:"无机器",claim:"领取",totalBal:"总余额",
 shopTitle:"⛏️ 商店",machines:"矿机",batteries:"电池",buy:"购买",
 myAssets:"⚙️ 钱包与资产",walletBal:"💰 余额",
 plugMachine:"🔌 插入机器",plugDesc:"输入机器ID。",machineId:"ID (0,1...)",plug:"插入 ⚡",
 activeMachines:"⛏️ 运行中",myMachines:"⛏️ 我的矿机",myBatteries:"🔋 我的电池",
 active:"运行中",expired:"已过期",inactive:"未激活",available:"可用",
 plugged:"已插入",notPlugged:"未插入",timeRemaining:"剩余",
 noMachines:"暂无矿机",noBatteries:"暂无电池",batteryLabel:"电池",
 noActiveMachines:"无运行中矿机",
 deposit:"存入",depositDesc:"存入代币到内部余额。",depositBtn:"存入",
 withdraw:"提取",withdrawDesc:"提取代币到钱包。",withdrawBtn:"提取",
 saveProfile:"💾 保存",invested:"投资",earned:"收益",txCount:"交易",
 swapTitle:"💱 兑换",youPay:"支付",balance:"余额:",youReceive:"收到",swap:"兑换",
 currentRate:"1 FTA = ",usdtPerFta:" USDT",
 exchangeRate:"汇率",priceImpact:"价格影响",swapFee:"手续费 (4%)",
 minimumReceived:"最低收到",slippageTolerance:"滑点容忍度",networkFee:"网络费",
 liquidityReserve:"协议流动性 (FTA)",liquidityHint:"由Polygon智能合约储备保障",
 totalTx:"总计",swaps:"兑换",claims:"领取",all:"全部",
 noHistory:"暂无交易记录。",noActivity:"暂无活动",
 viewOnPolygon:"查看交易",
 send:"发送",receive:"接收",recipientAddr:"接收方 (0x...)",amount:"金额",
 confirmSend:"确认发送",receiveHint:"仅发送POL/USDT/FTA到Polygon地址。",
 tapToCopy:"点击复制",
 loading:"加载中...",connWallet:"连接中...",linking:"绑定中...",
 buyingMachine:"购买机器",approveUsdt:"授权USDT...",approveFta:"授权FTA...",
 confirming:"确认中...",calcFta:"计算价格...",
 buyingBattery:"购买电池",pluggingIn:"插入中...",swapping:"兑换中...",
 claiming:"领取中...",sending:"发送中...",depositing:"存入中...",withdrawing:"提取中...",
 machineBought:"购买成功！",batteryBought:"电池购买成功！",
 pluggedIn:"插入成功！⚡",swapSuccess:"兑换成功！",
 claimed:"奖励已领取！",sentSuccess:"发送成功！",
 addrCopied:"已复制！",refLinked:"绑定成功！",
 profileUpdated:"资料已更新！",deposited:"存入成功！",withdrawn:"提取成功！",
 error:"错误",connFirst:"请先连接",invalidId:"无效ID",
 invalidAmount:"无效金额",invalidAddr:"无效地址",
 wcIdMissing:"缺少WalletConnect ID！",days:"天",rig:"矿机",
 errRejected:"交易已取消",errInsufficientFunds:"余额不足",
 errNetwork:"网络错误。",errTimeout:"超时。",
 errContract:"交易失败。",errGeneric:"发生错误。",
 errAlreadyPending:"交易待处理。",errNonce:"Nonce错误。",
 errLowLiquidity:"流动性不足。",errNoFtaLiquidity:"无FTA流动性。",
 errMaxFtaSell:"最多{max}FTA。",errSwapRejected:"兑换被拒绝。",
 errApprovalFailed:"授权失败。",errNoBal:"内部余额不足，请先存入。",
 useUsdtInstead:"请用USDT。",
}
};

/* ═════════════════════════════════════════════════════════════
 CHAT INTENTS + RESPONSES (unchanged)
 ═════════════════════════════════════════════════════════════ */
const CHAT_INTENTS = {
 what_is_fitia:{weight:5,keywords:{all:['what is fitia','c quoi fitia','fitia c quoi','about fitia','explain fitia','fitia pro','fitia project','介绍','fitia是什么']}},
 how_mining_works:{weight:4,keywords:{all:['how mining works','explain mining','mine','mining','minage','挖矿','how to mine','comment miner']}},
 how_swap_works:{weight:4,keywords:{all:['swap','exchange','échanger','tausch','兑换','how to swap']}},
 tokenomics:{weight:4,keywords:{all:['tokenomics','fta token','what is fta','fta price','token supply']}},
 beginner_guide:{weight:5,keywords:{all:['beginner','débutant','新手','how to start','getting started','commencer','je sais pas','我不知道']}},
 security:{weight:4,keywords:{all:['security','safe','sécurité','安全','scam','is it safe','is it legit']}},
 greeting:{weight:1,keywords:{all:['hello','hi','hey','bonjour','salut','你好']}},
 help:{weight:2,keywords:{all:['help','aide','帮助','guide']}},
};

const CHAT_RESPONSES = {
 beginner_guide:{en:'🚀 1. Install MetaMask → Polygon\n💰 2. Buy POL+USDT → Polygon\n🔗 3. Connect wallet → Deposit USDT\n⛏️ 4. Buy machine (USDT) + battery\n🔋 5. Plug in → Mining FTA!\n🎁 6. Tap CLAIM to collect rewards'},
 default:{en:'👋 Fitia Assistant — Ask me about: Mining, Swaps, Deposits, Getting Started, or Security!'}
};

/* ═════════════════════════════════════════════════════════════
 ABIs
 ═════════════════════════════════════════════════════════════ */
const CORE_ABI = [
 "function usdt() view returns (address)",
 "function fta() view returns (address)",
 "function uBal(address) view returns (uint256)",
 "function fBal(address) view returns (uint256)",
 "function depositUsdt(uint256 a) external",
 "function depositFta(uint256 a) external",
 "function withdrawUsdt(uint256 a) external",
 "function withdrawFta(uint256 a) external",
 "function setReferrer(address r) external",
 "function swapUForF(uint256 a, uint256 m, uint256 d) external",
 "function swapFForU(uint256 a, uint256 m, uint256 d) external",
 "function rate() view returns (uint256)",
 "function buyFta(uint256 a) view returns (uint256)",
 "function sellFta(uint256 a) view returns (uint256)",
 "function costFta(uint256 a) view returns (uint256)",
 "function netFta() view returns (uint256)",
 "function difficulty() view returns (uint256)",
 "function devFee() view returns (uint256)",
 "function comRates(uint256) view returns (uint256)",
 "function myInfo() view returns (uint256 id, uint256 p, uint256 ub, uint256 fb)",
 "function nonce(address) view returns (uint256)",
 "function pol(address) view returns (uint256)",
 "function gasFee() view returns (uint256)",
 "function executeMetaTx(address,bytes,uint256,bytes) external",
];

const MINE_ABI = [
 "function mCount() view returns (uint256)",
 "function mTypes(uint256) view returns (uint256 price, uint256 power)",
 "function bCount() view returns (uint256)",
 "function bTypes(uint256) view returns (uint256 price, uint256 dur)",
 "function buyMachine(uint256 t) external",
 "function buyMachineFTA(uint256 t) external",
 "function buyBattery(uint256 t) external",
 "function buyBatteryFTA(uint256 t) external",
 "function plugInMachine(uint256 mi, uint256 bi) external",
 "function claimRewards() external",
 "function powerOf(address u) view returns (uint256)",
 "function myMachines(address u) view returns (tuple(uint256 tid, uint256 exp)[])",
 "function myBattery(address u, uint256 t) view returns (uint256)",
 "function myInfo(address u) view returns (uint256 mc, uint256 ap, uint256 lc)",
];

const ERC20_ABI = [
 "function balanceOf(address) view returns (uint256)",
 "function decimals() view returns (uint8)",
 "function approve(address, uint256) returns (bool)",
 "function allowance(address, address) view returns (uint256)",
 "function transfer(address to, uint256 amount) returns (bool)"
];

const SWAP_FEE_RATE = 0.04;
const SLIPPAGE = 0.005;
const SWAP_DEADLINE_SEC = 1200;

/* ═════════════════════════════════════════════════════════════
 SUPABASE CLIENT (direct — no API server needed)
 ═════════════════════════════════════════════════════════════ */
class SupaDB {
 constructor(url, key) { this.url = url; this.key = key; }
 async _call(method, path, body) {
 try {
 const res = await fetch(`${this.url}/rest/v1${path}`, {
 method,
 headers: { 'apikey': this.key, 'Authorization': `Bearer ${this.key}`, 'Content-Type': 'application/json', 'Prefer': method === 'GET' ? '' : 'return=representation' },
 body: body ? JSON.stringify(body) : undefined
 });
 if (!res.ok) { const e = await res.json().catch(()=>({})); throw new Error(e.message || res.statusText); }
 return await res.json();
 } catch(e) { console.warn('[Supabase]', e.message); return null; }
 }
 async getUser(wallet) {
 const d = await this._call('GET', `/users?wallet_address=eq.${wallet.toLowerCase()}&limit=1`);
 return d && d.length ? d[0] : null;
 }
 async createUser(data) {
 const d = await this._call('POST', '/users', data);
 return d && d.length ? d[0] : null;
 }
 async updateUser(id, data) {
 const d = await this._call('PATCH', `/users?id=eq.${id}`, data);
 return d && d.length ? d[0] : null;
 }
 async addTx(data) {
 return this._call('POST', '/transactions', data);
 }
 async getTxs(userId, type, limit) {
 let path = `/transactions?user_id=eq.${userId}&order=created_at.desc&limit=${limit || 50}`;
 if (type && type !== 'all') path += `&tx_type=eq.${type}`;
 return this._call('GET', path);
 }
 async addActivity(data) {
 return this._call('POST', '/activity_log', data);
 }
 async getLeaderboard(limit) {
 return this._call('GET', `/users?select=username,wallet_address,level,total_earned,machines_count&order=total_earned.desc&limit=${limit || 20}`);
 }
}

/* ═════════════════════════════════════════════════════════════
 APPLICATION
 ═════════════════════════════════════════════════════════════ */
class Application {
 constructor(){
 this.provider = null; this.signer = null;
 this.core = null; this.mine = null; this.usdt = null; this.fta = null;
 this.user = null;
 this.payMode = 'USDT'; this.shopViewMode = 'machines';
 this.swapDirection = 'USDT_TO_FTA';
 this.ftaDecimals = 18; this.usdtDecimals = 6;
 this.currentDifficulty = 1n; this.currentRealPower = 0;
 this.pendingBalance = 0; this.miningTimer = null;
 this._dataInterval = null;
 this.shopMachinesData = []; this.shopBatteriesData = [];
 this.isLoadingShop = false;
 this.polPriceUsd = 0; this.ftaPriceUsd = 0;
 this.userMachines = []; this.userBatteries = {};
 this.userLastClaimTime = 0; this.batteryTypeDurations = {};
 this.vizContext = null; this.vizBars = [];
 this.sendTokenSymbol = 'POL';
 this.chatInitialized = false; this.chatHistory = [];
 this.netFtaSold = 0n;
 this.internalU = 0n; this.internalF = 0n;

 // Supabase
 this.db = new SupaDB(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);
 this.profileData = null;

 // History
 this.historyFilter = 'all';
 this.historyData = [];
 this.activityData = [];
 this.leaderboardData = [];
 this.localTxLog = JSON.parse(localStorage.getItem('fitia_tx_log_v1') || '[]');

 const savedLang = localStorage.getItem('fitia_lang');
 this.currentLang = savedLang && i18n[savedLang] ? savedLang : 'en';
 }

 t(key){ return i18n[this.currentLang]?.[key] || i18n['en'][key] || key; }
 formatUsd(v){ return '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
 formatHashrate(h){
 if (h <= 0) return '0 H/s';
 const u = ['H/s','KH/s','MH/s','GH/s','TH/s','PH/s'];
 let v = h, i = 0;
 while (v >= 1000 && i < u.length-1) { v /= 1000; i++; }
 return v.toFixed(2) + ' ' + u[i];
 }
 formatTimeRemaining(s){
 if (s <= 0) return this.t('expired');
 const d = Math.floor(s/86400), h = Math.floor((s%86400)/3600), m = Math.floor((s%3600)/60);
 if (d > 1) return `${d}d ${h}h`; if (d === 1) return `1d ${h}h`;
 if (h > 0) return `${h}h ${m}m`; return `${m}m`;
 }
 getBatteryDuration(id){
 if (this.batteryTypeDurations[id] !== undefined) return this.batteryTypeDurations[id];
 return {0:3,1:7,2:15,3:30,4:90,5:180,6:270,7:365}[id] || 30;
 }

 _logLocalTx(tx) {
 this.localTxLog.unshift({ ...tx, timestamp: Date.now() });
 if (this.localTxLog.length > 200) this.localTxLog.length = 200;
 localStorage.setItem('fitia_tx_log_v1', JSON.stringify(this.localTxLog));
 }
 async recordTx(type, tokenFrom, tokenTo, amountFrom, amountTo, txHash, metadata) {
 this._logLocalTx({ type, tokenFrom, tokenTo, amountFrom, amountTo, txHash, metadata });
 if (this.profileData) {
 this.db.addTx({
 user_id: this.profileData.id,
 wallet_address: this.user.toLowerCase(),
 tx_type: type,
 token_from: tokenFrom || '', token_to: tokenTo || '',
 amount_from: amountFrom || 0, amount_to: amountTo || 0,
 tx_hash: txHash || 'local',
 status: txHash ? 'confirmed' : 'pending',
 metadata: metadata || {}
 }).catch(() => {});
 }
 }

 setLanguage(lang){ if (!i18n[lang]) return; this.currentLang = lang; localStorage.setItem('fitia_lang', lang); const f = { en:'🇬🇧', fr:'🇫🇷', de:'🇩🇪', zh:'🇨🇳', sg:'🇸🇬' }; document.getElementById('lang-btn-display').innerText = `${f[lang]} ${lang.toUpperCase()}`; }
 init(){ this.setLanguage(this.currentLang); }

 async fetchMarketPrices(){
 this.polPriceUsd = 0;
 try { const r = await fetch('https://api.dexscreener.com/latest/dex/tokens/0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0'); const d = await r.json(); if (d.pairs?.length) this.polPriceUsd = parseFloat(d.pairs[0].priceUsd) || 0; } catch(e) {}
 if (!this.polPriceUsd) { try { const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=matic-network&vs_currencies=usd'); const d = await r.json(); this.polPriceUsd = d['matic-network']?.usd || 0; } catch(e2) {} }
 if (!this.polPriceUsd) this.polPriceUsd = 0.70;
 }

 async connect(){
 if (window.ethereum) {
 this.setLoader(true, this.t('connWallet'));
 try {
 await window.ethereum.request({ method: 'eth_requestAccounts' });
 this.provider = new ethers.BrowserProvider(window.ethereum);
 this.signer = await this.provider.getSigner();
 this.user = await this.signer.getAddress();
 const n = await this.provider.getNetwork();
 if (Number(n.chainId) !== CONFIG.CHAIN_ID) await this.switchNetwork();
 await this.initContracts();
 window.ethereum.on('accountsChanged', () => App.disconnect());
 window.ethereum.on('chainChanged', () => App.disconnect());
 } catch(e) { this.showError(e); } finally { this.setLoader(false); }
 } else if (typeof EthereumProvider !== 'undefined' && CONFIG.WC_PROJECT_ID && !CONFIG.WC_PROJECT_ID.includes("...")) {
 this.setLoader(true, this.t('connWallet'));
 try {
 const wc = await EthereumProvider.init({ projectId: CONFIG.WC_PROJECT_ID, chains: [CONFIG.CHAIN_ID], showQrModal: true, methods: ['eth_sendTransaction','personal_sign'], metadata: { name: 'FITIA PRO MINER', description: 'Mining DApp', url: window.location.origin, icons: [window.location.origin+'/logo.png'] } });
 await wc.enable(); this.provider = new ethers.BrowserProvider(wc); this.signer = await this.provider.getSigner();
 this.user = await this.signer.getAddress(); await this.initContracts();
 wc.on("disconnect", () => App.disconnect());
 } catch(e) { this.showError(e); } finally { this.setLoader(false); }
 } else { this.showToast("Please install MetaMask or use a Web3 browser.", true); }
 }

 async initContracts(){
 this.usdt = new ethers.Contract(CONFIG.USDT, ERC20_ABI, this.signer);
 this.fta = new ethers.Contract(CONFIG.FTA, ERC20_ABI, this.signer);
 this.core = new ethers.Contract(CONFIG.CORE, CORE_ABI, this.signer);
 this.mine = new ethers.Contract(CONFIG.MINE, MINE_ABI, this.signer);
 try { this.ftaDecimals = Number(await this.fta.decimals()); } catch(e) { this.ftaDecimals = 18; }
 try { this.usdtDecimals = Number(await this.usdt.decimals()); } catch(e) { this.usdtDecimals = 6; }
 document.getElementById('btn-connect').classList.add('hidden');
 document.getElementById('wallet-status').classList.remove('hidden');
 document.getElementById('addr-display').innerText = this.user.slice(0,6) + "..." + this.user.slice(-4);
 await this.refreshInternalBalances();
 // Supabase: find or create user
 try {
 let u = await this.db.getUser(this.user);
 if (!u) { u = await this.db.createUser({ wallet_address: this.user.toLowerCase(), username: 'Miner_' + this.user.slice(2,8), level: 0, total_invested: 0, total_earned: 0, machines_count: 0 }); }
 if (u) { this.profileData = u; this.updateProfileUI(); }
 } catch(e) { console.warn('Supabase login:', e.message); }
 try { const lp = JSON.parse(localStorage.getItem('fitia_profile')); if (lp) this.profileData = { ...this.profileData, ...lp }; } catch(e) {}
 await this.fetchMarketPrices(); await this.cacheBatteryDurations(); await this.updateData();
 this._dataInterval = setInterval(() => this.updateData(), 15000);
 this.initVisualizer(); window.addEventListener('resize', () => this.resizeCanvas());
 // History refresh
 setTimeout(() => this.refreshHistory(), 2000);
 setInterval(() => this.refreshHistory(), 60000);
 }

 async switchNetwork(){ try { await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0x89' }] }); } catch(e) { if (e.code === 4902) { await window.ethereum.request({ method: 'wallet_addEthereumChain', params: [{ chainId: '0x89', chainName: 'Polygon', nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 }, rpcUrls: ['https://polygon-rpc.com/'], blockExplorerUrls: ['https://polygonscan.com/'] }] }); } } }
 async cacheBatteryDurations(){ try { const cnt = Number(await this.mine.bCount()); for (let i = 0; i < cnt; i++) { try { const b = await this.mine.bTypes(i); this.batteryTypeDurations[i] = Number(b.dur) / 86400; } catch(e) {} } } catch(e) {} }
 async refreshInternalBalances(){ if (!this.user || !this.core) return; try { this.internalU = await this.core.uBal(this.user); this.internalF = await this.core.fBal(this.user); } catch(e) { this.internalU = 0n; this.internalF = 0n; } }

 /* ═══════════ DATA REFRESH ═══════════════════════════ */
 async updateData(){
 if (!this.user || !this.core || !this.mine) return;
 try {
 this.internalU = await this.core.uBal(this.user);
 this.internalF = await this.core.fBal(this.user);
 try { this.currentDifficulty = await this.core.difficulty(); } catch(e) {}
 try { this.netFtaSold = await this.core.netFta(); } catch(e) {}
 try { this.currentRealPower = Number(await this.mine.powerOf(this.user)); } catch(e) {}
 try {
 const machines = await this.mine.myMachines(this.user);
 this.userMachines = machines.map(m => ({ typeId: Number(m.tid), expiresAt: Number(m.exp) }));
 try { const info = await this.mine.myInfo(this.user); this.userLastClaimTime = Number(info.lc); } catch(e) { this.userLastClaimTime = Math.floor(Date.now()/1000); }
 } catch(e) { this.userMachines = []; this.userLastClaimTime = Math.floor(Date.now()/1000); }
 try {
 this.userBatteries = {};
 const bCnt = Number(await this.mine.bCount());
 for (let i = 0; i < bCnt; i++) { try { const bal = Number(await this.mine.myBattery(this.user, i)); if (bal > 0) this.userBatteries[i] = bal; } catch(e) {} }
 } catch(e) { this.userBatteries = {}; }

 const now = Math.floor(Date.now()/1000), elapsed = Math.max(0, now - this.userLastClaimTime);
 if (this.currentRealPower > 0 && elapsed > 0 && this.userLastClaimTime > 0) {
 const rps = (this.currentRealPower * Number(this.currentDifficulty)) / 1e18;
 this.pendingBalance = rps * elapsed;
 document.getElementById('val-pending').innerText = this.pendingBalance.toFixed(5);
 document.getElementById('viz-status').innerText = this.t('miningActive');
 document.getElementById('viz-status').style.color = "var(--primary)";
 } else { this.pendingBalance = 0; document.getElementById('val-pending').innerText = "0.00000"; document.getElementById('viz-status').innerText = this.t('noMachine'); document.getElementById('viz-status').style.color = "#666"; }
 this.updateVisualizerIntensity(this.currentRealPower);
 if (this.currentRealPower > 0) { if (!this.miningTimer) this.startMiningCounter(); } else { this.stopMiningCounter(); }
 document.getElementById('val-power').innerText = this.formatHashrate(this.currentRealPower);

 const polBal = await this.provider.getBalance(this.user);
 const usdtBalWallet = await this.usdt.balanceOf(this.user);
 const ftaBalWallet = await this.fta.balanceOf(this.user);
 const pB = parseFloat(ethers.formatUnits(polBal, 18));
 const uBW = parseFloat(ethers.formatUnits(usdtBalWallet, this.usdtDecimals));
 const fBW = parseFloat(ethers.formatUnits(ftaBalWallet, this.ftaDecimals));
 const uBI = parseFloat(ethers.formatUnits(this.internalU, this.usdtDecimals));
 const fBI = parseFloat(ethers.formatUnits(this.internalF, this.ftaDecimals));

 document.getElementById('bal-pol-2').innerText = pB.toFixed(4);
 document.getElementById('bal-usdt-2').innerText = uBW.toFixed(2);
 document.getElementById('bal-fta-2').innerText = fBW.toFixed(4);
 const ubiEl = document.getElementById('bal-usdt-internal');
 const fbiEl = document.getElementById('bal-fta-internal');
 if (ubiEl) ubiEl.innerText = uBI.toFixed(2);
 if (fbiEl) fbiEl.innerText = fBI.toFixed(4);

 try { const oneFta = ethers.parseUnits("1", this.ftaDecimals); const usdtOut = await this.core.sellFta(oneFta); this.ftaPriceUsd = parseFloat(ethers.formatUnits(usdtOut, this.usdtDecimals)); } catch(e) { try { const r = await this.core.rate(); this.ftaPriceUsd = parseFloat(ethers.formatUnits(r, this.ftaDecimals)); } catch(e2) { this.ftaPriceUsd = 0; } }
 document.getElementById('price-pol').innerText = this.formatUsd(this.polPriceUsd);
 document.getElementById('price-usdt').innerText = this.formatUsd(1);
 document.getElementById('price-fta').innerText = this.formatUsd(this.ftaPriceUsd);
 document.getElementById('bal-pol-2-usd').innerText = '≈ ' + this.formatUsd(pB * this.polPriceUsd);
 document.getElementById('bal-usdt-2-usd').innerText = '≈ ' + this.formatUsd(uBW);
 document.getElementById('bal-fta-2-usd').innerText = '≈ ' + this.formatUsd(fBW * this.ftaPriceUsd);
 const totalUsd = pB * this.polPriceUsd + uBW + fBW * this.ftaPriceUsd + uBI + fBI * this.ftaPriceUsd;
 document.getElementById('val-total-usd').innerText = this.formatUsd(totalUsd);
 document.getElementById('swap-rate').innerText = this.t('currentRate') + this.ftaPriceUsd.toFixed(6) + this.t('usdtPerFta');
 const nfsEl = document.getElementById('net-fta-sold-display');
 if (nfsEl) { const nfsHuman = parseFloat(ethers.formatUnits(this.netFtaSold, this.ftaDecimals)); nfsEl.innerText = nfsHuman.toFixed(4) + ' FTA'; nfsEl.className = 'liquidity-value'; if (this.netFtaSold === 0n) nfsEl.classList.add('none'); else if (nfsHuman < 100) nfsEl.classList.add('low'); else nfsEl.classList.add('high'); }
 const fromDec = this.swapDirection === 'USDT_TO_FTA' ? this.usdtDecimals : this.ftaDecimals;
 const toDec = this.swapDirection === 'USDT_TO_FTA' ? this.ftaDecimals : this.usdtDecimals;
 document.getElementById('swap-bal-from').innerText = parseFloat(ethers.formatUnits(this.swapDirection === 'USDT_TO_FTA' ? this.internalU : this.internalF, fromDec)).toFixed(4);
 document.getElementById('swap-bal-to').innerText = parseFloat(ethers.formatUnits(this.swapDirection === 'USDT_TO_FTA' ? this.internalF : this.internalU, toDec)).toFixed(4);
 await this.renderShop(); this.renderActiveMachines(); this.renderUserMachines(); this.renderUserBatteries();
 if (document.getElementById('swap-from-in').value) this.calcSwap();
 } catch(e) { console.error("Refresh Error", e); }
 }

 startMiningCounter(){ if (this.miningTimer) return; this.miningTimer = setInterval(() => { if (this.currentRealPower > 0) { const rps = (this.currentRealPower * Number(this.currentDifficulty)) / 1e18; this.pendingBalance += rps; document.getElementById('val-pending').innerText = this.pendingBalance.toFixed(5); } }, 1000); }
 stopMiningCounter(){ if (this.miningTimer) { clearInterval(this.miningTimer); this.miningTimer = null; } }

 /* ── Referral ── */
 async bindReferrer(){ const a = document.getElementById('ref-address-input').value.trim(); if (!ethers.isAddress(a)) return this.showToast(this.t('invalidAddr'), true); this.setLoader(true, this.t('linking')); try { const tx = await this.core.setReferrer(a); await tx.wait(); this.showToast(this.t('refLinked')); document.getElementById('ref-address-input').value = ''; } catch(e) { this.showError(e); } this.setLoader(false); }

 /* ── Shop ── */
 setPayMode(m){ this.payMode = m; document.getElementById('btn-pay-usdt').classList.toggle('active', m==='USDT'); document.getElementById('btn-pay-fta').classList.toggle('active', m==='FTA'); this.renderShop(); }
 setShopView(v){ this.shopViewMode = v; document.querySelectorAll('.shop-tab').forEach(t => t.classList.remove('active')); if (event?.currentTarget) event.currentTarget.classList.add('active'); this.renderShop(); }
 async renderShop(){ if (this.isLoadingShop) return; const c = document.getElementById('shop-list'); if (this.shopViewMode === 'machines') { if (!this.shopMachinesData.length) await this.fetchMachines(); this._renderShopMachinesHTML(c); } else { if (!this.shopBatteriesData.length) await this.fetchBatteries(); this._renderShopBatteriesHTML(c); } }
 async fetchMachines(){ this.isLoadingShop = true; try { const cnt = Number(await this.mine.mCount()); const p = []; for (let i=0;i<cnt;i++) p.push(this.mine.mTypes(i)); const r = await Promise.all(p); this.shopMachinesData=[]; for (let i=0;i<cnt;i++) { const d=r[i]; this.shopMachinesData.push({ price: parseFloat(ethers.formatUnits(d.price, this.usdtDecimals)), power: Number(d.power), priceRaw: d.price }); } } catch(e) { console.error("fetchMachines", e); } this.isLoadingShop=false; }
 async fetchBatteries(){ this.isLoadingShop = true; try { const cnt = Number(await this.mine.bCount()); const p = []; for (let i=0;i<cnt;i++) p.push(this.mine.bTypes(i)); const r = await Promise.all(p); this.shopBatteriesData=[]; for (let i=0;i<cnt;i++) { const d=r[i]; this.shopBatteriesData.push({ price: parseFloat(ethers.formatUnits(d.price, this.usdtDecimals)), days: Number(d.dur)/86400, priceRaw: d.price }); } } catch(e) { console.error("fetchBatteries", e); } this.isLoadingShop=false; }

 /* ═══════════ DEPOSIT / WITHDRAW ══ */
 async depositToken(tokenSymbol, amountStr){
 if (!this.user) return this.connect();
 const amount = parseFloat(amountStr);
 if (!amount || amount <= 0) return this.showToast(this.t('invalidAmount'), true);
 this.setLoader(true, this.t('depositing') + ' ⛽...');
 try {
  let txHash;
  if (tokenSymbol === 'USDT') {
   const raw = ethers.parseUnits(amountStr, this.usdtDecimals);
   const allowance = await this.usdt.allowance(this.user, CONFIG.CORE);
   if (allowance < raw) { this.setLoader(true, this.t('approveUsdt')); await (await this.usdt.approve(CONFIG.CORE, raw)).wait(); }
   this.setLoader(true, this.t('confirming'));
   if (this.isRelayEnabled()) {
    const r = await this.relayTx('core', 'depositUsdt', [raw], 'Deposit USDT');
    txHash = r.txHash;
   } else {
    const tx = await this.core.depositUsdt(raw); await tx.wait();
    txHash = tx.hash;
   }
   this.recordTx('deposit', 'USDT', '', amount, '', txHash, {});
  } else if (tokenSymbol === 'FTA') {
   const raw = ethers.parseUnits(amountStr, this.ftaDecimals);
   const allowance = await this.fta.allowance(this.user, CONFIG.CORE);
   if (allowance < raw) { this.setLoader(true, this.t('approveFta')); await (await this.fta.approve(CONFIG.CORE, raw)).wait(); }
   this.setLoader(true, this.t('confirming'));
   if (this.isRelayEnabled()) {
    const r = await this.relayTx('core', 'depositFta', [raw], 'Deposit FTA');
    txHash = r.txHash;
   } else {
    const tx = await this.core.depositFta(raw); await tx.wait();
    txHash = tx.hash;
   }
   this.recordTx('deposit', 'FTA', '', amount, '', txHash, {});
  }
  await this.refreshInternalBalances(); this.showToast(this.t('deposited') + (this.isRelayEnabled() ? ' ⛽' : ''));
  document.getElementById('deposit-amount-usdt').value = ''; document.getElementById('deposit-amount-fta').value = '';
  await this.updateData();
 } catch(e) { this.showError(e); }
 this.setLoader(false);
 }

 async withdrawToken(tokenSymbol, amountStr){
 if (!this.user) return this.connect();
 const amount = parseFloat(amountStr);
 if (!amount || amount <= 0) return this.showToast(this.t('invalidAmount'), true);
 this.setLoader(true, this.t('withdrawing') + ' ⛽...');
 try {
  let txHash;
  if (tokenSymbol === 'USDT') {
   if (this.isRelayEnabled()) {
    const r = await this.relayTx('core', 'withdrawUsdt', [ethers.parseUnits(amountStr, this.usdtDecimals)], 'Withdraw USDT');
    txHash = r.txHash;
   } else {
    const tx = await this.core.withdrawUsdt(ethers.parseUnits(amountStr, this.usdtDecimals));
    await tx.wait(); txHash = tx.hash;
   }
  } else if (tokenSymbol === 'FTA') {
   if (this.isRelayEnabled()) {
    const r = await this.relayTx('core', 'withdrawFta', [ethers.parseUnits(amountStr, this.ftaDecimals)], 'Withdraw FTA');
    txHash = r.txHash;
   } else {
    const tx = await this.core.withdrawFta(ethers.parseUnits(amountStr, this.ftaDecimals));
    await tx.wait(); txHash = tx.hash;
   }
  }
  await this.refreshInternalBalances(); this.showToast(this.t('withdrawn') + (this.isRelayEnabled() ? ' ⛽' : ''));
  this.recordTx('withdraw', tokenSymbol, '', amount, '', txHash, {});
  await this.updateData();
 } catch(e) { this.showError(e); }
 this.setLoader(false);
 }

 /* ═══════════ BUY MACHINE ══ */
 async buyMachine(id){
 if (!this.user) return this.connect();
 const m = this.shopMachinesData[id];
 this.setLoader(true, `${this.t('buyingMachine')} (${this.payMode}) ⛽...`);
 try {
  let txHash;
  if (this.payMode === 'USDT') {
   if (this.internalU < m.priceRaw) { this.showToast(`${this.t('errNoBal')}\nNeed: ${m.price.toFixed(2)} USDT\nHave: ${parseFloat(ethers.formatUnits(this.internalU, this.usdtDecimals)).toFixed(2)} USDT`, true); this.setLoader(false); return; }
   if (this.isRelayEnabled()) {
    const r = await this.relayTx('mine', 'buyMachine', [id], 'Machine #'+(id+1));
    txHash = r.txHash;
    this.recordTx('buy_machine', 'USDT', '', m.price, '', txHash, { machineTypeId: id, relayer: true });
   } else {
    const tx = await this.mine.buyMachine(id); await tx.wait();
    txHash = tx.hash;
    this.recordTx('buy_machine', 'USDT', '', m.price, '', txHash, { machineTypeId: id, machineTier: id+1 });
   }
  } else {
   if (this.netFtaSold === 0n) { this.showToast(this.t('errNoFtaLiquidity') + '\n' + this.t('useUsdtInstead'), true); this.setLoader(false); return; }
   let ftCost; try { ftCost = await this.core.costFta(m.priceRaw); } catch(viewErr) { this.showToast(this.t('errLowLiquidity'), true); this.setLoader(false); return; }
   if (ftCost === 0n) { this.showToast(this.t('errLowLiquidity'), true); this.setLoader(false); return; }
   let tfp = 11; try { tfp = Number(await this.core.devFee()) + Number(await this.core.comRates(0)) + Number(await this.core.comRates(1)) + Number(await this.core.comRates(2)); } catch(e) { tfp = 11; }
   const totalFta = tfp >= 100 ? ftCost : ftCost + (ftCost * BigInt(tfp)) / BigInt(100 - tfp);
   if (this.internalF < totalFta) { const need = parseFloat(ethers.formatUnits(totalFta, this.ftaDecimals)); const have = parseFloat(ethers.formatUnits(this.internalF, this.ftaDecimals)); this.showToast(`${this.t('errNoBal')}\nNeed: ${need.toFixed(4)} FTA\nHave: ${have.toFixed(4)} FTA`, true); this.setLoader(false); return; }
   const ftExact = parseFloat(ethers.formatUnits(ftCost, this.ftaDecimals));
   if (this.isRelayEnabled()) {
    const r = await this.relayTx('mine', 'buyMachineFTA', [id], 'Machine FTA #'+(id+1));
    txHash = r.txHash;
    this.recordTx('buy_machine', 'FTA', '', ftExact, '', txHash, { machineTypeId: id, ftaCost: ftExact, relayer: true });
   } else {
    const tx = await this.mine.buyMachineFTA(id); await tx.wait();
    txHash = tx.hash;
    this.recordTx('buy_machine', 'FTA', '', ftExact, '', txHash, { machineTypeId: id, machineTier: id+1, ftaCost: ftExact });
   }
  }
  await this.refreshInternalBalances(); this.showToast(this.t('machineBought') + (this.isRelayEnabled() ? ' ⛽' : '')); this.shopMachinesData = []; await this.updateData();
 } catch(e) { this.showError(e); }
 this.setLoader(false);
 }

 /* ═══════════ BUY BATTERY ══ */
 async buyBattery(id){
 if (!this.user) return this.connect();
 const b = this.shopBatteriesData[id];
 this.setLoader(true, `${this.t('buyingBattery')} (${this.payMode}) ⛽...`);
 try {
  let txHash;
  if (this.payMode === 'USDT') {
   if (this.internalU < b.priceRaw) { this.showToast(`${this.t('errNoBal')}\nNeed: ${b.price.toFixed(2)} USDT\nHave: ${parseFloat(ethers.formatUnits(this.internalU, this.usdtDecimals)).toFixed(2)} USDT`, true); this.setLoader(false); return; }
   if (this.isRelayEnabled()) {
    const r = await this.relayTx('mine', 'buyBattery', [id], 'Battery '+b.days+'d');
    txHash = r.txHash;
    this.recordTx('buy_battery', 'USDT', '', b.price, '', txHash, { batteryTypeId: id, duration: b.days, relayer: true });
   } else {
    const tx = await this.mine.buyBattery(id); await tx.wait();
    txHash = tx.hash;
    this.recordTx('buy_battery', 'USDT', '', b.price, '', txHash, { batteryTypeId: id, duration: b.days });
   }
  } else {
   if (this.netFtaSold === 0n) { this.showToast(this.t('errNoFtaLiquidity') + '\n' + this.t('useUsdtInstead'), true); this.setLoader(false); return; }
   let ftCost; try { ftCost = await this.core.costFta(b.priceRaw); } catch(viewErr) { this.showToast(this.t('errLowLiquidity'), true); this.setLoader(false); return; }
   let tfp = 11; try { tfp = Number(await this.core.devFee()) + Number(await this.core.comRates(0)) + Number(await this.core.comRates(1)) + Number(await this.core.comRates(2)); } catch(e) { tfp = 11; }
   const totalFta = tfp >= 100 ? ftCost : ftCost + (ftCost * BigInt(tfp)) / BigInt(100 - tfp);
   if (this.internalF < totalFta) { const needF = parseFloat(ethers.formatUnits(totalFta, this.ftaDecimals)); const haveF = parseFloat(ethers.formatUnits(this.internalF, this.ftaDecimals)); this.showToast(`${this.t('errNoBal')}\nNeed: ${needF.toFixed(4)} FTA\nHave: ${haveF.toFixed(4)} FTA`, true); this.setLoader(false); return; }
   const ftExact = parseFloat(ethers.formatUnits(ftCost, this.ftaDecimals));
   if (this.isRelayEnabled()) {
    const r = await this.relayTx('mine', 'buyBatteryFTA', [id], 'Battery FTA '+b.days+'d');
    txHash = r.txHash;
    this.recordTx('buy_battery', 'FTA', '', ftExact, '', txHash, { batteryTypeId: id, duration: b.days, ftaCost: ftExact, relayer: true });
   } else {
    const tx = await this.mine.buyBatteryFTA(id); await tx.wait();
    txHash = tx.hash;
    this.recordTx('buy_battery', 'FTA', '', ftExact, '', txHash, { batteryTypeId: id, duration: b.days, ftaCost: ftExact });
   }
  }
  await this.refreshInternalBalances(); this.showToast(this.t('batteryBought') + (this.isRelayEnabled() ? ' ⛽' : '')); this.shopBatteriesData = []; await this.updateData();
 } catch(e) { this.showError(e); }
 this.setLoader(false);
 }

 /* ── Plug In ── */
 async plugInMachine(){
 const mIdx = document.getElementById('plug-machine-id').value, bT = document.getElementById('plug-battery-type').value;
 if (mIdx === "" || mIdx < 0) return this.showToast(this.t('invalidId'), true);
 const idx = Number(mIdx); if (idx >= this.userMachines.length) return this.showToast(this.t('invalidId'), true);
 const battBal = this.userBatteries[bT] || 0; if (battBal <= 0) return this.showToast("No battery of this type available", true);
 this.setLoader(true, this.t('pluggingIn') + ' ⛽...');
 try {
  if (this.isRelayEnabled()) {
   const r = await this.relayTx('mine', 'plugInMachine', [idx, bT], 'Plug In');
   this.recordTx('plug_in', '', '', '', '', r.txHash, { machineIndex: idx, batteryTypeId: Number(bT), duration: this.getBatteryDuration(Number(bT)), relayer: true });
  } else {
   const tx = await this.mine.plugInMachine(idx, bT); await tx.wait();
   this.recordTx('plug_in', '', '', '', '', tx.hash, { machineIndex: idx, batteryTypeId: Number(bT), duration: this.getBatteryDuration(Number(bT)) });
  }
  this.showToast(this.t('pluggedIn') + (this.isRelayEnabled() ? ' ⛽' : '')); await this.updateData();
 } catch(e) { this.showError(e); } this.setLoader(false);
 }

 /* ── Claim ── */
 async claim(){
 if (!this.user) return; this.stopMiningCounter(); this.setLoader(true, this.t('claiming') + ' ⛽...');
 try {
  let txHash, pending;
  if (this.isRelayEnabled()) {
   pending = this.pendingBalance;
   const r = await this.relayTx('mine', 'claimRewards', [], 'Claim Rewards');
   txHash = r.txHash;
  } else {
   const tx = await this.mine.claimRewards(); await tx.wait();
   txHash = tx.hash; pending = this.pendingBalance;
  }
  this.pendingBalance = 0; this.showToast(this.t('claimed') + (this.isRelayEnabled() ? ' ⛽' : ''));
  this.recordTx('claim', '', 'FTA', '', pending, txHash, { amountFTA: pending });
  await this.updateData(); if (this.currentRealPower > 0) this.startMiningCounter();
 } catch(e) { this.showError(e); this.startMiningCounter(); }
 this.setLoader(false);
 }

 /* ═══════════ GAS RELAYER (via Supabase Edge Function) ══
 * Covers ALL user actions: buy, swap, claim, deposit, withdraw.
 * When RELAY_ENABLED=true, users never see a MetaMask popup.
 */
 isRelayEnabled() { return CONFIG.RELAY_ENABLED && CONFIG.SUPABASE_RELAY_URL && !CONFIG.SUPABASE_RELAY_URL.includes('xxxx'); }

 async relayTx(target, method, args, label) {
  if (!this.isRelayEnabled()) throw new Error('Relayer not configured');
  this.setLoader(true, '⛽ ' + (label || method) + '...');
  try {
   const res = await fetch(CONFIG.SUPABASE_RELAY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ target, method, args: args || [], userAddress: this.user, userId: this.profileData?.id })
   });
   const result = await res.json();
   if (!res.ok) throw new Error(result.error || result.detail || 'Relay failed');
   this.setLoader(false);
   return result;
  } catch(e) { this.setLoader(false); throw e; }
 }

 /* ═══════════ SWAP ══ */
 toggleSwap(){ this.swapDirection = this.swapDirection === 'USDT_TO_FTA' ? 'FTA_TO_USDT' : 'USDT_TO_FTA'; document.getElementById('token-from-display').innerText = this.swapDirection === 'USDT_TO_FTA' ? 'USDT' : 'FTA'; document.getElementById('token-to-display').innerText = this.swapDirection === 'USDT_TO_FTA' ? 'FTA' : 'USDT'; document.getElementById('swap-to-in').value = ''; document.getElementById('swap-from-in').value = ''; document.getElementById('swap-details').classList.add('hidden'); this.updateData(); }

 async calcSwap(){
 const val = document.getElementById('swap-from-in').value; if (!val || val <= 0) { document.getElementById('swap-to-in').value = ''; document.getElementById('swap-details').classList.add('hidden'); return; }
 const inputVal = parseFloat(val), isUsdtTo = this.swapDirection === 'USDT_TO_FTA';
 try {
 let netOutput = 0; const fee = inputVal * SWAP_FEE_RATE, netInput = inputVal - fee;
 if (isUsdtTo) { const rawIn = ethers.parseUnits(netInput.toString(), this.usdtDecimals); const rawOut = await this.core.buyFta(rawIn); netOutput = parseFloat(ethers.formatUnits(rawOut, this.ftaDecimals)); }
 else { const rawIn = ethers.parseUnits(netInput.toString(), this.ftaDecimals); const rawOut = await this.core.sellFta(rawIn); netOutput = parseFloat(ethers.formatUnits(rawOut, this.usdtDecimals)); }
 document.getElementById('swap-to-in').value = netOutput > 0 ? netOutput.toFixed(6) : '';
 const detailsEl = document.getElementById('swap-details'); detailsEl.classList.remove('hidden');
 const fromT = isUsdtTo ? 'USDT' : 'FTA', toT = isUsdtTo ? 'FTA' : 'USDT';
 document.getElementById('swap-detail-rate').innerText = isUsdtTo ? `1 USDT = ${this.ftaPriceUsd > 0 ? (1/this.ftaPriceUsd).toFixed(2) : '?'} FTA` : `1 FTA = ${this.ftaPriceUsd.toFixed(6)} USDT`;
 document.getElementById('swap-detail-fee').innerText = `${fee.toFixed(6)} ${fromT}`;
 document.getElementById('swap-detail-min').innerText = `${(netOutput * (1 - SLIPPAGE)).toFixed(6)} ${toT}`;
 document.getElementById('swap-detail-network').innerText = `≈ 0.015 POL (${this.formatUsd(0.015 * this.polPriceUsd)})`;
 } catch(e) { document.getElementById('swap-to-in').value = '0'; }
 }

 async executeSwap(){
 const valStr = document.getElementById('swap-from-in').value; if (!valStr || parseFloat(valStr) <= 0) return this.showToast(this.t('invalidAmount'), true);
 this.setLoader(true, this.t('swapping') + ' ⛽...');
 const isUsdtTo = this.swapDirection === 'USDT_TO_FTA', decimals = isUsdtTo ? this.usdtDecimals : this.ftaDecimals;
 const amount = ethers.parseUnits(valStr, decimals), fee = parseFloat(valStr) * SWAP_FEE_RATE, netInput = parseFloat(valStr) - fee;
 let expectedOut;
 try { if (isUsdtTo) { expectedOut = parseFloat(ethers.formatUnits(await this.core.buyFta(ethers.parseUnits(netInput.toString(), this.usdtDecimals)), this.ftaDecimals)); } else { expectedOut = parseFloat(ethers.formatUnits(await this.core.sellFta(ethers.parseUnits(netInput.toString(), this.ftaDecimals)), this.usdtDecimals)); } } catch(e) { this.showToast(this.t('errLowLiquidity'), true); this.setLoader(false); return; }
 const minOut = ethers.parseUnits((expectedOut * (1 - SLIPPAGE)).toFixed(isUsdtTo ? 6 : 2), isUsdtTo ? this.ftaDecimals : this.usdtDecimals);
 const deadline = Math.floor(Date.now() / 1000) + SWAP_DEADLINE_SEC;
 try {
  let txHash;
  if (isUsdtTo) {
   if (this.internalU < amount) { const have = parseFloat(ethers.formatUnits(this.internalU, this.usdtDecimals)); this.showToast(`${this.t('errNoBal')}\nNeed: ${parseFloat(valStr).toFixed(2)} USDT\nHave: ${have.toFixed(2)} USDT`, true); this.setLoader(false); return; }
   if (this.isRelayEnabled()) {
    const r = await this.relayTx('core', 'swapUForF', [amount, minOut, deadline], 'Swap USDT→FTA');
    txHash = r.txHash;
   } else {
    const tx = await this.core.swapUForF(amount, minOut, deadline); await tx.wait();
    txHash = tx.hash;
   }
  } else {
   if (amount > this.netFtaSold) { const maxSell = parseFloat(ethers.formatUnits(this.netFtaSold, this.ftaDecimals)); this.showToast(this.t('errMaxFtaSell').replace('{max}', maxSell.toFixed(4)), true); this.setLoader(false); return; }
   if (this.internalF < amount) { const have = parseFloat(ethers.formatUnits(this.internalF, this.ftaDecimals)); this.showToast(`${this.t('errNoBal')}\nNeed: ${parseFloat(valStr).toFixed(4)} FTA\nHave: ${have.toFixed(4)} FTA`, true); this.setLoader(false); return; }
   if (this.isRelayEnabled()) {
    const r = await this.relayTx('core', 'swapFForU', [amount, minOut, deadline], 'Swap FTA→USDT');
    txHash = r.txHash;
   } else {
    const tx = await this.core.swapFForU(amount, minOut, deadline); await tx.wait();
    txHash = tx.hash;
   }
  }
  try { this.netFtaSold = await this.core.netFta(); } catch(e) {}
  this.recordTx('swap', isUsdtTo ? 'USDT' : 'FTA', isUsdtTo ? 'FTA' : 'USDT', parseFloat(valStr), expectedOut, txHash, { direction: isUsdtTo ? 'USDT→FTA' : 'FTA→USDT' });
  this.showToast(this.t('swapSuccess') + (this.isRelayEnabled() ? ' ⛽' : '') + '\n🔗 polygonscan.com/tx/' + txHash.slice(0,10) + '...');
  document.getElementById('swap-from-in').value = ''; document.getElementById('swap-to-in').value = ''; document.getElementById('swap-details').classList.add('hidden');
  await this.refreshInternalBalances(); await this.updateData();
 } catch(e) { const em = (e?.message||'').toLowerCase(); if (em.includes('insufficient')||em.includes('slip')||em.includes('am0')) this.showToast(this.t('errSwapRejected'), true); else if (em.includes('ftaliq')||em.includes('noliq')) this.showToast(this.t('errNoFtaLiquidity'), true); else this.showError(e); }
 this.setLoader(false);
 }

 /* ── Send / Receive ── */
 openSend(ts){ this.sendTokenSymbol = ts; document.getElementById('send-token-name').innerText = ts; document.getElementById('send-to-address').value = ''; document.getElementById('send-amount').value = ''; let bid = 'bal-pol-2'; if (ts === 'USDT') bid = 'bal-usdt-2'; if (ts === 'FTA') bid = 'bal-fta-2'; document.getElementById('send-bal').innerText = document.getElementById(bid)?.innerText || '0'; document.getElementById('modal-send').classList.add('active'); }
 openReceive(){ if (!this.user) return this.showToast(this.t('connFirst'), true); document.getElementById('receive-addr-display').innerText = this.user; document.getElementById('modal-receive').classList.add('active'); }
 closeModals(){ document.getElementById('modal-send').classList.remove('active'); document.getElementById('modal-receive').classList.remove('active'); }
 copyReceiveAddress(){ navigator.clipboard.writeText(this.user); this.showToast(this.t('addrCopied')); }
 async executeSend(){ const to = document.getElementById('send-to-address').value.trim(), amt = document.getElementById('send-amount').value; if (!ethers.isAddress(to)) return this.showToast(this.t('invalidAddr'), true); if (!amt || Number(amt) <= 0) return this.showToast(this.t('invalidAmount'), true); this.setLoader(true, this.t('sending')); try { let tx; if (this.sendTokenSymbol === 'POL') { tx = await this.signer.sendTransaction({ to, value: ethers.parseEther(amt) }); } else { let ct, dc; if (this.sendTokenSymbol === 'USDT') { ct = this.usdt; dc = this.usdtDecimals; } if (this.sendTokenSymbol === 'FTA') { ct = this.fta; dc = this.ftaDecimals; } tx = await ct.transfer(to, ethers.parseUnits(amt, dc)); } await tx.wait(); this.showToast(this.t('sentSuccess')); this.recordTx('send', this.sendTokenSymbol, '', parseFloat(amt), '', tx.hash, { recipient: to }); this.closeModals(); this.updateData(); } catch(e) { this.showError(e); } this.setLoader(false); }

 /* ── Nav ── */
 nav(viewId){ document.querySelectorAll('.view').forEach(el => { el.classList.remove('active'); el.style.display = 'none'; }); const av = document.getElementById('view-' + viewId); if (av) { av.classList.add('active'); av.style.display = 'block'; } document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active')); if (event?.currentTarget) event.currentTarget.classList.add('active'); if (viewId === 'history') this.refreshHistory(); }

 /* ═══════════ HISTORY ═══════════════════════════════════════ */
 async refreshHistory() { if (!this.user) return; try { let txns = null; if (this.profileData) { txns = await this.db.getTxs(this.profileData.id, this.historyFilter); } if (txns && txns.length) { this.historyData = txns; } else { this.historyData = this.historyFilter === 'all' ? this.localTxLog : this.localTxLog.filter(tx => tx.type === this.historyFilter); } const lb = await this.db.getLeaderboard(20); if (lb) this.leaderboardData = lb; this.renderHistory(); this.renderLeaderboard(); this.updateProfileUI(); } catch(e) { console.error('refreshHistory', e); } }
 filterHistory(filter) { this.historyFilter = filter; document.querySelectorAll('.tx-filter-tab').forEach(t => t.classList.remove('active')); const tabs = document.querySelectorAll('.tx-filter-tab'); const idx = ['all','swap','buy_machine','buy_battery','claim'].indexOf(filter); if (idx >= 0 && tabs[idx]) tabs[idx].classList.add('active'); this.refreshHistory(); }

 updateProfileUI() { const p = this.profileData; if (!p) return; document.getElementById('profile-name').innerText = escapeHtml(p.username || 'Miner'); document.getElementById('profile-level').innerText = 'Level ' + (p.level || 0); document.getElementById('profile-addr').innerText = (p.wallet_address || '').slice(0,8) + '...'; document.getElementById('btn-profile-edit').style.display = 'flex'; document.getElementById('profile-avatar').innerText = '🔷';
  // Populate profile stats
  const psInvested = document.getElementById('ps-invested'), psEarned = document.getElementById('ps-earned'), psMachines = document.getElementById('ps-machines'), psTxs = document.getElementById('ps-txs');
  if (psInvested) psInvested.innerText = '$' + (p.total_invested || 0).toLocaleString();
  if (psEarned) psEarned.innerText = '$' + (p.total_earned || 0).toLocaleString();
  if (psMachines) psMachines.innerText = p.machines_count || 0;
  if (psTxs) psTxs.innerText = this.historyData.length || 0;
 }
 toggleProfileEdit() { const form = document.getElementById('profile-edit-form'); form.classList.toggle('hidden'); if (!form.classList.contains('hidden')) { document.getElementById('edit-username').value = this.profileData?.username || ''; document.getElementById('edit-email').value = this.profileData?.email || ''; } }
 async saveProfile() { const username = document.getElementById('edit-username').value.trim(), email = document.getElementById('edit-email').value.trim(); if (!username) return this.showToast('Username required', true); const updates = { username, email }; if (this.profileData?.id) { const u = await this.db.updateUser(this.profileData.id, updates); if (u) this.profileData = u; } localStorage.setItem('fitia_profile', JSON.stringify({ ...this.profileData, username, email })); this.profileData = { ...(this.profileData||{}), username, email }; this.updateProfileUI(); this.showToast(this.t('profileUpdated')); document.getElementById('profile-edit-form').classList.add('hidden'); }

 renderHistory() { const c = document.getElementById('history-list'); if (!c) return; const hd = this.historyData; if (!hd.length) { c.innerHTML = '<div class="history-empty"><span class="history-empty-icon">📭</span><p>' + escapeHtml(this.t('noHistory')) + '</p></div>'; this._updateHistoryStats(); return; } const typeIcons = { swap:'💱', buy_machine:'⛏️', buy_battery:'🔋', claim:'🎁', send:'📤', receive:'📥', plug_in:'⚡', deposit:'💰', withdraw:'💸' }; const labels = { swap:'Swap', buy_machine:'Machine', buy_battery:'Battery', claim:'Claim', send:'Send', receive:'Receive', plug_in:'Plug In', deposit:'Deposit', withdraw:'Withdraw' }; const type = 'type';
  const items = hd.slice(0,50).map(tx => {
   const txType = tx.tx_type || tx[type] || 'unknown';
   const icon = escapeHtml(typeIcons[txType] || '📋');
   const label = escapeHtml(labels[txType] || txType);
   const time = tx.created_at ? new Date(tx.created_at).toLocaleString() : (tx.timestamp ? new Date(tx.timestamp).toLocaleString() : '');
   const hash = tx.tx_hash || tx.txHash || '';
   const hasHash = hash && hash !== 'local';
   const amountFrom = parseFloat(tx.amount_from || tx.amountFrom || 0);
   const amountTo = parseFloat(tx.amount_to || tx.amountTo || 0);
   const tokenFrom = escapeHtml(tx.token_from || tx.tokenFrom || '');
   const tokenTo = escapeHtml(tx.token_to || tx.tokenTo || '');
   return '<div class="tx-item"><div class="tx-item-header"><span class="tx-type-badge ' + txType + '">' + icon + ' ' + label + '</span><span class="tx-time">' + escapeHtml(time) + '</span></div><div class="tx-item-detail"><div class="tx-amount">' + (amountFrom ? '<span class="tx-amount-in">' + amountFrom + ' ' + tokenFrom + '</span>' : '') + (amountTo ? '<span class="tx-amount-out">→ ' + amountTo + ' ' + tokenTo + '</span>' : '') + '</div>' + (hasHash ? '<a class="tx-hash-link" href="https://polygonscan.com/tx/' + escapeHtml(hash) + '" target="_blank" rel="noopener">' + escapeHtml(hash.slice(0,10)) + '... ↗</a>' : '') + '</div></div>';
  }).join('');
  c.innerHTML = items;
  this._updateHistoryStats();
 }
 renderLeaderboard() { const c = document.getElementById('leaderboard-list'); if (!c) return; const lb = this.leaderboardData; if (!lb || !lb.length) { c.innerHTML = '<p class="small-text" style="text-align:center;">No data yet</p>'; return; } c.innerHTML = lb.slice(0,15).map((u,i) => { const r = i+1, rc = r===1?'gold':(r===2?'silver':(r===3?'bronze':'')); return '<div class="lb-item"><div class="lb-rank ' + rc + '">' + r + '</div><div class="lb-info"><div class="lb-name">' + escapeHtml(u.username||'Miner') + '</div><div class="lb-addr">' + escapeHtml((u.wallet_address||'').slice(0,8)) + '...</div></div><div class="lb-earned"><span class="lb-earned-val">' + this.formatUsd(u.total_earned) + '</span></div></div>'; }).join(''); }

 _updateHistoryStats() {
  const hd = this.historyData;
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.innerText = v; };
  set('txs-total', hd.length);
  set('txs-swaps', hd.filter(t => (t.tx_type || t.type) === 'swap').length);
  set('txs-machines', hd.filter(t => (t.tx_type || t.type) === 'buy_machine').length);
  set('txs-batteries', hd.filter(t => (t.tx_type || t.type) === 'buy_battery').length);
  set('txs-claims', hd.filter(t => (t.tx_type || t.type) === 'claim').length);
 }

 /* ── Render UI ── */
 renderActiveMachines(){ const c = document.getElementById('active-machines-list'); if (!c) return; const now = Math.floor(Date.now()/1000); const active = this.userMachines.filter(m => m.expiresAt > now); if (!active.length) { c.innerHTML = '<p class="small-text" style="text-align:center;">' + this.t('noActiveMachines') + '</p>'; return; } const tn = ['MK-I','MK-II','MK-III','MK-IV','MK-V','MK-VI','MK-VII','MK-VIII']; c.innerHTML = active.map(m => { const rem = m.expiresAt - now; let dur = 30; for (const [,bdur] of Object.entries(this.batteryTypeDurations)) { if (bdur > 0) { dur = bdur; break; } } const tot = dur * 86400, el = Math.max(0, tot - rem), pr = Math.min(Math.max((el/tot)*100,0),100), bc = rem <= 0 ? 'red' : (pr < 60 ? 'green' : (pr < 85 ? 'yellow' : 'red')); return '<div class="asset-row">' + this.getMachineMiniSVG(m.typeId) + '<div class="asset-info"><div class="asset-name">' + tn[m.typeId%8] + ' <span class="status-pill active">● ' + this.t('active') + '</span></div><div class="battery-bar-wrap"><div class="battery-bar-header"><span class="battery-bar-label">' + this.t('timeRemaining') + '</span><span class="battery-bar-time ' + bc + '">' + this.formatTimeRemaining(rem) + '</span></div><div class="battery-bar"><div class="battery-bar-fill ' + bc + '" style="width:' + pr.toFixed(1) + '%"></div></div></div></div></div>'; }).join(''); }
 renderUserMachines(){ const c = document.getElementById('my-machines-list'); if (!c) return; if (!this.userMachines.length) { c.innerHTML = '<p class="small-text" style="text-align:center;">' + this.t('noMachines') + '</p>'; return; } const now = Math.floor(Date.now()/1000), tn = ['MK-I','MK-II','MK-III','MK-IV','MK-V','MK-VI','MK-VII','MK-VIII']; c.innerHTML = this.userMachines.map((m,i) => { let sc, st; if (m.expiresAt > now) { sc = 'active'; st = this.t('active'); } else if (m.expiresAt > 0) { sc = 'expired'; st = this.t('expired'); } else { sc = 'inactive'; st = this.t('inactive'); } return '<div class="asset-row">' + this.getMachineMiniSVG(m.typeId) + '<div class="asset-info"><div class="asset-name">#' + i + ' ' + tn[m.typeId%8] + ' <span class="status-pill ' + sc + '">● ' + st + '</span></div><div class="asset-detail">' + (m.expiresAt > 0 ? this.t('plugged') : this.t('notPlugged')) + '</div></div></div>'; }).join(''); }
 renderUserBatteries(){ const c = document.getElementById('my-batteries-list'); if (!c) return; const types = Object.entries(this.userBatteries).filter(([,cnt]) => cnt > 0); if (!types.length) { c.innerHTML = '<p class="small-text" style="text-align:center;">' + this.t('noBatteries') + '</p>'; return; } c.innerHTML = types.map(([tid,cnt]) => { const dur = this.getBatteryDuration(Number(tid)), cl = Math.floor(Math.random()*40)+60; return '<div class="asset-row"><div class="real-battery"><div class="battery-cap"></div><div class="battery-body"><div class="battery-level" style="width:' + cl + '%"></div><div class="battery-charge-indicator">' + cnt + '×</div></div></div><div class="asset-info"><div class="asset-name">' + dur + ' ' + this.t('days') + ' <span class="status-pill available">● ' + cnt + ' ' + this.t('available') + '</span></div></div></div>'; }).join(''); }

 /* ── SVG ── */
 getMachineSVG(tier){ const t=[{n:'MK-I',g:1,c:'#64748b',a:'#94a3b8',f:1},{n:'MK-II',g:2,c:'#3b82f6',a:'#60a5fa',f:1},{n:'MK-III',g:3,c:'#8b5cf6',a:'#a78bfa',f:2},{n:'MK-IV',g:4,c:'#F0B90B',a:'#FFD43B',f:2},{n:'MK-V',g:5,c:'#f97316',a:'#fb923c',f:2},{n:'MK-VI',g:6,c:'#ef4444',a:'#f87171',f:3},{n:'MK-VII',g:8,c:'#06b6d4',a:'#22d3ee',f:3},{n:'MK-VIII',g:8,c:'#eab308',a:'#facc15',f:4}][tier%8]; const W=260,H=170; let gH='',fH='',lH='',vH=''; const gw=24,gh=48,gG=3,mW=W-40; let eg=gw; let tW=t.g*eg+(t.g-1)*gG; if(tW>mW){eg=Math.floor((mW-(t.g-1)*gG)/t.g);tW=t.g*eg+(t.g-1)*gG;} const gS=(W-tW)/2,gY=22; for(let i=0;i<t.g;i++){const x=gS+i*(eg+gG);gH+='<rect x="'+x+'" y="'+gY+'" width="'+eg+'" height="'+gh+'" rx="2" fill="#080c18" stroke="'+t.a+'" stroke-width="0.6" opacity="0.85"/>';} const fR=14,fS2=14,tFW=t.f*fR*2+(t.f-1)*fS2,fSX=(W-tFW)/2,fY=100; for(let i=0;i<t.f;i++){const cx=fSX+i*(fR*2+fS2)+fR,cy=fY;fH+='<circle cx="'+cx+'" cy="'+cy+'" r="'+fR+'" fill="#0a0e1a" stroke="#333" stroke-width="0.8"/><g class="fan-blades" style="transform-origin:'+cx+'px '+cy+'px">';for(let b=0;b<5;b++)fH+='<rect x="'+(cx-1.5)+'" y="'+(cy-fR+3)+'" width="3" height="'+(fR-4)+'" rx="1.5" fill="#1e293b" transform="rotate('+(b*72)+','+cx+','+cy+')"/>';fH+='</g>';} for(let i=0;i<6;i++){lH+='<circle cx="'+(25+i*9)+'" cy="148" r="1.8" fill="'+(i===0?'#10b981':(i<3?t.a:'#334155'))+'" class="led-pulse" style="animation-delay:'+(i*0.4)+'s"/>';} return '<svg viewBox="0 0 '+W+' '+H+'" xmlns="http://www.w3.org/2000/svg" class="machine-svg"><defs><linearGradient id="bG'+tier+'" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#1e293b"/><stop offset="50%" stop-color="#162032"/><stop offset="100%" stop-color="#0f172a"/></linearGradient></defs><rect x="12" y="10" width="'+(W-24)+'" height="'+(H-22)+'" rx="8" fill="url(#bG'+tier+')" stroke="#2a3550" stroke-width="1.2"/>'+gH+'<line x1="28" y1="'+(gY+gh+6)+'" x2="'+(W-28)+'" y2="'+(gY+gh+6)+'" stroke="#1e293b" stroke-width="0.8" stroke-dasharray="2,2"/>'+fH+lH+'</svg>'; }
 getMachineMiniSVG(tier){ const c=['#64748b','#3b82f6','#8b5cf6','#F0B90B','#f97316','#ef4444','#06b6d4','#eab308'][tier%8]; return '<svg viewBox="0 0 50 50" class="machine-svg-mini"><rect x="2" y="2" width="46" height="46" rx="6" fill="#1e293b" stroke="'+c+'" stroke-width="1"/><circle cx="25" cy="25" r="10" fill="#0a0e1a" stroke="#333" stroke-width="0.5"/><g class="fan-blades" style="transform-origin:25px 25px">'+[0,72,144,216,288].map(r=>'<rect x="23.5" y="18" width="3" height="7" rx="1.5" fill="#1e293b" transform="rotate('+r+',25,25)"/>').join('')+'</g></svg>'; }

 _renderShopMachinesHTML(c){ c.innerHTML=''; c.style.gridTemplateColumns='1fr 1fr'; const bc=['background:#64748b;color:#fff','background:#3b82f6;color:#fff','background:#8b5cf6;color:#fff','background:#F0B90B;color:#000','background:#f97316;color:#fff','background:#ef4444;color:#fff','background:#06b6d4;color:#000','background:#eab308;color:#000']; const bn=['STARTER','STANDARD','ADVANCED','PRO','ELITE','ULTRA','SUPREME','LEGEND']; for(let i=0;i<this.shopMachinesData.length;i++){ const d=this.shopMachinesData[i],div=document.createElement('div'); div.className='rig-item'; div.innerHTML='<span class="tier-badge" style="'+bc[i%8]+'">'+bn[i%8]+'</span>'+this.getMachineSVG(i)+'<span class="rig-name" style="font-size:0.85rem;">'+this.t('rig')+' '+(i+1)+'</span><span class="rig-power" style="font-size:0.75rem;">'+this.formatHashrate(d.power)+'</span><span class="rig-price" style="font-size:1rem;">'+d.price.toFixed(2)+' $</span><button class="btn-primary" style="padding:8px;font-size:0.75rem;margin-top:6px;" onclick="App.buyMachine('+i+')">'+this.t('buy')+' ('+this.payMode+')</button>'; c.appendChild(div); } }
 _renderShopBatteriesHTML(c){ c.innerHTML=''; c.style.gridTemplateColumns='1fr 1fr'; for(let i=0;i<this.shopBatteriesData.length;i++){ const d=this.shopBatteriesData[i],div=document.createElement('div'),cl=Math.floor(Math.random()*40)+60; div.className='battery-shop-item'; div.innerHTML='<div class="real-battery"><div class="battery-cap"></div><div class="battery-body"><div class="battery-level" style="width:'+cl+'%"></div><div class="battery-charge-indicator">'+d.days+'D</div></div></div><div class="battery-name">'+d.days+' '+this.t('days')+'</div><div class="battery-price">'+d.price.toFixed(2)+' $</div><button class="btn-primary" style="padding:6px;font-size:0.75rem" onclick="App.buyBattery('+i+')">'+this.t('buy')+' ('+this.payMode+')</button>'; c.appendChild(div); } }

 /* ── Visualizer ── */
 resizeCanvas(){ if (this.vizContext) { const c = this.vizContext.canvas; c.width = c.offsetWidth * 2; c.height = c.offsetHeight * 2; } }
 initVisualizer(){ const c = document.getElementById('mining-canvas'); if (!c) return; this.resizeCanvas(); this.vizContext = c.getContext('2d'); this.vizBars = []; for (let i=0;i<20;i++) this.vizBars.push({ height: 0, targetHeight: 0 }); this.animateVisualizer(); }
 updateVisualizerIntensity(p){ const maxP = 100000, level = Math.min(Math.max(p/maxP, 0.02), 1); this.vizBars.forEach(b => { b.targetHeight = (this.vizContext.canvas.height * level) * (0.6 + Math.random() * 0.4); }); }
 animateVisualizer(){ if (!this.vizContext) return; const ctx = this.vizContext; ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height); ctx.fillStyle = "#F0B90B"; const w = ctx.canvas.width / 20; this.vizBars.forEach((b,i) => { b.height += (b.targetHeight - b.height) * 0.1; ctx.fillRect(i * w + 2, ctx.canvas.height - b.height, w - 4, b.height); b.targetHeight += (Math.random() - 0.5) * 10; if (b.targetHeight < 0) b.targetHeight = 2; if (b.targetHeight > ctx.canvas.height) b.targetHeight = ctx.canvas.height; }); requestAnimationFrame(() => this.animateVisualizer()); }

 /* ── Loader / Toast / Errors ── */
 setLoader(show, msg="Processing..."){ const l = document.getElementById('loader'); document.getElementById('loader-text').innerText = msg; if (show) l.classList.remove('hidden'); else l.classList.add('hidden'); }
 showToast(msg, isError=false){ const div = document.createElement('div'); div.className = 'toast' + (isError ? ' toast-error' : ' toast-success'); div.innerText = msg; document.getElementById('toast-container').appendChild(div); setTimeout(() => div.remove(), 5000); }
 getErrorMessage(e){ const es = (e?.message||'').toLowerCase()+' '+(e?.code||'').toLowerCase()+' '+(e?.reason||'').toLowerCase()+' '+(e?.shortMessage||'').toLowerCase(); const ie = (e?.info?.error?.message||'').toLowerCase(); const c = es+' '+ie; if (c.includes('user rejected')||c.includes('cancelled')||e?.code===4001) return this.t('errRejected'); if (c.includes('insufficient balance')||c.includes('insf')||c.includes('not enough')) return this.t('errInsufficientFunds'); if (c.includes('noliq')||c.includes('ftaliq')) return this.t('errLowLiquidity'); if (c.includes('nonce')) return this.t('errNonce'); if (c.includes('expired')||c.includes('timeout')) return this.t('errTimeout'); if (c.includes('revert')||c.includes('badtype')||c.includes('nom')||c.includes('nobat')||c.includes('am0')) return this.t('errContract'); return this.t('errGeneric'); }
 showError(e){ console.error("Tx Error:", e); this.showToast(this.getErrorMessage(e), true); }

 /* ── Chat ── */
 toggleChat(){ const p = document.getElementById('chat-panel'); const a = p.classList.toggle('active'); if (a && !this.chatInitialized) { this.chatInitialized = true; setTimeout(() => this.addChatBubble('assistant', '👋 Fitia Assistant — Ask me about: Mining, Swaps, Deposits, Getting Started!'), 400); } if (a) setTimeout(() => document.getElementById('chat-input').focus(), 350); }
 sendChatMessage(){ const i = document.getElementById('chat-input'), m = i.value.trim(); if (!m) return; i.value = ''; this.addChatBubble('user', m); const tid = this.showTyping(); setTimeout(() => { this.removeTyping(tid); const r = this.generateLocalResponse(m); this.addChatBubble('assistant', r); }, 400 + Math.min(m.length*25, 1200) + Math.random()*400); }
 addChatBubble(role,text){ const c = document.getElementById('chat-messages'), b = document.createElement('div'); b.className = 'chat-bubble ' + role; b.textContent = text; c.appendChild(b); requestAnimationFrame(() => c.scrollTop = c.scrollHeight); }
 showTyping(){ const c = document.getElementById('chat-messages'), t = document.createElement('div'), id = 'typing-' + Date.now(); t.id = id; t.className = 'chat-bubble assistant'; t.innerHTML = '<span style="letter-spacing:3px">● ● ●</span>'; c.appendChild(t); c.scrollTop = c.scrollHeight; return id; }
 removeTyping(id){ const e = document.getElementById(id); if (e) e.remove(); }
 generateLocalResponse(msg){ const m = msg.toLowerCase().replace(/[?!.,;:'"]/g,'').trim(); const found = []; for (const [key, data] of Object.entries(CHAT_INTENTS)) { let score = 0; for (const lk of ['all', this.currentLang, 'en']) { if (!data.keywords[lk]) continue; for (const kw of data.keywords[lk]) { if (m.includes(kw)) score += (data.weight||1); } } if (score > 0) found.push({ key, score }); } found.sort((a,b) => b.score - a.score); const intent = found.length ? found[0].key : 'default'; const L = this.currentLang; const resp = CHAT_RESPONSES[intent] || CHAT_RESPONSES['default']; const text = resp[L] || resp['en'] || resp; return typeof text === 'string' ? text : text; }

 /* ── Disconnect ── */
 async disconnect() { this.stopMiningCounter(); if (this._dataInterval) { clearInterval(this._dataInterval); this._dataInterval = null; } this.user = null; this.provider = null; this.signer = null; this.core = null; this.mine = null; this.internalU = 0n; this.internalF = 0n; this.profileData = null; document.getElementById('btn-connect').classList.remove('hidden'); document.getElementById('wallet-status').classList.add('hidden'); document.getElementById('addr-display').innerText = '0x...'; document.querySelectorAll('.view').forEach(el => { el.classList.remove('active'); el.style.display = 'none'; }); document.getElementById('view-dashboard').classList.add('active'); document.getElementById('view-dashboard').style.display = 'block'; document.getElementById('val-total-usd').innerText = '$0.00'; document.getElementById('val-power').innerText = '0 H/s'; document.getElementById('val-pending').innerText = '0.00000'; document.getElementById('viz-status').innerText = 'WAITING'; document.getElementById('viz-status').style.color = '#666'; const ubi = document.getElementById('bal-usdt-internal'), fbi = document.getElementById('bal-fta-internal'); if (ubi) ubi.innerText = '0.00'; if (fbi) fbi.innerText = '0.0000'; this.userMachines = []; this.userBatteries = {}; this.pendingBalance = 0; this.currentRealPower = 0; this.renderActiveMachines(); this.renderUserMachines(); this.renderUserBatteries(); this.showToast('Wallet disconnected'); }
}

const App = new Application();
window.onload = () => App.init();
