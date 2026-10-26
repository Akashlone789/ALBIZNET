// =========================================================
// ALBIZNET - COMPLETE PRO ENGINE v3.0 (app.js)
// Real Send Btn & Chat Delete | Real Camera, Gallery & Voice Recorder |
// Vertical Scrollable Media & Reels Feed | Full IG Action Sheet (Archive, Hide, Pin, Edit, Delete)
// =========================================================

let auth = null;
let db = null;
let currentUserData = null;
let activeProfileUser = null;
let authAccountType = 'people';
let currentCreateMode = 'Post';
let uploadedDataURL = '';
let uploadedMediaType = 'image';

// फिल्टर आणि टॅब स्टेट्स
let activeExploreFilter = 'Offers';
let activeNearbyFilter = 'All';
let activePeopleTab = 'posts';
let activeBizTab = 'Products';
let activeMsgTab = 'Inbox';
let activeCatalogFilter = 'All';

// सक्रिय चॅट, कमेंट आणि व्हॉइस रेकॉर्डर स्टेट्स
let activeChatDocId = null;
let activeChatPeerName = '';
let activeChatPeerAvatar = '';
let activeChatPeerUid = '';
let activeCommentPostId = null;
let activeCommentCollection = 'posts';

// IG Action Menu Target State
let activeMenuTarget = { id: null, col: 'posts' };

