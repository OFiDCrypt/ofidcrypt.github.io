// GLOBAL: Scroll-To Logic (Handles data-scroll attributes)
document.addEventListener('DOMContentLoaded', () => {
    document.body.addEventListener('click', function (e) {
        const button = e.target.closest('[data-scroll]');
        if (button) {
            const targetId = button.getAttribute('data-scroll');
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
    });
});

// GLOBAL: Scroll-To Logic (Handles data-scroll attributes)
document.addEventListener('DOMContentLoaded', () => {
    document.body.addEventListener('click', function (e) {
        const button = e.target.closest('[data-scroll]');
        if (button) {
            const targetId = button.getAttribute('data-scroll');
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
    });
});

// GLOBAL: Status Message Logic (multi-message safe)
const observer = new MutationObserver(() => {
    const statusMessages = document.querySelectorAll(".status-message, .status-message-green");

    if (!statusMessages.length) return;

    observer.disconnect();

    console.log("Status messages found — initializing…");

    statusMessages.forEach((msg) => {
        const closeBtn = msg.querySelector(".status-close");
        const optOutCheckbox = msg.querySelector("input[type='checkbox']");

        if (!closeBtn) return;

        const hasCheckbox = !!optOutCheckbox;
        const storageKey = "hideStatusMessage_" + msg.classList[0];

        if (localStorage.getItem(storageKey) === "true") {
            msg.classList.add("hidden");
            return;
        }

        const showStatus = () => {
            msg.classList.remove("hidden");
            msg.classList.add("show");
        };

        if (window.location.hash) {
            showStatus();
        } else {
            setTimeout(showStatus, 750);
        }

        closeBtn.addEventListener("click", () => {
            msg.classList.remove("show");

            const onTransitionEnd = () => {
                msg.classList.add("hidden");
                msg.removeEventListener("transitionend", onTransitionEnd);
            };

            msg.addEventListener("transitionend", onTransitionEnd);

            if (hasCheckbox && optOutCheckbox.checked) {
                localStorage.setItem(storageKey, "true");
            }
        });

        if (hasCheckbox) {
            optOutCheckbox.addEventListener("change", (e) => {
                if (e.target.checked) {
                    localStorage.setItem(storageKey, "true");
                } else {
                    localStorage.removeItem(storageKey);
                }
            });
        }
    });
});

// GLOBAL: Profile Function (placeholder until implemented)
if (typeof window.showProfile === 'undefined') {
    window.showProfile = function () {
        alert("👤 Profile & Account features coming soon!");
    };
}

// Start observing
observer.observe(document.documentElement, {
    childList: true,
    subtree: true
});

// ====================== FIXED DARK MODE v2 - ICON TIMING FIXED ======================
document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ Dark mode initialized (icon timing fixed)');

    const body = document.body;

    function toggleDarkMode() {
        const isDark = !body.classList.contains('dark-mode');
        body.classList.toggle('dark-mode', isDark);
        localStorage.setItem('dark-mode', isDark);

        updateAllIcons(isDark);
        console.log(`🌗 Mode switched to: ${isDark ? 'dark' : 'light'}`);
    }

    function updateAllIcons(isDark) {
        // Desktop SVG
        const desktopImg = document.querySelector('ul.icons li.top-toggle a img.custom-site-icon');
        if (desktopImg) {
            desktopImg.parentElement.classList.toggle('dark', isDark);
        }

        // Main FA toggle
        const faToggle = document.getElementById('darkModeToggle');
        if (faToggle) {
            const icon = faToggle.querySelector('i');
            if (icon) icon.className = isDark ? 'fas fa-moon' : 'fas fa-sun';
        }

        // Mobile nav panel toggle
        document.querySelectorAll('#navPanel .dark-mode-toggle i').forEach(i => {
            i.className = isDark ? 'fas fa-moon' : 'fas fa-sun';
        });
    }

    // Load saved theme
    const savedDark = localStorage.getItem('dark-mode') === 'true';
    if (savedDark) {
        body.classList.add('dark-mode');
    }

    // Update immediately + delayed retry (fixes timing issue)
    updateAllIcons(savedDark);
    
    // Extra safety: re-check after a tiny delay and when panel is created
    setTimeout(() => updateAllIcons(savedDark), 300);
    setTimeout(() => updateAllIcons(savedDark), 800);

    // Desktop toggle
    const desktopLink = document.querySelector('ul.icons li.top-toggle a');
    if (desktopLink) {
        desktopLink.addEventListener('click', e => {
            e.preventDefault();
            toggleDarkMode();
        });
    }

    // Main FA toggle
    const faMain = document.getElementById('darkModeToggle');
    if (faMain) {
        faMain.addEventListener('click', e => {
            e.preventDefault();
            toggleDarkMode();
        });
    }

    window.toggleDarkMode = toggleDarkMode;
});

