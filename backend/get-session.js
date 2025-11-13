// Простой скрипт для получения session string
const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/auth-telegram/get-session',
  method: 'GET'
};

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      if (json.sessionString) {
        console.log('\n=== TELEGRAM SESSION STRING ===');
        console.log(json.sessionString);
        console.log('\nОбновите TELEGRAM_SESSION в .env файле этой строкой');
        console.log('================================\n');
      } else {
        console.error('Error:', json);
      }
    } catch (e) {
      console.error('Failed to parse response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('Request failed:', error.message);
  console.log('\nУбедитесь, что API сервер запущен (npm run dev)');
});

req.end();
