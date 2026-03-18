// Player Posts - localStorage-based posts with likes and comments
(function() {
    'use strict';

    const STORAGE_KEY = 'baystate_pirates_posts';

    function getPosts() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
        } catch (e) {
            return [];
        }
    }

    function savePosts(posts) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
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

    function renderPosts() {
        var feed = document.getElementById('postsFeed');
        var posts = getPosts();

        if (posts.length === 0) {
            feed.innerHTML = '<div class="no-posts"><p>No posts yet. Be the first to share something!</p></div>';
            return;
        }

        // Show newest first
        var html = '';
        for (var i = posts.length - 1; i >= 0; i--) {
            var post = posts[i];
            html += renderPostCard(post, i);
        }
        feed.innerHTML = html;

        // Attach event listeners
        attachPostListeners();
    }

    function renderPostCard(post, index) {
        var linkHtml = '';
        if (post.link && isValidUrl(post.link)) {
            var displayUrl = post.link.length > 50 ? post.link.substring(0, 50) + '...' : post.link;
            linkHtml = '<a href="' + escapeHtml(post.link) + '" class="post-link" target="_blank" rel="noopener">' +
                '&#128279; ' + escapeHtml(displayUrl) + '</a>';
        }

        var likeClass = post.likedByMe ? 'btn-like liked' : 'btn-like';
        var likeCount = post.likes || 0;
        var commentCount = (post.comments || []).length;

        var commentsHtml = '';
        if (post.comments && post.comments.length > 0) {
            for (var c = 0; c < post.comments.length; c++) {
                var comment = post.comments[c];
                commentsHtml += '<div class="comment">' +
                    '<div class="comment-avatar">' + escapeHtml(getInitials(comment.author)) + '</div>' +
                    '<div class="comment-content">' +
                    '<span class="comment-author">' + escapeHtml(comment.author) + '</span> ' +
                    '<span class="comment-text">' + escapeHtml(comment.text) + '</span>' +
                    '<div class="comment-time">' + timeAgo(comment.timestamp) + '</div>' +
                    '</div></div>';
            }
        }

        return '<div class="post-card" data-index="' + index + '">' +
            '<div class="post-header">' +
            '<div class="post-avatar">' + escapeHtml(getInitials(post.author)) + '</div>' +
            '<div class="post-meta">' +
            '<div class="post-author">' + escapeHtml(post.author) + '</div>' +
            '<div class="post-time">' + timeAgo(post.timestamp) + '</div>' +
            '</div></div>' +
            '<div class="post-body">' +
            (post.text ? '<p>' + escapeHtml(post.text) + '</p>' : '') +
            linkHtml +
            '</div>' +
            '<div class="post-actions">' +
            '<button class="' + likeClass + '" data-action="like" data-index="' + index + '">' +
            '&#9829; ' + likeCount +
            '</button>' +
            '<button class="btn-comment-toggle" data-action="toggle-comments" data-index="' + index + '">' +
            '&#128172; ' + commentCount + ' Comment' + (commentCount !== 1 ? 's' : '') +
            '</button>' +
            '</div>' +
            '<div class="comments-section" id="comments-' + index + '">' +
            commentsHtml +
            '<div class="add-comment">' +
            '<input type="text" placeholder="Add a comment..." data-comment-input="' + index + '">' +
            '<button data-action="add-comment" data-index="' + index + '">Post</button>' +
            '</div></div></div>';
    }

    function attachPostListeners() {
        // Like buttons
        document.querySelectorAll('[data-action="like"]').forEach(function(btn) {
            btn.addEventListener('click', function() {
                var index = parseInt(this.getAttribute('data-index'));
                toggleLike(index);
            });
        });

        // Comment toggle buttons
        document.querySelectorAll('[data-action="toggle-comments"]').forEach(function(btn) {
            btn.addEventListener('click', function() {
                var index = this.getAttribute('data-index');
                var section = document.getElementById('comments-' + index);
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
                var index = parseInt(this.getAttribute('data-index'));
                addComment(index);
            });
        });

        // Enter key on comment inputs
        document.querySelectorAll('[data-comment-input]').forEach(function(input) {
            input.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') {
                    var index = parseInt(this.getAttribute('data-comment-input'));
                    addComment(index);
                }
            });
        });
    }

    function toggleLike(index) {
        var posts = getPosts();
        if (!posts[index]) return;
        if (posts[index].likedByMe) {
            posts[index].likes = Math.max(0, (posts[index].likes || 1) - 1);
            posts[index].likedByMe = false;
        } else {
            posts[index].likes = (posts[index].likes || 0) + 1;
            posts[index].likedByMe = true;
        }
        savePosts(posts);
        renderPosts();
    }

    function addComment(index) {
        var input = document.querySelector('[data-comment-input="' + index + '"]');
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

        var posts = getPosts();
        if (!posts[index]) return;
        if (!posts[index].comments) posts[index].comments = [];
        posts[index].comments.push({
            author: commenterName,
            text: text,
            timestamp: Date.now()
        });
        savePosts(posts);
        renderPosts();

        // Re-open the comments section after re-render
        var section = document.getElementById('comments-' + index);
        if (section) section.classList.add('open');
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

        var posts = getPosts();
        posts.push({
            author: name,
            text: text,
            link: link || '',
            timestamp: Date.now(),
            likes: 0,
            likedByMe: false,
            comments: []
        });
        savePosts(posts);

        // Remember the name for comments
        sessionStorage.setItem('pirates_commenter', name);

        // Clear form
        document.getElementById('postText').value = '';
        document.getElementById('postLink').value = '';

        renderPosts();
    });

    // Initial render
    renderPosts();
})();
