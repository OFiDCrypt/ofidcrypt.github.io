// GLOBAL: Status Message Logic (multi-message safe)
const observer = new MutationObserver(() => {
    const statusMessages = document.querySelectorAll(".status-message, .status-message-green");

    if (!statusMessages.length) return;

    observer.disconnect();

    console.log("Status messages found — initializing…");

    statusMessages.forEach((msg) => {
        const closeBtn = msg.querySelector(".status-close");
        const optOutCheckbox = msg.querySelector("input[type='checkbox']");

        // Only require close button — checkbox is optional
        if (!closeBtn) return;

        const hasCheckbox = !!optOutCheckbox;

        // Unique key per message (so each can be opted out independently)
        const storageKey = "hideStatusMessage_" + msg.classList[0];

        // If user opted out, keep hidden
        if (localStorage.getItem(storageKey) === "true") {
            msg.classList.add("hidden");
            return;
        }

        // === Smart Show Logic ===
        const showStatus = () => {
            msg.classList.remove("hidden");
            msg.classList.add("show");
        };

        if (window.location.hash) {
            showStatus();
        } else {
            setTimeout(showStatus, 750);
        }

        // Smooth hide on close
        closeBtn.addEventListener("click", () => {
            msg.classList.remove("show");

            const onTransitionEnd = () => {
                msg.classList.add("hidden");
                msg.removeEventListener("transitionend", onTransitionEnd);
            };

            msg.addEventListener("transitionend", onTransitionEnd);

            // Only store opt-out if checkbox exists
            if (hasCheckbox && optOutCheckbox.checked) {
                localStorage.setItem(storageKey, "true");
            }
        });

        // Checkbox handler (only if checkbox exists)
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

// Start observing for Massively's late DOM changes
observer.observe(document.documentElement, {
    childList: true,
    subtree: true
});

// GLOBAL: Dark Mode Toggle (Desktop + Mobile) with Centralized Logic and Custom Event
document.addEventListener('DOMContentLoaded', () => {
    console.log('Central dark mode initialized');

    // Core toggle function (shared)
    function toggleDarkMode() {
        const isDark = !document.body.classList.contains('dark-mode');
        document.body.classList.toggle('dark-mode', isDark);
        localStorage.setItem('dark-mode', isDark);

        updateAllIcons(isDark);

        // Trigger a custom event so page-specific code can react
        document.dispatchEvent(new CustomEvent('darkModeToggled', {
            detail: { isDark }
        }));

        console.log(`Mode switched to: ${isDark ? 'dark' : 'light'}`);
    }

    // Shared icon updater
    function updateAllIcons(isDark) {
        // Desktop custom site icon
        const desktopImg = document.querySelector('ul.icons li a img.custom-site-icon');
        if (desktopImg) {
            desktopImg.parentElement.classList.toggle('dark', isDark);
        }

        // Mobile sidebar toggles
        document.querySelectorAll('#navPanel .dark-mode-toggle i').forEach(i => {
            i.className = isDark ? 'fas fa-moon' : 'fas fa-sun';
        });
    }

    // Initial state
    const savedDark = localStorage.getItem('dark-mode') === 'true';
    if (savedDark) {
        document.body.classList.add('dark-mode');
    }
    updateAllIcons(savedDark);

    // Desktop toggle (top right icon)
    const desktopLink = document.querySelector('ul.icons li a[href="#"]');
    if (desktopLink) {
        desktopLink.addEventListener('click', e => {
            e.preventDefault();
            toggleDarkMode();
        });
    }

    // Mobile toggle – dynamically add to sidebar when navPanel appears
    const panelObserver = new MutationObserver(() => {
        const navPanelInner = document.querySelector('#navPanel nav');
        if (navPanelInner && !navPanelInner.querySelector('.dark-mode-toggle')) {
            const toggleLi = document.createElement('li');
            toggleLi.className = 'dark-mode-item';

            const toggleLink = document.createElement('a');
            toggleLink.href = '#';
            toggleLink.className = 'icon dark-mode-toggle';

            const icon = document.createElement('i');
            icon.className = savedDark ? 'fas fa-moon' : 'fas fa-sun';
            toggleLink.appendChild(icon);

            toggleLi.appendChild(toggleLink);
            navPanelInner.prepend(toggleLi);

            toggleLink.addEventListener('click', e => {
                e.preventDefault();
                toggleDarkMode();
            });

            toggleLink.addEventListener('touchstart', e => {
                e.preventDefault();
                toggleDarkMode();
            });

            console.log('Mobile dark mode toggle added to sidebar');
            panelObserver.disconnect();
        }
    });

    panelObserver.observe(document.body, {
        attributes: true,
        attributeFilter: ['class']
    });

    // Expose toggle function globally so 404.html can call it if needed
    window.toggleDarkMode = toggleDarkMode;
});

// GLOBAL: Ad-Scroll Container Carousel with Touch Gesture Handling
document.addEventListener('DOMContentLoaded', () => {
    const container = document.querySelector('.ad-scroll-container');
    const slides = document.querySelectorAll('.ad-slide');
    const totalSlides = slides.length;
    let autoScrollInterval;
    let currentIndex = 0; // Track current index globally

    // Exit if no slides
    if (totalSlides === 0) {
        console.warn('No slides found in .ad-scroll-container');
        return;
    }

    // Clone first slide for continuous loop
    const firstSlideClone = slides[0].cloneNode(true);
    container.appendChild(firstSlideClone);
    const allSlides = container.querySelectorAll('.ad-slide'); // Include clone

    // Force start on first slide
    function setInitialPosition() {
        container.scrollTo({ left: 0, behavior: 'instant' });
        currentIndex = 0; // Reset index
    }

    // Calculate slide width
    function getBoxWidth() {
        const slideWidth = slides[0].offsetWidth; // Actual slide width
        const slideMargin = window.innerWidth <= 480 ? 10 : 40; // 5px L+R mobile, 20px L+R desktop
        const totalWidth = slideWidth + slideMargin;
        console.log('Slide width:', slideWidth, 'Total width with margins:', totalWidth);
        return totalWidth;
    }

    // Auto-scroll function
    function startAutoScroll() {
        function resetAutoScroll() {
            if (autoScrollInterval) {
                clearInterval(autoScrollInterval);
            }
            autoScrollInterval = setInterval(() => {
                currentIndex++;
                console.log('Scrolling to index:', currentIndex);
                if (currentIndex >= totalSlides + 1) {
                    // Reached clone, reset to first slide instantly
                    container.scrollTo({ left: 0, behavior: 'instant' });
                    currentIndex = 1; // Start from second slide
                }
                container.scrollTo({
                    left: currentIndex * getBoxWidth(),
                    behavior: 'smooth'
                });
            }, 8000); // 8 seconds
        }

        // Start auto-scrolling
        resetAutoScroll();
    }

    // Handle touch gestures to allow taps and vertical scrolling, block horizontal swipes
    let touchStartX = 0;
    let touchStartY = 0;
    let touchMoved = false;

    container.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        touchMoved = false;
    }, { passive: true });

    container.addEventListener('touchmove', (e) => {
        const touchX = e.touches[0].clientX;
        const touchY = e.touches[0].clientY;
        const deltaX = Math.abs(touchX - touchStartX);
        const deltaY = Math.abs(touchY - touchStartY);

        // Block horizontal swipe (deltaX > 10, deltaY < 50)
        if (deltaX > 10 && deltaY < 50) {
            e.preventDefault(); // Block swipe
            touchMoved = true;
        }
        // Allow vertical scrolling (deltaY > 50)
        if (deltaY > 50) {
            touchMoved = true; // Mark as moved, but don't prevent default
        }
    }, { passive: false });

    container.addEventListener('touchend', (e) => {
        if (!touchMoved) {
            // Treat as tap, allow link click
            const touchEndX = e.changedTouches[0].clientX;
            const touchEndY = e.changedTouches[0].clientY;
            const deltaX = Math.abs(touchEndX - touchStartX);
            const deltaY = Math.abs(touchEndY - touchStartY);

            if (deltaX < 10 && deltaY < 10) {
                const target = e.target.closest('a');
                if (target && target.href) {
                    window.location.href = target.href; // Trigger link
                }
            }
        }
    }, { passive: true });

    // Prevent wheel scrolling within carousel
    container.addEventListener('wheel', (e) => e.preventDefault(), { passive: false });

    // Debounce resize handler, preserve current slide
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            // Restore current slide position instead of resetting
            container.scrollTo({
                left: currentIndex * getBoxWidth(),
                behavior: 'instant'
            });
            startAutoScroll();
        }, 100); // 100ms debounce
    });

    // Initialize
    setInitialPosition();
    startAutoScroll();
});