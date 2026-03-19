// Player Posts - Firebase Realtime Database backed posts with likes and comments
(function() {
    'use strict';

    var postsRef = db.ref('posts');

    // Track which posts the current browser session has liked (persisted in localStorage)
    var LIKES_KEY = 'baystate_pirates_liked';

    function getLikedSet() {
        try {
            return JSON.parse(localStorage.getItem(LIKES_KEY)) || {};
        } catch (e) {
            return {};
        }
    }

    function saveLikedSet(liked) {
        localStorage.setItem(LIKES_KEY, JSON.stringify(liked));
    }

    function getInitials(name) {
        return name.split(' ').map(function(w) { return w[0]; }).join('').toUpperCase().slice(0, 2);
    }

    function timeAgo(timestamp) {
        var seconds = Math.floor((Date.now() - timestamp) / 1000);
        if (seconds < 60) return 'just now';
        var minutes = Math.floor(seconds / 60);
        if (minutes < 60) return minutes + 'm ago';
        var hours = Math.floor(minutes / 60);
        if (hours < 24) return hours + 'h ago';
        var days = Math.floor(hours / 24);
        if (days < 7) return days + 'd ago';
        return new Date(timestamp).toLocaleDateString();
    }

    function escapeHtml(str) {
        var div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function isValidUrl(string) {
        try {
            var url = new URL(string);
            return url.protocol === 'http:' || url.protocol === 'https:';
        } catch (e) {
            return false;
        }
    }

    function renderPosts(postsObj) {
        var feed = document.getElementById('postsFeed');
        var liked = getLikedSet();

        // Convert object to array with keys
        var postsArray = [];
        if (postsObj) {
            Object.keys(postsObj).forEach(function(key) {
                var post = postsObj[key];
                post._key = key;
                postsArray.push(post);
            });
        }

        if (postsArray.length === 0) {
            feed.innerHTML = '<div class="no-posts"><p>No posts yet. Be the first to share something!</p></div>';
            return;
        }

        // Sort newest first by timestamp
        postsArray.sort(function(a, b) {
            return (b.timestamp || 0) - (a.timestamp || 0);
        });

        var html = '';
        for (var i = 0; i < postsArray.length; i++) {
            var post = postsArray[i];
            var isLiked = !!liked[post._key];
            html += renderPostCard(post, isLiked);
        }
        feed.innerHTML = html;

        attachPostListeners();
    }

    function renderPostCard(post, isLiked) {
        var key = post._key;

        var linkHtml = '';
        if (post.link && isValidUrl(post.link)) {
            var displayUrl = post.link.length > 50 ? post.link.substring(0, 50) + '...' : post.link;
            linkHtml = '<a href="' + escapeHtml(post.link) + '" class="post-link" target="_blank" rel="noopener">' +
                '&#128279; ' + escapeHtml(displayUrl) + '</a>';
        }

        var likeClass = isLiked ? 'btn-like liked' : 'btn-like';
        var likeCount = post.likes || 0;

        // Convert comments object to array
        var commentsArray = [];
        if (post.comments) {
            Object.keys(post.comments).forEach(function(ck) {
                commentsArray.push(post.comments[ck]);
            });
            // Sort comments oldest first
            commentsArray.sort(function(a, b) {
                return (a.timestamp || 0) - (b.timestamp || 0);
            });
        }
        var commentCount = commentsArray.length;

        var commentsHtml = '';
        for (var c = 0; c < commentsArray.length; c++) {
            var comment = commentsArray[c];
            commentsHtml += '<div class="comment">' +
                '<div class="comment-avatar">' + escapeHtml(getInitials(comment.author || '?')) + '</div>' +
                '<div class="comment-content">' +
                '<span class="comment-author">' + escapeHtml(comment.author || 'Anon') + '</span> ' +
                '<span class="comment-text">' + escapeHtml(comment.text) + '</span>' +
                '<div class="comment-time">' + timeAgo(comment.timestamp) + '</div>' +
                '</div></div>';
        }

        return '<div class="post-card" data-key="' + escapeHtml(key) + '">' +
            '<div class="post-header">' +
            '<div class="post-avatar">' + escapeHtml(getInitials(post.author || '?')) + '</div>' +
            '<div class="post-meta">' +
            '<div class="post-author">' + escapeHtml(post.author || 'Unknown') + '</div>' +
            '<div class="post-time">' + timeAgo(post.timestamp) + '</div>' +
            '</div></div>' +
            '<div class="post-body">' +
            (post.text ? '<p>' + escapeHtml(post.text) + '</p>' : '') +
            linkHtml +
            '</div>' +
            '<div class="post-actions">' +
            '<button class="' + likeClass + '" data-action="like" data-key="' + escapeHtml(key) + '">' +
            '&#9829; ' + likeCount +
            '</button>' +
            '<button class="btn-comment-toggle" data-action="toggle-comments" data-key="' + escapeHtml(key) + '">' +
            '&#128172; ' + commentCount + ' Comment' + (commentCount !== 1 ? 's' : '') +
            '</button>' +
            '</div>' +
            '<div class="comments-section" id="comments-' + escapeHtml(key) + '">' +
            commentsHtml +
            '<div class="add-comment">' +
            '<input type="text" placeholder="Add a comment..." data-comment-input="' + escapeHtml(key) + '">' +
            '<button data-action="add-comment" data-key="' + escapeHtml(key) + '">Post</button>' +
            '</div></div></div>';
    }

    function attachPostListeners() {
        // Like buttons
        document.querySelectorAll('[data-action="like"]').forEach(function(btn) {
            btn.addEventListener('click', function() {
                var key = this.getAttribute('data-key');
                toggleLike(key);
            });
        });

        // Comment toggle buttons
        document.querySelectorAll('[data-action="toggle-comments"]').forEach(function(btn) {
            btn.addEventListener('click', function() {
                var key = this.getAttribute('data-key');
                var section = document.getElementById('comments-' + key);
                section.classList.toggle('open');
                if (section.classList.contains('open')) {
                    var input = section.querySelector('input');
                    if (input) input.focus();
                }
            });
        });

        // Add comment buttons
        document.querySelectorAll('[data-action="add-comment"]').forEach(function(btn) {
            btn.addEventListener('click', function() {
                var key = this.getAttribute('data-key');
                addComment(key);
            });
        });

        // Enter key on comment inputs
        document.querySelectorAll('[data-comment-input]').forEach(function(input) {
            input.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') {
                    var key = this.getAttribute('data-comment-input');
                    addComment(key);
                }
            });
        });
    }

    function toggleLike(key) {
        var liked = getLikedSet();
        var postLikesRef = postsRef.child(key).child('likes');

        if (liked[key]) {
            // Unlike: decrement
            postLikesRef.transaction(function(current) {
                return Math.max(0, (current || 1) - 1);
            });
            delete liked[key];
        } else {
            // Like: increment
            postLikesRef.transaction(function(current) {
                return (current || 0) + 1;
            });
            liked[key] = true;
        }
        saveLikedSet(liked);
    }

    function addComment(key) {
        var input = document.querySelector('[data-comment-input="' + key + '"]');
        var text = input.value.trim();
        if (!text) return;

        // Prompt for name if not stored
        var commenterName = sessionStorage.getItem('pirates_commenter') || '';
        if (!commenterName) {
            commenterName = prompt('Your name:');
            if (!commenterName || !commenterName.trim()) return;
            commenterName = commenterName.trim();
            sessionStorage.setItem('pirates_commenter', commenterName);
        }

        var commentsRef = postsRef.child(key).child('comments');
        commentsRef.push({
            author: commenterName,
            text: text,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        });

        input.value = '';

        // Re-open the comments section after next render
        setTimeout(function() {
            var section = document.getElementById('comments-' + key);
            if (section) section.classList.add('open');
        }, 300);
    }

    // Submit new post
    document.getElementById('submitPost').addEventListener('click', function() {
        var name = document.getElementById('postName').value.trim();
        var text = document.getElementById('postText').value.trim();
        var link = document.getElementById('postLink').value.trim();

        if (!name) {
            document.getElementById('postName').focus();
            return;
        }
        if (!text && !link) {
            document.getElementById('postText').focus();
            return;
        }
        if (link && !isValidUrl(link)) {
            alert('Please enter a valid URL (starting with http:// or https://)');
            document.getElementById('postLink').focus();
            return;
        }

        postsRef.push({
            author: name,
            text: text,
            link: link || '',
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            likes: 0,
            comments: {}
        });

        // Remember the name for comments
        sessionStorage.setItem('pirates_commenter', name);

        // Clear form
        document.getElementById('postText').value = '';
        document.getElementById('postLink').value = '';
    });

    // Listen for real-time updates from Firebase
    postsRef.on('value', function(snapshot) {
        var data = snapshot.val();
        renderPosts(data);
    });

    // Show loading state initially
    document.getElementById('postsFeed').innerHTML = '<div class="no-posts"><p>Loading posts...</p></div>';
})();
