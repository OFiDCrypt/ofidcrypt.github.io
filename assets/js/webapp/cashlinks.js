// ================================================
// assets/js/webapp/cashlinks.js
// Spinning Wheel / Cash Links Page Logic
// ================================================

async function renderCashLinks() {
    const container = document.getElementById('cashlinks-container');
    container.innerHTML = '<p style="text-align:center; padding:40px; opacity:0.6;">Loading cash links...</p>';

    try {
        const response = await fetch('/cashlinks-data.json', { cache: 'no-store' });
        if (!response.ok) throw new Error('JSON not found');

        const cashLinksData = await response.json();
        container.innerHTML = '';

        // Render items in rows of 3
        for (let i = 0; i < cashLinksData.length; i += 3) {
            const rowDiv = document.createElement('div');
            rowDiv.className = 'cashlinks-items';
            const rowItems = cashLinksData.slice(i, i + 3);

            rowItems.forEach(token => {
                const itemHTML = `
                    <article class="cashlinks-item ${token.extraClass || ''}" id="${token.id}">
                        <a href="${token.imageHref}" class="image left" 
                           ${token.imageHref.startsWith('http') ? 'target="_blank" rel="noopener noreferrer"' : ''}>
                            <img src="${token.imageSrc}" alt="${token.title.toLowerCase()}-gift">
                        </a>
                        <div class="cashlinks-content">
                            <h3>${token.title}</h3>
                            <button class="button round-button"
                                data-link="${token.cashLink}"
                                onclick="return verifyRecaptchaForLinks(this);">
                                Claim Cash
                            </button>
                        </div>
                    </article>`;
                rowDiv.innerHTML += itemHTML;
            });
            container.appendChild(rowDiv);
        }

        // === UNIFIED GLOW LOGIC FOR JUMP LINKS ===
        const currentHash = window.location.hash;
        if (currentHash) {
            setTimeout(() => {
                const targetElement = document.querySelector(currentHash);
                if (targetElement) {
                    targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });

                    // Apply Soft Purple Face Glow
                    targetElement.style.transition = "all 0.8s ease-in-out";
                    targetElement.style.backgroundColor = "rgba(168, 85, 247, 0.25)";
                    targetElement.style.boxShadow = "inset 0 0 30px rgba(168, 85, 247, 0.5), 0 0 20px rgba(168, 85, 247, 0.3)";

                    // Fade out after 2.5 seconds
                    setTimeout(() => {
                        targetElement.style.backgroundColor = "";
                        targetElement.style.boxShadow = "none";
                    }, 2500);
                }
            }, 200);
        }

    } catch (err) {
        console.error(err);
        container.innerHTML = `<p style="text-align:center; padding:40px; color:#ff6688;">⚠️ Error loading links.</p>`;
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', renderCashLinks);

// ================================================
// assets/js/webapp/cashlinks.js
// Spinning Wheel Logic
// ================================================

function openModal(modalId) {
    const modal = document.getElementById(`${modalId}-modal`);
    if (modal) modal.style.display = 'flex';
}

function closeModal(modalId) {
    const modal = document.getElementById(`${modalId}-modal`);
    if (modal) modal.style.display = 'none';
}

function scrollToToken(tokenId) {
    closeModal('token-directory');
    const element = document.getElementById(tokenId);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // --- UNIFIED GLOW LOGIC FOR DIRECTORY ---
        element.style.transition = 'all 0.8s ease-in-out';

        // Apply Soft Purple Face Glow
        element.style.backgroundColor = 'rgba(168, 85, 247, 0.25)';
        element.style.boxShadow = 'inset 0 0 30px rgba(168, 85, 247, 0.5), 0 0 20px rgba(168, 85, 247, 0.3)';

        // Fade out
        setTimeout(() => {
            element.style.backgroundColor = '';
            element.style.boxShadow = 'none';
        }, 2500);
    }
}

// Close when clicking outside
window.onclick = function (event) {
    const modal = document.getElementById('token-directory-modal');
    if (event.target === modal) {
        closeModal('token-directory');
    }
}

// Initialize reCAPTCHA widget IDs
var grecaptchaForLinksWidgetId;
var grecaptchaForFormWidgetId;

// === NEW: TARGET CACHE TRACKER FOR AUTOMATED FLIGHTS ===
var pendingScrollTokenId = null;

// Callback function to initialize reCAPTCHA widgets explicitly
window.onloadCallback = function () {
    grecaptchaForLinksWidgetId = grecaptcha.render('recaptchaForLinks', {
        'sitekey': '6LeHSWsqAAAAABWNk60dgafwA26pWZiQoNi8ZUTa',
        // Triggers automatically the instant the user checks the Google link box successfully
        'callback': onLinksRecaptchaSuccess
    });

    grecaptchaForFormWidgetId = grecaptcha.render('recaptchaForForm', {
        'sitekey': '6LeHSWsqAAAAABWNk60dgafwA26pWZiQoNi8ZUTa'
    });
};

