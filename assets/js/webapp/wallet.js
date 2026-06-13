// =======================================================
// assets/js/webapp/wallet.js - FULL HYBRID (SDK + Direct Extension)
// =======================================================

import { BrowserSDK, AddressType } from "@phantom/browser-sdk";

// Buffer polyfill for swap transactions
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

// ====================== PHANTOM BROWSER SDK INITIALIZATION ======================
const sdk = new BrowserSDK({
    providers: ["google", "apple", "injected"],
    addressTypes: [AddressType.solana],
    appId: "2351fc48-e0c6-4ece-9191-1ba4b28a8bdf",
    authOptions: {
        redirectUrl: "http://localhost:5173/auth/callback.html",
    },
});

// ====================== DYNAMIC API CONFIG ======================
function getApiUrl(endpoint) {
    let clean = endpoint.startsWith('/') ? endpoint : '/' + endpoint;
    const base = (window.CONFIG && window.CONFIG.BASE) ? window.CONFIG.BASE : "http://localhost:3000";
    const url = base + clean;
    console.log("🔗 [wallet.js] Fetching:", url);
    return url;
}

// ====================== GLOBAL VARIABLES ======================
let connectedWallet = null;
let provider = null;
let latestPrices = {};        // Always stored in USD
let currentLockBaseQuantity = 0;

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
        default: return 1; // USD
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

// Update all UI elements
    updateAllPriceDisplays();
    updateCommunityCurrencyLabels();
    updateCardValuePlaceholders();

    // Update main total balance label
    const currencySpan = document.getElementById('totalCurrency');
    if (currencySpan) currencySpan.textContent = newCurrency;

    // Only fetch real balances if wallet is connected
    if (connectedWallet) {
        updateWalletBalances();
    }
}

