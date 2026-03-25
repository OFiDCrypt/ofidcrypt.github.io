// Global Status Message Logic (Massively‑safe)
const observer = new MutationObserver(() => {
    const statusMessage = document.getElementById("statusMessage");
    const closeBtn = document.getElementById("statusClose");
    const optOutCheckbox = document.getElementById("statusOptOut");

    // Wait until all elements exist
    if (!statusMessage || !closeBtn || !optOutCheckbox) return;

    // Stop observing once found
    observer.disconnect();

    console.log("Status elements found — initializing…");

    // If user opted out, keep hidden
    if (localStorage.getItem("hideStatusMessage") === "true") {
        console.log("User opted out — keeping hidden");
        statusMessage.classList.add("hidden");
        return;
    }

    // MASSIVELY FIX:
    // Delay long enough for Scrollex + header animations + DOM rewrites to finish
    setTimeout(() => {
        console.log("Applying SHOW class now…");

        statusMessage.classList.remove("hidden");
        statusMessage.classList.add("show");

        console.log("Final classList:", statusMessage.className);
    }, 600); // 600ms survives Massively's DOM rewrite timing

    // Smooth hide
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

    optOutCheckbox.addEventListener("change", (e) => {
        if (e.target.checked) {
            localStorage.setItem("hideStatusMessage", "true");
        } else {
            localStorage.removeItem("hideStatusMessage");
        }
    });
});

// Start observing the whole document for Massively's late DOM inserts
observer.observe(document.documentElement, {
    childList: true,
    subtree: true
});
