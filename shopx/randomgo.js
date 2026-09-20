/* =========================================================
   GOCAT
   NO BACKEND VERSION

   Uses:
   - localStorage for accounts/settings
   - IndexedDB for REAL uploaded video files
   ========================================================= */


/* ================= GLOBAL DATA ================= */

let users = JSON.parse(localStorage.getItem("gocat_users") || "[]");

let videos = [];

let currentUser = null;

let currentVideoId = null;

let currentPage = "home";

let notifications =
    JSON.parse(localStorage.getItem("gocat_notifications") || "[]");


/* ================= DOM ================= */

const authScreen = document.getElementById("authScreen");
const app = document.getElementById("app");

const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");

const authTitle = document.getElementById("authTitle");
const authSubtitle = document.getElementById("authSubtitle");
const authMessage = document.getElementById("authMessage");

const showRegister = document.getElementById("showRegister");
const showLogin = document.getElementById("showLogin");

const homeFeed = document.getElementById("homeFeed");
const followingFeed = document.getElementById("followingFeed");
const profileVideos = document.getElementById("profileVideos");

const exploreVideos = document.getElementById("exploreVideos");
const explorePeople = document.getElementById("explorePeople");

const searchInput = document.getElementById("searchInput");
const clearSearch = document.getElementById("clearSearch");

const uploadModal = document.getElementById("uploadModal");
const commentsModal = document.getElementById("commentsModal");
const editModal = document.getElementById("editModal");

const videoFile = document.getElementById("videoFile");
const selectedFile = document.getElementById("selectedFile");

const videoTitle = document.getElementById("videoTitle");
const videoDescription = document.getElementById("videoDescription");

const publishVideo = document.getElementById("publishVideo");

const toast = document.getElementById("toast");
const toastText = document.getElementById("toastText");

const dropArea = document.getElementById("dropArea");

const dbName = "GoCatVideoDatabase";
const dbVersion = 1;


/* =========================================================
   INDEXED DB
   This stores actual video files.
   ========================================================= */

let db = null;

function openDatabase() {

    return new Promise((resolve, reject) => {

        const request = indexedDB.open(dbName, dbVersion);

        request.onupgradeneeded = function(event) {

            const database = event.target.result;

            if (!database.objectStoreNames.contains("videos")) {

                database.createObjectStore("videos", {
                    keyPath: "id"
                });

            }

        };

        request.onsuccess = function(event) {

            db = event.target.result;

            resolve(db);

        };

        request.onerror = function() {

            reject(request.error);

        };

    });

}


/* Save real video file */

function saveVideoFile(videoObject) {

    return new Promise((resolve, reject) => {

        const transaction =
            db.transaction(["videos"], "readwrite");

        const store =
            transaction.objectStore("videos");

        const request =
            store.put(videoObject);

        request.onsuccess = function() {

            resolve();

        };

        request.onerror = function() {

            reject(request.error);

        };

    });

}


/* Get all real video files */

function getAllVideoFiles() {

    return new Promise((resolve, reject) => {

        const transaction =
            db.transaction(["videos"], "readonly");

        const store =
            transaction.objectStore("videos");

        const request =
            store.getAll();

        request.onsuccess = function() {

            resolve(request.result);

        };

        request.onerror = function() {

            reject(request.error);

        };

    });

}


/* Delete video */

function deleteVideoFile(id) {

    return new Promise((resolve, reject) => {

        const transaction =
            db.transaction(["videos"], "readwrite");

        const store =
            transaction.objectStore("videos");

        const request =
            store.delete(id);

        request.onsuccess = function() {

            resolve();

        };

        request.onerror = function() {

            reject(request.error);

        };

    });

}


/* =========================================================
   LOCAL STORAGE
   ========================================================= */

function saveUsers() {

    localStorage.setItem(
        "gocat_users",
        JSON.stringify(users)
    );

}


function saveNotifications() {

    localStorage.setItem(
        "gocat_notifications",
        JSON.stringify(notifications)
    );

}


function saveCurrentUser() {

    if (currentUser) {

        localStorage.setItem(
            "gocat_current_user",
            currentUser.id
        );

    }

}


function loadCurrentUser() {

    const id =
        localStorage.getItem("gocat_current_user");

    if (!id) return null;

    return users.find(user => user.id === id) || null;

}


/* =========================================================
   UTILITY
   ========================================================= */

function createId() {

    return (
        Date.now().toString(36) +
        Math.random().toString(36).substring(2, 9)
    );

}