// GLOBAL: Ad-Scroll Container Carousel
document.addEventListener('DOMContentLoaded', () => {
    const container = document.querySelector('.ad-scroll-container');
    const slides = document.querySelectorAll('.ad-slide');
    const totalSlides = slides.length;
    let autoScrollInterval;
    let currentIndex = 0;

    if (totalSlides === 0) return;

    const firstSlideClone = slides[0].cloneNode(true);
    container.appendChild(firstSlideClone);

    function setInitialPosition() {
        container.scrollTo({ left: 0, behavior: 'instant' });
        currentIndex = 0;
    }

    function getBoxWidth() {
        const slideWidth = slides[0].offsetWidth;
        const slideMargin = window.innerWidth <= 480 ? 10 : 40;
        return slideWidth + slideMargin;
    }

    function startAutoScroll() {
        if (autoScrollInterval) clearInterval(autoScrollInterval);
        autoScrollInterval = setInterval(() => {
            currentIndex++;
            if (currentIndex >= totalSlides + 1) {
                container.scrollTo({ left: 0, behavior: 'instant' });
                currentIndex = 1;
            }
            container.scrollTo({
                left: currentIndex * getBoxWidth(),
                behavior: 'smooth'
            });
        }, 8000);
    }

    let touchStartX = 0, touchStartY = 0, touchMoved = false;

    container.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        touchMoved = false;
    }, { passive: true });

    container.addEventListener('touchmove', (e) => {
        const deltaX = Math.abs(e.touches[0].clientX - touchStartX);
        const deltaY = Math.abs(e.touches[0].clientY - touchStartY);

        if (deltaX > 10 && deltaY < 50) {
            e.preventDefault();
            touchMoved = true;
        }
    }, { passive: false });

    container.addEventListener('touchend', (e) => {
        if (!touchMoved) {
            const deltaX = Math.abs(e.changedTouches[0].clientX - touchStartX);
            const deltaY = Math.abs(e.changedTouches[0].clientY - touchStartY);
            if (deltaX < 10 && deltaY < 10) {
                const target = e.target.closest('a');
                if (target && target.href) window.location.href = target.href;
            }
        }
    }, { passive: true });

    container.addEventListener('wheel', (e) => e.preventDefault(), { passive: false });

    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            container.scrollTo({ left: currentIndex * getBoxWidth(), behavior: 'instant' });
            startAutoScroll();
        }, 100);
    });

    setInitialPosition();
    startAutoScroll();
});

