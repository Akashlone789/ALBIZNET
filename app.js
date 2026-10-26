// =========================================================
// ALBIZNET - ULTIMATE PRO ENGINE (app.js)
// Messenger Chat | Video Reels | 24h Auto-Delete Stories |
// Instagram Notifications | 3-Button Post (Like/Unlike, Comment Drawer, Share)
// =========================================================

let auth = null;
let db = null;
let currentUserData = null;
let activeProfileUser = null;
let authAccountType = 'people';
let currentCreateMode = 'Post';
let uploadedDataURL = '';
let uploadedMediaType = 'image'; // 'image' or 'video'

// फिल्टर आणि टॅब स्टेट्स
let activeExploreFilter = 'Offers';
let activeNearbyFilter = 'All';
let activePeopleTab = 'posts';
let activeMsgTab = 'Inbox';
let activeCatalogFilter = 'All';

// सक्रिय चॅट आणि कमेंट स्टेट्स
let activeChatDocId = null;
let activeChatPeerName = '';
let activeChatPeerAvatar = '';
let activeChatPeerUid = '';
let activeCommentPostId = null;

// रिअल-टाईम कॅशे
let cachePosts = [];
let cacheReels = [];
let cacheStories = [];
let cacheNotes = [];
let cacheOffers = [];
let cacheProducts = [];
let cacheBusinesses = [];
let cacheChats = [];
let cacheNotifications = [];

// =========================================================
// 0. FIREBASE SDK LOADER & DYNAMIC UI INJECTOR
// =========================================================
function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

async function initRealFirebaseApp() {
  try {
    injectProModalsIntoDOM(); // चॅट, नोटिफिकेशन आणि कमेंट बॉक्स तयार करा
    setupVideoFileInput();    // रीलसाठी व्हिडिओ अपलोड सपोर्ट जोडा

    if (typeof firebase === 'undefined') {
      await loadScript('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
      await loadScript('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth-compat.js');
      await loadScript('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore-compat.js');
    }

    let config = null;
    const cached = localStorage.getItem('albiznet_fb_config_cache');
    if (cached) {
      try { config = JSON.parse(cached); } catch (e) {}
    }

    if (!config || !config.apiKey) {
      const res = await fetch('/api/config');
      const data = await res.json();
      config = typeof data === 'string' ? JSON.parse(data) : data;
      if (config && config.apiKey) {
        localStorage.setItem('albiznet_fb_config_cache', JSON.stringify(config));
      }
    }

    if (!firebase.apps.length) {
      firebase.initializeApp(config);
    }

    auth = firebase.auth();
    db = firebase.firestore();
    db.enablePersistence({ synchronizeTabs: true }).catch(() => {});

    setupNotificationBell();

    auth.onAuthStateChanged(async (user) => {
      if (user) {
        const docRef = db.collection('users').doc(user.uid);
        const snap = await docRef.get();
        if (snap.exists) {
          currentUserData = { uid: user.uid, ...snap.data() };
        } else {
          currentUserData = {
            uid: user.uid,
            type: authAccountType || 'people',
            name: user.displayName || (user.email ? user.email.split('@')[0] : 'ALBIZNET User'),
            handle: '@' + (user.email ? user.email.split('@')[0] : 'user').toLowerCase().replace(/\s+/g, ''),
            category: authAccountType === 'business' ? 'Shops' : 'Personal Account',
            about: `Hi! I'm on ALBIZNET.`,
            location: 'Ardhapur, Maharashtra',
            phone: user.phoneNumber || '',
            email: user.email || '',
            avatar: user.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
            followersCount: 0,
            followingCount: 0,
            postsCount: 0,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          };
          await docRef.set(currentUserData);
        }
        launchMainApp();
      } else {
        document.getElementById('main-app-shell').style.display = 'none';
        document.getElementById('auth-screen').style.display = 'none';
        document.getElementById('welcome-screen').style.display = 'flex';
      }
    });
  } catch (err) {
    console.error('Firebase Init Error:', err);
  }
}

document.addEventListener('DOMContentLoaded', initRealFirebaseApp);

function showToast(msg) {
  let t = document.getElementById('custom-toast');
  if (!t) return;
  t.innerHTML = msg;
  t.style.display = 'block';
  setTimeout(() => { t.style.display = 'none'; }, 3200);
}

// =========================================================
// PRO UI INJECTOR (MESSENGER SCREEN, IG NOTIFICATIONS, COMMENT SHEET)
// =========================================================
function injectProModalsIntoDOM() {
  if (document.getElementById('pro-messenger-modal')) return;

  const wrapper = document.createElement('div');
  wrapper.innerHTML = `
    <!-- 1. MESSENGER STYLE FULLSCREEN CHAT WINDOW -->
    <div id="pro-messenger-modal" style="display:none; position:fixed; inset:0; background:#ffffff; z-index:6000; flex-direction:column; font-family:'Poppins', sans-serif;">
      <!-- Top Header -->
      <div style="display:flex; align-items:center; justify-content:space-between; padding:12px 16px; border-bottom:1px solid #f1f5f9; background:#fff;">
        <div style="display:flex; align-items:center; gap:12px;">
          <button onclick="closeMessengerChat()" style="background:none; border:none; font-size:20px; color:#2563eb; cursor:pointer;"><i class="fa-solid fa-arrow-left"></i></button>
          <img id="msg-win-top-avatar" src="" style="width:40px; height:40px; border-radius:50%; object-fit:cover;">
          <div>
            <div id="msg-win-top-name" style="font-weight:800; font-size:15px; color:#0f172a; line-height:1.2;">User</div>
            <div style="font-size:11.5px; color:#64748b;">Active now</div>
          </div>
        </div>
        <div style="display:flex; gap:18px; color:#2563eb; font-size:20px;">
          <i class="fa-solid fa-phone" style="cursor:pointer;" onclick="showToast('📞 व्हॉइस कॉल जोडला जात आहे...')"></i>
          <i class="fa-solid fa-video" style="cursor:pointer;" onclick="showToast('📹 व्हिडिओ कॉल सुरू होत आहे...')"></i>
        </div>
      </div>

      <!-- Scrollable Messages Body -->
      <div id="msg-win-body" style="flex:1; overflow-y:auto; padding:16px; display:flex; flex-direction:column; gap:10px; background:#ffffff;">
        <!-- Profile Intro Header inside chat (Exact like Image 1) -->
        <div style="text-align:center; padding:20px 10px 15px;">
          <img id="msg-win-center-avatar" src="" style="width:95px; height:95px; border-radius:50%; object-fit:cover; box-shadow:0 4px 14px rgba(0,0,0,0.1);">
          <h2 id="msg-win-center-name" style="margin:10px 0 6px; font-size:21px; font-weight:800; color:#0f172a;">User</h2>
          <button onclick="closeMessengerChat(); openUserProfile(activeChatPeerUid);" style="background:#f1f5f9; color:#0f172a; border:none; padding:6px 16px; border-radius:20px; font-weight:700; font-size:13px; cursor:pointer;">View profile</button>
        </div>
        <div id="msg-win-bubbles" style="display:flex; flex-direction:column; gap:10px;"></div>
        <div style="text-align:center; font-size:11px; color:#64748b; padding:18px 14px 6px; line-height:1.4;">
          🔒 New messages and calls are secured with end-to-end encryption. Only people in this chat can read, listen to, or share them. <b style="color:#2563eb;">Learn more</b>
        </div>
      </div>

      <!-- Bottom Input Bar (Camera, Gallery, Mic, Message Pill, Thumbs Up) -->
      <div style="display:flex; align-items:center; gap:12px; padding:10px 14px; border-top:1px solid #f1f5f9; background:#fff;">
        <i class="fa-solid fa-camera" style="color:#2563eb; font-size:20px; cursor:pointer;" onclick="sendChatQuickMedia('📷 Photo')"></i>
        <i class="fa-regular fa-image" style="color:#2563eb; font-size:20px; cursor:pointer;" onclick="sendChatQuickMedia('🖼️ Gallery Image')"></i>
        <i class="fa-solid fa-microphone" style="color:#2563eb; font-size:20px; cursor:pointer;" onclick="sendChatQuickMedia('🎤 Voice Note (0:05)')"></i>
        <div style="flex:1; display:flex; align-items:center; background:#f1f5f9; border-radius:24px; padding:8px 14px;">
          <input type="text" id="msg-win-input" placeholder="Message" style="flex:1; border:none; background:transparent; outline:none; font-size:14px;" onkeypress="if(event.key==='Enter') sendMessengerText()">
          <i class="fa-solid fa-face-smile" style="color:#2563eb; font-size:19px; cursor:pointer; margin-left:6px;" onclick="document.getElementById('msg-win-input').value += '😊';"></i>
        </div>
        <i class="fa-solid fa-paper-plane" id="msg-send-icon" style="color:#2563eb; font-size:20px; cursor:pointer; display:none;" onclick="sendMessengerText()"></i>
        <i class="fa-solid fa-thumbs-up" id="msg-thumb-icon" style="color:#2563eb; font-size:24px; cursor:pointer;" onclick="sendMessengerThumb()"></i>
      </div>
    </div>

    <!-- 2. INSTAGRAM STYLE FULLSCREEN NOTIFICATIONS VIEW -->
    <div id="pro-notifications-modal" style="display:none; position:fixed; inset:0; background:#ffffff; z-index:5800; flex-direction:column; font-family:'Poppins', sans-serif;">
      <div style="display:flex; align-items:center; justify-content:space-between; padding:14px 16px; border-bottom:1px solid #f1f5f9;">
        <div style="display:flex; align-items:center; gap:14px;">
          <button onclick="closeProNotifications()" style="background:none; border:none; font-size:20px; color:#0f172a; cursor:pointer;"><i class="fa-solid fa-arrow-left"></i></button>
          <h3 style="margin:0; font-size:19px; font-weight:800; color:#0f172a;">Notifications</h3>
        </div>
        <span style="color:#2563eb; font-weight:700; font-size:14px; cursor:pointer;" onclick="markAllNotificationsRead()">Filter</span>
      </div>
      <div id="pro-notif-list-body" style="flex:1; overflow-y:auto; padding-bottom:30px;"></div>
    </div>

    <!-- 3. REAL COMMENTS DRAWER MODAL -->
    <div id="pro-comments-modal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.55); z-index:5900; align-items:flex-end; justify-content:center; font-family:'Poppins', sans-serif;" onclick="closeCommentsModal()">
      <div style="background:#fff; width:100%; max-width:480px; height:72vh; border-radius:22px 22px 0 0; display:flex; flex-direction:column; overflow:hidden;" onclick="event.stopPropagation()">
        <div style="padding:12px 16px; border-bottom:1px solid #f1f5f9; display:flex; justify-content:space-between; align-items:center;">
          <div style="width:30px;"></div>
          <h4 style="margin:0; font-size:15px; font-weight:800; color:#0f172a;">Comments</h4>
          <button onclick="closeCommentsModal()" style="border:none; background:#f1f5f9; width:30px; height:30px; border-radius:50%; font-weight:800; cursor:pointer;">✕</button>
        </div>
        <div id="pro-comments-list" style="flex:1; overflow-y:auto; padding:14px;"></div>
        <div style="display:flex; align-items:center; gap:10px; padding:10px 14px; border-top:1px solid #f1f5f9; background:#fff;">
          <img id="cmt-my-avatar" src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80" style="width:36px; height:36px; border-radius:50%; object-fit:cover;">
          <input type="text" id="pro-comment-input" placeholder="Add a comment..." style="flex:1; border:1px solid #e2e8f0; border-radius:22px; padding:9px 14px; font-size:13.5px; outline:none;" onkeypress="if(event.key==='Enter') submitRealComment()">
          <button onclick="submitRealComment()" style="background:#2563eb; color:#fff; border:none; padding:9px 16px; border-radius:20px; font-weight:700; font-size:13px; cursor:pointer;">Post</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(wrapper);

  // टाईप करताना थंब आयकॉन ऐवजी Send आयकॉन दाखवा
  const msgInp = document.getElementById('msg-win-input');
  if (msgInp) {
    msgInp.addEventListener('input', () => {
      const hasTxt = msgInp.value.trim().length > 0;
      document.getElementById('msg-send-icon').style.display = hasTxt ? 'block' : 'none';
      document.getElementById('msg-thumb-icon').style.display = hasTxt ? 'none' : 'block';
    });
  }
}

// रील अपलोड करताना गॅलरीत व्हिडिओ दिसण्यासाठी इनपुट अपडेट करा
function setupVideoFileInput() {
  const fileInp = document.querySelector('#create-content-modal input[type="file"]');
  if (fileInp) {
    fileInp.setAttribute('id', 'cr-file-input');
    fileInp.setAttribute('accept', 'image/*,video/*');
  }
}

// =========================================================
// 1. REAL AUTHENTICATION (SIGN UP, LOGIN & GOOGLE POPUP)
// =========================================================
function openNeonSignupScreen() {
  document.getElementById('welcome-screen').style.display = 'none';
  document.getElementById('auth-screen').style.display = 'block';
}
function backToWelcomeScreen() {
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('welcome-screen').style.display = 'flex';
}
function openLoginModal() { document.getElementById('login-modal').style.display = 'flex'; }
function closeLoginModal() { document.getElementById('login-modal').style.display = 'none'; }

function switchAuthAccount(type) {
  authAccountType = type;
  let isP = (type === 'people');
  document.getElementById('tab-acc-people').classList.toggle('active', isP);
  document.getElementById('tab-acc-business').classList.toggle('active', !isP);
  document.getElementById('auth-people-fields').style.display = isP ? 'block' : 'none';
  document.getElementById('auth-business-fields').style.display = isP ? 'none' : 'block';
  document.getElementById('auth-biz-about-wrap').style.display = isP ? 'none' : 'block';
  document.getElementById('auth-heading').innerHTML = isP ? 'Create <span>People</span> Account' : 'Create <span>Business</span> Account';
  document.getElementById('main-submit-txt').innerText = isP ? 'Create Account' : 'Create Business Account';
}

function switchVerifyTab(method) {
  let isMob = (method === 'mobile');
  document.getElementById('tab-ver-mobile').classList.toggle('active', isMob);
  document.getElementById('tab-ver-email').classList.toggle('active', !isMob);
  document.getElementById('ver-mobile-box').style.display = isMob ? 'flex' : 'none';
  document.getElementById('ver-email-box').style.display = isMob ? 'none' : 'flex';
}

function togglePassVis(inputId, iconEl) {
  let inp = document.getElementById(inputId);
  if (inp.type === 'password') {
    inp.type = 'text';
    iconEl.className = 'fa-regular fa-eye pass-eye';
  } else {
    inp.type = 'password';
    iconEl.className = 'fa-regular fa-eye-slash pass-eye';
  }
}

function triggerAuthOTP() {
  let code = Math.floor(1000 + Math.random() * 9000);
  document.getElementById('reg-otp').value = code;
  showToast(`🔐 तुमचा Verification OTP आहे: <b>${code}</b>`);
}

function sendQuickLoginOTP() {
  let code = Math.floor(100000 + Math.random() * 900000);
  document.getElementById('login-pass-input').value = code;
  showToast(`📱 तुमचा Quick OTP आहे: <b>${code}</b>`);
}

function detectUserGPS(inputId) {
  let inp = document.getElementById(inputId);
  inp.value = '📡 GPS शोधत आहे...';
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        let res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`);
        let data = await res.json();
        let city = data.address.city || data.address.town || data.address.village || 'Ardhapur';
        let state = data.address.state || 'Maharashtra';
        inp.value = `${city}, ${state}`;
        showToast('📍 तुमचे खरे GPS लोकेशन जोडले!');
      } catch (e) {
        inp.value = `${pos.coords.latitude.toFixed(3)}, ${pos.coords.longitude.toFixed(3)}`;
      }
    }, () => {
      inp.value = 'Ardhapur, Maharashtra';
    });
  }
}

