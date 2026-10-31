// =========================================================
// ALBIZNET - CLEAN, COMPACT & SUPERFAST ENGINE v7.0 (app.js)
// Progressive Fast Reels Loader | Business-Only Marketplace |
// Auto-Login | Real Interactive Notifications | Universal Search
// =========================================================

let auth = null, db = null, storage = null;
let currentUserData = null, activeProfileUser = null;
let authAccountType = 'people', currentCreateMode = 'Post';
let uploadedDataURL = '', uploadedRawFile = null, uploadedMediaType = 'image';

let activeExploreFilter = 'Offers', activeNearbyFilter = 'All';
let activePeopleTab = 'posts', activeBizTab = 'Products', activeMsgTab = 'Inbox', activeCatalogFilter = 'All';

let activeChatDocId = null, activeChatPeerName = '', activeChatPeerAvatar = '', activeChatPeerUid = '';
let activeCommentPostId = null, activeCommentCollection = 'posts';
let chatLongPressTimer = null, selectedChatForMenu = null;
let activeMenuTarget = { id: null, col: 'posts', context: 'profile_owner' };
let autoScrollReelsEnabled = false, activeHomeAccountFilter = 'all';

let mediaRecorder = null, audioChunks = [], isRecordingVoice = false;

let cachePosts = [], cacheReels = [], cacheStories = [], cacheNotes = [];
let cacheOffers = [], cacheProducts = [], cacheAllUsers = [], cacheBusinesses = [];
let cacheChats = [], cacheNotifications = [];
const resolvedChunkMediaCache = {};
const ALBIZNET_SESSION_KEY = 'albiznet_logged_user_v1';

// 0. INSTANT AUTO-LOGIN ON MOBILE BOOT
(function instantBootSavedUser() {
  try {
    const saved = localStorage.getItem(ALBIZNET_SESSION_KEY);
    if (saved) {
      const u = JSON.parse(saved);
      if (u && u.uid) {
        currentUserData = u;
        activeProfileUser = u;
        const showApp = () => {
          const w = document.getElementById('welcome-screen'), a = document.getElementById('auth-screen'), m = document.getElementById('main-app-shell');
          if (w) w.style.display = 'none';
          if (a) a.style.display = 'none';
          if (m) m.style.display = 'block';
        };
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', showApp);
        else showApp();
      }
    }
  } catch (e) {}
})();

function loadScript(src) {
  return new Promise((res, rej) => {
    if (document.querySelector(`script[src="${src}"]`)) return res();
    const s = document.createElement('script');
    s.src = src; s.onload = res; s.onerror = rej;
    document.head.appendChild(s);
  });
}

function showToast(msg) {
  const t = document.getElementById('custom-toast');
  if (!t) return;
  t.innerHTML = msg; t.style.display = 'block';
  setTimeout(() => { t.style.display = 'none'; }, 3000);
}

