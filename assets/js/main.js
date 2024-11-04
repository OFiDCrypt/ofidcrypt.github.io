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
	var $navPanel = $('#nav');
	if ($navPanel.length > 0) {
		var $navPanelInner = $navPanel.children('ul'); // or 'nav' if it’s a direct child
	} else {
		console.error('$navPanel is not defined or empty');
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
				if (browser.name == 'ie'			// IE
					|| browser.name == 'edge'			// Edge
					|| window.devicePixelRatio > 1)		// Retina/HiDPI (= poor performance)
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

		// Nav Panel.

		// Toggle.
		$navPanelToggle = $(
			'<a href="#navPanel" id="navPanelToggle">Menu</a>'
		)
			.appendTo($wrapper);

		// Change toggle styling once we've scrolled past the header.
		$header.scrollex({
			bottom: '5vh',
			enter: function () {
				$navPanelToggle.removeClass('alt');
			},
			leave: function () {
				$navPanelToggle.addClass('alt');
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
		var $navContent = $nav.children();

		breakpoints.on('>medium', function () {

			// NavPanel -> Nav.
			$navContent.appendTo($nav);

			// Flip icon classes.
			$nav.find('.icons, .icon')
				.removeClass('alt');

		});

		breakpoints.on('<=medium', function () {

			// Nav -> NavPanel.
			$navContent.appendTo($navPanelInner);

			// Flip icon classes.
			$navPanelInner.find('.icons, .icon')
				.addClass('alt');

		});

		// Hack: Disable transitions on WP.
		if (browser.os == 'wp'
			&& browser.osVersion < 10)
			$navPanel
				.css('transition', 'none');

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

			// Pagination Index
			document.addEventListener("DOMContentLoaded", function() {
				const container = document.getElementById('posts-container');
				let currentPage = '1';
				let totalPages = 2; // Adjust this to the actual number of pages
			
				function loadPage(pageNumber, shouldScroll) {
					let url;
					if (pageNumber === '1') {
						url = 'index.html';
					} else {
						url = `posts-page${pageNumber}.html`;
					}
			
					container.classList.add('fade-out');
			
					fetch(url).then(response => response.text()).then(data => {
						const parser = new DOMParser();
						const doc = parser.parseFromString(data, 'text/html');
						let newContent = '';
			
						if(pageNumber === '1') {
							newContent = doc.getElementById('index-posts').querySelector('section.posts').outerHTML;
						} else {
							const pageContent = doc.getElementById(`posts-page${pageNumber}-posts`);
							if(pageContent) {
								newContent = pageContent.innerHTML;
							} else {
								newContent = doc.body.innerHTML || doc.querySelector('.posts').innerHTML;
							}
						}
			
						setTimeout(() => {
							container.innerHTML = `<div id="index-posts">${newContent}</div>`;
							container.classList.remove('fade-out');
							container.classList.add('fade-in');
			
							setTimeout(() => {
								container.classList.remove('fade-in');
							}, 500);
			
							if (shouldScroll) {
								const featuredPost = document.querySelector('.post.featured');
								if (featuredPost) {
									const featuredEnd = featuredPost.getBoundingClientRect().bottom + window.scrollY;
									window.scrollTo({ top: featuredEnd, behavior: 'smooth' });
								}
							}
			
							// Update active page class for both top and bottom pagination
							document.querySelectorAll('.pagination .page').forEach(pageLink => {
								pageLink.classList.remove('active');
								if (pageLink.getAttribute('data-page') === pageNumber) {
									pageLink.classList.add('active');
								}
							});
			
							// Update currentPage
							currentPage = pageNumber;
						}, 500);
					}).catch(error => {
						console.error('Error loading page:', error);
						container.classList.remove('fade-out');
					});
				}
			
				// Event listeners for both top and bottom pagination
				document.querySelectorAll('.pagination .page').forEach(pageLink => {
					pageLink.addEventListener('click', function(event) {
						event.preventDefault();
						const pageNumber = this.getAttribute('data-page');
						loadPage(pageNumber, true);
					});
				});
			
				document.querySelectorAll('.pagination .previous').forEach(prevLink => {
					prevLink.addEventListener('click', function(event) {
						event.preventDefault();
						if (currentPage > '1') {
							loadPage((parseInt(currentPage) - 1).toString(), true);
						}
					});
				});
			
				document.querySelectorAll('.pagination .next').forEach(nextLink => {
					nextLink.addEventListener('click', function(event) {
						event.preventDefault();
						if (parseInt(currentPage) < totalPages) {
							loadPage((parseInt(currentPage) + 1).toString(), true);
						}
					});
				});
			
				loadPage('1', false); // Load the first page on initial load without scrolling
			});

			// Featured Dynamic Image
			document.addEventListener("DOMContentLoaded", function() {
				const proxyUrl = 'https://api.allorigins.win/get?url=';
				const articleUrl = proxyUrl + encodeURIComponent('https://pennypost.co/p/723123949/04-learn-about-a-crypto-project-kin-token');
			
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
						dynamicImage.src = 'assets/images/pic01.png'; // Fallback image
						console.log('Fallback image used');
					}
				});
			});			
	}})(jQuery); 
