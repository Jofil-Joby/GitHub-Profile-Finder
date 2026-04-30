// ── GITHUB TOKEN (paste your new token here after deleting the old one) ──
var GITHUB_TOKEN = "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";

function getHeaders() {
  return { "Authorization": "token " + GITHUB_TOKEN };
}

// ── STATE ──
var currentUser = null;
var allRepos = [];
var reposPage = 1;
var currentSort = "stars";
var compareUser = null;
var searchTimer = null;
var isLight = false;

// ── POPULAR GITHUB USERS (for suggestions when field is empty) ──
var popularUsers = [
  { login: "torvalds", name: "Linus Torvalds", followers: "230k" },
  { login: "gaearon", name: "Dan Abramov", followers: "86k" },
  { login: "sindresorhus", name: "Sindre Sorhus", followers: "70k" },
  { login: "yyx990803", name: "Evan You", followers: "90k" },
  { login: "tj", name: "TJ Holowaychuk", followers: "50k" },
  { login: "addyosmani", name: "Addy Osmani", followers: "43k" },
];

// ── LANGUAGE COLORS (for repo cards) ──
var langColors = {
  "JavaScript": "#f7df1e", "TypeScript": "#3178c6", "Python": "#3776ab",
  "Java": "#b07219", "C++": "#f34b7d", "C": "#555555", "C#": "#239120",
  "Ruby": "#cc342d", "Go": "#00add8", "Rust": "#dea584", "PHP": "#777bb4",
  "Swift": "#f05138", "Kotlin": "#7f52ff", "HTML": "#e34c26", "CSS": "#264de3",
  "Shell": "#89e051", "Dart": "#00b4ab", "Vue": "#4fc08d", "Svelte": "#ff3e00",
};

// ── ON PAGE LOAD ──
window.onload = function () {
  loadHistory();
  loadFavourites();
  checkRateLimit();

  // check URL for ?user= param (share feature)
  var params = new URLSearchParams(window.location.search);
  var sharedUser = params.get("user");
  if (sharedUser) {
    document.getElementById("uname").value = sharedUser;
    fetchProfile();
  }
};

// ── KEYBOARD SHORTCUTS ──
document.addEventListener("keydown", function (e) {
  // Press "/" to focus search
  if (e.key === "/" && document.activeElement !== document.getElementById("uname")) {
    e.preventDefault();
    document.getElementById("uname").focus();
  }
  // Escape to close suggestions
  if (e.key === "Escape") {
    closeSuggestions();
    document.getElementById("uname").blur();
  }
});

// ── SEARCH INPUT EVENTS ──
var unameInput = document.getElementById("uname");

unameInput.addEventListener("input", function () {
  var val = this.value.trim();

  // show/hide clear button
  document.getElementById("clearBtn").style.display = val ? "block" : "none";

  // live search suggestions with debounce
  clearTimeout(searchTimer);
  if (val.length >= 1) {
    searchTimer = setTimeout(function () {
      fetchSuggestions(val);
    }, 350);
  } else {
    showPopularSuggestions();
  }
});

unameInput.addEventListener("focus", function () {
  if (this.value.trim().length === 0) {
    showPopularSuggestions();
  }
});

unameInput.addEventListener("keydown", function (e) {
  if (e.key === "Enter") {
    closeSuggestions();
    fetchProfile();
  }
});

document.getElementById("clearBtn").onclick = function () {
  unameInput.value = "";
  this.style.display = "none";
  closeSuggestions();
  unameInput.focus();
};

// close suggestions when clicking outside
document.addEventListener("click", function (e) {
  if (!document.getElementById("searchBox").contains(e.target)) {
    closeSuggestions();
  }
});

// ── FETCH SUGGESTIONS FROM GITHUB API ──
function fetchSuggestions(query) {
  fetch("https://api.github.com/search/users?q=" + encodeURIComponent(query) + "&per_page=6&sort=followers", { headers: getHeaders() })
    .then(function (res) { return res.json(); })
    .then(function (data) {
      if (data.items && data.items.length > 0) {
        renderSuggestions(data.items, false);
      } else {
        closeSuggestions();
      }
    })
    .catch(function () { closeSuggestions(); });
}