function escapeHTML(text) {

    if (!text) return "";

    return text
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


function getInitial(name) {

    if (!name) return "?";

    return name
        .charAt(0)
        .toUpperCase();

}


function formatDate(timestamp) {

    const date =
        new Date(timestamp);

    const seconds =
        Math.floor(
            (Date.now() - date.getTime()) / 1000
        );

    if (seconds < 60) {
        return "just now";
    }

    if (seconds < 3600) {

        return Math.floor(seconds / 60) + "m ago";

    }

    if (seconds < 86400) {

        return Math.floor(seconds / 3600) + "h ago";

    }

    if (seconds < 604800) {

        return Math.floor(seconds / 86400) + "d ago";

    }

    return date.toLocaleDateString();

}


function showToast(message) {

    toastText.textContent = message;

    toast.classList.add("show");

    setTimeout(() => {

        toast.classList.remove("show");

    }, 2500);

}


/* =========================================================
   AUTH
   ========================================================= */

showRegister.addEventListener("click", function() {

    loginForm.classList.add("hidden");
    registerForm.classList.remove("hidden");

    authTitle.textContent = "Create your account";

    authSubtitle.textContent =
        "Join the GoCat community";

    authMessage.textContent = "";

});


showLogin.addEventListener("click", function() {

    registerForm.classList.add("hidden");
    loginForm.classList.remove("hidden");

    authTitle.textContent = "Welcome back";

    authSubtitle.textContent =
        "Sign in to continue to GoCat";

    authMessage.textContent = "";

});


/* Register */

registerForm.addEventListener("submit", function(event) {

    event.preventDefault();

    const username =
        document
            .getElementById("registerUsername")
            .value
            .trim();

    const email =
        document
            .getElementById("registerEmail")
            .value
            .trim();

    const password =
        document
            .getElementById("registerPassword")
            .value;

    const confirm =
        document
            .getElementById("registerConfirm")
            .value;


    if (password !== confirm) {

        authMessage.textContent =
            "Passwords do not match.";

        authMessage.style.color = "#ff4d67";

        return;

    }


    const usernameExists =
        users.some(
            user =>
                user.username.toLowerCase() ===
                username.toLowerCase()
        );


    if (usernameExists) {

        authMessage.textContent =
            "That username is already taken.";

        authMessage.style.color = "#ff4d67";

        return;

    }


    const emailExists =
        users.some(
            user =>
                user.email.toLowerCase() ===
                email.toLowerCase()
        );


    if (emailExists) {

        authMessage.textContent =
            "That email is already registered.";

        authMessage.style.color = "#ff4d67";

        return;

    }


    const user = {

        id: createId(),

        username: username,

        email: email,

        password: password,

        bio: "Welcome to my GoCat profile.",

        followers: [],

        following: [],

        createdAt: Date.now()

    };


    users.push(user);

    saveUsers();

    currentUser = user;

    saveCurrentUser();

    authMessage.textContent =
        "Account created!";

    authMessage.style.color =
        "#19a66b";

    setTimeout(() => {

        startApp();

    }, 400);

});


/* Login */

loginForm.addEventListener("submit", function(event) {

    event.preventDefault();

    const username =
        document
            .getElementById("loginUsername")
            .value
            .trim();

    const password =
        document
            .getElementById("loginPassword")
            .value;


    const user =
        users.find(
            item =>
                item.username.toLowerCase() ===
                    username.toLowerCase() &&
                item.password === password
        );


    if (!user) {

        authMessage.textContent =
            "Username or password is incorrect.";

        authMessage.style.color =
            "#ff4d67";

        return;

    }


    currentUser = user;

    saveCurrentUser();

    startApp();

});


/* Password buttons */

document.querySelectorAll(".password-btn")
.forEach(button => {

    button.addEventListener("click", function() {

        const target =
            document.getElementById(
                button.dataset.target
            );

        if (target.type === "password") {

            target.type = "text";

            button.textContent = "🙈";

        } else {

            target.type = "password";

            button.textContent = "👁";

        }

    });

});


/* =========================================================
   APP START
   ========================================================= */

async function startApp() {

    authScreen.classList.add("hidden");

    app.classList.remove("hidden");

    currentUser =
        users.find(
            user => user.id === currentUser.id
        );

    await loadVideos();

    updateUserUI();

    renderHome();

    renderFollowing();

    renderProfile();

    renderExplore();

    renderNotifications();

}


/* =========================================================
   VIDEO DATA
   ========================================================= */

async function loadVideos() {

    const stored =
        await getAllVideoFiles();

    videos = stored.map(item => {

        return {

            id: item.id,

            ownerId: item.ownerId,

            title: item.title,

            description: item.description,

            file: item.file,

            createdAt: item.createdAt,

            likes: item.likes || [],

            views: item.views || 0,

            comments: item.comments || []

        };

    });

}


/* =========================================================
   UPDATE USER UI
   ========================================================= */

function updateUserUI() {

    if (!currentUser) return;

    const initial =
        getInitial(currentUser.username);

    document.getElementById(
        "topAvatar"
    ).textContent = initial;

    document.getElementById(
        "commentAvatar"
    ).textContent = initial;

    document.getElementById(
        "welcomeName"
    ).textContent =
        currentUser.username;

    document.getElementById(
        "profileAvatar"
    ).textContent = initial;

    document.getElementById(
        "profileUsername"
    ).textContent =
        currentUser.username;

    document.getElementById(
        "profileEmail"
    ).textContent =
        currentUser.email;

    document.getElementById(
        "profileBio"
    ).textContent =
        currentUser.bio;

    document.getElementById(
        "followersCount"
    ).textContent =
        currentUser.followers.length;

    document.getElementById(
        "followingCount"
    ).textContent =
        currentUser.following.length;

}


/* =========================================================
   VIDEO CARD
   ========================================================= */

function createVideoCard(video) {

    const owner =
        users.find(
            user => user.id === video.ownerId
        );

    if (!owner) return "";

    const liked =
        video.likes.includes(currentUser.id);

    const following =
        currentUser.following.includes(owner.id);


    const videoURL =
        URL.createObjectURL(video.file);


    return `

        <article
            class="video-card"
            data-video-id="${video.id}"
            data-search="
                ${escapeHTML(video.title)}
                ${escapeHTML(video.description)}
                ${escapeHTML(owner.username)}
            "
        >

            <div class="video-player-wrap">

                <video
                    class="video-player"
                    src="${videoURL}"
                    controls
                    preload="metadata"
                    data-view="${video.id}"
                ></video>

            </div>


            <div class="video-owner">

                <div class="owner-avatar">
                    ${getInitial(owner.username)}
                </div>

                <div class="owner-name">

                    <button
                        class="profile-user-btn"
                        data-user="${owner.id}"
                    >
                        ${escapeHTML(owner.username)}
                    </button>

                </div>

                ${
                    owner.id !== currentUser.id
                    ?
                    `
                    <button
                        class="follow-mini"
                        data-follow="${owner.id}"
                    >
                        ${following ? "Following" : "Follow"}
                    </button>
                    `
                    :
                    ""
                }

            </div>


            <div class="video-info">

                <div class="video-title">
                    ${escapeHTML(video.title)}
                </div>

                <div class="video-description">
                    ${escapeHTML(video.description)}
                </div>

            </div>


            <div class="video-actions">

                <button
                    class="video-action ${liked ? "liked" : ""}"
                    data-like="${video.id}"
                >
                    ${liked ? "❤️" : "♡"}
                    ${video.likes.length}
                </button>


                <button
                    class="video-action"
                    data-comment="${video.id}"
                >
                    💬
                    ${video.comments.length}
                </button>


                <button
                    class="video-action"
                    data-share="${video.id}"
                >
                    ↗
                    Share
                </button>


                <button
                    class="video-action"
                >
                    👁
                    ${video.views}
                </button>

            </div>


            <div class="video-date">
                ${formatDate(video.createdAt)}
            </div>

        </article>

    `;

}


/* =========================================================
   RENDER HOME
   ========================================================= */

function renderHome(list = videos) {

    const sorted =
        [...list].sort(
            (a, b) =>
                b.createdAt - a.createdAt
        );


    homeFeed.innerHTML =
        sorted.map(createVideoCard).join("");


    document.getElementById(
        "emptyHome"
    ).classList.toggle(
        "hidden",
        sorted.length > 0
    );


    attachVideoEvents(homeFeed);

}


/* =========================================================
   FOLLOWING
   ========================================================= */

function renderFollowing() {

    const followingVideos =
        videos.filter(video => {

            return currentUser.following.includes(
                video.ownerId
            );

        });


    followingFeed.innerHTML =
        followingVideos
            .sort((a, b) => b.createdAt - a.createdAt)
            .map(createVideoCard)
            .join("");


    document.getElementById(
        "emptyFollowing"
    ).classList.toggle(
        "hidden",
        followingVideos.length > 0
    );


    attachVideoEvents(followingFeed);

}


/* =========================================================
   PROFILE
   ========================================================= */

function renderProfile() {

    const ownVideos =
        videos.filter(
            video =>
                video.ownerId ===
                currentUser.id
        );


    document.getElementById(
        "postCount"
    ).textContent =
        ownVideos.length;


    profileVideos.innerHTML =
        ownVideos
            .sort((a,b) => b.createdAt - a.createdAt)
            .map(createVideoCard)
            .join("");


    attachVideoEvents(profileVideos);

}


/* =========================================================
   EXPLORE
   ========================================================= */

function renderExplore() {

    exploreVideos.innerHTML =
        [...videos]
            .sort((a,b) => b.createdAt - a.createdAt)
            .map(createVideoCard)
            .join("");


    attachVideoEvents(exploreVideos);


    const people =
        users.filter(
            user =>
                user.id !== currentUser.id
        );


    explorePeople.innerHTML =
        people.map(user => {

            const following =
                currentUser.following
                    .includes(user.id);


            const userVideos =
                videos.filter(
                    video =>
                        video.ownerId ===
                        user.id
                ).length;


            return `

                <div class="person-card">

                    <div class="person-avatar">
                        ${getInitial(user.username)}
                    </div>

                    <h3>
                        ${escapeHTML(user.username)}
                    </h3>

                    <p>
                        ${userVideos} videos
                        ·
                        ${user.followers.length} followers
                    </p>

                    <button
                        class="main-btn follow-person"
                        data-follow="${user.id}"
                    >
                        ${
                            following
                            ? "Following ✓"
                            : "Follow"
                        }
                    </button>

                </div>

            `;

        }).join("");


    explorePeople
        .querySelectorAll(".follow-person")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    toggleFollow(
                        button.dataset.follow
                    );

                }
            );

        });

}


