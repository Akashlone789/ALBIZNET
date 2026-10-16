let currentAccountType = 'people';
let loginVerifyType = 'mobile';
let signupVerifyType = 'mobile';
let generatedOTP = "";
let uploadedImgURL = "";
let userCurrentCoords = { lat: 19.1383, lng: 77.3210 };

let currentUser = JSON.parse(localStorage.getItem("albiz_user")) || null;
let savedPosts = JSON.parse(localStorage.getItem("albiz_posts")) || [];

let allBusinesses = [
  { name: "Maharashtra Electronics", owner: "संतोष देशमुख", products: "Mobile, Laptop, TV", location: "Main Market, Nanded", lat: 19.1400, lng: 77.3200, contact: "9876543210" },
  { name: "Shree Ganesh Kirana Stores", owner: "राहुल पाटील", products: "Grocery, Daily Needs", location: "Near Bus Stand, Buldana", lat: 19.4650, lng: 76.5580, contact: "8765432109" },
  { name: "Royal Fashion & Clothings", owner: "स्नेहा शहा", products: "Mens & Womens Wear", location: "Shivaji Nagar, Nanded", lat: 19.1500, lng: 77.3150, contact: "7654321098" }
];

window.onload = function() {
  const customUI = `
    <div id="custom-toast" style="display:none; position:fixed; top:18px; left:50%; transform:translateX(-50%); background:linear-gradient(90deg, #0284c7, #7e22ce); color:white; padding:12px 20px; border-radius:30px; z-index:9999; font-size:13px; font-weight:600; box-shadow:0 8px 25px rgba(0,0,0,0.4); width:90%; max-width:360px; text-align:center; border:1px solid rgba(255,255,255,0.3);"></div>

    <div id="native-google-modal" class="modal-overlay" style="z-index:3000; display:none;">
      <div class="modal-box" style="background:white; color:#1e293b; max-width:340px; text-align:center; padding:20px; border-radius:24px; box-shadow:0 15px 35px rgba(0,0,0,0.3);">
        <img src="https://www.gstatic.com/images/branding/googlelogo/2x/googlelogo_color_92x30dp.png" style="height:24px; margin-bottom:6px;">
        <h3 style="font-size:17px; font-weight:700; color:#0f172a; margin-bottom:4px;">Sign in with Google</h3>
        <p style="font-size:11.5px; color:#64748b; margin-bottom:14px;">Choose your Gmail account for <b>ALBIZNET</b></p>
        
        <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:14px; padding:12px; margin-bottom:12px; text-align:left;">
          <label style="font-size:11px; font-weight:600; color:#475569; display:block; margin-bottom:4px;">तुमचा Gmail आयडी टाका / निवडा:</label>
          <input type="email" id="native-gmail-input" autocomplete="email" placeholder="yourname@gmail.com" style="width:100%; padding:10px 12px; border:1px solid #94a3b8; border-radius:10px; font-size:13px; background:white; color:#0f172a; outline:none;">
        </div>

        <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:14px; padding:10px 12px; margin-bottom:14px; text-align:left;">
          <label style="font-size:11px; font-weight:600; color:#475569; display:block; margin-bottom:4px;">तुमचे किंवा व्यवसायाचे नाव:</label>
          <input type="text" id="native-name-input" placeholder="उदा. Akash Lone" style="width:100%; padding:8px 10px; border:1px solid #94a3b8; border-radius:8px; font-size:13px; background:white; color:#0f172a; outline:none;">
        </div>

        <button onclick="submitNativeGoogle()" style="width:100%; padding:11px; background:#1a73e8; color:white; border:none; border-radius:20px; font-weight:700; font-size:13.5px; cursor:pointer; margin-bottom:8px;">Continue</button>
        <button onclick="document.getElementById('native-google-modal').style.display='none'" style="background:none; border:none; color:#64748b; font-size:12px; font-weight:600; cursor:pointer;">Cancel</button>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', customUI);

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition((position) => {
      userCurrentCoords.lat = position.coords.latitude;
      userCurrentCoords.lng = position.coords.longitude;
    });
  }

  if (currentUser) {
    document.getElementById("welcome-screen").style.display = "none";
    document.getElementById("app-feed-screen").style.display = "block";
    renderSavedPosts();
  }
};

function showToast(msg) {
  const t = document.getElementById("custom-toast");
  if (!t) return;
  t.innerHTML = msg;
  t.style.display = "block";
  setTimeout(() => { t.style.display = "none"; }, 4000);
}

function openLoginModal() { document.getElementById("login-modal").style.display = "flex"; }
function openSignupModal() { document.getElementById("signup-modal").style.display = "flex"; }
function openCreateModal() { document.getElementById("create-modal").style.display = "flex"; }
function closeModals() {
  document.getElementById("login-modal").style.display = "none";
  document.getElementById("signup-modal").style.display = "none";
  document.getElementById("create-modal").style.display = "none";
  document.getElementById("profile-modal").style.display = "none";
  let gm = document.getElementById("native-google-modal");
  if (gm) gm.style.display = "none";
}

function selectAccountType(type) {
  currentAccountType = type;
  document.getElementById("tab-people").classList.toggle("active", type === 'people');
  document.getElementById("tab-business").classList.toggle("active", type === 'business');
  document.getElementById("people-fields").style.display = (type === 'people') ? "block" : "none";
  document.getElementById("business-fields").style.display = (type === 'business') ? "block" : "none";
}

function switchVerifyMethod(modal, method) {
  if (modal === 'login') {
    loginVerifyType = method;
    document.getElementById("login-tab-mob").classList.toggle("active", method === 'mobile');
    document.getElementById("login-tab-mail").classList.toggle("active", method === 'email');
    document.getElementById("login-mob-box").style.display = (method === 'mobile') ? "block" : "none";
    document.getElementById("login-mail-box").style.display = (method === 'email') ? "block" : "none";
  } else {
    signupVerifyType = method;
    document.getElementById("signup-tab-mob").classList.toggle("active", method === 'mobile');
    document.getElementById("signup-tab-mail").classList.toggle("active", method === 'email');
    document.getElementById("signup-mob-box").style.display = (method === 'mobile') ? "block" : "none";
    document.getElementById("signup-mail-box").style.display = (method === 'email') ? "block" : "none";
  }
}

function sendOTP(mode, via) {
  generatedOTP = Math.floor(1000 + Math.random() * 9000).toString();
  if (via === 'mobile') {
    let mob = document.getElementById(mode + "-mobile").value;
    if (!mob || mob.length < 10) { showToast("⚠️ कृपया १० अंकी मोबाईल नंबर टाका!"); return; }
    showToast(`📱 SMS OTP (${mob}): <b>${generatedOTP}</b>`);
  } else {
    let mail = document.getElementById(mode + "-email").value;
    if (!mail || !mail.includes("@")) { showToast("⚠️ कृपया वैध Gmail आयडी टाका!"); return; }
    showToast(`✉️ Gmail OTP (${mail}): <b>${generatedOTP}</b>`);
  }
  document.getElementById(mode + "-otp").value = generatedOTP;
}

function handleGoogleSignIn() {
  document.getElementById("native-google-modal").style.display = "flex";
}

function submitNativeGoogle() {
  let email = document.getElementById("native-gmail-input").value;
  let name = document.getElementById("native-name-input").value;
  if (!email || !email.includes("@")) { showToast("⚠️ कृपया वैध Gmail टाका!"); return; }
  if (!name) name = email.split("@")[0];

  currentUser = {
    type: currentAccountType,
    name: name,
    owner: name,
    dob: "2000-01-01",
    products: "All Services",
    location: "Nanded, Maharashtra",
    lat: userCurrentCoords.lat,
    lng: userCurrentCoords.lng,
    contact: email + " (Google Verified ✅)"
  };

  localStorage.setItem("albiz_user", JSON.stringify(currentUser));
  closeModals();
  document.getElementById("welcome-screen").style.display = "none";
  document.getElementById("app-feed-screen").style.display = "block";
  showToast(`🎉 स्वागत आहे, ${currentUser.name}!`);
  renderSavedPosts();
}

function detectGPS(inputId) {
  let input = document.getElementById(inputId);
  input.value = "🛰️ Google GPS शोधत आहे...";
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        userCurrentCoords.lat = position.coords.latitude;
        userCurrentCoords.lng = position.coords.longitude;
        input.value = `GPS Location (${userCurrentCoords.lat.toFixed(2)}, ${userCurrentCoords.lng.toFixed(2)})`;
        showToast("📍 Google GPS लोकेशन जोडले!");
      },
      () => {
        input.value = "Nanded, Maharashtra";
        showToast("📍 लोकेशन सेट झाले!");
      },
      { timeout: 8000 }
    );
  } else {
    input.value = "Nanded, Maharashtra";
  }
}

function handleSignup() {
  let loc = document.getElementById("signup-location").value || "Nanded, Maharashtra";
  let contactVal = (signupVerifyType === 'mobile') ? document.getElementById("signup-mobile").value : document.getElementById("signup-email").value;
  let otp = document.getElementById("signup-otp").value;

  if (!contactVal || !otp) { showToast("⚠️ कृपया संपर्क आणि OTP भरा!"); return; }
  if (generatedOTP !== "" && otp !== generatedOTP) { showToast("❌ चुकीचा OTP टाकला आहे!"); return; }

  if (currentAccountType === 'people') {
    let name = document.getElementById("p-name").value;
    let dob = document.getElementById("p-dob").value;
    if (!name || !dob) { showToast("⚠️ कृपया नाव आणि जन्मतारीख भरा!"); return; }
    currentUser = { type: "people", name: name, dob: dob, location: loc, lat: userCurrentCoords.lat, lng: userCurrentCoords.lng, contact: contactVal };
  } else {
    let bName = document.getElementById("b-name").value;
    let owner = document.getElementById("b-owner").value;
    let prods = document.getElementById("b-products").value;
    if (!bName || !owner || !prods) { showToast("⚠️ कृपया व्यवसायाची सर्व माहिती भरा!"); return; }
    currentUser = { type: "business", name: bName, owner: owner, location: loc, lat: userCurrentCoords.lat, lng: userCurrentCoords.lng, contact: contactVal, products: prods };
    allBusinesses.push({ name: bName, owner: owner, products: prods, location: loc, lat: userCurrentCoords.lat, lng: userCurrentCoords.lng, contact: contactVal });
    localStorage.setItem("albiz_businesses", JSON.stringify(allBusinesses));
  }

  localStorage.setItem("albiz_user", JSON.stringify(currentUser));
  closeModals();
  document.getElementById("welcome-screen").style.display = "none";
  document.getElementById("app-feed-screen").style.display = "block";
  showToast(`🎉 अकाउंट तयार झाले! स्वागत आहे, ${currentUser.name}`);
  renderSavedPosts();
}

function handleLogin() {
  let contactVal = (loginVerifyType === 'mobile') ? document.getElementById("login-mobile").value : document.getElementById("login-email").value;
  let otp = document.getElementById("login-otp").value;
  if (!contactVal || !otp) { showToast("⚠️ कृपया नंबर आणि OTP भरा!"); return; }
  if (generatedOTP !== "" && otp !== generatedOTP) { showToast("❌ चुकीचा OTP!"); return; }

  if (!currentUser) {
    let shortName = contactVal.includes("@") ? contactVal.split("@")[0] : "User (" + contactVal.slice(-4) + ")";
    currentUser = { type: "people", name: shortName, dob: "2000-01-01", location: "Nanded, Maharashtra", lat: userCurrentCoords.lat, lng: userCurrentCoords.lng, contact: contactVal };
    localStorage.setItem("albiz_user", JSON.stringify(currentUser));
  }
  closeModals();
  document.getElementById("welcome-screen").style.display = "none";
  document.getElementById("app-feed-screen").style.display = "block";
  showToast(`✅ लॉगिन यशस्वी!`);
  renderSavedPosts();
}

function loadNewPostImg(e) {
  if (e.target.files && e.target.files[0]) {
    let reader = new FileReader();
    reader.onload = function(evt) { uploadedImgURL = evt.target.result; };
    reader.readAsDataURL(e.target.files[0]);
  }
}

function publishPost() {
  let text = document.getElementById("new-post-text").value;
  let loc = document.getElementById("new-post-loc").value || currentUser.location;
  if (!text && !uploadedImgURL) { showToast("⚠️ कृपया कॅप्शन लिहा किंवा फोटो निवडा!"); return; }

  let newPost = {
    author: currentUser ? currentUser.name : "ALBIZNET User",
    type: currentUser ? currentUser.type : "people",
    owner: currentUser ? currentUser.owner : "",
    products: currentUser ? currentUser.products : "",
    text: text, location: loc, img: uploadedImgURL
  };

  savedPosts.unshift(newPost);
  localStorage.setItem("albiz_posts", JSON.stringify(savedPosts));
  uploadedImgURL = "";
  document.getElementById("new-post-text").value = "";
  closeModals();
  showToast("🚀 तुमची पोस्ट पब्लिश झाली!");
  renderSavedPosts();
}

function renderSavedPosts() {
  let feed = document.getElementById("posts-feed");
  document.querySelectorAll(".user-added-post").forEach(e => e.remove());
  let html = "";
  savedPosts.forEach((p) => {
    let shortLoc = p.location.split(",")[0];
    let badge = p.type === 'business' ? `<span class="biz-badge">🏪 Business (${p.owner})</span>` : `Public`;
    let prodBar = (p.type === 'business' && p.products) ? `<div><span class="prod-pill">🛍️ ${p.products}</span></div>` : "";
    let media = p.img ? `<div class="post-media-box"><img src="${p.img}"><div class="location-overlay"><i class="fa-solid fa-location-dot"></i> ${p.location}</div></div>` : "";

    html += `
      <div class="post-card user-added-post">
        <div class="author-box">
          <img class="author-img" src="https://i.pravatar.cc/150?img=11">
          <div>
            <div class="author-name">${p.author} <i class="fa-solid fa-certificate blue-tick"></i></div>
            <div class="post-meta"><i class="fa-solid fa-location-dot"></i> ${shortLoc} &bull; ${badge}</div>
          </div>
        </div>
        <div class="post-caption">${p.text}</div>
        ${prodBar}
        ${media}
        <div class="post-buttons">
          <button class="btn-vibe" onclick="giveVibe(this)"><i class="fa-solid fa-fire"></i> Vibe</button>
          <button class="btn-secondary-act" onclick="toggleReplyBox(this)"><i class="fa-regular fa-comment-dots"></i> Reply</button>
          <button class="btn-secondary-act" onclick="remixPost('${p.author}')"><i class="fa-solid fa-wand-magic-sparkles"></i> Remix</button>
        </div>
        <div class="reply-box">
          <div class="reply-input-row">
            <input type="text" placeholder="कमेंट लिहा...">
            <button onclick="addReply(this)">Send</button>
          </div>
          <div class="replies-list"></div>
        </div>
      </div>
    `;
  });
  feed.insertAdjacentHTML('afterbegin', html);
}

function giveVibe(btn) { btn.innerHTML = `<i class="fa-solid fa-fire"></i> Vibed! 🔥`; }
function toggleReplyBox(el) {
  let box = el.closest(".post-card").querySelector(".reply-box");
  box.style.display = (box.style.display === "block") ? "none" : "block";
}
function addReply(btn) {
  let input = btn.parentElement.querySelector("input");
  let list = btn.parentElement.nextElementSibling;
  if (!input.value) return;
  let uName = currentUser ? currentUser.name : "You";
  list.innerHTML += `<div class="reply-item"><b>${uName}:</b> ${input.value}</div>`;
  input.value = "";
}
function remixPost(author) {
  document.getElementById("new-post-text").value = `🔄 Remixed from @${author}: `;
  openCreateModal();
}

function switchFeedTab(tab) {
  document.getElementById("tab-foryou").classList.toggle("active", tab === 'foryou');
  document.getElementById("tab-nearby").classList.toggle("active", tab === 'nearby');
  document.getElementById("tab-creators").classList.toggle("active", tab === 'creators');

  if (tab === 'nearby') {
    let storedBiz = JSON.parse(localStorage.getItem("albiz_businesses")) || allBusinesses;
    let bizHTML = `<div class="post-card user-added-post" style="background:linear-gradient(135deg, #f0fdf4, #e0f2fe); border:1px solid #38bdf8;">
      <h3 style="font-size:15px; color:#0f172a; margin-bottom:8px;"><i class="fa-solid fa-store" style="color:#0284c7;"></i> तुमच्या आजूबाजूची दुकाने (Nearby Stores):</h3>`;
    
    storedBiz.forEach(b => {
      let mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(b.name + " " + b.location)}`;
      bizHTML += `
        <div style="background:white; padding:10px; border-radius:12px; margin-bottom:8px; border:1px solid #e2e8f0;">
          <div style="font-weight:700; font-size:14px; color:#0f172a;">🏪 ${b.name}</div>
          <div style="font-size:12px; color:#475569;">👨‍💼 मालक: ${b.owner} | 🛍️ ${b.products}</div>
          <div style="font-size:11.5px; color:#2563eb; margin-top:3px;"><i class="fa-solid fa-location-dot"></i> ${b.location}</div>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-top:6px;">
            <span style="font-size:11px; color:#16a34a; font-weight:600;"><i class="fa-solid fa-phone"></i> ${b.contact}</span>
            <a href="${mapUrl}" target="_blank" style="background:#0284c7; color:white; text-decoration:none; padding:4px 10px; border-radius:15px; font-size:10.5px; font-weight:600;">🗺️ Google Map वर पहा</a>
          </div>
        </div>`;
    });
    bizHTML += `</div>`;
    
    let feed = document.getElementById("posts-feed");
    document.querySelectorAll(".user-added-post").forEach(e => e.remove());
    feed.insertAdjacentHTML('afterbegin', bizHTML);
    showToast("📍 तुमच्या परिसरातील दुकाने लोड झाली!");
  } else if (tab === 'foryou') {
    renderSavedPosts();
  }
}

