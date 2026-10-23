export default function handler(req, res) {
  try {
    const raw = process.env.FIREBASE_CONFIG || "{}";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const config = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(raw);
    res.status(200).json(config);
  } catch (e) {
    res.status(200).json({ error: e.message });
  }
}