/* =========================================================
   VIDEO EVENTS
   ========================================================= */

function attachVideoEvents(container) {

    container
        .querySelectorAll("[data-like]")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    toggleLike(
                        button.dataset.like
                    );

                }
            );

        });


    container
        .querySelectorAll("[data-comment]")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    openComments(
                        button.dataset.comment
                    );

                }
            );

        });


    container
        .querySelectorAll("[data-follow]")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    toggleFollow(
                        button.dataset.follow
                    );

                }
            );

        });


    container
        .querySelectorAll("[data-share]")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    shareVideo(
                        button.dataset.share
                    );

                }
            );

        });


    container
        .querySelectorAll(".profile-user-btn")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    showUserProfile(
                        button.dataset.user
                    );

                }
            );

        });


    container
        .querySelectorAll("[data-view]")
        .forEach(videoElement => {

            videoElement.addEventListener(
                "play",
                function() {

                    const id =
                        videoElement.dataset.view;

                    const video =
                        videos.find(
                            item =>
                                item.id === id
                        );

                    if (!video) return;

                    if (!video._viewed) {

                        video.views++;

                        video._viewed = true;

                        saveVideoChanges(video);

                    }

                },
                { once: true }
            );

        });

}


/* =========================================================
   SAVE VIDEO
   ========================================================= */

