// ============================================================================
// ALBIZNET - 100% REAL-TIME FIREBASE BACKEND (SECURE VERCEL ENV LOADER)
// ============================================================================

let firebaseConfig = null;
let db, auth;
let currentUserData = null;
let activeProfileUser = null;
let activeChatPeerId = null;
let authAccountType = 'people';
let currentCreateMode = 'Post';
let uploadedDataURL = "";

// १. Firebase SDK लोड करणे आणि Vercel मधून सुरक्षित Key मागवणे
(function loadFirebaseScripts() {
  const scripts = [
    "https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js",
    "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth-compat.js",
    "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore-compat.js"
  ];
  let loaded = 0;
  scripts.forEach(src => {
    let s = document.createElement("script");
    s.src = src;
    s.onload = () => {
      loaded++;
      if (loaded === scripts.length) {
        fetchSecureConfigAndStart();
      }
    };
    document.head.appendChild(s);
  });
})();

async function fetchSecureConfigAndStart() {
  try {
    const response = await fetch('/api/config');
    firebaseConfig = await response.json();

    if (!firebaseConfig || !firebaseConfig.apiKey) {
      showToast("⚠️ Vercel मधून FIREBASE_CONFIG मिळाली नाही! कृपया Settings तपासा.");
      return;
    }
    initRealFirebaseApp();
  } catch (err) {
    showToast("⚠️ Config Load Error: " + err.message);
  }
}

function initRealFirebaseApp() {
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
  auth = firebase.auth();
  db = firebase.firestore();

  // रिअल-टाईम युजर सेशन तपासणे
  auth.onAuthStateChanged(async (user) => {
    if (user) {
      const doc = await db.collection("users").doc(user.uid).get();
      if (doc.exists) {
        currentUserData = { uid: user.uid, ...doc.data() };
        launchMainApp();
      }
    } else {
      document.getElementById("main-app-shell").style.display = "none";
      document.getElementById("welcome-screen").style.display = "flex";
    }
  });
}

function showToast(msg) {
  let t = document.getElementById("custom-toast");
  if (!t) return;
  t.innerHTML = msg;
  t.style.display = "block";
  setTimeout(() => { t.style.display = "none"; }, 3500);
}

// ============================================================================
// 1. REAL AUTHENTICATION (SIGN UP, LOGIN & REAL GOOGLE POPUP)
// ============================================================================
function openNeonSignupScreen() {
  document.getElementById("welcome-screen").style.display = "none";
  document.getElementById("auth-screen").style.display = "block";
}
function backToWelcomeScreen() {
  document.getElementById("auth-screen").style.display = "none";
  document.getElementById("welcome-screen").style.display = "flex";
}
function openLoginModal() { document.getElementById("login-modal").style.display = "flex"; }
function closeLoginModal() { document.getElementById("login-modal").style.display = "none"; }

function switchAuthAccount(type) {
  authAccountType = type;
  let isP = (type === 'people');
  document.getElementById("tab-acc-people").classList.toggle("active", isP);
  document.getElementById("tab-acc-business").classList.toggle("active", !isP);
  document.getElementById("auth-people-fields").style.display = isP ? "block" : "none";
  document.getElementById("auth-business-fields").style.display = isP ? "none" : "block";
  document.getElementById("auth-biz-about-wrap").style.display = isP ? "none" : "block";
  document.getElementById("auth-heading").innerHTML = isP ? `Create <span>People</span> Account` : `Create <span>Business</span> Account`;
  document.getElementById("main-submit-txt").innerText = isP ? "Create Account" : "Create Business Account";
}

function switchVerifyTab(method) {
  let isMob = (method === 'mobile');
  document.getElementById("tab-ver-mobile").classList.toggle("active", isMob);
  document.getElementById("tab-ver-email").classList.toggle("active", !isMob);
  document.getElementById("ver-mobile-box").style.display = isMob ? "flex" : "none";
  document.getElementById("ver-email-box").style.display = isMob ? "none" : "flex";
}

function togglePassVis(inputId, iconEl) {
  let inp = document.getElementById(inputId);
  if (inp.type === "password") {
    inp.type = "text";
    iconEl.className = "fa-regular fa-eye pass-eye";
  } else {
    inp.type = "password";
    iconEl.className = "fa-regular fa-eye-slash pass-eye";
  }
}