// ====================== STANDALONE MOBILE NAV PANEL (Updated) ======================
document.addEventListener('DOMContentLoaded', () => {
    const body = document.body;
    const nav = document.getElementById('nav');
    const trigger = document.getElementById('navPanelTrigger');

    if (!nav || !trigger) return;

    // Create/Reuse Panel and Overlay
    let navPanel = document.getElementById('navPanel') || (function() {
        const div = document.createElement('div');
        div.id = 'navPanel';
        div.innerHTML = `<nav></nav><a href="#" class="close"></a>`;
        body.appendChild(div);
        return div;
    })();
    
    let overlay = document.getElementById('navPanelOverlay') || (function() {
        const div = document.createElement('div');
        div.id = 'navPanelOverlay';
        body.appendChild(div);
        return div;
    })();

    const navPanelInner = navPanel.querySelector('nav');
    const closeBtn = navPanel.querySelector('.close');

    // Add Dark Mode Toggle in Mobile Panel
    const toggleLi = document.createElement('li');
    toggleLi.className = 'dark-mode-item';
    toggleLi.innerHTML = `<a href="#" class="icon dark-mode-toggle"><i class="fas fa-sun fa-2x"></i></a>`;
    const customList = document.createElement('ul');
    customList.className = 'links';
    customList.appendChild(toggleLi);
    navPanelInner.appendChild(customList);

    // Use the global toggle function (much cleaner)
    toggleLi.querySelector('a').addEventListener('click', (e) => {
        e.preventDefault();
        if (window.toggleDarkMode) {
            window.toggleDarkMode();
        } else {
            // fallback
            body.classList.toggle('dark-mode');
        }
    });

    // Clone sections
    const sections = [
        nav.querySelector('ul.links'),
        nav.querySelector('ul.top-icons'),
        nav.querySelector('ul.icons:not(.top-icons)'),
        nav.querySelector('ul.footer-links')
    ];
    sections.forEach(s => { if (s) navPanelInner.appendChild(s.cloneNode(true)); });

    // Close logic
    const closeNav = () => body.classList.remove('is-navPanel-visible');
    trigger.addEventListener('click', (e) => { e.preventDefault(); body.classList.add('is-navPanel-visible'); });
    closeBtn.addEventListener('click', (e) => { e.preventDefault(); closeNav(); });
    overlay.addEventListener('click', closeNav);

    // Link handling
    navPanel.addEventListener('click', (e) => {
        const link = e.target.closest('a');
        if (!link) return;

        const href = link.getAttribute('href');

        if (href && href.startsWith('#') && href.length > 1) {
            e.preventDefault();
            const target = document.querySelector(href);
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
                setTimeout(closeNav, 400);
            }
        }
    });
});

// ====================== GLOBAL REDEEM HANDLER (Shared across wallet + redeem.html) ======================

/**
 * performRedeem - Reusable redemption function
 * @param {string} linkId - 13-digit code
 * @param {string} destinationWallet - Solana wallet address
 * @param {object} options - onSuccess, onError, loadingText, etc.
 */
window.performRedeem = async function(linkId, destinationWallet, options = {}) {
    const {
        onSuccess = null,
        onError = null,
        loadingText = "Redeeming...",
        successMessage = "Redirecting to Kinnected..."
    } = options;

    if (!linkId || !destinationWallet) {
        const msg = "⚠️ Please fill in both fields.";
        if (onError) onError(msg);
        return { success: false, message: msg };
    }

    // Try Railway first, then localhost
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
        const msg = "Network error: " + (lastError?.message || "All backends failed");
        if (onError) onError(msg);
        return { success: false, message: msg };
    }

    if (data.success) {
        if (onSuccess) onSuccess(data);
    } else {
        if (onError) onError(data.message || "Redemption failed");
    }

    return data;
};

// ====================== WALLET MODAL REDEEM IN KINNECTED BUTTON ======================
document.addEventListener('DOMContentLoaded', () => {
    const kinnectedBtn = document.querySelector('button[onclick="redeemInKinnected()"]');

    if (kinnectedBtn) {
        kinnectedBtn.addEventListener('click', async (e) => {
            e.preventDefault();

            const linkId = document.getElementById('redeem-input').value.trim();
            const destinationWallet = document.getElementById('wallet-address').value.trim();
            const messageDiv = document.getElementById('redeem-message');

            // Reset
            messageDiv.textContent = '';
            messageDiv.style.color = '';

            const result = await window.performRedeem(linkId, destinationWallet, {
                loadingText: "Checking...",
                onSuccess: (data) => {
                    messageDiv.style.color = '#2ecc71';
                    messageDiv.textContent = 'Success! Redirecting...';
                    
                    setTimeout(() => {
                        window.location.href = `https://kinnected-links.com/k7m9x2qw8e4r5t6y/pay.html?id=${linkId}`;
                    }, 800);
                },
                onError: (msg) => {
                    messageDiv.style.color = '#e74c3c';
                    messageDiv.textContent = msg;
                }
            });
        });
    }
});