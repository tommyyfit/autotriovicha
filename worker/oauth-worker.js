/**
 * ═══════════════════════════════════════════════════════════════
 *  Cloudflare Worker — GitHub OAuth proxy pro Decap CMS
 *  Soubor: worker/oauth-worker.js
 * ═══════════════════════════════════════════════════════════════
 *
 *  NÁVOD K NASAZENÍ (jednorázově):
 *  ─────────────────────────────────────────────────────────────
 *  1. Na GitHubu: Settings → Developer settings → OAuth Apps → New OAuth App
 *       Homepage URL:      https://tvuj-web.pages.dev
 *       Callback URL:      https://tvuj-oauth-worker.tvůj-nick.workers.dev/callback
 *     → Zkopíruj Client ID a vygeneruj Client Secret.
 *
 *  2. Na Cloudflare: Workers & Pages → Create Worker → vlož tento kód.
 *
 *  3. V nastavení Workeru (Settings → Variables) přidej:
 *       GITHUB_CLIENT_ID      = (z kroku 1)
 *       GITHUB_CLIENT_SECRET  = (z kroku 1)  ← jako Secret (šifrovaná hodnota)
 *
 *  4. URL Workeru (např. https://autotrio-oauth.mujnick.workers.dev)
 *     vlož do admin/config.yml jako base_url.
 *
 *  5. Hotovo. Pan Vícha se přihlásí přes GitHub tlačítko v /admin.
 * ═══════════════════════════════════════════════════════════════
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // CORS headers — povolíme pouze tvůj web
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // ── /auth ── Přesměruj uživatele na GitHub přihlášení ──────
    if (url.pathname === '/auth') {
      const githubAuthUrl = new URL('https://github.com/login/oauth/authorize');
      githubAuthUrl.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
      githubAuthUrl.searchParams.set('scope', 'repo,user');
      githubAuthUrl.searchParams.set('state', crypto.randomUUID());
      return Response.redirect(githubAuthUrl.toString(), 302);
    }

    // ── /callback ── GitHub nás sem přesměruje s ?code= ────────
    if (url.pathname === '/callback') {
      const code = url.searchParams.get('code');

      if (!code) {
        return new Response('Chybí autorizační kód od GitHubu.', { status: 400 });
      }

      // Vyměníme code za access token
      let tokenData;
      try {
        const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            client_id: env.GITHUB_CLIENT_ID,
            client_secret: env.GITHUB_CLIENT_SECRET,
            code,
          }),
        });
        tokenData = await tokenResponse.json();
      } catch (err) {
        return new Response('Nepodařilo se získat token od GitHubu.', { status: 502 });
      }

      if (tokenData.error) {
        return new Response(`GitHub chyba: ${tokenData.error_description}`, { status: 401 });
      }

      // Decap CMS očekává tuto konkrétní HTML stránku s postMessage
      // (toto je standardní protokol pro Decap external OAuth)
      const html = `<!DOCTYPE html>
<html>
<head><title>Přihlášení...</title></head>
<body>
<script>
  const receiveMessage = (e) => {
    window.opener.postMessage(
      'authorization:github:success:${JSON.stringify({ token: tokenData.access_token, provider: 'github' }).replace(/'/g, "\\'")}',
      e.origin
    );
    window.removeEventListener('message', receiveMessage, false);
  };
  window.addEventListener('message', receiveMessage, false);
  window.opener.postMessage('authorizing:github', '*');
<\/script>
</body>
</html>`;

      return new Response(html, {
        headers: { 'Content-Type': 'text/html; charset=utf-8', ...corsHeaders },
      });
    }

    return new Response('Cloudflare OAuth Worker běží. Endpoint: /auth nebo /callback', {
      status: 200,
      headers: corsHeaders,
    });
  },
};
