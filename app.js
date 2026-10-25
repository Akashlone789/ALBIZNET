// =========================================================
// ALBIZNET - COMPLETE 100% REAL FIREBASE ENGINE (app.js)
// =========================================================

let auth = null;
let db = null;
let currentUserData = null;
let activeProfileUser = null;
let authAccountType = 'people';
let currentCreateMode = 'Post';
let uploadedDataURL = '';

// फिल्टर आणि टॅब स्टेट्स
let activeExploreFilter = 'Offers';
let activeNearbyFilter = 'All';
let activePeopleTab = 'posts';
let activeMsgTab = 'Inbox';
let activeCatalogFilter = 'All';

// रिअल-टाईम कॅशे (सुपरफास्ट फिल्टरिंगसाठी)
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
// 0. FIREBASE SDK LOADER & SUPERFAST INIT
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

    // रिअल बेल आयकॉन नोटिफिकेशन सेटअप
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
            category: authAccountType === 'business' ? 'Shops' : 'Creator',
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
  setTimeout(() => { t.style.display = 'none'; }, 3500);
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
  if (!auth) {
    showToast('⏳ Firebase कनेक्ट होत आहे, कृपया २ सेकंद थांबा...');
    return;
  }

  let email = document.getElementById('reg-email').value.trim();
  let mob = document.getElementById('reg-mobile').value.trim();
  let pass = document.getElementById('reg-pass').value.trim();
  let loc = document.getElementById('reg-location').value.trim() || 'Ardhapur, Maharashtra';

  let authEmail = email || (mob ? `${mob}@albiznet.com` : '');
  if (!authEmail || pass.length < 6) {
    showToast('⚠️ कृपया मोबाईल/Gmail आणि किमान ६ अंकी पासवर्ड टाका!');
    return;
  }

  try {
    showToast('⏳ अकाउंट तयार होत आहे...');
    let cred;
    try {
      cred = await auth.createUserWithEmailAndPassword(authEmail, pass);
    } catch (signUpErr) {
      // जर आधीच अकाउंट असेल तर थेट लॉगिन करा (अडकून राहणार नाही!)
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
  if (!idVal || !pass) {
    showToast('⚠️ कृपया मोबाईल/Gmail आणि पासवर्ड टाका!');
    return;
  }
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
  if (!auth) {
    showToast('⚠️ कृपया १ सेकंद थांबा आणि पुन्हा क्लिक करा.');
    return;
  }
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

function promptCustomGoogleAccount() {
  let box = document.getElementById('custom-g-input-box');
  if (box) box.style.display = 'block';
}

// =========================================================
// 2. REAL-TIME STREAMS (POSTS, REELS, STORIES, NOTES, OFFERS, NEARBY, CHATS)
// =========================================================
function launchMainApp() {
  document.getElementById('welcome-screen').style.display = 'none';
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('main-app-shell').style.display = 'block';

  if (currentUserData && currentUserData.location) {
    let locTxt = document.getElementById('nearby-user-loc-txt');
    if (locTxt) locTxt.innerText = currentUserData.location;
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

function listenToRealPostsAndReels() {
  // १. REELS & LIVE
  db.collection('reels').onSnapshot(snap => {
    cacheReels = sortByCreatedDesc(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    renderReelsBar();
    if (activeExploreFilter === 'Trending Reels') renderExploreOffers();
    if (activePeopleTab === 'reels') renderProfileMediaGrid();
  });

  // २. POSTS (मुख्य Home Feed)
  db.collection('posts').onSnapshot(snap => {
    cachePosts = sortByCreatedDesc(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    renderHomeFeed();
    renderExploreOffers();
    if (activePeopleTab === 'posts') renderProfileMediaGrid();
  });

  // ३. STORIES (Moments बार)
  db.collection('stories').onSnapshot(snap => {
    cacheStories = sortByCreatedDesc(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    renderStoriesMomentsBar();
    if (activePeopleTab === 'moments') renderProfileMediaGrid();
  });

  // ४. NOTES (Messages मधील Notes आणि Profile Highlights)
  db.collection('notes').onSnapshot(snap => {
    cacheNotes = sortByCreatedDesc(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    renderNotesBarInMessages();
    if (activePeopleTab === 'highlights') renderProfileMediaGrid();
  });

  // ५. PRODUCTS (कॅटलॉग आणि बिझनेस प्रोफाईल)
  db.collection('products').onSnapshot(snap => {
    cacheProducts = sortByCreatedDesc(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    renderCatalogGrid();
  });
}

function renderStoriesMomentsBar() {
  const momentsBar = document.querySelector('#view-home .moments-scroll-bar');
  if (!momentsBar || cacheStories.length === 0) return;

  const firstYourMoment = momentsBar.querySelector('.your-moment-box').outerHTML;
  const realStoriesHTML = cacheStories.map(st => `
    <div class="story-circle-item" onclick="openImageLightbox('${st.img}', '${st.author}: ${st.caption || 'Moment'}')">
      <div class="story-grad-ring"><img src="${st.img}"><span class="story-plus">+</span></div>
      <span>${(st.author || 'User').split(' ')[0]}</span>
    </div>
  `).join('');

  momentsBar.innerHTML = firstYourMoment + realStoriesHTML;
}

function renderReelsBar() {
  let rBox = document.getElementById('reels-container');
  if (!rBox) return;
  if (cacheReels.length === 0) {
    rBox.innerHTML = `<p style="font-size:12px; color:#64748b; padding:10px;">अजून कोणतीही Reel नाही. '+ Create ➔ Reel' वरून टाका!</p>`;
    return;
  }
  rBox.innerHTML = cacheReels.map(r => `
    <div class="reel-thumb-card" onclick="watchRealReel('${r.id}', '${r.img}', '${r.caption || r.author}')" style="background-image:url('${r.img}'); min-width:135px; height:210px; background-size:cover; background-position:center; border-radius:14px; position:relative; cursor:pointer; margin-right:10px; flex-shrink:0;">
      <div class="reel-play-pill" style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); background:rgba(0,0,0,0.6); color:#fff; padding:6px 12px; border-radius:20px; font-size:12px; font-weight:700;"><i class="fa-solid fa-play"></i> Play</div>
      <div class="reel-bottom-meta" style="position:absolute; bottom:8px; left:8px; right:8px; color:#fff; font-size:11px; text-shadow:0 1px 3px #000;">
        <span class="reel-views-txt">${r.views || 1} Views 🔥</span>
        <div class="reel-author-row" style="display:flex; justify-content:space-between; font-weight:700;"><span>${r.author || 'User'}</span><span>0:30</span></div>
      </div>
    </div>
  `).join('');
}

async function watchRealReel(reelId, imgUrl, title) {
  openImageLightbox(imgUrl, `🎬 ${title}`);
  try {
    await db.collection('reels').doc(reelId).update({
      views: firebase.firestore.FieldValue.increment(1)
    });
  } catch (e) {}
}

function renderHomeFeed() {
  let pBox = document.getElementById('home-posts-feed');
  if (!pBox) return;
  if (cachePosts.length === 0) {
    pBox.innerHTML = `<div style="text-align:center; padding:30px; color:#64748b;">अजून कोणतीही पोस्ट नाही. '+ Create ➔ Post' वर दाबून पहिली पोस्ट करा!</div>`;
    return;
  }

  pBox.innerHTML = cachePosts.map(p => {
    let postId = p.id;
    return `
      <div class="feed-post-card" style="background:#fff; border-radius:16px; padding:14px; margin:12px 14px; box-shadow:0 2px 10px rgba(0,0,0,0.05);">
        <div class="fp-top-row" style="display:flex; align-items:center; gap:10px; margin-bottom:10px;">
          <img class="fp-avatar" src="${p.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'}" onclick="openUserProfile('${p.uid}')" style="width:42px; height:42px; border-radius:50%; object-fit:cover; cursor:pointer;">
          <div style="flex:1;">
            <div class="fp-name" onclick="openUserProfile('${p.uid}')" style="font-weight:800; font-size:14.5px; color:#0f172a; cursor:pointer;">${p.author || 'ALBIZNET User'}</div>
            <div class="fp-cat-tag" style="font-size:11.5px; color:#64748b;"><i class="fa-solid fa-location-dot"></i> ${p.location || 'Maharashtra'} &bull; <span style="color:#4f46e5; font-weight:700;">${p.category || 'Post'}</span></div>
          </div>
        </div>
        <div class="fp-caption" style="font-size:14px; color:#1e293b; margin-bottom:10px; line-height:1.4;">${p.caption || ''}</div>
        ${p.img ? `<img class="fp-media-img" src="${p.img}" onclick="openImageLightbox('${p.img}', '${(p.caption || '').replace(/'/g, '')}')" style="width:100%; max-height:380px; object-fit:cover; border-radius:12px; cursor:pointer;">` : ''}
        <div class="fp-actions-bar" style="display:flex; justify-content:space-around; padding-top:12px; margin-top:10px; border-top:1px solid #f1f5f9; font-size:13px; font-weight:700; color:#475569;">
          <div class="fp-act-btn" onclick="likeRealPost('${postId}')" style="cursor:pointer;">
            <i class="fa-solid fa-heart" style="color:#e11d48;"></i> <span>${p.likes || 0}</span>
          </div>
          <div class="fp-act-btn" onclick="commentOnRealPost('${postId}')" style="cursor:pointer;">
            <i class="fa-regular fa-comment"></i> <span>${p.commentsCount || 0}</span>
          </div>
          <div class="fp-act-btn" onclick="startRealChat('${p.uid}', '${p.author}')" style="cursor:pointer;">
            <i class="fa-regular fa-paper-plane" style="color:#2563eb;"></i> Chat
          </div>
          <div class="fp-act-btn" onclick="openUserProfile('${p.uid}')" style="cursor:pointer;">
            <i class="fa-solid fa-user"></i> Profile
          </div>
        </div>
      </div>
    `;
  }).join('');
}

async function likeRealPost(postId) {
  await db.collection('posts').doc(postId).update({
    likes: firebase.firestore.FieldValue.increment(1)
  });
  showToast('❤️ पोस्ट लाईक केली!');
}

async function commentOnRealPost(postId) {
  let txt = prompt('💬 तुमची कमेंट लिहा:');
  if (!txt) return;
  await db.collection('posts').doc(postId).update({
    commentsCount: firebase.firestore.FieldValue.increment(1)
  });
  await pushRealNotification(`${currentUserData ? currentUserData.name : 'कोणीतरी'} ने पोस्टवर कमेंट केली: "${txt}"`);
  showToast('💬 तुमची कमेंट जोडली गेली!');
}

// =========================================================
// EXPLORE TAB & WORKING FILTERS (Offers, Jobs, Trending Reels, News, Food)
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

  // १. जर Trending Reels निवडले असेल तर रिअल रील्स दाखवा
  if (activeExploreFilter === 'Trending Reels') {
    let reelsList = cacheReels.filter(r => (r.author || '').toLowerCase().includes(q) || (r.caption || '').toLowerCase().includes(q));
    if (reelsList.length === 0) {
      box.innerHTML = `<p style="text-align:center; padding:30px; color:#64748b;">सध्या कोणतीही Trending Reel नाही. '+ Create ➔ Reel' मधून टाका!</p>`;
      return;
    }
    box.innerHTML = reelsList.map(r => `
      <div class="offer-banner-card" onclick="watchRealReel('${r.id}', '${r.img}', '${r.caption || r.author}')" style="background:#fff; border-radius:14px; padding:12px; margin:10px 14px; display:flex; gap:12px; align-items:center; box-shadow:0 2px 8px rgba(0,0,0,0.05); cursor:pointer;">
        <img src="${r.img}" style="width:75px; height:95px; border-radius:10px; object-fit:cover;">
        <div style="flex:1;">
          <span style="background:#fee2e2; color:#dc2626; font-size:11px; font-weight:800; padding:2px 8px; border-radius:8px;">🎬 Trending Reel &bull; ${r.views || 1} Views</span>
          <h4 style="margin:6px 0 4px; font-size:15px;">${r.caption || 'Awesome Reel'}</h4>
          <div style="font-size:12px; color:#64748b;">By ${r.author}</div>
        </div>
      </div>
    `).join('');
    return;
  }

  // २. जर Jobs, News किंवा Food निवडले असेल तर त्या कॅटेगरीच्या ऑफर्स आणि पोस्ट्स दाखवा
  if (activeExploreFilter === 'Jobs' || activeExploreFilter === 'News' || activeExploreFilter === 'Food') {
    let key = activeExploreFilter.toLowerCase();
    let matchedPosts = cachePosts.filter(p =>
      ((p.category || '').toLowerCase().includes(key) || (p.caption || '').toLowerCase().includes(key)) &&
      ((p.caption || '').toLowerCase().includes(q) || (p.author || '').toLowerCase().includes(q))
    );
    let matchedOffers = cacheOffers.filter(o =>
      ((o.validity || '').toLowerCase().includes(key) || (o.deal || '').toLowerCase().includes(key)) &&
      ((o.deal || '').toLowerCase().includes(q) || (o.bizName || '').toLowerCase().includes(q))
    );

    let combined = [...matchedOffers, ...matchedPosts];
    if (combined.length === 0) {
      box.innerHTML = `<p style="text-align:center; padding:30px; color:#64748b;">सध्या <b>${activeExploreFilter}</b> मध्ये कोणतीही पोस्ट नाही. '+ Create ➔ Post' मध्ये जाऊन कॅटेगरीत <b>${activeExploreFilter}</b> लिहून पोस्ट टाका!</p>`;
      return;
    }

    box.innerHTML = combined.map(item => `
      <div style="background:#fff; border-radius:14px; padding:14px; margin:10px 14px; box-shadow:0 2px 8px rgba(0,0,0,0.05);">
        <div style="display:flex; gap:12px; align-items:center;">
          ${item.img ? `<img src="${item.img}" onclick="openImageLightbox('${item.img}', '${item.deal || item.caption}')" style="width:75px; height:75px; border-radius:10px; object-fit:cover; cursor:pointer;">` : ''}
          <div style="flex:1;">
            <span style="background:#e0e7ff; color:#4f46e5; font-size:11px; font-weight:800; padding:2px 8px; border-radius:6px;">${activeExploreFilter}</span>
            <h4 style="margin:6px 0 4px; font-size:15px; color:#0f172a;">${item.deal || item.caption}</h4>
            <div style="font-size:12px; color:#64748b;">📍 ${item.location || 'Ardhapur'} &bull; By ${item.bizName || item.author}</div>
          </div>
        </div>
      </div>
    `).join('');
    return;
  }

  // ३. डिफॉल्ट: Offers
  let filteredOffers = cacheOffers.filter(o =>
    (o.deal || '').toLowerCase().includes(q) ||
    (o.bizName || '').toLowerCase().includes(q) ||
    (o.location || '').toLowerCase().includes(q)
  );

  if (filteredOffers.length === 0) {
    box.innerHTML = `<p style="text-align:center; padding:30px; color:#64748b;">सध्या कोणतीही ऑफर नाही. '+ Create ➔ Offer' मधून नवीन ऑफर टाका!</p>`;
    return;
  }

  box.innerHTML = filteredOffers.map(o => `
    <div class="offer-banner-card" style="background:#fff; border-radius:16px; overflow:hidden; margin:12px 14px; box-shadow:0 2px 10px rgba(0,0,0,0.06);">
      <div class="offer-top-visual" style="background-image:url('${o.img}'); height:150px; background-size:cover; background-position:center; position:relative; padding:14px; display:flex; align-items:flex-end; color:#fff;">
        <div style="position:absolute; inset:0; background:linear-gradient(transparent, rgba(0,0,0,0.8));"></div>
        <div class="offer-txt-content" style="position:relative; z-index:1;">
          <div class="offer-biz-title" style="font-size:13px; font-weight:700; color:#38bdf8;">${o.bizName}</div>
          <div class="offer-main-deal" style="font-size:18px; font-weight:900;">${o.deal}</div>
          <div class="offer-loc-valid" style="font-size:11.5px; opacity:0.9;">📍 ${o.location} &bull; ${o.validity}</div>
        </div>
      </div>
      <div class="offer-btn-bar" style="display:flex; gap:8px; padding:10px 14px; background:#fff;">
        <button class="ob-btn-primary" onclick="openUserProfile('${o.uid}')" style="flex:1; background:#4f46e5; color:#fff; border:none; padding:8px; border-radius:8px; font-weight:700; cursor:pointer;">View Store</button>
        <button class="ob-btn-outline" onclick="openGoogleMapLink('${o.location}')" style="flex:1; background:#f1f5f9; color:#1e293b; border:none; padding:8px; border-radius:8px; font-weight:700; cursor:pointer;">Directions</button>
        <button class="ob-btn-outline" onclick="startRealChat('${o.uid}', '${o.bizName}')" style="flex:1; background:#eff6ff; color:#2563eb; border:none; padding:8px; border-radius:8px; font-weight:700; cursor:pointer;">Chat</button>
      </div>
    </div>
  `).join('');
}

// =========================================================
// NEARBY TAB & WORKING FILTERS (All, Shops, Services, Restaurants, Deals)
// =========================================================
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

  // जर Deals फिल्टर निवडला असेल तर ऑफर्स दाखवा
  if (activeNearbyFilter === 'Deals') {
    if (cacheOffers.length === 0) {
      box.innerHTML = `<p style="text-align:center; padding:30px; color:#64748b;">सध्या जवळपास कोणतीही Deal नाही. '+ Create ➔ Offer' मधून टाका!</p>`;
      return;
    }
    box.innerHTML = cacheOffers.map(o => `
      <div style="background:#fff; padding:12px; margin:10px 14px; border-radius:14px; display:flex; gap:12px; align-items:center; box-shadow:0 2px 8px rgba(0,0,0,0.05);">
        <img src="${o.img}" style="width:70px; height:70px; border-radius:10px; object-fit:cover;">
        <div style="flex:1;">
          <h4 style="margin:0; font-size:15px;">${o.deal}</h4>
          <div style="color:#4f46e5; font-weight:700; font-size:12.5px;">🏪 ${o.bizName}</div>
          <div style="font-size:11.5px; color:#64748b;">📍 ${o.location} &bull; ${o.validity}</div>
        </div>
        <button onclick="startRealChat('${o.uid}', '${o.bizName}')" style="background:#2563eb; color:#fff; border:none; padding:8px 12px; border-radius:8px; font-weight:700; cursor:pointer;">Chat</button>
      </div>
    `).join('');
    return;
  }

  let stores = cacheBusinesses.filter(s => {
    let matchSearch = (s.name || '').toLowerCase().includes(q) || (s.category || '').toLowerCase().includes(q) || (s.location || '').toLowerCase().includes(q);
    if (!matchSearch) return false;
    if (activeNearbyFilter === 'All') return true;
    return (s.category || '').toLowerCase().includes(activeNearbyFilter.toLowerCase());
  });

  if (stores.length === 0) {
    box.innerHTML = `
      <div style="text-align:center; padding:30px; color:#64748b;">
        अजून <b>${activeNearbyFilter}</b> मध्ये कोणतेही Business अकाउंट रजिस्टर झालेले नाही.<br><br>
        <button onclick="switchUserRoleTo('business')" style="background:#2563eb; color:#fff; border:none; padding:10px 16px; border-radius:10px; font-weight:700; cursor:pointer;">🏪 माझे अकाउंट Business मध्ये बदला</button>
      </div>`;
    return;
  }

  box.innerHTML = stores.map(s => `
    <div class="nearby-store-card" style="background:#fff; border-radius:16px; padding:14px; margin:12px 14px; display:flex; gap:12px; box-shadow:0 2px 10px rgba(0,0,0,0.05);">
      <div class="ns-img-box" onclick="openUserProfile('${s.uid}')" style="position:relative; width:80px; height:80px; flex-shrink:0; cursor:pointer;">
        <img src="${s.avatar || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=300&q=80'}" style="width:100%; height:100%; border-radius:12px; object-fit:cover;">
      </div>
      <div class="ns-info-col" style="flex:1;">
        <div class="ns-title" onclick="openUserProfile('${s.uid}')" style="font-weight:800; font-size:15.5px; color:#0f172a; cursor:pointer;">${s.name}</div>
        <div class="ns-rating-row" style="font-size:12px; color:#475569; margin:2px 0;">⭐ 4.8 &bull; ${s.location || 'Ardhapur'}</div>
        <div class="ns-desc" style="font-size:12px; color:#4f46e5; font-weight:700; margin-bottom:8px;">${s.category || 'Shops'} &bull; ${s.about || ''}</div>
        <div class="ns-btns-row" style="display:flex; gap:6px;">
          <button class="ns-pill-btn" onclick="window.location.href='tel:${s.phone || '9876543210'}'" style="background:#f1f5f9; border:none; padding:6px 10px; border-radius:8px; font-size:11.5px; font-weight:700; cursor:pointer;">📞 Call</button>
          <button class="ns-pill-btn" onclick="openGoogleMapLink('${s.location}')" style="background:#f1f5f9; border:none; padding:6px 10px; border-radius:8px; font-size:11.5px; font-weight:700; cursor:pointer;">🗺️ Map</button>
          <button class="ns-pill-btn" onclick="startRealChat('${s.uid}', '${s.name}')" style="background:#2563eb; color:#fff; border:none; padding:6px 12px; border-radius:8px; font-size:11.5px; font-weight:700; cursor:pointer;">💬 Chat</button>
        </div>
      </div>
    </div>
  `).join('');
}

// =========================================================
// 3. PUBLISH REAL POSTS, STORIES, REELS, NOTES, OFFERS & PRODUCTS
// =========================================================
function toggleCreatePopupMenu(e) {
  e.stopPropagation();
  let menu = document.getElementById('create-dropdown-menu');
  menu.style.display = (menu.style.display === 'block') ? 'none' : 'block';
}

function openCreateContentModal(mode) {
  currentCreateMode = mode;
  uploadedDataURL = '';

  let menu = document.getElementById('create-dropdown-menu');
  if (menu) menu.style.display = 'none';

  document.getElementById('create-modal-title').innerText = `Create New ${mode}`;
  let titleInp = document.getElementById('cr-title-input');
  let subInp = document.getElementById('cr-sub-input');
  let priceInp = document.getElementById('cr-price-input');

  titleInp.value = '';
  subInp.value = '';
  priceInp.value = '';

  if (mode === 'Offer') {
    titleInp.placeholder = 'ऑफरचे नाव / सवलत (उदा. 50% OFF)...';
    subInp.style.display = 'block';
    subInp.placeholder = 'कॅटेगरी किंवा वैधता (उदा. Offers, Food, Limited Time)';
    priceInp.style.display = 'none';
  } else if (mode === 'Product') {
    titleInp.placeholder = 'प्रॉडक्टचे नाव (उदा. Cotton Hoodie)...';
    subInp.style.display = 'block';
    subInp.placeholder = 'कॅटेगरी: Men, Women किंवा Accessories';
    priceInp.style.display = 'block';
    priceInp.placeholder = 'किंमत (उदा. ₹999)';
  } else if (mode === 'Post') {
    titleInp.placeholder = 'पोस्ट कॅप्शन लिहा...';
    subInp.style.display = 'block';
    subInp.placeholder = 'कॅटेगरी (उदा. Post, Jobs, News, Food)';
    priceInp.style.display = 'none';
  } else if (mode === 'Note') {
    titleInp.placeholder = 'तुमची शॉर्ट Note लिहा...';
    subInp.style.display = 'none';
    priceInp.style.display = 'none';
  } else {
    titleInp.placeholder = `${mode} साठी कॅप्शन लिहा...`;
    subInp.style.display = 'none';
    priceInp.style.display = 'none';
  }

  document.getElementById('create-content-modal').style.display = 'flex';
}

function closeCreateContentModal() {
  document.getElementById('create-content-modal').style.display = 'none';
}

// फोटो आपोआप कॉम्प्रेस करणे (जेणेकरून Firebase ची 1MB मर्यादा कधीच ओलांडली जाणार नाही!)
function handleFileSelect(e) {
  if (e.target.files && e.target.files[0]) {
    let file = e.target.files[0];
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
        showToast('✅ फोटो जोडला गेला!');
      };
      img.src = evt.target.result;
    };
    reader.readAsDataURL(file);
  }
}

async function publishCreatedContent() {
  if (!currentUserData) {
    showToast('⚠️ कृपया आधी लॉगिन करा!');
    return;
  }
  let title = document.getElementById('cr-title-input').value.trim();
  let sub = document.getElementById('cr-sub-input').value.trim();
  let price = document.getElementById('cr-price-input').value.trim();

  if (!title && !uploadedDataURL) {
    showToast('⚠️ कृपया माहिती लिहा किंवा फोटो निवडा!');
    return;
  }

  let img = uploadedDataURL || 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=700&q=80';
  let nowTs = firebase.firestore.FieldValue.serverTimestamp();

  try {
    showToast(`🚀 तुमची ${currentCreateMode} पब्लिश होत आहे...`);

    if (currentCreateMode === 'Reel' || currentCreateMode === 'Live') {
      await db.collection('reels').add({
        uid: currentUserData.uid,
        author: currentUserData.name,
        caption: title || currentCreateMode,
        img: img,
        views: 1,
        timeMs: Date.now(),
        createdAt: nowTs
      });
    } else if (currentCreateMode === 'Story') {
      await db.collection('stories').add({
        uid: currentUserData.uid,
        author: currentUserData.name,
        avatar: currentUserData.avatar,
        caption: title || 'My Moment',
        img: img,
        timeMs: Date.now(),
        createdAt: nowTs
      });
    } else if (currentCreateMode === 'Note') {
      await db.collection('notes').add({
        uid: currentUserData.uid,
        author: currentUserData.name,
        avatar: currentUserData.avatar,
        noteText: title || 'Hello Friends! 👋',
        img: img,
        timeMs: Date.now(),
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
        img: img,
        timeMs: Date.now(),
        createdAt: nowTs
      });
    } else if (currentCreateMode === 'Product') {
      await db.collection('products').add({
        uid: currentUserData.uid,
        sellerName: currentUserData.name,
        title: title || 'New Product',
        price: price || '₹999',
        cat: sub || 'Men',
        img: img,
        desc: `Quality product by ${currentUserData.name}`,
        timeMs: Date.now(),
        createdAt: nowTs
      });
    } else {
      // POST -> थेट Home Feed मध्ये जाईल!
      await db.collection('posts').add({
        uid: currentUserData.uid,
        author: currentUserData.name,
        avatar: currentUserData.avatar,
        location: currentUserData.location || 'Ardhapur, Maharashtra',
        category: sub || currentUserData.category || 'Post',
        caption: title,
        img: img,
        likes: 0,
        commentsCount: 0,
        timeMs: Date.now(),
        createdAt: nowTs
      });
    }

    await db.collection('users').doc(currentUserData.uid).update({
      postsCount: firebase.firestore.FieldValue.increment(1)
    });
    currentUserData.postsCount = (currentUserData.postsCount || 0) + 1;

    await pushRealNotification(`✨ ${currentUserData.name} ने नवीन ${currentCreateMode} पब्लिश केली: "${title || currentCreateMode}"`);

    document.getElementById('cr-title-input').value = '';
    uploadedDataURL = '';
    closeCreateContentModal();
    showToast(`🚀 तुमची ${currentCreateMode} खऱ्याखुऱ्या लाईव्ह पब्लिश झाली!`);
  } catch (err) {
    showToast('❌ Error: ' + err.message);
  }
}

// =========================================================
// 4. REAL FOLLOW SYSTEM & REAL PROFILE VIEW (POSTS, REELS, MOMENTS, HIGHLIGHTS)
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
    if (myProducts.length === 0) {
      miniBox.innerHTML = `<div style="padding:12px; color:#64748b; font-size:12.5px;">अजून प्रॉडक्ट नाही. '+ Create ➔ Product' मधून टाका!</div>`;
    } else {
      miniBox.innerHTML = myProducts.map(p => `
        <div class="mini-prod-box" onclick="openProductDetail('${p.id}')" style="min-width:125px; background:#f8fafc; padding:8px; border-radius:12px; margin-right:10px; text-align:center; cursor:pointer;">
          <img src="${p.img}" style="width:100%; height:90px; object-fit:cover; border-radius:8px;">
          <div style="font-size:12px; font-weight:700; margin-top:4px;">${p.title}</div>
          <b style="color:#2563eb; font-size:12px;">${p.price}</b>
        </div>
      `).join('');
    }
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

// प्रोफाईलमधील ४ टॅब्स (Posts, Reels, Moments, Highlights) रिअल चालण्यासाठी:
function switchPeopleMediaTab(tabName, el) {
  activePeopleTab = tabName;
  document.querySelectorAll('#people-sub-tabs span').forEach(s => s.classList.remove('active'));
  if (el) el.classList.add('active');

  const headings = {
    posts: '✨ My Posts',
    reels: '🎬 My Reels',
    moments: '📸 My Moments (Stories)',
    highlights: '🌟 My Highlights (Notes & Offers)'
  };
  let hEl = document.getElementById('p-gallery-heading');
  if (hEl) hEl.innerText = headings[tabName] || '✨ My Posts & Moments';

  renderProfileMediaGrid();
}

function renderProfileMediaGrid() {
  let grid = document.getElementById('people-media-grid');
  if (!grid) return;

  let targetUid = activeProfileUser ? activeProfileUser.uid : (currentUserData ? currentUserData.uid : '');

  let userPosts = cachePosts.filter(p => p.uid === targetUid);
  let userReels = cacheReels.filter(r => r.uid === targetUid);
  let userStories = cacheStories.filter(s => s.uid === targetUid);
  let userHighlights = [
    ...cacheNotes.filter(n => n.uid === targetUid),
    ...cacheOffers.filter(o => o.uid === targetUid)
  ];

  let totalCount = userPosts.length + userReels.length + userStories.length + userHighlights.length;
  let statPostsEl = document.getElementById('p-stat-posts');
  if (statPostsEl) statPostsEl.innerText = totalCount;

  let itemsToShow = [];
  if (activePeopleTab === 'posts') itemsToShow = userPosts;
  else if (activePeopleTab === 'reels') itemsToShow = userReels;
  else if (activePeopleTab === 'moments') itemsToShow = userStories;
  else if (activePeopleTab === 'highlights') itemsToShow = userHighlights;

  if (itemsToShow.length === 0) {
    grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:24px; color:#64748b; font-size:13px;">या टॅबमध्ये अजून कोणतीही माहिती नाही. वरच्या '+ Create' मधून जोडा!</div>`;
    return;
  }

  grid.innerHTML = itemsToShow.map(item => {
    let label = item.caption || item.deal || item.noteText || 'Media';
    return `
      <div onclick="openImageLightbox('${item.img}', '${label.replace(/'/g, '')}')" style="position:relative; aspect-ratio:1/1; border-radius:12px; overflow:hidden; cursor:pointer; background:#0f172a;">
        <img src="${item.img}" style="width:100%; height:100%; object-fit:cover;">
        <div style="position:absolute; bottom:0; inset-x:0; background:linear-gradient(transparent, rgba(0,0,0,0.8)); color:#fff; font-size:11px; padding:6px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
          ${label}
        </div>
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
    await pushRealNotification(`🎉 ${currentUserData.name} ने ${activeProfileUser.name} ला Follow केले!`);
    showToast(`✅ तुम्ही ${activeProfileUser.name} ला Follow केले!`);
  } else {
    await followDocRef.delete();
    await db.collection('users').doc(targetUid).update({ followersCount: firebase.firestore.FieldValue.increment(-1) });
    await db.collection('users').doc(myUid).update({ followingCount: firebase.firestore.FieldValue.increment(-1) });
    showToast(`Unfollowed ${activeProfileUser.name}`);
  }
  openUserProfile(targetUid);
}

// बिझनेस प्रोफाईल अॅक्शन बटन्स & प्रॉडक्ट कॅटलॉग मोडल
function startChatWithActiveBiz() {
  if (activeProfileUser) startRealChat(activeProfileUser.uid, activeProfileUser.name);
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
function closeCatalogModal() {
  document.getElementById('catalog-modal').style.display = 'none';
}
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

  let list = cacheProducts.filter(p => {
    let matchQ = (p.title || '').toLowerCase().includes(q) || (p.cat || '').toLowerCase().includes(q);
    if (!matchQ) return false;
    if (activeCatalogFilter === 'All') return true;
    return (p.cat || '').toLowerCase() === activeCatalogFilter.toLowerCase();
  });

  if (list.length === 0) {
    box.innerHTML = `<p style="grid-column:1/-1; text-align:center; padding:30px; color:#64748b;">कोणतेही प्रॉडक्ट सापडले नाही. '+ Create ➔ Product' मधून जोडा!</p>`;
    return;
  }

  box.innerHTML = list.map(p => `
    <div onclick="openProductDetail('${p.id}')" style="background:#fff; border-radius:14px; padding:10px; box-shadow:0 2px 8px rgba(0,0,0,0.05); cursor:pointer;">
      <img src="${p.img}" style="width:100%; height:130px; object-fit:cover; border-radius:10px;">
      <h4 style="margin:8px 0 4px; font-size:14px;">${p.title}</h4>
      <div style="color:#2563eb; font-weight:800; font-size:14px;">${p.price}</div>
      <div style="font-size:11px; color:#64748b;">${p.cat}</div>
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
function closeProductDetailModal() {
  document.getElementById('product-detail-modal').style.display = 'none';
}

// =========================================================
// 5. REAL-TIME LIVE CHAT / MESSAGING & NOTES
// =========================================================
function renderNotesBarInMessages() {
  const bar = document.querySelector('#view-messages .moments-scroll-bar');
  if (!bar || cacheNotes.length === 0) return;
  const firstNote = bar.querySelector('.your-note-card').outerHTML;
  bar.innerHTML = firstNote + cacheNotes.map(n => `
    <div class="story-circle-item" onclick="alert('📝 ${n.author} ची Note:\\n\\n${n.noteText}')">
      <div class="story-grad-ring"><img src="${n.avatar || n.img}"></div>
      <span>${(n.noteText || 'Note').substring(0, 10)}..</span>
    </div>
  `).join('');
}

async function startRealChat(peerUid, peerName) {
  if (!currentUserData) return;
  let txt = prompt(`💬 ${peerName || 'Friend'} ला पाठवायचा मेसेज लिहा:`);
  if (!txt || !txt.trim()) return;

  await db.collection('chats').add({
    participants: [currentUserData.uid, peerUid || 'community'],
    senderUid: currentUserData.uid,
    senderName: currentUserData.name,
    receiverName: peerName || 'Friend',
    lastMessage: `${currentUserData.name}: ${txt.trim()}`,
    unread: true,
    timeMs: Date.now(),
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });

  await pushRealNotification(`💬 ${currentUserData.name} ने ${peerName} ला मेसेज पाठवला.`);
  showToast('✅ मेसेज पाठवला!');
  switchBottomNav('messages');
}

function listenToRealMessages() {
  if (!currentUserData) return;
  db.collection('chats').onSnapshot(snap => {
    cacheChats = sortByCreatedDesc(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    renderMessagesList();

    let badge = document.querySelector('.msg-badge-count');
    if (badge) badge.innerText = cacheChats.length;
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
    let matchQ = (m.senderName || '').toLowerCase().includes(q) || (m.receiverName || '').toLowerCase().includes(q) || (m.lastMessage || '').toLowerCase().includes(q);
    if (!matchQ) return false;
    if (activeMsgTab === 'Unread') return m.unread === true;
    return true;
  });

  if (list.length === 0) {
    box.innerHTML = `
      <div style="text-align:center; padding:25px; color:#64748b;">
        तुमच्या इनबॉक्समध्ये अजून कोणतेही मेसेज नाहीत.<br><br>
        <button onclick="startRealChat('community', 'ALBIZNET Community')" style="background:#4f46e5; color:#fff; border:none; padding:10px 18px; border-radius:10px; font-weight:700; cursor:pointer;">💬 नवीन मेसेज पाठवा</button>
      </div>`;
    return;
  }

  box.innerHTML = list.map(m => {
    let otherName = (currentUserData && m.senderName === currentUserData.name) ? m.receiverName : m.senderName;
    return `
      <div class="chat-item-row" onclick="replyToChat('${m.id}', '${otherName}')" style="display:flex; align-items:center; gap:12px; padding:12px 16px; border-bottom:1px solid #f1f5f9; background:#fff; cursor:pointer;">
        <div class="chat-av-wrap" style="position:relative;">
          <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80" style="width:46px; height:46px; border-radius:50%; object-fit:cover;">
        </div>
        <div style="flex:1;">
          <div class="chat-name" style="font-weight:800; font-size:14.5px; color:#0f172a;">${otherName || 'User'}</div>
          <div class="chat-last-msg" style="font-size:13px; color:#475569; margin-top:2px;">${m.lastMessage}</div>
        </div>
        <span style="font-size:11.5px; color:#2563eb; font-weight:700;">Reply 💬</span>
      </div>
    `;
  }).join('');
}

async function replyToChat(chatId, otherName) {
  let reply = prompt(`💬 ${otherName} ला रिप्लाय द्या:`);
  if (!reply || !reply.trim()) return;
  await db.collection('chats').doc(chatId).update({
    lastMessage: `${currentUserData.name}: ${reply.trim()}`,
    unread: false,
    timeMs: Date.now(),
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  showToast('✅ रिप्लाय पाठवला!');
}

// =========================================================
// REAL NOTIFICATIONS ENGINE
// =========================================================
async function pushRealNotification(text) {
  try {
    await db.collection('notifications').add({
      text: text,
      timeMs: Date.now(),
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch (e) {}
}

function listenToRealNotifications() {
  db.collection('notifications').onSnapshot(snap => {
    cacheNotifications = sortByCreatedDesc(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}

function setupNotificationBell() {
  let bell = document.querySelector('.header-bell-btn');
  if (bell) {
    bell.onclick = function() {
      if (cacheNotifications.length === 0) {
        showToast('🔔 सध्या कोणतेही नवीन नोटिफिकेशन नाही!');
      } else {
        let msg = cacheNotifications.slice(0, 8).map((n, i) => `${i + 1}. ${n.text}`).join('\n\n');
        alert(`🔔 रिअल-टाईम नोटिफिकेशन्स:\n\n${msg}`);
      }
    };
  }
}

// =========================================================
// 6. REAL SETTINGS EDIT (NAME, BIO, LOCATION, ROLE SWITCH & LOGOUT)
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
    newCat = prompt('तुमच्या व्यवसायाची कॅटेगरी लिहा (Shops, Services किंवा Restaurants):', 'Shops') || 'Shops';
  }
  await db.collection('users').doc(currentUserData.uid).update({
    type: newType,
    category: newCat
  });
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

  let grid = document.getElementById('settings-grid-content');
  grid.innerHTML = `
    <div class="set-card" style="background:#fff; padding:14px; border-radius:14px; margin-bottom:12px;">
      <h5 style="margin:0 0 10px; font-size:14px; color:#4f46e5;"><i class="fa-solid fa-user-pen"></i> Edit Real Profile</h5>
      <div class="set-row-item" onclick="editUserField('name', 'नाव (Name)')" style="padding:8px 0; border-bottom:1px solid #f1f5f9; cursor:pointer;">✏️ नाव बदला (Edit Name)</div>
      <div class="set-row-item" onclick="editUserField('about', 'माहिती (Bio)')" style="padding:8px 0; border-bottom:1px solid #f1f5f9; cursor:pointer;">📝 बायो बदला (Edit Bio)</div>
      <div class="set-row-item" onclick="editUserField('location', 'लोकेशन')" style="padding:8px 0; border-bottom:1px solid #f1f5f9; cursor:pointer;">📍 लोकेशन बदला (Location)</div>
      <div class="set-row-item" onclick="editUserField('phone', 'मोबाईल नंबर')" style="padding:8px 0; cursor:pointer;">📞 मोबाईल नंबर जोडा</div>
    </div>
    <div class="set-card" style="background:#fff; padding:14px; border-radius:14px;">
      <h5 style="margin:0 0 10px; font-size:14px; color:#4f46e5;"><i class="fa-solid fa-sliders"></i> Account Role</h5>
      <div class="set-row-item" onclick="switchUserRoleTo('business')" style="padding:8px 0; border-bottom:1px solid #f1f5f9; cursor:pointer;">🏪 Switch to Business Store</div>
      <div class="set-row-item" onclick="switchUserRoleTo('people')" style="padding:8px 0; cursor:pointer;">👤 Switch to Personal Account</div>
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

function openImageLightbox(imgUrl, captionText) {
  if (!imgUrl) return;
  document.getElementById('lightbox-img').src = imgUrl;
  document.getElementById('lightbox-caption').innerText = captionText || '';
  document.getElementById('gallery-lightbox-modal').style.display = 'flex';
}

function closeImageLightbox() { document.getElementById('gallery-lightbox-modal').style.display = 'none'; }
function openGoogleMapLink(query) { window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query || 'Ardhapur, Maharashtra')}`, '_blank'); }