// ── SHOW POPULAR USERS ──
function showPopularSuggestions() {
  var box = document.getElementById("suggestions");
  box.innerHTML = "";

  var header = document.createElement("div");
  header.style.cssText = "padding:8px 16px 4px; font-size:11px; color:var(--muted); text-transform:uppercase; letter-spacing:0.08em;";
  header.textContent = "🔥 Popular Developers";
  box.appendChild(header);

  popularUsers.forEach(function (u) {
    var item = document.createElement("div");
    item.className = "suggestion-item";
    item.innerHTML =
      '<img src="https://github.com/' + u.login + '.png?size=56" alt="">' +
      '<div>' +
      '<div class="suggestion-name">' + u.login + '</div>' +
      '<div class="suggestion-meta">' + u.name + '</div>' +
      '</div>' +
      '<span class="suggestion-badge">⭐ ' + u.followers + '</span>';
    item.onmousedown = function (e) {
      e.preventDefault(); // stops input from losing focus before click fires
      document.getElementById("uname").value = u.login;
      document.getElementById("clearBtn").style.display = "block";
      closeSuggestions();
      fetchProfile();
    };
    box.appendChild(item);
  });

  box.style.display = "block";
}

// ── RENDER SEARCH SUGGESTIONS ──
function renderSuggestions(users, isPopular) {
  var box = document.getElementById("suggestions");
  box.innerHTML = "";

  users.forEach(function (u) {
    var item = document.createElement("div");
    item.className = "suggestion-item";
    item.innerHTML =
      '<img src="' + u.avatar_url + '" alt="">' +
      '<div>' +
      '<div class="suggestion-name">' + u.login + '</div>' +
      '<div class="suggestion-meta">github.com/' + u.login + '</div>' +
      '</div>' +
      (u.score ? '<span class="suggestion-badge">match</span>' : '');
    item.onmousedown = function (e) {
      e.preventDefault(); // stops input from losing focus before click fires
      document.getElementById("uname").value = u.login;
      document.getElementById("clearBtn").style.display = "block";
      closeSuggestions();
      fetchProfile();
    };
    box.appendChild(item);
  });

  box.style.display = "block";
}

function closeSuggestions() {
  document.getElementById("suggestions").style.display = "none";
}

// ── MAIN FETCH PROFILE ──
function fetchProfile() {
  var username = document.getElementById("uname").value.trim();
  if (username === "") {
    showToast("Please enter a username!");
    return;
  }

  closeSuggestions();

  document.getElementById("mainContent").classList.remove("visible");
  document.getElementById("errMsg").style.display = "none";
  document.getElementById("loadMsg").style.display = "flex";

  fetch("https://api.github.com/users/" + username, { headers: getHeaders() })
    .then(function (res) {
      document.getElementById("loadMsg").style.display = "none";
      if (!res.ok) {
        document.getElementById("errMsg").style.display = "flex";
        document.getElementById("errText").textContent = "User not found: @" + username;
        return;
      }
      return res.json();
    })
    .then(function (data) {
      if (!data) return;
      currentUser = data;
      reposPage = 1;
      allRepos = [];
      populateCard(data);
      fetchRepos(data.login, true);
      fetchFollowers(data.login);
      fetchFollowing(data.login);
      addToHistory(data.login);
      document.getElementById("mainContent").classList.add("visible");
      showTab("repos");
      updateFavBtn();
    })
    .catch(function () {
      document.getElementById("loadMsg").style.display = "none";
      document.getElementById("errMsg").style.display = "flex";
      document.getElementById("errText").textContent = "Network error. Please try again.";
    });
}