// Function to verify reCAPTCHA before allowing link click
function verifyRecaptchaForLinks(button) {
    var response = grecaptcha.getResponse(grecaptchaForLinksWidgetId);

    // Find the parent item ID so we know where they came from
    var parentCard = button.closest('.cashlinks-item');
    if (parentCard) {
        pendingScrollTokenId = parentCard.id;
    }

    if (response.length === 0) {
        alert("Please complete the reCAPTCHA below to claim cash links.");

        // Smooth scroll down to the reCAPTCHA widget section
        var recaptchaSection = document.getElementById('recaptcha-links-section');
        if (recaptchaSection) {
            recaptchaSection.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
        }
        return false;
    } else {
        // reCAPTCHA is already checked, execute immediate payout action
        executeTokenClaimRedirect(button);
        return true;
    }
}

// === NEW: AUTOMATED SUCCESS CALLBACK HANDLER ===
function onLinksRecaptchaSuccess(tokenResponse) {
    if (!pendingScrollTokenId) return;

    var targetElement = document.getElementById(pendingScrollTokenId);
    if (targetElement) {
        // Find the button inside the tracked token row card
        var associatedButton = targetElement.querySelector('.round-button');

        // 1. Process the redirection payout link immediately in a safe external context
        if (associatedButton) {
            var claimLink = associatedButton.getAttribute('data-link');
            if (claimLink) {
                window.open(claimLink, '_blank', 'noopener,noreferrer');
            }
        }

        // 2. Fly them right back up or down to the token section they interacted with
        setTimeout(function () {
            targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });

            // 3. Trigger your beautiful custom Purple Glow Face Transition
            targetElement.style.transition = 'all 0.8s ease-in-out';
            targetElement.style.backgroundColor = 'rgba(168, 85, 247, 0.25)';
            targetElement.style.boxShadow = 'inset 0 0 30px rgba(168, 85, 247, 0.5), 0 0 20px rgba(168, 85, 247, 0.3)';

            // Clean back down to standard CSS layout properties
            setTimeout(function () {
                targetElement.style.backgroundColor = '';
                targetElement.style.boxShadow = 'none';

                // Reset global verification track states
                pendingScrollTokenId = null;
                grecaptcha.reset(grecaptchaForLinksWidgetId);
            }, 2500);
        }, 350); // Small timeout allows user to see the green checkmark before flying
    }
}

// Helper process to execute immediate redirection if already cleared
function executeTokenClaimRedirect(button) {
    var link = button.getAttribute('data-link');
    if (link) {
        window.location.href = link;
    } else {
        alert("Error: No link found.");
    }
    // Reset state
    pendingScrollTokenId = null;
    grecaptcha.reset(grecaptchaForLinksWidgetId);
}

// Function to verify reCAPTCHA for form submission
function verifyRecaptcha() {
    var response = grecaptcha.getResponse(grecaptchaForFormWidgetId);
    if (response.length === 0) {
        alert("Please complete the reCAPTCHA for the form.");
        document.getElementById('recaptchaForForm').scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });
        return false;
    }
    return true;
}

// Profile button placeholder
function showProfile() { alert("Profile coming soon"); }


