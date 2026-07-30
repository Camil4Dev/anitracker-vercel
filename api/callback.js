// ─────────────────────────────────────────────────────────────
// AniTracker · api/callback.js  (Vercel Serverless Function)
//
// AniList redirige acá después de que el usuario autoriza.
// Este endpoint intercambia el código por un access_token
// usando el Client Secret (que NUNCA sale del servidor).
//
// Luego redirige al usuario a una página de éxito que la
// extensión puede detectar mediante chrome.identity.
// ─────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  // Preflight CORS
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const { code, error } = req.query;

  if (error || !code) {
    return res.redirect(
      `/callback-result.html?error=${encodeURIComponent(error || "no_code")}`
    );
  }

  // Variables de entorno de Vercel (nunca expuestas al cliente)
  const CLIENT_ID     = process.env.ANILIST_CLIENT_ID;
  const CLIENT_SECRET = process.env.ANILIST_CLIENT_SECRET;
  const REDIRECT_URI  = process.env.ANILIST_REDIRECT_URI; // https://tu-app.vercel.app/api/callback

  if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI) {
    console.error("[AniTracker] Faltan variables de entorno.");
    return res.status(500).json({ error: "Server misconfiguration" });
  }

  try {
    // Intercambio código → access_token
    const tokenRes = await fetch("https://anilist.co/api/v2/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept":       "application/json",
      },
      body: JSON.stringify({
        grant_type:    "authorization_code",
        client_id:     CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri:  REDIRECT_URI,
        code,
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
      console.error("[AniTracker] AniList no devolvió access_token:", tokenData);
      return res.redirect(
        `/callback-result.html?error=${encodeURIComponent("token_error")}`
      );
    }

    // Redirige a la página de resultado pasando el token en el hash
    // (el hash nunca se envía al servidor, es solo para la extensión)
    return res.redirect(
      `/callback-result.html#token=${encodeURIComponent(tokenData.access_token)}`
    );

  } catch (err) {
    console.error("[AniTracker] Error en callback:", err);
    return res.redirect(
      `/callback-result.html?error=${encodeURIComponent("server_error")}`
    );
  }
}
