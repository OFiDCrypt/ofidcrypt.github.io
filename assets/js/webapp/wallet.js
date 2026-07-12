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

// ====================== CLEAR EMBEDDED MEMORY ======================
function clearEmbeddedMemory(avoidSDKDisconnect = false) {
    console.log("🧹 Clearing Google/Apple embedded memory (injected priority)");
    localStorage.removeItem('giddy_embedded_session');

    if (!avoidSDKDisconnect && phantomSDK) {
        try {
            phantomSDK.disconnect();
        } catch (e) { }
    }
}

// ====================== UI HELPERS ======================
function setWalletState(isConnected, publicKey = null, method = null) {
    // 1. Update Global State
    connectedWallet = isConnected && publicKey ? publicKey : null;
    window.connectedWallet = connectedWallet;
    connectionMethod = isConnected ? (method || connectionMethod || 'injected') : null;
    window.connectionMethod = connectionMethod;

    // 2. Persist to LocalStorage (single source of truth for cross-page state)
    if (isConnected && connectedWallet) {
        localStorage.setItem('wallet_address', connectedWallet);
        localStorage.setItem('connection_method', connectionMethod);
        window.connectionMethod = connectionMethod;
    } else {
        localStorage.removeItem('wallet_address');
        localStorage.removeItem('connection_method');
        window.connectionMethod = null;
    }

    // 3. UI Elements
    const navText = document.getElementById('walletBtnText');
    const navBtn = document.getElementById('addWalletBtn');
    const chevron = document.getElementById('chevron');
    const statusBar = document.getElementById('connectedStatus');
    const addrEl = document.getElementById('connectedAddress');
    const connectOpt = document.getElementById('connectOption');
    const createContainer = document.getElementById('createSignInContainer');
    const disconnectOpt = document.getElementById('disconnectOption');

    // Shop UI elements
    const shopDot = document.getElementById('status-dot');
    const shopText = document.getElementById('status-text');
    const actionsContainer = document.getElementById('status-actions');
    const connectBtn = document.getElementById('connect-btn');

    if (isConnected && connectedWallet) {
        // Connected UI
        const short = `${connectedWallet.slice(0, 6)}...${connectedWallet.slice(-4)}`;

        if (navText) navText.innerText = "CONNECTED";
        if (navBtn) navBtn.classList.add('!bg-emerald-600', '!hover:bg-emerald-700');
        if (chevron) chevron.style.display = 'none';
        if (statusBar) statusBar.classList.remove('hidden');
        if (addrEl) addrEl.innerText = short;

        if (connectOpt) connectOpt.classList.add('hidden');
        if (createContainer) createContainer.classList.add('hidden');
        if (disconnectOpt) disconnectOpt.classList.remove('hidden');

        // Shop Status
        if (shopDot) shopDot.style.backgroundColor = "#10b981";
        if (shopText) shopText.innerText = "Connected";

        // Shop Button Toggle to Disconnect
        if (connectBtn) {
            connectBtn.innerText = "Disconnect";
            connectBtn.onclick = disconnectWallet;
            connectBtn.style.borderColor = "#ef4444";
            connectBtn.style.color = "#ef4444";
        }

        // Manage Button Injection
        if (actionsContainer) {
            actionsContainer.innerHTML = '';
            if (method === "google" || method === "apple") {
                const manageBtn = document.createElement('button');
                manageBtn.type = 'button';
                manageBtn.textContent = "Manage";
                manageBtn.style.cssText = "background:transparent; border:1px solid #10b981; color:#10b981; padding:2px 8px; border-radius:6px; font-size:0.7rem; font-weight:700; cursor:pointer; height:22px; display:flex; align-items:center; justify-content:center; line-height:1; margin-bottom:0; margin-right:6px;";
                manageBtn.onclick = () => window.open('https://phantom.app', '_blank');
                actionsContainer.appendChild(manageBtn);
            }
        }
        if (typeof updateWalletBalances === 'function') updateWalletBalances();

    } else {
        // Disconnected UI
        if (navText) navText.innerText = "ADD WALLET";
        if (navBtn) navBtn.classList.remove('!bg-emerald-600', '!hover:bg-emerald-700');
        if (chevron) chevron.style.display = 'inline-block';
        if (statusBar) statusBar.classList.add('hidden');
        if (connectOpt) connectOpt.classList.remove('hidden');
        if (createContainer) createContainer.classList.remove('hidden');
        if (disconnectOpt) disconnectOpt.classList.add('hidden');

        // Shop Status
        if (shopDot) shopDot.style.backgroundColor = "#71717a";
        if (shopText) shopText.innerText = "Wallet Disconnected";

        // Shop Button Toggle to Connect
        if (connectBtn) {
            connectBtn.innerText = "Connect";
            connectBtn.onclick = handlePhantomConnect;
            connectBtn.style.borderColor = "#8b5cf6";
            connectBtn.style.color = "#8b5cf6";
        }

        if (actionsContainer) actionsContainer.innerHTML = '';
        if (typeof clearBalancesOnDisconnect === 'function') clearBalancesOnDisconnect();
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

// Save exact embedded session (Google/Apple address + provider)
function saveEmbeddedSession(addr, method) {
    const sessionData = {
        address: addr,
        method: method,           // "google" or "apple"
        timestamp: Date.now(),
        expiresIn: 7 * 24 * 60 * 60 * 1000 // 7 days
    };
    localStorage.setItem('giddy_embedded_session', JSON.stringify(sessionData));
    console.log(`💾 Saved embedded session: ${method} → ${addr.slice(0, 8)}...`);
}

// Get valid stored embedded session
function getValidEmbeddedSession() {
    const stored = localStorage.getItem('giddy_embedded_session');
    if (!stored) return null;

    try {
        const session = JSON.parse(stored);
        if (Date.now() - session.timestamp > session.expiresIn) {
            localStorage.removeItem('giddy_embedded_session');
            return null;
        }
        return session;
    } catch (e) {
        localStorage.removeItem('giddy_embedded_session');
        return null;
    }
}

// ====================== PHANTOM SDK & API CONFIG ======================
import { BrowserSDK, AddressType } from "@phantom/browser-sdk";

// Helper for unified session storage
function saveSession(addr, method) {
    localStorage.setItem('wallet_address', addr);
    localStorage.setItem('connection_method', method);
    if (method === "google" || method === "apple") {
        saveEmbeddedSession(addr, method);
    }
}

// GLOBAL SINGLE INITIALIZER
async function getPhantomSDK() {
    if (!phantomSDK) {
        console.log("🔧 Initializing Phantom BrowserSDK (once globally)");
        phantomSDK = new BrowserSDK({
            providers: ["injected", "google", "apple"],
            addressTypes: [AddressType.solana],
            appId: "62ccac9b-8746-42db-8a6d-45e2c97f7f58",
            embeddedWalletType: "user-wallet",
            authOptions: {
                redirectUrl: `${window.location.origin}/callback.html`,
            },
            autoConnect: false,
        });

        phantomSDK.on("connect", (data) => {
            console.log("✅ Phantom SDK Connected via", data.provider, data.addresses);
            const addr = data.addresses?.[0]?.address;
            if (addr) {
                const method = (data.provider || "injected").toLowerCase();
                localStorage.setItem('wallet_address', addr);
                localStorage.setItem('connection_method', method);
                saveSession(addr, method);
                setWalletState(true, addr, method);
            }
        });

        phantomSDK.on("disconnect", () => {
            console.log("🔌 Phantom SDK Disconnected event");
            // Only update UI if NOT an intentional manual disconnect
            const isExplicit = sessionStorage.getItem('user_explicitly_disconnected') === 'true';
            if (!isExplicit) {
                setWalletState(false);
            }
        });
    }
    return phantomSDK;
}

window.getPhantomSDK = getPhantomSDK;

// ====================== LOAD LISTENER - SINGLE SOURCE OF TRUTH ======================
window.addEventListener('load', async () => {
    const urlParams = new URLSearchParams(window.location.search);

    // 1. Handle OAuth Handshake
    if (urlParams.get('code')) {
        console.log("⚠️ OAuth callback detected — Initializing SDK handshake");
        await getPhantomSDK();
        return; // The 'connect' listener in getPhantomSDK will handle the UI update
    }

    // 2. Memory Recall: Check Local Storage FIRST
    const savedAddr = localStorage.getItem('wallet_address');
    const savedMethod = localStorage.getItem('connection_method');

    if (savedAddr) {
        console.log(`🔄 Memory Recall: Restoring session for ${savedMethod}: ${savedAddr.slice(0, 6)}...`);

        // Immediate UI Update (Prevent flicker)
        setWalletState(true, savedAddr, savedMethod);
        if (typeof updateWalletBalances === 'function') updateWalletBalances();

        // Background Verification: Don't await this, just trigger it
        getPhantomSDK().then(sdk => {
            if (savedMethod === 'injected') {
                // For injected, verify trust without prompting
                const injected = window.phantom?.solana || window.solana;
                injected?.connect({ onlyIfTrusted: true }).catch(() => { });
            } else {
                sdk.autoConnect().catch(() => { });
            }
        });
        return;
    }

    // 3. First-time connection attempt (Injected)
    const injected = window.phantom?.solana || window.solana;
    if (injected?.isPhantom) {
        try {
            // Only attempt if not already explicitly disconnected/handled
            const resp = await injected.connect({ onlyIfTrusted: false });
            const addr = resp.publicKey.toString();

            clearEmbeddedMemory(true);
            setWalletState(true, addr, "injected");
            localStorage.setItem('wallet_address', addr);
            localStorage.setItem('connection_method', 'injected');
            console.log("✅ First-time injected connection established");
            return;
        } catch (e) {
            console.log("Injected connect attempt failed or dismissed");
        }
    }

    // 4. Final Fallback: Default to Disconnected
    setWalletState(false);
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

// ====================== QR / SCAN HELPER ======================
function scanQRCode() {
    const helper = document.getElementById('scan-helper');

    if (helper) {
        helper.classList.toggle('hidden');

        // Auto-hide after 4 seconds
        setTimeout(() => {
            if (helper) helper.classList.add('hidden');
        }, 4000);
    }

    // Optional: future real QR scan would go here
    console.log("📷 Scan & Send feature — coming soon");
}

// ====================== MODAL & REDEEM FUNCTIONS ======================
function openModal(modalId) {
    if (modalId === 'redeem') {
        document.getElementById('redeem-modal').style.display = 'flex';
        resetRedeemForm();
        populateRedeemAddress();        // Auto-populate + lock
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
    const btn = document.getElementById('redeem-submit-btn');

    if (input) input.value = '';
    if (msg) {
        msg.textContent = '';
        msg.style.color = '';
    }
    if (btn) {
        btn.classList.remove('success', 'failure');
        btn.textContent = 'REDEEM';
        btn.disabled = false;
    }
}

// ====================== SMART ADDRESS MODE (Locked by default) ======================
function populateRedeemAddress() {
    const input = document.getElementById('wallet-address');
    if (!input) return;

    const connectedAddr = window.connectedWallet || localStorage.getItem('wallet_address');

    if (connectedAddr) {
        input.value = connectedAddr;
        lockAddressField(input);
        console.log("✅ Auto-populated and LOCKED:", connectedAddr);
    } else {
        unlockAddressField(input);
    }
}

function lockAddressField(input) {
    input.readOnly = true;
    input.classList.add('locked-address');
    updateAddressModeUI(true);
}

function unlockAddressField(input) {
    input.readOnly = false;
    input.value = '';                    // Clear for safety
    input.classList.remove('locked-address');
    updateAddressModeUI(false);
}

function updateAddressModeUI(isLocked) {
    const link = document.getElementById('manual-address-link');
    if (!link) return;

    if (isLocked) {
        link.innerHTML = `✏️ <span>Use different address</span>`;
    } else {
        link.innerHTML = `➕ <span>Use connected wallet</span>`;
    }
}

window.toggleAddressMode = function () {
    const input = document.getElementById('wallet-address');
    if (!input) return;

    if (input.classList.contains('locked-address')) {
        // Locked → unlock for manual
        unlockAddressField(input);
    } else {
        // Unlocked → restore connected wallet
        const connectedAddr = window.connectedWallet || localStorage.getItem('wallet_address');
        if (connectedAddr) {
            input.value = connectedAddr;
            lockAddressField(input);
        } else {
            alert("No wallet is currently connected.");
        }
    }
};

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

// Get the best available signer for swaps (prioritizes window.solana for injected)
function getBestSigner() {
    // 1. Legacy injected (best for Phantom mobile app + extension)
    if (window.phantom?.solana) {
        console.log("✅ Using window.phantom.solana (injected priority)");
        return window.phantom.solana;
    }
    if (window.solana?.isPhantom) {
        console.log("✅ Using window.solana");
        return window.solana;
    }

    // 2. SDK fallback
    if (phantomSDK && phantomSDK.solana) {
        console.log("✅ Using SDK signer as fallback");
        return phantomSDK.solana;
    }

    console.warn("⚠️ No signer found");
    return null;
}

// ====================== PHANTOM WALLET INTEGRATION (SDK) ======================

// Main Wallet Dropdown (Add Wallet)
function toggleWalletDropdown() {
    const dropdown = document.getElementById('walletDropdown');
    const chevron = document.getElementById('chevron');
    if (dropdown) dropdown.classList.toggle('hidden');
    if (chevron) chevron.classList.toggle('rotate-180');
}

// ====================== CREATE / SIGN IN MODAL ======================

// Open Create/Sign In Modal
function openCreateSignInModal() {
    const dropdown = document.getElementById('walletDropdown');
    if (dropdown) dropdown.classList.add('hidden');

    const modal = document.getElementById('create-signin-modal');
    if (modal) modal.style.display = 'flex';
}

// Close Create/Sign In Modal
function closeCreateSignInModal() {
    const modal = document.getElementById('create-signin-modal');
    if (modal) modal.style.display = 'none';
}

// Google from Modal
function handleCreateWalletFromModal() {
    closeCreateSignInModal();
    handleCreateWallet();
}

// Apple from Modal
function handleAppleSignInFromModal() {
    closeCreateSignInModal();
    handleAppleSignIn();
}

// ====================== CLICK OUTSIDE HANDLER ======================

// Unified Click Outside Handler (only handles main wallet dropdown now)
document.addEventListener('click', (e) => {
    const addBtn = document.getElementById('addWalletBtn');
    const walletDropdown = document.getElementById('walletDropdown');

    // Close main wallet dropdown when clicking outside
    if (addBtn && walletDropdown &&
        !addBtn.contains(e.target) &&
        !walletDropdown.contains(e.target)) {

        walletDropdown.classList.add('hidden');
        const mainChevron = document.getElementById('chevron');
        if (mainChevron) mainChevron.classList.remove('rotate-180');
    }
});

// ====================== SHARE WALLET ADDRESS ======================
function initShareWalletButton() {
    const shareBtn = document.getElementById('shareWalletBtn');
    if (!shareBtn) return;

    shareBtn.addEventListener('click', async () => {
        const address = localStorage.getItem('wallet_address') || window.connectedWallet;
        if (!address) {
            alert("No wallet address found.");
            return;
        }

        const shareText = `My Giddy Key Wallet Address:\n${address}`;

        // Try native share first
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'My Giddy Key Wallet',
                    text: shareText
                });
                return;
            } catch (err) {
                console.log("Native share cancelled → clipboard fallback");
            }
        }

        // Silent clipboard fallback (checkmark only)
        try {
            await navigator.clipboard.writeText(address);

            const originalHTML = shareBtn.innerHTML;
            shareBtn.innerHTML = `<i class="fas fa-check text-sm text-emerald-400"></i>`;

            setTimeout(() => {
                shareBtn.innerHTML = originalHTML;
            }, 1600);

            console.log("✅ Address copied to clipboard");
        } catch (err) {
            console.error("Clipboard failed:", err);
            // No alert, completely silent
        }
    });
}

// ====================== STATE PROTECTION ======================
let lastFetchWallet = null;

// ====================== CONNECT PHANTOM (HYBRID - DESKTOP + iOS FALLBACK) ======================
// ====================== CONNECT BUTTON (Injected Priority + Embedded Toggle) ======================
async function handlePhantomConnect() {
    const dropdown = document.getElementById('walletDropdown');
    if (dropdown) dropdown.classList.add('hidden');

    const totalValueEl = document.getElementById('totalValue');
    if (totalValueEl) totalValueEl.textContent = 'Connecting...';

    if (window.__isConnecting) return;
    window.__isConnecting = true;

    try {
        // If already connected → treat as Disconnect (works for injected + Google/Apple)
        if (connectedWallet) {
            console.log("🔄 Already connected → Disconnecting");
            disconnectWallet();
            return;
        }

        // === INJECTED PRIORITY ===
        const injectedProvider = window.phantom?.solana || window.solana;
        if (injectedProvider && injectedProvider.isPhantom) {
            console.log("🔌 Using injected only");
            const resp = await injectedProvider.connect({ onlyIfTrusted: false });
            const publicKey = resp.publicKey.toString();

            clearEmbeddedMemory(true); // ← avoidSDKDisconnect = true (prevents unwanted "SDK Disconnected")
            setWalletState(true, publicKey, "injected");
            console.log("✅ Connected via injected");
            return;
        }

        // === FALLBACK: Mobile deep link or embedded reconnect from storage ===
        const stored = getValidEmbeddedSession();
        if (stored && (stored.method === "google" || stored.method === "apple")) {
            console.log(`🔄 Reconnecting stored ${stored.method} session`);
            const sdk = await getPhantomSDK();
            const result = await sdk.connect({ provider: stored.method });
            const addr = result.addresses?.[0]?.address;
            if (addr) {
                setWalletState(true, addr, stored.method);
                saveEmbeddedSession(addr, stored.method);
                return;
            }
        }

        // Final mobile deep link fallback
        if (isMobileDevice()) {
            console.log("📱 Deep link fallback");
            const encoded = encodeURIComponent(window.location.href);
            window.location.href = `https://phantom.app/ul/browse/${encoded}?ref=${encoded}`;
            return;
        }

        throw new Error("No Phantom provider found");

    } catch (err) {
        console.error("Connect failed:", err);
        alert(isMobileDevice()
            ? "Could not open Phantom. Make sure it is installed."
            : "Phantom connection failed.");
        showAddWalletPrompt();
    } finally {
        setTimeout(() => { window.__isConnecting = false; }, 1000);
    }
}

// ====================== HELPER: Clear URL Parameters ======================
function clearUrlParams() {
    const url = new URL(window.location.href);
    url.searchParams.delete('code');
    url.searchParams.delete('scope');
    url.searchParams.delete('state');
    url.searchParams.delete('phantom_callback');
    window.history.replaceState({}, document.title, url.toString());
}

// ====================== DEEP CLEAN FOR GOOGLE/APPLE ====================
function deepCleanEmbeddedSession() {
    console.log("🧹 Deep cleaning Google/Apple session...");

    const keysToClear = [
        'wallet_address',
        'connection_method',
        'phantom_auth_code',
        'google_auth',
        'apple_auth',
        'last_provider'
    ];

    keysToClear.forEach(key => localStorage.removeItem(key));

    Object.keys(localStorage).forEach(key => {
        if (key.toLowerCase().includes('phantom') ||
            key.toLowerCase().includes('oauth') ||
            key.toLowerCase().includes('auth') ||
            key.toLowerCase().includes('google') ||
            key.toLowerCase().includes('apple')) {
            localStorage.removeItem(key);
        }
    });
}

// ====================== DISCONNECT WALLET (Aggressive) ======================
function disconnectWallet() {
    // CRITICAL: Prevent the load listener from auto-reconnecting
    sessionStorage.setItem('user_explicitly_disconnected', 'true');

    const dropdown = document.getElementById('walletDropdown');
    if (dropdown) dropdown.classList.add('hidden');

    clearBalancesOnDisconnect();
    lastFetchWallet = null;

    const addrEl = document.getElementById('connectedAddress');
    if (addrEl) addrEl.innerText = '';

    const shopDot = document.getElementById('status-dot');
    const shopText = document.getElementById('status-text');
    if (shopDot) shopDot.style.backgroundColor = "#71717a";
    if (shopText) shopText.innerText = "Wallet Disconnected";

    // Force disconnect ALL providers
    if (phantomSDK) {
        try { phantomSDK.disconnect(); } catch (e) { }
    }
    if (window.phantom?.solana) {
        window.phantom.solana.disconnect().catch(() => { });
    }
    if (window.solana) {
        try { window.solana.disconnect(); } catch (e) { }
    }

    // Very aggressive localStorage cleanup
    try {
        localStorage.removeItem('wallet_address');
        localStorage.removeItem('connection_method');
        localStorage.removeItem('phantom_auth_code');

        Object.keys(localStorage).forEach(key => {
            const lower = key.toLowerCase();
            if (lower.includes('phantom') ||
                lower.includes('auth') ||
                lower.includes('google') ||
                lower.includes('apple') ||
                lower.includes('solana') ||
                lower.includes('oauth')) {
                localStorage.removeItem(key);
            }
        });
    } catch (e) { }

    setWalletState(false);
    connectionMethod = null;
    window.connectionMethod = null;

    console.log("✅ Disconnected — ALL state cleared (aggressive)");
}

/// ====================== CREATE WALLET (Google) ======================
async function handleCreateWallet() {
    const dropdown = document.getElementById('walletDropdown');
    if (dropdown) dropdown.classList.add('hidden');

    const totalValueEl = document.getElementById('totalValue');
    if (totalValueEl) totalValueEl.textContent = 'Google Sign in...';

    if (window.__isConnecting) return;
    window.__isConnecting = true;

    try {
        console.log("🚀 [Google] Forcing full disconnect before new auth...");

        await disconnectWallet();
        await new Promise(r => setTimeout(r, 700));

        const sdk = await getPhantomSDK();

        deepCleanEmbeddedSession();

        const { addresses } = await sdk.connect({
            provider: "google",
            authOptions: { force: true }
        });

        const publicKey = addresses?.[0]?.address;

        if (publicKey) {
            console.log("✅ [Google] Wallet address received:", publicKey);
            clearUrlParams();
            localStorage.setItem('wallet_address', publicKey);
            localStorage.setItem('connection_method', 'google');
            saveEmbeddedSession(publicKey, 'google');

            setWalletState(true, publicKey, "google");

            setTimeout(() => {
                if (typeof updateWalletBalances === 'function') updateWalletBalances();
            }, 800);
        } else {
            console.warn("⚠️ [Google] No address returned from SDK");
        }
    } catch (err) {
        console.error("❌ [Google] Create Wallet error:", err);
        alert("Google login failed or was cancelled.\n\nPlease try again.");
        if (typeof showAddWalletPrompt === 'function') showAddWalletPrompt();
    } finally {
        window.__isConnecting = false;
        if (totalValueEl && !connectedWallet) {
            totalValueEl.innerHTML = `<span class="text-purple-400">↖ Add Wallet</span>`;
        }
    }
}

// ====================== CREATE WALLET (Apple) ======================
async function handleAppleSignIn() {
    const dropdown = document.getElementById('walletDropdown');
    if (dropdown) dropdown.classList.add('hidden');

    const totalValueEl = document.getElementById('totalValue');
    if (totalValueEl) totalValueEl.textContent = 'Apple Sign in...';

    if (window.__isConnecting) return;
    window.__isConnecting = true;

    try {
        console.log("🚀 [Apple] Forcing full disconnect before new auth...");

        await disconnectWallet();
        await new Promise(r => setTimeout(r, 700));

        const sdk = await getPhantomSDK();

        deepCleanEmbeddedSession();

        if (sdk.isLoggedIn) {
            try {
                await sdk.disconnect();
                console.log("🧹 Force disconnected previous session");
            } catch (e) { }
        }

        const { addresses } = await sdk.connect({
            provider: "apple",
            authOptions: { force: true }
        });

        const publicKey = addresses?.[0]?.address;

        if (publicKey) {
            console.log("✅ [Apple] Wallet address received:", publicKey);
            clearUrlParams();
            localStorage.setItem('wallet_address', publicKey);
            localStorage.setItem('connection_method', 'apple');
            saveEmbeddedSession(publicKey, 'apple');

            setWalletState(true, publicKey, "apple");

            setTimeout(() => {
                if (typeof updateWalletBalances === 'function') updateWalletBalances();
            }, 800);
        } else {
            console.warn("⚠️ [Apple] No address returned from SDK");
        }
    } catch (err) {
        console.error("❌ [Apple] Sign-in error:", err);
        alert("Apple sign-in failed. Please ensure you are not logged into another Phantom session.");
        if (typeof showAddWalletPrompt === 'function') showAddWalletPrompt();
    } finally {
        window.__isConnecting = false;
        if (totalValueEl && !connectedWallet) {
            totalValueEl.innerHTML = `<span class="text-purple-400">↖ Add Wallet</span>`;
        }
    }
}

// ====================== BALANCES + TOTAL ======================
async function updateWalletBalances() {
    if (!connectedWallet) return;
    if (!document.getElementById('totalValue')) return;

    // Assign fetch ID to prevent leaks
    const fetchId = connectedWallet;
    lastFetchWallet = fetchId;

    const totalValueEl = document.getElementById('totalValue');
    if (totalValueEl && totalValueEl.textContent.includes('Add Wallet')) {
        totalValueEl.textContent = 'Calculating...';
    }

    const currencySpan = document.getElementById('totalCurrency');

    try {
        const response = await fetch(getApiUrl(`/api/balances/${connectedWallet}`));
        const balances = await response.json();

        // CHECK TOKEN: If wallet was switched during fetch, ignore result
        if (lastFetchWallet !== fetchId) return;

        const allTokens = ['SOL', 'USDC', 'EXPB', 'GIDDY', 'ONE', 'KIN', 'DOBBY', 'MYLO', 'DUNO', 'CPT', 'SINU'];
        let totalValueUSD = 0;

        allTokens.forEach(sym => {
            const qtyEl = document.getElementById(`qty-${sym}`);
            const valueEl = document.getElementById(`value-${sym}`);
            let rawQty = parseFloat(String(balances[sym] || 0).replace(/,/g, ''));

            const usdValue = rawQty * (latestPrices[sym] || 0);
            const displayValue = usdValue * getConversionRate(currentCurrency);
            const symbolChar = getCurrencySymbol(currentCurrency);

            if (qtyEl) {
                const communityTokens = ['ONE', 'KIN', 'DOBBY', 'MYLO', 'DUNO', 'CPT', 'SINU'];
                qtyEl.textContent = (communityTokens.includes(sym) && rawQty >= 1000) ? formatLargeNumber(rawQty) : (rawQty > 0 ? rawQty.toLocaleString() : "0");
            }
            if (valueEl) valueEl.innerHTML = `${symbolChar}${(displayValue).toFixed(2)}`;
            totalValueUSD += usdValue;
        });

        if (totalValueEl) {
            totalValueEl.textContent = `${getCurrencySymbol(currentCurrency)}${(totalValueUSD * getConversionRate(currentCurrency)).toFixed(2)}`;
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
    const rightImage = document.getElementById('right-panel-image');

    document.querySelectorAll('.lock-percent-btn, .switch-percent-btn').forEach(btn => btn.classList.remove('active'));
    lockSection.classList.remove('dimmed');
    switchSection.classList.remove('dimmed');

    if (mode === 'expb' || mode === 'dynamic') {
        currentLockToken = 'expb';
        lockSection.classList.remove('dimmed');
        switchSection.classList.add('dimmed');

        document.getElementById('lock-heading').textContent = "Lock Value";
        rightLabel.innerHTML = "LOCK QUANTITY";

        if (topHeading) topHeading.innerHTML = `Swap Bouncy Ball <span class="text-purple-400">⟶</span> GIDDY`;

        // Dynamic image for Bouncy Ball (lock)
        if (rightImage) rightImage.src = "assets/images/webp/duality-lock.webp";

        currentLockBaseQty = parseFloat(document.getElementById('qty-EXPB')?.textContent?.replace(/[^0-9.]/g, '') || '0');
        currentLockBaseValueUSD = parseFloat(document.getElementById('value-EXPB')?.textContent?.replace(/[^0-9.]/g, '') || '0')
            / getConversionRate(currentCurrency);

    } else if (mode === 'giddy') {
        currentLockToken = 'giddy';
        lockSection.classList.add('dimmed');
        switchSection.classList.remove('dimmed');

        document.getElementById('switch-heading').textContent = "Unlock Value";
        rightLabel.innerHTML = "UNLOCK QUANTITY";

        if (topHeading) topHeading.innerHTML = `Swap Giddy <span class="text-purple-400">⟶</span> BOUNCY BALL`;

        // Dynamic image for GIDDY (unlock)
        if (rightImage) rightImage.src = "assets/images/webp/duality-unlock.webp";

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

// ====================== SUCCESS MODAL FUNCTIONS ======================
function showRedeemSuccessModal(data) {
    const txHash = data.transaction_hash || "";
    const shortHash = txHash ? txHash.slice(0, 8) + "..." + txHash.slice(-6) : "";
    const solscanLink = txHash ? `https://solscan.io/tx/${txHash}` : "#";

    document.getElementById('redeem-result-details').innerHTML = `
        <div class="flex justify-between" style="color: var(--text-color);">
            <span style="color: var(--text-muted, #a1a1aa);">Amount</span>
            <span class="font-bold" style="color: var(--text-color);">${data.amount || "—"} ${data.token_name || ""}</span>
        </div>
        <div class="flex justify-between" style="color: var(--text-color);">
            <span style="color: var(--text-muted, #a1a1aa);">Model</span>
            <span class="font-medium" style="color: var(--text-color);">${data.model || "escrow"}</span>
        </div>
        <div class="flex justify-between items-center" style="color: var(--text-color);">
            <span style="color: var(--text-muted, #a1a1aa);">Transaction</span>
            <a href="${solscanLink}" target="_blank" class="font-mono text-emerald-400 hover:text-emerald-300 text-xs break-all" style="color: var(--accent-color, #4ade80);">
                ${shortHash || "—"}
            </a>
        </div>
    `;

    document.getElementById('redeem-solscan-link').href = solscanLink;

    const modal = document.getElementById('redeem-success-modal');
    modal.style.display = 'flex';
    modal.classList.add('show');
}

function closeRedeemSuccessModal() {
    const modal = document.getElementById('redeem-success-modal');
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

        const result = await performUltraSwap(inputMint, outputMint, rawAmount, getBestSigner(), connectedWallet);
        showTxSuccess(result);

        setTimeout(() => { if (connectedWallet) updateWalletBalances(); }, 1500);
    } catch (e) {
        console.log(`[Swap Status] ${e.message === "USER_REJECTED" ? "Swap cancelled" : "Swap failed"}`);

        if (e.message !== "USER_REJECTED") {
            console.error(e);
            alert(`❌ Swap failed: ${e.message}`);
        }
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

        const result = await performUltraSwap(inputMint, outputMint, rawAmount, getBestSigner(), connectedWallet);
        showTxSuccess(result);

        setTimeout(() => { if (connectedWallet) updateWalletBalances(); }, 2500);

    } catch (e) {
        console.log(`[Swap Status] ${e.message === "USER_REJECTED" ? "Swap cancelled" : "Swap failed"}`);

        if (e.message !== "USER_REJECTED") {
            console.error(e);
            alert(`❌ Swap failed: ${e.message}`);
        }
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

    // ====================== AUTO-RESUME OAUTH ======================
    async function initOAuthListener() {
        const urlParams = new URLSearchParams(window.location.search);
        const hasCode = urlParams.has('code');

        if (hasCode) {
            console.log("🔄 Callback detected, auto-triggering login...");
            await handleCreateWallet();
            return;
        }

        const sdk = await getPhantomSDK();

        sdk.on("connect", (data) => {
            console.log("✅ OAuth Handshake Complete");
            const addr = data.addresses?.[0]?.address;
            if (addr) setWalletState(true, addr, data.provider || "google");
        });

        if (sdk.isLoggedIn) {
            const addr = sdk.publicKey?.toBase58();
            const method = localStorage.getItem('connection_method') || 'injected';
            if (addr) {
                setWalletState(true, addr, method);
                return;
            }
        }
    }
    initOAuthListener();

    // ====================== SHARE WALLET BUTTON ======================
    initShareWalletButton();

    // 3. Keep cross-window communication
    window.addEventListener('message', async (event) => {
        if (event.data?.type === 'phantom-callback') {
            console.log("✅ Received phantom-callback message");
        }
    });

    // ====================== REDEEM FORM ======================
    const redeemForm = document.getElementById('redeem-form');

    if (redeemForm) {
        redeemForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const linkId = document.getElementById('redeem-input').value.trim();
            const destinationWallet = document.getElementById('wallet-address').value.trim();
            const messageDiv = document.getElementById('redeem-message');
            const mainBtn = document.getElementById('redeem-submit-btn');

            messageDiv.textContent = '';
            messageDiv.style.color = '#2ecc71';

            if (mainBtn) mainBtn.classList.remove('success', 'failure');

            if (!linkId) {
                messageDiv.textContent = 'Please enter a code.';
                messageDiv.style.color = '#e74c3c';
                if (mainBtn) mainBtn.classList.add('failure');
                return;
            }

            if (!/^\d{13}$/.test(linkId)) {
                messageDiv.textContent = 'Invalid code: Must be exactly 13 digits.';
                messageDiv.style.color = '#e74c3c';
                if (mainBtn) mainBtn.classList.add('failure');
                if (mainBtn) mainBtn.textContent = 'TRY AGAIN';
                return;
            }

            if (!destinationWallet) {
                messageDiv.textContent = 'Please enter or add a wallet address.';
                messageDiv.style.color = '#e74c3c';
                return;
            }

            if (!isValidSolanaAddress(destinationWallet)) {
                messageDiv.textContent = '❌ Invalid Solana address. Please check the format and try again.';
                messageDiv.style.color = '#e74c3c';
                if (mainBtn) mainBtn.classList.add('failure');
                return;
            }

            const originalText = mainBtn ? mainBtn.textContent : 'REDEEM';
            if (mainBtn) {
                mainBtn.textContent = 'Checking...';
                mainBtn.disabled = true;
            }

            const possibleUrls = [
                "https://giddy-key-swaps-production.up.railway.app/api/secure-redeem",
                "http://127.0.0.1:5000/api/secure-redeem",
                "http://localhost:5000/api/secure-redeem"
            ];

            let data = null;
            let lastError = null;

            for (const url of possibleUrls) {
                try {
                    console.log("🔄 Trying backend:", url);
                    const response = await fetch(url, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ linkId, destinationWallet })
                    });

                    data = await response.json();
                    console.log("✅ Success with:", url);
                    break;
                } catch (e) {
                    lastError = e;
                    console.log("❌ Failed:", url);
                }
            }

            if (!data) {
                messageDiv.style.color = '#e74c3c';
                messageDiv.textContent = "Network error: " + (lastError?.message || "All backends failed");
                if (mainBtn) {
                    mainBtn.textContent = originalText;
                    mainBtn.disabled = false;
                }
                return;
            }

            if (data.success) {
                showRedeemSuccessModal(data);
                if (mainBtn) {
                    mainBtn.textContent = originalText;
                    mainBtn.disabled = false;
                }
            } else {
                messageDiv.style.color = '#e74c3c';
                messageDiv.textContent = data.message || "Invalid, expired or used code. Check or try another.";
                if (mainBtn) {
                    mainBtn.textContent = originalText;
                    mainBtn.disabled = false;
                }
            }
        });
    }

    function isValidSolanaAddress(address) {
        if (!address || typeof address !== 'string') return false;
        if (address.length < 32 || address.length > 44) return false;

        const base58Regex = /^[1-9A-HJ-NP-Za-km-z]+$/;
        if (!base58Regex.test(address)) return false;

        try {
            if (typeof solanaWeb3 !== 'undefined' && solanaWeb3.PublicKey) {
                new solanaWeb3.PublicKey(address);
                return true;
            }
            return true;
        } catch (e) {
            return false;
        }
    }

    // ====================== REDEEM IN KINNECTED BUTTON ======================
    const kinnectedBtn = document.querySelector('button[onclick="redeemInKinnected()"]');

    if (kinnectedBtn) {
        kinnectedBtn.addEventListener('click', (e) => {
            e.preventDefault();

            const input = document.getElementById('redeem-input').value.trim();
            const messageDiv = document.getElementById('redeem-message');
            const button = kinnectedBtn;

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
                button.textContent = 'TRY AGAIN';
                return;
            }

            messageDiv.textContent = 'Validating code — redirecting to Kinnected!';
            messageDiv.style.color = '#2ecc71';
            button.textContent = 'Checking...';
            button.disabled = true;

            setTimeout(() => {
                window.location.href = `https://kinnected-links.com/k7m9x2qw8e4r5t6y/pay.html?id=${input}`;
            }, 800);
        });
    }

    // ====================== REFRESH REDEEM MODAL ======================
    window.refreshRedeemModal = function () {
        console.log("🔄 Full Refresh - Resetting all buttons...");

        const modal = document.getElementById('redeem-modal');
        if (modal) closeModal('redeem');

        setTimeout(() => {
            const mainBtn = document.getElementById('redeem-submit-btn');
            if (mainBtn) {
                mainBtn.textContent = 'REDEEM';
                mainBtn.disabled = false;
                mainBtn.classList.remove('success', 'failure');
            }

            const kinnectedBtn = document.querySelector('button[onclick="redeemInKinnected()"]');
            if (kinnectedBtn) {
                kinnectedBtn.textContent = 'Redeem in Kinnected';
                kinnectedBtn.disabled = false;
                kinnectedBtn.classList.remove('success', 'failure');
            }

            const messageDiv = document.getElementById('redeem-message');
            if (messageDiv) {
                messageDiv.textContent = '';
                messageDiv.style.color = '';
            }

            openModal('redeem');
            console.log("✅ Both buttons and modal fully reset");
        }, 250);
    };

    window.redeemInKinnected = function () {
        const btn = document.querySelector('button[onclick="redeemInKinnected()"]');
        if (btn) btn.click();
    };

    // ====================== ADD WALLET BUTTON LISTENER ======================
    const addBtn = document.getElementById('addWalletBtn');
    if (addBtn) {
        addBtn.addEventListener('click', toggleWalletDropdown);
    }

    // ====================== LEGACY PHANTOM INIT ======================
    if (provider && provider.isPhantom) {
        const wasDisconnected = localStorage.getItem('phantomWasDisconnected') === 'true';
        const hasConnectedBefore = sessionStorage.getItem('phantomHasConnected') === 'true';

        if (provider.isConnected && provider.publicKey) {
            setWalletState(true, provider.publicKey.toString(), "injected");
        }

        provider.on('connect', (publicKey) => {
            setWalletState(true, publicKey.toString(), "injected");
            sessionStorage.setItem('phantomHasConnected', 'true');
            localStorage.removeItem('phantomWasDisconnected');
        });

        provider.on('disconnect', () => {
            setWalletState(false);
            localStorage.setItem('phantomWasDisconnected', 'true');
        });

        if (!provider.isConnected) {
            if (!hasConnectedBefore && !wasDisconnected) {
                provider.connect({ onlyIfTrusted: false }).catch(() => { });
                sessionStorage.setItem('phantomHasConnected', 'true');
            } else {
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
window.handleAppleSignIn = handleAppleSignIn;
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

window.openCreateSignInModal = openCreateSignInModal;
window.closeCreateSignInModal = closeCreateSignInModal;
window.handleCreateWalletFromModal = handleCreateWalletFromModal;
window.handleAppleSignInFromModal = handleAppleSignInFromModal;

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
window.closeRedeemSuccessModal = closeRedeemSuccessModal;
window.scanQRCode = scanQRCode;

window.getPhantomSDK = getPhantomSDK;
window.isMobileDevice = isMobileDevice;