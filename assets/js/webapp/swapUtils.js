// assets/js/webapp/swapUtils.js

// Helper to handle cancellations silently
const handleCancel = (err) => {
    const msg = err?.message || "";
    if (msg.includes("rejected") || msg.includes("cancelled") || msg.includes("user declined")) {
        console.log("[Ultra] Swap cancelled by user");
        throw new Error("USER_REJECTED");
    }
    return false;
};

// ==================== ULTRA SWAP (Primary) ====================
async function performUltraSwap(inputMint, outputMint, rawAmount, provider, connectedWallet) {
    if (rawAmount < 100000) {
        console.warn("[Ultra] Amount too small, skipping Ultra quote");
        throw new Error("Amount too small — try a larger swap");
    }

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

// ==================== SMART SIGNING WITH CLEVER DETECTION ====================
async function executeUltraTransaction(quote, providerParam) {
    const connectionMethod = window.connectionMethod || localStorage.getItem('connection_method') || 'injected';
    console.log(`[Ultra] Detected connection method: ${connectionMethod}`);

    let signer = null;
    let isEmbedded = false;

    if (connectionMethod === 'google' || connectionMethod === 'apple') {
        // === EMBEDDED WALLETS (Google / Apple) ===
        isEmbedded = true;
        console.log("[Ultra] Embedded wallet detected — forcing SDK signer only");
        const sdk = await window.getPhantomSDK?.();
        if (sdk?.solana) {
            signer = sdk.solana;
            console.log("✅ Using Phantom SDK signer (Google/Apple)");
        }
    } else {
        // === INJECTED WALLETS (Phantom extension / app) ===
        console.log("[Ultra] Injected wallet detected — prioritizing window.solana");
        
        if (providerParam && typeof providerParam.signTransaction === 'function') {
            signer = providerParam;
            console.log("✅ Using legacy provider (injected)");
        } 
        else if (window.solana?.isPhantom) {
            signer = window.solana;
            console.log("✅ Using direct window.solana (injected)");
        } 
        else {
            // Last resort fallback for injected
            const sdk = await window.getPhantomSDK?.();
            if (sdk?.solana) {
                signer = sdk.solana;
                console.log("✅ Using SDK signer as fallback for injected");
            }
        }
    }

    if (!signer) {
        throw new Error(`No valid signer found for connection type: ${connectionMethod}`);
    }

    // For embedded wallets we prefer the stable v1 proxy path
    if (isEmbedded) {
        console.log("[Ultra] Embedded wallet → using v1 proxy for reliable signing");
        return await performV1Swap(
            quote.inputMint || "So11111111111111111111111111111111111111112",
            quote.outputMint,
            quote.inAmount || quote.amount,
            providerParam,
            window.connectedWallet
        );
    }

    // Injected path → try direct Jupiter Ultra execute first
    try {
        console.log("[Ultra] Injected → attempting direct Jupiter Ultra execute");
        const vtx = solanaWeb3.VersionedTransaction.deserialize(Buffer.from(quote.transaction, 'base64'));
        const signed = await signer.signTransaction(vtx);
        
        const signedTxBase64 = btoa(String.fromCharCode(...new Uint8Array(signed.serialize())));

        const executeRes = await fetch('https://lite-api.jup.ag/ultra/v1/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                signedTransaction: signedTxBase64, 
                requestId: quote.requestId 
            })
        });

        if (!executeRes.ok) throw new Error(`Ultra Execute HTTP ${executeRes.status}`);
        const result = await executeRes.json();

        if (!result.signature) throw new Error("Ultra execute did not return signature");

        console.log(`✅ SUCCESS (Ultra direct)! TX: ${result.signature}`);
        return { success: true, txid: result.signature, router: "Ultra" };

    } catch (ultraErr) {
        console.warn("[Ultra] Direct Ultra execute failed, falling back to v1 proxy...", ultraErr.message);
        if (!handleCancel(ultraErr)) {
            return await performV1Swap(
                quote.inputMint || "So11111111111111111111111111111111111111112",
                quote.outputMint,
                quote.inAmount || quote.amount,
                providerParam,
                window.connectedWallet
            );
        }
        throw ultraErr;
    }
}

// ==================== V1 PROXY FALLBACK ====================
async function performV1Swap(inputMint, outputMint, rawAmount, provider, connectedWallet) {
    try {
        console.log("[V1 Proxy] Using fallback proxy");
        const proxyRes = await fetch('https://giddy-key-swaps-production.up.railway.app/api/swap/v1', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ inputMint, outputMint, rawAmount, connectedWallet })
        });

        const data = await proxyRes.json();
        if (!data.success) throw new Error(data.error || "v1 proxy failed");

        const tx = solanaWeb3.VersionedTransaction.deserialize(Buffer.from(data.swapTransaction, "base64"));
        
        // Re-detect signer for v1 path (respects Google/Apple vs injected)
        const connectionMethod = window.connectionMethod || localStorage.getItem('connection_method') || 'injected';
        let signer = null;

        if (connectionMethod === 'google' || connectionMethod === 'apple') {
            const sdk = await window.getPhantomSDK?.();
            signer = sdk?.solana || null;
        } else {
            signer = provider || window.solana || (await window.getPhantomSDK?.())?.solana;
        }

        if (!signer) throw new Error("No signer available for v1 fallback");

        const result = await signer.signAndSendTransaction(tx);
        return { success: true, txid: result.signature, version: "v1" };
    } catch (error) {
        if (!handleCancel(error)) console.error("[V1 Proxy] Failed:", error.message);
        throw error;
    }
}

// Global Export
window.performUltraSwap = performUltraSwap;
window.performV1Swap = performV1Swap;

console.log("✅ swapUtils.js loaded — Smart detection active (Google/Apple → SDK only | Injected → window.solana priority)");