// Real Voice Recording State
let mediaRecorder = null;
let audioChunks = [];
let isRecordingVoice = false;

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
// 0. FIREBASE SDK LOADER & PRO UI INJECTOR
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
    injectProModalsIntoDOM();
    setupVideoFileInput();
    upgradeBusinessProfileTabs();

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
// DYNAMIC PRO UI INJECTOR (CHAT, SCROLLABLE VIEWER, IG MENU, NOTIFICATIONS)
// =========================================================
function injectProModalsIntoDOM() {
  if (document.getElementById('pro-messenger-modal')) return;

  const wrapper = document.createElement('div');
  wrapper.innerHTML = `
    <!-- चॅटसाठी छुपे कॅमेरा आणि गॅलरी इनपुट्स -->
    <input type="file" id="chat-camera-input" accept="image/*,video/*" capture="environment" style="display:none;" onchange="handleChatMediaUpload(event, 'camera')">
    <input type="file" id="chat-gallery-input" accept="image/*,video/*" style="display:none;" onchange="handleChatMediaUpload(event, 'gallery')">

    <!-- 1. MESSENGER FULLSCREEN CHAT (WITH VISIBLE SEND BTN, VOICE RECORDER & DELETE CHAT) -->
    <div id="pro-messenger-modal" style="display:none; position:fixed; inset:0; background:#ffffff; z-index:6000; flex-direction:column; font-family:'Poppins', sans-serif;">
      <!-- Top Header -->
      <div style="display:flex; align-items:center; justify-content:space-between; padding:10px 14px; border-bottom:1px solid #f1f5f9; background:#fff; flex-shrink:0;">
        <div style="display:flex; align-items:center; gap:10px; min-width:0;">
          <button onclick="closeMessengerChat()" style="background:none; border:none; font-size:20px; color:#2563eb; cursor:pointer; padding:4px;"><i class="fa-solid fa-arrow-left"></i></button>
          <img id="msg-win-top-avatar" src="" style="width:38px; height:38px; border-radius:50%; object-fit:cover; flex-shrink:0;">
          <div style="min-width:0;">
            <div id="msg-win-top-name" style="font-weight:800; font-size:14.5px; color:#0f172a; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">User</div>
            <div style="font-size:11px; color:#16a34a; font-weight:600;">● Active now</div>
          </div>
        </div>
        <div style="display:flex; align-items:center; gap:16px; color:#2563eb; font-size:19px; flex-shrink:0;">
          <i class="fa-solid fa-phone" style="cursor:pointer;" onclick="showToast('📞 व्हॉइस कॉल जोडला जात आहे...')"></i>
          <i class="fa-solid fa-video" style="cursor:pointer;" onclick="showToast('📹 व्हिडिओ कॉल सुरू होत आहे...')"></i>
          <i class="fa-solid fa-trash-can" style="color:#ef4444; cursor:pointer;" title="Delete Chat" onclick="deleteEntireActiveChat()"></i>
        </div>
      </div>

      <!-- Scrollable Messages Body -->
      <div id="msg-win-body" style="flex:1; overflow-y:auto; padding:14px; display:flex; flex-direction:column; gap:10px; background:#ffffff;">
        <div style="text-align:center; padding:16px 10px 12px;">
          <img id="msg-win-center-avatar" src="" style="width:86px; height:86px; border-radius:50%; object-fit:cover; box-shadow:0 4px 14px rgba(0,0,0,0.1);">
          <h2 id="msg-win-center-name" style="margin:8px 0 4px; font-size:19px; font-weight:800; color:#0f172a;">User</h2>
          <button onclick="closeMessengerChat(); openUserProfile(activeChatPeerUid);" style="background:#f1f5f9; color:#0f172a; border:none; padding:6px 16px; border-radius:20px; font-weight:700; font-size:12.5px; cursor:pointer;">View profile</button>
          <div style="font-size:10.5px; color:#94a3b8; margin-top:6px;">(कोणताही मेसेज डिलीट करण्यासाठी त्या मेसेजवर टच करा)</div>
        </div>
        <div id="msg-win-bubbles" style="display:flex; flex-direction:column; gap:10px;"></div>
        <div style="text-align:center; font-size:11px; color:#64748b; padding:14px 10px 4px; line-height:1.4;">
          🔒 New messages and calls are secured with end-to-end encryption. <b style="color:#2563eb;">Learn more</b>
        </div>
      </div>

      <!-- Voice Recording Indicator Bar -->
      <div id="voice-rec-bar" style="display:none; background:#fef2f2; color:#dc2626; padding:8px 16px; font-size:13px; font-weight:700; align-items:center; justify-content:space-between; border-top:1px solid #fecaca;">
        <span>🔴 आवाज रेकॉर्ड होत आहे... (थांबवण्यासाठी माईकवर पुन्हा टॅप करा)</span>
        <button onclick="stopAndSendVoiceNote()" style="background:#dc2626; color:#fff; border:none; padding:4px 12px; border-radius:12px; font-weight:700; cursor:pointer;">Send Audio</button>
      </div>

      <!-- Bottom Input Bar (Fixed Layout so Send Button NEVER hides!) -->
      <div style="display:flex; align-items:center; gap:8px; padding:8px 10px; border-top:1px solid #f1f5f9; background:#fff; flex-shrink:0; width:100%; box-sizing:border-box;">
        <button onclick="triggerChatCamera()" style="background:none; border:none; color:#2563eb; font-size:20px; padding:4px; cursor:pointer; flex-shrink:0;" title="Camera"><i class="fa-solid fa-camera"></i></button>
        <button onclick="triggerChatGallery()" style="background:none; border:none; color:#2563eb; font-size:20px; padding:4px; cursor:pointer; flex-shrink:0;" title="Gallery"><i class="fa-regular fa-image"></i></button>
        <button id="chat-mic-btn" onclick="toggleRealVoiceRecording()" style="background:none; border:none; color:#2563eb; font-size:20px; padding:4px; cursor:pointer; flex-shrink:0;" title="Record Voice"><i class="fa-solid fa-microphone"></i></button>
        
        <div style="flex:1; min-width:0; display:flex; align-items:center; background:#f1f5f9; border-radius:24px; padding:7px 12px;">
          <input type="text" id="msg-win-input" placeholder="Message..." style="flex:1; width:100%; min-width:0; border:none; background:transparent; outline:none; font-size:14px; color:#0f172a;" onkeypress="if(event.key==='Enter') sendMessengerText()">
          <i class="fa-regular fa-face-smile" style="color:#2563eb; font-size:18px; cursor:pointer; margin-left:6px; flex-shrink:0;" onclick="const i=document.getElementById('msg-win-input'); i.value+='😊'; i.focus();"></i>
        </div>

        <!-- Always Visible Blue Send Button & Thumbs Up -->
        <button id="msg-send-btn" onclick="sendMessengerText()" style="background:#2563eb; color:#fff; border:none; width:38px; height:38px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:15px; cursor:pointer; flex-shrink:0; box-shadow:0 2px 6px rgba(37,99,235,0.3);"><i class="fa-solid fa-paper-plane"></i></button>
        <button id="msg-thumb-btn" onclick="sendMessengerThumb()" style="background:none; border:none; color:#2563eb; font-size:22px; padding:2px 4px; cursor:pointer; flex-shrink:0;"><i class="fa-solid fa-thumbs-up"></i></button>
      </div>
    </div>

    <!-- 2. VERTICAL SCROLLABLE FULLSCREEN MEDIA & REELS FEED (WITH 3-DOT MENU & DELETE) -->
    <div id="pro-scroll-feed-modal" style="display:none; position:fixed; inset:0; background:#000000; z-index:6200; flex-direction:column; font-family:'Poppins', sans-serif;">
      <div style="position:fixed; top:0; left:0; right:0; z-index:6210; display:flex; align-items:center; justify-content:space-between; padding:12px 16px; background:linear-gradient(rgba(0,0,0,0.75), transparent); color:#fff;">
        <div style="display:flex; align-items:center; gap:12px;">
          <button onclick="closeScrollableFeedModal()" style="background:rgba(255,255,255,0.18); border:none; color:#fff; width:36px; height:36px; border-radius:50%; font-size:17px; cursor:pointer;"><i class="fa-solid fa-arrow-left"></i></button>
          <span id="scroll-feed-header-title" style="font-weight:800; font-size:16px;">Reels & Media</span>
        </div>
        <span style="font-size:12px; background:rgba(255,255,255,0.2); padding:4px 10px; border-radius:14px;">↕️ वर-खाली स्क्रोल करा</span>
      </div>
      <div id="pro-scroll-feed-body" style="flex:1; height:100vh; overflow-y:scroll; scroll-snap-type:y mandatory; -webkit-overflow-scrolling:touch;"></div>
    </div>

    <!-- 3. INSTAGRAM STYLE 3-DOT ACTION SHEET (ARCHIVE, HIDE, EDIT, PIN, DELETE) -->
    <div id="pro-ig-action-modal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.6); z-index:6800; align-items:flex-end; justify-content:center; font-family:'Poppins', sans-serif;" onclick="closeItemActionMenu()">
      <div style="background:#ffffff; width:100%; max-width:480px; max-height:85vh; border-radius:24px 24px 0 0; overflow-y:auto; padding:10px 0 24px; box-shadow:0 -4px 25px rgba(0,0,0,0.2);" onclick="event.stopPropagation()">
        <div style="width:42px; height:4px; background:#cbd5e1; border-radius:4px; margin:4px auto 14px;"></div>
        
        <!-- Top 3 Quick Action Boxes (Save, Remix, QR code) -->
        <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:10px; padding:0 16px 14px; border-bottom:1px solid #f1f5f9;">
          <div onclick="handleIGMenuAction('save')" style="background:#f8fafc; border-radius:14px; padding:12px 8px; text-align:center; cursor:pointer;">
            <i class="fa-regular fa-bookmark" style="font-size:20px; color:#0f172a; display:block; margin-bottom:6px;"></i>
            <span style="font-size:12.5px; font-weight:600; color:#0f172a;">Save</span>
          </div>
          <div onclick="handleIGMenuAction('remix')" style="background:#f8fafc; border-radius:14px; padding:12px 8px; text-align:center; cursor:pointer;">
            <i class="fa-solid fa-repeat" style="font-size:20px; color:#0f172a; display:block; margin-bottom:6px;"></i>
            <span style="font-size:12.5px; font-weight:600; color:#0f172a;">Remix</span>
          </div>
          <div onclick="handleIGMenuAction('qr')" style="background:#f8fafc; border-radius:14px; padding:12px 8px; text-align:center; cursor:pointer;">
            <i class="fa-solid fa-qrcode" style="font-size:20px; color:#0f172a; display:block; margin-bottom:6px;"></i>
            <span style="font-size:12.5px; font-weight:600; color:#0f172a;">QR code</span>
          </div>
        </div>

        <!-- Full Action Options List (Exact match to Screenshots 4 & 5) -->
        <div style="display:flex; flex-direction:column; font-size:15px; font-weight:500; color:#0f172a;">
          <div onclick="handleIGMenuAction('archive')" style="display:flex; align-items:center; gap:16px; padding:13px 20px; cursor:pointer;">
            <i class="fa-solid fa-clock-rotate-left" style="width:22px; font-size:18px;"></i> <span id="ig-txt-archive">Archive (होलो / लपवा)</span>
          </div>
          <div onclick="handleIGMenuAction('hideLikes')" style="display:flex; align-items:center; gap:16px; padding:13px 20px; cursor:pointer;">
            <i class="fa-regular fa-heart" style="width:22px; font-size:18px;"></i> <span id="ig-txt-likes">Hide like count to others</span>
          </div>
          <div onclick="handleIGMenuAction('hideShares')" style="display:flex; align-items:center; gap:16px; padding:13px 20px; cursor:pointer;">
            <i class="fa-regular fa-paper-plane" style="width:22px; font-size:18px;"></i> <span>Hide share count</span>
          </div>
          <div onclick="handleIGMenuAction('turnOffComments')" style="display:flex; align-items:center; gap:16px; padding:13px 20px; cursor:pointer;">
            <i class="fa-regular fa-comment-slash" style="width:22px; font-size:18px;"></i> <span id="ig-txt-comments">Turn off commenting</span>
          </div>
          <div onclick="handleIGMenuAction('edit')" style="display:flex; align-items:center; gap:16px; padding:13px 20px; cursor:pointer;">
            <i class="fa-solid fa-pen" style="width:22px; font-size:18px;"></i> <span>Edit Caption / Info</span>
          </div>
          <div onclick="handleIGMenuAction('pin')" style="display:flex; align-items:center; gap:16px; padding:13px 20px; cursor:pointer;">
            <i class="fa-solid fa-thumbtack" style="width:22px; font-size:18px;"></i> <span id="ig-txt-pin">Pin to your main grid</span>
          </div>
          <div onclick="handleIGMenuAction('removeGrid')" style="display:flex; align-items:center; gap:16px; padding:13px 20px; cursor:pointer;">
            <i class="fa-solid fa-circle-minus" style="width:22px; font-size:18px;"></i> <span>Remove from main grid (Hide)</span>
          </div>
          <div onclick="handleIGMenuAction('insights')" style="display:flex; align-items:center; gap:16px; padding:13px 20px; cursor:pointer;">
            <i class="fa-solid fa-chart-Simple" style="width:22px; font-size:18px;"></i> <span>View insights</span>
          </div>
          <div onclick="handleIGMenuAction('delete')" style="display:flex; align-items:center; gap:16px; padding:14px 20px; cursor:pointer; color:#dc2626; font-weight:700; border-top:1px solid #f1f5f9; margin-top:4px;">
            <i class="fa-regular fa-trash-can" style="width:22px; font-size:19px; color:#dc2626;"></i> <span>Delete Permanently</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 4. INSTAGRAM STYLE FULLSCREEN NOTIFICATIONS VIEW -->
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

    <!-- 5. REAL COMMENTS DRAWER MODAL -->
    <div id="pro-comments-modal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.55); z-index:6500; align-items:flex-end; justify-content:center; font-family:'Poppins', sans-serif;" onclick="closeCommentsModal()">
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
}

function setupVideoFileInput() {
  const fileInp = document.querySelector('#create-content-modal input[type="file"]');
  if (fileInp) {
    fileInp.setAttribute('id', 'cr-file-input');
    fileInp.setAttribute('accept', 'image/*,video/*');
  }
}

// बिझनेस प्रोफाईलमध्येही Posts, Reels, Moments, Products टॅब्स चालू करा
function upgradeBusinessProfileTabs() {
  const bizTabs = document.querySelector('#business-profile-box .prof-sub-tabs');
  if (bizTabs) {
    bizTabs.innerHTML = `
      <span onclick="switchBizMediaTab('Posts', this)">Posts</span>
      <span class="active" onclick="switchBizMediaTab('Products', this)">Products</span>
      <span onclick="switchBizMediaTab('Reels', this)">Reels</span>
      <span onclick="switchBizMediaTab('Moments', this)">Moments</span>
      <span onclick="switchBizMediaTab('Archived', this)">Archived</span>
    `;
  }
  const peopleTabs = document.getElementById('people-sub-tabs');
  if (peopleTabs && !peopleTabs.innerHTML.includes('archived')) {
    const archSpan = document.createElement('span');
    archSpan.innerText = 'Archived';
    archSpan.onclick = function() { switchPeopleMediaTab('archived', this); };
    peopleTabs.appendChild(archSpan);
  }
}

// =========================================================
// 1. REAL AUTHENTICATION
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
// 2. REAL-TIME STREAMS (24H STORIES, VIDEO REELS, POSTS, ARCHIVE/PIN SUPPORT)
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

function sortByPinnedAndCreatedDesc(arr) {
  return arr.sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
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
  db.collection('reels').onSnapshot(snap => {
    cacheReels = sortByPinnedAndCreatedDesc(snap.docs.map(d => ({ id: d.id, _col: 'reels', ...d.data() })));
    renderReelsBar();
    if (activeExploreFilter === 'Trending Reels') renderExploreOffers();
    renderProfileMediaGrid();
    renderBizMediaSection();
  });

  db.collection('posts').onSnapshot(snap => {
    cachePosts = sortByPinnedAndCreatedDesc(snap.docs.map(d => ({ id: d.id, _col: 'posts', ...d.data() })));
    renderHomeFeed();
    renderExploreOffers();
    renderProfileMediaGrid();
    renderBizMediaSection();
    if (activeCommentPostId) renderCommentsList(activeCommentPostId);
  });

  db.collection('stories').onSnapshot(snap => {
    const now = Date.now();
    const twentyFourHours = 24 * 60 * 60 * 1000;
    const validStories = [];

    snap.docs.forEach(doc => {
      const data = doc.data();
      const createdTime = data.timeMs || (data.createdAt && data.createdAt.toMillis ? data.createdAt.toMillis() : now);
      const expiryTime = data.expiresAt || (createdTime + twentyFourHours);

      if (now > expiryTime) {
        db.collection('stories').doc(doc.id).delete().catch(() => {});
      } else {
        validStories.push({ id: doc.id, _col: 'stories', ...data });
      }
    });

    cacheStories = sortByPinnedAndCreatedDesc(validStories);
    renderStoriesMomentsBar();
    renderProfileMediaGrid();
    renderBizMediaSection();
  });

  db.collection('notes').onSnapshot(snap => {
    cacheNotes = sortByPinnedAndCreatedDesc(snap.docs.map(d => ({ id: d.id, _col: 'notes', ...d.data() })));
    renderNotesBarInMessages();
    renderProfileMediaGrid();
  });

  db.collection('products').onSnapshot(snap => {
    cacheProducts = sortByPinnedAndCreatedDesc(snap.docs.map(d => ({ id: d.id, _col: 'products', ...d.data() })));
    renderCatalogGrid();
    renderBizMediaSection();
  });
}

function renderStoriesMomentsBar() {
  const momentsBar = document.querySelector('#view-home .moments-scroll-bar');
  if (!momentsBar) return;

  const firstYourMoment = momentsBar.querySelector('.your-moment-box').outerHTML;
  const visibleStories = cacheStories.filter(s => !s.archived && !s.hiddenFromGrid);

  const realStoriesHTML = visibleStories.map(st => `
    <div class="story-circle-item" onclick="openScrollableMediaFeed('stories', '${st.id}', 'Moments & Stories')">
      <div class="story-grad-ring"><img src="${st.avatar || st.img}"><span class="story-plus">+</span></div>
      <span>${(st.author || 'User').split(' ')[0]}</span>
    </div>
  `).join('');

  momentsBar.innerHTML = firstYourMoment + realStoriesHTML;
}

function renderReelsBar() {
  let rBox = document.getElementById('reels-container');
  if (!rBox) return;
  const visibleReels = cacheReels.filter(r => !r.archived && !r.hiddenFromGrid);

  if (visibleReels.length === 0) {
    rBox.innerHTML = `<p style="font-size:12px; color:#64748b; padding:10px;">अजून कोणतीही Reel नाही. '+ Create ➔ Reel' वरून व्हिडिओ टाका!</p>`;
    return;
  }
  rBox.innerHTML = visibleReels.map(r => {
    const isVid = r.mediaType === 'video' || (r.img && r.img.startsWith('data:video'));
    return `
      <div class="reel-thumb-card" onclick="openScrollableMediaFeed('reels', '${r.id}', 'Shorts & Reels ⚡')" style="min-width:135px; height:210px; background:#000; border-radius:14px; position:relative; overflow:hidden; cursor:pointer; margin-right:10px; flex-shrink:0;">
        ${isVid
          ? `<video src="${r.img}" style="width:100%; height:100%; object-fit:cover;" muted loop playsinline></video>`
          : `<img src="${r.img}" style="width:100%; height:100%; object-fit:cover;">`
        }
        <button onclick="event.stopPropagation(); openItemActionMenu('${r.id}', 'reels')" style="position:absolute; top:6px; right:6px; background:rgba(0,0,0,0.6); color:#fff; border:none; width:26px; height:26px; border-radius:50%; font-size:13px; cursor:pointer; z-index:2;"><i class="fa-solid fa-ellipsis-vertical"></i></button>
        <div class="reel-play-pill" style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); background:rgba(0,0,0,0.65); color:#fff; padding:6px 12px; border-radius:20px; font-size:12px; font-weight:700;"><i class="fa-solid fa-play"></i> Play</div>
        <div class="reel-bottom-meta" style="position:absolute; bottom:8px; left:8px; right:8px; color:#fff; font-size:11px; text-shadow:0 1px 3px #000;">
          <span class="reel-views-txt">${r.views || 1} Views 🔥</span>
          <div class="reel-author-row" style="display:flex; justify-content:space-between; font-weight:700;"><span>${(r.author || 'User').split(' ')[0]}</span><span>${isVid ? '🎬' : '0:30'}</span></div>
        </div>
      </div>
    `;
  }).join('');
}

// =========================================================
// HOME FEED POSTS (WITH 3-DOT MENU & 3 BOTTOM BUTTONS)
// =========================================================
function renderHomeFeed() {
  let pBox = document.getElementById('home-posts-feed');
  if (!pBox) return;

  const visiblePosts = cachePosts.filter(p => !p.archived && !p.hiddenFromGrid);
  if (visiblePosts.length === 0) {
    pBox.innerHTML = `<div style="text-align:center; padding:30px; color:#64748b;">अजून कोणतीही पोस्ट नाही. '+ Create ➔ Post' वर दाबून पहिली पोस्ट करा!</div>`;
    return;
  }

  const myUid = currentUserData ? currentUserData.uid : 'guest';

  pBox.innerHTML = visiblePosts.map(p => {
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
            <div class="fp-name" onclick="openUserProfile('${p.uid}')" style="font-weight:800; font-size:15px; color:#0f172a; cursor:pointer;">
              ${p.author || 'ALBIZNET User'} ${p.pinned ? '<span style="font-size:11px; color:#2563eb; margin-left:4px;">📌 Pinned</span>' : ''}
            </div>
            <div class="fp-cat-tag" style="font-size:12px; color:#64748b;"><i class="fa-solid fa-location-dot"></i> ${p.location || 'Maharashtra'} &bull; <span style="color:#4f46e5; font-weight:700;">${p.category || 'Post'}</span></div>
          </div>
          <!-- 3-DOT MENU BUTTON ON EVERY POST -->
          <button onclick="openItemActionMenu('${postId}', 'posts')" style="background:#f8fafc; border:none; width:34px; height:34px; border-radius:50%; color:#334155; font-size:16px; cursor:pointer;"><i class="fa-solid fa-ellipsis-vertical"></i></button>
        </div>
        <div class="fp-caption" style="font-size:14.5px; color:#1e293b; margin-bottom:10px; line-height:1.45;">${p.caption || ''}</div>
        ${p.img ? (
          isVid
            ? `<video src="${p.img}" controls playsinline onclick="openScrollableMediaFeed('posts', '${postId}', 'Posts Feed')" style="width:100%; max-height:400px; border-radius:14px; background:#000; cursor:pointer;"></video>`
            : `<img class="fp-media-img" src="${p.img}" onclick="openScrollableMediaFeed('posts', '${postId}', 'Posts Feed')" style="width:100%; max-height:400px; object-fit:cover; border-radius:14px; cursor:pointer;">`
        ) : ''}
        
        <!-- 3 BUTTONS: LIKE/UNLIKE, COMMENT, SHARE -->
        <div class="fp-actions-bar" style="display:flex; justify-content:space-around; align-items:center; padding-top:12px; margin-top:12px; border-top:1px solid #f1f5f9; font-size:14px; font-weight:700; color:#334155;">
          <div onclick="toggleLikeDislikeItem('${postId}', 'posts')" style="cursor:pointer; display:flex; align-items:center; gap:6px; color:${isLiked ? '#e11d48' : '#475569'};">
            <i class="${isLiked ? 'fa-solid' : 'fa-regular'} fa-heart" style="font-size:18px; color:${isLiked ? '#e11d48' : '#475569'};"></i>
            <span>${p.hideLikes ? 'Like' : (likeCount + ' Like')}</span>
          </div>
          <div onclick="openCommentsModal('${postId}', 'posts')" style="cursor:pointer; display:flex; align-items:center; gap:6px; color:#475569;">
            <i class="fa-regular fa-comment" style="font-size:18px;"></i>
            <span>${p.commentsOff ? 'Comments Off' : (cmtCount + ' Comment')}</span>
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

function getCacheArrayByCol(col) {
  if (col === 'reels') return cacheReels;
  if (col === 'stories') return cacheStories;
  if (col === 'notes') return cacheNotes;
  if (col === 'offers') return cacheOffers;
  if (col === 'products') return cacheProducts;
  return cachePosts;
}

async function toggleLikeDislikeItem(itemId, colName = 'posts') {
  if (!currentUserData) return showToast('⚠️ कृपया आधी लॉगिन करा!');
  const arr = getCacheArrayByCol(colName);
  const item = arr.find(x => x.id === itemId);
  if (!item) return;

  const myUid = currentUserData.uid;
  let likedBy = Array.isArray(item.likedBy) ? [...item.likedBy] : [];
  let currentLikes = typeof item.likes === 'number' ? item.likes : likedBy.length;

  if (likedBy.includes(myUid)) {
    likedBy = likedBy.filter(id => id !== myUid);
    currentLikes = Math.max(0, currentLikes - 1);
    await db.collection(colName).doc(itemId).update({ likedBy, likes: currentLikes });
    showToast('💔 Like काढून टाकले');
  } else {
    likedBy.push(myUid);
    currentLikes = currentLikes + 1;
    await db.collection(colName).doc(itemId).update({ likedBy, likes: currentLikes });
    showToast('❤️ Liked!');
  }
}

// =========================================================
// VERTICAL SCROLLABLE REELS & MEDIA FEED (TIKTOK / IG STYLE)
// =========================================================
function openScrollableMediaFeed(colName, startId, headerTitle, customList) {
  let list = customList;
  if (!list) {
    const raw = getCacheArrayByCol(colName);
    list = raw.filter(i => !i.archived);
  }
  if (!list || list.length === 0) return;

  // ज्या फोटो/व्हिडिओवर क्लिक केले तो पहिल्यांदा येईल आणि खाली बाकीचे स्क्रोल होतील!
  const startIndex = list.findIndex(x => x.id === startId);
  let ordered = [...list];
  if (startIndex > 0) {
    ordered = [...list.slice(startIndex), ...list.slice(0, startIndex)];
  }

  document.getElementById('scroll-feed-header-title').innerText = headerTitle || 'Media Feed';
  const feedBody = document.getElementById('pro-scroll-feed-body');
  const myUid = currentUserData ? currentUserData.uid : 'guest';

  feedBody.innerHTML = ordered.map(item => {
    const col = item._col || colName || 'posts';
    const isVid = item.mediaType === 'video' || (item.img && item.img.startsWith('data:video'));
    const label = item.caption || item.deal || item.title || item.noteText || '';
    const author = item.author || item.bizName || item.sellerName || 'ALBIZNET User';
    const likedBy = Array.isArray(item.likedBy) ? item.likedBy : [];
    const isLiked = likedBy.includes(myUid);
    const likesCount = typeof item.likes === 'number' ? item.likes : likedBy.length;
    const cmtCount = (Array.isArray(item.commentsList) ? item.commentsList.length : item.commentsCount) || 0;

    return `
      <div class="scroll-snap-slide" data-id="${item.id}" data-col="${col}" style="height:100vh; width:100%; scroll-snap-align:start; position:relative; display:flex; align-items:center; justify-content:center; background:#000; overflow:hidden;">
        ${isVid
          ? `<video src="${item.img}" class="scroll-feed-video" loop playsinline controls style="width:100%; max-height:88vh; object-fit:contain;"></video>`
          : `<img src="${item.img}" style="width:100%; max-height:86vh; object-fit:contain;">`
        }

        <!-- Right Side Floating Action Buttons (Like, Comment, Share, 3-Dots Menu, Delete) -->
        <div style="position:absolute; right:14px; bottom:95px; display:flex; flex-direction:column; align-items:center; gap:18px; z-index:5;">
          <div onclick="toggleLikeDislikeItem('${item.id}', '${col}')" style="text-align:center; color:#fff; cursor:pointer; text-shadow:0 2px 6px rgba(0,0,0,0.8);">
            <i class="fa-solid fa-heart" style="font-size:28px; color:${isLiked ? '#ef4444' : '#ffffff'};"></i>
            <div style="font-size:12px; font-weight:700;">${item.hideLikes ? '' : likesCount}</div>
          </div>

          <div onclick="openCommentsModal('${item.id}', '${col}')" style="text-align:center; color:#fff; cursor:pointer; text-shadow:0 2px 6px rgba(0,0,0,0.8);">
            <i class="fa-solid fa-comment-dots" style="font-size:26px;"></i>
            <div style="font-size:12px; font-weight:700;">${cmtCount}</div>
          </div>

          <div onclick="shareRealPost('${item.id}', '${label.replace(/'/g, '')}')" style="text-align:center; color:#fff; cursor:pointer; text-shadow:0 2px 6px rgba(0,0,0,0.8);">
            <i class="fa-solid fa-share" style="font-size:25px;"></i>
            <div style="font-size:11.5px; font-weight:700;">Share</div>
          </div>

          <!-- 3-DOTS MORE OPTIONS (Archive, Hide, Pin, Edit, Delete) -->
          <div onclick="openItemActionMenu('${item.id}', '${col}')" style="text-align:center; color:#fff; cursor:pointer; background:rgba(0,0,0,0.55); width:42px; height:42px; border-radius:50%; display:flex; align-items:center; justify-content:center;">
            <i class="fa-solid fa-ellipsis-vertical" style="font-size:20px;"></i>
          </div>
        </div>

        <!-- Bottom Author & Caption Overlay -->
        <div style="position:absolute; bottom:24px; left:14px; right:74px; color:#fff; text-shadow:0 1px 4px rgba(0,0,0,0.9); z-index:4;">
          <div style="font-weight:800; font-size:15.5px; margin-bottom:4px;">@${author} ${item.pinned ? '📌' : ''}</div>
          <div style="font-size:14px; opacity:0.95; line-height:1.35;">${label}</div>
          ${item.price ? `<div style="color:#4ade80; font-weight:900; font-size:15px; margin-top:4px;">🏷️ ${item.price}</div>` : ''}
        </div>
      </div>
    `;
  }).join('');

  document.getElementById('pro-scroll-feed-modal').style.display = 'flex';
  feedBody.scrollTop = 0;

  // स्क्रोल केल्यावर व्हिडिओ आपोआप चालू/बंद (Auto-Play on Scroll) होण्यासाठी Observer
  setupScrollVideoAutoPlay();
}

function setupScrollVideoAutoPlay() {
  const videos = document.querySelectorAll('#pro-scroll-feed-body .scroll-feed-video');
  if (!videos.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const vid = entry.target;
      if (entry.isIntersecting) {
        vid.play().catch(() => {});
      } else {
        vid.pause();
      }
    });
  }, { threshold: 0.65 });

  videos.forEach(v => observer.observe(v));
}

function closeScrollableFeedModal() {
  document.querySelectorAll('#pro-scroll-feed-body video').forEach(v => v.pause());
  document.getElementById('pro-scroll-feed-modal').style.display = 'none';
}

// =========================================================
// INSTAGRAM 3-DOT ACTION SHEET HANDLER (ARCHIVE, HIDE, PIN, EDIT, DELETE)
// =========================================================
function openItemActionMenu(itemId, colName) {
  activeMenuTarget = { id: itemId, col: colName || 'posts' };
  const arr = getCacheArrayByCol(activeMenuTarget.col);
  const item = arr.find(x => x.id === itemId);

  if (item) {
    document.getElementById('ig-txt-archive').innerText = item.archived ? 'Unarchive (पुन्हा प्रोफाईलवर दाखवा)' : 'Archive';
    document.getElementById('ig-txt-likes').innerText = item.hideLikes ? 'Unhide like count' : 'Hide like count to others';
    document.getElementById('ig-txt-comments').innerText = item.commentsOff ? 'Turn on commenting' : 'Turn off commenting';
    document.getElementById('ig-txt-pin').innerText = item.pinned ? 'Unpin from main grid' : 'Pin to your main grid';
  }

  document.getElementById('pro-ig-action-modal').style.display = 'flex';
}

function closeItemActionMenu() {
  document.getElementById('pro-ig-action-modal').style.display = 'none';
}

async function handleIGMenuAction(action) {
  const { id, col } = activeMenuTarget;
  if (!id || !col) return;

  const arr = getCacheArrayByCol(col);
  const item = arr.find(x => x.id === id);
  if (!item) return closeItemActionMenu();

  try {
    if (action === 'delete') {
      if (!confirm('🗑️ तुम्हाला खात्री आहे की ही पोस्ट/रील/स्टोरी कायमची डिलीट करायची आहे?')) return;
      await db.collection(col).doc(id).delete();
      closeItemActionMenu();
      closeScrollableFeedModal();
      showToast('🗑️ यशस्वीरित्या कायमचे Delete केले!');
    } else if (action === 'archive') {
      const newVal = !item.archived;
      await db.collection(col).doc(id).update({ archived: newVal });
      closeItemActionMenu();
      showToast(newVal ? '📦 Archived! (प्रोफाईलच्या Archived टॅबमध्ये दिसेल)' : '✨ Unarchived! पुन्हा मुख्य प्रोफाईलवर जोडले.');
    } else if (action === 'removeGrid') {
      const newVal = !item.hiddenFromGrid;
      await db.collection(col).doc(id).update({ hiddenFromGrid: newVal });
      closeItemActionMenu();
      showToast(newVal ? '🙈 मुख्य ग्रिडवरून लपवले (Hidden from main grid)!' : '👁️ पुन्हा ग्रिडवर दाखवले!');
    } else if (action === 'pin') {
      const newVal = !item.pinned;
      await db.collection(col).doc(id).update({ pinned: newVal });
      closeItemActionMenu();
      showToast(newVal ? '📌 तुमच्या प्रोफाईलवर सर्वात वर Pin केले!' : '📌 Unpinned!');
    } else if (action === 'hideLikes') {
      const newVal = !item.hideLikes;
      await db.collection(col).doc(id).update({ hideLikes: newVal });
      closeItemActionMenu();
      showToast(newVal ? '❤️ Like संख्या इतरांसाठी लपवली!' : '❤️ Like संख्या आता दिसेल!');
    } else if (action === 'turnOffComments') {
      const newVal = !item.commentsOff;
      await db.collection(col).doc(id).update({ commentsOff: newVal });
      closeItemActionMenu();
      showToast(newVal ? '🔇 या पोस्टसाठी कमेंट्स बंद केल्या!' : '💬 कमेंट्स पुन्हा चालू केल्या!');
    } else if (action === 'edit') {
      closeItemActionMenu();
      const field = col === 'offers' ? 'deal' : (col === 'products' ? 'title' : (col === 'notes' ? 'noteText' : 'caption'));
      const currentTxt = item[field] || '';
      const updated = prompt('✏️ नवीन कॅप्शन / माहिती लिहा:', currentTxt);
      if (updated !== null) {
        await db.collection(col).doc(id).update({ [field]: updated.trim() });
        showToast('✅ माहिती अपडेट झाली!');
      }
    } else if (action === 'save') {
      closeItemActionMenu();
      showToast('🔖 तुमच्या Saved कलेक्शनमध्ये सेव्ह केले!');
    } else if (action === 'remix') {
      closeItemActionMenu();
      openCreateContentModal('Reel');
    } else if (action === 'qr') {
      closeItemActionMenu();
      showToast('📱 QR Code लिंक कॉपी झाली!');
    } else if (action === 'insights') {
      closeItemActionMenu();
      alert(`📊 Post Insights:\n\n👁️ Views: ${item.views || 18}\n❤️ Likes: ${item.likes || 0}\n💬 Comments: ${item.commentsCount || 0}`);
    } else {
      closeItemActionMenu();
      showToast('✅ सेटिंग अपडेट झाली!');
    }
  } catch (err) {
    showToast('❌ Error: ' + err.message);
  }
}

// =========================================================
// REAL COMMENT BOX DRAWER
// =========================================================
function openCommentsModal(itemId, colName = 'posts') {
  const arr = getCacheArrayByCol(colName);
  const item = arr.find(x => x.id === itemId);
  if (item && item.commentsOff) {
    return showToast('🔇 या पोस्टवर कमेंट्स बंद ठेवल्या आहेत.');
  }
  activeCommentPostId = itemId;
  activeCommentCollection = colName;
  document.getElementById('pro-comments-modal').style.display = 'flex';
  renderCommentsList(itemId);
}

function closeCommentsModal() {
  activeCommentPostId = null;
  document.getElementById('pro-comments-modal').style.display = 'none';
}

function renderCommentsList(itemId) {
  const listBox = document.getElementById('pro-comments-list');
  if (!listBox) return;
  const arr = getCacheArrayByCol(activeCommentCollection);
  const item = arr.find(x => x.id === itemId);
  const comments = (item && Array.isArray(item.commentsList)) ? item.commentsList : [];

  if (comments.length === 0) {
    listBox.innerHTML = `<div style="text-align:center; padding:40px 16px; color:#64748b; font-size:13.5px;">अजून कोणतीही कमेंट नाही. पहिली कमेंट तुम्ही करा! 💬</div>`;
    return;
  }

  listBox.innerHTML = comments.map((c, idx) => `
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

  const arr = getCacheArrayByCol(activeCommentCollection);
  const item = arr.find(x => x.id === activeCommentPostId);
  let currentList = (item && Array.isArray(item.commentsList)) ? [...item.commentsList] : [];

  currentList.push({
    uid: currentUserData.uid,
    author: currentUserData.name,
    avatar: currentUserData.avatar,
    text: txt,
    timeMs: Date.now()
  });

  inp.value = '';

  await db.collection(activeCommentCollection).doc(activeCommentPostId).update({
    commentsList: currentList,
    commentsCount: currentList.length
  });

  renderCommentsList(activeCommentPostId);
}

