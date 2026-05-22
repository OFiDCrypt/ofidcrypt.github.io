// ================================================
// assets/js/webapp/shop.js
// ================================================

// ====================== YOUTUBE PLAYER SETUP ======================

// Load YouTube IFrame Player API asynchronously
var tag = document.createElement('script');
tag.src = "https://www.youtube.com/iframe_api";
var firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

// Global variable for the YouTube player
var player;

// Reusable END handler
function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.ENDED) {
        // Remove iframe completely
        const playerEl = document.getElementById('player');
        playerEl.innerHTML = "";
        playerEl.style.display = 'none';

        // Show poster
        const poster = document.getElementById('poster-image');
        if (poster) poster.style.display = 'block';
    }
}

// Called when YouTube API is loaded
function onYouTubeIframeAPIReady() {
    player = new YT.Player('player', {
        videoId: 'jbbqtuz0-zw', // Updated with your new video ID
        playerVars: {
            'playsinline': 1,
            'rel': 0,
            'controls': 1,
            'modestbranding': 1, // Removes the standard center overlay logo watermark
            'iv_load_policy': 3  // Disables interactive popups and video annotations completely
        },
        events: {
            'onReady': function (event) {
                // Sizing ratios are calculated dynamically by native CSS aspect ratio engines
            },
            'onStateChange': onPlayerStateChange
        }
    });
}

// Ensure poster properties sync up cleanly on initial page generation
document.addEventListener('DOMContentLoaded', function () {
    const posterImage = document.getElementById('poster-image');
    if (posterImage) {
        posterImage.style.display = 'none';
    }
});

// Replay handler — cleans layout parameters up and reconstructs player safely
document.getElementById('poster-image').addEventListener('click', function () {
    this.style.display = 'none';

    player = new YT.Player('player', {
        videoId: 'jbbqtuz0-zw', // Updated with your new video ID for replay functionality
        playerVars: {
            'playsinline': 1,
            'rel': 0,
            'controls': 1,
            'modestbranding': 1,
            'iv_load_policy': 3
        },
        events: { 'onStateChange': onPlayerStateChange }
    });

    document.getElementById('player').style.display = 'block';
});

// ================================================
// Checkout Modal Logic (Part of shop.js)
// ================================================

