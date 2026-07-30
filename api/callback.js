export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const { code, error } = req.query;

  const CLIENT_ID     = process.env.ANILIST_CLIENT_ID;
  const CLIENT_SECRET = process.env.ANILIST_CLIENT_SECRET;
  const REDIRECT_URI  = process.env.ANILIST_REDIRECT_URI;

  // URL base de la extensión — chrome.identity intercepta esta URL automáticamente
  // y cierra la ventana sola sin que el usuario tenga que hacer nada.
  const EXTENSION_REDIRECT = REDIRECT_URI; // https://ID.chromiumapp.org/

  if (error || !code) {
    return res.redirect(
      `${EXTENSION_REDIRECT}?error=${encodeURIComponent(error || "no_code")}`
    );
  }

  if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI) {
    return res.status(500).json({ error: "Server misconfiguration" });
  }

  try {
    const tokenRes = await fetch("https://anilist.co/api/v2/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
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
      console.error("[AniTracker] Sin access_token:", tokenData);
      return res.redirect(
        `${EXTENSION_REDIRECT}?error=token_error`
      );
    }

    // Redirige a chromiumapp.org con el token en el hash.
    // chrome.identity lo intercepta automáticamente y cierra la ventana.
    return res.redirect(
      `${EXTENSION_REDIRECT}#token=${encodeURIComponent(tokenData.access_token)}`
    );

  } catch (err) {
    console.error("[AniTracker] Error:", err);
    return res.redirect(`${EXTENSION_REDIRECT}?error=server_error`);
  }
}