async function saveVideoChanges(video) {

    await saveVideoFile({

        id: video.id,

        ownerId: video.ownerId,

        title: video.title,

        description: video.description,

        file: video.file,

        createdAt: video.createdAt,

        likes: video.likes,

        views: video.views,

        comments: video.comments

    });

}


/* =========================================================
   LIKE
   ========================================================= */

async function toggleLike(videoId) {

    const video =
        videos.find(
            item => item.id === videoId
        );

    if (!video) return;


    const index =
        video.likes.indexOf(
            currentUser.id
        );


    if (index === -1) {

        video.likes.push(
            currentUser.id
        );

        const owner =
            users.find(
                user =>
                    user.id ===
                    video.ownerId
            );


        if (
            owner &&
            owner.id !== currentUser.id
        ) {

            addNotification(
                owner.id,
                "❤️",
                currentUser.username +
                " liked your video."
            );

        }

    } else {

        video.likes.splice(index, 1);

    }


    await saveVideoChanges(video);

    refreshAllFeeds();

}


/* =========================================================
   FOLLOW
   ========================================================= */

function toggleFollow(userId) {

    if (userId === currentUser.id) {

        showToast("You cannot follow yourself.");

        return;

    }


    const target =
        users.find(
            user => user.id === userId
        );


    if (!target) return;


    const followingIndex =
        currentUser.following.indexOf(
            userId
        );


    if (followingIndex === -1) {

        currentUser.following.push(
            userId
        );

        target.followers.push(
            currentUser.id
        );


        addNotification(
            userId,
            "👥",
            currentUser.username +
            " started following you."
        );


        showToast(
            "You are now following " +
            target.username
        );

    } else {

        currentUser.following.splice(
            followingIndex,
            1
        );


        const followerIndex =
            target.followers.indexOf(
                currentUser.id
            );


        if (followerIndex !== -1) {

            target.followers.splice(
                followerIndex,
                1
            );

        }


        showToast(
            "Unfollowed " +
            target.username
        );

    }


    saveUsers();

    saveCurrentUser();

    updateUserUI();

    refreshAllFeeds();

}


