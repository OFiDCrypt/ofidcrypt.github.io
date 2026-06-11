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

      const total = market.total_supply || 0;
      const circulating = market.circulating_supply || 0;
      const max = market.max_supply || 0;

      fs.writeFileSync('total.txt', total.toString());
      fs.writeFileSync('circulating.txt', circulating.toString());
      fs.writeFileSync('max.txt', max.toString());

      console.log('✅ All supply files updated');
    } catch (err) {
      console.error('❌ Error parsing CoinGecko response:', err);
    }
  });
}).on('error', err => {
  console.error('❌ Request failed:', err);
});