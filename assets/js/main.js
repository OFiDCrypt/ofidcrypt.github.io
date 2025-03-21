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

            if (browser.name == 'ie' || browser.name == 'edge' || window.devicePixelRatio > 1)
                off();
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

    // Debounce utility for scroll events
    $.debounce = function (delay, fn) {
        let timeoutId;
        return function () {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => fn.apply(this, arguments), delay);
        };
    };

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

    // Document Ready
    $(document).ready(function () {
        // Nav Panel Toggle
        $navPanelToggle = $('<a href="#navPanel" id="navPanelToggle">Menu</a>').appendTo($wrapper);
        var altClassApplied = false;
        var toggleOffset = 5;

        $window.on('scroll', $.debounce(100, function () {
            var scrollTop = $(this).scrollTop();
            var windowHeight = $(window).height();
            var $copyright = $('#copyright');
            var togglePoint = $copyright.offset().top + $copyright.outerHeight() + toggleOffset;

            if (scrollTop + windowHeight < togglePoint) {
                $navPanelToggle.addClass('alt');
                altClassApplied = true;
            } else {
                $navPanelToggle.removeClass('alt');
                altClassApplied = false;
            }
        }));

        // Initial scroll position check
        var initialScrollTop = $window.scrollTop();
        var initialCopyrightTop = $('#copyright').offset().top;
        var initialTogglePoint = initialCopyrightTop + $('#copyright').outerHeight() + toggleOffset;
        if (initialScrollTop + window.innerHeight < initialTogglePoint) {
            $navPanelToggle.addClass('alt');
            altClassApplied = true;
        } else {
            $navPanelToggle.removeClass('alt');
            altClassApplied = false;
        }

        // Smooth Jump Links
        $('a[href^="#"]').on('click', function (e) {
            e.preventDefault();
            var target = $(this.getAttribute('href'));
            if (target.length) {
                target[0].scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
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

    if (browser.os == 'wp' && browser.osVersion < 10)
        $navPanel.css('transition', 'none');

    // Intro.
    var $intro = $('#intro');
    if ($intro.length > 0) {
        if (browser.name == 'ie') {
            $window.on('resize.ie-intro-fix', function () {
                var h = $intro.height();
                if (h > $window.height())
                    $intro.css('height', 'auto');
                else
                    $intro.css('height', h);
            }).trigger('resize.ie-intro-fix');
        }

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

        // Dark Mode Toggle
        const darkModeToggle = document.querySelector('#darkModeToggle');
        const newDarkModeToggle = document.querySelector('ul.icons li a img.custom-site-icon');

        function toggleDarkMode() {
            document.body.classList.toggle('dark-mode');
            darkModeToggle.classList.toggle('dark');
            const isDarkMode = document.body.classList.contains('dark-mode');
            localStorage.setItem('dark-mode', isDarkMode);

            const icon = darkModeToggle.querySelector('i');
            if (isDarkMode) {
                icon.classList.remove('fa-sun');
                icon.classList.add('fa-moon');
            } else {
                icon.classList.remove('fa-moon');
                icon.classList.add('fa-sun');
            }
        }

        if (localStorage.getItem('dark-mode') === 'true') {
            document.body.classList.add('dark-mode');
            darkModeToggle.classList.add('dark');
            const icon = darkModeToggle.querySelector('i');
            icon.classList.add('fa-moon');
            icon.classList.remove('fa-sun');
        }

        if (darkModeToggle) {
            darkModeToggle.addEventListener('click', function (e) {
                e.preventDefault();
                toggleDarkMode();
            });
        }

        if (newDarkModeToggle) {
            newDarkModeToggle.parentElement.addEventListener('click', function (e) {
                e.preventDefault();
                toggleDarkMode();
            });
            newDarkModeToggle.parentElement.addEventListener('touchstart', function (e) {
                e.preventDefault();
                toggleDarkMode();
            });
        }

        // Featured Dynamic Image
        const proxyUrl = 'https://api.allorigins.win/get?url=';
        const articleUrl = proxyUrl + encodeURIComponent('https://pennypost.co/p/676825480/01-a-beginners-introduction-to-cryptocurrency');

        async function fetchOpenGraphImage(url) {
            try {
                const response = await fetch(url);
                const json = await response.json();
                const parser = new DOMParser();
                const doc = parser.parseFromString(json.contents, 'text/html');
                const imageUrl = doc.querySelector('meta[property="og:image"]').getAttribute('content');
                return imageUrl;
            } catch (error) {
                console.error('Error fetching the article:', error);
                return null;
            }
        }

        fetchOpenGraphImage(articleUrl).then(imageUrl => {
            const dynamicImage = document.querySelector(".post.featured .image.main img");
            if (imageUrl) {
                dynamicImage.src = imageUrl;
            } else {
                dynamicImage.src = 'assets/images/pic05.jpg';
            }
        });
    }
})(jQuery);