// Update MY VALUE placeholders on all cards (works whether connected or not)
function updateCardValuePlaceholders() {
    const symbolChar = getCurrencySymbol(currentCurrency);

    // Main tokens (no currency suffix)
    ['EXPB', 'GIDDY'].forEach(sym => {
        const el = document.getElementById(`value-${sym}`);
        if (el) el.innerHTML = `${symbolChar}0.00`;
    });

    // Community tokens (with currency suffix)
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
            priceEl.innerText = `${symbolChar}${priceStr} ${currentCurrency}`;
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

// ====================== UI HELPER FUNCTIONS ======================
function dismissClaimBubble() {
    const bubble = document.getElementById('mobileClaimBubble');
    if (bubble) {
        bubble.style.setProperty('display', 'none', 'important');
    }
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

// ====================== WALLET DROPDOWN ======================
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

// ====================== HYBRID CONNECT FUNCTIONS ======================
async function handlePhantomConnect() {
    const dropdown = document.getElementById('walletDropdown');
    if (dropdown) dropdown.classList.add('hidden');

    const extensionProvider = window.phantom?.solana || window.solana;

    if (extensionProvider && extensionProvider.isPhantom) {
        try {
            console.log("Connecting directly via Phantom extension...");
            const resp = await extensionProvider.connect();
            connectedWallet = resp.publicKey.toString();
            provider = extensionProvider;
            
            showConnectedState();
            updateWalletBalances();
        } catch (err) {
            console.error("Extension pairing aborted:", err);
            if (err.code === 4001) alert("Connection cancelled by user.");
        }
        return;
    }

    // Fallback to SDK
    try {
        const { addresses } = await sdk.connect({ provider: "injected" });
        console.log("Connected via SDK injected:", addresses);
    } catch (err) {
        console.error("SDK injected fallback failed:", err);
    }
}

async function handleCreateWallet() {
    const dropdown = document.getElementById('walletDropdown');
    if (dropdown) dropdown.classList.add('hidden');
    try {
        console.log("Opening embedded login window...");
        const { addresses } = await sdk.connect({ provider: "google" }); 
        console.log("Embedded Auth successfully paired:", addresses);
    } catch (err) {
        console.error("Embedded Auth pairing aborted:", err);
    }
}

async function disconnectWallet() {
    const dropdown = document.getElementById('walletDropdown');
    if (dropdown) dropdown.classList.add('hidden');
    try {
        if (sdk) await sdk.disconnect().catch(() => {});
        const extensionProvider = window.phantom?.solana || window.solana;
        if (extensionProvider && extensionProvider.disconnect) {
            await extensionProvider.disconnect();
        }
        connectedWallet = null;
        provider = null;
        clearBalancesOnDisconnect();
        showDisconnectedState();
    } catch (err) {
        console.error("Clear session failed:", err);
    }
}

function clearBalancesOnDisconnect() {
    const allTokens = ['SOL', 'USDC', 'EXPB', 'GIDDY', 'ONE', 'KIN', 'DOBBY', 'MYLO', 'DUNO', 'CPT', 'SINU'];

    allTokens.forEach(sym => {
        const qtyEl = document.getElementById(`qty-${sym}`);
        const valueEl = document.getElementById(`value-${sym}`);

        if (qtyEl) qtyEl.textContent = '—';

        if (valueEl) {
            const symbolChar = getCurrencySymbol(currentCurrency);

            if (sym === 'EXPB' || sym === 'GIDDY') {
                valueEl.innerHTML = `${symbolChar}0.00`;
            } else {
                valueEl.innerHTML = `${symbolChar}0.00 <span class="text-base">${currentCurrency}</span>`;
            }
        }
    });

    // Also update main total balance
    const totalValueEl = document.getElementById('totalValue');
    const currencySpan = document.getElementById('totalCurrency');

    if (totalValueEl) totalValueEl.textContent = `${getCurrencySymbol(currentCurrency)}0.00`;
    if (currencySpan) currencySpan.textContent = currentCurrency;
}

function showConnectedState() {
    connectedWallet = connectedWallet || window.solana?.publicKey?.toString();
    const short = connectedWallet ? `${connectedWallet.slice(0, 6)}...${connectedWallet.slice(-4)}` : "";

    const navText = document.getElementById('walletBtnText');
    const navBtn = document.getElementById('addWalletBtn');
    const chevron = document.getElementById('chevron');
    const addr = document.getElementById('connectedAddress');
    const status = document.getElementById('connectedStatus');
    const cOpt = document.getElementById('connectOption');
    const dOpt = document.getElementById('disconnectOption');

    if (navText) navText.innerText = "CONNECTED";
    if (navBtn) navBtn.classList.add('!bg-emerald-600', '!hover:bg-emerald-700');
    if (chevron) chevron.style.display = 'none';
    if (addr) addr.innerText = short;
    if (status) status.classList.remove('hidden');
    if (cOpt) cOpt.classList.add('hidden');
    if (dOpt) dOpt.classList.remove('hidden');

    const dot = document.getElementById('status-dot');
    const text = document.getElementById('status-text');
    const btn = document.getElementById('connect-btn');
    if (dot) dot.style.backgroundColor = "#10b981";
    if (text) text.innerText = "Wallet Connected";
    if (btn) {
        btn.innerText = "Disconnect";
        btn.style.borderColor = "#ef4444";
        btn.style.color = "#ef4444";
        btn.onclick = disconnectWallet;
    }
}

function showDisconnectedState() {
    const navText = document.getElementById('walletBtnText');
    const navBtn = document.getElementById('addWalletBtn');
    const chevron = document.getElementById('chevron');
    const status = document.getElementById('connectedStatus');
    const cOpt = document.getElementById('connectOption');
    const dOpt = document.getElementById('disconnectOption');

    if (navText) navText.innerText = "ADD WALLET";
    if (navBtn) navBtn.classList.remove('!bg-emerald-600', '!hover:bg-emerald-700');
    if (chevron) chevron.style.display = 'inline-block';
    if (status) status.classList.add('hidden');
    if (cOpt) cOpt.classList.remove('hidden');
    if (dOpt) dOpt.classList.add('hidden');

    const dot = document.getElementById('status-dot');
    const text = document.getElementById('status-text');
    const btn = document.getElementById('connect-btn');
    if (dot) dot.style.backgroundColor = "#71717a";
    if (text) text.innerText = "Wallet Disconnected";
    if (btn) {
        btn.innerText = "Connect";
        btn.style.borderColor = "#8b5cf6";
        btn.style.color = "#8b5cf6";
        btn.onclick = handlePhantomConnect;
    }
}

// ====================== BALANCES + TOTAL ======================
async function updateWalletBalances() {
    if (!connectedWallet) return;

    const totalValueEl = document.getElementById('totalValue');
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
                qtyEl.textContent = rawQty > 0 ? rawQty.toLocaleString() : "0";
            }

            if (valueEl) {
                if (sym === 'EXPB' || sym === 'GIDDY') {
                    valueEl.innerHTML = `${symbolChar}${(displayValue).toFixed(2)}`;
                } else {
                    valueEl.innerHTML = `${symbolChar}${(displayValue).toFixed(2)} <span class="text-base">${currentCurrency}</span>`;
                }
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
            `Sell <span class="text-pink-400">GIDDY</span> for <span class="text-blue-400">USDC</span>`;

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

    if (!connectedWallet || !provider) {
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
    if (!connectedWallet || !provider) {
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

// ====================== SDK EVENT STREAM ======================
sdk.on("userChanged", (user) => {
    if (user) {
        console.log("SDK Stream Activated. Wallets retrieved:", user.wallets);
        const solanaWallet = user.wallets.find(w => w.addressType === "solana");
        if (solanaWallet) {
            connectedWallet = solanaWallet.address;
            provider = window.phantom?.solana || window.solana;
            showConnectedState();
            updateWalletBalances();
        }
    } else {
        connectedWallet = null;
        provider = null;
        clearBalancesOnDisconnect();
        showDisconnectedState();
    }
});

document.addEventListener('DOMContentLoaded', () => {
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

    fetchExchangeRates();
    fetchTokenPrices();
    setInterval(fetchTokenPrices, 15000);
    setInterval(() => { if (connectedWallet) updateWalletBalances(); }, 25000);
    initPullToRefresh();

    // Auto detect already connected wallet
    provider = window.phantom?.solana || window.solana;
    if (provider && provider.isPhantom && provider.isConnected && provider.publicKey) {
        connectedWallet = provider.publicKey.toString();
        showConnectedState();
    }

    // Expose all functions to window
    window.handlePhantomConnect = handlePhantomConnect;
    window.handleCreateWallet = handleCreateWallet;
    window.disconnectWallet = disconnectWallet;
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
    window.toggleWalletDropdown = toggleWalletDropdown;
    window.goToToken = goToToken;
    window.goToShop = goToShop;
    window.claimBonus = claimBonus;
    window.dismissClaimBubble = dismissClaimBubble;
    window.toggleCommunityTokens = toggleCommunityTokens;
});

console.log("✅ wallet.js fully loaded and ready");