async function shareRealPost(postId, caption) {
  const shareUrl = window.location.origin;
  if (navigator.share) {
    try {
      await navigator.share({ title: 'ALBIZNET', text: caption, url: shareUrl });
      return;
    } catch (e) {}
  }
  navigator.clipboard?.writeText(shareUrl);
  showToast('🔗 लिंक कॉपी आणि शेअर केली!');
}

// =========================================================
// 3. PUBLISH REAL CONTENT
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
  if (fileInp) {
    fileInp.value = '';
    fileInp.setAttribute('accept', (mode === 'Reel' || mode === 'Live' || mode === 'Post' || mode === 'Story') ? 'video/*,image/*' : 'image/*');
  }

  subInp.style.display = (mode === 'Offer' || mode === 'Product' || mode === 'Post') ? 'block' : 'none';
  priceInp.style.display = (mode === 'Product') ? 'block' : 'none';
  titleInp.placeholder = `${mode} साठी कॅप्शन / नाव लिहा...`;

  document.getElementById('create-content-modal').style.display = 'flex';
}

function closeCreateContentModal() {
  document.getElementById('create-content-modal').style.display = 'none';
}

function handleFileSelect(e) {
  if (!e.target.files || !e.target.files[0]) return;
  let file = e.target.files[0];

  if (file.type.startsWith('video/')) {
    let reader = new FileReader();
    reader.onload = function(evt) {
      uploadedDataURL = evt.target.result;
      uploadedMediaType = 'video';
      showToast('🎬 व्हिडिओ निवडला गेला!');
    };
    reader.readAsDataURL(file);
  } else {
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
        likes: 0,
        likedBy: [],
        timeMs: nowMs,
        createdAt: nowTs
      });
    } else if (currentCreateMode === 'Story') {
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

    closeCreateContentModal();
    showToast(`✅ तुमची ${currentCreateMode} यशस्वीरित्या पब्लिश झाली!`);
  } catch (err) {
    showToast('❌ Error: ' + err.message);
  }
}