/* =========================================================
   COMMENTS
   ========================================================= */

function openComments(videoId) {

    currentVideoId = videoId;

    const video =
        videos.find(
            item =>
                item.id === videoId
        );

    if (!video) return;


    renderComments(video);

    commentsModal.classList.remove(
        "hidden"
    );

}


function renderComments(video) {

    const list =
        document.getElementById(
            "commentsList"
        );


    document.getElementById(
        "commentsCount"
    ).textContent =
        video.comments.length +
        (
            video.comments.length === 1
            ? " comment"
            : " comments"
        );


    if (video.comments.length === 0) {

        list.innerHTML = `

            <div class="empty-state">
                <div>💬</div>
                <h2>No comments yet</h2>
                <p>Be the first person to comment.</p>
            </div>

        `;

        return;

    }


    list.innerHTML =
        video.comments
            .slice()
            .reverse()
            .map(comment => {

                return `

                    <div class="comment">

                        <div class="comment-avatar">
                            ${getInitial(comment.username)}
                        </div>

                        <div class="comment-body">

                            <div class="comment-user">
                                ${escapeHTML(comment.username)}
                            </div>

                            <div class="comment-text">
                                ${escapeHTML(comment.text)}
                            </div>

                            <div class="comment-time">
                                ${formatDate(comment.createdAt)}
                            </div>

                        </div>

                    </div>

                `;

            }).join("");

}


document.getElementById(
    "commentForm"
).addEventListener(
    "submit",
    async function(event) {

        event.preventDefault();

        const input =
            document.getElementById(
                "commentInput"
            );


        const text =
            input.value.trim();


        if (!text) return;


        const video =
            videos.find(
                item =>
                    item.id ===
                    currentVideoId
            );


        if (!video) return;


        video.comments.push({

            id: createId(),

            userId: currentUser.id,

            username:
                currentUser.username,

            text: text,

            createdAt: Date.now()

        });


        await saveVideoChanges(video);


        const owner =
            users.find(
                user =>
                    user.id ===
                    video.ownerId
            );


        if (
            owner &&
            owner.id !== currentUser.id
        ) {

            addNotification(
                owner.id,
                "💬",
                currentUser.username +
                " commented on your video."
            );

        }


        input.value = "";

        renderComments(video);

        refreshAllFeeds();

    }
);


/* =========================================================
   SHARE
   ========================================================= */

function shareVideo(videoId) {

    const video =
        videos.find(
            item => item.id === videoId
        );


    if (!video) return;


    const shareText =
        "Check out " +
        video.title +
        " on GoCat!";


    if (navigator.share) {

        navigator.share({

            title: video.title,

            text: shareText

        }).catch(() => {});

    } else {

        navigator.clipboard
            .writeText(shareText)
            .then(() => {

                showToast(
                    "Video information copied!"
                );

            });

    }

}


/* =========================================================
   NOTIFICATIONS
   ========================================================= */

function addNotification(
    userId,
    icon,
    text
) {

    notifications.unshift({

        id: createId(),

        userId: userId,

        icon: icon,

        text: text,

        createdAt: Date.now()

    });


    if (notifications.length > 200) {

        notifications =
            notifications.slice(0, 200);

    }


    saveNotifications();

    renderNotifications();

}


