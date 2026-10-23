export default function handler(req, res) {
  try {
    // Vercel में आपने जिस नाम से भी Key सेव की हो, यह उसे ढूंढ लेगा
    const raw = process.env.FIREBASE_CONFIG || process.env.VITE_FIREBASE_CONFIG || "";

    if (!raw) {
      // अगर आपने अलग-अलग वेरिएबल्स बनाए हैं, तो उन्हें भी सपोर्ट करेगा
      if (process.env.FIREBASE_API_KEY || process.env.apiKey) {
        return res.status(200).json({
          apiKey: process.env.FIREBASE_API_KEY || process.env.apiKey,
          authDomain: process.env.FIREBASE_AUTH_DOMAIN || process.env.authDomain,
          projectId: process.env.FIREBASE_PROJECT_ID || process.env.projectId,
          storageBucket: process.env.FIREBASE_STORAGE_BUCKET || process.env.storageBucket,
          messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || process.env.messagingSenderId,
          appId: process.env.FIREBASE_APP_ID || process.env.appId
        });
      }
      return res.status(200).json({ error: "FIREBASE_CONFIG is empty in Vercel" });
    }

    // अगर सीधा Firebase से कॉपी किया हुआ JavaScript ऑब्जेक्ट पेस्ट किया गया है, तो उसमें से वैल्यू निकालना
    const extract = (key) => {
      const match = raw.match(new RegExp(key + '\\s*:\\s*["\']([^"\']+)["\']'));
      return match ? match[1] : undefined;
    };

    if (extract('apiKey')) {
      return res.status(200).json({
        apiKey: extract('apiKey'),
        authDomain: extract('authDomain'),
        projectId: extract('projectId'),
        storageBucket: extract('storageBucket'),
        messagingSenderId: extract('messagingSenderId'),
        appId: extract('appId')
      });
    }

    // अगर शुद्ध JSON फॉर्मेट में है
    return res.status(200).json(JSON.parse(raw));
  } catch (e) {
    return res.status(200).json({ error: e.message });
  }
}