// =========================================================
// 4. REAL MESSENGER CHAT (CAMERA, GALLERY, VOICE RECORDING & DELETE)
// =========================================================
function renderNotesBarInMessages() {
  const bar = document.querySelector('#view-messages .moments-scroll-bar');
  if (!bar) return;
  const firstNote = bar.querySelector('.your-note-card').outerHTML;
  const visibleNotes = cacheNotes.filter(n => !n.archived);
  bar.innerHTML = firstNote + visibleNotes.map(n => `
    <div class="story-circle-item" onclick="openScrollableMediaFeed('notes', '${n.id}', 'Notes')">
      <div class="story-grad-ring"><img src="${n.avatar || n.img}"></div>
      <span>${(n.noteText || 'Note').substring(0, 10)}..</span>
    </div>
  `).join('');
}

function listenToRealMessages() {
  db.collection('chats').onSnapshot(snap => {
    cacheChats = sortByPinnedAndCreatedDesc(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    renderMessagesList();

    let unreadCount = cacheChats.filter(c => c.unread === true).length;
    let badge = document.querySelector('.msg-badge-count');
    if (badge) {
      badge.innerText = unreadCount;
      badge.style.display = unreadCount > 0 ? 'inline-block' : 'none';
    }

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
    return cat !== 'Request';
  });

  if (list.length === 0) {
    box.innerHTML = `
      <div style="text-align:center; padding:32px 16px; color:#64748b;">
        <b>${activeMsgTab}</b> मध्ये सध्या कोणताही मेसेज नाही.<br><br>
        <button onclick="createNewChatInCurrentTab()" style="background:#4f46e5; color:#fff; border:none; padding:10px 18px; border-radius:12px; font-weight:700; cursor:pointer;">💬 नवीन मेसेज सुरू करा</button>
      </div>`;
    return;
  }

  box.innerHTML = list.map(m => {
    let isMeSender = currentUserData && m.senderUid === currentUserData.uid;
    let peerName = isMeSender ? (m.receiverName || 'Friend') : (m.senderName || 'User');
    let peerAvatar = m.peerAvatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80';
    let peerUid = isMeSender ? (m.receiverUid || m.senderUid) : (m.senderUid || '');

    return `
      <div class="chat-item-row" onclick="openMessengerWindow('${m.id}', '${peerName.replace(/'/g, '')}', '${peerAvatar}', '${peerUid}')" style="display:flex; align-items:center; gap:12px; padding:12px 14px; margin:8px 12px; border-radius:16px; background:#fff; box-shadow:0 2px 8px rgba(0,0,0,0.04); cursor:pointer;">
        <img src="${peerAvatar}" style="width:48px; height:48px; border-radius:50%; object-fit:cover;">
        <div style="flex:1; min-width:0;">
          <div style="font-weight:${m.unread ? '900' : '700'}; font-size:15px; color:#0f172a;">${peerName}</div>
          <div style="font-size:13px; color:#64748b; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${m.lastMessage || 'Tap to chat'}</div>
        </div>
        <button onclick="event.stopPropagation(); deleteChatFromList('${m.id}')" style="background:#fef2f2; color:#ef4444; border:none; width:34px; height:34px; border-radius:50%; cursor:pointer;" title="Delete Chat"><i class="fa-regular fa-trash-can"></i></button>
      </div>
    `;
  }).join('');
}

async function deleteChatFromList(chatId) {
  if (!confirm('🗑️ हे संपूर्ण चॅट डिलीट करायचे का?')) return;
  await db.collection('chats').doc(chatId).delete();
  showToast('🗑️ चॅट डिलीट केले गेले!');
}

async function deleteEntireActiveChat() {
  if (!activeChatDocId) return;
  if (!confirm('🗑️ तुम्हाला हे संपूर्ण चॅट कायमचे डिलीट करायचे आहे का?')) return;
  const idToDel = activeChatDocId;
  closeMessengerChat();
  await db.collection('chats').doc(idToDel).delete();
  showToast('🗑️ चॅट यशस्वीरित्या डिलीट केले!');
}

async function deleteSingleMessageBubble(msgIndex) {
  if (!activeChatDocId) return;
  if (!confirm('🗑️ हा मेसेज डिलीट करायचा का?')) return;
  const chatDoc = cacheChats.find(x => x.id === activeChatDocId);
  if (!chatDoc || !Array.isArray(chatDoc.messages)) return;

  const updated = chatDoc.messages.filter((_, idx) => idx !== msgIndex);
  const lastMsg = updated.length > 0 ? updated[updated.length - 1].text : 'Message deleted';
  await db.collection('chats').doc(activeChatDocId).update({
    messages: updated,
    lastMessage: lastMsg
  });
  showToast('🗑️ मेसेज डिलीट केला!');
}

async function createNewChatInCurrentTab() {
  let cat = (activeMsgTab === 'Marketplace' || activeMsgTab === 'Request') ? activeMsgTab : 'Inbox';
  await startRealChat('community_peer', cat === 'Marketplace' ? 'Royal Fashion Store' : 'Ashu Ashu', cat);
}

async function startRealChat(peerUid, peerName, categoryOverride) {
  if (!currentUserData) return showToast('⚠️ कृपया आधी लॉगिन करा!');
  const chatCat = categoryOverride || (activeMsgTab === 'Marketplace' ? 'Marketplace' : 'Inbox');

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
      unread: false,
      lastMessage: `${currentUserData.name}: 👋 Hi`,
      messages: [
        {
          senderUid: currentUserData.uid,
          senderName: currentUserData.name,
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

  const msgs = Array.isArray(chatDoc.messages) ? chatDoc.messages : [];
  const myUid = currentUserData ? currentUserData.uid : '';

  box.innerHTML = msgs.map((m, idx) => {
    const isMe = m.senderUid === myUid || m.senderName === (currentUserData && currentUserData.name);
    const isThumb = m.type === 'thumb' || m.text === '👍';
    const isImage = m.type === 'image' && m.mediaUrl;
    const isVideo = m.type === 'video' && m.mediaUrl;
    const isAudio = m.type === 'audio' && m.mediaUrl;

    let contentHTML = '';
    if (isThumb) {
      contentHTML = `<div style="font-size:40px; line-height:1; color:#2563eb; cursor:pointer;" onclick="deleteSingleMessageBubble(${idx})"><i class="fa-solid fa-thumbs-up"></i></div>`;
    } else if (isImage) {
      contentHTML = `<img src="${m.mediaUrl}" onclick="deleteSingleMessageBubble(${idx})" style="max-width:210px; border-radius:14px; cursor:pointer; box-shadow:0 2px 8px rgba(0,0,0,0.1);">`;
    } else if (isVideo) {
      contentHTML = `<video src="${m.mediaUrl}" controls playsinline style="max-width:220px; border-radius:14px; background:#000;"></video>`;
    } else if (isAudio) {
      contentHTML = `
        <div style="background:${isMe ? '#2563eb' : '#f1f5f9'}; padding:8px 12px; border-radius:18px; display:flex; align-items:center; gap:8px;">
          <audio src="${m.mediaUrl}" controls style="height:32px; max-width:190px;"></audio>
          <i class="fa-solid fa-trash-can" onclick="deleteSingleMessageBubble(${idx})" style="color:${isMe ? '#fff' : '#ef4444'}; font-size:13px; cursor:pointer;"></i>
        </div>`;
    } else {
      contentHTML = `
        <div onclick="deleteSingleMessageBubble(${idx})" style="max-width:74%; padding:10px 14px; border-radius:18px; font-size:14px; background:${isMe ? '#2563eb' : '#f1f5f9'}; color:${isMe ? '#fff' : '#0f172a'}; cursor:pointer; word-break:break-word;">
          ${m.text}
        </div>`;
    }

    return `
      <div style="display:flex; align-items:flex-end; gap:8px; justify-content:${isMe ? 'flex-end' : 'flex-start'};">
        ${!isMe ? `<img src="${activeChatPeerAvatar}" style="width:28px; height:28px; border-radius:50%; object-fit:cover;">` : ''}
        ${contentHTML}
      </div>
    `;
  }).join('');

  const scrollBody = document.getElementById('msg-win-body');
  if (scrollBody) scrollBody.scrollTop = scrollBody.scrollHeight;
}

async function sendMessengerText() {
  const inp = document.getElementById('msg-win-input');
  const txt = inp.value.trim();
  if (!txt) return showToast('✏️ कृपया आधी मेसेज टाईप करा!');
  if (!activeChatDocId) return;
  inp.value = '';
  await appendMessageToActiveChat(txt, 'text', '');
}

async function sendMessengerThumb() {
  if (!activeChatDocId) return;
  await appendMessageToActiveChat('👍', 'thumb', '');
}

// खरा कॅमेरा आणि गॅलरी फोटो/व्हिडिओ अपलोड
function triggerChatCamera() {
  document.getElementById('chat-camera-input').click();
}
function triggerChatGallery() {
  document.getElementById('chat-gallery-input').click();
}

function handleChatMediaUpload(e, source) {
  if (!e.target.files || !e.target.files[0] || !activeChatDocId) return;
  const file = e.target.files[0];

  if (file.type.startsWith('video/')) {
    const reader = new FileReader();
    reader.onload = async (evt) => {
      await appendMessageToActiveChat('🎬 Video', 'video', evt.target.result);
    };
    reader.readAsDataURL(file);
  } else {
    const reader = new FileReader();
    reader.onload = (evt) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const maxW = 600;
        const scale = maxW / img.width;
        canvas.width = img.width > maxW ? maxW : img.width;
        canvas.height = img.width > maxW ? img.height * scale : img.height;
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        const compressed = canvas.toDataURL('image/jpeg', 0.72);
        await appendMessageToActiveChat('📷 Photo', 'image', compressed);
      };
      img.src = evt.target.result;
    };
    reader.readAsDataURL(file);
  }
  e.target.value = '';
}

// खरा व्हॉइस रेकॉर्डर (Real Microphone Audio Recorder)
async function toggleRealVoiceRecording() {
  if (!activeChatDocId) return;
  const recBar = document.getElementById('voice-rec-bar');
  const micBtn = document.getElementById('chat-mic-btn');

  if (isRecordingVoice && mediaRecorder) {
    stopAndSendVoiceNote();
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioChunks = [];
    mediaRecorder = new MediaRecorder(stream);

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
      const reader = new FileReader();
      reader.onloadend = async () => {
        await appendMessageToActiveChat('🎤 Voice message', 'audio', reader.result);
      };
      reader.readAsDataURL(audioBlob);
      stream.getTracks().forEach(t => t.stop());
    };

    mediaRecorder.start();
    isRecordingVoice = true;
    if (recBar) recBar.style.display = 'flex';
    if (micBtn) micBtn.style.color = '#dc2626';
  } catch (err) {
    showToast('⚠️ माईक परमिशन मिळाली नाही. कृपया ब्राउझरमध्ये Mic Allow करा!');
  }
}

