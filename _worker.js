// web-url-fcm — Direct Neon DB + Firebase FCM. No auth.
const NEON_HOST  = "ep-lingering-haze-aquknql6-pooler.c-8.us-east-1.aws.neon.tech";
const NEON_CONN  = "postgresql://neondb_owner:npg_kP9BDgTWj0xf@ep-lingering-haze-aquknql6-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
const FB_PROJECT = "main-fcm";
const FB_EMAIL   = "firebase-adminsdk-fbsvc@main-fcm.iam.gserviceaccount.com";
const FB_KEY     = "-----BEGIN PRIVATE KEY-----\nMIIEugIBADANBgkqhkiG9w0BAQEFAASCBKQwggSgAgEAAoIBAQDZMJpUVmIkZjuC\nhvHNzJg3Mu9OL/Dw2mXZif8EIn4vE9R1kwQyd68hqBHOwV9Dy0K8zwrIU09GfKND\nh5Aij5TrCobAFzJgiOMDdm8+4a8NXQcx7J/C2Itj5gStYQHxwqmT++ZzNzvmdZkf\nOrY5MhY2zajq+fgpERyHE8KCD0UirFYsWwEqn6lxv9oyGCBkbq9fKfnE5lQxwCDh\nMUDMTMFR1dYkGsbErqTLJfDJ0LS8gf3PCRh2jWsWDYWVsrBtQMOleqIAchciQZ4N\n1CbcYT/HaX+ZkmdcrFSxue0Cb6ihWed7PDlb0bRbqH3+WJ1Z8EHou+pnN6sSdY3u\nA3VRcd9pAgMBAAECgf8CLLZbo3GVsWNliFjTQ6j3+zS0vDeR1xKip/FL0GQYUiXZ\nyfTuKzenhLFrYizKubFUNeIk8fsiItyJWkhpz125sjjHlnChx5/vsdnPwoLvnbKw\nsbxso5RND2ncK6ywzZgL+FeyuPMpgNaRYS2fR9KGLpxtT7V1T1oyey8oAQ9XClRD\nPycROqBAkCrmhcaA5vj1K9kDO/RxAmurS6CtpE9qcUi0eNhBUvPYDRi1eWytvoiF\nCAcJlGoO6qOmi+x1qIGxxwzYwHYv2YHTTcUl2H2wXknpcQ16SzRtUi7ESnArGxkE\ntIO5untib+97Z0n/Rlzc/4tj39qtek2+uML+eRkCgYEA81oXRw3ymSvyISbifRdD\nJjO4f12SuUGmQ4NqEDThd2WZEhX4vqt/D91Bm3mzGha9y0dV991QUTvLHPxJvBlw\nd4mY3enbwtNjB6WKKMoJS32nL9vTsyUZt53ITnGvStJWjbVBfLMxMMdgHWRBZAkx\nhbKZPJoKzVifYtru6LnZgw0CgYEA5Hpp5VdGUp+iiNf7nir+hhdlTsB9aSjDJAZ3\nnWjo9cmD1ZAOhzZ5BbuW13hy4zqErVjKOzsXkrTKzz9sSQspARCRtckFH6S3nPIB\n4CM5qCP650YHxwUsUUwmgPBSJJL+Q+KEZ+6Kh3ewUege6hzZ//UCK/5b4+cQSeyD\nIRQQJs0CgYBuLKCTS85E6K+DsN4jsi91kT77cvrlosJKmKmhUr+tVbMajBYFBRHO\nteZpJI0gx6D/8nkKcglV7dNEeThMz9uqUwKBncogB6IzKRBG7UmOAwJ5WXYcCjT9\ne5LfaPrqzhXfrGtMsLgZlHqAdA5i4wKnvDdCR5+SXogyslotxU6j1QKBgC+h8bfV\ndRy+mSUMWjHEZuHPuNgtOzgUPnKhQoi3mXG8fFamvNClo591V2I+gz0qMwTssOSe\nUjDMrkd8wneL8xV8vdP3P7E0Ju96aLewwFF0htd2eyKbynx8cr6I26cyWf4PGGmO\niqTpaAH7cY5/S1eYXcaMNd4SiwvOWhwoUaG1AoGAGfpFDp5cp210vV360Pf86DFa\nqc5+y+TLRrwLkpE6DlVscDBVDt1NhzaJGgTeo5kniv1c2rdvq0UVR3GdjORQggSf\nptX03BRuoSKtuHZNxWQnqQpMorQmDZgSklJlLTIWv5aq/iyCv78u815rxtvDKNH9\n+hW5Y1czi5JdGikljiw=\n-----END PRIVATE KEY-----\n";

async function neon(sql, params) {
  const r = await fetch('https://' + NEON_HOST + '/sql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Neon-Connection-String': NEON_CONN },
    body: JSON.stringify({ query: sql, params: params || [] })
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.message || JSON.stringify(j));
  return j.rows || [];
}

