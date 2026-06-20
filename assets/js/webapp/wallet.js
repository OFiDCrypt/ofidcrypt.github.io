// ================================================
// assets/js/webapp/wallet.js - FULL PRODUCTION VERSION
// ================================================

// 1. Buffer polyfill for swap transactions
if (typeof Buffer === 'undefined') {
    window.Buffer = {
        from: function (value, encoding) {
            if (value instanceof Uint8Array || (value && value.buffer instanceof ArrayBuffer)) {
                return new Uint8Array(value.buffer || value);
            }
            if (typeof value === 'string' && encoding === 'base64') {
                const binary = atob(value);
                const bytes = new Uint8Array(binary.length);
                for (let i = 0; i < binary.length; i++) {
                    bytes[i] = binary.charCodeAt(i);
                }
                return bytes;
            }
            return value;
        }
    };
}

// 2. Global Variables
let phantomSDK = null;
let connectedWallet = null;
window.connectedWallet = null;
let connectionMethod = null;
let provider = null;
let latestPrices = {};
let currentLockBaseQuantity = 0;

// 3. UI Helpers
// ====================== UI HELPERS ======================
function setWalletState(isConnected, publicKey = null, method = null) {
    // 1. Update Global State
    connectedWallet = isConnected && publicKey ? publicKey : null;
    window.connectedWallet = connectedWallet;

    if (method) {
        connectionMethod = method;
    } else if (!isConnected) {
        connectionMethod = null;
    }
    window.connectionMethod = connectionMethod;

    // 2. Persist to LocalStorage (Crucial for mobile redirect stability)
    if (isConnected && connectedWallet) {
        localStorage.setItem('wallet_address', connectedWallet);
        localStorage.setItem('connection_method', connectionMethod || 'injected');
    } else {
        localStorage.removeItem('wallet_address');
        localStorage.removeItem('connection_method');
    }

    // 3. Wallet page elements
    const navText = document.getElementById('walletBtnText');
    const navBtn = document.getElementById('addWalletBtn');
    const chevron = document.getElementById('chevron');
    const statusBar = document.getElementById('connectedStatus');
    const addrEl = document.getElementById('connectedAddress');
    const connectOpt = document.getElementById('connectOption');
    const createOpt = document.getElementById('createWalletOption');
    const disconnectOpt = document.getElementById('disconnectOption');

    // 4. Shop page elements
    const shopDot = document.getElementById('status-dot');
    const shopText = document.getElementById('status-text');
    const shopBtn = document.getElementById('connect-btn');

    if (isConnected && connectedWallet) {
        const short = `${connectedWallet.slice(0, 6)}...${connectedWallet.slice(-4)}`;

        if (navText) navText.innerText = "CONNECTED";
        if (navBtn) navBtn.classList.add('!bg-emerald-600', '!hover:bg-emerald-700');
        if (chevron) chevron.style.display = 'none';
        if (statusBar) statusBar.classList.remove('hidden');
        if (addrEl) addrEl.innerText = short;
        if (connectOpt) connectOpt.classList.add('hidden');
        if (createOpt) createOpt.classList.add('hidden');
        if (disconnectOpt) disconnectOpt.classList.remove('hidden');

        if (shopDot) shopDot.style.backgroundColor = "#10b981";
        if (shopText) shopText.innerText = (method === "google" || method === "apple") ? "Embedded Wallet" : "Wallet Connected";
        if (shopBtn) {
            shopBtn.innerText = "Disconnect";
            shopBtn.style.borderColor = "#ef4444";
            shopBtn.style.color = "#ef4444";
            shopBtn.onclick = disconnectWallet;
        }

        if (typeof updateWalletBalances === 'function') {
            updateWalletBalances();
        }
    } else {
        if (navText) navText.innerText = "ADD WALLET";
        if (navBtn) navBtn.classList.remove('!bg-emerald-600', '!hover:bg-emerald-700');
        if (chevron) chevron.style.display = 'inline-block';
        if (statusBar) statusBar.classList.add('hidden');
        if (connectOpt) connectOpt.classList.remove('hidden');
        if (createOpt) createOpt.classList.remove('hidden');
        if (disconnectOpt) disconnectOpt.classList.add('hidden');

        if (shopDot) shopDot.style.backgroundColor = "#71717a";
        if (shopText) shopText.innerText = "Wallet Disconnected";
        if (shopBtn) {
            shopBtn.innerText = "Connect";
            shopBtn.style.borderColor = "#8b5cf6";
            shopBtn.style.color = "#8b5cf6";
            shopBtn.onclick = handlePhantomConnect;
        }

        if (typeof clearBalancesOnDisconnect === 'function') {
            clearBalancesOnDisconnect();
        }
    }
}

function dismissClaimBubble() {
    const bubble = document.getElementById('mobileClaimBubble');
    if (bubble) bubble.style.setProperty('display', 'none', 'important');
    localStorage.setItem('claimBubbleDismissed', 'true');
}

function toggleCommunityTokens() {
    const content = document.getElementById('community-content');
    const icon = document.getElementById('expand-icon');
    if (content.style.maxHeight && content.style.maxHeight !== '0px') {
        content.style.maxHeight = '0px';
        icon.style.transform = 'rotate(0deg)';
    } else {
        content.style.maxHeight = (content.scrollHeight + 32) + 'px';
        icon.style.transform = 'rotate(180deg)';
    }
}

