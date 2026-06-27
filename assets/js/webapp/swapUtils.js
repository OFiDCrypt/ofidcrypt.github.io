// assets/js/webapp/swapUtils.js

// Helper to handle user cancellations
const handleCancel = (err) => {
    const msg = err?.message || "";
    if (msg.includes("rejected") || msg.includes("cancelled") || msg.includes("user declined")) {
        console.log("[Swap] Cancelled by user");
        throw new Error("USER_REJECTED");
    }
    return false;
};

// ==================== ULTRA SWAP (Primary) ====================
async function performUltraSwap(inputMint, outputMint, rawAmount, provider, connectedWallet) {
    if (rawAmount < 100000) {
        console.warn("[Ultra] Amount too small");
        throw new Error("Amount too small — try a larger swap");
    }

    try {
        console.log(`[Ultra] Quote request: ${rawAmount} ${inputMint} → ${outputMint}`);
        const ultraRes = await fetch(
            `https://lite-api.jup.ag/ultra/v1/order?inputMint=${inputMint}&outputMint=${outputMint}&amount=${rawAmount}&taker=${connectedWallet}`
        );

        if (!ultraRes.ok) {
            const errText = await ultraRes.text().catch(() => '');
            throw new Error(`Ultra Quote Failed ${ultraRes.status}: ${errText}`);
        }

        const quote = await ultraRes.json();
        if (quote.error) throw new Error(`Quote Error: ${JSON.stringify(quote.error)}`);
        if (!quote.transaction) throw new Error("No transaction in Ultra response");

        return await executeUltraTransaction(quote, provider);
    } catch (error) {
        if (!handleCancel(error)) console.error("[Ultra] Failed:", error.message);
        throw error;
    }
}

// ==================== SMART SIGNING (Mobile-Friendly) ====================
async function executeUltraTransaction(quote, providerParam) {
    const connectionMethod = window.connectionMethod || localStorage.getItem('connection_method') || 'injected';
    console.log(`[Ultra] Connection: ${connectionMethod} | Wallet: ${window.connectedWallet?.slice(0,8)}...`);

    let signer = null;

    // Smart routing based on wallet type
    if (connectionMethod === 'google' || connectionMethod === 'apple') {
        // Google / Apple MUST use SDK
        console.log("[Ultra] Embedded wallet detected → using SDK");
        const sdk = await window.getPhantomSDK?.();
        if (sdk?.solana) {
            signer = sdk.solana;
        }
    } else {
        // Injected (Phantom extension / app) → prefer legacy
        if (providerParam && typeof providerParam.signTransaction === 'function') {
            signer = providerParam;
            console.log("✅ Using injected provider");
        } else if (window.solana?.isPhantom) {
            signer = window.solana;
            console.log("✅ Using window.solana");
        } else {
            const sdk = await window.getPhantomSDK?.();
            if (sdk?.solana) signer = sdk.solana;
        }
    }

    if (!signer) throw new Error("No valid signer found for this wallet type");

    try {
        console.log("[Ultra] Deserializing transaction...");
        const vtx = solanaWeb3.VersionedTransaction.deserialize(
            Buffer.from(quote.transaction, 'base64')
        );

        console.log("[Ultra] Signing transaction...");
        const signed = await signer.signTransaction(vtx);

        // Safe base64 encoding
        const signedTx = btoa(String.fromCharCode(...new Uint8Array(signed.serialize())));

        const executeRes = await fetch('https://lite-api.jup.ag/ultra/v1/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                signedTransaction: signedTx,
                requestId: quote.requestId
            })
        });

        if (!executeRes.ok) {
            const errText = await executeRes.text().catch(() => '');
            throw new Error(`Ultra Execute 400: ${executeRes.status} ${errText}`);
        }

        const result = await executeRes.json();
        console.log(`✅ Ultra Success! TX: ${result.signature}`);
        return { success: true, txid: result.signature, router: "Ultra" };

    } catch (error) {
        console.warn("[Ultra] Direct execute failed, falling back to v1 proxy...", error.message);
        if (!handleCancel(error)) {
            return await performV1Swap(
                quote.inputMint || "So11111111111111111111111111111111111111112",
                quote.outputMint,
                quote.inAmount || quote.amount,
                providerParam,
                window.connectedWallet
            );
        }
        throw error;
    }
}

// ==================== V1 PROXY FALLBACK (Most Reliable on Mobile) ====================
async function performV1Swap(inputMint, outputMint, rawAmount, provider, connectedWallet) {
    try {
        console.log("[V1 Proxy] Using backend proxy for reliable signing");
        const proxyRes = await fetch('https://giddy-key-swaps-production.up.railway.app/api/swap/v1', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ inputMint, outputMint, rawAmount, connectedWallet })
        });

        const data = await proxyRes.json();
        if (!data.success) throw new Error(data.error || "Proxy failed");

        const tx = solanaWeb3.VersionedTransaction.deserialize(
            Buffer.from(data.swapTransaction, "base64")
        );

        // Re-resolve signer for v1 path
        const connectionMethod = window.connectionMethod || localStorage.getItem('connection_method') || 'injected';
        let signer = null;

        if (connectionMethod === 'google' || connectionMethod === 'apple') {
            const sdk = await window.getPhantomSDK?.();
            signer = sdk?.solana;
        } else {
            signer = provider || window.solana || (await window.getPhantomSDK?.())?.solana;
        }

        if (!signer) throw new Error("No signer available for v1 fallback");

        const result = await signer.signAndSendTransaction(tx);
        console.log(`✅ v1 Proxy Success! TX: ${result.signature}`);
        return { success: true, txid: result.signature, version: "v1" };

    } catch (error) {
        if (!handleCancel(error)) console.error("[V1 Proxy] Failed:", error.message);
        throw error;
    }
}

// Global exports
window.performUltraSwap = performUltraSwap;
window.performV1Swap = performV1Swap;

console.log("✅ swapUtils.js loaded — Mobile-optimized (Smart signer + Ultra + v1 fallback)");