document.addEventListener('DOMContentLoaded', function () {
    
    // ====================== COUNTRY / PROVINCE DROPDOWN LOGIC ======================
    const countrySelect = document.getElementById('country-select');
    const provinceSelect = document.getElementById('province-select');

    if (!countrySelect || !provinceSelect) return;

    fetch('locations.json')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status} - Check if locations.json exists and path is correct`);
            }
            return response.json();
        })
        .then(data => {
            console.log("✅ locations.json loaded successfully!", data);
            window.locationData = data;        // Make it globally available

            // Set default to Canada
            countrySelect.value = 'CA';
            updateRegionDropdown();

            // Listen for country change
            countrySelect.addEventListener('change', updateRegionDropdown);
        })
        .catch(error => {
            console.error("❌ Failed to load locations.json:", error);
            provinceSelect.innerHTML = `<option>Error loading locations: ${error.message}</option>`;
        });

    function updateRegionDropdown() {
        const data = window.locationData;
        if (!data) return;

        const selectedCountry = countrySelect.value;
        provinceSelect.innerHTML = '';

        if (!data[selectedCountry]) {
            provinceSelect.innerHTML = '<option>No regions found</option>';
            return;
        }

        const countryConfig = data[selectedCountry];
        const optgroup = document.createElement('optgroup');
        optgroup.label = countryConfig.label;

        let defaultCode = null;

        countryConfig.regions.forEach(region => {
            const option = new Option(region.name, region.code);
            optgroup.appendChild(option);
            if (region.default) defaultCode = region.code;
        });

        provinceSelect.appendChild(optgroup);

        if (defaultCode) provinceSelect.value = defaultCode;
    }
});

// ================================================
// assets/js/webapp/shop.js - MAIN SHOP LOGIC
// ================================================

// Expose layout engines globally to support native HTML inline 'onclick' directives
let openCheckoutGateway;
let dismissCartBubble;
let showProfile;

document.addEventListener('DOMContentLoaded', function () {

    // ==================== PRODUCT DATA ====================
    const products = {
        1: {
            title: "Chapter Book: Giddy Tales",
            price: "$25.00 CAD / GIDDY",
            priceVal: 25.00,
            amazonUrl: "https://www.amazon.com/dp/YOUR_ASIN_1",
            fixedDesc: "A fun youth chapter book filled with Giddy's magical adventures. Perfect for ages 8-10. High-quality printing with illustrations. Includes a collectible card and secret code for an exclusive digital gift!",
            previews: [
                { src: "/assets/images/webp/products/product-chpt-bk-Ball-Wonders-8-10.webp", text: "Front cover — vibrant and eye-catching" },
                { src: "/assets/images/webp/products/product-chpt-bk-Ball-Wonders-8-10-02.webp", text: "Back cover with summary" },
                { src: "/assets/images/webp/products/product-chpt-bk-Ball-Wonders-8-10-03.webp", text: "Includes collectible card" }
            ]
        },
        2: {
            title: "Bouncy Balls: Space First Edition",
            price: "$15.00 CAD / GIDDY",
            priceVal: 15.00,
            amazonUrl: "https://www.amazon.com/dp/YOUR_ASIN_2",
            fixedDesc: "Signature limited-edition bouncy balls inspired by the cosmos. Durable, high-bounce, and glow-in-the-dark. Collect all designs!",
            previews: [
                { src: "/assets/images/webp/products/product-bb-st-e1.webp", text: "Space First Edition packaging" },
                { src: "/assets/images/300x300-solana.png", text: "Individual bouncy balls up close" }
            ]
        },
        3: {
            title: "Giddy Tee: Teleport",
            price: "$30.00 CAD / GIDDY",
            priceVal: 30.00,
            amazonUrl: "https://www.amazon.com/dp/YOUR_ASIN_3",
            fixedDesc: "Premium quality adult T-shirt featuring the 'Teleport' design. Super soft fabric, vibrant print.",
            previews: [
                { src: "/assets/images/webp/products/product-giddy-tee-teleport-1.webp", text: "Rear view — Teleport design" }
            ]
        },
        4: {
            title: "Colouring Book: Dinner Time",
            price: "$10.00 CAD / GIDDY",
            priceVal: 10.00,
            amazonUrl: "https://www.amazon.com/dp/YOUR_ASIN_4",
            fixedDesc: "Magical colouring book for ages 2-5. Comes with crayons and hidden codes for digital gifts!",
            previews: [
                { src: "/assets/images/webp/products/product-clr-bk-dinner-time-2-5.webp", text: "Front cover" }
            ]
        }
    };

    // ==================== STATE ====================
    let currentDistributorMode = "local";
    let currentPaymentMethod = 'fiat';
    let currentSelectedToken = 'eXPB';
    let cart = JSON.parse(localStorage.getItem('ofid_cart')) || [];
    let isBubbleDismissedManually = false;
    let isInitialPageLoad = true;

    showProfile = function () {
        alert("👤 Profile & Account features coming soon!");
    };

    // ==================== DISTRIBUTOR TOGGLE ====================
    const toggleBtn = document.getElementById('distributorToggleBtn');
    const dropdown = document.getElementById('distributorDropdown');
    const activeLineText = document.getElementById('selectedDistributorLine');

    if (toggleBtn) {
        toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
        });
    }

    document.querySelectorAll('.distributor-option').forEach(option => {
        option.addEventListener('click', function () {
            const val = this.getAttribute('data-value');
            currentDistributorMode = val;
            if (val === 'amazon') {
                activeLineText.style.color = '#ff9900';
                activeLineText.innerHTML = `<i class="fab fa-amazon"></i> Buy on Amazon`;
                document.querySelectorAll('.card-add-to-cart').forEach(b => b.style.display = 'none');
                document.querySelectorAll('.card-amazon-btn').forEach(b => b.style.display = 'block');
            } else {
                activeLineText.style.color = '#22c55e';
                activeLineText.innerHTML = `🏪 Buy Local with Credit / Debit / Tokens`;
                document.querySelectorAll('.card-add-to-cart').forEach(b => b.style.display = 'flex');
                document.querySelectorAll('.card-amazon-btn').forEach(b => b.style.display = 'none');
            }
            dropdown.style.display = 'none';
        });
    });

    document.addEventListener('click', () => { if (dropdown) dropdown.style.display = 'none'; });

    // ==================== CART FUNCTIONS ====================
    function saveCart() {
        localStorage.setItem('ofid_cart', JSON.stringify(cart));
        updateCartUI();
    }

    function addPromptToCart(productId, triggeringButton = null) {
        if (currentDistributorMode === 'amazon') {
            alert("🛒 Cart only works in Local mode.");
            if (dropdown) dropdown.style.display = 'block';
            return false;
        }
        const qty = parseInt(prompt("How many would you like to add?", "1"));
        if (!qty || qty <= 0) return false;

        const existing = cart.find(item => item.id === parseInt(productId));
        if (existing) existing.quantity += qty;
        else cart.push({ id: parseInt(productId), quantity: qty });

        isBubbleDismissedManually = false;
        saveCart();

        if (triggeringButton) {
            const original = triggeringButton.innerHTML;
            triggeringButton.innerHTML = `<i class="fas fa-check"></i> Added!`;
            triggeringButton.classList.add('success-state');
            setTimeout(() => {
                triggeringButton.innerHTML = original;
                triggeringButton.classList.remove('success-state');
            }, 1800);
        }
    }

    function removeCartItemElement(productId) {
        const id = parseInt(productId);
        const item = cart.find(i => i.id === id);
        if (!item) return;

        if (item.quantity > 1) {
            const removeQty = parseInt(prompt(`Remove how many? (current: ${item.quantity})`, "1"));
            if (!removeQty || removeQty <= 0) return;
            if (removeQty >= item.quantity) cart = cart.filter(i => i.id !== id);
            else item.quantity -= removeQty;
        } else {
            cart = cart.filter(i => i.id !== id);
        }
        saveCart();
        if (cart.length === 0) closeCheckoutGateway();
        else openCheckoutGateway();
    }

    // ==================== PAYMENT TILES ====================
    const fiatTile = document.getElementById('method-fiat');
    const cryptoTile = document.getElementById('method-crypto');

    const activeFiatLabel = document.getElementById('activeFiatLabel');
    const activeCryptoLabel = document.getElementById('activeCryptoLabel');

    function switchPaymentTile(tile) {
        fiatTile.classList.remove('active');
        cryptoTile.classList.remove('active');
        tile.classList.add('active');

        currentPaymentMethod = tile.id === 'method-fiat' ? 'fiat' : 'crypto';

        if (currentPaymentMethod === 'fiat') {
            currentSelectedToken = 'CAD';

            document.querySelectorAll('.token-item').forEach(item => {
                item.classList.remove('selected');
            });
        } else {
            currentSelectedToken = 'eXPB';

            document.querySelectorAll('.token-item').forEach(item => {
                if (item.getAttribute('data-token') === 'eXPB') {
                    item.classList.add('selected');
                } else {
                    item.classList.remove('selected');
                }
            });
        }

        if (currentPaymentMethod === 'fiat') {
            if (activeFiatLabel) activeFiatLabel.style.display = 'block';
            if (activeCryptoLabel) activeCryptoLabel.style.display = 'none';
        } else {
            if (activeFiatLabel) activeFiatLabel.style.display = 'none';
            if (activeCryptoLabel) activeCryptoLabel.style.display = 'block';
        }

        syncCheckoutLabels();
    }

    function syncCheckoutLabels() {
        const paymentEl = document.getElementById('checkoutPaymentMethod');
        const settlementEl = document.getElementById('checkoutSettlementCurrency');

        const summaryTokenQty = document.getElementById('summaryTokenQty');
        const summaryCadPrice = document.getElementById('summaryCadPrice');
        const priceRowLabel = summaryCadPrice ? summaryCadPrice.previousElementSibling : null;

        const activeFiatLabel = document.getElementById('activeFiatLabel');
        const activeCryptoLabel = document.getElementById('activeCryptoLabel');

        let cartTotalCAD = 0;
        if (typeof cart !== 'undefined' && Array.isArray(cart)) {
            cart.forEach(item => {
                const p = products[item.id];
                if (p) {
                    cartTotalCAD += p.priceVal * item.quantity;
                }
            });
        }

        if (currentPaymentMethod === 'fiat') {
            if (paymentEl) paymentEl.textContent = 'VISA / MASTERCARD';
            if (settlementEl) settlementEl.textContent = 'CAD';

            if (summaryTokenQty) summaryTokenQty.textContent = 'CAD';
            if (priceRowLabel) priceRowLabel.textContent = 'Base Asset Price';
            if (summaryCadPrice) summaryCadPrice.textContent = `$${cartTotalCAD.toFixed(2)} CAD`;

            if (activeFiatLabel) activeFiatLabel.style.display = 'block';
            if (activeCryptoLabel) activeCryptoLabel.style.display = 'none';
        } else {
            if (paymentEl) paymentEl.textContent = 'SOLANA NETWORK';
            if (settlementEl) settlementEl.textContent = currentSelectedToken;

            if (summaryTokenQty) summaryTokenQty.textContent = currentSelectedToken;
            if (priceRowLabel) priceRowLabel.textContent = `CAD / ${currentSelectedToken} Price`;

            if (activeFiatLabel) activeFiatLabel.style.display = 'none';
            if (activeCryptoLabel) activeCryptoLabel.style.display = 'block';

            if (activeCryptoLabel) {
                activeCryptoLabel.textContent = `Active Method: TOKENS / SOLANA (${currentSelectedToken})`;
            }
        }
    }

    if (fiatTile) fiatTile.addEventListener('click', () => switchPaymentTile(fiatTile));
    if (cryptoTile) cryptoTile.addEventListener('click', () => switchPaymentTile(cryptoTile));
    if (fiatTile) switchPaymentTile(fiatTile);

    // Token selection matrix changer
    document.querySelectorAll('.token-item').forEach(item => {
        item.addEventListener('click', function () {
            if (currentPaymentMethod === 'fiat') {
                if (cryptoTile && typeof switchPaymentTile === 'function') {
                    switchPaymentTile(cryptoTile);
                }
            }

            currentSelectedToken = this.getAttribute('data-token') || 'eXPB';

            if (typeof syncCheckoutLabels === 'function') syncCheckoutLabels();
            if (typeof updateCartUI === 'function') updateCartUI(true);

            document.querySelectorAll('.token-item').forEach(i => i.classList.remove('selected'));
            this.classList.add('selected');

            console.log(`Token directly selected & coupled: ${currentSelectedToken}`);
        });
    });

    // ==================== TOKEN DROPDOWN ====================
    const tokenListTitle = document.querySelector('.token-list-title');
    const tokenOptionsContainer = document.querySelector('.token-options');

    if (tokenListTitle && tokenOptionsContainer) {
        tokenListTitle.addEventListener('click', function () {
            if (currentPaymentMethod === 'fiat') {
                const cryptoTile = document.getElementById('method-crypto');
                if (cryptoTile && typeof switchPaymentTile === 'function') {
                    switchPaymentTile(cryptoTile);
                }
            }

            const arrowEl = this.querySelector('span:last-child');

            if (tokenOptionsContainer.style.display === 'flex') {
                tokenOptionsContainer.style.display = 'none';
                if (arrowEl) arrowEl.textContent = '▼';
            } else {
                tokenOptionsContainer.style.display = 'flex';
                if (arrowEl) arrowEl.textContent = '▲';
            }
        });
    }

    // ==================== CART UI ====================
    function updateCartUI(isSilent = false) {
        let totalItems = 0;
        let totalCAD = 0;

        cart.forEach(item => {
            totalItems += item.quantity;
            const p = products[item.id];
            if (p) totalCAD += p.priceVal * item.quantity;
        });

        const desktopBadge = document.getElementById('cartCountBadge');
        const mobileBadge = document.getElementById('mobileCartCountBadge');

        if (desktopBadge) {
            desktopBadge.textContent = totalItems;
            desktopBadge.classList.toggle('hidden', totalItems === 0);
        }
        if (mobileBadge) {
            mobileBadge.textContent = totalItems;
            mobileBadge.classList.toggle('hidden', totalItems === 0);
        }

        const bubble = document.getElementById('mobileCartBubble');
        const checkoutModal = document.getElementById('checkoutModal');
        const isModalOpen = checkoutModal && checkoutModal.style.display === 'block';

        if (bubble && totalItems > 0 && !isBubbleDismissedManually && !isInitialPageLoad && !isSilent && !isModalOpen) {
            bubble.classList.add('show-bubble');

            bubble.onclick = function () {
                if (typeof openCheckoutGateway === 'function') {
                    openCheckoutGateway();
                }
                isBubbleDismissedManually = true;
                this.classList.remove('show-bubble');
            };
        } else if (bubble) {
            bubble.classList.remove('show-bubble');
        }

        const summaryTokenQty = document.getElementById('summaryTokenQty');
        const summaryCadPrice = document.getElementById('summaryCadPrice');
        const summaryUsdPrice = document.getElementById('summaryUsdPrice');
        const priceRowLabel = summaryCadPrice ? summaryCadPrice.previousElementSibling : null;

        if (summaryTokenQty) summaryTokenQty.textContent = currentSelectedToken;
        if (summaryCadPrice) {
            if (currentPaymentMethod === 'fiat') {
                summaryCadPrice.textContent = `$${totalCAD.toFixed(2)} CAD`;
                if (priceRowLabel) priceRowLabel.textContent = 'Base Asset Price';
            } else {
                summaryCadPrice.textContent = `$${totalCAD.toFixed(2)} CAD`;
                if (priceRowLabel) priceRowLabel.textContent = `CAD / ${currentSelectedToken} Price`;
            }
        }
        if (summaryUsdPrice) {
            summaryUsdPrice.textContent = `$${(totalCAD * 0.73).toFixed(2)} USD`;
        }
    }

    dismissCartBubble = function () {
        isBubbleDismissedManually = true;
        document.getElementById('mobileCartBubble')?.classList.remove('show-bubble');
    };

    // ==================== CHECKOUT MODAL ====================
    openCheckoutGateway = function () {
        if (currentDistributorMode === 'amazon') {
            if (confirm("🛒 Cart only works in Local mode.\n\nSwitch to Local Mode?")) {
                currentDistributorMode = "local";
                activeLineText.style.color = '#22c55e';
                activeLineText.innerHTML = `🏪 Buy Local with Debit / Credit / Tokens`;
                document.querySelectorAll('.card-add-to-cart').forEach(b => b.style.display = 'flex');
                document.querySelectorAll('.card-amazon-btn').forEach(b => b.style.display = 'none');
                if (toggleBtn) toggleBtn.scrollIntoView({ behavior: "smooth", block: "center" });
                return;
            } else {
                return;
            }
        }

        if (cart.length === 0) return alert("Your cart is empty!");

        const itemsContainer = document.getElementById('checkoutModalItems');
        let html = '', total = 0;

        cart.forEach(item => {
            const p = products[item.id];
            if (!p) return;
            const lineTotal = p.priceVal * item.quantity;
            total += lineTotal;
            html += `
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
                    <div style="display:flex;align-items:center;gap:8px;">
                        <button class="checkout-del-btn" data-id="${item.id}" style="background: transparent; border: none; outline: none; box-shadow: none; padding: 0; margin: 0; color: #ef4444; cursor: pointer; font-size: 16px; transition: transform 0.2s; display: inline-flex; align-items:center; justify-content:center; vertical-align:middle;" onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'">🗑️</button>
                        <span><strong>${item.quantity}x</strong> ${p.title}</span>
                    </div>
                    <div>$${lineTotal.toFixed(2)} CAD</div>
                </div>`;
        });

        itemsContainer.innerHTML = html;
        document.getElementById('checkoutTotalCAD').textContent = `$${total.toFixed(2)} CAD`;

        itemsContainer.onclick = null;
        itemsContainer.onclick = function (e) {
            const delBtn = e.target.closest('.checkout-del-btn');
            if (!delBtn) return;

            e.preventDefault();
            e.stopPropagation();

            const idToRemove = delBtn.getAttribute('data-id');
            const itemIndex = cart.findIndex(item => item.id == idToRemove);

            if (itemIndex !== -1) {
                cart.splice(itemIndex, 1);
            }

            if (typeof updateCartUI === 'function') updateCartUI(true);

            if (cart.length === 0) {
                if (typeof closeCheckoutGateway === 'function') {
                    closeCheckoutGateway();
                } else {
                    document.getElementById('checkoutModal').style.display = 'none';
                    document.body.style.overflow = '';
                }
                alert("Your cart is empty!");
            } else {
                openCheckoutGateway();
            }
        };

        // Settlement Currency Selector
        let tokenArea = document.getElementById('checkoutModalTokenSelectorSpace');
        if (!tokenArea && itemsContainer) {
            tokenArea = document.createElement('div');
            tokenArea.id = 'checkoutModalTokenSelectorSpace';
            itemsContainer.parentNode.insertBefore(tokenArea, itemsContainer.nextSibling);
        }

        if (tokenArea) {
            if (currentPaymentMethod === 'fiat') {
                currentSelectedToken = 'CAD';

                tokenArea.innerHTML = `
            <hr style="border-color: rgba(167, 139, 250, 0.2); margin: 16px 0;">
            <div style="margin-bottom: 16px;">
                <label for="token-select" style="display: block; font-size: 13px; color: #a78bfa; margin-bottom: 6px; font-weight: 500;">Settlement Currency Token Type Selector:</label>
                <select id="token-select" disabled style="width: 100%; background: #110e2e; border: 1px solid #4c1d95; color: #888; padding: 10px 8px !important; line-height: 1.4; height: auto; min-height: 38px; box-sizing: border-box; outline: none; font-size: 14px; cursor: not-allowed; opacity: 0.6; vertical-align: middle;">
                    <option value="CAD" selected>CAD (Fiat Settlement Locked)</option>
                </select>
            </div>
        `;
            } else {
                tokenArea.innerHTML = `
            <hr style="border-color: rgba(167, 139, 250, 0.2); margin: 16px 0;">
            <div style="margin-bottom: 16px;">
                <label for="token-select" style="display: block; font-size: 13px; color: #a78bfa; margin-bottom: 6px; font-weight: 500;">Settlement Currency Token Type Selector:</label>
                <select id="token-select" style="width: 100%; background: #1e1b4b; border: 1px solid #4c1d95; color: #fff; padding: 10px 8px !important; border-radius: 6px; line-height: 1.4; height: auto; min-height: 38px; box-sizing: border-box; outline: none; font-size: 14px; cursor: pointer; vertical-align: middle;">
                    <option value="eXPB" ${currentSelectedToken === 'eXPB' ? 'selected' : ''}>$eXPB / Dynamic Discount / 15%</option>
                    <option value="GIDDY" ${currentSelectedToken === 'GIDDY' ? 'selected' : ''}>$GIDDY / Stable Dollar + Raffle</option>
                    <option value="SOL" ${currentSelectedToken === 'SOL' ? 'selected' : ''}>$SOL / Native Network Currency</option>
                    <option value="ONE" ${currentSelectedToken === 'ONE' ? 'selected' : ''}>$ONE</option>
                    <option value="KIN" ${currentSelectedToken === 'KIN' ? 'selected' : ''}>$KIN</option>
                    <option value="DOBBY" ${currentSelectedToken === 'DOBBY' ? 'selected' : ''}>$DOBBY</option>
                    <option value="DUNO" ${currentSelectedToken === 'DUNO' ? 'selected' : ''}>$DUNO</option>
                    <option value="MYLO" ${currentSelectedToken === 'MYLO' ? 'selected' : ''}>$MYLO</option>
                    <option value="CPT" ${currentSelectedToken === 'CPT' ? 'selected' : ''}>$CPT</option>
                    <option value="SINU" ${currentSelectedToken === 'SINU' ? 'selected' : ''}>$SINU</option>
                </select>
            </div>
        `;

                const select = tokenArea.querySelector('#token-select');
                if (select) {
                    select.addEventListener('change', function () {
                        currentSelectedToken = this.value;
                        const match = document.querySelector(`.token-item[data-token="${currentSelectedToken}"]`);
                        if (match) {
                            document.querySelectorAll('.token-item').forEach(i => i.classList.remove('selected'));
                            match.classList.add('selected');
                        }

                        const activeCryptoLabel = document.getElementById('activeCryptoLabel');
                        if (activeCryptoLabel) {
                            activeCryptoLabel.textContent = `Active Method: TOKENS / SOLANA (${currentSelectedToken})`;
                        }

                        syncCheckoutLabels();
                        updateCartUI();
                    });
                }
            }
        }

        syncCheckoutLabels();
        document.getElementById('checkoutModal').style.display = 'block';
        document.body.style.overflow = 'hidden';
    };

    function closeCheckoutGateway() {
        const modal = document.getElementById('checkoutModal');
        if (modal) modal.style.display = 'none';
        document.body.style.overflow = '';
        updateCartUI();
    }

    // Wire buttons
    document.getElementById('reviewCartBtn')?.addEventListener('click', openCheckoutGateway);
    document.getElementById('cartNavBtn')?.addEventListener('click', openCheckoutGateway);
    document.getElementById('closeCheckoutModal')?.addEventListener('click', closeCheckoutGateway);
    document.getElementById('clearCartBtn')?.addEventListener('click', () => {
        if (confirm("Empty cart?")) { cart = []; saveCart(); closeCheckoutGateway(); }
    });
    document.getElementById('gatewayProceedBtn')?.addEventListener('click', () => alert("Secure checkout coming soon!"));

    // ==================== PRODUCT PREVIEW MODAL + MAGNIFIER ====================
    const previewModal = document.getElementById('previewModal');
    const magnifier = document.getElementById('magnifier');

    function openPreviewModal(productId) {
        const product = products[productId];
        if (!product || !previewModal) return;

        const scrollArea = previewModal.querySelector('.image-scroll');
        if (scrollArea) {
            scrollArea.innerHTML = product.previews.map(p => `
                <div class="image-slide">
                    <img src="${p.src}" alt="${product.title}">
                    <div class="variable-text">${p.text}</div>
                </div>
            `).join('');
        }

        const fixedDesc = previewModal.querySelector('.fixed-desc');
        if (fixedDesc) {
            const action = currentDistributorMode === 'amazon' ?
                `<style>
                    .card-amazon-btn, .card-amazon-btn:visited, .card-amazon-btn:active, .card-amazon-btn:hover { 
                        color: #000000; text-decoration: none; border-bottom: 0; border: none; box-shadow: none; font-weight: bold; border-radius: 6px;
                    }
                </style>
                <a href="${product.amazonUrl}" target="_blank" class="cart-btn card-amazon-btn" style="display:block; width:100%; text-align:center; background:#ff9900; color:#000; text-decoration:none;"><i class="fab fa-amazon"></i> Buy on Amazon</a>` :
                `<button class="cart-btn modal-add-to-cart" data-id="${productId}" style="width:100%;">🛒 Add to Cart</button>`;

            fixedDesc.innerHTML = `<h2>${product.title}</h2><div class="price">${product.price}</div><p>${product.fixedDesc}</p>${action}`;

            fixedDesc.querySelector('.modal-add-to-cart')?.addEventListener('click', function () {
                addPromptToCart(this.getAttribute('data-id'), this);
            });
        }

        previewModal.style.display = 'block';
        document.body.style.overflow = 'hidden';
        setTimeout(initMagnifier, 100);
    }

    function closePreviewModal() {
        if (previewModal) previewModal.style.display = 'none';
        document.body.style.overflow = '';
        if (magnifier) magnifier.style.display = 'none';
    }

    previewModal?.querySelector('.close-modal')?.addEventListener('click', closePreviewModal);
    previewModal?.addEventListener('click', e => { if (e.target === previewModal) closePreviewModal(); });

    function initMagnifier() {
        if (!magnifier) return;
        previewModal.querySelectorAll('.image-slide img').forEach(img => {
            function handleMove(e) {
                if (e.type.startsWith('touch') && e.cancelable) e.preventDefault();

                const pointer = e.touches ? e.touches[0] : e;
                const rect = img.getBoundingClientRect();

                const x = pointer.clientX - rect.left;
                const y = pointer.clientY - rect.top;

                if (x < 0 || x > rect.width || y < 0 || y > rect.height) {
                    magnifier.style.display = 'none';
                    return;
                }

                magnifier.style.display = 'block';
                magnifier.style.left = `${pointer.clientX - 90}px`;
                magnifier.style.top = `${pointer.clientY - 90}px`;
                magnifier.style.backgroundImage = `url(${img.src})`;
                magnifier.style.backgroundPosition = `-${x * 5 - 90}px -${y * 5 - 90}px`;
                magnifier.style.backgroundSize = `${img.width * 5}px ${img.height * 5}px`;
            }

            function handleHide() {
                magnifier.style.display = 'none';
            }

            img.addEventListener('mousemove', handleMove);
            img.addEventListener('mouseleave', handleHide);

            img.addEventListener('touchstart', handleMove, { passive: false });
            img.addEventListener('touchmove', handleMove, { passive: false });
            img.addEventListener('touchend', handleHide);
            img.addEventListener('touchcancel', handleHide);
        });
    }

    // ==================== CARD HANDLERS ====================
    document.querySelectorAll('.shop-card').forEach(card => {
        card.addEventListener('click', function (e) {
            if (e.target.closest('.cart-btn') || e.target.closest('a')) return;
            const id = this.getAttribute('data-product-id');
            if (id) openPreviewModal(id);
        });

        const addBtn = card.querySelector('.card-add-to-cart');
        if (addBtn) addBtn.addEventListener('click', e => {
            e.stopPropagation();
            addPromptToCart(card.getAttribute('data-product-id'), addBtn);
        });

        const amzBtn = card.querySelector('.card-amazon-btn');
        if (amzBtn) amzBtn.addEventListener('click', e => e.stopPropagation());
    });

    // Keyboard Escape
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            closePreviewModal();
            closeCheckoutGateway();
        }
    });

    updateCartUI();
    isInitialPageLoad = false;
});