async function initRealFirebaseApp() {
  try {
    injectProModalsIntoDOM();
    setupVideoFileInput();
    upgradeBusinessProfileTabs();
    setupGlobalOutsideClickForCreateMenu();
    bindAllSearchInputsLive();

    if (typeof firebase === 'undefined') {
      await loadScript('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
      await loadScript('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth-compat.js');
      await loadScript('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore-compat.js');
      await loadScript('https://www.gstatic.com/firebasejs/10.12.0/firebase-storage-compat.js').catch(() => {});
    }

    let config = null;
    try { config = JSON.parse(localStorage.getItem('albiznet_fb_config_cache')); } catch (e) {}
    if (!config || !config.apiKey) {
      const res = await fetch('/api/config');
      const data = await res.json();
      config = typeof data === 'string' ? JSON.parse(data) : data;
      if (config && config.apiKey) localStorage.setItem('albiznet_fb_config_cache', JSON.stringify(config));
    }

    if (!firebase.apps.length) firebase.initializeApp(config);
    auth = firebase.auth();
    db = firebase.firestore();
    if (firebase.storage) { try { storage = firebase.storage(); } catch (e) {} }
    if (firebase.auth.Auth?.Persistence) await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(() => {});

    setupNotificationBell();

    auth.onAuthStateChanged(async (user) => {
      if (user) {
        const docRef = db.collection('users').doc(user.uid);
        const snap = await docRef.get();
        if (snap.exists) {
          currentUserData = { uid: user.uid, ...snap.data() };
        } else {
          let fbName = user.displayName || (user.email ? user.email.split('@')[0] : 'ALBIZNET User');
          currentUserData = {
            uid: user.uid, type: authAccountType || 'people', name: fbName,
            handle: '@' + fbName.toLowerCase().replace(/\s+/g, ''),
            category: authAccountType === 'business' ? 'Shops' : 'Personal Account',
            about: `Hi! I'm ${fbName} on ALBIZNET.`, location: 'Ardhapur, Maharashtra',
            phone: user.phoneNumber || '', email: user.email || '',
            avatar: user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(fbName)}&background=4f46e5&color=fff&bold=true`,
            followersCount: 0, followingCount: 0, postsCount: 0,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          };
          await docRef.set(currentUserData);
        }
        localStorage.setItem(ALBIZNET_SESSION_KEY, JSON.stringify(currentUserData));
        launchMainApp();
      } else if (!localStorage.getItem(ALBIZNET_SESSION_KEY)) {
        document.getElementById('main-app-shell').style.display = 'none';
        document.getElementById('auth-screen').style.display = 'none';
        document.getElementById('welcome-screen').style.display = 'flex';
      } else {
        launchMainApp();
      }
    });
  } catch (err) { console.error('Init Error:', err); }
}

document.addEventListener('DOMContentLoaded', initRealFirebaseApp);

function isUserBusinessAccount(u) {
  if (!u) return false;
  if (u.type === 'business') return true;
  const c = (u.category || '').toLowerCase();
  return c === 'shops' || c === 'services' || c === 'restaurants' || c.includes('shop') || c.includes('store') || c.includes('business');
}

function syncMarketplaceTabVisibility() {
  const isBiz = isUserBusinessAccount(currentUserData);
  document.querySelectorAll('#view-messages .m-tab').forEach(tab => {
    if ((tab.textContent || '').trim() === 'Marketplace') {
      tab.style.display = isBiz ? 'inline-block' : 'none';
    }
  });
  if (!isBiz && activeMsgTab === 'Marketplace') activeMsgTab = 'Inbox';
}

function setupGlobalOutsideClickForCreateMenu() {
  const closeMenu = (e) => {
    const m = document.getElementById('create-dropdown-menu'), b = document.querySelector('.header-create-btn');
    if (!m || m.style.display !== 'block') return;
    if (m.contains(e.target) || (b && b.contains(e.target))) return;
    m.style.display = 'none';
  };
  document.addEventListener('click', closeMenu);
  document.addEventListener('touchstart', closeMenu, { passive: true });
}

function setupVideoFileInput() {
  const f = document.querySelector('#create-content-modal input[type="file"]');
  if (f) { f.id = 'cr-file-input'; f.setAttribute('accept', 'image/*,video/*'); }
}

function upgradeBusinessProfileTabs() {
  const b = document.querySelector('#business-profile-box .prof-sub-tabs');
  if (b) {
    b.innerHTML = `<span onclick="switchBizMediaTab('Posts', this)">Posts</span><span class="active" onclick="switchBizMediaTab('Products', this)">Products</span><span onclick="switchBizMediaTab('Reels', this)">Reels</span><span onclick="switchBizMediaTab('Moments', this)">Moments</span><span id="biz-archived-tab-btn" onclick="switchBizMediaTab('Archived', this)">Archived</span>`;
  }
  const p = document.getElementById('people-sub-tabs');
  if (p && !document.getElementById('people-archived-tab-btn')) {
    const s = document.createElement('span');
    s.id = 'people-archived-tab-btn'; s.innerText = 'Archived';
    s.onclick = function() { switchPeopleMediaTab('archived', this); };
    p.appendChild(s);
  }
}

// =========================================================
// DYNAMIC MODALS INJECTOR
// =========================================================
function injectProModalsIntoDOM() {
  if (document.getElementById('pro-messenger-modal')) return;
  const st = document.createElement('style');
  st.innerHTML = `#pro-scroll-feed-body{scroll-snap-type:y mandatory!important;overflow-y:scroll!important;height:100dvh!important;-webkit-overflow-scrolling:touch!important;overscroll-behavior-y:contain!important;scrollbar-width:none}#pro-scroll-feed-body::-webkit-scrollbar{display:none}.scroll-snap-slide{height:100dvh!important;min-height:100dvh!important;max-height:100dvh!important;width:100%!important;scroll-snap-align:start!important;scroll-snap-stop:always!important;position:relative;flex-shrink:0}`;
  document.head.appendChild(st);

  const w = document.createElement('div');
  w.innerHTML = `
    <input type="file" id="chat-camera-input" accept="image/*,video/*" capture="environment" style="display:none;" onchange="handleChatMediaUpload(event)">
    <input type="file" id="chat-gallery-input" accept="image/*,video/*" style="display:none;" onchange="handleChatMediaUpload(event)">

    <div id="pro-upload-progress-Banner" style="display:none; position:fixed; top:12px; left:14px; right:14px; background:#0f172a; color:#fff; padding:12px 16px; border-radius:16px; z-index:9500; box-shadow:0 8px 25px rgba(0,0,0,0.35); font-family:'Poppins',sans-serif; align-items:center; gap:12px;">
      <i class="fa-solid fa-cloud-arrow-up fa-bounce" style="color:#38bdf8; font-size:20px;"></i>
      <div style="flex:1;">
        <div style="display:flex; justify-content:space-between; font-size:13px; font-weight:700; margin-bottom:6px;"><span id="up-prog-title">Uploading...</span><span id="up-prog-pct" style="color:#38bdf8;">10%</span></div>
        <div style="width:100%; height:6px; background:#334155; border-radius:10px; overflow:hidden;"><div id="up-prog-bar" style="width:10%; height:100%; background:linear-gradient(90deg,#38bdf8,#6366f1); transition:width 0.25s;"></div></div>
      </div>
    </div>

    <div id="pro-messenger-modal" style="display:none; position:fixed; inset:0; background:#fff; z-index:6000; flex-direction:column; font-family:'Poppins',sans-serif;">
      <div style="display:flex; align-items:center; justify-content:space-between; padding:10px 14px; border-bottom:1px solid #f1f5f9;">
        <div style="display:flex; align-items:center; gap:10px; min-width:0;">
          <button onclick="closeMessengerChat()" style="background:none; border:none; font-size:20px; color:#2563eb; cursor:pointer;"><i class="fa-solid fa-arrow-left"></i></button>
          <img id="msg-win-top-avatar" src="" style="width:38px; height:38px; border-radius:50%; object-fit:cover;">
          <div><div id="msg-win-top-name" style="font-weight:800; font-size:14.5px; color:#0f172a;">User</div><div style="font-size:11px; color:#16a34a; font-weight:600;">● Active now</div></div>
        </div>
        <div style="display:flex; align-items:center; gap:16px; color:#2563eb; font-size:19px;">
          <i class="fa-solid fa-phone" onclick="showToast('📞 व्हॉइस कॉल...')"></i>
          <i class="fa-solid fa-video" onclick="showToast('📹 व्हिडिओ कॉल...')"></i>
          <i class="fa-solid fa-trash-can" style="color:#ef4444;" onclick="deleteEntireActiveChat()"></i>
        </div>
      </div>
      <div id="msg-win-body" style="flex:1; overflow-y:auto; padding:14px; display:flex; flex-direction:column; gap:10px;">
        <div style="text-align:center; padding:12px;"><img id="msg-win-center-avatar" src="" style="width:76px; height:76px; border-radius:50%; object-fit:cover;"><h3 id="msg-win-center-name" style="margin:6px 0;">User</h3><button onclick="closeMessengerChat(); openUserProfile(activeChatPeerUid);" style="background:#f1f5f9; border:none; padding:6px 14px; border-radius:20px; font-weight:700; font-size:12px;">View profile</button></div>
        <div id="msg-win-bubbles" style="display:flex; flex-direction:column; gap:10px;"></div>
      </div>
      <div id="voice-rec-bar" style="display:none; background:#fef2f2; color:#dc2626; padding:8px 16px; font-size:12.5px; font-weight:700; align-items:center; justify-content:space-between;"><span>🔴 आवाज रेकॉर्ड होत आहे...</span><button onclick="stopAndSendVoiceNote()" style="background:#dc2626; color:#fff; border:none; padding:5px 14px; border-radius:12px; font-weight:700;">Send Voice</button></div>
      <div style="display:flex; align-items:center; gap:8px; padding:8px 10px; border-top:1px solid #f1f5f9;">
        <button onclick="document.getElementById('chat-camera-input').click()" style="background:none; border:none; color:#2563eb; font-size:20px;"><i class="fa-solid fa-camera"></i></button>
        <button onclick="document.getElementById('chat-gallery-input').click()" style="background:none; border:none; color:#2563eb; font-size:20px;"><i class="fa-regular fa-image"></i></button>
        <button id="chat-mic-btn" onclick="toggleRealVoiceRecording()" style="background:none; border:none; color:#2563eb; font-size:20px;"><i class="fa-solid fa-microphone"></i></button>
        <div style="flex:1; display:flex; align-items:center; background:#f1f5f9; border-radius:24px; padding:7px 12px;"><input type="text" id="msg-win-input" placeholder="Message..." style="flex:1; border:none; background:transparent; outline:none; font-size:14px;" onkeypress="if(event.key==='Enter') sendMessengerText()"></div>
        <button onclick="sendMessengerText()" style="background:#2563eb; color:#fff; border:none; width:38px; height:38px; border-radius:50%;"><i class="fa-solid fa-paper-plane"></i></button>
        <button onclick="sendMessengerThumb()" style="background:none; border:none; color:#2563eb; font-size:22px;"><i class="fa-solid fa-thumbs-up"></i></button>
      </div>
    </div>

    <div id="pro-chat-longpress-modal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.6); z-index:7200; align-items:flex-end; justify-content:center; font-family:'Poppins',sans-serif;" onclick="closeChatLongPressMenu()">
      <div style="background:#fff; width:100%; max-width:480px; border-radius:24px 24px 0 0; padding:12px 0 24px;" onclick="event.stopPropagation()">
        <div style="width:42px; height:4px; background:#cbd5e1; border-radius:4px; margin:4px auto 12px;"></div>
        <div id="lp-chat-title" style="padding:4px 24px 12px; font-weight:800; font-size:16px; border-bottom:1px solid #f1f5f9;">Chat Options</div>
        <div style="display:flex; flex-direction:column; font-size:15px; font-weight:500;">
          <div onclick="handleChatLongPressAction('reminder')" style="padding:12px 24px; cursor:pointer;"><i class="fa-regular fa-bell" style="width:26px; color:#2563eb;"></i> Set Reminder</div>
          <div onclick="handleChatLongPressAction('toggle_read')" style="padding:12px 24px; cursor:pointer;"><i class="fa-regular fa-envelope-open" style="width:26px;"></i> Mark as Read / Unread</div>
          <div onclick="handleChatLongPressAction('pin')" style="padding:12px 24px; cursor:pointer;"><i class="fa-solid fa-thumbtack" style="width:26px;"></i> Pin / Unpin Chat</div>
          <div onclick="handleChatLongPressAction('mute')" style="padding:12px 24px; cursor:pointer;"><i class="fa-regular fa-bell-slash" style="width:26px;"></i> Mute Notifications</div>
          <div onclick="handleChatLongPressAction('clear')" style="padding:12px 24px; cursor:pointer; color:#f59e0b;"><i class="fa-solid fa-broom" style="width:26px;"></i> Clear All Messages</div>
          <div onclick="handleChatLongPressAction('delete')" style="padding:12px 24px; cursor:pointer; color:#dc2626; font-weight:700; border-top:1px solid #f1f5f9;"><i class="fa-regular fa-trash-can" style="width:26px;"></i> Delete Entire Chat</div>
        </div>
      </div>
    </div>

    <div id="pro-scroll-feed-modal" style="display:none; position:fixed; inset:0; background:#000; z-index:6200; flex-direction:column; font-family:'Poppins',sans-serif;">
      <div style="position:fixed; top:0; left:0; right:0; z-index:6210; display:flex; align-items:center; gap:14px; padding:14px 16px; background:linear-gradient(rgba(0,0,0,0.75),transparent); color:#fff;">
        <button onclick="closeScrollableFeedModal()" style="background:rgba(0,0,0,0.4); border:none; color:#fff; width:38px; height:38px; border-radius:50%; font-size:20px;"><i class="fa-solid fa-arrow-left"></i></button>
        <span id="scroll-feed-header-title" style="font-weight:800; font-size:18px;">Reels</span>
      </div>
      <div id="pro-scroll-feed-body" style="flex:1; width:100%; display:flex; flex-direction:column;"></div>
    </div>

    <div id="pro-other-user-menu-modal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.6); z-index:6900; align-items:flex-end; justify-content:center; font-family:'Poppins',sans-serif;" onclick="closeAllActionMenus()">
      <div style="background:#fff; width:100%; max-width:480px; border-radius:24px 24px 0 0; padding:12px 0 24px;" onclick="event.stopPropagation()">
        <div style="display:flex; flex-direction:column; font-size:15.5px;">
          <div onclick="handleOtherProfileMenuAction('restrict')" style="padding:12px 24px;">Restrict</div>
          <div onclick="handleOtherProfileMenuAction('block')" style="padding:12px 24px;">Block</div>
          <div onclick="handleOtherProfileMenuAction('report')" style="padding:12px 24px; color:#dc2626; font-weight:600;">Report</div>
          <div onclick="handleOtherProfileMenuAction('about')" style="padding:12px 24px;">About this account</div>
          <div onclick="handleOtherProfileMenuAction('copy_url')" style="padding:12px 24px;">Copy profile URL</div>
          <div onclick="handleOtherProfileMenuAction('share_profile')" style="padding:12px 24px;">Share this profile</div>
        </div>
      </div>
    </div>

    <div id="pro-reel-public-menu-modal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.6); z-index:6800; align-items:flex-end; justify-content:center; font-family:'Poppins',sans-serif;" onclick="closeAllActionMenus()">
      <div style="background:#fff; width:100%; max-width:480px; border-radius:24px 24px 0 0; padding:14px 0 24px;" onclick="event.stopPropagation()">
        <div style="display:flex; flex-direction:column; font-size:15px; font-weight:500;">
          <div onclick="handlePublicReelAction('save')" style="padding:12px 24px;"><i class="fa-regular fa-bookmark" style="width:26px;"></i> Save</div>
          <div onclick="handlePublicReelAction('remix')" style="padding:12px 24px;"><i class="fa-solid fa-repeat" style="width:26px;"></i> Remix</div>
          <div onclick="toggleReelAutoScroll()" style="padding:12px 24px;"><i class="fa-solid fa-rotate-right" style="width:26px;"></i> Toggle Auto Scroll</div>
          <div onclick="handlePublicReelAction('interested')" style="padding:12px 24px;"><i class="fa-regular fa-eye" style="width:26px;"></i> Interested</div>
          <div onclick="handlePublicReelAction('not_interested')" style="padding:12px 24px;"><i class="fa-regular fa-eye-slash" style="width:26px;"></i> Not interested</div>
          <div onclick="handlePublicReelAction('report')" style="padding:12px 24px; color:#dc2626; font-weight:700;"><i class="fa-solid fa-circle-exclamation" style="width:26px;"></i> Report</div>
        </div>
      </div>
    </div>

    <div id="pro-ig-action-modal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.6); z-index:6800; align-items:flex-end; justify-content:center; font-family:'Poppins',sans-serif;" onclick="closeAllActionMenus()">
      <div style="background:#fff; width:100%; max-width:480px; border-radius:24px 24px 0 0; padding:14px 0 24px;" onclick="event.stopPropagation()">
        <div style="display:flex; flex-direction:column; font-size:15px; font-weight:500;">
          <div onclick="handleIGMenuAction('archive')" style="padding:12px 24px;"><i class="fa-solid fa-clock-rotate-left" style="width:26px;"></i> <span id="ig-txt-archive">Archive</span></div>
          <div onclick="handleIGMenuAction('hideLikes')" style="padding:12px 24px;"><i class="fa-regular fa-heart" style="width:26px;"></i> <span id="ig-txt-likes">Hide like count</span></div>
          <div onclick="handleIGMenuAction('turnOffComments')" style="padding:12px 24px;"><i class="fa-regular fa-comment-slash" style="width:26px;"></i> <span id="ig-txt-comments">Turn off commenting</span></div>
          <div onclick="handleIGMenuAction('edit')" style="padding:12px 24px;"><i class="fa-solid fa-pen" style="width:26px;"></i> Edit</div>
          <div onclick="handleIGMenuAction('pin')" style="padding:12px 24px;"><i class="fa-solid fa-thumbtack" style="width:26px;"></i> <span id="ig-txt-pin">Pin to main grid</span></div>
          <div onclick="handleIGMenuAction('delete')" style="padding:12px 24px; color:#dc2626; font-weight:700; border-top:1px solid #f1f5f9;"><i class="fa-regular fa-trash-can" style="width:26px;"></i> Delete</div>
        </div>
      </div>
    </div>

    <div id="pro-notifications-modal" style="display:none; position:fixed; inset:0; background:#fff; z-index:5800; flex-direction:column; font-family:'Poppins',sans-serif;">
      <div style="display:flex; align-items:center; justify-content:space-between; padding:14px 16px; border-bottom:1px solid #f1f5f9;">
        <div style="display:flex; align-items:center; gap:14px;"><button onclick="closeProNotifications()" style="background:none; border:none; font-size:20px;"><i class="fa-solid fa-arrow-left"></i></button><h3 style="margin:0; font-size:19px; font-weight:800;">Notifications</h3></div>
        <span style="color:#dc2626; font-weight:700; font-size:13px; cursor:pointer;" onclick="clearMyNotifications()">Clear All</span>
      </div>
      <div id="pro-notif-list-body" style="flex:1; overflow-y:auto; padding-bottom:30px;"></div>
    </div>

    <div id="pro-comments-modal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.55); z-index:6500; align-items:flex-end; justify-content:center; font-family:'Poppins',sans-serif;" onclick="closeCommentsModal()">
      <div style="background:#fff; width:100%; max-width:480px; height:72vh; border-radius:22px 22px 0 0; display:flex; flex-direction:column;" onclick="event.stopPropagation()">
        <div style="padding:12px 16px; border-bottom:1px solid #f1f5f9; display:flex; justify-content:space-between; align-items:center;"><h4 style="margin:0; font-size:15px; font-weight:800;">Comments</h4><button onclick="closeCommentsModal()" style="border:none; background:#f1f5f9; width:30px; height:30px; border-radius:50%;">✕</button></div>
        <div id="pro-comments-list" style="flex:1; overflow-y:auto; padding:14px;"></div>
        <div style="display:flex; align-items:center; gap:10px; padding:10px 14px; border-top:1px solid #f1f5f9;">
          <img id="cmt-my-avatar" src="https://ui-avatars.com/api/?name=U" style="width:36px; height:36px; border-radius:50%; object-fit:cover;">
          <input type="text" id="pro-comment-input" placeholder="Add a comment... (use @handle to mention)" style="flex:1; border:1px solid #e2e8f0; border-radius:22px; padding:9px 14px; font-size:13.5px; outline:none;" onkeypress="if(event.key==='Enter') submitRealComment()">
          <button onclick="submitRealComment()" style="background:#2563eb; color:#fff; border:none; padding:9px 16px; border-radius:20px; font-weight:700;">Post</button>
        </div>
      </div>
    </div>

    <div id="pro-home-search-modal" style="display:none; position:fixed; inset:0; background:#f8fafc; z-index:7500; flex-direction:column; font-family:'Poppins',sans-serif;">
      <div style="display:flex; align-items:center; gap:10px; padding:12px 14px; background:#fff; border-bottom:1px solid #e2e8f0;">
        <button onclick="closeHomeAccountSearchModal()" style="background:none; border:none; font-size:20px;"><i class="fa-solid fa-arrow-left"></i></button>
        <div style="flex:1; display:flex; align-items:center; background:#f1f5f9; border-radius:24px; padding:8px 14px;">
          <i class="fa-solid fa-magnifying-glass" style="color:#64748b; margin-right:8px;"></i>
          <input type="text" id="home-acc-search-input" placeholder="Search People or Business accounts..." style="flex:1; border:none; background:transparent; outline:none; font-size:14px;" oninput="renderHomeAccountSearchResults()">
          <i class="fa-solid fa-xmark" style="color:#64748b; cursor:pointer;" onclick="document.getElementById('home-acc-search-input').value=''; renderHomeAccountSearchResults();"></i>
        </div>
      </div>
      <div style="display:flex; gap:8px; padding:10px 14px; background:#fff; border-bottom:1px solid #f1f5f9;">
        <button id="h-tab-all" onclick="setHomeSearchTab('all')" style="padding:6px 16px; border-radius:20px; border:none; font-weight:700; font-size:12.5px; background:#4f46e5; color:#fff;">All Accounts</button>
        <button id="h-tab-people" onclick="setHomeSearchTab('people')" style="padding:6px 16px; border-radius:20px; border:none; font-weight:700; font-size:12.5px; background:#f1f5f9; color:#334155;">👤 People</button>
        <button id="h-tab-business" onclick="setHomeSearchTab('business')" style="padding:6px 16px; border-radius:20px; border:none; font-weight:700; font-size:12.5px; background:#f1f5f9; color:#334155;">🏪 Business</button>
      </div>
      <div id="home-acc-search-results" style="flex:1; overflow-y:auto; padding:12px 14px;"></div>
    </div>
  `;
  document.body.appendChild(w);
}

// =========================================================
// 1. AUTHENTICATION
// =========================================================
function openNeonSignupScreen() { document.getElementById('welcome-screen').style.display = 'none'; document.getElementById('auth-screen').style.display = 'block'; }
function backToWelcomeScreen() { document.getElementById('auth-screen').style.display = 'none'; document.getElementById('welcome-screen').style.display = 'flex'; }
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

function switchVerifyTab(m) {
  let isMob = (m === 'mobile');
  document.getElementById('tab-ver-mobile').classList.toggle('active', isMob);
  document.getElementById('tab-ver-email').classList.toggle('active', !isMob);
  document.getElementById('ver-mobile-box').style.display = isMob ? 'flex' : 'none';
  document.getElementById('ver-email-box').style.display = isMob ? 'none' : 'flex';
}

function togglePassVis(id, el) {
  let i = document.getElementById(id);
  i.type = (i.type === 'password') ? 'text' : 'password';
  el.className = (i.type === 'password') ? 'fa-regular fa-eye-slash pass-eye' : 'fa-regular fa-eye pass-eye';
}

function triggerAuthOTP() { let c = Math.floor(1000 + Math.random() * 9000); document.getElementById('reg-otp').value = c; showToast(`🔐 OTP: <b>${c}</b>`); }
function sendQuickLoginOTP() { let c = Math.floor(100000 + Math.random() * 900000); document.getElementById('login-pass-input').value = c; showToast(`📱 OTP: <b>${c}</b>`); }

function detectUserGPS(id) {
  let inp = document.getElementById(id); inp.value = '📡 GPS शोधत आहे...';
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        let r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`);
        let d = await r.json();
        inp.value = `${d.address.city || d.address.town || d.address.village || 'Ardhapur'}, ${d.address.state || 'Maharashtra'}`;
      } catch (e) { inp.value = 'Ardhapur, Maharashtra'; }
    }, () => { inp.value = 'Ardhapur, Maharashtra'; });
  }
}

async function submitRegistration() {
  if (!auth) await initRealFirebaseApp();
  let email = document.getElementById('reg-email').value.trim(), mob = document.getElementById('reg-mobile').value.trim();
  let pass = document.getElementById('reg-pass').value.trim(), loc = document.getElementById('reg-location').value.trim() || 'Ardhapur, Maharashtra';
  let authEmail = email || (mob ? `${mob}@albiznet.com` : '');
  if (!authEmail || pass.length < 6) return showToast('⚠️ कृपया मोबाईल/Gmail आणि ६ अंकी पासवर्ड टाका!');

  try {
    let cred;
    try { cred = await auth.createUserWithEmailAndPassword(authEmail, pass); }
    catch (e) { if (e.code === 'auth/email-already-in-use') cred = await auth.signInWithEmailAndPassword(authEmail, pass); else throw e; }

    let name = (authAccountType === 'people' ? document.getElementById('reg-p-name').value : document.getElementById('reg-b-name').value).trim() || 'ALBIZNET User';
    let payload = {
      uid: cred.user.uid, type: authAccountType, name, handle: '@' + name.toLowerCase().replace(/\s+/g, ''),
      category: authAccountType === 'business' ? (document.getElementById('reg-b-cat').value.trim() || 'Shops') : 'Personal Account',
      about: authAccountType === 'business' ? (document.getElementById('reg-b-about').value.trim() || 'Welcome to our store!') : `Hi! I'm ${name} on ALBIZNET.`,
      location: loc, phone: mob, email: email || authEmail,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=4f46e5&color=fff&bold=true`,
      followersCount: 0, followingCount: 0, postsCount: 0, createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    await db.collection('users').doc(cred.user.uid).set(payload, { merge: true });
    currentUserData = payload;
    localStorage.setItem(ALBIZNET_SESSION_KEY, JSON.stringify(payload));
    launchMainApp();
  } catch (err) { showToast('❌ Error: ' + err.message); }
}

async function handleLoginSubmit() {
  if (!auth) await initRealFirebaseApp();
  let idVal = document.getElementById('login-id-input').value.trim(), pass = document.getElementById('login-pass-input').value.trim();
  if (!idVal || !pass) return showToast('⚠️ मोबाईल/Gmail आणि पासवर्ड टाका!');
  try {
    await auth.signInWithEmailAndPassword(idVal.includes('@') ? idVal : `${idVal}@albiznet.com`, pass);
    closeLoginModal();
  } catch (err) { showToast('❌ लॉगिन एरर: ' + err.message); }
}

async function openGoogleChooser() {
  if (!auth) await initRealFirebaseApp();
  try {
    const res = await auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
    const u = res.user, snap = await db.collection('users').doc(u.uid).get();
    if (!snap.exists) {
      let gName = u.displayName || 'User';
      currentUserData = {
        uid: u.uid, type: authAccountType || 'people', name: gName, handle: '@' + gName.toLowerCase().replace(/\s+/g, ''),
        category: authAccountType === 'business' ? 'Shops' : 'Personal Account', about: `Hi! I'm ${gName}`,
        location: 'Ardhapur, Maharashtra', phone: u.phoneNumber || '', email: u.email || '',
        avatar: u.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(gName)}`, followersCount: 0, followingCount: 0, postsCount: 0
      };
      await db.collection('users').doc(u.uid).set(currentUserData);
    } else currentUserData = { uid: u.uid, ...snap.data() };
    localStorage.setItem(ALBIZNET_SESSION_KEY, JSON.stringify(currentUserData));
    launchMainApp();
  } catch (err) { showToast('❌ Google Error: ' + err.message); }
}
function closeGoogleChooser() { let m = document.getElementById('google-chooser-modal'); if (m) m.style.display = 'none'; }

// =========================================================
// 2. FAST PROGRESSIVE REAL-TIME STREAMS (NO REEL BLOCKING!)
// =========================================================
function launchMainApp() {
  document.getElementById('welcome-screen').style.display = 'none';
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('main-app-shell').style.display = 'block';

  if (currentUserData) {
    let locTxt = document.getElementById('nearby-user-loc-txt');
    if (locTxt && currentUserData.location) locTxt.innerText = currentUserData.location;
    let cmtAv = document.getElementById('cmt-my-avatar');
    if (cmtAv && currentUserData.avatar) cmtAv.src = currentUserData.avatar;
    activeProfileUser = currentUserData;
    syncMarketplaceTabVisibility();
  }

  listenToAllUsersDirectory();
  listenToRealPostsAndReels();
  listenToRealOffers();
  listenToRealMessages();
  listenToRealNotifications();
  switchBottomNav('home');
}

function sortByPinnedAndCreatedDesc(arr) {
  return arr.sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    let tA = a.timeMs || (a.createdAt?.toMillis ? a.createdAt.toMillis() : 0);
    let tB = b.timeMs || (b.createdAt?.toMillis ? b.createdAt.toMillis() : 0);
    return tB - tA;
  });
}

function getRelativeTime(ms) {
  if (!ms) return 'Just now';
  let d = Math.floor((Date.now() - ms) / 1000);
  if (d < 60) return 'Just now';
  if (d < 3600) return Math.floor(d / 60) + 'm';
  if (d < 86400) return Math.floor(d / 3600) + 'h';
  return Math.floor(d / 86400) + 'd';
}

// एका वेळी १-१ चंक बॅकग्राउंडमध्ये जोडणे आणि लगेच स्क्रीन रिफ्रेश करणे (अडकू नये म्हणून!)
function resolveChunksInBackground(items, onEachResolved) {
  items.forEach(async (item) => {
    if (item.isChunked && item.chunkGroupId) {
      if (resolvedChunkMediaCache[item.chunkGroupId]) {
        item.img = resolvedChunkMediaCache[item.chunkGroupId];
        if (onEachResolved) onEachResolved();
      } else {
        try {
          const snap = await db.collection('media_chunks').where('groupId', '==', item.chunkGroupId).get();
          if (!snap.empty) {
            const full = snap.docs.map(d => d.data()).sort((a, b) => a.index - b.index).map(s => s.data).join('');
            resolvedChunkMediaCache[item.chunkGroupId] = full;
            item.img = full;
            if (onEachResolved) onEachResolved();
          }
        } catch (e) {}
      }
    }
  });
}

function listenToAllUsersDirectory() {
  db.collection('users').onSnapshot(snap => {
    cacheAllUsers = snap.docs.map(d => ({ id: d.id, uid: d.id, ...d.data() }));
    // ज्यांचे अकाउंट business आहे किंवा ज्यांनी Shops/Services/Restaurants निवडले आहे ते सर्व Business!
    cacheBusinesses = cacheAllUsers.filter(u => isUserBusinessAccount(u));
    if (currentUserData) {
      const freshMe = cacheAllUsers.find(u => u.uid === currentUserData.uid);
      if (freshMe) { currentUserData = freshMe; syncMarketplaceTabVisibility(); }
    }
    renderNearbyStores();
    renderMessagesPeopleBar();
    if (activeMsgTab === 'Marketplace') renderMessagesList();
  });
}

function listenToRealPostsAndReels() {
  db.collection('reels').onSnapshot(snap => {
    cacheReels = sortByPinnedAndCreatedDesc(snap.docs.map(d => ({ id: d.id, _col: 'reels', ...d.data() })));
    // आधी लगेच रेंडर करा (वाट पाहू नका!)
    renderReelsBar();
    renderExploreOffers();
    renderProfileMediaGrid();
    renderBizMediaSection();
    // बॅकग्राउंडमध्ये मोठे व्हिडिओ जोडून पुन्हा रिफ्रेश करा
    resolveChunksInBackground(cacheReels, () => {
      renderReelsBar();
      renderExploreOffers();
      renderProfileMediaGrid();
    });
  });

  db.collection('posts').onSnapshot(snap => {
    cachePosts = sortByPinnedAndCreatedDesc(snap.docs.map(d => ({ id: d.id, _col: 'posts', ...d.data() })));
    renderHomeFeed();
    renderReelsBar(); // जर रील नसेल तर व्हिडिओ पोस्ट दाखवण्यासाठी
    renderExploreOffers();
    renderProfileMediaGrid();
    renderBizMediaSection();
    if (activeCommentPostId) renderCommentsList(activeCommentPostId);
    resolveChunksInBackground(cachePosts, () => {
      renderHomeFeed();
      renderReelsBar();
      renderExploreOffers();
      renderProfileMediaGrid();
    });
  });

  db.collection('stories').onSnapshot(snap => {
    const now = Date.now();
    const valid = [];
    snap.docs.forEach(doc => {
      const d = doc.data(), exp = d.expiresAt || ((d.timeMs || now) + 86400000);
      if (now > exp) db.collection('stories').doc(doc.id).delete().catch(() => {});
      else valid.push({ id: doc.id, _col: 'stories', ...d });
    });
    cacheStories = sortByPinnedAndCreatedDesc(valid);
    renderStoriesMomentsBar();
    resolveChunksInBackground(cacheStories, renderStoriesMomentsBar);
  });

  db.collection('notes').onSnapshot(snap => {
    cacheNotes = sortByPinnedAndCreatedDesc(snap.docs.map(d => ({ id: d.id, _col: 'notes', ...d.data() })));
    renderMessagesPeopleBar();
  });

  db.collection('products').onSnapshot(snap => {
    cacheProducts = sortByPinnedAndCreatedDesc(snap.docs.map(d => ({ id: d.id, _col: 'products', ...d.data() })));
    renderCatalogGrid();
    renderBizMediaSection();
    if (activeMsgTab === 'Marketplace') renderMessagesList();
    resolveChunksInBackground(cacheProducts, () => {
      renderCatalogGrid();
      if (activeMsgTab === 'Marketplace') renderMessagesList();
    });
  });
}

function get CombinedReelsAndVideoPosts() {
  const rList = cacheReels.filter(r => !r.archived && !r.hiddenFromGrid);
  const vPosts = cachePosts.filter(p => !p.archived && !p.hiddenFromGrid && (p.mediaType === 'video' || (p.img && p.img.startsWith('data:video'))) && !rList.some(r => r.id === p.id));
  return [...rList, ...vPosts];
}

function renderStoriesMomentsBar() {
  const bar = document.querySelector('#view-home .moments-scroll-bar');
  if (!bar) return;
  const first = bar.querySelector('.your-moment-box')?.outerHTML || '';
  const visible = cacheStories.filter(s => !s.archived && !s.hiddenFromGrid);
  bar.innerHTML = first + visible.map(st => `
    <div class="story-circle-item" onclick="openScrollableMediaFeed('stories', '${st.id}', 'Moments', null, 'public_reel')">
      <div class="story-grad-ring"><img src="${st.avatar || st.img}"><span class="story-plus">+</span></div>
      <span>${(st.author || 'User').split(' ')[0]}</span>
    </div>
  `).join('');
}

// SHORTS & REELS BAR (त्वरित लोड होणारा!)
function renderReelsBar() {
  let rBox = document.getElementById('reels-container') || document.querySelector('#view-home .reels-scroll-bar, #view-home .shorts-scroll-bar');
  if (!rBox) return;

  const allReels = CombinedReelsAndVideoPosts;
  if (allReels.length === 0) {
    rBox.innerHTML = `<p style="font-size:12px; color:#64748b; padding:10px;">अजून कोणतीही Reel नाही. '+ Create ➔ Reel' वरून व्हिडिओ टाका!</p>`;
    return;
  }

  rBox.innerHTML = allReels.map(r => {
    const col = r._col || 'reels';
    const hasMedia = Boolean(r.img);
    const isVid = r.mediaType === 'video' || (r.img && (r.img.startsWith('data:video') || r.img.includes('.mp4')));
    const titleTxt = r.caption || r.author || 'Reel';
    const fallbackPoster = r.avatar || 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=400&q=80';

    return `
      <div class="reel-thumb-card" onclick="openScrollableMediaFeed('${col}', '${r.id}', 'Reels', null, 'public_reel')" style="min-width:138px; height:215px; background:#0f172a; border-radius:16px; position:relative; overflow:hidden; cursor:pointer; margin-right:10px; flex-shrink:0;">
        ${hasMedia ? (
          isVid
            ? `<video src="${r.img}#t=0.1" poster="${fallbackPoster}" style="width:100%; height:100%; object-fit:cover;" muted playsinline preload="metadata"></video>`
            : `<img src="${r.img}" style="width:100%; height:100%; object-fit:cover;">`
        ) : `<img src="${fallbackPoster}" style="width:100%; height:100%; object-fit:cover; filter:brightness(0.7);">`}
        <button onclick="event.stopPropagation(); openItemActionMenu('${r.id}', '${col}', 'public_reel')" style="position:absolute; top:8px; right:8px; background:rgba(0,0,0,0.6); color:#fff; border:none; width:28px; height:28px; border-radius:50%; font-size:13px; z-index:2;"><i class="fa-solid fa-ellipsis-vertical"></i></button>
        <div style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); background:rgba(0,0,0,0.65); color:#fff; padding:6px 12px; border-radius:20px; font-size:12px; font-weight:700;"><i class="fa-solid fa-play"></i> Play</div>
        <div style="position:absolute; bottom:8px; left:8px; right:8px; color:#fff; font-size:11px; text-shadow:0 1px 3px #000;">
          <div style="font-weight:800; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${titleTxt}</div>
          <div style="display:flex; justify-content:space-between; opacity:0.9;"><span>${r.views || 1} Views 🔥</span><span>${(r.author || 'User').split(' ')[0]}</span></div>
        </div>
      </div>
    `;
  }).join('');
}

function renderHomeFeed() {
  let pBox = document.getElementById('home-posts-feed');
  if (!pBox) return;
  const visible = cachePosts.filter(p => !p.archived && !p.hiddenFromGrid);
  if (visible.length === 0) {
    pBox.innerHTML = `<div style="text-align:center; padding:30px; color:#64748b;">अजून कोणतीही पोस्ट नाही. '+ Create ➔ Post' वर दाबून पहिली पोस्ट करा!</div>`;
    return;
  }
  const myUid = currentUserData ? currentUserData.uid : 'guest';
  pBox.innerHTML = visible.map(p => {
    let isMy = currentUserData && p.uid === currentUserData.uid, ctx = isMy ? 'profile_owner' : 'public_reel';
    let likedBy = Array.isArray(p.likedBy) ? p.likedBy : [], isLiked = likedBy.includes(myUid);
    let likeCnt = typeof p.likes === 'number' ? p.likes : likedBy.length;
    let cmtCnt = (Array.isArray(p.commentsList) ? p.commentsList.length : p.commentsCount) || 0;
    let isVid = p.mediaType === 'video' || (p.img && (p.img.startsWith('data:video') || p.img.includes('.mp4')));

    return `
      <div class="feed-post-card" style="background:#fff; border-radius:18px; padding:14px; margin:12px 14px; box-shadow:0 2px 12px rgba(0,0,0,0.06);">
        <div style="display:flex; align-items:center; gap:10px; margin-bottom:10px;">
          <img src="${p.avatar || 'https://ui-avatars.com/api/?name=U'}" onclick="openUserProfile('${p.uid}')" style="width:42px; height:42px; border-radius:50%; object-fit:cover; cursor:pointer;">
          <div style="flex:1;">
            <div onclick="openUserProfile('${p.uid}')" style="font-weight:800; font-size:15px; color:#0f172a; cursor:pointer;">${p.author || 'User'} ${p.pinned ? '📌' : ''}</div>
            <div style="font-size:12px; color:#64748b;"><i class="fa-solid fa-location-dot"></i> ${p.location || 'Maharashtra'} &bull; <span style="color:#4f46e5; font-weight:700;">${p.category || 'Post'}</span></div>
          </div>
          <button onclick="openItemActionMenu('${p.id}', 'posts', '${ctx}')" style="background:#f8fafc; border:none; width:34px; height:34px; border-radius:50%;"><i class="fa-solid fa-ellipsis-vertical"></i></button>
        </div>
        <div style="font-size:14.5px; color:#1e293b; margin-bottom:10px;">${p.caption || ''}</div>
        ${p.img ? (isVid ? `<video src="${p.img}" controls playsinline style="width:100%; max-height:400px; border-radius:14px; background:#000;"></video>` : `<img src="${p.img}" onclick="openScrollableMediaFeed('posts', '${p.id}', 'Posts', null, '${ctx}')" style="width:100%; max-height:400px; object-fit:cover; border-radius:14px; cursor:pointer;">`) : ''}
        <div style="display:flex; justify-content:space-around; padding-top:12px; margin-top:12px; border-top:1px solid #f1f5f9; font-size:14px; font-weight:700; color:#475569;">
          <div onclick="toggleLikeDislikeItem('${p.id}', 'posts')" style="cursor:pointer; color:${isLiked ? '#e11d48' : '#475569'};"><i class="${isLiked ? 'fa-solid' : 'fa-regular'} fa-heart"></i> ${p.hideLikes ? 'Like' : likeCnt + ' Like'}</div>
          <div onclick="openCommentsModal('${p.id}', 'posts')" style="cursor:pointer;"><i class="fa-regular fa-comment"></i> ${p.commentsOff ? 'Off' : cmtCnt + ' Comment'}</div>
          <div onclick="shareRealPost('${p.id}', '${(p.caption || 'Post').replace(/'/g, '')}')" style="cursor:pointer;"><i class="fa-solid fa-share-nodes"></i> Share</div>
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

// =========================================================
// FULLSCREEN REELS & MEDIA PLAYER
// =========================================================
function openScrollableMediaFeed(colName, startId, headerTitle, customList, menuContext = 'public_reel') {
  let raw = customList || (colName === 'reels' ? CombinedReelsAndVideoPosts : getCacheArrayByCol(colName).filter(i => !i.archived && i.img));
  if (!raw || raw.length === 0) return showToast('⏳ मीडिया लोड होत आहे...');

  const idx = raw.findIndex(x => String(x.id) === String(startId));
  let ordered = idx > 0 ? [...raw.slice(idx), ...raw.slice(0, idx)] : [...raw];
  if (colName === 'reels' && ordered.length < 5) {
    ordered = [...ordered, ...cachePosts.filter(p => !p.archived && p.img && !ordered.some(o => o.id === p.id))];
  }

  document.getElementById('scroll-feed-header-title').innerText = headerTitle || 'Reels';
  const feedBody = document.getElementById('pro-scroll-feed-body');
  const myUid = currentUserData ? currentUserData.uid : 'guest';

  feedBody.innerHTML = ordered.map((item, i) => {
    const col = item._col || colName || 'reels';
    const isVid = item.mediaType === 'video' || (item.img && (item.img.startsWith('data:video') || item.img.includes('.mp4')));
    const label = item.caption || item.deal || item.title || item.noteText || '';
    const author = item.author || item.bizName || item.sellerName || 'User';
    const authorAv = item.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(author)}`;
    const likedBy = Array.isArray(item.likedBy) ? item.likedBy : [], isLiked = likedBy.includes(myUid);
    const likesCnt = typeof item.likes === 'number' ? item.likes : likedBy.length;
    const cmtCnt = (Array.isArray(item.commentsList) ? item.commentsList.length : item.commentsCount) || 0;

    return `
      <div class="scroll-snap-slide" data-id="${item.id}" data-col="${col}" style="background:#000; display:flex; align-items:center; justify-content:center; overflow:hidden;">
        ${isVid ? `<video src="${item.img}" ${i === 0 ? 'autoplay' : ''} loop playsinline style="width:100%; height:100%; object-fit:cover;" onclick="this.paused ? this.play() : this.pause()"></video>` : `<img src="${item.img}" style="width:100%; height:100%; object-fit:contain;">`}
        <div style="position:absolute; right:14px; bottom:44px; display:flex; flex-direction:column; align-items:center; gap:20px; z-index:5; color:#fff;">
          <div onclick="toggleLikeDislikeItem('${item.id}', '${col}')" style="text-align:center; cursor:pointer;"><i class="${isLiked ? 'fa-solid' : 'fa-regular'} fa-heart" style="font-size:28px; color:${isLiked ? '#ef4444' : '#fff'};"></i><div style="font-size:12px; font-weight:700;">${likesCnt}</div></div>
          <div onclick="openCommentsModal('${item.id}', '${col}')" style="text-align:center; cursor:pointer;"><i class="fa-regular fa-comment" style="font-size:26px;"></i><div style="font-size:12px; font-weight:700;">${cmtCnt}</div></div>
          <div onclick="shareRealPost('${item.id}', '${label.replace(/'/g, '')}')" style="cursor:pointer;"><i class="fa-regular fa-paper-plane" style="font-size:24px;"></i></div>
          <div onclick="openItemActionMenu('${item.id}', '${col}', '${menuContext}')" style="cursor:pointer; padding:6px;"><i class="fa-solid fa-ellipsis-vertical" style="font-size:22px;"></i></div>
        </div>
        <div style="position:absolute; bottom:28px; left:14px; right:76px; color:#fff; z-index:4;">
          <div style="display:flex; align-items:center; gap:10px; margin-bottom:8px;">
            <img src="${authorAv}" onclick="closeScrollableFeedModal(); openUserProfile('${item.uid}')" style="width:38px; height:38px; border-radius:50%; object-fit:cover; border:1.5px solid #fff;">
            <span onclick="closeScrollableFeedModal(); openUserProfile('${item.uid}')" style="font-weight:800; font-size:15px;">${author}</span>
          </div>
          <div style="font-size:14px;">${label}</div>
        </div>
      </div>
    `;
  }).join('');

  document.getElementById('pro-scroll-feed-modal').style.display = 'flex';
  feedBody.scrollTop = 0;
  setupScrollVideoAutoPlay();
}

function setupScrollVideoAutoPlay() {
  const slides = document.querySelectorAll('#pro-scroll-feed-body .scroll-snap-slide');
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      const v = e.target.querySelector('video'), id = e.target.getAttribute('data-id'), col = e.target.getAttribute('data-col');
      if (e.isIntersecting) {
        if (col === 'reels' && id) db.collection('reels').doc(id).update({ views: firebase.firestore.FieldValue.increment(1) }).catch(() => {});
        if (v) { v.currentTime = 0; v.play().catch(() => {}); }
      } else if (v) v.pause();
    });
  }, { root: document.getElementById('pro-scroll-feed-body'), threshold: 0.6 });
  slides.forEach(s => obs.observe(s));
}

function closeScrollableFeedModal() {
  document.querySelectorAll('#pro-scroll-feed-body video').forEach(v => v.pause());
  document.getElementById('pro-scroll-feed-modal').style.display = 'none';
}

// =========================================================
// ACTION MENUS & COMMENTS
// =========================================================
function openOtherUserProfileMenu() { document.getElementById('pro-other-user-menu-modal').style.display = 'flex'; }
function closeAllActionMenus() {
  ['pro-ig-action-modal', 'pro-reel-public-menu-modal', 'pro-other-user-menu-modal'].forEach(id => {
    const el = document.getElementById(id); if (el) el.style.display = 'none';
  });
}
function closeItemActionMenu() { closeAllActionMenus(); }

function handleOtherProfileMenuAction(act) {
  closeAllActionMenus();
  const n = activeProfileUser ? activeProfileUser.name : 'User';
  if (act === 'block') { if (confirm(`🚫 ${n} ला Block करायचे का?`)) { showToast(`🚫 ${n} Blocked!`); switchBottomNav('home'); } }
  else if (act === 'report') showToast(`🚨 Report submitted!`);
  else if (act === 'copy_url' || act === 'share_profile') { navigator.clipboard?.writeText(window.location.href); showToast('🔗 Profile Link Copied!'); }
  else showToast(`✅ Done!`);
}

function openItemActionMenu(itemId, colName, ctx = 'profile_owner') {
  activeMenuTarget = { id: itemId, col: colName || 'posts', context: ctx };
  if (ctx === 'public_reel') document.getElementById('pro-reel-public-menu-modal').style.display = 'flex';
  else document.getElementById('pro-ig-action-modal').style.display = 'flex';
}

function toggleReelAutoScroll() { autoScrollReelsEnabled = !autoScrollReelsEnabled; closeAllActionMenus(); showToast(autoScrollReelsEnabled ? '🔄 Auto Scroll ON' : '⏸️ Auto Scroll OFF'); }
function handlePublicReelAction(act) { closeAllActionMenus(); if (act === 'remix') openCreateContentModal('Reel'); else showToast('✅ Done!'); }

async function handleIGMenuAction(act) {
  const { id, col } = activeMenuTarget;
  const item = getCacheArrayByCol(col).find(x => x.id === id);
  closeAllActionMenus();
  if (!item) return;
  if (act === 'delete') { if (confirm('🗑️ कायमचे डिलीट करायचे का?')) { await db.collection(col).doc(id).delete(); closeScrollableFeedModal(); showToast('🗑️ Deleted!'); } }
  else if (act === 'archive') await db.collection(col).doc(id).update({ archived: !item.archived });
  else if (act === 'pin') await db.collection(col).doc(id).update({ pinned: !item.pinned });
  else if (act === 'hideLikes') await db.collection(col).doc(id).update({ hideLikes: !item.hideLikes });
  else if (act === 'turnOffComments') await db.collection(col).doc(id).update({ commentsOff: !item.commentsOff });
  else if (act === 'edit') {
    const f = col === 'offers' ? 'deal' : (col === 'products' ? 'title' : 'caption');
    const val = prompt('✏️ नवीन माहिती लिहा:', item[f] || '');
    if (val !== null) await db.collection(col).doc(id).update({ [f]: val.trim() });
  }
}

function openCommentsModal(itemId, colName = 'posts') {
  const item = getCacheArrayByCol(colName).find(x => x.id === itemId);
  if (item && item.commentsOff) return showToast('🔇 कमेंट्स बंद आहेत.');
  activeCommentPostId = itemId; activeCommentCollection = colName;
  document.getElementById('pro-comments-modal').style.display = 'flex';
  renderCommentsList(itemId);
}
function closeCommentsModal() { activeCommentPostId = null; document.getElementById('pro-comments-modal').style.display = 'none'; }

function renderCommentsList(itemId) {
  const box = document.getElementById('pro-comments-list');
  const item = getCacheArrayByCol(activeCommentCollection).find(x => x.id === itemId);
  const list = (item && Array.isArray(item.commentsList)) ? item.commentsList : [];
  box.innerHTML = list.length === 0 ? `<div style="text-align:center; padding:40px; color:#64748b;">पहिली कमेंट तुम्ही करा! 💬</div>` : list.map(c => `
    <div style="display:flex; gap:10px; margin-bottom:12px;">
      <img src="${c.avatar || 'https://ui-avatars.com/api/?name=U'}" style="width:34px; height:34px; border-radius:50%; object-fit:cover;">
      <div style="flex:1; background:#f8fafc; padding:8px 12px; border-radius:14px;">
        <div style="display:flex; justify-content:space-between;"><strong style="font-size:13px;">${c.author}</strong><span style="font-size:10.5px; color:#94a3b8;">${getRelativeTime(c.timeMs)}</span></div>
        <div style="font-size:13.5px; margin-top:2px;">${c.text}</div>
      </div>
    </div>
  `).join('');
}

async function shareRealPost(id, text) {
  if (navigator.share) { try { await navigator.share({ title: 'ALBIZNET', text, url: window.location.origin }); return; } catch (e) {} }
  navigator.clipboard?.writeText(window.location.origin); showToast('🔗 लिंक कॉपी केली!');
}

// =========================================================
// 3. UNLIMITED VIDEO & PHOTO UPLOADER
// =========================================================
function toggleCreatePopupMenu(e) { if (e) e.stopPropagation(); let m = document.getElementById('create-dropdown-menu'); if (m) m.style.display = (m.style.display === 'block') ? 'none' : 'block'; }

function openCreateContentModal(mode) {
  currentCreateMode = mode; uploadedDataURL = ''; uploadedRawFile = null; uploadedMediaType = 'image';
  let m = document.getElementById('create-dropdown-menu'); if (m) m.style.display = 'none';
  document.getElementById('create-modal-title').innerText = `Create New ${mode}`;
  document.getElementById('cr-title-input').value = '';
  document.getElementById('cr-sub-input').value = '';
  document.getElementById('cr-price-input').value = '';
  document.getElementById('cr-sub-input').style.display = (mode === 'Offer' || mode === 'Product' || mode === 'Post') ? 'block' : 'none';
  document.getElementById('cr-price-input').style.display = (mode === 'Product') ? 'block' : 'none';
  document.getElementById('create-content-modal').style.display = 'flex';
}
function closeCreateContentModal() { document.getElementById('create-content-modal').style.display = 'none'; }

function handleFileSelect(e) {
  if (!e.target.files || !e.target.files[0]) return;
  let file = e.target.files[0]; uploadedRawFile = file;
  if (file.type.startsWith('video/')) {
    uploadedMediaType = 'video';
    let r = new FileReader(); r.onload = (ev) => { uploadedDataURL = ev.target.result; showToast('🎬 व्हिडिओ निवडला!'); }; r.readAsDataURL(file);
  } else {
    uploadedMediaType = 'image';
    let r = new FileReader();
    r.onload = (ev) => {
      let img = new Image();
      img.onload = () => {
        let c = document.createElement('canvas'), maxW = 800, sc = maxW / img.width;
        c.width = img.width > maxW ? maxW : img.width; c.height = img.width > maxW ? img.height * sc : img.height;
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        uploadedDataURL = c.toDataURL('image/jpeg', 0.78); showToast('✅ फोटो निवडला!');
      };
      img.src = ev.target.result;
    };
    r.readAsDataURL(file);
  }
}

function updateTopUploadProgress(vis, txt, pct) {
  const b = document.getElementById('pro-upload-progress-Banner'); if (!b) return;
  b.style.display = vis ? 'flex' : 'none';
  if (vis) { document.getElementById('up-prog-title').innerText = txt; document.getElementById('up-prog-pct').innerText = `${pct}%`; document.getElementById('up-prog-bar').style.width = `${pct}%`; }
}

async function uploadLargeMediaSmart(label, rawFile, dataUrl) {
  if (!dataUrl) return { url: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=700&q=80', isChunked: false, chunkGroupId: '' };
  if (dataUrl.length < 650000) return { url: dataUrl, isChunked: false, chunkGroupId: '' };

  const chunkSize = 600000, total = Math.ceil(dataUrl.length / chunkSize);
  const groupId = 'media_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  for (let i = 0; i < total; i++) {
    updateTopUploadProgress(true, `📤 ${label} अपलोड होत आहे...`, Math.min(95, Math.round(((i + 1) / total) * 95)));
    await db.collection('media_chunks').doc(`${groupId}_${i}`).set({ groupId, index: i, total, data: dataUrl.slice(i * chunkSize, (i + 1) * chunkSize), timeMs: Date.now() });
  }
  resolvedChunkMediaCache[groupId] = dataUrl;
  return { url: '', isChunked: true, chunkGroupId: groupId };
}

async function publishCreatedContent() {
  if (!currentUserData) return showToast('⚠️ आधी लॉगिन करा!');
  const mode = currentCreateMode, title = document.getElementById('cr-title-input').value.trim();
  const sub = document.getElementById('cr-sub-input').value.trim(), price = document.getElementById('cr-price-input').value.trim();
  if (!title && !uploadedDataURL) return showToast('⚠️ माहिती किंवा फोटो/व्हिडिओ निवडा!');

  closeCreateContentModal();
  updateTopUploadProgress(true, `📤 ${mode} अपलोड होत आहे...`, 15);
  const nowTs = firebase.firestore.FieldValue.serverTimestamp(), nowMs = Date.now();

  try {
    const m = await uploadLargeMediaSmart(mode, uploadedRawFile, uploadedDataURL);
    const img = m.isChunked ? '' : m.url;

    if (mode === 'Reel' || mode === 'Live') {
      await db.collection('reels').add({ uid: currentUserData.uid, author: currentUserData.name, avatar: currentUserData.avatar, caption: title || mode, img, isChunked: m.isChunked, chunkGroupId: m.chunkGroupId, mediaType: uploadedMediaType, views: 1, likes: 0, likedBy: [], timeMs: nowMs, createdAt: nowTs });
    } else if (mode === 'Story') {
      await db.collection('stories').add({ uid: currentUserData.uid, author: currentUserData.name, avatar: currentUserData.avatar, caption: title || 'Moment', img, isChunked: m.isChunked, chunkGroupId: m.chunkGroupId, mediaType: uploadedMediaType, timeMs: nowMs, expiresAt: nowMs + 86400000, createdAt: nowTs });
    } else if (mode === 'Offer') {
      await db.collection('offers').add({ uid: currentUserData.uid, bizName: currentUserData.name, deal: title || 'Special Offer', validity: sub || 'Limited Time', location: currentUserData.location || 'Maharashtra', img, isChunked: m.isChunked, chunkGroupId: m.chunkGroupId, timeMs: nowMs, createdAt: nowTs });
    } else if (mode === 'Product') {
      await db.collection('products').add({ uid: currentUserData.uid, sellerName: currentUserData.name, title: title || 'Product', price: price || '₹999', cat: sub || 'General', img, isChunked: m.isChunked, chunkGroupId: m.chunkGroupId, timeMs: nowMs, createdAt: nowTs });
    } else {
      await db.collection('posts').add({ uid: currentUserData.uid, author: currentUserData.name, avatar: currentUserData.avatar, location: currentUserData.location || 'Maharashtra', category: sub || currentUserData.category || 'Post', caption: title, img, isChunked: m.isChunked, chunkGroupId: m.chunkGroupId, mediaType: uploadedMediaType, likes: 0, likedBy: [], commentsCount: 0, commentsList: [], timeMs: nowMs, createdAt: nowTs });
    }
    updateTopUploadProgress(false);
    showToast(`🎉 ${mode} यशस्वीरित्या पब्लिश झाली!`);
  } catch (e) { updateTopUploadProgress(false); showToast('❌ Error: ' + e.message); }
}

// =========================================================
// 4. MESSENGER (LONG-PRESS, AUTO-UNREAD, BIZ MARKETPLACE, REQUESTS)
// =========================================================
function renderMessagesPeopleBar() {
  const bar = document.querySelector('#view-messages .moments-scroll-bar');
  if (!bar || !currentUserData) return;
  const first = bar.querySelector('.your-note-card')?.outerHTML || '';
  const others = cacheAllUsers.filter(u => u.uid !== currentUserData.uid);
  bar.innerHTML = first + others.map(u => `
    <div class="story-circle-item" onclick="startRealChat('${u.uid}', '${(u.name || 'User').replace(/'/g, '')}', 'Inbox', '${u.avatar || ''}')">
      <div class="story-grad-ring"><img src="${u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name || 'U')}`}"></div>
      <span>${(u.name || 'User').split(' ')[0]}</span>
    </div>
  `).join('');
}

function listenToRealMessages() {
  db.collection('chats').onSnapshot(snap => {
    if (!currentUserData) return;
    const myUid = currentUserData.uid;
    cacheChats = sortByPinnedAndCreatedDesc(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(c => (c.participants || []).includes(myUid) || c.senderUid === myUid || c.receiverUid === myUid));
    renderMessagesList();

    let unreadCnt = cacheChats.filter(c => c.unread === true && c.lastSenderUid !== myUid && !c.isRequest && c.chatCategory !== 'Request').length;
    let badge = document.querySelector('.msg-badge-count');
    if (badge) { badge.innerText = unreadCnt; badge.style.display = unreadCnt > 0 ? 'inline-block' : 'none'; }

    if (activeChatDocId) {
      const openDoc = cacheChats.find(x => x.id === activeChatDocId);
      if (openDoc) renderMessengerBubbles(openDoc);
    }
  });
}

function switchMsgTab(tabName, el) {
  if (tabName === 'Marketplace' && !isUserBusinessAccount(currentUserData)) {
    return showToast('🏪 Marketplace हे फक्त Business अकाउंटसाठी आहे!');
  }
  activeMsgTab = tabName;
  document.querySelectorAll('#view-messages .m-tab').forEach(t => t.classList.remove('active'));
  if (el) el.classList.add('active');
  renderMessagesList();
}

function startChatLongPress(chatId, peerName) {
  clearTimeout(chatLongPressTimer);
  chatLongPressTimer = setTimeout(() => openChatLongPressMenu(chatId, peerName), 500);
}
function cancelChatLongPress() { clearTimeout(chatLongPressTimer); }
function openChatLongPressMenu(id, name) { selectedChatForMenu = { id, name }; document.getElementById('lp-chat-title').innerText = name; document.getElementById('pro-chat-longpress-modal').style.display = 'flex'; }
function closeChatLongPressMenu() { document.getElementById('pro-chat-longpress-modal').style.display = 'none'; }

async function handleChatLongPressAction(act) {
  closeChatLongPressMenu();
  if (!selectedChatForMenu?.id) return;
  const { id, name } = selectedChatForMenu, c = cacheChats.find(x => x.id === id);
  if (act === 'reminder') {
    const m = prompt(`⏰ ${name} साठी किती मिनिटांचा Reminder लावायचा?`, '10');
    if (m && !isNaN(m)) {
      await db.collection('chats').doc(id).update({ reminderText: `⏰ ${m}m` });
      showToast(`⏰ ${m} मिनिटांचा Reminder सेट केला!`);
      setTimeout(() => alert(`🔔 Reminder: ${name} ला मेसेज करण्याची वेळ झाली!`), parseFloat(m) * 60000);
    }
  } else if (act === 'toggle_read' && c) await db.collection('chats').doc(id).update({ unread: !c.unread, lastSenderUid: !c.unread ? 'other' : currentUserData.uid });
  else if (act === 'pin' && c) await db.collection('chats').doc(id).update({ pinned: !c.pinned });
  else if (act === 'mute') showToast(`🔕 ${name} Muted!`);
  else if (act === 'clear') { if (confirm('🧹 सर्व मेसेज पुसून टाकायचे का?')) await db.collection('chats').doc(id).update({ messages: [], lastMessage: '🧹 Cleared', unread: false }); }
  else if (act === 'delete') await deleteChatFromList(id);
}

async function acceptMessageRequest(id, name) {
  await db.collection('chats').doc(id).update({ chatCategory: 'Inbox', isRequest: false, unread: false });
  showToast(`✅ ${name} ची Request स्वीकारली!`);
}
async function rejectMessageRequest(id, name) {
  await db.collection('chats').doc(id).delete();
  showToast(`🚫 ${name} ची Request काढून टाकली!`);
}

function renderMessagesList() {
  let box = document.getElementById('messages-chat-list');
  if (!box || !currentUserData) return;
  syncMarketplaceTabVisibility();
  let q = (document.getElementById('msg-search-input')?.value || '').trim().toLowerCase();
  const myUid = currentUserData.uid;

  // MARKETPLACE (BUSINESS ACCOUNTS ONLY)
  if (activeMsgTab === 'Marketplace') {
    const bizStores = cacheBusinesses.filter(b => !q || (b.name || '').toLowerCase().includes(q) || (b.category || '').toLowerCase().includes(q));
    const bizProds = cacheProducts.filter(p => !p.archived && (!q || (p.title || '').toLowerCase().includes(q) || (p.sellerName || '').toLowerCase().includes(q)));

    box.innerHTML = `
      <div style="padding:10px 14px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
          <h4 style="margin:0; font-size:15px; font-weight:800;">🏪 Business Stores (${bizStores.length})</h4>
          <button onclick="openCreateContentModal('Product')" style="background:#2563eb; color:#fff; border:none; padding:6px 12px; border-radius:10px; font-size:12px; font-weight:700;">+ Sell Product</button>
        </div>
        <div style="display:flex; gap:10px; overflow-x:auto; padding-bottom:8px;">
          ${bizStores.map(b => `
            <div onclick="openUserProfile('${b.uid}')" style="min-width:140px; background:#fff; padding:12px; border-radius:16px; text-align:center; box-shadow:0 2px 8px rgba(0,0,0,0.05); cursor:pointer;">
              <img src="${b.avatar}" style="width:52px; height:52px; border-radius:12px; object-fit:cover;">
              <div style="font-weight:800; font-size:13.5px; margin-top:6px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${b.name}</div>
              <div style="font-size:11px; color:#4f46e5; font-weight:700;">${b.category || 'Business'}</div>
            </div>
          `).join('')}
        </div>
        <h4 style="margin:14px 0 10px; font-size:15px; font-weight:800;">🛍️ Marketplace Products (${bizProds.length})</h4>
        ${bizProds.length === 0 ? `<div style="padding:20px; background:#fff; border-radius:14px; text-align:center; color:#64748b; font-size:13px;">नवीन प्रॉडक्ट टाकण्यासाठी '+ Sell Product' वर दाबा!</div>` : `
          <div style="display:grid; grid-template-columns:repeat(2,1fr); gap:10px;">
            ${bizProds.map(p => `
              <div onclick="openProductDetail('${p.id}')" style="background:#fff; border-radius:14px; padding:10px; box-shadow:0 2px 8px rgba(0,0,0,0.05); cursor:pointer;">
                <img src="${p.img}" style="width:100%; height:110px; object-fit:cover; border-radius:10px;">
                <div style="font-weight:800; font-size:13.5px; margin-top:6px;">${p.title}</div>
                <div style="color:#2563eb; font-weight:900;">${p.price || '₹999'}</div>
                <div style="font-size:11px; color:#64748b;">🏪 ${p.sellerName}</div>
              </div>
            `).join('')}
          </div>
        `}
      </div>
    `;
    return;
  }

  let list = cacheChats.filter(m => {
    let matchQ = !q || (m.senderName || '').toLowerCase().includes(q) || (m.receiverName || '').toLowerCase().includes(q) || (m.lastMessage || '').toLowerCase().includes(q);
    if (!matchQ) return false;
    const isReq = (m.chatCategory === 'Request' || m.isRequest === true);
    if (activeMsgTab === 'Request') return isReq;
    if (activeMsgTab === 'Unread') return !isReq && m.unread === true && m.lastSenderUid !== myUid;
    return !isReq;
  });

  if (list.length === 0) {
    box.innerHTML = `<div style="text-align:center; padding:35px 16px; color:#64748b;">सध्या <b>${activeMsgTab}</b> मध्ये कोणतेही चॅट नाही.</div>`;
    return;
  }

  box.innerHTML = list.map(m => {
    let isMe = m.senderUid === myUid;
    let pName = isMe ? (m.receiverName || 'Friend') : (m.senderName || 'User');
    let pUid = isMe ? (m.receiverUid || '') : (m.senderUid || '');
    let pAv = (isMe ? m.receiverAvatar : m.senderAvatar) || `https://ui-avatars.com/api/?name=${encodeURIComponent(pName)}`;
    let isUnread = m.unread === true && m.lastSenderUid !== myUid;
    let safeName = pName.replace(/'/g, '');

    if (activeMsgTab === 'Request') {
      return `
        <div style="padding:12px 14px; margin:8px 12px; border-radius:16px; background:#fff; box-shadow:0 2px 8px rgba(0,0,0,0.05);">
          <div style="display:flex; align-items:center; gap:12px;" onclick="openMessengerWindow('${m.id}', '${safeName}', '${pAv}', '${pUid}')">
            <img src="${pAv}" style="width:46px; height:46px; border-radius:50%; object-fit:cover;">
            <div style="flex:1;"><div style="font-weight:800;">${pName}</div><div style="font-size:13px; color:#64748b;">${m.lastMessage}</div></div>
          </div>
          <div style="display:flex; gap:10px; margin-top:10px;">
            <button onclick="acceptMessageRequest('${m.id}', '${safeName}')" style="flex:1; background:#16a34a; color:#fff; border:none; padding:7px; border-radius:10px; font-weight:700;">✔ Accept</button>
            <button onclick="rejectMessageRequest('${m.id}', '${safeName}')" style="flex:1; background:#fee2e2; color:#dc2626; border:none; padding:7px; border-radius:10px; font-weight:700;">✖ Reject</button>
          </div>
        </div>
      `;
    }

    return `
      <div class="chat-item-row"
        ontouchstart="startChatLongPress('${m.id}', '${safeName}')" ontouchend="cancelChatLongPress()" ontouchmove="cancelChatLongPress()"
        onmousedown="startChatLongPress('${m.id}', '${safeName}')" onmouseup="cancelChatLongPress()"
        oncontextmenu="event.preventDefault(); openChatLongPressMenu('${m.id}', '${safeName}');"
        onclick="openMessengerWindow('${m.id}', '${safeName}', '${pAv}', '${pUid}')"
        style="display:flex; align-items:center; gap:12px; padding:12px 14px; margin:8px 12px; border-radius:16px; background:#fff; box-shadow:0 2px 8px rgba(0,0,0,0.04); cursor:pointer; user-select:none;">
        <div style="position:relative;">
          <img src="${pAv}" style="width:48px; height:48px; border-radius:50%; object-fit:cover;">
          ${isUnread ? `<span style="position:absolute; top:0; right:0; width:12px; height:12px; background:#2563eb; border:2px solid #fff; border-radius:50%;"></span>` : ''}
        </div>
        <div style="flex:1; min-width:0;">
          <div style="font-weight:${isUnread ? '900' : '700'}; font-size:15px;">${pName} ${m.pinned ? '📌' : ''} ${m.reminderText ? `<span style="font-size:10px; color:#2563eb;">${m.reminderText}</span>` : ''}</div>
          <div style="font-size:13px; color:${isUnread ? '#0f172a' : '#64748b'}; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${m.lastMessage || 'Tap to chat'}</div>
        </div>
        <button onclick="event.stopPropagation(); openChatLongPressMenu('${m.id}', '${safeName}')" style="background:#f8fafc; border:none; width:34px; height:34px; border-radius:50%;"><i class="fa-solid fa-ellipsis-vertical"></i></button>
      </div>
    `;
  }).join('');
}

async function deleteChatFromList(id) { if (confirm('🗑️ हे चॅट डिलीट करायचे का?')) await db.collection('chats').doc(id).delete(); }
async function deleteEntireActiveChat() { if (activeChatDocId && confirm('🗑️ संपूर्ण चॅट डिलीट करायचे का?')) { const id = activeChatDocId; closeMessengerChat(); await db.collection('chats').doc(id).delete(); } }

async function deleteSingleMessageBubble(idx) {
  if (!activeChatDocId || !confirm('🗑️ हा मेसेज डिलीट करायचा का?')) return;
  const c = cacheChats.find(x => x.id === activeChatDocId);
  if (!c || !Array.isArray(c.messages)) return;
  const up = c.messages.filter((_, i) => i !== idx);
  await db.collection('chats').doc(activeChatDocId).update({ messages: up, lastMessage: up.length ? up[up.length - 1].text : 'No messages' });
}

async function startRealChat(peerUid, peerName, catOverride, peerAv) {
  if (!currentUserData) return showToast('⚠️ लॉगिन करा!');
  if (peerUid === currentUserData.uid) return showToast('ℹ️ स्वतःला मेसेज करता येत नाही!');
  const myUid = currentUserData.uid;
  let ex = cacheChats.find(c => (c.participants || []).includes(myUid) && (c.participants || []).includes(peerUid));
  let av = peerAv || `https://ui-avatars.com/api/?name=${encodeURIComponent(peerName || 'U')}`;
  if (ex) openMessengerWindow(ex.id, peerName, av, peerUid);
  else {
    const doc = await db.collection('chats').add({
      participants: [myUid, peerUid], senderUid: myUid, receiverUid: peerUid,
      senderName: currentUserData.name, senderAvatar: currentUserData.avatar,
      receiverName: peerName, receiverAvatar: av, chatCategory: catOverride === 'Request' ? 'Request' : 'Inbox',
      isRequest: catOverride === 'Request', unread: false, lastSenderUid: '', lastMessage: 'Tap to chat', messages: [], timeMs: Date.now()
    });
    openMessengerWindow(doc.id, peerName, av, peerUid);
  }
}

async function openMessengerWindow(id, name, av, uid) {
  activeChatDocId = id; activeChatPeerName = name; activeChatPeerAvatar = av; activeChatPeerUid = uid;
  document.getElementById('msg-win-top-name').innerText = name;
  document.getElementById('msg-win-center-name').innerText = name;
  document.getElementById('msg-win-top-avatar').src = av;
  document.getElementById('msg-win-center-avatar').src = av;
  document.getElementById('pro-messenger-modal').style.display = 'flex';

  const c = cacheChats.find(x => x.id === id);
  if (c) {
    renderMessengerBubbles(c);
    if (c.unread) {
      c.unread = false; renderMessagesList();
      await db.collection('chats').doc(id).update({ unread: false }).catch(() => {});
    }
  }
}
function closeMessengerChat() { activeChatDocId = null; document.getElementById('pro-messenger-modal').style.display = 'none'; }

function renderMessengerBubbles(c) {
  const box = document.getElementById('msg-win-bubbles'), msgs = c.messages || [], myUid = currentUserData?.uid || '';
  box.innerHTML = msgs.map((m, i) => {
    const isMe = m.senderUid === myUid;
    let html = `<div onclick="deleteSingleMessageBubble(${i})" style="max-width:74%; padding:10px 14px; border-radius:18px; font-size:14px; background:${isMe ? '#2563eb' : '#f1f5f9'}; color:${isMe ? '#fff' : '#0f172a'};">${m.text}</div>`;
    if (m.type === 'image') html = `<img src="${m.mediaUrl}" onclick="deleteSingleMessageBubble(${i})" style="max-width:200px; border-radius:14px;">`;
    else if (m.type === 'audio') html = `<audio src="${m.mediaUrl}" controls style="height:32px; max-width:190px;"></audio>`;
    return `<div style="display:flex; justify-content:${isMe ? 'flex-end' : 'flex-start'};">${html}</div>`;
  }).join('');
  const b = document.getElementById('msg-win-body'); if (b) b.scrollTop = b.scrollHeight;
}

async function sendMessengerText() {
  const inp = document.getElementById('msg-win-input'), txt = inp.value.trim();
  if (!txt || !activeChatDocId) return;
  inp.value = ''; await appendMessageToActiveChat(txt, 'text', '');
}
async function sendMessengerThumb() { if (activeChatDocId) await appendMessageToActiveChat('👍', 'thumb', ''); }

function handleChatMediaUpload(e) {
  if (!e.target.files?.[0] || !activeChatDocId) return;
  const f = e.target.files[0], r = new FileReader();
  r.onload = async (ev) => await appendMessageToActiveChat(f.type.startsWith('video/') ? '🎬 Video' : '📷 Photo', f.type.startsWith('video/') ? 'video' : 'image', ev.target.result);
  r.readAsDataURL(f);
}

async function toggleRealVoiceRecording() {
  if (!activeChatDocId) return;
  if (isRecordingVoice && mediaRecorder) return stopAndSendVoiceNote();
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioChunks = []; mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunks.push(e.data); };
    mediaRecorder.onstop = () => {
      const r = new FileReader();
      r.onloadend = async () => await appendMessageToActiveChat('🎤 Voice Note', 'audio', r.result);
      r.readAsDataURL(new Blob(audioChunks, { type: 'audio/webm' }));
      stream.getTracks().forEach(t => t.stop());
    };
    mediaRecorder.start(); isRecordingVoice = true;
    document.getElementById('voice-rec-bar').style.display = 'flex';
  } catch (e) { showToast('⚠️ Microphone Allow करा!'); }
}
function stopAndSendVoiceNote() { if (mediaRecorder && isRecordingVoice) { mediaRecorder.stop(); isRecordingVoice = false; document.getElementById('voice-rec-bar').style.display = 'none'; } }

async function appendMessageToActiveChat(txt, type, url) {
  if (!currentUserData || !activeChatDocId) return;
  const c = cacheChats.find(x => x.id === activeChatDocId), arr = c && Array.isArray(c.messages) ? [...c.messages] : [];
  arr.push({ senderUid: currentUserData.uid, senderName: currentUserData.name, text: txt, type, mediaUrl: url || '', timeMs: Date.now() });
  await db.collection('chats').doc(activeChatDocId).update({ messages: arr, lastSenderUid: currentUserData.uid, lastMessage: `${currentUserData.name}: ${txt}`, unread: true, timeMs: Date.now() });
  if (activeChatPeerUid && activeChatPeerUid !== currentUserData.uid) {
    await pushRealNotification({ targetUid: activeChatPeerUid, type: 'message', actorUid: currentUserData.uid, actorName: currentUserData.name, actorHandle: currentUserData.handle, actorAvatar: currentUserData.avatar, text: `sent you a message ✉️: "${txt}"` });
  }
}

// =========================================================
// 5. 100% REAL INTERACTIVE NOTIFICATIONS (NO FAKE NOTIFS!)
// =========================================================
async function pushRealNotification(p) {
  try {
    if (!p?.actorName || !p?.text || String(p.actorUid || '').startsWith('simulated_user_')) return;
    await db.collection('notifications').add({
      targetUid: p.targetUid || 'all', actorUid: p.actorUid || currentUserData?.uid || '',
      actorName: p.actorName, actorHandle: p.actorHandle || '@' + p.actorName.toLowerCase().replace(/\s+/g, ''),
      actorAvatar: p.actorAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.actorName)}`,
      type: p.type || 'activity', text: p.text, itemId: p.itemId || '', itemCol: p.itemCol || '', postImg: p.postImg || '',
      unread: true, timeMs: Date.now(), createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch (e) {}
}

function listenToRealNotifications() {
  db.collection('notifications').onSnapshot(snap => {
    if (!currentUserData) return;
    const myUid = currentUserData.uid, valid = [];
    snap.docs.forEach(doc => {
      const n = doc.data();
      if (String(n.actorUid || '').startsWith('simulated_user_') || String(n.text || '').includes('Instagram Security Alert') || !n.actorName) {
        db.collection('notifications').doc(doc.id).delete().catch(() => {}); return;
      }
      if ((n.targetUid === myUid || n.targetUid === 'all') && n.actorUid !== myUid) valid.push({ id: doc.id, ...n });
    });
    cacheNotifications = sortByPinnedAndCreatedDesc(valid);
    renderProNotificationsList();
  });
}

function setupNotificationBell() {
  let b = document.querySelector('.header-bell-btn');
  if (b) b.onclick = () => { document.getElementById('pro-notifications-modal').style.display = 'flex'; renderProNotificationsList(); };
}
function closeProNotifications() { document.getElementById('pro-notifications-modal').style.display = 'none'; }
async function clearMyNotifications() { for (const n of cacheNotifications) await db.collection('notifications').doc(n.id).delete().catch(() => {}); showToast('🧹 सर्व क्लिअर केले!'); }

async function handleNotificationClick(notifId) {
  const n = cacheNotifications.find(x => x.id === notifId); if (!n) return;
  closeProNotifications();
  if (n.unread) db.collection('notifications').doc(notifId).update({ unread: false }).catch(() => {});
  const t = n.type || '', col = n.itemCol || (t.includes('reel') ? 'reels' : 'posts'), id = n.itemId || '';

  if (t === 'message') return startRealChat(n.actorUid, n.actorName, 'Inbox', n.actorAvatar);
  if (t === 'follow') return openUserProfile(n.actorUid);
  if ((t === 'comment' || t === 'comment_mention') && id) {
    openScrollableMediaFeed(col, id, 'Post', null, 'public_reel');
    setTimeout(() => openCommentsModal(id, col), 350); return;
  }
  if (id) return openScrollableMediaFeed(col, id, col === 'reels' ? 'Reels' : 'Posts', null, 'public_reel');
  if (n.actorUid) openUserProfile(n.actorUid);
}

function renderProNotificationsList() {
  const body = document.getElementById('pro-notif-list-body'); if (!body) return;
  if (!cacheNotifications.length) {
    body.innerHTML = `<div style="text-align:center; padding:50px 20px; color:#64748b;">🔔 सध्या कोणतेही नवीन नोटिफिकेशन नाही.</div>`; return;
  }
  body.innerHTML = cacheNotifications.map(n => `
    <div onclick="handleNotificationClick('${n.id}')" style="display:flex; align-items:center; gap:12px; padding:13px 16px; border-bottom:1px solid #f1f5f9; background:${n.unread ? '#f8fafc' : '#fff'}; cursor:pointer;">
      <img src="${n.actorAvatar}" onclick="event.stopPropagation(); closeProNotifications(); openUserProfile('${n.actorUid}')" style="width:46px; height:46px; border-radius:50%; object-fit:cover;">
      <div style="flex:1; font-size:13.5px;"><b>${n.actorHandle || n.actorName}</b> ${n.text}<div style="color:#64748b; font-size:11.5px;">${getRelativeTime(n.timeMs)}</div></div>
    </div>
  `).join('');
}

async function toggleLikeDislikeItem(itemId, colName = 'posts') {
  if (!currentUserData) return showToast('⚠️ लॉगिन करा!');
  const item = getCacheArrayByCol(colName).find(x => x.id === itemId); if (!item) return;
  const myUid = currentUserData.uid;
  let likedBy = Array.isArray(item.likedBy) ? [...item.likedBy] : [];
  let likes = typeof item.likes === 'number' ? item.likes : likedBy.length;

  if (likedBy.includes(myUid)) {
    likedBy = likedBy.filter(i => i !== myUid); likes = Math.max(0, likes - 1);
    await db.collection(colName).doc(itemId).update({ likedBy, likes });
  } else {
    likedBy.push(myUid); likes++;
    await db.collection(colName).doc(itemId).update({ likedBy, likes });
    if (item.uid && item.uid !== myUid) {
      await pushRealNotification({ targetUid: item.uid, type: colName === 'reels' ? 'reel_like' : 'like', actorUid: myUid, actorName: currentUserData.name, actorHandle: currentUserData.handle, actorAvatar: currentUserData.avatar, itemId, itemCol: colName, text: colName === 'reels' ? 'liked your Reel 🎬' : 'liked your post ❤️' });
    }
  }
}

async function submitRealComment() {
  if (!currentUserData || !activeCommentPostId) return;
  const inp = document.getElementById('pro-comment-input'), txt = inp.value.trim(); if (!txt) return;
  const item = getCacheArrayByCol(activeCommentCollection).find(x => x.id === activeCommentPostId);
  let list = (item && Array.isArray(item.commentsList)) ? [...item.commentsList] : [];
  list.push({ uid: currentUserData.uid, author: currentUserData.name, avatar: currentUserData.avatar, text: txt, timeMs: Date.now() });
  inp.value = '';
  await db.collection(activeCommentCollection).doc(activeCommentPostId).update({ commentsList: list, commentsCount: list.length });

  if (item && item.uid && item.uid !== currentUserData.uid) {
    await pushRealNotification({ targetUid: item.uid, type: 'comment', actorUid: currentUserData.uid, actorName: currentUserData.name, actorHandle: currentUserData.handle, actorAvatar: currentUserData.avatar, itemId: activeCommentPostId, itemCol: activeCommentCollection, text: `commented 💬: "${txt}"` });
  }
  renderCommentsList(activeCommentPostId);
}

// =========================================================
// 6. UNIVERSAL SEARCH & EXPLORE / NEARBY SUB-POINTS
// =========================================================
function bindAllSearchInputsLive() {
  const topEl = document.querySelector('#main-top-header input') || Array.from(document.querySelectorAll('#main-top-header *')).find(el => el.textContent?.trim() === 'Search');
  if (topEl && !topEl.dataset.boundH) {
    topEl.dataset.boundH = '1';
    const target = topEl.closest('div, button') || topEl;
    target.style.cursor = 'pointer';
    target.addEventListener('click', () => openHomeAccountSearchModal(''));
  }
  const exp = document.querySelector('#view-explore input');
  if (exp && !exp.dataset.b) { exp.id = 'explore-search-input'; exp.dataset.b = '1'; exp.addEventListener('input', renderExploreOffers); }
  const near = document.querySelector('#view-nearby input');
  if (near && !near.dataset.b) { near.id = 'nearby-search-input'; near.dataset.b = '1'; near.addEventListener('input', renderNearbyStores); }
  const msg = document.querySelector('#view-messages input');
  if (msg && !msg.dataset.b) { msg.id = 'msg-search-input'; msg.dataset.b = '1'; msg.addEventListener('input', renderMessagesList); }
}
setInterval(bindAllSearchInputsLive, 1500);

function openHomeAccountSearchModal(q = '') {
  document.getElementById('pro-home-search-modal').style.display = 'flex';
  const i = document.getElementById('home-acc-search-input'); if (q) i.value = q;
  setTimeout(() => i.focus(), 80); renderHomeAccountSearchResults();
}
function closeHomeAccountSearchModal() { document.getElementById('pro-home-search-modal').style.display = 'none'; }

function setHomeSearchTab(tab) {
  activeHomeAccountFilter = tab;
  ['all', 'people', 'business'].forEach(t => {
    const b = document.getElementById('h-tab-' + t);
    if (b) { b.style.background = (t === tab) ? '#4f46e5' : '#f1f5f9'; b.style.color = (t === tab) ? '#fff' : '#334155'; }
  });
  renderHomeAccountSearchResults();
}

function renderHomeAccountSearchResults() {
  const box = document.getElementById('home-acc-search-results');
  const q = (document.getElementById('home-acc-search-input')?.value || '').trim().toLowerCase();
  let list = cacheAllUsers.filter(u => {
    const isBiz = isUserBusinessAccount(u);
    if (activeHomeAccountFilter === 'people' && isBiz) return false;
    if (activeHomeAccountFilter === 'business' && !isBiz) return false;
    return !q || (u.name || '').toLowerCase().includes(q) || (u.handle || '').toLowerCase().includes(q) || (u.category || '').toLowerCase().includes(q) || (u.location || '').toLowerCase().includes(q);
  });
  box.innerHTML = list.length === 0 ? `<div style="text-align:center; padding:30px; color:#64748b;">अकाउंट सापडले नाही.</div>` : list.map(u => `
    <div onclick="closeHomeAccountSearchModal(); openUserProfile('${u.uid}')" style="display:flex; align-items:center; gap:12px; background:#fff; padding:12px; border-radius:16px; margin-bottom:8px; cursor:pointer;">
      <img src="${u.avatar}" style="width:48px; height:48px; border-radius:50%; object-fit:cover;">
      <div style="flex:1;"><div style="font-weight:800;">${u.name}</div><div style="font-size:12px; color:#64748b;">${isUserBusinessAccount(u) ? '🏪 ' + (u.category || 'Business') : '👤 People'} &bull; 📍 ${u.location || ''}</div></div>
      <button onclick="event.stopPropagation(); closeHomeAccountSearchModal(); startRealChat('${u.uid}', '${(u.name || 'User').replace(/'/g, '')}', 'Inbox', '${u.avatar || ''}')" style="background:#2563eb; color:#fff; border:none; padding:6px 12px; border-radius:10px; font-weight:700;">💬 Chat</button>
    </div>
  `).join('');
}

function listenToRealOffers() {
  db.collection('offers').onSnapshot(snap => {
    cacheOffers = sortByPinnedAndCreatedDesc(snap.docs.map(d => ({ id: d.id, _col: 'offers', ...d.data() })));
    renderExploreOffers();
    resolveChunksInBackground(cacheOffers, renderExploreOffers);
  });
}

function selectExploreChip(name, el) {
  activeExploreFilter = name;
  document.querySelectorAll('#view-explore .f-chip').forEach(c => c.classList.remove('active'));
  if (el) el.classList.add('active');
  renderExploreOffers();
}

// EXPLORE SUB-POINTS (Trending Reels, Offers, Jobs इ.)
function renderExploreOffers() {
  let box = document.getElementById('explore-offers-list'); if (!box) return;
  let q = (document.getElementById('explore-search-input')?.value || '').trim().toLowerCase();
  const chip = (activeExploreFilter || 'Offers').trim();

  if (chip.toLowerCase().includes('reel')) {
    const reelsList = CombinedReelsAndVideoPosts.filter(r => !q || (r.author || '').toLowerCase().includes(q) || (r.caption || '').toLowerCase().includes(q));
    window.currentExploreReelsList = reelsList;
    box.innerHTML = reelsList.length === 0 ? `<p style="text-align:center; padding:30px; color:#64748b;">सध्या कोणतीही Trending Reel नाही.</p>` : reelsList.map(r => {
      const col = r._col || 'reels', isVid = r.mediaType === 'video' || (r.img && r.img.startsWith('data:video'));
      const poster = r.avatar || 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=300&q=80';
      return `
        <div onclick="openScrollableMediaFeed('${col}', '${r.id}', 'Trending Reels', window.currentExploreReelsList, 'public_reel')" style="background:#fff; border-radius:16px; padding:12px; margin:10px 14px; display:flex; gap:14px; align-items:center; box-shadow:0 2px 8px rgba(0,0,0,0.05); cursor:pointer;">
          <div style="width:74px; height:96px; background:#0f172a; border-radius:12px; overflow:hidden; position:relative; flex-shrink:0;">
            ${r.img ? (isVid ? `<video src="${r.img}#t=0.1" poster="${poster}" style="width:100%; height:100%; object-fit:cover;" muted playsinline></video>` : `<img src="${r.img}" style="width:100%; height:100%; object-fit:cover;">`) : `<img src="${poster}" style="width:100%; height:100%; object-fit:cover;">`}
            <div style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.3); color:#fff;">▶</div>
          </div>
          <div style="flex:1;"><span style="background:#fee2e2; color:#dc2626; font-size:11px; font-weight:800; padding:3px 9px; border-radius:8px;">🎬 Reel &bull; ${r.views || 1} Views</span><h4 style="margin:8px 0 4px; font-size:16px;">${r.caption || 'Reel'}</h4><div style="font-size:12.5px; color:#64748b;">By ${r.author}</div></div>
        </div>
      `;
    }).join('');
    return;
  }

  if (chip.toLowerCase() === 'offers') {
    let list = cacheOffers.filter(o => !o.archived && (!q || (o.deal || '').toLowerCase().includes(q) || (o.bizName || '').toLowerCase().includes(q)));
    box.innerHTML = list.length === 0 ? `<p style="text-align:center; padding:30px; color:#64748b;">सध्या कोणतीही ऑफर नाही. '+ Create ➔ Offer' मधून नवीन ऑफर टाका!</p>` : list.map(o => `
      <div onclick="openScrollableMediaFeed('offers', '${o.id}', 'Offers', null, 'public_reel')" style="background-image:url('${o.img}'); height:145px; background-size:cover; border-radius:16px; margin:12px 14px; position:relative; padding:14px; display:flex; align-items:flex-end; color:#fff; cursor:pointer; overflow:hidden;">
        <div style="position:absolute; inset:0; background:linear-gradient(transparent,rgba(0,0,0,0.8));"></div>
        <div style="position:relative; z-index:1;"><div style="font-size:13px; font-weight:700; color:#38bdf8;">${o.bizName}</div><div style="font-size:18px; font-weight:900;">${o.deal}</div></div>
      </div>
    `).join('');
    return;
  }

  const cLow = chip.toLowerCase();
  const posts = cachePosts.filter(p => !p.archived && ((p.category || '').toLowerCase().includes(cLow) || (p.caption || '').toLowerCase().includes(cLow)) && (!q || (p.caption || '').toLowerCase().includes(q)));
  box.innerHTML = posts.length === 0 ? `<p style="text-align:center; padding:30px; color:#64748b;">सध्या <b>${chip}</b> मध्ये पोस्ट नाही.</p>` : posts.map(p => `
    <div onclick="openScrollableMediaFeed('posts', '${p.id}', '${chip}', null, 'public_reel')" style="background:#fff; border-radius:16px; padding:14px; margin:10px 14px; cursor:pointer;">
      <div style="font-weight:800;">${p.author} &bull; <span style="color:#4f46e5;">${p.category}</span></div>
      <div style="font-size:14px; margin-top:6px;">${p.caption}</div>
    </div>
  `).join('');
}

function filterNearbyCat(cat, el) {
  activeNearbyFilter = cat;
  document.querySelectorAll('#view-nearby .f-chip').forEach(c => c.classList.remove('active-blue', 'active'));
  if (el) el.classList.add('active-blue');
  renderNearbyStores();
}

function renderNearbyStores() {
  let box = document.getElementById('nearby-stores-list'); if (!box) return;
  let q = (document.getElementById('nearby-search-input')?.value || '').trim().toLowerCase();
  const cat = (activeNearbyFilter || 'All').trim().toLowerCase();

  let stores = cacheBusinesses.filter(s => {
    const sCat = (s.category || 'Shops').toLowerCase();
    const matchCat = (cat === 'all') || sCat.includes(cat) || sCat.includes(cat.replace(/s$/, ''));
    return matchCat && (!q || (s.name || '').toLowerCase().includes(q) || sCat.includes(q) || (s.location || '').toLowerCase().includes(q));
  });

  box.innerHTML = stores.length === 0 ? `<div style="text-align:center; padding:30px; color:#64748b;">अजून Business अकाउंट नाही.</div>` : stores.map(s => `
    <div style="background:#fff; border-radius:16px; padding:14px; margin:12px 14px; display:flex; gap:12px; box-shadow:0 2px 8px rgba(0,0,0,0.04);">
      <img src="${s.avatar}" onclick="openUserProfile('${s.uid}')" style="width:72px; height:72px; border-radius:12px; object-fit:cover; cursor:pointer;">
      <div style="flex:1;">
        <div onclick="openUserProfile('${s.uid}')" style="font-weight:800; font-size:15.5px; cursor:pointer;">${s.name}</div>
        <div style="font-size:12px; color:#4f46e5; font-weight:700;">${s.category || 'Shops'} &bull; 📍 ${s.location || 'Maharashtra'}</div>
        <div style="display:flex; gap:8px; margin-top:8px;">
          <button onclick="startRealChat('${s.uid}', '${(s.name || 'Store').replace(/'/g, '')}', 'Inbox', '${s.avatar || ''}')" style="background:#2563eb; color:#fff; border:none; padding:6px 12px; border-radius:8px; font-size:12px; font-weight:700;">💬 Message</button>
          <button onclick="openUserProfile('${s.uid}')" style="background:#f1f5f9; border:none; padding:6px 12px; border-radius:8px; font-size:12px; font-weight:700;">Visit Store</button>
        </div>
      </div>
    </div>
  `).join('');
}

// =========================================================
// 7. PROFILE, CATALOG & SETTINGS
// =========================================================
async function openUserProfile(uid) {
  if (!uid) return;
  const doc = await db.collection('users').doc(uid).get();
  if (!doc.exists) return;
  activeProfileUser = { uid: doc.id, ...doc.data() };
  ['home', 'explore', 'nearby', 'messages', 'profile'].forEach(v => {
    document.getElementById('view-' + v).style.display = (v === 'profile') ? 'block' : 'none';
    document.getElementById('bnav-' + v).classList.toggle('active', v === 'profile');
  });
  document.getElementById('main-top-header').style.display = 'none';
  renderProfileData(activeProfileUser);
}

function loadProfileView() { if (currentUserData) openUserProfile(currentUserData.uid); }

function renderProfileData(u) {
  const isMe = currentUserData && u.uid === currentUserData.uid;
  document.querySelectorAll('#view-profile .prof-top-right-group button').forEach(btn => {
    btn.innerHTML = isMe ? '<i class="fa-solid fa-gear"></i>' : '<i class="fa-solid fa-ellipsis-vertical"></i>';
    btn.onclick = () => isMe ? openSettingsScreen() : openOtherUserProfileMenu();
  });

  if (u.type === 'business') {
    document.getElementById('people-profile-box').style.display = 'none';
    document.getElementById('business-profile-box').style.display = 'block';
    document.getElementById('b-prof-name').innerText = u.name;
    document.getElementById('b-prof-cat').innerText = u.category || 'Business Store';
    document.getElementById('b-prof-about').innerText = u.about || '';
    document.getElementById('b-prof-loc').innerText = u.location || '';
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

function switchPeopleMediaTab(t, el) { activePeopleTab = t; document.querySelectorAll('#people-sub-tabs span').forEach(s => s.classList.remove('active')); if (el) el.classList.add('active'); renderProfileMediaGrid(); }

function renderProfileMediaGrid() {
  let grid = document.getElementById('people-media-grid'); if (!grid) return;
  let uid = activeProfileUser?.uid || currentUserData?.uid || '';
  let isMe = currentUserData && uid === currentUserData.uid, ctx = isMe ? 'profile_owner' : 'public_reel';
  let items = activePeopleTab === 'reels' ? cacheReels.filter(r => r.uid === uid && !r.archived) : cachePosts.filter(p => p.uid === uid && !p.archived);
  window.currentProfileGridList = items;
  grid.innerHTML = items.length === 0 ? `<div style="grid-column:1/-1; text-align:center; padding:24px; color:#64748b;">माहिती नाही.</div>` : items.map(item => `
    <div onclick="openScrollableMediaFeed('${item._col || 'posts'}', '${item.id}', 'Profile', window.currentProfileGridList, '${ctx}')" style="position:relative; aspect-ratio:1/1; border-radius:12px; overflow:hidden; background:#0f172a; cursor:pointer;">
      ${item.mediaType === 'video' ? `<video src="${item.img}#t=0.1" style="width:100%; height:100%; object-fit:cover;" muted playsinline></video>` : `<img src="${item.img}" style="width:100%; height:100%; object-fit:cover;">`}
    </div>
  `).join('');
}

function switchBizMediaTab(t, el) { activeBizTab = t; document.querySelectorAll('#business-profile-box .prof-sub-tabs span').forEach(s => s.classList.remove('active')); if (el) el.classList.add('active'); renderBizMediaSection(); }

function renderBizMediaSection() {
  let box = document.getElementById('biz-mini-products'); if (!box) return;
  let uid = activeProfileUser?.uid || currentUserData?.uid || '';
  let items = activeBizTab === 'Posts' ? cachePosts.filter(p => p.uid === uid) : (activeBizTab === 'Reels' ? cacheReels.filter(r => r.uid === uid) : cacheProducts.filter(p => p.uid === uid));
  box.innerHTML = items.length === 0 ? `<div style="padding:16px; color:#64748b;">माहिती नाही.</div>` : items.map(i => `
    <div onclick="openScrollableMediaFeed('${i._col || 'products'}', '${i.id}', 'Business', null, 'public_reel')" style="min-width:130px; background:#f8fafc; padding:8px; border-radius:12px; margin-right:10px; text-align:center;">
      <img src="${i.img}" style="width:100%; height:95px; object-fit:cover; border-radius:8px;">
      <div style="font-size:12px; font-weight:700; margin-top:4px;">${i.title || i.caption || 'Item'}</div>
    </div>
  `).join('');
}

async function toggleFollowPeopleProfile() { await executeRealFollow(); }
async function toggleFollowActiveBiz() { await executeRealFollow(); }
async function executeRealFollow() {
  if (!currentUserData || !activeProfileUser || currentUserData.uid === activeProfileUser.uid) return;
  const myUid = currentUserData.uid, tUid = activeProfileUser.uid;
  const ref = db.collection('users').doc(tUid).collection('followers').doc(myUid), snap = await ref.get();
  if (!snap.exists) {
    await ref.set({ uid: myUid });
    await db.collection('users').doc(tUid).update({ followersCount: firebase.firestore.FieldValue.increment(1) });
    await pushRealNotification({ targetUid: tUid, type: 'follow', actorUid: myUid, actorName: currentUserData.name, actorHandle: currentUserData.handle, actorAvatar: currentUserData.avatar, text: 'started following you 👥' });
    showToast(`✅ Followed ${activeProfileUser.name}!`);
  } else {
    await ref.delete();
    await db.collection('users').doc(tUid).update({ followersCount: firebase.firestore.FieldValue.increment(-1) });
    showToast('Unfollowed');
  }
  openUserProfile(tUid);
}

function startChatWithActiveBiz() { if (activeProfileUser) startRealChat(activeProfileUser.uid, activeProfileUser.name, 'Inbox', activeProfileUser.avatar); }
function callActiveBiz() { window.location.href = `tel:${activeProfileUser?.phone || '9876543210'}`; }
function directionsActiveBiz() { openGoogleMapLink(activeProfileUser?.location || 'Ardhapur, Maharashtra'); }

function openFullCatalogModal() { document.getElementById('catalog-modal').style.display = 'flex'; renderCatalogGrid(); }
function closeCatalogModal() { document.getElementById('catalog-modal').style.display = 'none'; }
function filterCatalogItems(c, el) { activeCatalogFilter = c; renderCatalogGrid(); }
function searchCatalogItems() { renderCatalogGrid(); }

function renderCatalogGrid() {
  let box = document.getElementById('catalog-grid-box'); if (!box) return;
  box.innerHTML = cacheProducts.map(p => `<div onclick="openProductDetail('${p.id}')" style="background:#fff; border-radius:14px; padding:10px;"><img src="${p.img}" style="width:100%; height:130px; object-fit:cover; border-radius:10px;"><h4>${p.title}</h4><b style="color:#2563eb;">${p.price}</b></div>`).join('');
}
function openProductDetail(id) {
  let p = cacheProducts.find(x => x.id === id); if (!p) return;
  document.getElementById('pd-main-img').src = p.img; document.getElementById('pd-title').innerText = p.title;
  document.getElementById('pd-price').innerText = p.price; document.getElementById('product-detail-modal').style.display = 'flex';
}
function closeProductDetailModal() { document.getElementById('product-detail-modal').style.display = 'none'; }

async function editUserField(k, label) {
  if (!currentUserData) return;
  let v = prompt(`नवीन ${label} टाका:`, currentUserData[k] || ''); if (!v) return;
  await db.collection('users').doc(currentUserData.uid).update({ [k]: v });
  currentUserData[k] = v; localStorage.setItem(ALBIZNET_SESSION_KEY, JSON.stringify(currentUserData));
  openUserProfile(currentUserData.uid);
}

async function switchUserRoleTo(newType) {
  if (!currentUserData) return;
  let cat = newType === 'business' ? (prompt('व्यवसायाची कॅटेगरी (Shops, Services, Restaurants):', 'Shops') || 'Shops') : 'Personal Account';
  await db.collection('users').doc(currentUserData.uid).update({ type: newType, category: cat });
  currentUserData.type = newType; currentUserData.category = cat;
  localStorage.setItem(ALBIZNET_SESSION_KEY, JSON.stringify(currentUserData));
  syncMarketplaceTabVisibility(); closeSettingsScreen(); openUserProfile(currentUserData.uid);
  showToast(`🔄 अकाउंट ${newType.toUpperCase()} मध्ये बदलले!`);
}

function openSettingsScreen() {
  if (!currentUserData) return;
  document.getElementById('set-banner-name').innerText = currentUserData.name;
  document.getElementById('settings-grid-content').innerHTML = `
    <div style="background:#fff; padding:14px; border-radius:14px; margin-bottom:12px;">
      <div onclick="editUserField('name', 'नाव')" style="padding:8px 0; border-bottom:1px solid #f1f5f9;">✏️ नाव बदला</div>
      <div onclick="editUserField('about', 'माहिती')" style="padding:8px 0; border-bottom:1px solid #f1f5f9;">📝 बायो बदला</div>
      <div onclick="editUserField('location', 'लोकेशन')" style="padding:8px 0;">📍 लोकेशन बदला</div>
    </div>
    <div style="background:#fff; padding:14px; border-radius:14px;">
      <div onclick="switchUserRoleTo('business')" style="padding:8px 0; border-bottom:1px solid #f1f5f9;">🏪 Switch to Business Store</div>
      <div onclick="switchUserRoleTo('people')" style="padding:8px 0;">👤 Switch to Personal Account</div>
    </div>
  `;
  document.getElementById('settings-modal').style.display = 'flex';
}
function closeSettingsScreen() { document.getElementById('settings-modal').style.display = 'none'; }

async function logoutCurrentUser() {
  localStorage.removeItem(ALBIZNET_SESSION_KEY);
  if (auth) await auth.signOut().catch(() => {});
  currentUserData = null; activeProfileUser = null; closeSettingsScreen();
  document.getElementById('main-app-shell').style.display = 'none';
  document.getElementById('welcome-screen').style.display = 'flex';
}

function switchBottomNav(tab) {
  ['home', 'explore', 'nearby', 'messages', 'profile'].forEach(v => {
    document.getElementById('view-' + v).style.display = (v === tab) ? 'block' : 'none';
    document.getElementById('bnav-' + v).classList.toggle('active', v === tab);
  });
  document.getElementById('main-top-header').style.display = (tab === 'home' || tab === 'explore') ? 'flex' : 'none';
  if (tab === 'messages') syncMarketplaceTabVisibility();
  if (tab === 'profile') loadProfileView();
  window.scrollTo(0, 0);
}

function openImageLightbox(url, cap) { if (!url) return; document.getElementById('lightbox-img').src = url; document.getElementById('gallery-lightbox-modal').style.display = 'flex'; }
function closeImageLightbox() { document.getElementById('gallery-lightbox-modal').style.display = 'none'; }
function openGoogleMapLink(q) { window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q || 'Ardhapur, Maharashtra')}`, '_blank'); }