function toggleWorldwideCurrencies() {
    const content = document.getElementById('worldwide-content');
    const icon = document.getElementById('worldwide-expand-icon');
    if (content.style.maxHeight && content.style.maxHeight !== '0px') {
        content.style.maxHeight = '0px';
        icon.style.transform = 'rotate(0deg)';
    } else {
        content.style.maxHeight = (content.scrollHeight + 32) + 'px';
        icon.style.transform = 'rotate(180deg)';
    }
}

// 4. Phantom SDK & API Config
import { BrowserSDK, AddressType } from "@phantom/browser-sdk";

async function getPhantomSDK() {
    if (!phantomSDK) {
        phantomSDK = new BrowserSDK({
            providers: ["injected", "google", "apple"],
            addressTypes: [AddressType.solana],
            appId: "62ccac9b-8746-42db-8a6d-45e2c97f7f58",
            authOptions: { redirectUrl: `${window.location.origin}/callback.html` },
            autoConnect: true,
        });

        phantomSDK.on("connect", (data) => {
            console.log("✅ Phantom SDK Connected via", data.provider, data.addresses);
            const addr = data.addresses?.[0]?.address;
            if (addr) setWalletState(true, addr, data.provider || "injected");
        });

        phantomSDK.on("connect_error", (err) => console.error("❌ SDK Connect Error:", err));
        phantomSDK.on("disconnect", () => {
            console.log("🔌 Phantom SDK Disconnected");
            setWalletState(false);
        });
    }
    return phantomSDK;
}

function getApiUrl(endpoint) {
    const base = (window.CONFIG && window.CONFIG.BASE) ? window.CONFIG.BASE : "http://localhost:3000";
    return base + (endpoint.startsWith('/') ? endpoint : '/' + endpoint);
}

// 5. Initialization (Mobile/Desktop Sync)
window.addEventListener('load', async () => {
    // Clear temp auth code
    if (localStorage.getItem('phantom_auth_code')) localStorage.removeItem('phantom_auth_code');

    // Restore UI from storage
    const savedAddress = localStorage.getItem('wallet_address');
    const savedMethod = localStorage.getItem('connection_method');
    if (savedAddress && savedMethod) setWalletState(true, savedAddress, savedMethod);

    // Sync with SDK session
    const sdk = await getPhantomSDK();
    if (sdk.isLoggedIn) {
        const addr = sdk.publicKey?.toBase58();
        if (addr) setWalletState(true, addr, "google");
    }
});

// ====================== CURRENCY SYSTEM (CAD + USD + MXN + NGN) ======================
let lastTotalValue = 0;
let currentCurrency = 'CAD';

let usdToCadRate = 1.35;
let usdToMxnRate = 18.50;
let usdToNgnRate = 1600;

async function fetchExchangeRates() {
    try {
        const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
        const data = await res.json();

        usdToCadRate = data.rates.CAD || 1.35;
        usdToMxnRate = data.rates.MXN || 18.50;
        usdToNgnRate = data.rates.NGN || 1600;

        console.log(`✅ Exchange rates loaded → CAD:${usdToCadRate} | MXN:${usdToMxnRate} | NGN:${usdToNgnRate}`);
    } catch (e) {
        console.warn("Exchange rate API failed, using fallback rates");
    }
}

function getConversionRate(currency) {
    switch (currency) {
        case 'CAD': return usdToCadRate;
        case 'MXN': return usdToMxnRate;
        case 'NGN': return usdToNgnRate;
        default: return 1;
    }
}

function getCurrencySymbol(currency) {
    switch (currency) {
        case 'USD':
        case 'CAD':
        case 'MXN': return '$';
        case 'NGN': return '₦';
        default: return '$';
    }
}

function changeCurrency(newCurrency) {
    currentCurrency = newCurrency;

    updateAllPriceDisplays();
    updateCommunityCurrencyLabels();
    updateCardValuePlaceholders();

    const currencySpan = document.getElementById('totalCurrency');
    if (currencySpan) currencySpan.textContent = newCurrency;

    if (connectedWallet) {
        updateWalletBalances();
    }
}

function updateCardValuePlaceholders() {
    const symbolChar = getCurrencySymbol(currentCurrency);

    ['EXPB', 'GIDDY'].forEach(sym => {
        const el = document.getElementById(`value-${sym}`);
        if (el) el.innerHTML = `${symbolChar}0.00`;
    });

    const communitySymbols = ['SOL', 'USDC', 'ONE', 'KIN', 'DOBBY', 'MYLO', 'DUNO', 'CPT', 'SINU'];
    communitySymbols.forEach(sym => {
        const el = document.getElementById(`value-${sym}`);
        if (el) {
            el.innerHTML = `${symbolChar}0.00 <span class="text-base">${currentCurrency}</span>`;
        }
    });
}

function updateCommunityCurrencyLabels() {
    const symbols = ['ONE', 'KIN', 'DOBBY', 'MYLO', 'DUNO', 'CPT', 'SINU'];
    symbols.forEach(sym => {
        const el = document.getElementById(`price-currency-${sym}`);
        if (el) el.textContent = currentCurrency;
    });
}

// ====================== UPDATE PRICE DISPLAYS ======================
function updateAllPriceDisplays() {
    const symbols = ['SOL', 'USDC', 'EXPB', 'GIDDY', 'ONE', 'KIN', 'DOBBY', 'MYLO', 'DUNO', 'CPT', 'SINU'];

    symbols.forEach(symbol => {
        const priceEl = document.getElementById(`price-${symbol}`);
        if (!priceEl) return;

        const usdPrice = latestPrices[symbol];
        if (!usdPrice) {
            priceEl.innerText = "No Pool";
            return;
        }

        const rate = getConversionRate(currentCurrency);
        const displayPrice = usdPrice * rate;
        const symbolChar = getCurrencySymbol(currentCurrency);

        let priceStr = (symbol === 'ONE' || symbol === 'GIDDY' || symbol === 'SOL')
            ? displayPrice.toFixed(2)
            : displayPrice.toFixed(6);

        if (symbol === 'EXPB' || symbol === 'GIDDY') {
            priceEl.innerHTML = `
                <span class="block">${symbolChar}${priceStr}</span>
                <span class="text-sm text-zinc-500 font-medium tracking-widest">${currentCurrency}</span>
            `;
        } else {
            priceEl.innerText = `${symbolChar}${priceStr}`;
        }
    });
}

