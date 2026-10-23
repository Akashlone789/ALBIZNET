export default function handler(req, res) {
  try {
    const env = process.env;

    // Vercel मधील तुमच्या ६ व्हेरिएबल्सना आपोआप शोधणारे स्मार्ट फंक्शन
    const findEnv = (...keywords) => {
      for (const k of Object.keys(env)) {
        const up = k.toUpperCase();
        if (keywords.every(w => up.includes(w))) {
          return env[k];
        }
      }
      return "";
    };

    const config = {
      apiKey: env.FIREBASE_API_KEY || env.VITE_FIREBASE_API_KEY || findEnv("API", "KEY") || findEnv("FIREBASE", "KEY"),
      authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || env.FIREBASE_AUTH_DOMAIN || findEnv("AUTH", "DOMAIN"),
      projectId: env.VITE_FIREBASE_PROJECT_ID || env.FIREBASE_PROJECT_ID || findEnv("PROJECT", "ID"),
      storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || env.FIREBASE_STORAGE_BUCKET || findEnv("STORAGE", "BUCKET") || findEnv("BUCKET"),
      messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || env.FIREBASE_MESSAGING_SENDER_ID || findEnv("SENDER", "ID"),
      appId: env.VITE_FIREBASE_APP_ID || env.FIREBASE_APP_ID || findEnv("APP", "ID")
    };

    return res.status(200).json(config);
  } catch (e) {
    return res.status(200).json({ error: e.message });
  }
}
