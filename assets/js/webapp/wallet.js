// ================================================
// assets/js/webapp/wallet.js
// ================================================

// ====================== GLOBAL VARIABLES ======================
let connectedWallet = null;
let latestPrices = {};

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
    alert("Buy Interface Loading...");
}

function sellToken() {
    alert("Sell Interface Loading...");
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

// Close dropdown when clicking outside
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

    // wallet.html elements
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

    // shop.html status box
    const dot = document.getElementById('status-dot');
    const text = document.getElementById('status-text');
    const btn = document.getElementById('connect-btn');

    if (dot) dot.style.backgroundColor = "#10b981";
    if (text) text.innerText = "Wallet Connected";
    if (btn) {
        btn.innerText = "Disconnect";
        btn.style.borderColor = "#ef4444";
        btn.style.color = "#ef4444";
        btn.style.cursor = "pointer";
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

    // shop.html status box
    const dot = document.getElementById('status-dot');
    const text = document.getElementById('status-text');
    const btn = document.getElementById('connect-btn');

    if (dot) dot.style.backgroundColor = "#71717a";
    if (text) text.innerText = "Wallet Disconnected";
    if (btn) {
        btn.innerText = "Connect";
        btn.style.borderColor = "#8b5cf6";
        btn.style.color = "#8b5cf6";
        btn.style.cursor = "pointer";
        btn.onclick = handlePhantomConnect;
    }
}

// ====================== BALANCES + PRICE FUNCTIONS ======================
async function updateWalletBalances() {
    if (!connectedWallet) return;
    try {
        const response = await fetch(`http://localhost:3000/api/balances/${connectedWallet}`);
        const balances = await response.json();

        const tokens = ['SOL', 'USDC', 'EXPB', 'GIDDY'];
        tokens.forEach(sym => {
            const qtyEl = document.getElementById(`qty-${sym}`);
            const valueEl = document.getElementById(`value-${sym}`);
            let rawQty = parseFloat(balances[sym] || 0);
            if (sym === 'EXPB') rawQty *= 1000;

            const price = latestPrices[sym] || 0;
            if (qtyEl) qtyEl.textContent = rawQty > 0 ? rawQty.toLocaleString() : "0";
            if (valueEl) valueEl.textContent = `$${(rawQty * price).toFixed(2)} CAD`;
        });
    } catch (e) {
        console.error("Balance fetch failed", e);
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

            if (tokenData && tokenData.price !== null) {
                latestPrices[symbol] = tokenData.price;
                let priceStr = (symbol === 'ONE' || symbol === 'GIDDY')
                    ? `$${tokenData.price.toFixed(2)} CAD`
                    : `$${tokenData.price.toFixed(6)} CAD`;
                if (priceEl) priceEl.innerText = priceStr;
            } else if (priceEl) {
                priceEl.innerText = "No Pool";
            }
        });

        if (connectedWallet) updateWalletBalances();
    } catch (error) {
        console.error("Failed pulling pricing metrics:", error);
    }
}

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

// ====================== INITIALIZE EVERYTHING ======================
document.addEventListener('DOMContentLoaded', () => {
    // Redeem form handler
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

    // ====================== PHANTOM INITIALIZATION ======================
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
        }
        else if (isInPhantomBrowser && !alreadyPrompted) {
            sessionStorage.setItem('deepLinkPromptShown', 'true');
            setTimeout(() => {
                window.solana.connect({ onlyIfTrusted: false }).catch(() => { });
            }, 800);
        }
        else {
            showDisconnectedState();
            window.solana.connect({ onlyIfTrusted: true }).catch(() => { });
        }
    } else {
        showDisconnectedState();
    }

    // Live updates
    fetchTokenPrices();
    setInterval(fetchTokenPrices, 15000);
    setInterval(() => { if (connectedWallet) updateWalletBalances(); }, 25000);

    initPullToRefresh();

    // Fade-in observer + hash scroll
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

    console.log('✅ Wallet.js fully loaded | showProfile ready');
});