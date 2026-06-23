// assets/js/webapp/swapUtils.js

// ==================== ULTRA SWAP (Primary) ====================
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
        // Suppress logging if the user simply cancelled the swap
        if (error.message !== "USER_REJECTED") {
            console.error("[Ultra] Failed:", error.message);
        }
        throw error;
    }
}

// ==================== SMART SIGNING (Injected + Browser SDK) ====================
async function executeUltraTransaction(quote, provider) {
    try {
        const txBuffer = Buffer.from(quote.transaction, 'base64');
        const vtx = solanaWeb3.VersionedTransaction.deserialize(txBuffer);

        const connectionMethod = window.connectionMethod || localStorage.getItem('connection_method');
        let signedTx;

        // 1. PHANTOM BROWSER SDK (Google / Apple)
        if (connectionMethod === 'google' || connectionMethod === 'apple') {
            console.log("[Ultra] Signing with Phantom Browser SDK (solana namespace)...");

            const sdk = await window.getPhantomSDK?.();
            if (!sdk?.solana) throw new Error("Phantom SDK solana provider not available");

            try {
                signedTx = await sdk.solana.signTransaction(vtx);
            } catch (err) {
                // Check for user rejection
                if (err.message && (err.message.includes("rejected") || err.message.includes("cancelled"))) {
                    throw new Error("USER_REJECTED");
                }
                throw err;
            }
        } 
        // 2. INJECTED PHANTOM (Extension / In-App)
        else {
            console.log("[Ultra] Signing with Injected Phantom Provider...");
            try {
                signedTx = await provider.signTransaction(vtx);
            } catch (err) {
                if (err.message && (err.message.includes("rejected") || err.message.includes("cancelled"))) {
                    throw new Error("USER_REJECTED");
                }
                throw err;
            }
        }

        // Serialize and Execute
        const signedBytes = signedTx.serialize();
        const signedTxBase64 = btoa(String.fromCharCode(...new Uint8Array(signedBytes)));

        const executeRes = await fetch('https://lite-api.jup.ag/ultra/v1/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                signedTransaction: signedTxBase64,
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

    } catch (error) {
        if (error.message !== "USER_REJECTED") {
            console.error("[Ultra] Execute failed:", error);
        }
        throw error;
    }
}

// ==================== V1 FALLBACK ====================
async function performV1Swap(inputMint, outputMint, rawAmount, provider, connectedWallet) {
    try {
        const proxyUrl = getApiUrl('/api/swap/v1');
        const proxyRes = await fetch(proxyUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ inputMint, outputMint, rawAmount, connectedWallet })
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

// Global Export
window.performUltraSwap = performUltraSwap;
window.performV1Swap = performV1Swap;

console.log("✅ swapUtils.js loaded (Robust SDK, Provider support + Silent Cancel)");