function renderNotifications() {

    const list =
        document.getElementById(
            "notificationList"
        );


    const mine =
        notifications.filter(
            notification =>
                notification.userId ===
                currentUser.id
        );


    document.getElementById(
        "notificationBadge"
    ).classList.toggle(
        "hidden",
        mine.length === 0
    );


    document.getElementById(
        "notificationBadge"
    ).textContent =
        mine.length;


    if (mine.length === 0) {

        list.innerHTML = `

            <div class="empty-state">
                <div>🔔</div>
                <h2>No notifications</h2>
                <p>Your activity will appear here.</p>
            </div>

        `;

        return;

    }


    list.innerHTML =
        mine.map(notification => {

            return `

                <div class="notification">

                    <div class="notification-icon">
                        ${notification.icon}
                    </div>

                    <div class="notification-text">
                        ${escapeHTML(notification.text)}
                    </div>

                    <div class="notification-time">
                        ${formatDate(notification.createdAt)}
                    </div>

                </div>

            `;

        }).join("");

}


/* =========================================================
   PAGE NAVIGATION
   ========================================================= */

document
    .querySelectorAll(".nav-item")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                showPage(
                    button.dataset.page
                );

            }
        );

    });


document
    .querySelectorAll("[data-page-button]")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                showPage(
                    button.dataset.pageButton
                );

            }
        );

    });


function showPage(page) {

    currentPage = page;


    document
        .querySelectorAll(".page")
        .forEach(section => {

            section.classList.add("hidden");

        });


    const selected =
        document.getElementById(
            "page-" + page
        );


    if (selected) {

        selected.classList.remove(
            "hidden"
        );

    }


    document
        .querySelectorAll(".nav-item")
        .forEach(button => {

            button.classList.toggle(
                "active",
                button.dataset.page === page
            );

        });


    if (page === "home") {

        renderHome();

    }

    if (page === "following") {

        renderFollowing();

    }

    if (page === "profile") {

        renderProfile();

    }

    if (page === "explore") {

        renderExplore();

    }

    if (page === "notifications") {

        renderNotifications();

    }


    document
        .querySelector(".sidebar")
        .classList.remove("open");

}


/* =========================================================
   SEARCH
   ========================================================= */

searchInput.addEventListener(
    "input",
    function() {

        const text =
            searchInput.value
                .trim()
                .toLowerCase();


        clearSearch.classList.toggle(
            "hidden",
            !text
        );


        if (!text) {

            renderHome();

            return;

        }


        const results =
            videos.filter(video => {

                const owner =
                    users.find(
                        user =>
                            user.id ===
                            video.ownerId
                    );


                const searchable =
                    (
                        video.title +
                        " " +
                        video.description +
                        " " +
                        (
                            owner
                            ?
                            owner.username
                            :
                            ""
                        )
                    ).toLowerCase();


                return searchable.includes(
                    text
                );

            });


        showPage("home");

        renderHome(results);

    }
);


clearSearch.addEventListener(
    "click",
    function() {

        searchInput.value = "";

        clearSearch.classList.add(
            "hidden"
        );

        renderHome();

    }
);


/* =========================================================
   UPLOAD MODAL
   ========================================================= */

function openUpload() {

    uploadModal.classList.remove(
        "hidden"
    );

}


document
    .querySelectorAll(".upload-trigger")
    .forEach(button => {

        button.addEventListener(
            "click",
            openUpload
        );

    });


document.getElementById(
    "uploadTopBtn"
).addEventListener(
    "click",
    openUpload
);


/* Select video */

videoFile.addEventListener(
    "change",
    function() {

        if (!videoFile.files.length) {

            selectedFile.classList.add(
                "hidden"
            );

            return;

        }


        const file =
            videoFile.files[0];


        selectedFile.textContent =
            "🎬 " +
            file.name +
            " — " +
            formatFileSize(file.size);


        selectedFile.classList.remove(
            "hidden"
        );

    }
);


function formatFileSize(bytes) {

    if (bytes < 1024 * 1024) {

        return (
            (bytes / 1024).toFixed(1) +
            " KB"
        );

    }


    return (
        (bytes / (1024 * 1024)).toFixed(1) +
        " MB"
    );

}


/* Drag/drop */

dropArea.addEventListener(
    "dragover",
    function(event) {

        event.preventDefault();

        dropArea.classList.add(
            "dragging"
        );

    }
);


dropArea.addEventListener(
    "dragleave",
    function() {

        dropArea.classList.remove(
            "dragging"
        );

    }
);


dropArea.addEventListener(
    "drop",
    function(event) {

        event.preventDefault();

        dropArea.classList.remove(
            "dragging"
        );


        const files =
            event.dataTransfer.files;


        if (
            files.length &&
            files[0].type.startsWith("video/")
        ) {

            videoFile.files =
                files;

            videoFile.dispatchEvent(
                new Event("change")
            );

        }

    }
);


/* Publish */