// ====================== BASIC PAGE FUNCTIONS ======================
function goToToken(token) {
    if (token === 'expb') window.location.href = '/bouncyball.html';
    else if (token === 'giddy') window.location.href = '/onegiddy.html';
}

function goToShop() {
    window.location.href = '/shop.html';
}

function claimBonus() {
    window.location.href = "/cashlinks.html#giddy";
}

function buyToken() {
    alert("Buy from Token / Exchange Loop Coming Soon...");
}

function sellToken() {
    alert("Sell to Token / Exchange Loop Coming Soon...");
}

// ====================== MODAL & REDEEM FUNCTIONS ======================
function openModal(modalId) {
    if (modalId === 'redeem') {
        document.getElementById('redeem-modal').style.display = 'flex';
        resetRedeemForm();
    }
}

function closeModal(modalId) {
    if (modalId === 'redeem') {
        document.getElementById('redeem-modal').style.display = 'none';
        resetRedeemForm();
    }
}

function resetRedeemForm() {
    const input = document.getElementById('redeem-input');
    const msg = document.getElementById('redeem-message');
    const btn = document.querySelector('#redeem-form button');

    if (input) input.value = '';
    if (msg) {
        msg.textContent = '';
        msg.style.color = '';
    }
    if (btn) {
        btn.classList.remove('success', 'failure');
        btn.textContent = 'Redeem';
        btn.disabled = false;
    }
}

// ====================== CENTRALIZED WALLET STATE + CLEAR LOGIC ======================
function clearBalancesOnDisconnect() {
    const allTokens = ['SOL', 'USDC', 'EXPB', 'GIDDY', 'ONE', 'KIN', 'DOBBY', 'MYLO', 'DUNO', 'CPT', 'SINU'];
    const symbolChar = getCurrencySymbol(currentCurrency);

    allTokens.forEach(sym => {
        const qtyEl = document.getElementById(`qty-${sym}`);
        const valueEl = document.getElementById(`value-${sym}`);

        if (qtyEl) qtyEl.textContent = '—';

        if (valueEl) {
            if (sym === 'EXPB' || sym === 'GIDDY') {
                valueEl.innerHTML = `${symbolChar}0.00`;
            } else {
                valueEl.innerHTML = `${symbolChar}0.00 <span class="text-base">${currentCurrency}</span>`;
            }
        }
    });

    const totalValueEl = document.getElementById('totalValue');
    if (totalValueEl) {
        totalValueEl.innerHTML = `<span class="text-purple-400">↖ Add Wallet</span>`;
    }
}

function showAddWalletPrompt() {
    const totalValueEl = document.getElementById('totalValue');
    if (totalValueEl) {
        totalValueEl.innerHTML = `<span class="text-purple-400">↖ Add Wallet</span>`;
    }
}

