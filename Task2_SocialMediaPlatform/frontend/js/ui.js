/* ==========================================================================
   BARBIEGRAM UI RENDERER & INTERACTION MODULE (INSTAGRAM + FACEBOOK HYBRID)
   ========================================================================== */

const UI = {
  showNotification(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <span class="toast-icon">${type === 'success' ? '💖' : type === 'error' ? '⚠️' : '✨'}</span>
      <span class="toast-msg">${message}</span>
    `;

    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  },

  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  },

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  },

  formatTime(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diffSec = Math.floor((now - date) / 1000);

    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  },

  renderStories(stories) {
    const container = document.getElementById('storiesContainer');
    if (!container) return;

    container.innerHTML = stories.map(story => `
      <div class="story-item" onclick="App.openStoryModal(${story.id})">
        <div class="story-ring">
          <img src="${story.avatar_url}" class="story-avatar" alt="${story.display_name}" />
        </div>
        <span class="story-username">${story.display_name.split(' ')[0]}</span>
      </div>
    `).join('');
  },

  renderProfileHeader(user) {
    const container = document.getElementById('profileHeaderContainer');
    if (!container) return;

    const currentUser = AuthManager.currentUser;
    const isSelf = currentUser && currentUser.id === user.id;

    container.innerHTML = `
      <div class="glass-panel profile-banner-card">
        <div class="profile-cover" style="background-image: url('${user.cover_url || 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=1200&q=80'}');"></div>
        <div class="profile-header-content">
          <div class="profile-avatar-wrapper">
            <img src="${user.avatar_url}" class="profile-avatar-large" alt="${user.display_name}" />
          </div>
          <div>
            ${isSelf ? `
              <button class="btn btn-outline btn-sm" onclick="App.openEditProfileModal()">✏️ Edit Profile</button>
            ` : currentUser ? `
              <button class="btn ${user.is_following ? 'btn-outline' : 'btn-pink-gradient'} btn-sm" onclick="App.handleToggleFollow(${user.id}, this)">
                ${user.is_following ? 'Following' : 'Follow ✨'}
              </button>
            ` : ''}
          </div>
        </div>

        <div class="profile-details">
          <div class="profile-name-row">
            ${user.display_name} ${user.is_verified ? '<span class="verified-badge">✓</span>' : ''}
          </div>
          <div class="profile-handle">@${user.username}</div>
          ${user.bio ? `<p class="profile-bio">${this.escapeHtml(user.bio)}</p>` : ''}

          <div class="profile-stats">
            <div class="stat-item">
              <span class="stat-num">${user.posts_count || 0}</span>
              <span class="stat-label">Posts</span>
            </div>
            <div class="stat-item">
              <span class="stat-num">${user.followers_count || 0}</span>
              <span class="stat-label">Followers</span>
            </div>
            <div class="stat-item">
              <span class="stat-num">${user.following_count || 0}</span>
              <span class="stat-label">Following</span>
            </div>
          </div>
        </div>
      </div>
    `;
    container.style.display = 'block';
  },

  hideProfileHeader() {
    const container = document.getElementById('profileHeaderContainer');
    if (container) container.style.display = 'none';
  },

  renderPostCard(post) {
    const currentUser = AuthManager.currentUser;
    const isOwner = currentUser && currentUser.id === post.user_id;

    return `
      <article class="post-card" data-post-id="${post.id}">
        <header class="post-header">
          <div class="post-author-info" onclick="App.viewProfile('${post.username}')">
            <img src="${post.avatar_url}" alt="${post.display_name}" class="avatar avatar-md" />
            <div>
              <div class="author-name">
                ${post.display_name}
                ${post.is_verified ? '<span class="verified-badge">✓</span>' : ''}
              </div>
              <div class="author-username">@${post.username} • ${this.formatTime(post.created_at)}</div>
            </div>
          </div>
          ${isOwner ? `
            <button class="btn-icon text-danger" onclick="App.handleDeletePost(${post.id})" title="Delete post">
              🗑️
            </button>
          ` : ''}
        </header>

        <div class="post-content">
          <p>${this.formatPostText(post.content)}</p>
          ${post.image_url ? `
            <div class="post-image-container">
              <img src="${post.image_url}" alt="Post image" loading="lazy" />
            </div>
          ` : ''}
        </div>

        <footer class="post-actions-bar">
          <div class="post-action-group">
            <!-- Facebook-style Reactions Container -->
            <div class="reaction-container">
              <div class="reaction-popover">
                <span class="reaction-emoji" onclick="App.handleReaction(${post.id}, '👍', this)">👍</span>
                <span class="reaction-emoji" onclick="App.handleReaction(${post.id}, '❤️', this)">❤️</span>
                <span class="reaction-emoji" onclick="App.handleReaction(${post.id}, '✨', this)">✨</span>
                <span class="reaction-emoji" onclick="App.handleReaction(${post.id}, '😂', this)">😂</span>
                <span class="reaction-emoji" onclick="App.handleReaction(${post.id}, '🔥', this)">🔥</span>
              </div>
              <button class="action-btn ${post.is_liked ? 'liked' : ''}" onclick="App.handleToggleLike(${post.id}, this)">
                <span class="reaction-icon">${post.is_liked ? '❤️' : '🤍'}</span>
                <span class="like-count">${post.likes_count}</span>
              </button>
            </div>

            <button class="action-btn" onclick="App.toggleComments(${post.id})">
              💬 <span class="comment-count">${post.comments_count}</span>
            </button>
          </div>

          <div class="post-action-group">
            <button class="action-btn" onclick="App.sharePost(${post.id})" title="Share Post">
              🔄 Share
            </button>
          </div>
        </footer>

        <section class="comments-section" id="comments-${post.id}" style="display: none;">
          <div class="comments-list" id="comments-list-${post.id}">
            <div class="loading-spinner">Loading comments...</div>
          </div>
          ${currentUser ? `
            <form class="comment-form" onsubmit="App.handleAddComment(event, ${post.id})">
              <input type="text" placeholder="Add a comment... ✨" class="form-control comment-input" required />
              <button type="submit" class="btn btn-primary btn-sm">Post</button>
            </form>
          ` : '<p class="text-muted text-sm text-center">Log in to comment ✨</p>'}
        </section>
      </article>
    `;
  },

  renderCommentItem(comment) {
    const currentUser = AuthManager.currentUser;
    const isOwner = currentUser && currentUser.id === comment.user_id;

    return `
      <div class="comment-item" id="comment-${comment.id}">
        <img src="${comment.avatar_url}" class="avatar avatar-sm" onclick="App.viewProfile('${comment.username}')" />
        <div class="comment-body">
          <div class="comment-header">
            <span class="comment-author" onclick="App.viewProfile('${comment.username}')">${comment.display_name}</span>
            <span class="comment-time">${this.formatTime(comment.created_at)}</span>
          </div>
          <div class="comment-text">${this.escapeHtml(comment.content)}</div>
        </div>
        ${isOwner ? `
          <button class="btn-icon text-muted btn-xs" onclick="App.handleDeleteComment(${comment.id}, ${comment.post_id})" title="Delete comment">
            ×
          </button>
        ` : ''}
      </div>
    `;
  },

  renderSearchResults(users) {
    const dropdown = document.getElementById('searchResultsDropdown');
    if (!dropdown) return;

    if (!users || users.length === 0) {
      dropdown.innerHTML = '<div class="p-3 text-muted text-sm text-center">No users found ✨</div>';
      dropdown.classList.add('active');
      return;
    }

    dropdown.innerHTML = users.map(user => `
      <div class="search-item" onclick="App.viewProfile('${user.username}'); App.closeSearchDropdown();">
        <img src="${user.avatar_url}" class="avatar avatar-sm" />
        <div>
          <div style="font-weight: 600;">${user.display_name} ${user.is_verified ? '✓' : ''}</div>
          <div style="font-size: 0.8rem; color: var(--text-muted);">@${user.username}</div>
        </div>
      </div>
    `).join('');
    dropdown.classList.add('active');
  },

  renderSuggestions(suggestions) {
    const container = document.getElementById('suggestionsList');
    if (!container) return;

    if (!suggestions || suggestions.length === 0) {
      container.innerHTML = '<p class="text-muted text-sm">No suggestions right now ✨</p>';
      return;
    }

    container.innerHTML = suggestions.map(user => `
      <div class="suggestion-item">
        <div class="suggestion-user" onclick="App.viewProfile('${user.username}')">
          <img src="${user.avatar_url}" class="avatar avatar-sm" />
          <div class="user-info-text">
            <div class="name">${user.display_name} ${user.is_verified ? '✓' : ''}</div>
            <div class="username">@${user.username}</div>
          </div>
        </div>
        ${AuthManager.currentUser && AuthManager.currentUser.id !== user.id ? `
          <button class="btn ${user.is_following ? 'btn-outline' : 'btn-pink-gradient'} btn-xs" onclick="App.handleToggleFollow(${user.id}, this)">
            ${user.is_following ? 'Following' : 'Follow ✨'}
          </button>
        ` : ''}
      </div>
    `).join('');
  },

  formatPostText(text) {
    const escaped = this.escapeHtml(text);
    return escaped.replace(/#(\w+)/g, '<a href="#" onclick="App.searchHashtag(\'$1\'); return false;" style="color: var(--secondary-pink); font-weight: 600;">#$1</a>');
  },

  escapeHtml(str) {
    return str.replace(/[&<>"']/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
    });
  }
};

window.UI = UI;
