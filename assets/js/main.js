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
        $navPanel, $navPanelInner;

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

    document.addEventListener('DOMContentLoaded', function () {

        // Smooth scroll for anchor tags
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        });

        // Smooth scroll for buttons with data-scroll
        document.querySelectorAll('[data-scroll]').forEach(btn => {
            btn.addEventListener('click', function (e) {
                e.preventDefault();
                const selector = this.getAttribute('data-scroll');
                const target = document.querySelector(selector);
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

    // Background (disable parallax on mobile to fix iOS bottom-nav jump)
    if (!/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
        $wrapper._parallax(0.925);
    } else {
        $wrapper._parallax(0); // disables transforms entirely on mobile
    }

    // Nav Panel Toggle
    $(document).ready(function () {
        $('#navPanelTrigger').on('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            $body.toggleClass('is-navPanel-visible');
        });
    });

    // Panel creation
    $navPanel = $(
        '<div id="navPanel">' +
        '<nav></nav>' +
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

    $navPanelInner = $navPanel.children('nav');

    var $navContent = $nav.children('ul');

    breakpoints.on('>medium', function () {
        $navContent.appendTo($nav);
        $nav.find('.icons, .icon').removeClass('alt');
    });

    breakpoints.on('<=medium', function () {
        $navContent.appendTo($navPanelInner);
        $navPanelInner.find('.icons, .icon').addClass('alt');
    });

    if (browser.os == 'wp' && browser.osVersion < 10) {
        $navPanel.css('transition', 'none');
    }

    // ───────────────────────────────────────────────
    // Bottom Menu button handler (opens/closes panel)
    // ───────────────────────────────────────────────
    $(document).ready(function () {
        $('#navPanelTrigger').on('click touchend', function (e) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            $body.toggleClass('is-navPanel-visible');
            console.log('Bottom Menu triggered – panel visibility toggled');
        });
    });

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

        // Featured Dynamic Image
        /*
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
        */
    }
})(jQuery);