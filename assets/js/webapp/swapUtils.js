// assets/js/webapp/swapUtils.js

// Helper to handle cancellations silently
const handleCancel = (err) => {
    const msg = err?.message || "";
    if (msg.includes("rejected") || msg.includes("cancelled") || msg.includes("user declined")) {
        console.log("[Ultra] Swap cancelled");
        throw new Error("USER_REJECTED");
    }
    return false;
};

// ==================== ULTRA SWAP (Primary) ====================
async function performUltraSwap(inputMint, outputMint, rawAmount, provider, connectedWallet) {
    try {
        console.log(`[Ultra] Requesting quote: ${rawAmount} from ${inputMint} to ${outputMint}`);
        const ultraRes = await fetch(
            `https://lite-api.jup.ag/ultra/v1/order?inputMint=${inputMint}&outputMint=${outputMint}&amount=${rawAmount}&taker=${connectedWallet}`
        );

        if (!ultraRes.ok) throw new Error(`Ultra HTTP ${ultraRes.status}`);
        const quote = await ultraRes.json();
        if (quote.error) throw new Error(`Ultra Quote Error: ${JSON.stringify(quote.error)}`);
        
        return await executeUltraTransaction(quote, provider);
    } catch (error) {
        if (!handleCancel(error)) console.error("[Ultra] Failed:", error.message);
        throw error;
    }
}

// ==================== SMART SIGNING ====================
async function executeUltraTransaction(quote, provider) {
    try {
        const connectionMethod = window.connectionMethod || localStorage.getItem('connection_method');

        // ==================== GOOGLE / APPLE (Embedded Wallet) ====================
        if (connectionMethod === 'google' || connectionMethod === 'apple') {
            console.log("[Ultra] Embedded wallet detected → Using v1 proxy + SDK signing");
            console.log(`[Ultra] Connected wallet: ${window.connectedWallet}`);

            const proxyRes = await fetch('https://giddy-key-swaps-production.up.railway.app/api/swap/v1', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    inputMint: quote.inputMint || "So11111111111111111111111111111111111111112",
                    outputMint: quote.outputMint,
                    rawAmount: quote.inAmount,
                    connectedWallet: window.connectedWallet
                })
            });

            const data = await proxyRes.json();
            if (!data.success) throw new Error(data.error || "v1 proxy failed");

            const tx = solanaWeb3.VersionedTransaction.deserialize(Buffer.from(data.swapTransaction, "base64"));

            const sdk = await window.getPhantomSDK?.();
            if (!sdk?.solana) throw new Error("Phantom SDK not available");

            console.log("[Ultra] Requesting SDK signAndSendTransaction...");
            // Removed presignTransaction hook to prevent 403 Forbidden on /prepare
            const result = await sdk.solana.signAndSendTransaction(tx);
            
            console.log("[Ultra] SDK Success, TXID:", result.signature);
            return { success: true, txid: result.signature, router: "v1-proxy" };
        }

        // ==================== INJECTED PHANTOM ====================
        console.log("[Ultra] Signing with Injected Phantom...");
        if (!provider || typeof provider.signTransaction !== 'function') {
            throw new Error("No valid injected provider");
        }

        const vtx = solanaWeb3.VersionedTransaction.deserialize(Buffer.from(quote.transaction, 'base64'));
        const signed = await provider.signTransaction(vtx);
        const signedTxBase64 = btoa(String.fromCharCode(...new Uint8Array(signed.serialize())));

        const executeRes = await fetch('https://lite-api.jup.ag/ultra/v1/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ signedTransaction: signedTxBase64, requestId: quote.requestId })
        });

        if (!executeRes.ok) throw new Error(`Ultra Execute Failed: ${executeRes.status}`);
        const result = await executeRes.json();
        return { success: true, txid: result.signature, router: quote.router || 'OKX/DFlow' };
    } catch (error) {
        if (!handleCancel(error)) console.error("[Ultra] Execute failed:", error);
        throw error;
    }
}

// ==================== V1 FALLBACK ====================
async function performV1Swap(inputMint, outputMint, rawAmount, provider, connectedWallet) {
    try {
        const proxyRes = await fetch('https://giddy-key-swaps-production.up.railway.app/api/swap/v1', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ inputMint, outputMint, rawAmount, connectedWallet })
        });

        const data = await proxyRes.json();
        if (!data.success) throw new Error(data.error || "v1 proxy failed");

        const tx = solanaWeb3.VersionedTransaction.deserialize(Buffer.from(data.swapTransaction, "base64"));
        const result = await provider.signAndSendTransaction(tx);
        return { success: true, txid: result.signature, version: "v1" };
    } catch (error) {
        if (!handleCancel(error)) console.error("[V1 Proxy] Failed:", error.message);
        throw error;
    }
}

// Global Export
window.performUltraSwap = performUltraSwap;
window.performV1Swap = performV1Swap;

// Dispatch ready event
window.dispatchEvent(new CustomEvent('swap-engine-ready'));

console.log("✅ swapUtils.js loaded and READY");