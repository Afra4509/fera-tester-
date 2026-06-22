(function() {
  var SUPABASE_URL = 'https://njqmyegvczsnajratjnp.supabase.co';
  var SUPABASE_ANON_KEY = 'sb_publishable_xAEflwp9pcEsIUqWC9nVBA_mMhjME7l';
  
  function sendTrack() {
    var sessionId = localStorage.getItem('traffic_session_id');
    if (!sessionId) {
      sessionId = 'sess_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('traffic_session_id', sessionId);
    }

    // We fetch a free public IP API to get the client IP, or we just rely on Supabase Edge functions if we had them.
    // Since we are hitting Supabase REST API directly from the client, we cannot easily read the client IP unless we use a third party, 
    // or we just send 'client' and let Supabase DB functions infer it if we wanted to. 
    // To keep it simple, we'll just log 'unknown' or try to fetch it if we want.
    // Actually, we don't strictly need the IP for RPS and active visitors since we have sessionId.
    // We will just log it with fetch.

    var payload = {
      session_id: sessionId,
      ip_address: 'client' // For true IP, you would use an Edge Function or trigger in Supabase.
    };

    fetch(SUPABASE_URL + '/rest/v1/traffic_logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
        'Prefer': 'return=minimal' // Don't return inserted row to save bandwidth
      },
      body: JSON.stringify(payload)
    }).catch(function(e){});
  }

  // Send track on load
  sendTrack();
  
  // Keep alive every 30 seconds
  setInterval(sendTrack, 30000);
})();
