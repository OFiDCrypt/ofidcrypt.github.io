const fs = require('fs');
const https = require('https');

const url = 'https://api.coingecko.com/api/v3/coins/solana/contract/GsKuLQsKCEnfQxuk4icTEQjc11Av8WiqW31CxZqZpump';

https.get(url, (res) => {
  let data = '';

  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      const market = json.market_data;

      const supplyData = {
        circulating_supply: market.circulating_supply || 0,
        total_supply: market.total_supply || 0,
        max_supply: market.max_supply || 0,
        last_updated: new Date().toISOString()
      };

      fs.writeFileSync('supply.json', JSON.stringify(supplyData, null, 2));
      console.log('✅ supply.json updated');
    } catch (err) {
      console.error('❌ Error parsing CoinGecko response:', err);
    }
  });
}).on('error', err => {
  console.error('❌ Request failed:', err);
});