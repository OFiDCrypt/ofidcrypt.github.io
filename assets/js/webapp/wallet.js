// ================================================
// assets/js/webapp/wallet.js
// ================================================

// ====================== GLOBAL VARIABLES ======================
let connectedWallet = null;
let latestPrices = {};
let currentLockBaseQuantity = 0;   // ← New: stores base qty for percentage calculation

// ====================== CURRENCY SYSTEM ======================
let lastTotalValue = 0;
let currentCurrency = 'CAD';

const CURRENCY_RATES = {
    'CAD': 1.35,
    'USD': 1
};

function changeCurrency(newCurrency) {
    currentCurrency = newCurrency;
    updateWalletBalances();
    updateCommunityCurrencyLabels();
}

function updateCommunityCurrencyLabels() {
    const symbols = ['ONE', 'KIN', 'DOBBY', 'MYLO', 'DUNO', 'CPT', 'SINU'];
    symbols.forEach(sym => {
        const el = document.getElementById(`price-currency-${sym}`);
        if (el) el.textContent = currentCurrency;
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

// ====================== PHANTOM WALLET INTEGRATION ======================
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

async function handlePhantomConnect() {
    const dappUrl = "https://www.ofidcrypt.com/wallet.html";
    const dropdown = document.getElementById('walletDropdown');
    if (dropdown) dropdown.classList.add('hidden');

    const provider = window.phantom?.solana || window.solana;

    if (provider && provider.isPhantom) {
        try {
            const resp = await provider.connect();
            connectedWallet = resp.publicKey.toString();
            showConnectedState();
            if (typeof updateWalletBalances === "function") updateWalletBalances();
        } catch (err) {
            console.error(err);
            if (err.code === 4001) {
                alert("Connection cancelled by user.");
            } else {
                alert("Failed to connect to Phantom.");
            }
        }
        return;
    }

    if (/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) {
        const encodedUrl = encodeURIComponent(dappUrl);
        window.location.href = `https://phantom.app/ul/browse/${encodedUrl}?ref=${encodedUrl}`;
        return;
    }

    alert("Phantom Wallet not detected.\n\nPlease install Phantom from phantom.app");
}

function disconnectWallet() {
    const dropdown = document.getElementById('walletDropdown');
    if (dropdown) dropdown.classList.add('hidden');

    const provider = window.phantom?.solana || window.solana;
    if (provider) provider.disconnect();

    connectedWallet = null;
    showDisconnectedState();
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

    if (!lastTotalValue && totalValueEl) {
        totalValueEl.textContent = "Calculating...";
    }

    try {
        const response = await fetch(`http://localhost:3000/api/balances/${connectedWallet}`);
        const balances = await response.json();

        const allTokens = ['SOL', 'USDC', 'EXPB', 'GIDDY', 'ONE', 'KIN', 'DOBBY', 'MYLO', 'DUNO', 'CPT', 'SINU'];
        let totalValueUSD = 0;

        allTokens.forEach(sym => {
            const qtyEl = document.getElementById(`qty-${sym}`);
            const valueEl = document.getElementById(`value-${sym}`);

            let rawQty = parseFloat(balances[sym] || 0);
            if (sym === 'EXPB') rawQty *= 1000;

            const priceUSD = latestPrices[sym] || 0;
            const usdValue = rawQty * priceUSD;
            const displayValue = usdValue * CURRENCY_RATES[currentCurrency];

            if (qtyEl) qtyEl.textContent = rawQty > 0 ? rawQty.toLocaleString() : "0";
            if (valueEl) valueEl.innerHTML = `$${(displayValue).toFixed(2)} <span class="text-base">${currentCurrency}</span>`;

            totalValueUSD += usdValue;
        });

        lastTotalValue = totalValueUSD;

        if (totalValueEl) {
            const displayTotal = (totalValueUSD * CURRENCY_RATES[currentCurrency]).toFixed(2);
            totalValueEl.textContent = '$' + displayTotal;
            totalValueEl.style.color = 'var(--text-color, #ffffff)';
        }

        if (currencySpan) currencySpan.textContent = currentCurrency;

    } catch (e) {
        console.error("Balance fetch failed", e);
        if (totalValueEl && !lastTotalValue) {
            totalValueEl.textContent = "$0.00";
            totalValueEl.style.color = 'var(--text-color, #ffffff)';
        }
    }
}

// ====================== PRICE FETCH ======================
const TARGET_SYMBOLS = ['SOL', 'USDC', 'EXPB', 'GIDDY', 'ONE', 'KIN', 'DOBBY', 'MYLO', 'DUNO', 'CPT', 'SINU'];
const LOCAL_API_URL = "http://localhost:3000/api/prices";

async function fetchTokenPrices() {
    try {
        const response = await fetch(LOCAL_API_URL);
        const dataMatrix = await response.json();

        TARGET_SYMBOLS.forEach(symbol => {
            const priceEl = document.getElementById(`price-${symbol}`);
            const tokenData = dataMatrix[symbol];

            if (tokenData && tokenData.price !== null && tokenData.price !== undefined) {
                latestPrices[symbol] = tokenData.price;

                let priceStr = (symbol === 'ONE' || symbol === 'GIDDY' || symbol === 'SOL')
                    ? `$${tokenData.price.toFixed(2)}`
                    : `$${tokenData.price.toFixed(6)}`;

                if (priceEl) priceEl.innerText = priceStr;
            } else if (priceEl) {
                priceEl.innerText = "No Pool";
            }
        });

        if (connectedWallet) updateWalletBalances();
        updateCommunityCurrencyLabels();

    } catch (error) {
        console.error("Failed pulling pricing metrics:", error);
    }
}

// ====================== VALUE LOCK MODAL FUNCTIONS ======================
let currentLockBaseQty = 0;
let currentLockBaseValue = 0;
let currentLockToken = '';

function openValueLockModal(mode = 'expb') {
    const modal = document.getElementById('value-lock-modal');
    if (!modal) return;
    modal.style.display = 'flex';

    const lockSection = document.getElementById('lock-section');
    const switchSection = document.getElementById('switch-section');
    const rightLabel = document.getElementById('right-panel-label');
    const topHeading = document.getElementById('modal-top-heading');   // ← New

    // Reset
    document.querySelectorAll('.lock-percent-btn, .switch-percent-btn').forEach(btn => btn.classList.remove('active'));
    lockSection.classList.remove('dimmed');
    switchSection.classList.remove('dimmed');

    if (mode === 'expb' || mode === 'dynamic') {
        // eXPB → GIDDY (Dynamic Swap)
        currentLockToken = 'expb';
        lockSection.classList.remove('dimmed');
        switchSection.classList.add('dimmed');

        document.getElementById('lock-heading').textContent = "Lock Value";
        rightLabel.innerHTML = "DYNAMIC<br>QUANTITY TO LOCK";

        if (topHeading) topHeading.innerHTML = `Swap Bouncy Ball <span class="text-purple-400">⟶</span> GIDDY`;

        currentLockBaseQty = parseFloat(document.getElementById('qty-EXPB')?.textContent?.replace(/[^0-9.]/g, '') || '0');
        currentLockBaseValue = parseFloat(document.getElementById('value-EXPB')?.textContent?.replace(/[^0-9.]/g, '') || '0');

    } else if (mode === 'giddy') {
        // GIDDY → eXPB
        currentLockToken = 'giddy';
        lockSection.classList.add('dimmed');
        switchSection.classList.remove('dimmed');

        document.getElementById('switch-heading').textContent = "Unlock Value";
        rightLabel.innerHTML = "GIDDY<br>QUANTITY TO UNLOCK";

        if (topHeading) topHeading.innerHTML = `Swap Giddy <span class="text-purple-400">⟶</span> BOUNCY BALL`;

        currentLockBaseQty = parseFloat(document.getElementById('qty-GIDDY')?.textContent?.replace(/[^0-9.]/g, '') || '0');
        currentLockBaseValue = parseFloat(document.getElementById('value-GIDDY')?.textContent?.replace(/[^0-9.]/g, '') || '0');
    }

    // Default 50%
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
    const calculatedValue = currentLockBaseValue * (percent / 100);

    // Quantity display
    if (currentLockToken === 'giddy') {
        qtyDisplay.textContent = calculatedQty.toFixed(2);
    } else {
        qtyDisplay.textContent = Math.round(calculatedQty).toLocaleString();
    }

    // Value display - respects global currentCurrency
    if (valueDisplay) {
        const currencySymbol = currentCurrency === 'USD' ? 'USD' : 'CAD';
        valueDisplay.textContent = '$' + calculatedValue.toFixed(2) + ' ' + currencySymbol;
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

function confirmValueLock() {
    const activeLock = document.querySelector('.lock-percent-btn.active');
    const activeSwitch = document.querySelector('.switch-percent-btn.active');
    
    let percent = 50;
    if (activeLock) percent = parseInt(activeLock.textContent);
    else if (activeSwitch) percent = parseInt(activeSwitch.textContent);

    const finalQty = currentLockBaseQty * (percent / 100);
    const finalValue = currentLockBaseValue * (percent / 100);

    const qtyFormatted = currentLockToken === 'giddy' ? finalQty.toFixed(2) : Math.round(finalQty).toLocaleString();
    const currencySymbol = currentCurrency === 'USD' ? 'USD' : 'CAD';

    alert(`✅ Confirmed ${percent}% of ${currentLockToken.toUpperCase()}\nQuantity: ${qtyFormatted}\nValue: $${finalValue.toFixed(2)} ${currencySymbol}`);
    closeValueLockModal();
}

// Make functions globally available
window.openValueLockModal = openValueLockModal;
window.closeValueLockModal = closeValueLockModal;

// ====================== PULL TO REFRESH ======================
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

// ====================== INITIALIZE ======================
document.addEventListener('DOMContentLoaded', () => {
    // ... [All your existing DOMContentLoaded code remains unchanged] ...

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

    // Phantom init (unchanged)
    if (window.solana && window.solana.isPhantom) {
        window.solana.on('connect', (publicKey) => {
            connectedWallet = publicKey.toString();
            showConnectedState();
        });

        window.solana.on('disconnect', () => {
            showDisconnectedState();
        });

        const isInPhantomBrowser = /Phantom/i.test(navigator.userAgent);
        const alreadyPrompted = sessionStorage.getItem('deepLinkPromptShown') === 'true';

        if (window.solana.isConnected) {
            connectedWallet = window.solana.publicKey.toString();
            showConnectedState();
        } else if (isInPhantomBrowser && !alreadyPrompted) {
            sessionStorage.setItem('deepLinkPromptShown', 'true');
            setTimeout(() => window.solana.connect({ onlyIfTrusted: false }).catch(() => {}), 800);
        } else {
            showDisconnectedState();
            window.solana.connect({ onlyIfTrusted: true }).catch(() => {});
        }
    } else {
        showDisconnectedState();
    }

    // Live updates
    fetchTokenPrices();
    setInterval(fetchTokenPrices, 15000);
    setInterval(() => { if (connectedWallet) updateWalletBalances(); }, 25000);

    initPullToRefresh();

    // HASH LINK SUPPORT (unchanged)
    const fallbackObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) entry.target.classList.add('visible');
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.fade-in').forEach(el => fallbackObserver.observe(el));

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

    console.log('✅ Wallet.js loaded with dynamic currency + full redeem form + Value Lock Modal');
});

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
            document.getElementById('swap-modal-title').innerHTML = `Buy <span class="text-emerald-400">eXPB</span> with Solana`;
        } else if (mode === 'sell-sol') {
            document.getElementById('swap-modal-title').innerHTML = `Sell <span class="text-emerald-400">Solana</span> for eXPB`;
        } else {
            document.getElementById('swap-modal-title').innerHTML = `Buy <span class="text-emerald-400">Solana / Bouncy Ball</span>`;
        }

        const fiftyBtn = document.querySelector('.buy-percent-btn:nth-child(2)');
        if (fiftyBtn) fiftyBtn.classList.add('active');

    } else if (mode === 'usdc-buy') {
        currentSwapBaseQty = parseFloat(document.getElementById('qty-GIDDY')?.textContent?.replace(/[^0-9.]/g, '') || 0);
        buySection.classList.add('dimmed');
        sellSection.classList.remove('dimmed');

        document.getElementById('swap-modal-title').innerHTML = `Buy <span class="text-pink-400">USDC</span> with Giddy`;

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
        qtyDisplay.textContent = (currentSwapMode === 'usdc-buy') 
            ? calculatedQty.toFixed(2) 
            : calculatedQty.toFixed(4);
    }

    let calculatedValue = calculatedQty;
    const tokenSymbol = (currentSwapMode === 'usdc-buy') ? 'GIDDY' : 'SOL';

    if (latestPrices[tokenSymbol]) {
        calculatedValue = calculatedQty * latestPrices[tokenSymbol];
    } else {
        calculatedValue = calculatedQty * (tokenSymbol === 'SOL' ? 220 : 1);
    }

    if (valueDisplay) {
        const displayValue = calculatedValue * CURRENCY_RATES[currentCurrency];
        valueDisplay.textContent = '$' + displayValue.toFixed(2) + ' ' + currentCurrency;
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

function confirmGiddySwap() {
    const isUpper = (currentSwapMode === 'buy' || currentSwapMode === 'expb-buy' || currentSwapMode === 'sell-sol');
    const activeBtn = document.querySelector(`.${isUpper ? 'buy' : 'sell'}-percent-btn.active`);
    const percent = activeBtn ? parseInt(activeBtn.textContent) : 50;

    alert(`✅ Swap Confirmed!\nMode: ${currentSwapMode.toUpperCase()}\n${percent}%`);
    closeGiddySwapModal();
}

window.openGiddySwapModal = openGiddySwapModal;
window.closeGiddySwapModal = closeGiddySwapModal;
window.selectSwapPercent = selectSwapPercent;
window.confirmGiddySwap = confirmGiddySwap;