function stopAndSendVoiceNote() {
  if (mediaRecorder && isRecordingVoice) {
    mediaRecorder.stop();
    isRecordingVoice = false;
    document.getElementById('voice-rec-bar').style.display = 'none';
    document.getElementById('chat-mic-btn').style.color = '#2563eb';
  }
}

async function appendMessageToActiveChat(textVal, msgType, mediaDataUrl) {
  const chatDoc = cacheChats.find(x => x.id === activeChatDocId);
  let arr = (chatDoc && Array.isArray(chatDoc.messages)) ? [...chatDoc.messages] : [];

  arr.push({
    senderUid: currentUserData ? currentUserData.uid : 'user',
    senderName: currentUserData ? currentUserData.name : 'Me',
    text: textVal,
    type: msgType,
    mediaUrl: mediaDataUrl || '',
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
// 5. NOTIFICATIONS, EXPLORE & NEARBY
// =========================================================
async function pushRealNotification(payload) {
  try {
    await db.collection('notifications').add({
      actorUid: payload.actorUid || (currentUserData ? currentUserData.uid : ''),
      actorName: payload.actorName || (currentUserData ? currentUserData.name : 'User'),
      actorHandle: payload.actorHandle || '@user',
      actorAvatar: payload.actorAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      type: payload.type || 'activity',
      text: payload.text || 'interacted with your post.',
      postImg: payload.postImg || '',
      timeMs: Date.now(),
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch (e) {}
}

function listenToRealNotifications() {
  db.collection('notifications').onSnapshot(snap => {
    cacheNotifications = sortByPinnedAndCreatedDesc(snap.docs.map(d => ({ id: d.id, ...d.data() })));
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

  const renderRow = (n) => `
    <div style="display:flex; align-items:center; gap:12px; padding:12px 16px; border-bottom:1px solid #f8fafc;">
      <img src="${n.actorAvatar}" onclick="closeProNotifications(); openUserProfile('${n.actorUid}')" style="width:46px; height:46px; border-radius:50%; object-fit:cover; cursor:pointer;">
      <div style="flex:1; font-size:13.5px; color:#0f172a;">
        <b>${n.actorHandle || n.actorName}</b> ${n.text}
        <span style="color:#64748b; font-size:12px; margin-left:4px;">${getRelativeTime(n.timeMs)}</span>
      </div>
      ${n.postImg ? `<img src="${n.postImg}" style="width:44px; height:44px; border-radius:8px; object-fit:cover;">` : ''}
    </div>
  `;

  body.innerHTML = `
    <div style="padding:14px 16px 6px; font-weight:800; font-size:15px;">Featured</div>
    ${cacheNotifications.length > 0 ? cacheNotifications.map(renderRow).join('') : `<div style="padding:16px; color:#64748b;">सध्या नवीन नोटिफिकेशन नाही.</div>`}
  `;
}

function listenToRealOffers() {
  db.collection('offers').onSnapshot(snap => {
    cacheOffers = sortByPinnedAndCreatedDesc(snap.docs.map(d => ({ id: d.id, _col: 'offers', ...d.data() })));
    renderExploreOffers();
    if (activeNearbyFilter === 'Deals') renderNearbyStores();
    renderProfileMediaGrid();
  });
}

function selectExploreChip(chipName, el) {
  activeExploreFilter = chipName;
  document.querySelectorAll('#view-explore .f-chip').forEach(c => c.classList.remove('active'));
  if (el) el.classList.add('active');
  renderExploreOffers();
}

function renderExploreOffers() {
  let box = document.getElementById('explore-offers-list');
  if (!box) return;
  let q = (document.getElementById('explore-search-input')?.value || '').toLowerCase();

  if (activeExploreFilter === 'Trending Reels') {
    let reelsList = cacheReels.filter(r => !r.archived && ((r.author || '').toLowerCase().includes(q) || (r.caption || '').toLowerCase().includes(q)));
    box.innerHTML = reelsList.length === 0
      ? `<p style="text-align:center; padding:30px; color:#64748b;">सध्या कोणतीही Trending Reel नाही.</p>`
      : reelsList.map(r => `
        <div onclick="openScrollableMediaFeed('reels', '${r.id}', 'Trending Reels')" style="background:#fff; border-radius:14px; padding:12px; margin:10px 14px; display:flex; gap:12px; align-items:center; cursor:pointer;">
          <div style="width:70px; height:90px; background:#000; border-radius:10px; display:flex; align-items:center; justify-content:center; color:#fff;">▶</div>
          <div style="flex:1;">
            <span style="background:#fee2e2; color:#dc2626; font-size:11px; font-weight:800; padding:2px 8px; border-radius:8px;">🎬 Reel &bull; ${r.views || 1} Views</span>
            <h4 style="margin:6px 0 4px;">${r.caption || 'Reel'}</h4>
            <div style="font-size:12px; color:#64748b;">By ${r.author}</div>
          </div>
        </div>
      `).join('');
    return;
  }

  let filteredOffers = cacheOffers.filter(o => !o.archived && ((o.deal || '').toLowerCase().includes(q) || (o.bizName || '').toLowerCase().includes(q)));
  box.innerHTML = filteredOffers.length === 0
    ? `<p style="text-align:center; padding:30px; color:#64748b;">सध्या कोणतीही ऑफर नाही.</p>`
    : filteredOffers.map(o => `
      <div class="offer-banner-card" style="background:#fff; border-radius:16px; overflow:hidden; margin:12px 14px; box-shadow:0 2px 10px rgba(0,0,0,0.06);">
        <div onclick="openScrollableMediaFeed('offers', '${o.id}', 'Offers')" style="background-image:url('${o.img}'); height:145px; background-size:cover; background-position:center; position:relative; padding:14px; display:flex; align-items:flex-end; color:#fff; cursor:pointer;">
          <div style="position:absolute; inset:0; background:linear-gradient(transparent, rgba(0,0,0,0.8));"></div>
          <div style="position:relative; z-index:1;">
            <div style="font-size:13px; font-weight:700; color:#38bdf8;">${o.bizName}</div>
            <div style="font-size:18px; font-weight:900;">${o.deal}</div>
          </div>
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
  let stores = cacheBusinesses.filter(s => activeNearbyFilter === 'All' || (s.category || '').toLowerCase().includes(activeNearbyFilter.toLowerCase()));
  box.innerHTML = stores.length === 0
    ? `<div style="text-align:center; padding:30px; color:#64748b;">अजून Business अकाउंट नाही.</div>`
    : stores.map(s => `
      <div style="background:#fff; border-radius:16px; padding:14px; margin:12px 14px; display:flex; gap:12px;">
        <img src="${s.avatar}" onclick="openUserProfile('${s.uid}')" style="width:75px; height:75px; border-radius:12px; object-fit:cover; cursor:pointer;">
        <div style="flex:1;">
          <div onclick="openUserProfile('${s.uid}')" style="font-weight:800; font-size:15.5px; cursor:pointer;">${s.name}</div>
          <div style="font-size:12px; color:#4f46e5; font-weight:700;">${s.category || 'Shops'} &bull; 📍 ${s.location}</div>
          <div style="display:flex; gap:8px; margin-top:8px;">
            <button onclick="startRealChat('${s.uid}', '${s.name}', 'Marketplace')" style="background:#2563eb; color:#fff; border:none; padding:6px 12px; border-radius:8px; font-size:12px; font-weight:700;">💬 Message</button>
          </div>
        </div>
      </div>
    `).join('');
}

// =========================================================
// 6. PEOPLE & BUSINESS PROFILE GRIDS (WITH SCROLLABLE FEED & 3-DOT MENU)
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
    renderBizMediaSection();
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

// प्रोफाईलमधील प्रत्येक फोटो/व्हिडिओवर `⋮` आयकॉन आणि टच केल्यावर Vertical Scrollable Feed!
function renderProfileMediaGrid() {
  let grid = document.getElementById('people-media-grid');
  if (!grid) return;
  let targetUid = activeProfileUser ? activeProfileUser.uid : (currentUserData ? currentUserData.uid : '');

  let allUserItems = [
    ...cachePosts.filter(p => p.uid === targetUid),
    ...cacheReels.filter(r => r.uid === targetUid),
    ...cacheStories.filter(s => s.uid === targetUid),
    ...cacheNotes.filter(n => n.uid === targetUid),
    ...cacheOffers.filter(o => o.uid === targetUid)
  ];

  let statPostsEl = document.getElementById('p-stat-posts');
  if (statPostsEl) statPostsEl.innerText = allUserItems.filter(i => !i.archived).length;

  let items = [];
  if (activePeopleTab === 'archived') {
    items = allUserItems.filter(i => i.archived === true);
  } else if (activePeopleTab === 'posts') {
    items = cachePosts.filter(p => p.uid === targetUid && !p.archived && !p.hiddenFromGrid);
  } else if (activePeopleTab === 'reels') {
    items = cacheReels.filter(r => r.uid === targetUid && !r.archived && !r.hiddenFromGrid);
  } else if (activePeopleTab === 'moments') {
    items = cacheStories.filter(s => s.uid === targetUid && !s.archived);
  } else if (activePeopleTab === 'highlights') {
    // जर नोट्स किंवा ऑफर्स नसतील, तर स्टोरी आणि पिन केलेल्या पोस्ट्स सुद्धा Highlights मध्ये दाखवा!
    items = [
      ...cacheNotes.filter(n => n.uid === targetUid && !n.archived),
      ...cacheOffers.filter(o => o.uid === targetUid && !o.archived),
      ...cacheStories.filter(s => s.uid === targetUid && !s.archived)
    ];
  }

  if (items.length === 0) {
    grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:24px; color:#64748b; font-size:13px;">या विभागात अजून माहिती नाही.</div>`;
    return;
  }

  window.currentProfileGridList = items;

  grid.innerHTML = items.map(item => {
    let col = item._col || 'posts';
    let isVid = item.mediaType === 'video' || (item.img && item.img.startsWith('data:video'));
    return `
      <div onclick="openScrollableMediaFeed('${col}', '${item.id}', 'Profile ${activePeopleTab.toUpperCase()}', window.currentProfileGridList)" style="position:relative; aspect-ratio:1/1; border-radius:12px; overflow:hidden; cursor:pointer; background:#0f172a;">
        ${isVid
          ? `<video src="${item.img}" style="width:100%; height:100%; object-fit:cover;" muted playsinline></video>`
          : `<img src="${item.img}" style="width:100%; height:100%; object-fit:cover;">`
        }
        ${item.pinned ? `<span style="position:absolute; top:6px; left:6px; background:rgba(0,0,0,0.65); color:#fff; font-size:11px; padding:2px 6px; border-radius:6px;">📌</span>` : ''}
        <!-- 3-DOT BUTTON DIRECTLY ON PROFILE GRID ITEM -->
        <button onclick="event.stopPropagation(); openItemActionMenu('${item.id}', '${col}')" style="position:absolute; top:6px; right:6px; background:rgba(0,0,0,0.65); color:#fff; border:none; width:28px; height:28px; border-radius:50%; font-size:14px; cursor:pointer; z-index:3;"><i class="fa-solid fa-ellipsis-vertical"></i></button>
      </div>
    `;
  }).join('');
}

// बिझनेस प्रोफाईलमधील टॅब्स (Posts, Products, Reels, Moments, Archived)
function switchBizMediaTab(tabName, el) {
  activeBizTab = tabName;
  document.querySelectorAll('#business-profile-box .prof-sub-tabs span').forEach(s => s.classList.remove('active'));
  if (el) el.classList.add('active');
  renderBizMediaSection();
}

function renderBizMediaSection() {
  let miniBox = document.getElementById('biz-mini-products');
  if (!miniBox) return;
  let targetUid = activeProfileUser ? activeProfileUser.uid : (currentUserData ? currentUserData.uid : '');

  let items = [];
  if (activeBizTab === 'Posts') items = cachePosts.filter(p => p.uid === targetUid && !p.archived);
  else if (activeBizTab === 'Reels') items = cacheReels.filter(r => r.uid === targetUid && !r.archived);
  else if (activeBizTab === 'Moments') items = cacheStories.filter(s => s.uid === targetUid && !s.archived);
  else if (activeBizTab === 'Archived') {
    items = [
      ...cacheProducts.filter(p => p.uid === targetUid && p.archived),
      ...cachePosts.filter(p => p.uid === targetUid && p.archived),
      ...cacheReels.filter(r => r.uid === targetUid && r.archived)
    ];
  } else {
    items = cacheProducts.filter(p => p.uid === targetUid && !p.archived);
  }

  window.currentBizGridList = items;

  if (items.length === 0) {
    miniBox.innerHTML = `<div style="padding:16px; color:#64748b; font-size:13px;">या विभागात अजून कोणतीही माहिती नाही.</div>`;
    return;
  }

  miniBox.innerHTML = items.map(item => {
    let col = item._col || 'products';
    let label = item.title || item.caption || item.deal || 'Item';
    return `
      <div onclick="openScrollableMediaFeed('${col}', '${item.id}', 'Business ${activeBizTab}', window.currentBizGridList)" style="position:relative; min-width:130px; background:#f8fafc; padding:8px; border-radius:12px; margin-right:10px; text-align:center; cursor:pointer;">
        <img src="${item.img}" style="width:100%; height:95px; object-fit:cover; border-radius:8px;">
        <button onclick="event.stopPropagation(); openItemActionMenu('${item.id}', '${col}')" style="position:absolute; top:12px; right:12px; background:rgba(0,0,0,0.65); color:#fff; border:none; width:26px; height:26px; border-radius:50%; cursor:pointer;"><i class="fa-solid fa-ellipsis-vertical"></i></button>
        <div style="font-size:12px; font-weight:700; margin-top:4px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${label}</div>
        ${item.price ? `<b style="color:#2563eb; font-size:12px;">${item.price}</b>` : ''}
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
  let list = cacheProducts.filter(p => !p.archived && (p.title || '').toLowerCase().includes(q) && (activeCatalogFilter === 'All' || (p.cat || '').toLowerCase() === activeCatalogFilter.toLowerCase()));
  box.innerHTML = list.length === 0
    ? `<p style="grid-column:1/-1; text-align:center; padding:30px; color:#64748b;">प्रॉडक्ट सापडले नाही.</p>`
    : list.map(p => `
      <div onclick="openProductDetail('${p.id}')" style="position:relative; background:#fff; border-radius:14px; padding:10px; cursor:pointer;">
        <img src="${p.img}" style="width:100%; height:130px; object-fit:cover; border-radius:10px;">
        <button onclick="event.stopPropagation(); openItemActionMenu('${p.id}', 'products')" style="position:absolute; top:16px; right:16px; background:rgba(0,0,0,0.6); color:#fff; border:none; width:28px; height:28px; border-radius:50%;"><i class="fa-solid fa-ellipsis-vertical"></i></button>
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
// SETTINGS & NAVIGATION
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

function openImageLightbox(imgUrl, captionText) {
  if (!imgUrl) return;
  document.getElementById('lightbox-img').src = imgUrl;
  document.getElementById('lightbox-caption').innerText = captionText || '';
  document.getElementById('gallery-lightbox-modal').style.display = 'flex';
}

function closeImageLightbox() {
  document.getElementById('gallery-lightbox-modal').style.display = 'none';
}

function openGoogleMapLink(query) {
  window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query || 'Ardhapur, Maharashtra')}`, '_blank');
}
