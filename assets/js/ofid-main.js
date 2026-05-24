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

// GLOBAL: STANDALONE MOBILE NAV PANEL
document.addEventListener('DOMContentLoaded', () => {
    const body = document.body;
    const nav = document.getElementById('nav');
    const trigger = document.getElementById('navPanelTrigger');

    if (!nav || !trigger) return;

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

    const toggleLi = document.createElement('li');
    toggleLi.className = 'dark-mode-item';
    toggleLi.innerHTML = `<a href="#" class="icon dark-mode-toggle"><i class="fas fa-sun fa-2x"></i></a>`;
    const customList = document.createElement('ul');
    customList.className = 'links';
    customList.appendChild(toggleLi);
    navPanelInner.appendChild(customList);

    toggleLi.querySelector('a').addEventListener('click', (e) => {
        e.preventDefault();
        body.classList.toggle('dark-mode');
    });

    const sections = [nav.querySelector('ul.links'), nav.querySelector('ul.top-icons'), nav.querySelector('ul.icons:not(.top-icons)'), nav.querySelector('ul.footer-links')];
    sections.forEach(s => { if (s) navPanelInner.appendChild(s.cloneNode(true)); });

    const closeNav = () => body.classList.remove('is-navPanel-visible');
    trigger.addEventListener('click', (e) => { e.preventDefault(); body.classList.add('is-navPanel-visible'); });
    closeBtn.addEventListener('click', (e) => { e.preventDefault(); closeNav(); });
    overlay.addEventListener('click', closeNav);

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