publishVideo.addEventListener(
    "click",
    async function() {

        const file =
            videoFile.files[0];


        if (!file) {

            showToast(
                "Choose a video first."
            );

            return;

        }


        const title =
            videoTitle.value.trim();


        if (!title) {

            showToast(
                "Give your video a title."
            );

            return;

        }


        const id =
            createId();


        const video = {

            id: id,

            ownerId:
                currentUser.id,

            title: title,

            description:
                videoDescription.value.trim(),

            file: file,

            createdAt: Date.now(),

            likes: [],

            views: 0,

            comments: []

        };


        const progressBox =
            document.getElementById(
                "uploadProgressBox"
            );


        const progressBar =
            document.getElementById(
                "progressBar"
            );


        const progressPercent =
            document.getElementById(
                "progressPercent"
            );


        progressBox.classList.remove(
            "hidden"
        );


        publishVideo.disabled = true;


        let progress = 0;


        const timer =
            setInterval(
                async function() {

                    progress += 10;


                    if (progress > 90) {

                        progress = 90;

                    }


                    progressBar.style.width =
                        progress + "%";


                    progressPercent.textContent =
                        progress + "%";


                },
                80
            );


        try {

            await saveVideoFile(video);

            clearInterval(timer);


            progressBar.style.width =
                "100%";

            progressPercent.textContent =
                "100%";


            await loadVideos();


            setTimeout(() => {

                uploadModal.classList.add(
                    "hidden"
                );

                videoFile.value = "";

                videoTitle.value = "";

                videoDescription.value = "";

                selectedFile.classList.add(
                    "hidden"
                );

                progressBox.classList.add(
                    "hidden"
                );

                publishVideo.disabled =
                    false;


                renderHome();

                renderProfile();

                renderExplore();


                showToast(
                    "Your real video was uploaded!"
                );

            }, 350);


        } catch(error) {

            clearInterval(timer);

            publishVideo.disabled =
                false;

            showToast(
                "Could not save video."
            );

            console.error(error);

        }

    }
);


/* =========================================================
   MODALS CLOSE
   ========================================================= */

document
    .querySelectorAll("[data-close]")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                const id =
                    button.dataset.close;

                document
                    .getElementById(id)
                    .classList.add(
                        "hidden"
                    );

            }
        );

    });


document
    .querySelectorAll(".modal-overlay")
    .forEach(overlay => {

        overlay.addEventListener(
            "click",
            function() {

                overlay
                    .parentElement
                    .classList.add(
                        "hidden"
                    );

            }
        );

    });


/* =========================================================
   EDIT PROFILE
   ========================================================= */

document.getElementById(
    "editProfileBtn"
).addEventListener(
    "click",
    function() {

        document.getElementById(
            "editUsername"
        ).value =
            currentUser.username;


        document.getElementById(
            "editBio"
        ).value =
            currentUser.bio;


        editModal.classList.remove(
            "hidden"
        );

    }
);


document.getElementById(
    "saveProfile"
).addEventListener(
    "click",
    function() {

        const newUsername =
            document.getElementById(
                "editUsername"
            ).value.trim();


        const newBio =
            document.getElementById(
                "editBio"
            ).value.trim();


        if (newUsername.length < 3) {

            showToast(
                "Username is too short."
            );

            return;

        }


        const duplicate =
            users.some(
                user =>
                    user.id !== currentUser.id &&
                    user.username.toLowerCase() ===
                    newUsername.toLowerCase()
            );


        if (duplicate) {

            showToast(
                "Username already exists."
            );

            return;

        }


        currentUser.username =
            newUsername;

        currentUser.bio =
            newBio;


        const index =
            users.findIndex(
                user =>
                    user.id ===
                    currentUser.id
            );


        users[index] =
            currentUser;


        saveUsers();

        saveCurrentUser();

        updateUserUI();

        editModal.classList.add(
            "hidden"
        );

        renderHome();

        renderExplore();

        renderProfile();

        showToast(
            "Profile updated!"
        );

    }
);


/* =========================================================
   THEME
   ========================================================= */

document.getElementById(
    "themeBtn"
).addEventListener(
    "click",
    function() {

        document.body.classList.toggle(
            "dark"
        );


        const dark =
            document.body.classList.contains(
                "dark"
            );


        localStorage.setItem(
            "gocat_dark",
            dark
        );

    }
);


if (
    localStorage.getItem(
        "gocat_dark"
    ) === "true"
) {

    document.body.classList.add(
        "dark"
    );

}


/* =========================================================
   LOGOUT
   ========================================================= */