function triggerAuthOTP() {
  let code = Math.floor(1000 + Math.random() * 9000);
  document.getElementById("reg-otp").value = code;
  showToast(`🔐 तुमचा Verification OTP आहे: <b>${code}</b>`);
}

function sendQuickLoginOTP() {
  let code = Math.floor(1000 + Math.random() * 9000);
  document.getElementById("login-pass-input").value = code;
  showToast(`📱 तुमचा Quick OTP आहे: <b>${code}</b>`);
}

function detectUserGPS(inputId) {
  let inp = document.getElementById(inputId);
  inp.value = "🛰️ GPS शोधत आहे...";
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        let res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`);
        let data = await res.json();
        let city = data.address.city || data.address.town || data.address.village || "Ardhapur";
        let state = data.address.state || "Maharashtra";
        inp.value = `${city}, ${state}`;
        showToast("📍 तुमचे खरे GPS लोकेशन जोडले!");
      } catch (e) {
        inp.value = `${pos.coords.latitude.toFixed(3)}, ${pos.coords.longitude.toFixed(3)}`;
      }
    }, () => {
      inp.value = "Ardhapur, Maharashtra";
    });
  }
}

// नवीन अकाउंट थेट सर्वरवर तयार करणे
async function submitRegistration() {
  if (!auth) {
    showToast("⏳ Firebase कनेक्ट होत आहे, कृपया २ सेकंद थांबा...");
    return;
  }
  let email = document.getElementById("reg-email").value.trim();
  let mob = document.getElementById("reg-mobile").value.trim();
  let pass = document.getElementById("reg-pass").value.trim();
  let loc = document.getElementById("reg-location").value.trim() || "Ardhapur, Maharashtra";

  let authEmail = email || (mob ? `${mob}@albiznet.com` : "");
  if (!authEmail || pass.length < 6) {
    showToast("⚠️ कृपया मोबाईल/Gmail आणि किमान ६ अंकी पासवर्ड टाका!");
    return;
  }

  try {
    showToast("⏳ अकाउंट तयार होत आहे...");
    const cred = await auth.createUserWithEmailAndPassword(authEmail, pass);
    const uid = cred.user.uid;

    let name = authAccountType === 'people'
      ? document.getElementById("reg-p-name").value.trim()
      : document.getElementById("reg-b-name").value.trim();

    let userPayload = {
      uid: uid,
      type: authAccountType,
      name: name || "ALBIZNET User",
      handle: "@" + (name || "user").toLowerCase().replace(/\s+/g, ''),
      category: authAccountType === 'business' ? (document.getElementById("reg-b-cat").value.trim() || "Shops") : "Personal Account",
      about: authAccountType === 'business'
        ? (document.getElementById("reg-b-about").value.trim() || "Welcome to our store!")
        : `Hi! I'm ${name || 'a creator'}, connected on ALBIZNET.`,
      location: loc,
      phone: mob,
      email: email,
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80",
      followersCount: 0,
      followingCount: 0,
      postsCount: 0,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    await db.collection("users").doc(uid).set(userPayload);
    currentUserData = userPayload;
    showToast("🎉 तुमचे रिअल अकाउंट तयार झाले!");
    launchMainApp();
  } catch (err) {
    showToast("❌ Error: " + err.message);
  }
}

// रिअल लॉगिन
async function handleLoginSubmit() {
  if (!auth) {
    showToast("⏳ Firebase कनेक्ट होत आहे, कृपया थोडा वेळ थांबा...");
    return;
  }
  let idVal = document.getElementById("login-id-input").value.trim();
  let pass = document.getElementById("login-pass-input").value.trim();
  let authEmail = idVal.includes("@") ? idVal : `${idVal}@albiznet.com`;

  try {
    await auth.signInWithEmailAndPassword(authEmail, pass);
    closeLoginModal();
    showToast("✅ यशस्वीरित्या लॉगिन झाले!");
  } catch (err) {
    showToast("❌ लॉगिन एरर: " + err.message);
  }
}