// ── POPULATE PROFILE CARD ──
function populateCard(data) {
  document.getElementById("avatar").src = data.avatar_url;
  document.getElementById("fullname").textContent = data.name || data.login;
  document.getElementById("loginname").textContent = "@" + data.login;
  document.getElementById("bio").textContent = data.bio || "";

  document.getElementById("repos").textContent = formatNum(data.public_repos);
  document.getElementById("followers").textContent = formatNum(data.followers);
  document.getElementById("following").textContent = formatNum(data.following);
  document.getElementById("gists").textContent = formatNum(data.public_gists);

  // location
  var locItem = document.getElementById("locItem");
  if (data.location) {
    document.getElementById("location").textContent = data.location;
    locItem.style.display = "flex";
  } else {
    locItem.style.display = "none";
  }

  // blog
  var blogItem = document.getElementById("blogItem");
  if (data.blog && data.blog !== "") {
    var blogUrl = data.blog.startsWith("http") ? data.blog : "https://" + data.blog;
    blogItem.href = blogUrl;
    document.getElementById("blog").textContent = data.blog.replace(/^https?:\/\//, "");
    blogItem.style.display = "flex";
  } else {
    blogItem.style.display = "none";
  }

  // twitter
  var twitterItem = document.getElementById("twitterItem");
  if (data.twitter_username) {
    document.getElementById("twitter").textContent = "@" + data.twitter_username;
    twitterItem.style.display = "flex";
  } else {
    twitterItem.style.display = "none";
  }

  // company
  var companyItem = document.getElementById("companyItem");
  if (data.company) {
    document.getElementById("company").textContent = data.company;
    companyItem.style.display = "flex";
  } else {
    companyItem.style.display = "none";
  }

  // joined date
  var joined = new Date(data.created_at);
  document.getElementById("joined").textContent = "Joined " + joined.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  document.getElementById("profileLink").href = data.html_url;
}

// ── FETCH REPOS ──
function fetchRepos(username, reset) {
  if (reset) {
    reposPage = 1;
    allRepos = [];
    document.getElementById("repoList").innerHTML = "";
  }

  fetch("https://api.github.com/users/" + username + "/repos?per_page=30&page=" + reposPage + "&sort=updated", { headers: getHeaders() })
    .then(function (res) { return res.json(); })
    .then(function (repos) {
      allRepos = allRepos.concat(repos);
      renderRepos();
      var loadMore = document.getElementById("loadMoreBtn");
      loadMore.style.display = repos.length === 30 ? "block" : "none";
    });
}

function renderRepos() {
  var sorted = allRepos.slice();

  if (currentSort === "stars") {
    sorted.sort(function (a, b) { return b.stargazers_count - a.stargazers_count; });
  } else if (currentSort === "updated") {
    sorted.sort(function (a, b) { return new Date(b.updated_at) - new Date(a.updated_at); });
  } else if (currentSort === "name") {
    sorted.sort(function (a, b) { return a.name.localeCompare(b.name); });
  } else if (currentSort === "forks") {
    sorted.sort(function (a, b) { return b.forks_count - a.forks_count; });
  }

  var list = document.getElementById("repoList");
  list.innerHTML = "";

  sorted.forEach(function (repo) {
    var card = document.createElement("a");
    card.className = "repo-card";
    card.href = repo.html_url;
    card.target = "_blank";

    var langDot = repo.language
      ? '<span class="lang-dot" style="background:' + (langColors[repo.language] || "#8b949e") + '"></span>'
      : "";

    var forkBadge = repo.fork ? '<span class="fork-badge">fork</span>' : "";

    var topicsHtml = "";
    if (repo.topics && repo.topics.length > 0) {
      topicsHtml = repo.topics.slice(0, 3).map(function (t) {
        return '<span class="repo-topic">' + t + '</span>';
      }).join("");
    }

    var updatedDate = new Date(repo.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

    card.innerHTML =
      '<div class="repo-name">' + repo.name + ' ' + forkBadge + '</div>' +
      '<div class="repo-desc">' + (repo.description || '<em style="opacity:0.5">No description</em>') + '</div>' +
      '<div class="repo-meta">' +
      (repo.language ? '<span class="repo-lang">' + langDot + repo.language + '</span>' : '') +
      '<span class="repo-stars">⭐ ' + formatNum(repo.stargazers_count) + '</span>' +
      '<span class="repo-forks">🍴 ' + formatNum(repo.forks_count) + '</span>' +
      '<span class="repo-updated">Updated ' + updatedDate + '</span>' +
      topicsHtml +
      '</div>';

    list.appendChild(card);
  });
}

function loadMoreRepos() {
  if (!currentUser) return;
  reposPage++;
  fetchRepos(currentUser.login, false);
}

function sortRepos(type) {
  currentSort = type;
  document.querySelectorAll(".sort-btn").forEach(function (b) { b.classList.remove("active"); });
  event.target.classList.add("active");
  renderRepos();
}

// ── FETCH FOLLOWERS ──
function fetchFollowers(username) {
  fetch("https://api.github.com/users/" + username + "/followers?per_page=30", { headers: getHeaders() })
    .then(function (res) { return res.json(); })
    .then(function (users) { renderUserGrid(users, "followersList"); });
}

// ── FETCH FOLLOWING ──
function fetchFollowing(username) {
  fetch("https://api.github.com/users/" + username + "/following?per_page=30", { headers: getHeaders() })
    .then(function (res) { return res.json(); })
    .then(function (users) { renderUserGrid(users, "followingList"); });
}

function renderUserGrid(users, containerId) {
  var container = document.getElementById(containerId);
  container.innerHTML = "";
  users.forEach(function (u) {
    var card = document.createElement("div");
    card.className = "user-card";
    card.innerHTML =
      '<img src="' + u.avatar_url + '" alt="' + u.login + '">' +
      '<div class="uname">@' + u.login + '</div>';
    card.onclick = function () {
      document.getElementById("uname").value = u.login;
      fetchProfile();
      window.scrollTo({ top: 0, behavior: "smooth" });
    };
    container.appendChild(card);
  });
}

// ── TABS ──
function showTab(tab) {
  document.querySelectorAll(".tab").forEach(function (b) { b.classList.remove("active"); });
  document.querySelectorAll(".tab-content").forEach(function (c) { c.classList.remove("active"); });

  var tabMap = { "repos": 0, "followers": 1, "following": 2 };
  document.querySelectorAll(".tab")[tabMap[tab]].classList.add("active");

  var sortBar = document.getElementById("sortBar");

  if (tab === "repos") {
    document.getElementById("repoTab").classList.add("active");
    sortBar.style.display = "flex";
  } else if (tab === "followers") {
    document.getElementById("followersTab").classList.add("active");
    sortBar.style.display = "none";
  } else if (tab === "following") {
    document.getElementById("followingTab").classList.add("active");
    sortBar.style.display = "none";
  }
}

// ── COPY USERNAME ──
function copyUsername() {
  if (!currentUser) return;
  navigator.clipboard.writeText(currentUser.login).then(function () {
    showToast("✓ Copied @" + currentUser.login + " to clipboard");
  });
}

// ── SHARE PROFILE ──
function shareProfile() {
  if (!currentUser) return;
  var url = window.location.origin + window.location.pathname + "?user=" + currentUser.login;
  navigator.clipboard.writeText(url).then(function () {
    showToast("✓ Share link copied!");
  });
}

// ── COMPARE ──
function setCompare() {
  if (!currentUser) return;
  compareUser = currentUser;
  document.getElementById("compareBar").style.display = "flex";
  showToast("✓ " + currentUser.login + " saved for compare. Now search another user.");
}

function clearCompare() {
  compareUser = null;
  document.getElementById("compareBar").style.display = "none";
  document.getElementById("compareCard").style.display = "none";
}

function showCompare(data) {
  if (!compareUser) return;
  var card = document.getElementById("compareCard");
  var content = document.getElementById("compareContent");

  content.innerHTML =
    '<div style="font-size:13px; color:var(--purple); font-weight:700; margin-bottom:12px;">⇄ Comparing with @' + compareUser.login + '</div>' +
    '<div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">' +
    compareBlock(data) +
    compareBlock(compareUser) +
    '</div>';

  card.style.display = "block";
}

function compareBlock(u) {
  return '<div style="background:var(--bg); border:1px solid var(--border); border-radius:10px; padding:12px; text-align:center;">' +
    '<img src="' + u.avatar_url + '" style="width:40px;height:40px;border-radius:50%;margin-bottom:6px;">' +
    '<div style="font-size:12px; font-weight:700; color:var(--text);">' + (u.name || u.login) + '</div>' +
    '<div style="font-size:11px; color:var(--accent); margin-bottom:8px;">@' + u.login + '</div>' +
    '<div style="font-size:11px; color:var(--muted);">📦 ' + formatNum(u.public_repos) + ' repos</div>' +
    '<div style="font-size:11px; color:var(--muted);">👥 ' + formatNum(u.followers) + ' followers</div>' +
    '</div>';
}

// ── SEARCH HISTORY ──
function addToHistory(username) {
  var history = getHistory();
  history = history.filter(function (h) { return h !== username; });
  history.unshift(username);
  if (history.length > 6) history = history.slice(0, 6);
  localStorage.setItem("gh_history", JSON.stringify(history));
  loadHistory();
}

function getHistory() {
  try {
    return JSON.parse(localStorage.getItem("gh_history")) || [];
  } catch (e) { return []; }
}

function loadHistory() {
  var history = getHistory();
  var row = document.getElementById("historyRow");
  row.innerHTML = "";
  history.forEach(function (u) {
    var chip = document.createElement("div");
    chip.className = "history-chip";
    chip.innerHTML = '🕐 ' + u + ' <span class="rm" onclick="removeHistory(event, \'' + u + '\')">✕</span>';
    chip.onclick = function (e) {
      if (!e.target.classList.contains("rm")) {
        document.getElementById("uname").value = u;
        fetchProfile();
      }
    };
    row.appendChild(chip);
  });
}

function removeHistory(e, username) {
  e.stopPropagation();
  var history = getHistory().filter(function (h) { return h !== username; });
  localStorage.setItem("gh_history", JSON.stringify(history));
  loadHistory();
}

// ── FAVOURITES ──
function getFavourites() {
  try {
    return JSON.parse(localStorage.getItem("gh_favs")) || [];
  } catch (e) { return []; }
}

function toggleFav() {
  if (!currentUser) return;
  var favs = getFavourites();
  var exists = favs.find(function (f) { return f.login === currentUser.login; });

  if (exists) {
    favs = favs.filter(function (f) { return f.login !== currentUser.login; });
    showToast("Removed from favourites");
  } else {
    favs.push({ login: currentUser.login, name: currentUser.name, avatar: currentUser.avatar_url });
    showToast("⭐ Added to favourites!");
  }

  localStorage.setItem("gh_favs", JSON.stringify(favs));
  loadFavourites();
  updateFavBtn();
}

function updateFavBtn() {
  if (!currentUser) return;
  var favs = getFavourites();
  var exists = favs.find(function (f) { return f.login === currentUser.login; });
  var btn = document.getElementById("favBtn");
  if (exists) {
    btn.textContent = "★ Favourited";
    btn.classList.add("fav-active");
  } else {
    btn.textContent = "☆ Favourite";
    btn.classList.remove("fav-active");
  }
}

function loadFavourites() {
  var favs = getFavourites();
  document.getElementById("favCount").textContent = favs.length;

  var list = document.getElementById("favList");
  list.innerHTML = "";

  if (favs.length === 0) {
    list.innerHTML = '<p style="font-size:13px; color:var(--muted); text-align:center; padding:20px;">No favourites yet.<br>Search a profile and click ☆ Favourite</p>';
    return;
  }

  favs.forEach(function (fav) {
    var item = document.createElement("div");
    item.className = "fav-item";
    item.innerHTML =
      '<img src="' + fav.avatar + '" alt="">' +
      '<div>' +
      '<div class="fav-name">' + (fav.name || fav.login) + '</div>' +
      '<div class="fav-login">@' + fav.login + '</div>' +
      '</div>' +
      '<button class="fav-remove" onclick="removeFav(event, \'' + fav.login + '\')">✕</button>';
    item.onclick = function (e) {
      if (!e.target.classList.contains("fav-remove")) {
        document.getElementById("uname").value = fav.login;
        fetchProfile();
        toggleFavPanel();
      }
    };
    list.appendChild(item);
  });
}

function removeFav(e, login) {
  e.stopPropagation();
  var favs = getFavourites().filter(function (f) { return f.login !== login; });
  localStorage.setItem("gh_favs", JSON.stringify(favs));
  loadFavourites();
  updateFavBtn();
}

function toggleFavPanel() {
  document.getElementById("favPanel").classList.toggle("open");
}

// ── THEME TOGGLE ──
document.getElementById("themeToggle").onclick = function () {
  isLight = !isLight;
  document.body.classList.toggle("light", isLight);
  this.textContent = isLight ? "🌙" : "☀️";
  showToast(isLight ? "Light mode on" : "Dark mode on");
};

// ── CHECK RATE LIMIT ──
function checkRateLimit() {
  fetch("https://api.github.com/rate_limit", { headers: getHeaders() })
    .then(function (res) { return res.json(); })
    .then(function (data) {
      var remaining = data.rate.remaining;
      var limit = data.rate.limit;
      var el = document.getElementById("rateLimit");
      el.textContent = "API: " + remaining + "/" + limit + " requests left";
      if (remaining < 10) el.style.color = "var(--danger)";
    })
    .catch(function () {
      document.getElementById("rateLimit").textContent = "API: connected";
    });
}

// ── HELPERS ──
function formatNum(n) {
  if (!n && n !== 0) return "0";
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "k";
  return String(n);
}

function showToast(msg) {
  var toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.classList.add("show");
  setTimeout(function () { toast.classList.remove("show"); }, 2500);
}
