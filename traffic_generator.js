const https = require('https');

const SUPABASE_URL = 'https://njqmyegvczsnajratjnp.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_xAEflwp9pcEsIUqWC9nVBA_mMhjME7l';

// Generates a random IP address
function getRandomIp() {
  return `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
}

// Generates a random Session ID
function getRandomSession() {
  return 'sess_' + Math.random().toString(36).substr(2, 9);
}

const activeSessions = new Set();
for (let i = 0; i < 50; i++) {
  activeSessions.add(getRandomSession());
}
const sessionsArray = Array.from(activeSessions);

function sendRequest() {
  const sessionId = sessionsArray[Math.floor(Math.random() * sessionsArray.length)];
  const ip = getRandomIp();

  const data = JSON.stringify({ 
    session_id: sessionId,
    ip_address: ip
  });

  const options = {
    hostname: SUPABASE_URL.replace('https://', ''),
    path: '/rest/v1/traffic_logs',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length,
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Prefer': 'return=minimal'
    }
  };

  const req = https.request(options, (res) => {
    res.on('data', () => {}); // consume
  });

  req.on('error', (error) => {
    console.error('Error sending traffic:', error.message);
  });

  req.write(data);
  req.end();
}

console.log('Starting Supabase traffic generation...');

// Send requests at random intervals to simulate organic traffic
// WARNING: Sending too many requests to Supabase might hit rate limits on free tier.
setInterval(() => {
  const burst = Math.floor(Math.random() * 3) + 1;
  for (let i = 0; i < burst; i++) {
    sendRequest();
  }
}, 300); // 3-10 RPS

setInterval(() => {
  sessionsArray.push(getRandomSession());
  if (sessionsArray.length > 200) {
    sessionsArray.shift();
  }
}, 2000);