document.getElementById(
    "logoutBtn"
).addEventListener(
    "click",
    function() {

        localStorage.removeItem(
            "gocat_current_user"
        );

        currentUser = null;

        app.classList.add(
            "hidden"
        );

        authScreen.classList.remove(
            "hidden"
        );

        loginForm.reset();

        showToast(
            "Logged out."
        );

    }
);


/* =========================================================
   PROFILE BUTTON
   ========================================================= */

document.getElementById(
    "profileTopBtn"
).addEventListener(
    "click",
    function() {

        showPage("profile");

    }
);


/* =========================================================
   MOBILE MENU
   ========================================================= */

document.getElementById(
    "mobileMenu"
).addEventListener(
    "click",
    function() {

        document
            .querySelector(".sidebar")
            .classList.toggle("open");

    }
);


/* =========================================================
   REFRESH
   ========================================================= */

document.getElementById(
    "refreshFeed"
).addEventListener(
    "click",
    async function() {

        await loadVideos();

        refreshAllFeeds();

        showToast(
            "Feed refreshed."
        );

    }
);


/* =========================================================
   EXPLORE TABS
   ========================================================= */

document
    .querySelectorAll(".explore-tab")
    .forEach(button => {

        button.addEventListener(
            "click",
            function() {

                document
                    .querySelectorAll(
                        ".explore-tab"
                    )
                    .forEach(item => {

                        item.classList.remove(
                            "active"
                        );

                    });


                button.classList.add(
                    "active"
                );


                const type =
                    button.dataset.explore;


                if (type === "videos") {

                    exploreVideos
                        .classList.remove(
                            "hidden"
                        );

                    explorePeople
                        .classList.add(
                            "hidden"
                        );

                } else {

                    exploreVideos
                        .classList.add(
                            "hidden"
                        );

                    explorePeople
                        .classList.remove(
                            "hidden"
                        );

                }

            }
        );

    });


/* =========================================================
   USER PROFILE
   ========================================================= */

function showUserProfile(userId) {

    if (userId === currentUser.id) {

        showPage("profile");

        return;

    }


    const user =
        users.find(
            item =>
                item.id === userId
        );


    if (!user) return;


    const userVideos =
        videos.filter(
            video =>
                video.ownerId === user.id
        );


    const following =
        currentUser.following.includes(
            user.id
        );


    /* Use profile page temporarily */

    document.getElementById(
        "profileUsername"
    ).textContent =
        user.username;


    document.getElementById(
        "profileEmail"
    ).textContent =
        user.email;


    document.getElementById(
        "profileBio"
    ).textContent =
        user.bio;


    document.getElementById(
        "profileAvatar"
    ).textContent =
        getInitial(user.username);


    document.getElementById(
        "postCount"
    ).textContent =
        userVideos.length;


    document.getElementById(
        "followersCount"
    ).textContent =
        user.followers.length;


    document.getElementById(
        "followingCount"
    ).textContent =
        user.following.length;


    profileVideos.innerHTML =
        userVideos
            .sort(
                (a,b) =>
                    b.createdAt -
                    a.createdAt
            )
            .map(createVideoCard)
            .join("");


    attachVideoEvents(
        profileVideos
    );


    document.getElementById(
        "editProfileBtn"
    ).textContent =
        following
        ? "✓ Following"
        : "+ Follow";


    document.getElementById(
        "editProfileBtn"
    ).onclick =
        function() {

            toggleFollow(user.id);

        };


    showPage("profile");

}


/* =========================================================
   REFRESH EVERYTHING
   ========================================================= */

function refreshAllFeeds() {

    updateUserUI();

    renderHome();

    renderFollowing();

    renderProfile();

    renderExplore();

    renderNotifications();

}


/* =========================================================
   CLEAR NOTIFICATIONS
   ========================================================= */

document.getElementById(
    "clearNotifications"
).addEventListener(
    "click",
    function() {

        notifications =
            notifications.filter(
                notification =>
                    notification.userId !==
                    currentUser.id
            );


        saveNotifications();

        renderNotifications();

        showToast(
            "Notifications cleared."
        );

    }
);


/* =========================================================
   START DATABASE
   ========================================================= */

async function boot() {

    try {

        await openDatabase();

        currentUser =
            loadCurrentUser();


        if (currentUser) {

            await startApp();

        }

    } catch(error) {

        console.error(error);

        alert(
            "GoCat could not open its local database. Try using Chrome or Edge."
        );

    }

}


boot();