// ====================== HELPER: Device Detection ======================
function isMobileDevice() {
    return /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// ====================== PHANTOM WALLET INTEGRATION (SDK) ======================
function toggleWalletDropdown() {
    const dropdown = document.getElementById('walletDropdown');
    const chevron = document.getElementById('chevron');
    if (dropdown) dropdown.classList.toggle('hidden');
    if (chevron) chevron.classList.toggle('rotate-180');
}

document.addEventListener('click', (e) => {
    const btn = document.getElementById('addWalletBtn');
    const dropdown = document.getElementById('walletDropdown');
    if (btn && dropdown && !btn.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.classList.add('hidden');
        const chevron = document.getElementById('chevron');
        if (chevron) chevron.classList.remove('rotate-180');
    }
});

// ====================== CONNECT PHANTOM (HYBRID - DESKTOP + iOS FALLBACK) ======================
async function handlePhantomConnect() {
    const dropdown = document.getElementById('walletDropdown');
    if (dropdown) dropdown.classList.add('hidden');

    const totalValueEl = document.getElementById('totalValue');
    if (totalValueEl) totalValueEl.textContent = 'Connecting...';

    if (window.__isConnecting) return;
    window.__isConnecting = true;

    const hasLegacyPhantom = !!(window.phantom?.solana?.isPhantom);

    try {
        if (hasLegacyPhantom) {
            // Desktop extension path (fast & reliable)
            console.log("🔌 Using legacy desktop injected path");
            const resp = await window.phantom.solana.connect();
            const publicKey = resp.publicKey.toString();
            setWalletState(true, publicKey, "injected");
            return;
        }

        // Try SDK deep link first
        console.log("🔌 Trying SDK injected for mobile deep link");
        const sdk = await getPhantomSDK();

        try {
            const result = await sdk.connect({ provider: "injected" });
            const publicKey = result.addresses?.[0]?.address;
            if (publicKey) {
                setWalletState(true, publicKey, "injected");
                return;
            }
        } catch (sdkErr) {
            console.warn("SDK deep link attempt failed on mobile, using manual fallback...");
        }

        // iOS / Mobile manual deep link fallback
        if (isMobileDevice()) {
            const dappUrl = window.location.href;
            const encoded = encodeURIComponent(dappUrl);
            window.location.href = `https://phantom.app/ul/browse/${encoded}?ref=${encoded}`;
            return;
        }

        throw new Error("Phantom connection failed");

    } catch (err) {
        console.error("Phantom connect failed:", err);

        const mobile = isMobileDevice();
        let msg = "Failed to connect to Phantom wallet.";

        if (mobile) {
            msg = "Could not open Phantom app.\n\nPlease make sure Phantom is installed and try again, or use Create Wallet with Google.";
        } else {
            msg = "Phantom extension connection failed. Try refreshing the page or use Create Wallet with Google/Apple.";
        }

        alert(msg);
        showAddWalletPrompt();
    } finally {
        setTimeout(() => { window.__isConnecting = false; }, 1000);
    }
}

// ====================== CREATE WALLET (Google) ======================
async function handleCreateWallet() {
    const dropdown = document.getElementById('walletDropdown');
    if (dropdown) dropdown.classList.add('hidden');

    const totalValueEl = document.getElementById('totalValue');
    if (totalValueEl) totalValueEl.textContent = 'Signing in with Google...';

    if (window.__isConnecting) return;
    window.__isConnecting = true;

    try {
        const sdk = await getPhantomSDK();
        const result = await sdk.connect({ provider: "google" });

        const publicKey = result.addresses?.[0]?.address;
        if (publicKey) {
            setWalletState(true, publicKey, "google");
        }
    } catch (err) {
        console.error("Create Wallet failed:", err);
        alert("Google/Apple login failed or cancelled.\n\nPlease try again or use Connect Phantom.");
        showAddWalletPrompt();
    } finally {
        if (totalValueEl && !connectedWallet) {
            totalValueEl.innerHTML = `<span class="text-purple-400">↖ Add Wallet</span>`;
        }
        setTimeout(() => { window.__isConnecting = false; }, 800);
    }
}

function disconnectWallet() {
    const dropdown = document.getElementById('walletDropdown');
    if (dropdown) dropdown.classList.add('hidden');

    clearBalancesOnDisconnect();

    // Only call SDK disconnect when we actually used the SDK for this session
    const usedSDKFlow = connectionMethod === 'google' || connectionMethod === 'apple';

    if (phantomSDK && usedSDKFlow) {
        try { phantomSDK.disconnect(); } catch (e) { }
    }
    if (window.phantom?.solana) {
        window.phantom.solana.disconnect().catch(() => { });
    }

    setWalletState(false);
    connectionMethod = null;
    window.connectionMethod = null;
}

// ====================== BALANCES + TOTAL ======================
async function updateWalletBalances() {
    if (!connectedWallet) return;
    if (!document.getElementById('totalValue')) return;

    const totalValueEl = document.getElementById('totalValue');
    if (totalValueEl && totalValueEl.textContent.includes('Add Wallet')) {
        totalValueEl.textContent = 'Calculating...';
    }

    const currencySpan = document.getElementById('totalCurrency');

    try {
        const response = await fetch(getApiUrl(`/api/balances/${connectedWallet}`));
        const balances = await response.json();

        const allTokens = ['SOL', 'USDC', 'EXPB', 'GIDDY', 'ONE', 'KIN', 'DOBBY', 'MYLO', 'DUNO', 'CPT', 'SINU'];
        let totalValueUSD = 0;

        allTokens.forEach(sym => {
            const qtyEl = document.getElementById(`qty-${sym}`);
            const valueEl = document.getElementById(`value-${sym}`);

            let rawStr = String(balances[sym] || 0).replace(/,/g, '');
            let rawQty = parseFloat(rawStr);

            const priceUSD = latestPrices[sym] || 0;
            const usdValue = rawQty * priceUSD;
            const displayValue = usdValue * getConversionRate(currentCurrency);
            const symbolChar = getCurrencySymbol(currentCurrency);

            if (qtyEl) {
                const communityTokens = ['ONE', 'KIN', 'DOBBY', 'MYLO', 'DUNO', 'CPT', 'SINU'];
                if (communityTokens.includes(sym) && rawQty >= 1000) {
                    qtyEl.textContent = formatLargeNumber(rawQty);
                } else {
                    qtyEl.textContent = rawQty > 0 ? rawQty.toLocaleString() : "0";
                }
            }

            if (valueEl) {
                valueEl.innerHTML = `${symbolChar}${(displayValue).toFixed(2)}`;
            }

            totalValueUSD += usdValue;
        });

        if (totalValueEl) {
            const displayTotal = (totalValueUSD * getConversionRate(currentCurrency)).toFixed(2);
            const symbolChar = getCurrencySymbol(currentCurrency);
            totalValueEl.textContent = `${symbolChar}${displayTotal}`;
        }

        if (currencySpan) currencySpan.textContent = currentCurrency;

    } catch (e) {
        console.error("Balance fetch failed", e);
    }
}

// ====================== PRICE FETCH ======================
const TARGET_SYMBOLS = ['SOL', 'USDC', 'EXPB', 'GIDDY', 'ONE', 'KIN', 'DOBBY', 'MYLO', 'DUNO', 'CPT', 'SINU'];

async function fetchTokenPrices() {
    if (!document.getElementById('totalValue')) return;

    try {
        const response = await fetch(getApiUrl('/api/prices'));
        if (!response.ok) throw new Error("Price server error");
        const dataMatrix = await response.json();

        TARGET_SYMBOLS.forEach(symbol => {
            const tokenData = dataMatrix[symbol];
            if (tokenData && tokenData.price !== null && tokenData.price !== undefined) {
                latestPrices[symbol] = tokenData.price;
            }
        });

        updateAllPriceDisplays();
        if (connectedWallet) updateWalletBalances();
        updateCommunityCurrencyLabels();

    } catch (error) {
        console.error("Failed pulling pricing metrics:", error);
    }
}

// ====================== VALUE LOCK MODAL FUNCTIONS ======================
let currentLockBaseQty = 0;
let currentLockBaseValueUSD = 0;
let currentLockToken = '';

function openValueLockModal(mode = 'expb') {
    const modal = document.getElementById('value-lock-modal');
    if (!modal) return;
    modal.style.display = 'flex';

    const lockSection = document.getElementById('lock-section');
    const switchSection = document.getElementById('switch-section');
    const rightLabel = document.getElementById('right-panel-label');
    const topHeading = document.getElementById('modal-top-heading');

    document.querySelectorAll('.lock-percent-btn, .switch-percent-btn').forEach(btn => btn.classList.remove('active'));
    lockSection.classList.remove('dimmed');
    switchSection.classList.remove('dimmed');

    if (mode === 'expb' || mode === 'dynamic') {
        currentLockToken = 'expb';
        lockSection.classList.remove('dimmed');
        switchSection.classList.add('dimmed');

        document.getElementById('lock-heading').textContent = "Lock Value";
        rightLabel.innerHTML = "BOUNCY BALL<br>QUANTITY TO LOCK";

        if (topHeading) topHeading.innerHTML = `Swap Bouncy Ball <span class="text-purple-400">⟶</span> GIDDY`;

        currentLockBaseQty = parseFloat(document.getElementById('qty-EXPB')?.textContent?.replace(/[^0-9.]/g, '') || '0');
        currentLockBaseValueUSD = parseFloat(document.getElementById('value-EXPB')?.textContent?.replace(/[^0-9.]/g, '') || '0')
            / getConversionRate(currentCurrency);

    } else if (mode === 'giddy') {
        currentLockToken = 'giddy';
        lockSection.classList.add('dimmed');
        switchSection.classList.remove('dimmed');

        document.getElementById('switch-heading').textContent = "Unlock Value";
        rightLabel.innerHTML = "GIDDY<br>QUANTITY TO UNLOCK";

        if (topHeading) topHeading.innerHTML = `Swap Giddy <span class="text-purple-400">⟶</span> BOUNCY BALL`;

        currentLockBaseQty = parseFloat(document.getElementById('qty-GIDDY')?.textContent?.replace(/[^0-9.]/g, '') || '0');
        currentLockBaseValueUSD = parseFloat(document.getElementById('value-GIDDY')?.textContent?.replace(/[^0-9.]/g, '') || '0')
            / getConversionRate(currentCurrency);
    }

    const percentBtns = mode === 'giddy' ? '.switch-percent-btn' : '.lock-percent-btn';
    const fiftyBtn = Array.from(document.querySelectorAll(percentBtns))[1];
    if (fiftyBtn) {
        document.querySelectorAll('.lock-percent-btn, .switch-percent-btn').forEach(b => b.classList.remove('active'));
        fiftyBtn.classList.add('active');
    }

    updateSelectedQuantity(50);
}

function updateSelectedQuantity(percent) {
    const qtyDisplay = document.getElementById('dynamic-quantity-display');
    const valueDisplay = document.getElementById('current-value-display');

    const calculatedQty = currentLockBaseQty * (percent / 100);
    const calculatedValueUSD = currentLockBaseValueUSD * (percent / 100);

    if (qtyDisplay) {
        if (currentLockToken === 'giddy') {
            qtyDisplay.textContent = calculatedQty.toFixed(2);
        } else {
            qtyDisplay.textContent = formatLargeNumber(calculatedQty);
        }
    }

    if (valueDisplay) {
        const displayValue = calculatedValueUSD * getConversionRate(currentCurrency);
        const symbol = getCurrencySymbol(currentCurrency);
        valueDisplay.textContent = symbol + displayValue.toFixed(2) + ' ' + currentCurrency;
    }
}

function formatLargeNumber(num) {
    if (num >= 1_000_000) {
        return (num / 1_000_000).toFixed(2) + "M";
    } else if (num >= 1_000) {
        return (num / 1_000).toFixed(1) + "K";
    } else {
        return num.toFixed(0);
    }
}

function closeValueLockModal() {
    const modal = document.getElementById('value-lock-modal');
    if (modal) modal.style.display = 'none';
}

function selectPercent(btn, group) {
    const siblings = btn.parentElement.querySelectorAll('button');
    siblings.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const percent = parseInt(btn.textContent);
    updateSelectedQuantity(percent);
}

// ====================== GIDDY SWAP MODAL ======================
let currentSwapMode = 'buy';
let currentSwapBaseQty = 0;

function openGiddySwapModal(mode = 'buy') {
    currentSwapMode = mode;
    const modal = document.getElementById('giddy-swap-modal');
    if (!modal) return;

    modal.classList.remove('hidden');
    modal.style.display = 'flex';

    const buySection = document.getElementById('buy-section');
    const sellSection = document.getElementById('sell-section');

    document.querySelectorAll('.buy-percent-btn, .sell-percent-btn').forEach(b => b.classList.remove('active'));

    if (mode === 'buy' || mode === 'expb-buy' || mode === 'sell-sol') {
        currentSwapBaseQty = parseFloat(document.getElementById('qty-SOL')?.textContent?.replace(/[^0-9.]/g, '') || 0);
        buySection.classList.remove('dimmed');
        sellSection.classList.add('dimmed');

        if (mode === 'expb-buy') {
            document.getElementById('swap-modal-title').innerHTML = `Buy <span class="text-teal-400">BOUNCY BALL</span> with <span class="text-purple-400">SOLANA</span>`;
        } else if (mode === 'sell-sol') {
            document.getElementById('swap-modal-title').innerHTML = `Sell <span class="text-purple-400">SOLANA</span> for <span class="text-teal-400">BOUNCY BALL</span>`;
        } else {
            document.getElementById('swap-modal-title').innerHTML = `Buy <span class="text-teal-400">BOUNCY BALL</span> with <span class="text-purple-400">SOLANA</span>`;
        }

        const fiftyBtn = document.querySelector('.buy-percent-btn:nth-child(2)');
        if (fiftyBtn) fiftyBtn.classList.add('active');

    } else if (mode === 'usdc-buy') {
        currentSwapBaseQty = parseFloat(document.getElementById('qty-GIDDY')?.textContent?.replace(/[^0-9.]/g, '') || 0);
        buySection.classList.add('dimmed');
        sellSection.classList.remove('dimmed');

        document.getElementById('swap-modal-title').innerHTML =
            `Buy <span class="text-blue-400">USDC</span> with <span class="text-pink-400">GIDDY</span>`;

        const fiftyBtn = document.querySelector('.sell-percent-btn:nth-child(2)');
        if (fiftyBtn) fiftyBtn.classList.add('active');
    }

    updateSelectedSwapQuantity(50);
}

function updateSelectedSwapQuantity(percent) {
    const qtyDisplay = document.getElementById('swap-quantity-display');
    const valueDisplay = document.getElementById('swap-value-display');

    const calculatedQty = currentSwapBaseQty * (percent / 100);

    if (qtyDisplay) {
        if (currentSwapMode === 'usdc-buy') {
            qtyDisplay.textContent = calculatedQty.toFixed(2);
        } else {
            qtyDisplay.textContent = calculatedQty.toFixed(4);
        }
    }

    let calculatedValue = calculatedQty;
    const tokenSymbol = (currentSwapMode === 'usdc-buy') ? 'GIDDY' : 'SOL';

    if (latestPrices[tokenSymbol]) {
        calculatedValue = calculatedQty * latestPrices[tokenSymbol];
    }

    if (valueDisplay) {
        const displayValue = calculatedValue * getConversionRate(currentCurrency);
        const symbol = getCurrencySymbol(currentCurrency);
        valueDisplay.textContent = symbol + displayValue.toFixed(2) + ' ' + currentCurrency;
    }
}

function closeGiddySwapModal() {
    const modal = document.getElementById('giddy-swap-modal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.add('hidden');
    }
}

function selectSwapPercent(btn, group) {
    document.querySelectorAll('.buy-percent-btn, .sell-percent-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const percent = parseInt(btn.textContent);
    updateSelectedSwapQuantity(percent);
}

// ====================== TX SUCCESS MODAL ======================
function showTxSuccess(result) {
    const modal = document.getElementById('tx-success-modal');
    if (!modal) return;

    document.getElementById('tx-router').innerHTML = `
        Router: <strong>${result.router || 'OKX/DFlow'}</strong>
    `;

    const solscanLink = document.getElementById('tx-solscan-link');
    solscanLink.href = `https://solscan.io/tx/${result.txid}`;
    solscanLink.textContent = `View TX: ${result.txid.slice(0, 8)}...${result.txid.slice(-6)}`;

    modal.style.display = 'flex';
}

function closeTxSuccessModal() {
    const modal = document.getElementById('tx-success-modal');
    if (modal) modal.style.display = 'none';
}

// ====================== REAL SWAP FUNCTIONS ======================
async function confirmValueLock() {
    const activeLock = document.querySelector('.lock-percent-btn.active');
    const activeSwitch = document.querySelector('.switch-percent-btn.active');

    let percent = 50;
    if (activeLock) percent = parseInt(activeLock.textContent);
    else if (activeSwitch) percent = parseInt(activeSwitch.textContent);

    const baseQty = currentLockBaseQty || parseFloat(document.getElementById(`qty-${currentLockToken.toUpperCase()}`)?.textContent?.replace(/[^0-9.]/g, '') || 0);
    const rawAmount = Math.floor(baseQty * (percent / 100) * 1_000_000);

    closeValueLockModal();

    if (!connectedWallet) {
        alert("Please connect your wallet first");
        return;
    }

    if (typeof performUltraSwap !== 'function') {
        alert("Swap engine not ready. Please refresh the page.");
        return;
    }

    try {
        const inputMint = currentLockToken === 'giddy'
            ? "8kQzvMELBQGSiFmrXqLuDSpYVLKkNoXE4bUQCC14wj3Z"
            : "GsKuLQsKCEnfQxuk4icTEQjc11Av8WiqW31CxZqZpump";
        const outputMint = currentLockToken === 'giddy'
            ? "GsKuLQsKCEnfQxuk4icTEQjc11Av8WiqW31CxZqZpump"
            : "8kQzvMELBQGSiFmrXqLuDSpYVLKkNoXE4bUQCC14wj3Z";

        const result = await performUltraSwap(inputMint, outputMint, rawAmount, provider, connectedWallet);
        showTxSuccess(result);

        setTimeout(() => { if (connectedWallet) updateWalletBalances(); }, 1500);
    } catch (e) {
        console.error(e);
        alert(`❌ Swap failed: ${e.message}`);
    }
}

async function confirmGiddySwap() {
    if (!connectedWallet) {
        alert("Please connect your wallet first");
        return;
    }

    if (typeof performUltraSwap !== 'function') {
        alert("Swap engine not ready. Please refresh the page.");
        return;
    }

    const activeBtn = document.querySelector('.buy-percent-btn.active, .sell-percent-btn.active');
    const percent = activeBtn ? parseInt(activeBtn.textContent) : 50;

    let baseQty = currentSwapBaseQty || parseFloat(document.getElementById('qty-SOL')?.textContent?.replace(/[^0-9.]/g, '') || 0);
    let swapAmount = baseQty * (percent / 100);

    if (percent === 100) {
        if (currentSwapMode !== 'usdc-buy') {
            swapAmount = Math.max(0, swapAmount - 0.0085);
        } else {
            const safetyBuffer = 1.0;
            swapAmount = Math.max(0, swapAmount - safetyBuffer);
        }
    }

    const multiplier = (currentSwapMode === 'usdc-buy') ? 1_000_000 : 1_000_000_000;
    let rawAmount = Math.floor(swapAmount * multiplier);

    if (rawAmount < 1) {
        alert("The resulting swap amount is too small. Please try a larger percentage.");
        return;
    }

    console.log(`[Swap Debug] Mode:${currentSwapMode} | Percent:${percent}% | Base:${baseQty.toFixed(6)} | Final:${swapAmount.toFixed(6)} | Raw:${rawAmount}`);

    closeGiddySwapModal();

    try {
        let inputMint = "So11111111111111111111111111111111111111112";
        let outputMint = "GsKuLQsKCEnfQxuk4icTEQjc11Av8WiqW31CxZqZpump";

        if (currentSwapMode === 'usdc-buy') {
            inputMint = "8kQzvMELBQGSiFmrXqLuDSpYVLKkNoXE4bUQCC14wj3Z";
            outputMint = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
        }

        const result = await performUltraSwap(inputMint, outputMint, rawAmount, provider, connectedWallet);
        showTxSuccess(result);

        setTimeout(() => { if (connectedWallet) updateWalletBalances(); }, 2500);

    } catch (e) {
        console.error(e);
        alert(`❌ Swap failed: ${e.message}`);
    }
}

// ====================== PULL TO REFRESH & INITIALIZE ======================
let touchStartY = 0;
let isPulling = false;

function initPullToRefresh() {
    const pullToRefresh = document.getElementById('pullToRefresh');
    if (!pullToRefresh) return;

    const mainContent = document.getElementById('main');

    mainContent.addEventListener('touchstart', (e) => {
        if (window.scrollY <= 10) {
            touchStartY = e.touches[0].clientY;
            isPulling = true;
        }
    }, { passive: true });

    mainContent.addEventListener('touchmove', (e) => {
        if (!isPulling) return;
        const distance = e.touches[0].clientY - touchStartY;
        if (distance > 70) pullToRefresh.classList.add('active');
    }, { passive: true });

    mainContent.addEventListener('touchend', () => {
        if (!isPulling) return;
        isPulling = false;
        const pullEl = document.getElementById('pullToRefresh');
        if (pullEl?.classList.contains('active')) {
            fetchTokenPrices();
            if (connectedWallet) updateWalletBalances();
        }
        pullEl?.classList.remove('active');
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const isWalletPage = window.location.pathname.includes('wallet');

// ====================== GOOGLE CALLBACK - AGGRESSIVE FIX ======================
const urlParams = new URLSearchParams(window.location.search);
const hasPhantomRedirectParams = urlParams.has('phantom_callback') || urlParams.has('code');

if (hasPhantomRedirectParams && !window.__phantomCallbackProcessed) {
    console.log("🔄 Returned from callback.html");
    window.__phantomCallbackProcessed = true;
    history.replaceState({}, document.title, window.location.pathname);

    setTimeout(() => {
        const savedAddress = localStorage.getItem('wallet_address');

        if (savedAddress) {
            console.log("✅ Found address in localStorage:", savedAddress);
            setWalletState(true, savedAddress, "google");

            // Force UI update as backup (in case setWalletState misses something)
            const navText = document.getElementById('walletBtnText');
            const navBtn = document.getElementById('addWalletBtn');
            const statusBar = document.getElementById('connectedStatus');
            const addrEl = document.getElementById('connectedAddress');

            if (navText) navText.innerText = "CONNECTED";
            if (navBtn) navBtn.classList.add('!bg-emerald-600', '!hover:bg-emerald-700');
            if (statusBar) statusBar.classList.remove('hidden');
            if (addrEl) addrEl.innerText = `${savedAddress.slice(0, 6)}...${savedAddress.slice(-4)}`;

        } else {
            console.warn("❌ No wallet_address found in localStorage after callback");
        }
    }, 1400);
}

    // 3. Keep this ONLY if you still need it for cross-window communication
    window.addEventListener('message', async (event) => {
        if (event.data?.type === 'phantom-callback') {
            console.log("✅ Received phantom-callback message");
            // No need to trigger re-connect here, the SDK handles the state change.
        }
    });

    const redeemForm = document.getElementById('redeem-form');
    if (redeemForm) {
        redeemForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const input = document.getElementById('redeem-input').value.trim();
            const messageDiv = document.getElementById('redeem-message');
            const button = redeemForm.querySelector('button');

            messageDiv.textContent = '';
            messageDiv.style.color = '#2ecc71';
            button.classList.remove('success', 'failure');

            if (!input) {
                messageDiv.textContent = 'Please enter a code.';
                messageDiv.style.color = '#e74c3c';
                button.classList.add('failure');
                return;
            }

            if (!/^\d{13}$/.test(input)) {
                messageDiv.textContent = 'Invalid code: Must be exactly 13 digits.';
                messageDiv.style.color = '#e74c3c';
                button.classList.add('failure');
                button.textContent = 'INVALID';
                return;
            }

            messageDiv.textContent = 'Validating code — redirecting to Kinnected!';
            button.textContent = 'Checking...';
            button.disabled = true;

            setTimeout(() => {
                window.location.href = `https://kinnected-links.com/k7m9x2qw8e4r5t6y/pay.html?id=${input}`;
            }, 800);
        });
    }

    const addBtn = document.getElementById('addWalletBtn');
    if (addBtn) addBtn.addEventListener('click', toggleWalletDropdown);

    provider = window.phantom?.solana || window.solana;

    setWalletState(false);

    // ====================== LEGACY PHANTOM INIT (FIRST-TIME POPUP CONTROL) ======================
    if (provider && provider.isPhantom) {

        const wasDisconnected = localStorage.getItem('phantomWasDisconnected') === 'true';
        const hasConnectedBefore = sessionStorage.getItem('phantomHasConnected') === 'true';

        // Restore connected state if already connected
        if (provider.isConnected && provider.publicKey) {
            setWalletState(true, provider.publicKey.toString(), "injected");
        }

        // Event listeners
        provider.on('connect', (publicKey) => {
            setWalletState(true, publicKey.toString(), "injected");
            sessionStorage.setItem('phantomHasConnected', 'true');
            localStorage.removeItem('phantomWasDisconnected');
        });

        provider.on('disconnect', () => {
            setWalletState(false);
            localStorage.setItem('phantomWasDisconnected', 'true');
        });

        // Only try to connect if we're not already connected
        if (!provider.isConnected) {
            if (!hasConnectedBefore && !wasDisconnected) {
                // First time ever → show popup in Phantom app
                console.log("🔵 First-time Phantom deep link → showing connection popup");
                provider.connect({ onlyIfTrusted: false }).catch(() => { });
                sessionStorage.setItem('phantomHasConnected', 'true');
            } else {
                // Normal visits or after disconnect → silent reconnect only
                provider.connect({ onlyIfTrusted: true }).catch(() => { });
            }
        }
    }

    if (isWalletPage) {
        fetchExchangeRates();
        fetchTokenPrices();
        setInterval(fetchTokenPrices, 15000);
        setInterval(() => { if (connectedWallet) updateWalletBalances(); }, 25000);
        initPullToRefresh();

        setTimeout(() => {
            if (!connectedWallet) {
                showAddWalletPrompt();
            }
        }, 900);
    }

    const fallbackObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) entry.target.classList.add('visible');
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.fade-in').forEach(el => fallbackObserver.observe(el));

    if (isWalletPage) {
        const currentHash = window.location.hash;
        if (currentHash && currentHash.startsWith('#card-')) {
            history.replaceState(null, null, ' ');

            const content = document.getElementById('community-content');
            const icon = document.getElementById('expand-icon');
            const targetCard = document.querySelector(currentHash);

            if (targetCard) {
                const cleanHash = currentHash.substring(1);
                const isCommunityToken = !['card-EXPB', 'card-GIDDY'].includes(cleanHash);

                if (isCommunityToken && content && icon) {
                    content.style.transition = 'none';
                    content.style.maxHeight = (content.scrollHeight + 100) + 'px';
                    icon.style.transform = 'rotate(180deg)';
                }

                const performScroll = () => {
                    targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    targetCard.style.transition = "all 0.9s ease-in-out";
                    targetCard.style.backgroundColor = "rgba(168, 85, 247, 0.22)";
                    targetCard.style.boxShadow = "inset 0 0 25px rgba(168, 85, 247, 0.4), 0 0 15px rgba(168, 85, 247, 0.25)";

                    setTimeout(() => {
                        targetCard.style.backgroundColor = "";
                        targetCard.style.boxShadow = "none";
                    }, 2400);
                };

                requestAnimationFrame(() => {
                    if (isCommunityToken && content) {
                        setTimeout(performScroll, 100);
                    } else {
                        performScroll();
                    }
                });
            }
        }
    }

    console.log('✅ Wallet.js FULLY LOADED (Hybrid + Google Resume Fixed)');
});