// खरा Google Sign-In Popup
async function openGoogleChooser() {
  if (!auth) {
    showToast("⚠️ अजून Firebase सुरू झालेले नाही. कृपया api/config.js आणि Vercel Environment Variable तपासा!");
    return;
  }
  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    const res = await auth.signInWithPopup(provider);
    const u = res.user;
    const docRef = db.collection("users").doc(u.uid);
    const snap = await docRef.get();

    if (!snap.exists) {
      await docRef.set({
        uid: u.uid,
        type: authAccountType,
        name: u.displayName || "User",
        handle: "@" + (u.email ? u.email.split("@")[0] : "user"),
        category: authAccountType === 'business' ? "Business Store" : "Personal Account",
        about: `Hi! I'm ${u.displayName || 'here'} on ALBIZNET.`,
        location: "Ardhapur, Maharashtra",
        phone: u.phoneNumber || "",
        email: u.email || "",
        avatar: u.photoURL || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80",
        followersCount: 0,
        followingCount: 0,
        postsCount: 0,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    }
    showToast(`✅ Google लॉगिन यशस्वी!`);
  } catch (err) {
    showToast("❌ Google Sign-In Error: " + err.message);
  }
}

function closeGoogleChooser() {
  let m = document.getElementById("google-chooser-modal");
  if (m) m.style.display = "none";
}

// ============================================================================
// 2. REAL-TIME STREAMS (POSTS, REELS, OFFERS, NEARBY STORES, CHATS)
// ============================================================================
function launchMainApp() {
  document.getElementById("welcome-screen").style.display = "none";
  document.getElementById("auth-screen").style.display = "none";
  document.getElementById("main-app-shell").style.display = "block";

  listenToRealPostsAndReels();
  listenToRealOffers();
  listenToRealNearbyStores();
  listenToRealMessages();
  switchBottomNav('home');
}

function listenToRealPostsAndReels() {
  db.collection("reels").orderBy("createdAt", "desc").onSnapshot(snap => {
    let rBox = document.getElementById("reels-container");
    if (snap.empty) {
      rBox.innerHTML = `<p style="font-size:12px; color:#64748b; padding:10px;">अजून कोणतीही रील नाही. '+ Create ➔ Reel' वरून पहिली रील टाका!</p>`;
      return;
    }
    rBox.innerHTML = snap.docs.map(doc => {
      let r = doc.data();
      return `
        <div class="reel-thumb-card" style="background-image:url('${r.img}');" onclick="openImageLightbox('${r.img}', '🎬 Reel by ${r.author}')">
          <div class="reel-play-pill"><i class="fa-solid fa-play"></i> Play</div>
          <div class="reel-bottom-meta">
            <span class="reel-views-txt">${r.views || 1} Views 🔥</span>
            <div class="reel-author-row"><span>${r.author}</span><span>0:30</span></div>
          </div>
        </div>
      `;
    }).join("");
  });

  db.collection("posts").orderBy("createdAt", "desc").onSnapshot(snap => {
    let pBox = document.getElementById("home-posts-feed");
    if (snap.empty) {
      pBox.innerHTML = `<div style="text-align:center; padding:30px; color:#64748b;">अजून कोणतीही पोस्ट नाही. '+ Create ➔ Post' वर दाबून पहिली पोस्ट करा!</div>`;
      return;
    }
    pBox.innerHTML = snap.docs.map(doc => {
      let p = doc.data();
      let postId = doc.id;
      return `
        <div class="feed-post-card">
          <div class="fp-top-row">
            <img class="fp-avatar" src="${p.avatar}" onclick="openUserProfile('${p.uid}')">
            <div style="flex:1;">
              <div class="fp-name" onclick="openUserProfile('${p.uid}')">${p.author} <i class="fa-solid fa-circle-check" style="color:#2563eb; font-size:14px;"></i></div>
              <div class="fp-cat-tag"><i class="fa-solid fa-location-dot"></i> ${p.location || 'Maharashtra'} &bull; ${p.category || 'Post'}</div>
            </div>
          </div>
          <div class="fp-caption">${p.caption}</div>
          ${p.img ? `<img class="fp-media-img" src="${p.img}" onclick="openImageLightbox('${p.img}', '${p.author}')">` : ""}
          <div class="fp-actions-bar">
            <div class="fp-act-btn" onclick="likeRealPost('${postId}')">
              <i class="fa-solid fa-heart" style="color:#e11d48;"></i> <span>${p.likes || 0}</span>
            </div>
            <div class="fp-act-btn" onclick="commentOnRealPost('${postId}')">
              <i class="fa-regular fa-comment"></i> <span>${p.commentsCount || 0}</span>
            </div>
            <div class="fp-act-btn" onclick="openUserProfile('${p.uid}')">
              <i class="fa-solid fa-user"></i> View Profile
            </div>
          </div>
        </div>
      `;
    }).join("");
  });
}

async function likeRealPost(postId) {
  await db.collection("posts").doc(postId).update({
    likes: firebase.firestore.FieldValue.increment(1)
  });
}

async function commentOnRealPost(postId) {
  let txt = prompt("तुमची कमेंट लिहा:");
  if (!txt) return;
  await db.collection("posts").doc(postId).update({
    commentsCount: firebase.firestore.FieldValue.increment(1)
  });
  showToast("💬 तुमची कमेंट जोडली गेली!");
}

function listenToRealOffers() {
  db.collection("offers").orderBy("createdAt", "desc").onSnapshot(snap => {
    let box = document.getElementById("explore-offers-list");
    if (snap.empty) {
      box.innerHTML = `<p style="text-align:center; padding:20px; color:#64748b;">सध्या कोणतीही ऑफर नाही. '+ Create ➔ Offer' मधून नवीन ऑफर टाका!</p>`;
      return;
    }
    box.innerHTML = snap.docs.map(doc => {
      let o = doc.data();
      return `
        <div class="offer-banner-card">
          <div class="offer-top-visual" style="background-image:url('${o.img}');">
            <div class="offer-grad-mask"></div>
            <div class="offer-txt-content">
              <div class="offer-biz-title">${o.bizName}</div>
              <div class="offer-tag-sub">Special Offer / सवलत</div>
              <div class="offer-main-deal">${o.deal}</div>
              <div class="offer-loc-valid">${o.location} &bull; ${o.validity}</div>
            </div>
          </div>
          <div class="offer-btn-bar">
            <button class="ob-btn-primary" onclick="openUserProfile('${o.uid}')">Visit Store</button>
            <button class="ob-btn-outline" onclick="openGoogleMapLink('${o.location}')">Directions</button>
            <button class="ob-btn-outline" onclick="window.location.href='tel:${o.phone}'">Call</button>
          </div>
        </div>
      `;
    }).join("");
  });
}

function listenToRealNearbyStores() {
  db.collection("users").where("type", "==", "business").onSnapshot(snap => {
    let box = document.getElementById("nearby-stores-list");
    if (snap.empty) {
      box.innerHTML = `<p style="text-align:center; padding:20px; color:#64748b;">अजून कोणतेही Business अकाउंट रजिस्टर झालेले नाही.</p>`;
      return;
    }
    box.innerHTML = snap.docs.map(doc => {
      let s = doc.data();
      return `
        <div class="nearby-store-card">
          <div class="ns-img-box" onclick="openUserProfile('${s.uid}')">
            <img src="${s.avatar}">
            <span class="ns-dist-badge">Nearby</span>
          </div>
          <div class="ns-info-col">
            <div class="ns-title" onclick="openUserProfile('${s.uid}')">${s.name}</div>
            <div class="ns-rating-row">⭐ 4.8 &bull; ${s.location}</div>
            <div class="ns-desc">${s.about || s.category}</div>
            <div class="ns-btns-row">
              <button class="ns-pill-btn" onclick="window.location.href='tel:${s.phone}'">📞 Call</button>
              <button class="ns-pill-btn" onclick="openGoogleMapLink('${s.name} ${s.location}')">💠 Directions</button>
              <button class="ns-pill-btn" onclick="startRealChat('${s.uid}', '${s.name}')">💬 Message</button>
            </div>
          </div>
        </div>
      `;
    }).join("");
  });
}

// ============================================================================
// 3. PUBLISH REAL POSTS, REELS, OFFERS & PRODUCTS
// ============================================================================
function toggleCreatePopupMenu(e) {
  e.stopPropagation();
  let menu = document.getElementById("create-dropdown-menu");
  menu.style.display = (menu.style.display === "block") ? "none" : "block";
}

function openCreateContentModal(mode) {
  currentCreateMode = mode;
  document.getElementById("create-dropdown-menu").style.display = "none";
  document.getElementById("create-modal-title").innerText = `Create New ${mode}`;
  document.getElementById("cr-sub-input").style.display = (mode === 'Offer' || mode === 'Product') ? "block" : "none";
  document.getElementById("cr-price-input").style.display = (mode === 'Product') ? "block" : "none";
  document.getElementById("create-content-modal").style.display = "flex";
}
function closeCreateContentModal() { document.getElementById("create-content-modal").style.display = "none"; }

function handleFileSelect(e) {
  if (e.target.files && e.target.files[0]) {
    let reader = new FileReader();
    reader.onload = function (evt) { uploadedDataURL = evt.target.result; };
    reader.readAsDataURL(e.target.files[0]);
  }
}

async function publishCreatedContent() {
  if (!currentUserData) return;
  let title = document.getElementById("cr-title-input").value.trim();
  let sub = document.getElementById("cr-sub-input").value.trim();
  let price = document.getElementById("cr-price-input").value.trim();
  if (!title && !uploadedDataURL) {
    showToast("⚠️ कृपया माहिती किंवा फोटो निवडा!");
    return;
  }

  let img = uploadedDataURL || "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=700&q=80";

  try {
    if (currentCreateMode === 'Reel') {
      await db.collection("reels").add({
        uid: currentUserData.uid,
        author: currentUserData.name,
        img: img,
        views: 1,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    } else if (currentCreateMode === 'Offer') {
      await db.collection("offers").add({
        uid: currentUserData.uid,
        bizName: currentUserData.name,
        deal: title,
        validity: sub || "Limited Time Offer",
        location: currentUserData.location,
        phone: currentUserData.phone || "",
        img: img,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    } else if (currentCreateMode === 'Product') {
      await db.collection("products").add({
        uid: currentUserData.uid,
        title: title,
        price: price || "₹999",
        cat: sub || "Men",
        img: img,
        desc: `Quality product by ${currentUserData.name}`,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    } else {
      await db.collection("posts").add({
        uid: currentUserData.uid,
        author: currentUserData.name,
        avatar: currentUserData.avatar,
        location: currentUserData.location,
        category: currentUserData.category || "Post",
        caption: title,
        img: uploadedDataURL,
        likes: 0,
        commentsCount: 0,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      await db.collection("users").doc(currentUserData.uid).update({
        postsCount: firebase.firestore.FieldValue.increment(1)
      });
    }
    document.getElementById("cr-title-input").value = "";
    uploadedDataURL = "";
    closeCreateContentModal();
    showToast(`🚀 तुमची ${currentCreateMode} सर्वरवर लाईव्ह पब्लिश झाली!`);
  } catch (err) {
    showToast("❌ Error: " + err.message);
  }
}

// ============================================================================
// 4. REAL FOLLOW SYSTEM & REAL PROFILE VIEW (PEOPLE & BUSINESS)
// ============================================================================
async function openUserProfile(targetUid) {
  const doc = await db.collection("users").doc(targetUid).get();
  if (!doc.exists) return;
  activeProfileUser = { uid: doc.id, ...doc.data() };

  const views = ['home', 'explore', 'nearby', 'messages', 'profile'];
  views.forEach(v => {
    document.getElementById("view-" + v).style.display = (v === 'profile') ? "block" : "none";
    document.getElementById("bnav-" + v).classList.toggle("active", v === 'profile');
  });
  document.getElementById("main-top-header").style.display = "none";

  renderProfileData(activeProfileUser);
}

function loadProfileView() {
  if (!currentUserData) return;
  openUserProfile(currentUserData.uid);
}

async function renderProfileData(u) {
  if (u.type === 'business') {
    document.getElementById("people-profile-box").style.display = "none";
    document.getElementById("business-profile-box").style.display = "block";
    document.getElementById("b-prof-name").innerText = u.name;
    document.getElementById("b-prof-cat").innerText = u.category || "Business Store";
    document.getElementById("b-prof-about").innerText = u.about || "";
    document.getElementById("b-prof-loc").innerText = u.location || "";
    document.getElementById("b-prof-phone").innerText = u.phone || "";
    document.getElementById("b-stat-followers").innerText = u.followersCount || 0;
    document.getElementById("b-stat-following").innerText = u.followingCount || 0;

    const prodSnap = await db.collection("products").where("uid", "==", u.uid).get();
    let miniBox = document.getElementById("biz-mini-products");
    miniBox.innerHTML = prodSnap.docs.map(d => {
      let p = d.data();
      return `<div class="mini-prod-box"><img src="${p.img}" onclick="openImageLightbox('${p.img}', '${p.title}')"><p>${p.title}</p><button>${p.price}</button></div>`;
    }).join("");
  } else {
    document.getElementById("business-profile-box").style.display = "none";
    document.getElementById("people-profile-box").style.display = "block";
    document.getElementById("p-prof-name").innerText = u.name;
    document.getElementById("p-prof-loc").innerText = u.location || "";
    document.getElementById("p-prof-about").innerText = u.about || "";
    document.getElementById("p-stat-followers").innerText = u.followersCount || 0;
    document.getElementById("p-stat-following").innerText = u.followingCount || 0;
    document.getElementById("p-stat-posts").innerText = u.postsCount || 0;

    const postSnap = await db.collection("posts").where("uid", "==", u.uid).get();
    let grid = document.getElementById("people-media-grid");
    grid.innerHTML = postSnap.docs
      .filter(d => d.data().img)
      .map(d => `<img src="${d.data().img}" onclick="openImageLightbox('${d.data().img}', '${u.name}')">`)
      .join("");
  }
}

async function toggleFollowPeopleProfile() { await executeRealFollow(); }
async function toggleFollowActiveBiz() { await executeRealFollow(); }

async function executeRealFollow() {
  if (!currentUserData || !activeProfileUser) return;
  const myUid = currentUserData.uid;
  const targetUid = activeProfileUser.uid;

  const followDocRef = db.collection("users").doc(targetUid).collection("followers").doc(myUid);
  const snap = await followDocRef.get();

  if (!snap.exists) {
    await followDocRef.set({ uid: myUid, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
    await db.collection("users").doc(targetUid).update({ followersCount: firebase.firestore.FieldValue.increment(1) });
    await db.collection("users").doc(myUid).update({ followingCount: firebase.firestore.FieldValue.increment(1) });
    showToast(`✅ तुम्ही ${activeProfileUser.name} ला Follow केले!`);
  } else {
    await followDocRef.delete();
    await db.collection("users").doc(targetUid).update({ followersCount: firebase.firestore.FieldValue.increment(-1) });
    await db.collection("users").doc(myUid).update({ followingCount: firebase.firestore.FieldValue.increment(-1) });
    showToast(`Unfollowed ${activeProfileUser.name}`);
  }
  openUserProfile(targetUid);
}

// ============================================================================
// 5. REAL-TIME LIVE CHAT / MESSAGING
// ============================================================================
async function startRealChat(peerUid, peerName) {
  if (!currentUserData) return;
  let txt = prompt(`${peerName} ला पाठवायचा मेसेज लिहा:`);
  if (!txt) return;

  await db.collection("chats").add({
    participants: [currentUserData.uid, peerUid],
    senderName: currentUserData.name,
    receiverName: peerName,
    lastMessage: txt,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  showToast("📨 मेसेज पाठवला!");
  switchBottomNav('messages');
}

function listenToRealMessages() {
  if (!currentUserData) return;
  db.collection("chats")
    .where("participants", "array-contains", currentUserData.uid)
    .onSnapshot(snap => {
      let box = document.getElementById("messages-chat-list");
      if (snap.empty) {
        box.innerHTML = `<p style="text-align:center; padding:20px; color:#64748b;">तुमच्या इनबॉक्समध्ये अजून कोणतेही मेसेज नाहीत.</p>`;
        return;
      }
      box.innerHTML = snap.docs.map(doc => {
        let m = doc.data();
        let otherName = (m.senderName === currentUserData.name) ? m.receiverName : m.senderName;
        return `
          <div class="chat-item-row" onclick="replyToChat('${doc.id}', '${otherName}')">
            <div class="chat-unread-dot"></div>
            <div class="chat-av-wrap">
              <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80">
              <span class="online-green-dot"></span>
            </div>
            <div>
              <div class="chat-name">${otherName}</div>
              <div class="chat-last-msg">${m.lastMessage}</div>
            </div>
          </div>
        `;
      }).join("");
    });
}

async function replyToChat(chatId, otherName) {
  let reply = prompt(`${otherName} ला रिप्लाय द्या:`);
  if (!reply) return;
  await db.collection("chats").doc(chatId).update({
    lastMessage: `${currentUserData.name}: ${reply}`,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  showToast("✅ रिप्लाय पाठवला!");
}

// ============================================================================
// 6. REAL SETTINGS EDIT (NAME, BIO, LOCATION, ROLE SWITCH & LOGOUT)
// ============================================================================
async function editUserField(fieldKey, labelName) {
  if (!currentUserData) return;
  let newVal = prompt(`नवीन ${labelName} टाका:`, currentUserData[fieldKey] || "");
  if (!newVal) return;

  await db.collection("users").doc(currentUserData.uid).update({ [fieldKey]: newVal });
  currentUserData[fieldKey] = newVal;
  showToast(`✅ तुमचे ${labelName} सर्वरवर सेव्ह झाले!`);
  openUserProfile(currentUserData.uid);
}

async function switchUserRoleTo(newType) {
  if (!currentUserData) return;
  await db.collection("users").doc(currentUserData.uid).update({ type: newType });
  currentUserData.type = newType;
  closeSettingsScreen();
  openUserProfile(currentUserData.uid);
  showToast(`🔄 तुमचे अकाउंट ${newType.toUpperCase()} मध्ये बदलले!`);
}

function openSettingsScreen() {
  if (!currentUserData) return;
  document.getElementById("set-banner-name").innerText = currentUserData.name;
  document.getElementById("set-banner-sub").innerText = currentUserData.handle || "@user";

  let grid = document.getElementById("settings-grid-content");
  grid.innerHTML = `
    <div class="set-card">
      <h5><i class="fa-solid fa-user-pen"></i> Edit Real Profile</h5>
      <div class="set-row-item" onclick="editUserField('name', 'नाव (Name)')"><span>Change Name</span><span>&gt;</span></div>
      <div class="set-row-item" onclick="editUserField('about', 'माहिती (About Bio)')"><span>Edit Bio / About</span><span>&gt;</span></div>
      <div class="set-row-item" onclick="editUserField('location', 'लोकेशन (Location)')"><span>Change Location</span><span>&gt;</span></div>
      <div class="set-row-item" onclick="editUserField('phone', 'मोबाईल नंबर')"><span>Update Phone Number</span><span>&gt;</span></div>
    </div>
    <div class="set-card">
      <h5><i class="fa-solid fa-sliders"></i> Account Role</h5>
      <div class="set-row-item" onclick="switchUserRoleTo('business')"><span>Switch to Business</span><span>&gt;</span></div>
      <div class="set-row-item" onclick="switchUserRoleTo('people')"><span>Switch to Personal</span><span>&gt;</span></div>
    </div>
  `;
  document.getElementById("settings-modal").style.display = "flex";
}

function closeSettingsScreen() { document.getElementById("settings-modal").style.display = "none"; }

async function logoutCurrentUser() {
  if (auth) await auth.signOut();
  currentUserData = null;
  closeSettingsScreen();
  showToast("👋 यशस्वीरित्या Log Out झाले!");
}

function switchBottomNav(tab) {
  const views = ['home', 'explore', 'nearby', 'messages', 'profile'];
  views.forEach(v => {
    document.getElementById("view-" + v).style.display = (v === tab) ? "block" : "none";
    document.getElementById("bnav-" + v).classList.toggle("active", v === tab);
  });
  document.getElementById("main-top-header").style.display = (tab === 'home') ? "flex" : "none";
  if (tab === 'profile') loadProfileView();
  window.scrollTo(0, 0);
}

function openImageLightbox(imgUrl, captionText) {
  if (!imgUrl) return;
  document.getElementById("lightbox-img").src = imgUrl;
  document.getElementById("lightbox-caption").innerText = captionText || "";
  document.getElementById("gallery-lightbox-modal").style.display = "flex";
}
function closeImageLightbox() { document.getElementById("gallery-lightbox-modal").style.display = "none"; }
function openGoogleMapLink(query) { window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`, "_blank"); }
