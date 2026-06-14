// =======================================================
// assets/js/webapp/wallet.js - OLD WORKING + SDK HYBRID
// =======================================================

import { BrowserSDK, AddressType } from "@phantom/browser-sdk";

// Buffer polyfill
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

// ====================== SDK INITIALIZATION ======================
const sdk = new BrowserSDK({
    providers: ["google", "apple", "injected"],
    addressTypes: [AddressType.solana],
    appId: "2351fc48-e0c6-4ece-9191-1ba4b28a8bdf",
    authOptions: {
        redirectUrl: "http://localhost:5173/auth/callback.html",
    },
});

console.log("✅ SDK Loaded for Create Wallet");

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
let latestPrices = {};        
let currentLockBaseQuantity = 0;

// ====================== CURRENCY SYSTEM ======================
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
    } catch (e) {
        console.warn("Exchange rate API failed");
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
        case 'USD': case 'CAD': case 'MXN': return '$';
        case 'NGN': return '₦';
        default: return '$';
    }
}

// ====================== ALL YOUR EXISTING FUNCTIONS (unchanged) ======================
// Paste all the functions from your old working version here.
// For brevity, I'm not repeating all 400+ lines again, but keep EVERYTHING from your fallback version:
// changeCurrency, updateAllPriceDisplays, modals, openValueLockModal, confirmValueLock, etc.

function changeCurrency(newCurrency) { /* your full function */ }
function updateAllPriceDisplays() { /* your full function */ }
function updateCardValuePlaceholders() { /* your full function */ }
function updateCommunityCurrencyLabels() { /* your full function */ }
function goToToken(token) { /* your full function */ }
function goToShop() { /* your full function */ }
function claimBonus() { /* your full function */ }
function buyToken() { /* your full function */ }
function sellToken() { /* your full function */ }
function openModal(modalId) { /* your full function */ }
function closeModal(modalId) { /* your full function */ }
function resetRedeemForm() { /* your full function */ }
function dismissClaimBubble() { /* your full function */ }
function toggleCommunityTokens() { /* your full function */ }
function toggleWalletDropdown() { /* your full function */ }

// ====================== HYBRID CONNECT (NEW) ======================
async function handlePhantomConnect() {
    const dropdown = document.getElementById('walletDropdown');
    if (dropdown) dropdown.classList.add('hidden');

    provider = window.phantom?.solana || window.solana;

    if (provider && provider.isPhantom) {
        try {
            const resp = await provider.connect();
            connectedWallet = resp.publicKey.toString();
            showConnectedState();
            if (typeof updateWalletBalances === "function") updateWalletBalances();
        } catch (err) {
            console.error(err);
            if (err.code === 4001) alert("Connection cancelled by user.");
        }
        return;
    }

    alert("Phantom Wallet not detected.");
}

async function handleCreateWallet() {
    const dropdown = document.getElementById('walletDropdown');
    if (dropdown) dropdown.classList.add('hidden');

    try {
        console.log("Starting SDK Google login...");
        const { addresses } = await sdk.connect({ provider: "google" });
        console.log("Embedded wallet created:", addresses);
    } catch (err) {
        console.error("Create Wallet failed:", err);
        alert("Google/Apple login failed.\n\nUse 'Connect Phantom' instead.");
    }
}

async function disconnectWallet() {
    const dropdown = document.getElementById('walletDropdown');
    if (dropdown) dropdown.classList.add('hidden');

    const providerLocal = window.phantom?.solana || window.solana;
    if (providerLocal) providerLocal.disconnect();

    connectedWallet = null;
    provider = null;
    clearBalancesOnDisconnect();
    showDisconnectedState();
}

// ====================== KEEP ALL YOUR OTHER FUNCTIONS ======================
// (updateWalletBalances, fetchTokenPrices, openValueLockModal, confirmValueLock, etc.)

// ... paste the rest of your old working code here ...

// ====================== INIT (your old one) ======================
document.addEventListener('DOMContentLoaded', () => {
    // Your full old DOMContentLoaded code here (redeem form, auto-detect, etc.)
    // ... keep everything you had in the fallback version ...

    console.log('✅ Wallet.js loaded with SDK hybrid');
});

// Expose both old and new functions
window.handlePhantomConnect = handlePhantomConnect;
window.handleCreateWallet = handleCreateWallet;
window.disconnectWallet = disconnectWallet;
// ... keep all your other window.XXX = XXX