// assets/js/webapp/swapUtils.js

// Helper to handle user cancellations
const handleCancel = (err) => {
    const msg = err?.message || "";
    if (msg.includes("rejected") || msg.includes("cancelled") || msg.includes("user declined") || msg.includes("403")) {
        console.log("[Swap] Cancelled or 403 Forbidden");
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

// ==================== SMART SIGNING (Phantom SDK Best Practices) ====================
async function executeUltraTransaction(quote, providerParam) {
    const connectionMethod = window.connectionMethod || localStorage.getItem('connection_method') || 'injected';
    console.log(`[Ultra] Connection: ${connectionMethod} | Wallet: ${window.connectedWallet?.slice(0,8)}...`);

    let signer = null;

    if (connectionMethod === 'google' || connectionMethod === 'apple') {
        const sdk = await window.getPhantomSDK?.();
        signer = sdk?.solana;
    } else {
        if (providerParam && typeof providerParam.signTransaction === 'function') {
            signer = providerParam;
        } else if (window.solana?.isPhantom) {
            signer = window.solana;
        } else {
            const sdk = await window.getPhantomSDK?.();
            signer = sdk?.solana;
        }
    }

    if (!signer) throw new Error("No valid signer found for this wallet type");

    try {
        // FIX: Extract base64 string safely. If it's an object, try to find the transaction key
        const txData = typeof quote.transaction === 'string' 
            ? quote.transaction 
            : (quote.transaction.swapTransaction || quote.transaction.data);
            
        if (!txData) throw new Error("Invalid transaction data format");

        console.log("[Ultra] Deserializing transaction...");
        const vtx = solanaWeb3.VersionedTransaction.deserialize(Buffer.from(txData, 'base64'));

        console.log("[Ultra] Signing & sending...");
        const result = await signer.signAndSendTransaction(vtx);

        console.log(`✅ Ultra Success! TX: ${result.signature || result.hash}`);
        return { success: true, txid: result.signature || result.hash, router: "Ultra" };

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

// ==================== V1 PROXY FALLBACK ====================
async function performV1Swap(inputMint, outputMint, rawAmount, provider, connectedWallet) {
    try {
        console.log("[V1 Proxy] Using backend proxy");
        const proxyRes = await fetch('https://giddy-key-swaps-production.up.railway.app/api/swap/v1', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ inputMint, outputMint, rawAmount, connectedWallet })
        });

        const data = await proxyRes.json();
        if (!data.success) throw new Error(data.error || "Proxy failed");

        // FIX: Safe extraction for V1 proxy as well
        const txData = typeof data.swapTransaction === 'string' ? data.swapTransaction : data.swapTransaction.data;
        const tx = solanaWeb3.VersionedTransaction.deserialize(Buffer.from(txData, "base64"));

        const connectionMethod = window.connectionMethod || localStorage.getItem('connection_method') || 'injected';
        let signer = null;

        if (connectionMethod === 'google' || connectionMethod === 'apple') {
            const sdk = await window.getPhantomSDK?.();
            signer = sdk?.solana;
        } else {
            signer = provider || window.phantom?.solana || window.solana || (await window.getPhantomSDK?.())?.solana;
        }

        if (!signer) throw new Error("No signer available for v1 fallback");

        const result = await signer.signAndSendTransaction(tx);
        console.log(`✅ v1 Proxy Success! TX: ${result.signature || result.hash}`);
        return { success: true, txid: result.signature || result.hash, version: "v1" };

    } catch (error) {
        if (!handleCancel(error)) console.error("[V1 Proxy] Failed:", error.message);
        throw error;
    }
}

window.performUltraSwap = performUltraSwap;
window.performV1Swap = performV1Swap;
console.log("✅ swapUtils.js loaded (Fixed Serialization Error)");