function b64u(buf) {
  const u8 = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = ''; for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64s(s) { return b64u(new TextEncoder().encode(s)); }
function pem2b(pem) {
  const body = pem.replace(/-----[^\n]+-----/g, '').replace(/\s+/g, '');
  const bin = atob(body); const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i); return out;
}

let _tok = null, _exp = 0;
async function fcmToken() {
  const now = Math.floor(Date.now() / 1000);
  if (_tok && now < _exp - 60) return _tok;
  const hdr = b64s(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const clm = b64s(JSON.stringify({
    iss: FB_EMAIL,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now, exp: now + 3600
  }));
  const msg = new TextEncoder().encode(hdr + '.' + clm);
  const key = await crypto.subtle.importKey(
    'pkcs8', pem2b(FB_KEY),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = b64u(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, msg));
  const jwt = hdr + '.' + clm + '.' + sig;
  const tr = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=' + jwt
  });
  const tj = await tr.json();
  if (!tr.ok) throw new Error('OAuth: ' + JSON.stringify(tj));
  _tok = tj.access_token; _exp = now + (tj.expires_in || 3600);
  return _tok;
}

async function sendFcm(token, data) {
  const at = await fcmToken();
  const sd = {};
  for (const [k, v] of Object.entries(data)) sd[k] = String(v);
  const nested = {};
  for (const [k, v] of Object.entries(sd)) if (k !== 'type') nested[k] = v;
  sd.payload = JSON.stringify(nested);
  const r = await fetch(
    'https://fcm.googleapis.com/v1/projects/' + FB_PROJECT + '/messages:send',
    {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + at, 'content-type': 'application/json' },
      body: JSON.stringify({ message: { token, android: { priority: 'high', ttl: '3600s' }, data: sd } })
    }
  );
  const body = await r.json();
  if (!r.ok) throw Object.assign(new Error('FCM'), { fcmStatus: r.status, fcmBody: body });
  return body;
}

function jres(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' }
  });
}

export default {
  async fetch(request, env) {
    const url  = new URL(request.url);
    const path = url.pathname;

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'GET,POST,OPTIONS',
          'access-control-allow-headers': 'content-type'
        }
      });
    }

    if (path.startsWith('/api/')) {
      try {
        // GET /api/stats
        if (path === '/api/stats' && request.method === 'GET') {
          const [[a],[d],[m],[o],[f]] = await Promise.all([
            neon('SELECT COUNT(*) cnt FROM apps'),
            neon('SELECT COUNT(*) cnt FROM devices'),
            neon('SELECT COUNT(*) cnt FROM messages'),
            neon("SELECT COUNT(*) cnt FROM devices WHERE status='online'"),
            neon('SELECT COUNT(*) cnt FROM devices WHERE fcm_token IS NOT NULL')
          ]);
          return jres({ apps:+a.cnt, devices:+d.cnt, messages:+m.cnt, online:+o.cnt, fcmReady:+f.cnt });
        }

        // GET /api/apps
        if (path === '/api/apps' && request.method === 'GET') {
          const rows = await neon(
            'SELECT a.app_id, a.name, a.status, ' +
            'COUNT(d.id)::int dc, COUNT(CASE WHEN d.fcm_token IS NOT NULL THEN 1 END)::int fc ' +
            'FROM apps a LEFT JOIN devices d ON d.app_id=a.app_id ' +
            'GROUP BY a.id,a.app_id,a.name,a.status ORDER BY a.id'
          );
          return jres(rows.map(r => ({
            appId: r.app_id, name: r.name, status: r.status,
            deviceCount: r.dc, fcmCount: r.fc
          })));
        }

        // GET /api/devices?appId=...
        if (path === '/api/devices' && request.method === 'GET') {
          const aid = url.searchParams.get('appId');
          const rows = aid
            ? await neon('SELECT device_id,app_id,name,status,fcm_token FROM devices WHERE app_id=$1 ORDER BY name', [aid])
            : await neon('SELECT device_id,app_id,name,status,(fcm_token IS NOT NULL) has_fcm FROM devices ORDER BY app_id,name');
          return jres(rows.map(r => ({
            deviceId: r.device_id, appId: r.app_id, name: r.name,
            status: r.status, hasFcm: !!(r.fcm_token || r.has_fcm)
          })));
        }

        // POST /api/send  { deviceId, data }
        if (path === '/api/send' && request.method === 'POST') {
          const body = await request.json();
          const { deviceId, data } = body;
          if (!deviceId) return jres({ error: 'deviceId required' }, 400);
          const rows = await neon('SELECT fcm_token FROM devices WHERE device_id=$1', [deviceId]);
          if (!rows.length || !rows[0].fcm_token) return jres({ error: 'no FCM token' }, 404);
          const result = await sendFcm(rows[0].fcm_token, data || {});
          return jres(result);
        }

        return jres({ error: 'not found' }, 404);
      } catch (e) {
        if (e.fcmBody) return jres({ error: e.fcmBody }, e.fcmStatus || 500);
        return jres({ error: e.message }, 500);
      }
    }

    return env.ASSETS.fetch(request);
  }
};
