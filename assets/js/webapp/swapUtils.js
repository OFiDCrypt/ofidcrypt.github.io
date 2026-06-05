// assets/js/webapp/swapUtils.js

// ==================== ULTRA SWAP (Primary - No API Key) ====================
async function performUltraSwap(inputMint, outputMint, rawAmount, provider, connectedWallet) {
    try {
        console.log(`[Ultra] Requesting quote: ${rawAmount} from ${inputMint} to ${outputMint}`);

        const ultraRes = await fetch(
            `https://lite-api.jup.ag/ultra/v1/order?inputMint=${inputMint}&outputMint=${outputMint}&amount=${rawAmount}&taker=${connectedWallet}`
        );

        if (!ultraRes.ok) {
            const errText = await ultraRes.text().catch(() => '');
            throw new Error(`Ultra HTTP ${ultraRes.status}: ${errText}`);
        }

        const quote = await ultraRes.json();

        if (quote.error) throw new Error(`Ultra Quote Error: ${JSON.stringify(quote.error)}`);
        if (!quote.transaction) throw new Error("Ultra returned no transaction");

        console.log(`[Ultra] Success | Router: ${quote.router || 'unknown'}`);

        return await executeUltraTransaction(quote, provider);
    } catch (error) {
        console.error("[Ultra] Failed:", error.message);
        throw error;
    }
}

async function executeUltraTransaction(quote, provider) {
    const txBuffer = Buffer.from(quote.transaction, 'base64');
    const vtx = solanaWeb3.VersionedTransaction.deserialize(txBuffer);
    
    const signed = await provider.signTransaction(vtx);
    const signedTx = Buffer.from(signed.serialize()).toString('base64');

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
        throw new Error(`Ultra Execute Failed: ${executeRes.status} ${errText}`);
    }

    const result = await executeRes.json();
    return {
        success: true,
        txid: result.signature,
        router: quote.router || 'OKX/DFlow'
    };
}

// ==================== V1 FALLBACK via Backend Proxy (NOW DYNAMIC) ====================
async function performV1Swap(inputMint, outputMint, rawAmount, provider, connectedWallet) {
    try {
        const proxyUrl = getApiUrl('/api/swap/v1');   // ← uses CONFIG automatically

        console.log(`[V1 Proxy] Using dynamic URL: ${proxyUrl}`);

        const proxyRes = await fetch(proxyUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                inputMint,
                outputMint,
                rawAmount,
                connectedWallet
            })
        });

        const data = await proxyRes.json();
        if (!data.success) throw new Error(data.error || "v1 proxy failed");

        const tx = solanaWeb3.VersionedTransaction.deserialize(
            Buffer.from(data.swapTransaction, "base64")
        );

        const result = await provider.signAndSendTransaction(tx);

        return {
            success: true,
            txid: result.signature,
            version: "v1"
        };
    } catch (error) {
        console.error("[V1 Proxy] Failed:", error.message);
        throw error;
    }
}

// Make available globally
window.performUltraSwap = performUltraSwap;
window.performV1Swap = performV1Swap;

console.log("✅ swapUtils.js loaded (Ultra primary + dynamic v1 proxy)");