async function submitRegistration() {
  if (!auth) await initRealFirebaseApp();
  if (!auth) return showToast('⏳ Firebase कनेक्ट होत आहे...');

  let email = document.getElementById('reg-email').value.trim();
  let mob = document.getElementById('reg-mobile').value.trim();
  let pass = document.getElementById('reg-pass').value.trim();
  let loc = document.getElementById('reg-location').value.trim() || 'Ardhapur, Maharashtra';

  let authEmail = email || (mob ? `${mob}@albiznet.com` : '');
  if (!authEmail || pass.length < 6) {
    return showToast('⚠️ कृपया मोबाईल/Gmail आणि किमान ६ अंकी पासवर्ड टाका!');
  }

  try {
    showToast('⏳ अकाउंट तयार होत आहे...');
    let cred;
    try {
      cred = await auth.createUserWithEmailAndPassword(authEmail, pass);
    } catch (signUpErr) {
      if (signUpErr.code === 'auth/email-already-in-use') {
        cred = await auth.signInWithEmailAndPassword(authEmail, pass);
      } else {
        throw signUpErr;
      }
    }

    const uid = cred.user.uid;
    let name = authAccountType === 'people'
      ? document.getElementById('reg-p-name').value.trim()
      : document.getElementById('reg-b-name').value.trim();

    let userPayload = {
      uid: uid,
      type: authAccountType,
      name: name || 'ALBIZNET User',
      handle: '@' + (name || 'user').toLowerCase().replace(/\s+/g, ''),
      category: authAccountType === 'business' ? (document.getElementById('reg-b-cat').value.trim() || 'Shops') : 'Personal Account',
      about: authAccountType === 'business'
        ? (document.getElementById('reg-b-about').value.trim() || 'Welcome to our official business store!')
        : `Hi! I'm ${name || 'a creator'}, connected on ALBIZNET.`,
      location: loc,
      phone: mob,
      email: email || authEmail,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
      followersCount: 0,
      followingCount: 0,
      postsCount: 0,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    await db.collection('users').doc(uid).set(userPayload, { merge: true });
    currentUserData = userPayload;
    showToast('🎉 तुमचे रिअल अकाउंट तयार झाले!');
    launchMainApp();
  } catch (err) {
    showToast('❌ Error: ' + err.message);
  }
}

async function handleLoginSubmit() {
  if (!auth) await initRealFirebaseApp();
  let idVal = document.getElementById('login-id-input').value.trim();
  let pass = document.getElementById('login-pass-input').value.trim();
  if (!idVal || !pass) return showToast('⚠️ कृपया मोबाईल/Gmail आणि पासवर्ड टाका!');
  let authEmail = idVal.includes('@') ? idVal : `${idVal}@albiznet.com`;

  try {
    await auth.signInWithEmailAndPassword(authEmail, pass);
    closeLoginModal();
    showToast('✅ यशस्वीरित्या लॉगिन झाले!');
  } catch (err) {
    showToast('❌ लॉगिन एरर: ' + err.message);
  }
}

async function openGoogleChooser() {
  if (!auth) await initRealFirebaseApp();
  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    const res = await auth.signInWithPopup(provider);
    const u = res.user;
    const docRef = db.collection('users').doc(u.uid);
    const snap = await docRef.get();

    if (!snap.exists) {
      let newData = {
        uid: u.uid,
        type: authAccountType || 'people',
        name: u.displayName || 'User',
        handle: '@' + (u.email ? u.email.split('@')[0] : 'user'),
        category: authAccountType === 'business' ? 'Shops' : 'Personal Account',
        about: `Hi! I'm ${u.displayName || 'here'} on ALBIZNET.`,
        location: 'Ardhapur, Maharashtra',
        phone: u.phoneNumber || '',
        email: u.email || '',
        avatar: u.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
        followersCount: 0,
        followingCount: 0,
        postsCount: 0,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      await docRef.set(newData);
      currentUserData = newData;
    } else {
      currentUserData = { uid: u.uid, ...snap.data() };
    }
    showToast('✅ Google लॉगिन यशस्वी!');
    launchMainApp();
  } catch (err) {
    showToast('❌ Google Sign-In Error: ' + err.message);
  }
}

function closeGoogleChooser() {
  let m = document.getElementById('google-chooser-modal');
  if (m) m.style.display = 'none';
}

// =========================================================
// 2. REAL-TIME STREAMS (24H AUTO-DELETE STORIES, VIDEO REELS, POSTS)
// =========================================================
function launchMainApp() {
  document.getElementById('welcome-screen').style.display = 'none';
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('main-app-shell').style.display = 'block';

  if (currentUserData && currentUserData.location) {
    let locTxt = document.getElementById('nearby-user-loc-txt');
    if (locTxt) locTxt.innerText = currentUserData.location;
  }
  if (currentUserData && currentUserData.avatar) {
    let cmtAv = document.getElementById('cmt-my-avatar');
    if (cmtAv) cmtAv.src = currentUserData.avatar;
  }

  listenToRealPostsAndReels();
  listenToRealOffers();
  listenToRealNearbyStores();
  listenToRealMessages();
  listenToRealNotifications();
  switchBottomNav('home');
}

function sortByCreatedDesc(arr) {
  return arr.sort((a, b) => {
    let tA = a.createdAt && a.createdAt.toMillis ? a.createdAt.toMillis() : (a.timeMs || 0);
    let tB = b.createdAt && b.createdAt.toMillis ? b.createdAt.toMillis() : (b.timeMs || 0);
    return tB - tA;
  });
}

function getRelativeTime(ms) {
  if (!ms) return '1m';
  let diff = Math.floor((Date.now() - ms) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return Math.floor(diff / 60) + 'm';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h';
  if (diff < 604800) return Math.floor(diff / 86400) + 'd';
  return Math.floor(diff / 604800) + 'w';
}

function listenToRealPostsAndReels() {
  // १. REELS (Video + Image Support)
  db.collection('reels').onSnapshot(snap => {
    cacheReels = sortByCreatedDesc(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    renderReelsBar();
    if (activeExploreFilter === 'Trending Reels') renderExploreOffers();
    if (activePeopleTab === 'reels') renderProfileMediaGrid();
  });

  // २. POSTS (Like/Unlike + 3 Buttons + Real Comments)
  db.collection('posts').onSnapshot(snap => {
    cachePosts = sortByCreatedDesc(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    renderHomeFeed();
    renderExploreOffers();
    if (activePeopleTab === 'posts') renderProfileMediaGrid();
    if (activeCommentPostId) renderCommentsList(activeCommentPostId);
  });

  // ३. STORIES (२४ तासांनंतर आपोआप डिलीट होण्याची सोय!)
  db.collection('stories').onSnapshot(snap => {
    const now = Date.now();
    const twentyFourHours = 24 * 60 * 60 * 1000;
    const validStories = [];

    snap.docs.forEach(doc => {
      const data = doc.data();
      const createdTime = data.timeMs || (data.createdAt && data.createdAt.toMillis ? data.createdAt.toMillis() : now);
      const expiryTime = data.expiresAt || (createdTime + twentyFourHours);

      if (now > expiryTime) {
        // २४ तास पूर्ण झालेली स्टोरी डेटाबेसमधून आपोआप डिलीट करा!
        db.collection('stories').doc(doc.id).delete().catch(() => {});
      } else {
        validStories.push({ id: doc.id, ...data });
      }
    });

    cacheStories = sortByCreatedDesc(validStories);
    renderStoriesMomentsBar();
    if (activePeopleTab === 'moments') renderProfileMediaGrid();
  });

  // ४. NOTES
  db.collection('notes').onSnapshot(snap => {
    cacheNotes = sortByCreatedDesc(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    renderNotesBarInMessages();
    if (activePeopleTab === 'highlights') renderProfileMediaGrid();
  });

  // ५. PRODUCTS
  db.collection('products').onSnapshot(snap => {
    cacheProducts = sortByCreatedDesc(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    renderCatalogGrid();
  });
}

function renderStoriesMomentsBar() {
  const momentsBar = document.querySelector('#view-home .moments-scroll-bar');
  if (!momentsBar) return;

  const firstYourMoment = momentsBar.querySelector('.your-moment-box').outerHTML;
  const realStoriesHTML = cacheStories.map(st => {
    let timeLeftHrs = Math.max(1, Math.ceil(((st.expiresAt || (st.timeMs + 86400000)) - Date.now()) / 3600000));
    return `
      <div class="story-circle-item" onclick="openMediaViewer('${st.img}', '${st.mediaType || 'image'}', '${st.author} (${timeLeftHrs}h left): ${st.caption || ''}')">
        <div class="story-grad-ring"><img src="${st.avatar || st.img}"><span class="story-plus">+</span></div>
        <span>${(st.author || 'User').split(' ')[0]}</span>
      </div>
    `;
  }).join('');

  momentsBar.innerHTML = firstYourMoment + realStoriesHTML;
}

function renderReelsBar() {
  let rBox = document.getElementById('reels-container');
  if (!rBox) return;
  if (cacheReels.length === 0) {
    rBox.innerHTML = `<p style="font-size:12px; color:#64748b; padding:10px;">अजून कोणतीही Reel नाही. '+ Create ➔ Reel' वरून व्हिडिओ टाका!</p>`;
    return;
  }
  rBox.innerHTML = cacheReels.map(r => {
    const isVid = r.mediaType === 'video' || (r.img && r.img.startsWith('data:video'));
    return `
      <div class="reel-thumb-card" onclick="watchRealReel('${r.id}', '${r.img}', '${r.mediaType || 'image'}', '${(r.caption || r.author || '').replace(/'/g, '')}')" style="min-width:135px; height:210px; background:#000; border-radius:14px; position:relative; overflow:hidden; cursor:pointer; margin-right:10px; flex-shrink:0;">
        ${isVid
          ? `<video src="${r.img}" style="width:100%; height:100%; object-fit:cover;" muted loop playsinline onmouseover="this.play()" onmouseout="this.pause()"></video>`
          : `<img src="${r.img}" style="width:100%; height:100%; object-fit:cover;">`
        }
        <div class="reel-play-pill" style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); background:rgba(0,0,0,0.65); color:#fff; padding:6px 12px; border-radius:20px; font-size:12px; font-weight:700;"><i class="fa-solid fa-play"></i> Play</div>
        <div class="reel-bottom-meta" style="position:absolute; bottom:8px; left:8px; right:8px; color:#fff; font-size:11px; text-shadow:0 1px 3px #000;">
          <span class="reel-views-txt">${r.views || 1} Views 🔥</span>
          <div class="reel-author-row" style="display:flex; justify-content:space-between; font-weight:700;"><span>${(r.author || 'User').split(' ')[0]}</span><span>${isVid ? '🎬 Video' : '0:30'}</span></div>
        </div>
      </div>
    `;
  }).join('');
}

async function watchRealReel(reelId, mediaUrl, mediaType, title) {
  openMediaViewer(mediaUrl, mediaType, `🎬 ${title}`);
  try {
    await db.collection('reels').doc(reelId).update({
      views: firebase.firestore.FieldValue.increment(1)
    });
  } catch (e) {}
}

// =========================================================
// HOME FEED POSTS (ONLY 3 BUTTONS: LIKE/UNLIKE, COMMENT BOX, SHARE)
// =========================================================
function renderHomeFeed() {
  let pBox = document.getElementById('home-posts-feed');
  if (!pBox) return;
  if (cachePosts.length === 0) {
    pBox.innerHTML = `<div style="text-align:center; padding:30px; color:#64748b;">अजून कोणतीही पोस्ट नाही. '+ Create ➔ Post' वर दाबून पहिली पोस्ट करा!</div>`;
    return;
  }

  const myUid = currentUserData ? currentUserData.uid : 'guest';

  pBox.innerHTML = cachePosts.map(p => {
    let postId = p.id;
    let likedBy = Array.isArray(p.likedBy) ? p.likedBy : [];
    let isLiked = likedBy.includes(myUid);
    let likeCount = typeof p.likes === 'number' ? p.likes : likedBy.length;
    let cmtList = Array.isArray(p.commentsList) ? p.commentsList : [];
    let cmtCount = cmtList.length || p.commentsCount || 0;
    let isVid = p.mediaType === 'video' || (p.img && p.img.startsWith('data:video'));

    return `
      <div class="feed-post-card" style="background:#fff; border-radius:18px; padding:14px; margin:12px 14px; box-shadow:0 2px 12px rgba(0,0,0,0.06);">
        <div class="fp-top-row" style="display:flex; align-items:center; gap:10px; margin-bottom:10px;">
          <img class="fp-avatar" src="${p.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'}" onclick="openUserProfile('${p.uid}')" style="width:42px; height:42px; border-radius:50%; object-fit:cover; cursor:pointer;">
          <div style="flex:1;">
            <div class="fp-name" onclick="openUserProfile('${p.uid}')" style="font-weight:800; font-size:15px; color:#0f172a; cursor:pointer;">${p.author || 'ALBIZNET User'}</div>
            <div class="fp-cat-tag" style="font-size:12px; color:#64748b;"><i class="fa-solid fa-location-dot"></i> ${p.location || 'Maharashtra'} &bull; <span style="color:#4f46e5; font-weight:700;">${p.category || 'Post'}</span></div>
          </div>
        </div>
        <div class="fp-caption" style="font-size:14.5px; color:#1e293b; margin-bottom:10px; line-height:1.45;">${p.caption || ''}</div>
        ${p.img ? (
          isVid
            ? `<video src="${p.img}" controls playsinline style="width:100%; max-height:400px; border-radius:14px; background:#000;"></video>`
            : `<img class="fp-media-img" src="${p.img}" onclick="openMediaViewer('${p.img}', 'image', '${(p.caption || '').replace(/'/g, '')}')" style="width:100%; max-height:400px; object-fit:cover; border-radius:14px; cursor:pointer;">`
        ) : ''}
        
        <!-- EXACT 3 BUTTONS: LIKE/UNLIKE TOGGLE, COMMENT BOX, SHARE -->
        <div class="fp-actions-bar" style="display:flex; justify-content:space-around; align-items:center; padding-top:12px; margin-top:12px; border-top:1px solid #f1f5f9; font-size:14px; font-weight:700; color:#334155;">
          <div onclick="toggleLikeDislikePost('${postId}')" style="cursor:pointer; display:flex; align-items:center; gap:6px; color:${isLiked ? '#e11d48' : '#475569'};">
            <i class="${isLiked ? 'fa-solid' : 'fa-regular'} fa-heart" style="font-size:18px; color:${isLiked ? '#e11d48' : '#475569'};"></i>
            <span>${likeCount} Like</span>
          </div>
          <div onclick="openCommentsModal('${postId}')" style="cursor:pointer; display:flex; align-items:center; gap:6px; color:#475569;">
            <i class="fa-regular fa-comment" style="font-size:18px;"></i>
            <span>${cmtCount} Comment</span>
          </div>
          <div onclick="shareRealPost('${postId}', '${(p.caption || 'ALBIZNET Post').replace(/'/g, '')}')" style="cursor:pointer; display:flex; align-items:center; gap:6px; color:#475569;">
            <i class="fa-solid fa-share-nodes" style="font-size:17px;"></i>
            <span>Share</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// १ क्लिकवर Like आणि परत क्लिक केल्यावर Dislike (Unlike) होईल!
async function toggleLikeDislikePost(postId) {
  if (!currentUserData) return showToast('⚠️ कृपया आधी लॉगिन करा!');
  const post = cachePosts.find(x => x.id === postId);
  if (!post) return;

  const myUid = currentUserData.uid;
  let likedBy = Array.isArray(post.likedBy) ? [...post.likedBy] : [];
  let currentLikes = typeof post.likes === 'number' ? post.likes : likedBy.length;

  if (likedBy.includes(myUid)) {
    // आधीच लाईक केले आहे -> आता Dislike / Unlike करा
    likedBy = likedBy.filter(id => id !== myUid);
    currentLikes = Math.max(0, currentLikes - 1);
    await db.collection('posts').doc(postId).update({
      likedBy: likedBy,
      likes: currentLikes
    });
    showToast('💔 Like काढून टाकले (Unliked)');
  } else {
    // नवीन Like करा
    likedBy.push(myUid);
    currentLikes = currentLikes + 1;
    await db.collection('posts').doc(postId).update({
      likedBy: likedBy,
      likes: currentLikes
    });
    await pushRealNotification({
      type: 'like',
      actorUid: currentUserData.uid,
      actorName: currentUserData.name,
      actorHandle: currentUserData.handle || '@' + currentUserData.name.toLowerCase().replace(/\s+/g, ''),
      actorAvatar: currentUserData.avatar,
      text: `liked your post: "${(post.caption || 'Photo').substring(0, 24)}"`,
      postImg: post.img || ''
    });
    showToast('❤️ तुम्ही पोस्ट Like केली!');
  }
}

// REAL COMMENT BOX DRAWER FUNCTIONS
function openCommentsModal(postId) {
  activeCommentPostId = postId;
  document.getElementById('pro-comments-modal').style.display = 'flex';
  renderCommentsList(postId);
}

function closeCommentsModal() {
  activeCommentPostId = null;
  document.getElementById('pro-comments-modal').style.display = 'none';
}

function renderCommentsList(postId) {
  const listBox = document.getElementById('pro-comments-list');
  if (!listBox) return;
  const post = cachePosts.find(x => x.id === postId);
  const comments = (post && Array.isArray(post.commentsList)) ? post.commentsList : [];

  if (comments.length === 0) {
    listBox.innerHTML = `<div style="text-align:center; padding:40px 16px; color:#64748b; font-size:13.5px;">अजून कोणतीही कमेंट नाही. पहिली कमेंट तुम्ही करा! 💬</div>`;
    return;
  }

  listBox.innerHTML = comments.map(c => `
    <div style="display:flex; gap:10px; margin-bottom:14px; align-items:flex-start;">
      <img src="${c.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'}" style="width:34px; height:34px; border-radius:50%; object-fit:cover;">
      <div style="flex:1; background:#f8fafc; padding:9px 12px; border-radius:14px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <strong style="font-size:13px; color:#0f172a;">${c.author || 'User'}</strong>
          <span style="font-size:10.5px; color:#94a3b8;">${getRelativeTime(c.timeMs)}</span>
        </div>
        <div style="font-size:13.5px; color:#1e293b; margin-top:3px;">${c.text}</div>
      </div>
    </div>
  `).join('');
}

async function submitRealComment() {
  if (!currentUserData || !activeCommentPostId) return;
  const inp = document.getElementById('pro-comment-input');
  const txt = inp.value.trim();
  if (!txt) return;

  const post = cachePosts.find(x => x.id === activeCommentPostId);
  let currentList = (post && Array.isArray(post.commentsList)) ? [...post.commentsList] : [];

  const newComment = {
    uid: currentUserData.uid,
    author: currentUserData.name,
    avatar: currentUserData.avatar,
    text: txt,
    timeMs: Date.now()
  };

  currentList.push(newComment);
  inp.value = '';

  await db.collection('posts').doc(activeCommentPostId).update({
    commentsList: currentList,
    commentsCount: currentList.length
  });

  await pushRealNotification({
    type: 'comment',
    actorUid: currentUserData.uid,
    actorName: currentUserData.name,
    actorHandle: currentUserData.handle || '@user',
    actorAvatar: currentUserData.avatar,
    text: `commented: "${txt}"`,
    postImg: post ? post.img : ''
  });

  renderCommentsList(activeCommentPostId);
}

async function shareRealPost(postId, caption) {
  const shareUrl = window.location.origin;
  if (navigator.share) {
    try {
      await navigator.share({ title: 'ALBIZNET Post', text: caption, url: shareUrl });
      return;
    } catch (e) {}
  }
  navigator.clipboard?.writeText(shareUrl);
  showToast('🔗 पोस्टची लिंक कॉपी आणि शेअर केली!');
}

// =========================================================
// 3. PUBLISH REAL POSTS, 24H STORIES, VIDEO REELS, NOTES, OFFERS & PRODUCTS
// =========================================================
function toggleCreatePopupMenu(e) {
  e.stopPropagation();
  let menu = document.getElementById('create-dropdown-menu');
  menu.style.display = (menu.style.display === 'block') ? 'none' : 'block';
}

function openCreateContentModal(mode) {
  currentCreateMode = mode;
  uploadedDataURL = '';
  uploadedMediaType = 'image';

  let menu = document.getElementById('create-dropdown-menu');
  if (menu) menu.style.display = 'none';

  document.getElementById('create-modal-title').innerText = `Create New ${mode}`;
  let titleInp = document.getElementById('cr-title-input');
  let subInp = document.getElementById('cr-sub-input');
  let priceInp = document.getElementById('cr-price-input');
  let fileInp = document.querySelector('#create-content-modal input[type="file"]');

  titleInp.value = '';
  subInp.value = '';
  priceInp.value = '';
  if (fileInp) fileInp.value = '';

  // Reel किंवा Live निवडल्यावर गॅलरीत व्हिडिओ (video/*) दिसतील!
  if (fileInp) {
    if (mode === 'Reel' || mode === 'Live' || mode === 'Post' || mode === 'Story') {
      fileInp.setAttribute('accept', 'video/*,image/*');
    } else {
      fileInp.setAttribute('accept', 'image/*');
    }
  }

  if (mode === 'Offer') {
    titleInp.placeholder = 'ऑफरचे नाव / सवलत (उदा. 50% OFF)...';
    subInp.style.display = 'block';
    subInp.placeholder = 'कॅटेगरी (उदा. Offers, Food, Limited Time)';
    priceInp.style.display = 'none';
  } else if (mode === 'Product') {
    titleInp.placeholder = 'प्रॉडक्टचे नाव (उदा. Cotton Hoodie)...';
    subInp.style.display = 'block';
    subInp.placeholder = 'कॅटेगरी: Men, Women किंवा Accessories';
    priceInp.style.display = 'block';
    priceInp.placeholder = 'किंमत (उदा. ₹999)';
  } else if (mode === 'Reel') {
    titleInp.placeholder = '🎬 तुमच्या व्हिडिओ Reel साठी कॅप्शन लिहा...';
    subInp.style.display = 'none';
    priceInp.style.display = 'none';
  } else if (mode === 'Story') {
    titleInp.placeholder = '📸 २४ तासांच्या Story साठी कॅप्शन लिहा...';
    subInp.style.display = 'none';
    priceInp.style.display = 'none';
  } else if (mode === 'Note') {
    titleInp.placeholder = 'तुमची शॉर्ट Note लिहा...';
    subInp.style.display = 'none';
    priceInp.style.display = 'none';
  } else {
    titleInp.placeholder = 'पोस्ट कॅप्शन लिहा...';
    subInp.style.display = 'block';
    subInp.placeholder = 'कॅटेगरी (उदा. Post, Jobs, News, Food)';
    priceInp.style.display = 'none';
  }

  document.getElementById('create-content-modal').style.display = 'flex';
}

function closeCreateContentModal() {
  document.getElementById('create-content-modal').style.display = 'none';
}

// इमेज आणि व्हिडिओ (Video) दोन्ही निवडण्याची सोय!
function handleFileSelect(e) {
  if (!e.target.files || !e.target.files[0]) return;
  let file = e.target.files[0];

  if (file.type.startsWith('video/')) {
    // व्हिडिओ फाईल (Reel साठी)
    if (file.size > 950 * 1024) {
      showToast('⚠️ कृपया १ MB पेक्षा लहान किंवा छोटा व्हिडिओ निवडा (फास्ट अपलोडसाठी)!');
    }
    let reader = new FileReader();
    reader.onload = function(evt) {
      uploadedDataURL = evt.target.result;
      uploadedMediaType = 'video';
      showToast('🎬 व्हिडिओ यशस्वीरित्या निवडला गेला!');
    };
    reader.readAsDataURL(file);
  } else {
    // फोटो फाईल (आपोआप कॉम्प्रेस होईल)
    let reader = new FileReader();
    reader.onload = function(evt) {
      let img = new Image();
      img.onload = function() {
        let canvas = document.createElement('canvas');
        let maxW = 720;
        let scale = maxW / img.width;
        canvas.width = img.width > maxW ? maxW : img.width;
        canvas.height = img.width > maxW ? img.height * scale : img.height;
        let ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        uploadedDataURL = canvas.toDataURL('image/jpeg', 0.75);
        uploadedMediaType = 'image';
        showToast('✅ फोटो निवडला गेला!');
      };
      img.src = evt.target.result;
    };
    reader.readAsDataURL(file);
  }
}

async function publishCreatedContent() {
  if (!currentUserData) return showToast('⚠️ कृपया आधी लॉगिन करा!');
  let title = document.getElementById('cr-title-input').value.trim();
  let sub = document.getElementById('cr-sub-input').value.trim();
  let price = document.getElementById('cr-price-input').value.trim();

  if (!title && !uploadedDataURL) {
    return showToast('⚠️ कृपया माहिती लिहा किंवा फोटो/व्हिडिओ निवडा!');
  }

  let mediaUrl = uploadedDataURL || 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=700&q=80';
  let nowTs = firebase.firestore.FieldValue.serverTimestamp();
  let nowMs = Date.now();

  try {
    showToast(`🚀 तुमची ${currentCreateMode} पब्लिश होत आहे...`);

    if (currentCreateMode === 'Reel' || currentCreateMode === 'Live') {
      await db.collection('reels').add({
        uid: currentUserData.uid,
        author: currentUserData.name,
        caption: title || currentCreateMode,
        img: mediaUrl,
        mediaType: uploadedMediaType,
        views: 1,
        timeMs: nowMs,
        createdAt: nowTs
      });
    } else if (currentCreateMode === 'Story') {
      // २४ तासांनंतर (86,400,000 ms) आपोआप डिलीट होणारी स्टोरी!
      await db.collection('stories').add({
        uid: currentUserData.uid,
        author: currentUserData.name,
        avatar: currentUserData.avatar,
        caption: title || 'My Moment',
        img: mediaUrl,
        mediaType: uploadedMediaType,
        timeMs: nowMs,
        expiresAt: nowMs + (24 * 60 * 60 * 1000),
        createdAt: nowTs
      });
    } else if (currentCreateMode === 'Note') {
      await db.collection('notes').add({
        uid: currentUserData.uid,
        author: currentUserData.name,
        avatar: currentUserData.avatar,
        noteText: title || 'Hello Friends! 👋',
        img: mediaUrl,
        timeMs: nowMs,
        createdAt: nowTs
      });
    } else if (currentCreateMode === 'Offer') {
      await db.collection('offers').add({
        uid: currentUserData.uid,
        bizName: currentUserData.name,
        deal: title || 'Special Offer',
        validity: sub || 'Limited Time Offer',
        location: currentUserData.location || 'Ardhapur, Maharashtra',
        phone: currentUserData.phone || '',
        img: mediaUrl,
        timeMs: nowMs,
        createdAt: nowTs
      });
    } else if (currentCreateMode === 'Product') {
      await db.collection('products').add({
        uid: currentUserData.uid,
        sellerName: currentUserData.name,
        title: title || 'New Product',
        price: price || '₹999',
        cat: sub || 'Men',
        img: mediaUrl,
        desc: `Quality product by ${currentUserData.name}`,
        timeMs: nowMs,
        createdAt: nowTs
      });
    } else {
      await db.collection('posts').add({
        uid: currentUserData.uid,
        author: currentUserData.name,
        avatar: currentUserData.avatar,
        location: currentUserData.location || 'Ardhapur, Maharashtra',
        category: sub || currentUserData.category || 'Post',
        caption: title,
        img: mediaUrl,
        mediaType: uploadedMediaType,
        likes: 0,
        likedBy: [],
        commentsCount: 0,
        commentsList: [],
        timeMs: nowMs,
        createdAt: nowTs
      });
    }

    await db.collection('users').doc(currentUserData.uid).update({
      postsCount: firebase.firestore.FieldValue.increment(1)
    });

    await pushRealNotification({
      type: currentCreateMode.toLowerCase(),
      actorUid: currentUserData.uid,
      actorName: currentUserData.name,
      actorHandle: currentUserData.handle || '@' + currentUserData.name.toLowerCase().replace(/\s+/g, ''),
      actorAvatar: currentUserData.avatar,
      text: `shared a new ${currentCreateMode.toLowerCase()}: "${title || currentCreateMode}"`,
      postImg: uploadedMediaType === 'image' ? mediaUrl : ''
    });

    closeCreateContentModal();
    showToast(`✅ तुमची ${currentCreateMode} यशस्वीरित्या पब्लिश झाली!`);
  } catch (err) {
    showToast('❌ Error: ' + err.message);
  }
}

// =========================================================
// 4. MESSENGER STYLE CHAT & WORKING TABS (INBOX, UNREAD, MARKETPLACE, REQUEST)
// =========================================================
function renderNotesBarInMessages() {
  const bar = document.querySelector('#view-messages .moments-scroll-bar');
  if (!bar || cacheNotes.length === 0) return;
  const firstNote = bar.querySelector('.your-note-card').outerHTML;
  bar.innerHTML = firstNote + cacheNotes.map(n => `
    <div class="story-circle-item" onclick="showToast('📝 ${n.author}: ${n.noteText}')">
      <div class="story-grad-ring"><img src="${n.avatar || n.img}"></div>
      <span>${(n.noteText || 'Note').substring(0, 10)}..</span>
    </div>
  `).join('');
}

function listenToRealMessages() {
  db.collection('chats').onSnapshot(snap => {
    cacheChats = sortByCreatedDesc(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    renderMessagesList();

    // न वाचलेल्या मेसेजेसची संख्या बॅजवर दाखवा
    let unreadCount = cacheChats.filter(c => c.unread === true).length;
    let badge = document.querySelector('.msg-badge-count');
    if (badge) {
      badge.innerText = unreadCount || cacheChats.length;
      badge.style.display = (unreadCount > 0 || cacheChats.length > 0) ? 'inline-block' : 'none';
    }

    // जर चॅट विंडो उघडी असेल तर बबल्स लाईव्ह अपडेट करा
    if (activeChatDocId) {
      const openDoc = cacheChats.find(x => x.id === activeChatDocId);
      if (openDoc) renderMessengerBubbles(openDoc);
    }
  });
}

function switchMsgTab(tabName, el) {
  activeMsgTab = tabName;
  document.querySelectorAll('#view-messages .m-tab').forEach(t => t.classList.remove('active'));
  if (el) el.classList.add('active');
  renderMessagesList();
}

function renderMessagesList() {
  let box = document.getElementById('messages-chat-list');
  if (!box) return;

  let q = (document.getElementById('msg-search-input')?.value || '').toLowerCase();

  let list = cacheChats.filter(m => {
    let matchQ = (m.senderName || '').toLowerCase().includes(q) ||
                 (m.receiverName || '').toLowerCase().includes(q) ||
                 (m.lastMessage || '').toLowerCase().includes(q);
    if (!matchQ) return false;

    const cat = m.chatCategory || 'Inbox';
    if (activeMsgTab === 'Unread') return m.unread === true;
    if (activeMsgTab === 'Marketplace') return cat === 'Marketplace';
    if (activeMsgTab === 'Request') return cat === 'Request' || m.isRequest === true;
    return cat !== 'Request'; // Inbox
  });

  if (list.length === 0) {
    let actionLabel = activeMsgTab === 'Marketplace' ? '🛍️ Marketplace डील मेसेज करा' : (activeMsgTab === 'Request' ? '👋 नवीन फ्रेंड रिक्वेस्ट मेसेज पाठवा' : '💬 नवीन मेसेज सुरू करा');
    box.innerHTML = `
      <div style="text-align:center; padding:32px 16px; color:#64748b;">
        <b>${activeMsgTab}</b> मध्ये सध्या कोणताही मेसेज नाही.<br><br>
        <button onclick="createNewChatInCurrentTab()" style="background:#4f46e5; color:#fff; border:none; padding:10px 18px; border-radius:12px; font-weight:700; cursor:pointer;">${actionLabel}</button>
      </div>`;
    return;
  }

  box.innerHTML = list.map(m => {
    let isMeSender = currentUserData && m.senderUid === currentUserData.uid;
    let peerName = isMeSender ? (m.receiverName || 'Friend') : (m.senderName || 'User');
    let peerAvatar = m.peerAvatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80';
    let peerUid = isMeSender ? (m.receiverUid || m.senderUid) : (m.senderUid || '');

    return `
      <div class="chat-item-row" onclick="openMessengerWindow('${m.id}', '${peerName.replace(/'/g, '')}', '${peerAvatar}', '${peerUid}')" style="display:flex; align-items:center; gap:12px; padding:12px 16px; margin:8px 12px; border-radius:16px; background:#fff; box-shadow:0 2px 8px rgba(0,0,0,0.04); cursor:pointer;">
        <div style="position:relative;">
          <img src="${peerAvatar}" style="width:50px; height:50px; border-radius:50%; object-fit:cover;">
          ${m.unread ? `<span style="position:absolute; top:0; right:0; width:12px; height:12px; background:#2563eb; border:2px solid #fff; border-radius:50%;"></span>` : ''}
        </div>
        <div style="flex:1;">
          <div style="font-weight:${m.unread ? '900' : '700'}; font-size:15px; color:#0f172a;">${peerName}</div>
          <div style="font-size:13px; color:${m.unread ? '#0f172a' : '#64748b'}; font-weight:${m.unread ? '700' : '400'}; margin-top:2px;">${m.lastMessage || 'Tap to chat'}</div>
        </div>
        ${activeMsgTab === 'Request'
          ? `<button onclick="event.stopPropagation(); acceptMessageRequest('${m.id}')" style="background:#16a34a; color:#fff; border:none; padding:6px 12px; border-radius:8px; font-size:12px; font-weight:700;">Accept</button>`
          : `<span style="font-size:12.5px; color:#2563eb; font-weight:700;">Reply 💬</span>`
        }
      </div>
    `;
  }).join('');
}

async function acceptMessageRequest(chatId) {
  await db.collection('chats').doc(chatId).update({
    chatCategory: 'Inbox',
    isRequest: false,
    unread: false
  });
  showToast('✅ मेसेज रिक्वेस्ट Accept केली! आता Inbox मध्ये दिसेल.');
}

async function createNewChatInCurrentTab() {
  let cat = (activeMsgTab === 'Marketplace' || activeMsgTab === 'Request') ? activeMsgTab : 'Inbox';
  await startRealChat('community_peer', cat === 'Marketplace' ? 'Royal Fashion Store' : 'Ashu Ashu', cat);
}

// कोणत्याही युजरसोबत थेट फुल-स्क्रीन Messenger विंडो उघडणे (No Prompt!)
async function startRealChat(peerUid, peerName, categoryOverride) {
  if (!currentUserData) return showToast('⚠️ कृपया आधी लॉगिन करा!');
  const chatCat = categoryOverride || (activeMsgTab === 'Marketplace' ? 'Marketplace' : 'Inbox');

  // आधीचे चॅट आहे का ते तपासा
  let existing = cacheChats.find(c =>
    (c.receiverName === peerName || c.senderName === peerName) &&
    (c.chatCategory || 'Inbox') === chatCat
  );

  let peerAvatar = 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80';

  if (existing) {
    openMessengerWindow(existing.id, peerName, existing.peerAvatar || peerAvatar, peerUid);
  } else {
    const newDoc = await db.collection('chats').add({
      participants: [currentUserData.uid, peerUid || 'peer'],
      senderUid: currentUserData.uid,
      receiverUid: peerUid || 'peer',
      senderName: currentUserData.name,
      receiverName: peerName || 'Friend',
      peerAvatar: peerAvatar,
      chatCategory: chatCat,
      isRequest: chatCat === 'Request',
      unread: true,
      lastMessage: `${currentUserData.name}: 👋 Hi`,
      messages: [
        {
          senderUid: currentUserData.uid,
          senderName: currentUserData.name,
          avatar: currentUserData.avatar,
          text: '👋 Hi',
          type: 'text',
          timeMs: Date.now()
        }
      ],
      timeMs: Date.now(),
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    openMessengerWindow(newDoc.id, peerName, peerAvatar, peerUid);
  }
}

async function openMessengerWindow(chatId, peerName, peerAvatar, peerUid) {
  activeChatDocId = chatId;
  activeChatPeerName = peerName || 'User';
  activeChatPeerAvatar = peerAvatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80';
  activeChatPeerUid = peerUid || '';

  document.getElementById('msg-win-top-name').innerText = activeChatPeerName;
  document.getElementById('msg-win-center-name').innerText = activeChatPeerName;
  document.getElementById('msg-win-top-avatar').src = activeChatPeerAvatar;
  document.getElementById('msg-win-center-avatar').src = activeChatPeerAvatar;

  document.getElementById('pro-messenger-modal').style.display = 'flex';

  const chatDoc = cacheChats.find(x => x.id === chatId);
  if (chatDoc) {
    renderMessengerBubbles(chatDoc);
    if (chatDoc.unread) {
      db.collection('chats').doc(chatId).update({ unread: false }).catch(() => {});
    }
  }
}

function closeMessengerChat() {
  activeChatDocId = null;
  document.getElementById('pro-messenger-modal').style.display = 'none';
}

function renderMessengerBubbles(chatDoc) {
  const box = document.getElementById('msg-win-bubbles');
  if (!box) return;

  const msgs = Array.isArray(chatDoc.messages) ? chatDoc.messages : [
    { senderName: chatDoc.senderName, text: chatDoc.lastMessage || '👍', type: 'text', timeMs: chatDoc.timeMs }
  ];

  const myUid = currentUserData ? currentUserData.uid : '';

  box.innerHTML = msgs.map(m => {
    const isMe = m.senderUid === myUid || m.senderName === (currentUserData && currentUserData.name);
    const isThumb = m.type === 'thumb' || m.text === '👍';

    return `
      <div style="display:flex; align-items:flex-end; gap:8px; justify-content:${isMe ? 'flex-end' : 'flex-start'};">
        ${!isMe ? `<img src="${activeChatPeerAvatar}" style="width:28px; height:28px; border-radius:50%; object-fit:cover;">` : ''}
        ${isThumb
          ? `<div style="font-size:42px; line-height:1; color:#2563eb;"><i class="fa-solid fa-thumbs-up"></i></div>`
          : `<div style="max-width:72%; padding:10px 14px; border-radius:18px; font-size:14px; background:${isMe ? '#2563eb' : '#f1f5f9'}; color:${isMe ? '#fff' : '#0f172a'};">
              ${m.text}
            </div>`
        }
      </div>
    `;
  }).join('');

  const scrollBody = document.getElementById('msg-win-body');
  if (scrollBody) scrollBody.scrollTop = scrollBody.scrollHeight;
}

async function sendMessengerText() {
  const inp = document.getElementById('msg-win-input');
  const txt = inp.value.trim();
  if (!txt || !activeChatDocId) return;
  inp.value = '';
  document.getElementById('msg-send-icon').style.display = 'none';
  document.getElementById('msg-thumb-icon').style.display = 'block';
  await appendMessageToActiveChat(txt, 'text');
}

async function sendMessengerThumb() {
  if (!activeChatDocId) return;
  await appendMessageToActiveChat('👍', 'thumb');
}

async function sendChatQuickMedia(label) {
  if (!activeChatDocId) return;
  await appendMessageToActiveChat(label, 'text');
}

async function appendMessageToActiveChat(textVal, msgType) {
  const chatDoc = cacheChats.find(x => x.id === activeChatDocId);
  let arr = (chatDoc && Array.isArray(chatDoc.messages)) ? [...chatDoc.messages] : [];

  arr.push({
    senderUid: currentUserData ? currentUserData.uid : 'user',
    senderName: currentUserData ? currentUserData.name : 'Me',
    text: textVal,
    type: msgType,
    timeMs: Date.now()
  });

  await db.collection('chats').doc(activeChatDocId).update({
    messages: arr,
    lastMessage: `${currentUserData ? currentUserData.name : 'User'}: ${textVal}`,
    unread: true,
    timeMs: Date.now(),
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
}

// =========================================================
// 5. INSTAGRAM STYLE NOTIFICATIONS PAGE (Featured, Last 7 days, Last 30 days)
// =========================================================
async function pushRealNotification(payload) {
  try {
    await db.collection('notifications').add({
      actorUid: payload.actorUid || (currentUserData ? currentUserData.uid : ''),
      actorName: payload.actorName || (currentUserData ? currentUserData.name : 'ALBIZNET User'),
      actorHandle: payload.actorHandle || '@albiznet_user',
      actorAvatar: payload.actorAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      type: payload.type || 'activity',
      text: payload.text || 'interacted with your profile.',
      postImg: payload.postImg || '',
      timeMs: Date.now(),
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch (e) {}
}

function listenToRealNotifications() {
  db.collection('notifications').onSnapshot(snap => {
    cacheNotifications = sortByCreatedDesc(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    renderProNotificationsList();
  });
}

function setupNotificationBell() {
  let bell = document.querySelector('.header-bell-btn');
  if (bell) {
    bell.onclick = function() {
      document.getElementById('pro-notifications-modal').style.display = 'flex';
      renderProNotificationsList();
    };
  }
}

function closeProNotifications() {
  document.getElementById('pro-notifications-modal').style.display = 'none';
}

function markAllNotificationsRead() {
  const dot = document.querySelector('.bell-dot');
  if (dot) dot.style.display = 'none';
  showToast('✅ सर्व नोटिफिकेशन्स वाचले गेले!');
}

function renderProNotificationsList() {
  const body = document.getElementById('pro-notif-list-body');
  if (!body) return;

  const featuredList = cacheNotifications.slice(0, 3);
  const weekList = cacheNotifications.slice(3, 8);
  const monthList = cacheNotifications.slice(8, 16);

  const renderRow = (n) => {
    const isFollow = n.type === 'follow';
    return `
      <div style="display:flex; align-items:center; gap:12px; padding:12px 16px; border-bottom:1px solid #f8fafc;">
        <img src="${n.actorAvatar || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80'}" onclick="closeProNotifications(); openUserProfile('${n.actorUid}')" style="width:46px; height:46px; border-radius:50%; object-fit:cover; flex-shrink:0; cursor:pointer;">
        <div style="flex:1; font-size:13.5px; color:#0f172a; line-height:1.35;">
          <b onclick="closeProNotifications(); openUserProfile('${n.actorUid}')" style="cursor:pointer;">${n.actorHandle || n.actorName}</b> ${n.text}
          <span style="color:#64748b; font-size:12px; margin-left:4px;">${getRelativeTime(n.timeMs)}</span>
        </div>
        ${isFollow
          ? `<button onclick="closeProNotifications(); openUserProfile('${n.actorUid}')" style="background:#4f46e5; color:#fff; border:none; padding:7px 18px; border-radius:10px; font-weight:700; font-size:13px; cursor:pointer;">Follow</button>`
          : (n.postImg
              ? `<img src="${n.postImg}" style="width:44px; height:44px; border-radius:8px; object-fit:cover; flex-shrink:0;">`
              : `<button onclick="closeProNotifications(); openUserProfile('${n.actorUid}')" style="background:#f1f5f9; color:#0f172a; border:none; padding:6px 12px; border-radius:8px; font-weight:700; font-size:12px; cursor:pointer;">View</button>`
            )
        }
      </div>
    `;
  };

  body.innerHTML = `
    <div style="padding:14px 16px 6px; font-weight:800; font-size:15px; color:#0f172a;">Featured</div>
    ${featuredList.length > 0 ? featuredList.map(renderRow).join('') : `<div style="padding:12px 16px; color:#64748b; font-size:13px;">नवीन अपडेट्स इथे दिसतील.</div>`}

    <div style="padding:18px 16px 6px; font-weight:800; font-size:15px; color:#0f172a;">Last 7 days</div>
    ${weekList.length > 0 ? weekList.map(renderRow).join('') : `
      <div style="display:flex; align-items:center; gap:12px; padding:12px 16px;">
        <div style="width:46px; height:46px; border-radius:50%; background:#eff6ff; color:#2563eb; display:flex; align-items:center; justify-content:center; font-size:20px;"><i class="fa-solid fa-bolt"></i></div>
        <div style="flex:1; font-size:13.5px; color:#0f172a;">You're now connected to <b>ALBIZNET Real-Time Cloud</b>. <span style="color:#64748b;">1d</span></div>
      </div>
    `}

    <div style="padding:18px 16px 6px; font-weight:800; font-size:15px; color:#0f172a;">Last 30 days</div>
    ${monthList.length > 0 ? monthList.map(renderRow).join('') : `
      <div style="display:flex; align-items:center; gap:12px; padding:12px 16px;">
        <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80" style="width:46px; height:46px; border-radius:50%; object-fit:cover;">
        <div style="flex:1; font-size:13.5px; color:#0f172a;"><b>albiznet_official</b> welcomed you to the community! 🎉 <span style="color:#64748b;">1w</span></div>
      </div>
    `}
  `;
}

// =========================================================
// EXPLORE & NEARBY WORKING FILTERS
// =========================================================
function listenToRealOffers() {
  db.collection('offers').onSnapshot(snap => {
    cacheOffers = sortByCreatedDesc(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    renderExploreOffers();
    if (activeNearbyFilter === 'Deals') renderNearbyStores();
    if (activePeopleTab === 'highlights') renderProfileMediaGrid();
  });
}

function selectExploreChip(chipName, el) {
  activeExploreFilter = chipName;
  document.querySelectorAll('#view-explore .f-chip').forEach(c => c.classList.remove('active'));
  if (el) el.classList.add('active');
  const heading = document.querySelector('#view-explore .explore-heading');
  if (heading) heading.innerText = `Explore ${chipName} ✨`;
  renderExploreOffers();
}

function renderExploreOffers() {
  let box = document.getElementById('explore-offers-list');
  if (!box) return;
  let q = (document.getElementById('explore-search-input')?.value || '').toLowerCase();

  if (activeExploreFilter === 'Trending Reels') {
    let reelsList = cacheReels.filter(r => (r.author || '').toLowerCase().includes(q) || (r.caption || '').toLowerCase().includes(q));
    if (reelsList.length === 0) {
      box.innerHTML = `<p style="text-align:center; padding:30px; color:#64748b;">सध्या कोणतीही Trending Reel नाही.</p>`;
      return;
    }
    box.innerHTML = reelsList.map(r => `
      <div onclick="watchRealReel('${r.id}', '${r.img}', '${r.mediaType || 'image'}', '${(r.caption || r.author || '').replace(/'/g, '')}')" style="background:#fff; border-radius:14px; padding:12px; margin:10px 14px; display:flex; gap:12px; align-items:center; box-shadow:0 2px 8px rgba(0,0,0,0.05); cursor:pointer;">
        <div style="width:70px; height:90px; background:#000; border-radius:10px; overflow:hidden; display:flex; align-items:center; justify-content:center; color:#fff;">▶</div>
        <div style="flex:1;">
          <span style="background:#fee2e2; color:#dc2626; font-size:11px; font-weight:800; padding:2px 8px; border-radius:8px;">🎬 Reel &bull; ${r.views || 1} Views</span>
          <h4 style="margin:6px 0 4px; font-size:15px;">${r.caption || 'Trending Reel'}</h4>
          <div style="font-size:12px; color:#64748b;">By ${r.author}</div>
        </div>
      </div>
    `).join('');
    return;
  }

  if (activeExploreFilter === 'Jobs' || activeExploreFilter === 'News' || activeExploreFilter === 'Food') {
    let key = activeExploreFilter.toLowerCase();
    let matched = cachePosts.filter(p => ((p.category || '').toLowerCase().includes(key) || (p.caption || '').toLowerCase().includes(key)));
    if (matched.length === 0) {
      box.innerHTML = `<p style="text-align:center; padding:30px; color:#64748b;">सध्या <b>${activeExploreFilter}</b> मध्ये कोणतीही माहिती नाही. '+ Create ➔ Post' मधून टाका!</p>`;
      return;
    }
    box.innerHTML = matched.map(item => `
      <div style="background:#fff; border-radius:14px; padding:14px; margin:10px 14px; box-shadow:0 2px 8px rgba(0,0,0,0.05);">
        <span style="background:#e0e7ff; color:#4f46e5; font-size:11px; font-weight:800; padding:2px 8px; border-radius:6px;">${activeExploreFilter}</span>
        <h4 style="margin:6px 0 4px; font-size:15px;">${item.caption}</h4>
        <div style="font-size:12px; color:#64748b;">By ${item.author} &bull; ${item.location}</div>
      </div>
    `).join('');
    return;
  }

  let filteredOffers = cacheOffers.filter(o => (o.deal || '').toLowerCase().includes(q) || (o.bizName || '').toLowerCase().includes(q));
  if (filteredOffers.length === 0) {
    box.innerHTML = `<p style="text-align:center; padding:30px; color:#64748b;">सध्या कोणतीही ऑफर नाही. '+ Create ➔ Offer' मधून नवीन ऑफर टाका!</p>`;
    return;
  }
  box.innerHTML = filteredOffers.map(o => `
    <div class="offer-banner-card" style="background:#fff; border-radius:16px; overflow:hidden; margin:12px 14px; box-shadow:0 2px 10px rgba(0,0,0,0.06);">
      <div style="background-image:url('${o.img}'); height:145px; background-size:cover; background-position:center; position:relative; padding:14px; display:flex; align-items:flex-end; color:#fff;">
        <div style="position:absolute; inset:0; background:linear-gradient(transparent, rgba(0,0,0,0.8));"></div>
        <div style="position:relative; z-index:1;">
          <div style="font-size:13px; font-weight:700; color:#38bdf8;">${o.bizName}</div>
          <div style="font-size:18px; font-weight:900;">${o.deal}</div>
          <div style="font-size:11.5px;">📍 ${o.location} &bull; ${o.validity}</div>
        </div>
      </div>
      <div style="display:flex; gap:8px; padding:10px 14px;">
        <button onclick="openUserProfile('${o.uid}')" style="flex:1; background:#4f46e5; color:#fff; border:none; padding:8px; border-radius:8px; font-weight:700; cursor:pointer;">Store</button>
        <button onclick="startRealChat('${o.uid}', '${o.bizName}', 'Marketplace')" style="flex:1; background:#eff6ff; color:#2563eb; border:none; padding:8px; border-radius:8px; font-weight:700; cursor:pointer;">Chat</button>
      </div>
    </div>
  `).join('');
}

function listenToRealNearbyStores() {
  db.collection('users').where('type', '==', 'business').onSnapshot(snap => {
    cacheBusinesses = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderNearbyStores();
  });
}

function filterNearbyCat(catName, el) {
  activeNearbyFilter = catName;
  document.querySelectorAll('#view-nearby .f-chip').forEach(c => c.classList.remove('active-blue', 'active'));
  if (el) el.classList.add('active-blue');
  renderNearbyStores();
}

function renderNearbyStores() {
  let box = document.getElementById('nearby-stores-list');
  if (!box) return;
  let q = (document.getElementById('nearby-search-input')?.value || '').toLowerCase();

  if (activeNearbyFilter === 'Deals') {
    if (cacheOffers.length === 0) {
      box.innerHTML = `<p style="text-align:center; padding:30px; color:#64748b;">सध्या कोणतीही Deal नाही.</p>`;
      return;
    }
    box.innerHTML = cacheOffers.map(o => `
      <div style="background:#fff; padding:12px; margin:10px 14px; border-radius:14px; display:flex; gap:12px; align-items:center;">
        <img src="${o.img}" style="width:65px; height:65px; border-radius:10px; object-fit:cover;">
        <div style="flex:1;">
          <h4 style="margin:0;">${o.deal}</h4>
          <div style="font-size:12px; color:#64748b;">${o.bizName} &bull; ${o.location}</div>
        </div>
        <button onclick="startRealChat('${o.uid}', '${o.bizName}', 'Marketplace')" style="background:#2563eb; color:#fff; border:none; padding:8px 12px; border-radius:8px; font-weight:700;">Chat</button>
      </div>
    `).join('');
    return;
  }

  let stores = cacheBusinesses.filter(s => {
    let matchQ = (s.name || '').toLowerCase().includes(q) || (s.category || '').toLowerCase().includes(q);
    if (!matchQ) return false;
    if (activeNearbyFilter === 'All') return true;
    return (s.category || '').toLowerCase().includes(activeNearbyFilter.toLowerCase());
  });

  if (stores.length === 0) {
    box.innerHTML = `<div style="text-align:center; padding:30px; color:#64748b;">अजून <b>${activeNearbyFilter}</b> मध्ये कोणतेही Business अकाउंट नाही.</div>`;
    return;
  }

  box.innerHTML = stores.map(s => `
    <div style="background:#fff; border-radius:16px; padding:14px; margin:12px 14px; display:flex; gap:12px; box-shadow:0 2px 10px rgba(0,0,0,0.05);">
      <img src="${s.avatar}" onclick="openUserProfile('${s.uid}')" style="width:75px; height:75px; border-radius:12px; object-fit:cover; cursor:pointer;">
      <div style="flex:1;">
        <div onclick="openUserProfile('${s.uid}')" style="font-weight:800; font-size:15.5px; cursor:pointer;">${s.name}</div>
        <div style="font-size:12px; color:#4f46e5; font-weight:700;">${s.category || 'Shops'} &bull; 📍 ${s.location}</div>
        <div style="display:flex; gap:8px; margin-top:8px;">
          <button onclick="window.location.href='tel:${s.phone || '9876543210'}'" style="background:#f1f5f9; border:none; padding:6px 10px; border-radius:8px; font-size:12px; font-weight:700;">📞 Call</button>
          <button onclick="startRealChat('${s.uid}', '${s.name}', 'Marketplace')" style="background:#2563eb; color:#fff; border:none; padding:6px 12px; border-radius:8px; font-size:12px; font-weight:700;">💬 Message</button>
        </div>
      </div>
    </div>
  `).join('');
}

// =========================================================
// 6. PROFILE, FOLLOW & MEDIA VIEWER (Supports Both Video & Photo)
// =========================================================
async function openUserProfile(targetUid) {
  if (!targetUid) return;
  const doc = await db.collection('users').doc(targetUid).get();
  if (!doc.exists) return;
  activeProfileUser = { uid: doc.id, ...doc.data() };

  const views = ['home', 'explore', 'nearby', 'messages', 'profile'];
  views.forEach(v => {
    document.getElementById('view-' + v).style.display = (v === 'profile') ? 'block' : 'none';
    document.getElementById('bnav-' + v).classList.toggle('active', v === 'profile');
  });
  document.getElementById('main-top-header').style.display = 'none';
  renderProfileData(activeProfileUser);
}

function loadProfileView() {
  if (!currentUserData) return;
  openUserProfile(currentUserData.uid);
}

async function renderProfileData(u) {
  if (u.type === 'business') {
    document.getElementById('people-profile-box').style.display = 'none';
    document.getElementById('business-profile-box').style.display = 'block';
    document.getElementById('b-prof-name').innerText = u.name;
    document.getElementById('b-prof-cat').innerText = u.category || 'Business Store';
    document.getElementById('b-prof-about').innerText = u.about || '';
    document.getElementById('b-prof-loc').innerText = u.location || '';
    document.getElementById('b-prof-phone').innerText = u.phone || '+91 98765 43210';
    document.getElementById('b-stat-followers').innerText = u.followersCount || 0;
    document.getElementById('b-stat-following').innerText = u.followingCount || 0;
    if (u.avatar) document.getElementById('b-prof-logo').src = u.avatar;

    const myProducts = cacheProducts.filter(p => p.uid === u.uid);
    let miniBox = document.getElementById('biz-mini-products');
    miniBox.innerHTML = myProducts.length === 0
      ? `<div style="padding:12px; color:#64748b; font-size:12.5px;">अजून प्रॉडक्ट नाही.</div>`
      : myProducts.map(p => `
        <div onclick="openProductDetail('${p.id}')" style="min-width:125px; background:#f8fafc; padding:8px; border-radius:12px; margin-right:10px; text-align:center; cursor:pointer;">
          <img src="${p.img}" style="width:100%; height:90px; object-fit:cover; border-radius:8px;">
          <div style="font-size:12px; font-weight:700; margin-top:4px;">${p.title}</div>
          <b style="color:#2563eb; font-size:12px;">${p.price}</b>
        </div>
      `).join('');
  } else {
    document.getElementById('business-profile-box').style.display = 'none';
    document.getElementById('people-profile-box').style.display = 'block';
    document.getElementById('p-prof-name').innerText = u.name;
    document.getElementById('p-prof-loc').innerText = u.location || '';
    document.getElementById('p-prof-about').innerText = u.about || '';
    document.getElementById('p-stat-followers').innerText = u.followersCount || 0;
    document.getElementById('p-stat-following').innerText = u.followingCount || 0;
    if (u.avatar) document.getElementById('p-prof-avatar').src = u.avatar;
    renderProfileMediaGrid();
  }
}

function switchPeopleMediaTab(tabName, el) {
  activePeopleTab = tabName;
  document.querySelectorAll('#people-sub-tabs span').forEach(s => s.classList.remove('active'));
  if (el) el.classList.add('active');
  renderProfileMediaGrid();
}

function renderProfileMediaGrid() {
  let grid = document.getElementById('people-media-grid');
  if (!grid) return;
  let targetUid = activeProfileUser ? activeProfileUser.uid : (currentUserData ? currentUserData.uid : '');

  let userPosts = cachePosts.filter(p => p.uid === targetUid);
  let userReels = cacheReels.filter(r => r.uid === targetUid);
  let userStories = cacheStories.filter(s => s.uid === targetUid);
  let userHighlights = [...cacheNotes.filter(n => n.uid === targetUid), ...cacheOffers.filter(o => o.uid === targetUid)];

  let statPostsEl = document.getElementById('p-stat-posts');
  if (statPostsEl) statPostsEl.innerText = userPosts.length + userReels.length + userStories.length + userHighlights.length;

  let items = activePeopleTab === 'posts' ? userPosts : (activePeopleTab === 'reels' ? userReels : (activePeopleTab === 'moments' ? userStories : userHighlights));

  if (items.length === 0) {
    grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:24px; color:#64748b; font-size:13px;">या विभागात अजून माहिती नाही.</div>`;
    return;
  }

  grid.innerHTML = items.map(item => {
    let label = item.caption || item.deal || item.noteText || 'Media';
    let isVid = item.mediaType === 'video' || (item.img && item.img.startsWith('data:video'));
    return `
      <div onclick="openMediaViewer('${item.img}', '${isVid ? 'video' : 'image'}', '${label.replace(/'/g, '')}')" style="position:relative; aspect-ratio:1/1; border-radius:12px; overflow:hidden; cursor:pointer; background:#0f172a;">
        ${isVid
          ? `<video src="${item.img}" style="width:100%; height:100%; object-fit:cover;" muted></video>`
          : `<img src="${item.img}" style="width:100%; height:100%; object-fit:cover;">`
        }
      </div>
    `;
  }).join('');
}

async function toggleFollowPeopleProfile() { await executeRealFollow(); }
async function toggleFollowActiveBiz() { await executeRealFollow(); }

async function executeRealFollow() {
  if (!currentUserData || !activeProfileUser) return;
  const myUid = currentUserData.uid;
  const targetUid = activeProfileUser.uid;
  const followDocRef = db.collection('users').doc(targetUid).collection('followers').doc(myUid);
  const snap = await followDocRef.get();

  if (!snap.exists) {
    await followDocRef.set({ uid: myUid, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
    await db.collection('users').doc(targetUid).update({ followersCount: firebase.firestore.FieldValue.increment(1) });
    await db.collection('users').doc(myUid).update({ followingCount: firebase.firestore.FieldValue.increment(1) });
    await pushRealNotification({
      type: 'follow',
      actorUid: currentUserData.uid,
      actorName: currentUserData.name,
      actorHandle: currentUserData.handle || '@user',
      actorAvatar: currentUserData.avatar,
      text: `started following ${activeProfileUser.name}.`
    });
    showToast(`✅ तुम्ही ${activeProfileUser.name} ला Follow केले!`);
  } else {
    await followDocRef.delete();
    await db.collection('users').doc(targetUid).update({ followersCount: firebase.firestore.FieldValue.increment(-1) });
    await db.collection('users').doc(myUid).update({ followingCount: firebase.firestore.FieldValue.increment(-1) });
    showToast(`Unfollowed ${activeProfileUser.name}`);
  }
  openUserProfile(targetUid);
}

function startChatWithActiveBiz() {
  if (activeProfileUser) startRealChat(activeProfileUser.uid, activeProfileUser.name, 'Marketplace');
}
function callActiveBiz() {
  let ph = activeProfileUser && activeProfileUser.phone ? activeProfileUser.phone : '9876543210';
  window.location.href = `tel:${ph}`;
}
function directionsActiveBiz() {
  let loc = activeProfileUser && activeProfileUser.location ? activeProfileUser.location : 'Ardhapur, Maharashtra';
  openGoogleMapLink(loc);
}

function openFullCatalogModal() {
  document.getElementById('catalog-modal').style.display = 'flex';
  renderCatalogGrid();
}
function closeCatalogModal() { document.getElementById('catalog-modal').style.display = 'none'; }
function filterCatalogItems(cat, el) {
  activeCatalogFilter = cat;
  document.querySelectorAll('#catalog-modal .f-chip').forEach(c => c.classList.remove('active-blue'));
  if (el) el.classList.add('active-blue');
  renderCatalogGrid();
}
function searchCatalogItems() { renderCatalogGrid(); }

function renderCatalogGrid() {
  let box = document.getElementById('catalog-grid-box');
  if (!box) return;
  let q = (document.getElementById('catalog-search-q')?.value || '').toLowerCase();
  let list = cacheProducts.filter(p => (p.title || '').toLowerCase().includes(q) && (activeCatalogFilter === 'All' || (p.cat || '').toLowerCase() === activeCatalogFilter.toLowerCase()));
  box.innerHTML = list.length === 0
    ? `<p style="grid-column:1/-1; text-align:center; padding:30px; color:#64748b;">प्रॉडक्ट सापडले नाही.</p>`
    : list.map(p => `
      <div onclick="openProductDetail('${p.id}')" style="background:#fff; border-radius:14px; padding:10px; cursor:pointer;">
        <img src="${p.img}" style="width:100%; height:130px; object-fit:cover; border-radius:10px;">
        <h4 style="margin:8px 0 4px; font-size:14px;">${p.title}</h4>
        <div style="color:#2563eb; font-weight:800;">${p.price}</div>
      </div>
    `).join('');
}

function openProductDetail(prodId) {
  let p = cacheProducts.find(x => x.id === prodId);
  if (!p) return;
  document.getElementById('pd-main-img').src = p.img;
  document.getElementById('pd-title').innerText = p.title;
  document.getElementById('pd-price').innerText = p.price;
  document.getElementById('pd-desc').innerText = p.desc || '';
  document.getElementById('pd-cat').innerText = p.cat || 'Fashion';
  document.getElementById('product-detail-modal').style.display = 'flex';
}
function closeProductDetailModal() { document.getElementById('product-detail-modal').style.display = 'none'; }

// =========================================================
// SETTINGS, NAVIGATION & VIDEO/IMAGE LIGHTBOX
// =========================================================
async function editUserField(fieldKey, labelName) {
  if (!currentUserData) return;
  let newVal = prompt(`नवीन ${labelName} टाका:`, currentUserData[fieldKey] || '');
  if (!newVal) return;
  await db.collection('users').doc(currentUserData.uid).update({ [fieldKey]: newVal });
  currentUserData[fieldKey] = newVal;
  showToast(`✅ तुमचे ${labelName} सेव्ह झाले!`);
  openUserProfile(currentUserData.uid);
}

async function switchUserRoleTo(newType) {
  if (!currentUserData) return;
  let newCat = currentUserData.category || 'Shops';
  if (newType === 'business') {
    newCat = prompt('व्यवसायाची कॅटेगरी लिहा (Shops, Services किंवा Restaurants):', 'Shops') || 'Shops';
  }
  await db.collection('users').doc(currentUserData.uid).update({ type: newType, category: newCat });
  currentUserData.type = newType;
  currentUserData.category = newCat;
  closeSettingsScreen();
  openUserProfile(currentUserData.uid);
  showToast(`🔄 तुमचे अकाउंट ${newType.toUpperCase()} मध्ये बदलले!`);
}

function openSettingsScreen() {
  if (!currentUserData) return;
  document.getElementById('set-banner-name').innerText = currentUserData.name;
  document.getElementById('set-banner-sub').innerText = currentUserData.handle || '@user';
  document.getElementById('settings-grid-content').innerHTML = `
    <div class="set-card" style="background:#fff; padding:14px; border-radius:14px; margin-bottom:12px;">
      <h5 style="margin:0 0 10px; font-size:14px; color:#4f46e5;">Edit Real Profile</h5>
      <div onclick="editUserField('name', 'नाव')" style="padding:8px 0; border-bottom:1px solid #f1f5f9; cursor:pointer;">✏️ नाव बदला</div>
      <div onclick="editUserField('about', 'माहिती')" style="padding:8px 0; border-bottom:1px solid #f1f5f9; cursor:pointer;">📝 बायो बदला</div>
      <div onclick="editUserField('location', 'लोकेशन')" style="padding:8px 0; cursor:pointer;">📍 लोकेशन बदला</div>
    </div>
    <div class="set-card" style="background:#fff; padding:14px; border-radius:14px;">
      <h5 style="margin:0 0 10px; font-size:14px; color:#4f46e5;">Account Role</h5>
      <div onclick="switchUserRoleTo('business')" style="padding:8px 0; border-bottom:1px solid #f1f5f9; cursor:pointer;">🏪 Switch to Business Store</div>
      <div onclick="switchUserRoleTo('people')" style="padding:8px 0; cursor:pointer;">👤 Switch to Personal Account</div>
    </div>
  `;
  document.getElementById('settings-modal').style.display = 'flex';
}
function closeSettingsScreen() { document.getElementById('settings-modal').style.display = 'none'; }

async function logoutCurrentUser() {
  if (auth) await auth.signOut();
  currentUserData = null;
  closeSettingsScreen();
  showToast('👋 यशस्वीरित्या Log Out झाले!');
}

function switchBottomNav(tab) {
  const views = ['home', 'explore', 'nearby', 'messages', 'profile'];
  views.forEach(v => {
    document.getElementById('view-' + v).style.display = (v === tab) ? 'block' : 'none';
    document.getElementById('bnav-' + v).classList.toggle('active', v === tab);
  });
  document.getElementById('main-top-header').style.display = (tab === 'home' || tab === 'explore') ? 'flex' : 'none';
  if (tab === 'profile') loadProfileView();
  window.scrollTo(0, 0);
}

// फोटो आणि व्हिडिओ दोन्ही फुल-स्क्रीनमध्ये चालवणारा व्ह्यूअर!
function openMediaViewer(url, mediaType, captionText) {
  if (!url) return;
  const imgEl = document.getElementById('lightbox-img');
  const capEl = document.getElementById('lightbox-caption');
  let vidEl = document.getElementById('lightbox-video');

  if (!vidEl && imgEl) {
    vidEl = document.createElement('video');
    vidEl.id = 'lightbox-video';
    vidEl.controls = true;
    vidEl.autoplay = true;
    vidEl.playsInline = true;
    vidEl.style.cssText = 'width:100%; max-height:72vh; border-radius:16px; background:#000; display:none;';
    imgEl.parentNode.insertBefore(vidEl, imgEl);
  }

  const isVid = mediaType === 'video' || url.startsWith('data:video');
  if (isVid && vidEl) {
    imgEl.style.display = 'none';
    vidEl.style.display = 'block';
    vidEl.src = url;
    vidEl.play().catch(() => {});
  } else {
    if (vidEl) { vidEl.pause(); vidEl.style.display = 'none'; }
    imgEl.style.display = 'block';
    imgEl.src = url;
  }

  if (capEl) capEl.innerText = captionText || '';
  document.getElementById('gallery-lightbox-modal').style.display = 'flex';
}

function openImageLightbox(imgUrl, captionText) {
  openMediaViewer(imgUrl, 'image', captionText);
}

function closeImageLightbox() {
  let vidEl = document.getElementById('lightbox-video');
  if (vidEl) vidEl.pause();
  document.getElementById('gallery-lightbox-modal').style.display = 'none';
}

function openGoogleMapLink(query) {
  window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query || 'Ardhapur, Maharashtra')}`, '_blank');
}
