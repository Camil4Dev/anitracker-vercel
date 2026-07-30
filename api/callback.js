// api/callback.js — acepta el código via GET (redirect de AniList)
// y también via POST (fetch desde la extensión)
export default async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(200).end();

  const CLIENT_ID     = process.env.ANILIST_CLIENT_ID;
  const CLIENT_SECRET = process.env.ANILIST_CLIENT_SECRET;
  const REDIRECT_URI  = process.env.ANILIST_REDIRECT_URI;

  // POST: la extensión manda el código directamente
  if (req.method === "POST") {
    const { code, redirect_uri } = req.body;
    if (!code) return res.status(400).json({ error: "no_code" });

    try {
      const tokenRes = await fetch("https://anilist.co/api/v2/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          grant_type:    "authorization_code",
          client_id:     CLIENT_ID,
          client_secret: CLIENT_SECRET,
          redirect_uri:  redirect_uri || REDIRECT_URI,
          code,
        }),
      });
      const data = await tokenRes.json();
      if (!data.access_token) return res.status(400).json({ error: "token_error", detail: data });
      return res.status(200).json({ access_token: data.access_token });
    } catch (err) {
      return res.status(500).json({ error: "server_error", detail: err.message });
    }
  }

  // GET: redirect clásico de AniList (para cuando la redirect URI es chromiumapp.org)
  const { code, error } = req.query;
  if (error || !code) {
    return res.redirect(`/callback-result.html?error=${encodeURIComponent(error || "no_code")}`);
  }
  try {
    const tokenRes = await fetch("https://anilist.co/api/v2/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        grant_type:    "authorization_code",
        client_id:     CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri:  REDIRECT_URI,
        code,
      }),
    });
    const data = await tokenRes.json();
    if (!data.access_token) return res.redirect(`/callback-result.html?error=token_error`);
    return res.redirect(`/callback-result.html#token=${encodeURIComponent(data.access_token)}`);
  } catch (err) {
    return res.redirect(`/callback-result.html?error=server_error`);
  }
}
