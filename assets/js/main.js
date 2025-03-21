/*
    Massively by HTML5 UP
    html5up.net | @ajlkn
    Free for personal and commercial use under the CCA 3.0 license (html5up.net/license)
*/

(function ($) {

    var $window = $(window),
        $body = $('body'),
        $wrapper = $('#wrapper'),
        $header = $('#header'),
        $nav = $('#nav'),
        $main = $('#main'),
        $navPanelToggle, $navPanel, $navPanelInner;

    // Breakpoints.
    breakpoints({
        default: ['1681px', null],
        xlarge: ['1281px', '1680px'],
        large: ['981px', '1280px'],
        medium: ['737px', '980px'],
        small: ['481px', '736px'],
        xsmall: ['361px', '480px'],
        xxsmall: [null, '360px']
    });

    // Ensure scrolly function is initialized
    $(function () {
        $('.scrolly').scrolly();
    });

    // Get inner element
    var $nav = $('#nav');
    if ($nav.length > 0) {
        var $navPanelInner = $nav.children('ul'); // or 'nav' if it’s a direct child
    } else {
        console.error('$nav is not defined or empty');
    }

    /**
     * Applies parallax scrolling to an element's background image.
     * @return {jQuery} jQuery object.
     */
    $.fn._parallax = function (intensity) {

        var $window = $(window),
            $this = $(this);

        if (this.length == 0 || intensity === 0)
            return $this;

        if (this.length > 1) {
            for (var i = 0; i < this.length; i++)
                $(this[i])._parallax(intensity);
            return $this;
        }

        if (!intensity)
            intensity = 0.25;

        $this.each(function () {

            var $t = $(this),
                $bg = $('<div class="bg"></div>').appendTo($t),
                on, off;

            on = function () {
                $bg
                    .removeClass('fixed')
                    .css('transform', 'matrix(1,0,0,1,0,0)');

                $window
                    .on('scroll._parallax', function () {
                        var pos = parseInt($window.scrollTop()) - parseInt($t.position().top);
                        $bg.css('transform', 'matrix(1,0,0,1,0,' + (pos * intensity) + ')');
                    });
            };

            off = function () {
                $bg
                    .addClass('fixed')
                    .css('transform', 'none');

                $window
                    .off('scroll._parallax');
            };

            // Disable parallax on ..
            if (browser.name == 'ie'     // IE
                || browser.name == 'edge'    // Edge
                || window.devicePixelRatio > 1)   // Retina/HiDPI (= poor performance)
                off();

            // Enable everywhere else.
            else {
                breakpoints.on('>large', on);
                breakpoints.on('<=large', off);
            }

        });

        $window
            .off('load._parallax resize._parallax')
            .on('load._parallax resize._parallax', function () {
                $window.trigger('scroll');
            });

        return $(this);

    };

    // Smooth Jump Links
    document.addEventListener('DOMContentLoaded', function () {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
    });

    // Play initial animations on page load.
    $window.on('load', function () {
        window.setTimeout(function () {
            $body.removeClass('is-preload');
        }, 100);
    });

    // Scrolly.
    $('.scrolly').scrolly();

    // Background.
    $wrapper._parallax(0.925);

    // Nav Panel Toggle
    $(document).ready(function () {
        var $navPanelToggle = $(
            '<a href="#navPanel" id="navPanelToggle">Menu</a>'
        ).appendTo($wrapper);

        // Flag to ensure the toggle happens only once during scrolling
        var altClassApplied = false;

        // Set toggleOffset to for alignment under (-) or above (+) the copyright element
        var toggleOffset = 5;

        // Custom scroll event listener to toggle 'alt' class based on scroll position relative to the copyright element
        $(window).on('scroll', function () {
            var scrollTop = $(this).scrollTop();
            var windowHeight = $(window).height();
            var $copyright = $('#copyright');
            var copyrightTop = $copyright.offset().top;
            var copyrightHeight = $copyright.outerHeight();

            // Adjust the toggle point to be just under the copyright element
            var togglePoint = copyrightTop + copyrightHeight + toggleOffset; // Adjusted for under the copyright

            if (scrollTop + windowHeight < togglePoint && !altClassApplied) {
                $navPanelToggle.addClass('alt');
                altClassApplied = true;
            } else if (scrollTop + windowHeight >= togglePoint && altClassApplied) {
                $navPanelToggle.removeClass('alt');
                altClassApplied = false;
            }

            // Optional: Log for debugging
            console.log(`Scroll Position: ${scrollTop}, Toggle Point: ${togglePoint}, altClassApplied: ${altClassApplied}`);
        });

        // Check initial scroll position on page load
        var initialScrollTop = $(window).scrollTop();
        var initialCopyrightTop = $('#copyright').offset().top;
        var initialTogglePoint = initialCopyrightTop + $('#copyright').outerHeight() + toggleOffset;
        if (initialScrollTop + window.innerHeight < initialTogglePoint) {
            $navPanelToggle.addClass('alt');
            altClassApplied = true;
        } else {
            $navPanelToggle.removeClass('alt');
            altClassApplied = false;
        }
    });

    // Panel.
    $navPanel = $(
        '<div id="navPanel">' +
        '<nav>' +
        '</nav>' +
        '<a href="#navPanel" class="close"></a>' +
        '</div>'
    )
        .appendTo($body)
        .panel({
            delay: 500,
            hideOnClick: true,
            hideOnSwipe: true,
            resetScroll: true,
            resetForms: true,
            side: 'right',
            target: $body,
            visibleClass: 'is-navPanel-visible'
        });

    // Get inner.
    $navPanelInner = $navPanel.children('nav');

    // Move nav content on breakpoint change.
    var $navContent = $nav.children('ul');

    breakpoints.on('>medium', function () {
        // NavPanel -> Nav.
        $navContent.appendTo($nav);

        // Flip icon classes.
        $nav.find('.icons, .icon').removeClass('alt');
    });

    breakpoints.on('<=medium', function () {
        // Nav -> NavPanel.
        $navContent.appendTo($navPanelInner);

        // Flip icon classes.
        $navPanelInner.find('.icons, .icon').addClass('alt');
    });

    // Hack: Disable transitions on WP.
    if (browser.os == 'wp' && browser.osVersion < 10)
        $navPanel.css('transition', 'none');

    // Intro.
    var $intro = $('#intro');

    if ($intro.length > 0) {

        // Hack: Fix flex min-height on IE.
        if (browser.name == 'ie') {
            $window.on('resize.ie-intro-fix', function () {

                var h = $intro.height();

                if (h > $window.height())
                    $intro.css('height', 'auto');
                else
                    $intro.css('height', h);

            }).trigger('resize.ie-intro-fix');
        }

        // Hide intro on scroll (> small).
        breakpoints.on('>small', function () {

            $main.unscrollex();

            $main.scrollex({
                mode: 'bottom',
                top: '25vh',
                bottom: '-50vh',
                enter: function () {
                    $intro.addClass('hidden');
                },
                leave: function () {
                    $intro.removeClass('hidden');
                }
            });

        });

        // Switch Visual Mode - Dark Mode Light Mode
        document.addEventListener('DOMContentLoaded', (event) => {
            console.log('DOM fully loaded and parsed');

            const darkModeToggle = document.querySelector('#darkModeToggle'); // Assuming this was your original toggle
            const newDarkModeToggle = document.querySelector('ul.icons li a img.custom-site-icon'); // New button

            function toggleDarkMode() {
                document.body.classList.toggle('dark-mode');
                darkModeToggle.classList.toggle('dark');
                const isDarkMode = document.body.classList.contains('dark-mode');
                localStorage.setItem('dark-mode', isDarkMode);

                const icon = darkModeToggle.querySelector('i');
                if (isDarkMode) {
                    icon.classList.remove('fa-sun');
                    icon.classList.add('fa-moon');
                    console.log('Switched to dark mode (moon icon)');
                } else {
                    icon.classList.remove('fa-moon');
                    icon.classList.add('fa-sun');
                    console.log('Switched to light mode (sun icon)');
                }
            }

            // Check local storage for dark mode on page load
            if (localStorage.getItem('dark-mode') === 'true') {
                document.body.classList.add('dark-mode');
                darkModeToggle.classList.add('dark');
                const icon = darkModeToggle.querySelector('i');
                icon.classList.add('fa-moon');
                icon.classList.remove('fa-sun');
                console.log('Dark mode restored from local storage');
            }

            // Event listener for original toggle button
            if (darkModeToggle) {
                darkModeToggle.addEventListener('click', function (event) {
                    event.preventDefault();
                    toggleDarkMode();
                });
            } else {
                console.warn('Dark Mode Toggle button not found');
            }

            // Event listener for the new button
            if (newDarkModeToggle) {
                newDarkModeToggle.parentElement.addEventListener('click', function (event) {
                    event.preventDefault();
                    toggleDarkMode();
                });
                newDarkModeToggle.parentElement.addEventListener('touchstart', function (event) {
                    event.preventDefault();
                    toggleDarkMode();
                });
            } else {
                console.warn('New Dark Mode Toggle button not found');
            }
        });

        // Featured Dynamic Image
        document.addEventListener("DOMContentLoaded", function () {
            const proxyUrl = 'https://api.allorigins.win/get?url=';
            const articleUrl = proxyUrl + encodeURIComponent('https://pennypost.co/p/676825480/01-a-beginners-introduction-to-cryptocurrency');

            async function fetchOpenGraphImage(url) {
                try {
                    const response = await fetch(url);
                    const json = await response.json();
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(json.contents, 'text/html');
                    const imageUrl = doc.querySelector('meta[property="og:image"]').getAttribute('content');
                    console.log('Fetched Image URL:', imageUrl); // Log the URL for debugging
                    return imageUrl;
                } catch (error) {
                    console.error('Error fetching the article:', error);
                    return null;
                }
            }

            fetchOpenGraphImage(articleUrl).then(imageUrl => {
                console.log('Image URL to be set:', imageUrl); // Debug: Ensure URL to be set
                const dynamicImage = document.querySelector(".post.featured .image.main img");
                if (imageUrl) {
                    dynamicImage.src = imageUrl;
                    console.log('Image source updated successfully');
                } else {
                    dynamicImage.src = 'assets/images/pic05.jpg'; // Fallback image
                    console.log('Fallback image used');
                }
            });
        });
    }
})(jQuery); 