// WHEEL SPINNING ENGINE - FULLY CUSTOM, NO LIBRARIES, BUILT FROM SCRATCH FOR MAXIMUM CONTROL AND PERFORMANCE
// WHEEL SPINNING ENGINE - FULLY CUSTOM, NO LIBRARIES, BUILT FROM SCRATCH FOR MAXIMUM CONTROL AND PERFORMANCE
document.addEventListener('DOMContentLoaded', function () {
    const wheel = document.getElementById('wheel');
    const spinBtn = document.getElementById('spin-btn');
    const needle = document.getElementById('needle');

    let isSpinning = false;
    let currentRotation = 0;

    // === PERFECT ARCHITECTURAL WHEEL SECTOR MAP ===
    // Mapped exactly matching your wheel asset positions going clockwise.
    // Links 'jsonId' string keys directly to elements rendered by renderCashLinks()
    const sectors = [
        { index: 0, label: "DUNO", angle: 0, jsonId: "duno" },
        { index: 1, label: "CPT", angle: 36, jsonId: "cpt" },
        { index: 2, label: "ONE", angle: 72, jsonId: "one" },
        { index: 3, label: "GIDDY", angle: 108, jsonId: "giddy" },
        { index: 4, label: "DOBBY", angle: 144, jsonId: "dobby" },
        { index: 5, label: "KIN", angle: 180, jsonId: "kin" },
        { index: 6, label: "MYLO", angle: 216, jsonId: "mylo" },
        { index: 7, label: "SOCK INU", angle: 252, jsonId: "sinu" },
        { index: 8, label: "RAINBOW ORB", angle: 288, jsonId: "expb" }, // Maps to eXPB Bouncy Ball
        { index: 9, label: "MYSTERY ?", angle: 324, jsonId: "mystery" } // Triggers the Choice Modal
    ];

    spinBtn.addEventListener('click', function () {
        if (isSpinning) return;

        isSpinning = true;
        spinBtn.style.pointerEvents = 'none';

        // Choose winning index
        const winningSectorIndex = Math.floor(Math.random() * 10);
        const targetSector = sectors[winningSectorIndex];

        // Organic Resting Position Offset (-14 to +14 deg)
        const organicOffset = (Math.random() * 28) - 14;
        const targetWedgeAngle = (360 - targetSector.angle) % 360;
        const finalCalculatedWedgeAngle = targetWedgeAngle + organicOffset;

        const minSpins = 5;
        const maxSpins = 7;
        const totalSpinsCount = Math.floor(Math.random() * (maxSpins - minSpins + 1)) + minSpins;

        const baseTargetRotation = (totalSpinsCount * 360) + finalCalculatedWedgeAngle;

        const startRotation = currentRotation;
        const normalizedStart = startRotation % 360;
        const endRotation = startRotation + (baseTargetRotation - normalizedStart);

        const duration = 6500;
        let startTime = null;
        let lastTickPegIndex = -1;

        function easeOutQuint(t) {
            return 1 - Math.pow(1 - t, 5);
        }

        function animateWheel(timestamp) {
            if (!startTime) startTime = timestamp;
            const elapsed = timestamp - startTime;
            const progress = Math.min(elapsed / duration, 1);

            const easeProgress = easeOutQuint(progress);
            currentRotation = startRotation + (endRotation - startRotation) * easeProgress;
            wheel.style.transform = `rotate(${currentRotation}deg)`;

            // Tick Logic Engine (Vibrational Jitter vs Smooth Late Click)
            const totalDegTraveled = currentRotation;
            const currentPegIndex = Math.floor((totalDegTraveled + 18) / 36);
            const dynamicVelocity = (1 - progress);

            if (progress < 0.45) {
                const highSpeedJitter = (Math.sin(timestamp * 0.08) * 12) * dynamicVelocity;
                needle.style.transition = 'none';
                needle.style.transform = `translateX(-50%) rotate(${-10 + highSpeedJitter}deg)`;
            }
            else if (currentPegIndex !== lastTickPegIndex) {
                lastTickPegIndex = currentPegIndex;
                const flickAngle = -22 * Math.max(dynamicVelocity, 0.15);

                needle.style.transition = 'none';
                needle.style.transform = `translateX(-50%) rotate(${flickAngle}deg)`;

                setTimeout(() => {
                    const snapBackTime = 60 + (progress * 80);
                    needle.style.transition = `transform ${snapBackTime}ms cubic-bezier(0.175, 0.885, 0.32, 1.275)`;
                    const recoil = 3 * dynamicVelocity;
                    needle.style.transform = `translateX(-50%) rotate(${recoil}deg)`;
                }, 25);
            }

            if (progress < 1) {
                requestAnimationFrame(animateWheel);
            } else {
                // Final Needle Settle
                needle.style.transition = 'transform 0.4s cubic-bezier(0.25, 1, 0.5, 1)';
                needle.style.transform = `translateX(-50%) rotate(0deg)`;

                isSpinning = false;
                spinBtn.style.pointerEvents = 'auto';

                currentRotation = currentRotation % 360;

                // === EXECUTE DYNAMIC LINK ROUTING ===
                executeOutcomeRouting(targetSector);
            }
        }

        // === LINK ROUTING FUNCTION ===
        function executeOutcomeRouting(sector) {
            console.log(`🎯 Stopped on Sector: ${sector.label}`);

            if (sector.jsonId === "mystery") {
                // If mystery sector hits, safely prompt the directory modal selection
                if (typeof openModal === 'function') {
                    openModal('token-directory');
                } else {
                    alert("🎉 You landed on a Mystery Sector! Open the token directory below to choose.");
                }
                return;
            }

            // Locate dynamically rendered article item inside #cashlinks-container
            const targetElement = document.getElementById(sector.jsonId);

            if (targetElement) {
                // Update window hash address smoothly without page flash jumps
                history.replaceState(null, null, `#${sector.jsonId}`);

                // Smooth scroll tracking into center window focus
                targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });

                // Execute your precise custom Purple Glow Transition
                targetElement.style.transition = "all 0.8s ease-in-out";
                targetElement.style.backgroundColor = "rgba(168, 85, 247, 0.25)";
                targetElement.style.boxShadow = "inset 0 0 30px rgba(168, 85, 247, 0.5), 0 0 20px rgba(168, 85, 247, 0.3)";

                // Fade back down to clean baseline native layout
                setTimeout(() => {
                    targetElement.style.backgroundColor = "";
                    targetElement.style.boxShadow = "none";
                }, 2500);
            } else {
                console.warn(`Could not locate rendered item element with ID: #${sector.jsonId}`);
            }
        }

        requestAnimationFrame(animateWheel);
    });
});