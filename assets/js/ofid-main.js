// GLOBAL: Status Message Logic (Massively-safe + Anchor Link Fix)
const observer = new MutationObserver(() => {
    const statusMessage = document.getElementById("statusMessage");
    const closeBtn = document.getElementById("statusClose");
    const optOutCheckbox = document.getElementById("statusOptOut");

    if (!statusMessage || !closeBtn || !optOutCheckbox) return;

    observer.disconnect();

    console.log("Status elements found — initializing…");

    // If user opted out, keep hidden
    if (localStorage.getItem("hideStatusMessage") === "true") {
        console.log("User opted out — keeping hidden");
        statusMessage.classList.add("hidden");
        return;
    }

    // === Smart Show Logic ===
    const showStatus = () => {
        statusMessage.classList.remove("hidden");
        statusMessage.classList.add("show");
        console.log("Status message shown");
    };

    // If page was loaded via anchor link (#something), show immediately
    if (window.location.hash) {
        console.log("Anchor link detected — showing status immediately");
        showStatus();
    } 
    // Normal page load — delayed show
    else {
        setTimeout(() => {
            console.log("Normal delayed show");
            showStatus();
        }, 750);   // 750ms is a good compromise
    }

    // Smooth hide on close
    closeBtn.addEventListener("click", () => {
        statusMessage.classList.remove("show");

        const onTransitionEnd = () => {
            statusMessage.classList.add("hidden");
            statusMessage.removeEventListener("transitionend", onTransitionEnd);
        };

        statusMessage.addEventListener("transitionend", onTransitionEnd);

        if (optOutCheckbox.checked) {
            localStorage.setItem("hideStatusMessage", "true");
        }
    });

    // Checkbox handler
    optOutCheckbox.addEventListener("change", (e) => {
        if (e.target.checked) {
            localStorage.setItem("hideStatusMessage", "true");
        } else {
            localStorage.removeItem("hideStatusMessage");
        }
    });
});

// Start observing for Massively's late DOM changes
observer.observe(document.documentElement, {
    childList: true,
    subtree: true
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