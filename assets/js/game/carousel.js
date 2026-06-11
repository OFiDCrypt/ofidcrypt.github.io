// ================================================
// assets/js/game/carousel.js
// Bottom Banner Auto-Scrolling Carousel
// ================================================

document.addEventListener('DOMContentLoaded', () => {

    // Only run on mobile / PWA
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const isPWA = window.matchMedia('(display-mode: standalone)').matches || 
                  window.navigator.standalone === true;

    if (!isMobile && !isPWA) return;

    const container = document.querySelector('#bottom-banner .ad-scroll-container-mobile');
    const slides = document.querySelectorAll('#bottom-banner .ad-scroll-container-mobile .ad-slide');
    const totalSlides = slides.length;

    if (!container || totalSlides === 0) {
        console.warn('Carousel: No slides found');
        return;
    }

    let autoScrollInterval;
    let currentIndex = 0;

    // Clone first slide for seamless looping
    const firstClone = slides[0].cloneNode(true);
    container.appendChild(firstClone);

    function getBoxWidth() {
        const slideWidth = slides[0].offsetWidth;
        const slideMargin = window.innerWidth <= 480 ? 10 : 40;
        return slideWidth + slideMargin;
    }

    function setInitialPosition() {
        container.scrollTo({ left: 0, behavior: 'instant' });
        currentIndex = 0;
    }

    function startAutoScroll() {
        clearInterval(autoScrollInterval);
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
        }, 8000); // Change every 8 seconds
    }

    // Disable manual scrolling
    container.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
    container.addEventListener('wheel', (e) => e.preventDefault(), { passive: false });

    // Tap to follow link
    let touchMoved = false;
    container.addEventListener('touchstart', () => { touchMoved = false; }, { passive: true });

    container.addEventListener('touchend', (e) => {
        if (!touchMoved) {
            const target = e.target.closest('a');
            if (target && target.href) {
                window.location.href = target.href;
            }
        }
    }, { passive: true });

    // Resize handler
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            container.scrollTo({
                left: currentIndex * getBoxWidth(),
                behavior: 'instant'
            });
            startAutoScroll();
        }, 150);
    });

    // Initialize
    setInitialPosition();
    startAutoScroll();

    console.log('✅ Bottom banner carousel initialized');
});