// ====================== EXPOSE ALL FUNCTIONS TO WINDOW ======================
window.handlePhantomConnect = handlePhantomConnect;
window.handleCreateWallet = handleCreateWallet;
window.disconnectWallet = disconnectWallet;

window.openModal = openModal;
window.closeModal = closeModal;
window.claimBonus = claimBonus;
window.goToToken = goToToken;
window.goToShop = goToShop;
window.buyToken = buyToken;
window.sellToken = sellToken;
window.dismissClaimBubble = dismissClaimBubble;
window.toggleCommunityTokens = toggleCommunityTokens;
window.toggleWorldwideCurrencies = toggleWorldwideCurrencies;

window.openValueLockModal = openValueLockModal;
window.closeValueLockModal = closeValueLockModal;
window.openGiddySwapModal = openGiddySwapModal;
window.closeGiddySwapModal = closeGiddySwapModal;
window.confirmValueLock = confirmValueLock;
window.confirmGiddySwap = confirmGiddySwap;
window.selectPercent = selectPercent;
window.selectSwapPercent = selectSwapPercent;
window.changeCurrency = changeCurrency;
window.showTxSuccess = showTxSuccess;
window.closeTxSuccessModal = closeTxSuccessModal;

window.getPhantomSDK = getPhantomSDK;
window.isMobileDevice = isMobileDevice;