export default function handler(req, res) {
  try {
    const raw = process.env.FIREBASE_CONFIG;
    
    if (!raw) {
      return res.status(200).json({ error: "FIREBASE_CONFIG अजून Vercel मध्ये मिळालेला नाही. कृपया Redeploy करा." });
    }

    const config = JSON.parse(raw);
    return res.status(200).json(config);
  } catch (e) {
    return res.status(200).json({ error: "JSON Parse Error: " + e.message });
  }
}