function showMyProfile() {
  if (!currentUser) return;
  document.getElementById("prof-name").innerText = currentUser.name;
  document.getElementById("prof-type").innerText = currentUser.type === 'business' ? "🏪 BUSINESS ACCOUNT" : "👤 PERSONAL ACCOUNT";
  document.getElementById("prof-loc").innerHTML = `<i class="fa-solid fa-location-dot"></i> ${currentUser.location}`;
  let extraBox = document.getElementById("prof-extra");
  if (currentUser.type === 'business') {
    extraBox.innerHTML = `<p><b>👨‍💼 मालक:</b> ${currentUser.owner}</p><p><b>🛍️ प्रॉडक्ट्स:</b> ${currentUser.products}</p><p><b>📞 संपर्क:</b> ${currentUser.contact}</p>`;
  } else {
    extraBox.innerHTML = `<p><b>🎂 जन्मतारीख:</b> ${currentUser.dob}</p><p><b>📞 संपर्क:</b> ${currentUser.contact}</p>`;
  }
  document.getElementById("profile-modal").style.display = "flex";
}

function logoutUser() {
  localStorage.removeItem("albiz_user");
  currentUser = null;
  closeModals();
  document.getElementById("app-feed-screen").style.display = "none";
  document.getElementById("welcome-screen").style.display = "flex";
  showToast("👋 यशस्वीरित्या Log Out झाले!");
}
