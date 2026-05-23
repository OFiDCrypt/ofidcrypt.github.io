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

// Start observing
observer.observe(document.documentElement, {
    childList: true,
    subtree: true
});

// GLOBAL: Dark Mode Toggle (Desktop + Mobile)
document.addEventListener('DOMContentLoaded', () => {
    console.log('Central dark mode initialized');

    function toggleDarkMode() {
        const isDark = !document.body.classList.contains('dark-mode');
        document.body.classList.toggle('dark-mode', isDark);
        localStorage.setItem('dark-mode', isDark);

        updateAllIcons(isDark);

        document.dispatchEvent(new CustomEvent('darkModeToggled', {
            detail: { isDark }
        }));

        console.log(`Mode switched to: ${isDark ? 'dark' : 'light'}`);
    }

    function updateAllIcons(isDark) {
        const desktopImg = document.querySelector('ul.icons li a img.custom-site-icon');
        if (desktopImg) {
            desktopImg.parentElement.classList.toggle('dark', isDark);
        }

        document.querySelectorAll('#navPanel .dark-mode-toggle i').forEach(i => {
            i.className = isDark ? 'fas fa-moon' : 'fas fa-sun';
        });
    }

    const savedDark = localStorage.getItem('dark-mode') === 'true';
    if (savedDark) {
        document.body.classList.add('dark-mode');
    }
    updateAllIcons(savedDark);

    const desktopLink = document.querySelector('ul.icons li a[href="#"]');
    if (desktopLink) {
        desktopLink.addEventListener('click', e => {
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

// ====================== STANDALONE MOBILE NAV PANEL (Fixed) ======================
document.addEventListener('DOMContentLoaded', () => {
    const body = document.body;
    const nav = document.getElementById('nav');
    const trigger = document.getElementById('navPanelTrigger');

    if (!nav || !trigger) {
        console.warn('Mobile nav elements not found');
        return;
    }

    // Remove any existing panel
    let existing = document.getElementById('navPanel');
    if (existing) existing.remove();

    // Create panel with SINGLE close button
    const navPanel = document.createElement('div');
    navPanel.id = 'navPanel';
    navPanel.innerHTML = `
        <nav></nav>
        <a href="#" class="close"></a>
    `;
    body.appendChild(navPanel);

    const navPanelInner = navPanel.querySelector('nav');
    const closeBtn = navPanel.querySelector('.close');

    // Clone sections while preserving original classes for styling
    const sections = [
        nav.querySelector('ul.links'),
        nav.querySelector('ul.top-icons'),
        nav.querySelector('ul.icons:not(.top-icons)'),
        nav.querySelector('ul.footer-links')
    ];

    sections.forEach(section => {
        if (section) {
            const clone = section.cloneNode(true);
            // Ensure social icons keep their styling classes
            if (section.classList.contains('icons')) {
                clone.classList.add('icons');
            }
            navPanelInner.appendChild(clone);
        }
    });

    // Add Dark Mode Toggle
    const toggleLi = document.createElement('li');
    toggleLi.className = 'dark-mode-item';
    toggleLi.innerHTML = `
        <a href="#" class="icon dark-mode-toggle">
            <i class="fas fa-sun"></i>
        </a>
    `;
    navPanelInner.prepend(toggleLi);

    toggleLi.querySelector('a').addEventListener('click', (e) => {
        e.preventDefault();
        window.toggleDarkMode();
    });

    function toggleNavPanel() {
        body.classList.toggle('is-navPanel-visible');
    }

    trigger.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopImmediatePropagation();
        toggleNavPanel();
    });

    closeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        body.classList.remove('is-navPanel-visible');
    });

    navPanel.addEventListener('click', (e) => {
        if (e.target === navPanel) {
            body.classList.remove('is-navPanel-visible');
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === "Escape" && body.classList.contains('is-navPanel-visible')) {
            body.classList.remove('is-navPanel-visible');
        }
    });

    window.addEventListener('resize', () => {
        if (window.innerWidth > 980) {
            body.classList.remove('is-navPanel-visible');
        }
    });

    console.log('✅ Mobile Nav Panel fixed (single close + restored social borders)');
});