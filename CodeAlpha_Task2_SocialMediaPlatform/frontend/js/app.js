/* ==========================================================================
   BARBIEGRAM MAIN APPLICATION CONTROLLER (INSTAGRAM + FACEBOOK HYBRID)
   ========================================================================== */

const App = {
  currentFeedType: 'for_you',
  currentProfileUsername: null,
  selectedImageFile: null,
  searchTimeout: null,
  currentTheme: 'dark',

  async init() {
    await AuthManager.init();
    this.setupEventListeners();
    if (AuthManager.currentUser) {
      this.loadStories();
      this.refreshFeed();
      this.loadSuggestions();
    }
  },

  setupEventListeners() {
    // Landing Auth Form
    const landingAuthForm = document.getElementById('landingAuthForm');
    if (landingAuthForm) {
      landingAuthForm.addEventListener('submit', (e) => this.handleLandingAuthSubmit(e));
    }

    // Feed Navigation Tabs
    const feedTabs = document.querySelectorAll('.feed-tab');
    feedTabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        feedTabs.forEach(t => t.classList.remove('active'));
        const targetBtn = e.target.closest('.feed-tab');
        targetBtn.classList.add('active');
        this.currentFeedType = targetBtn.dataset.feed;
        this.currentProfileUsername = null;
        UI.hideProfileHeader();
        document.getElementById('feedTitle').textContent = targetBtn.dataset.title || 'Feed';
        this.refreshFeed();
      });
    });

    // Create Post Form
    const createPostForm = document.getElementById('createPostForm');
    if (createPostForm) {
      createPostForm.addEventListener('submit', (e) => this.handleCreatePost(e));
    }

    // Image Upload Input
    const postImageInput = document.getElementById('postImageInput');
    if (postImageInput) {
      postImageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          this.selectedImageFile = file;
          const preview = document.getElementById('imagePreview');
          const previewImg = document.getElementById('previewImg');
          previewImg.src = URL.createObjectURL(file);
          preview.style.display = 'block';
        }
      });
    }

    // Live Search Input Listener
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        clearTimeout(this.searchTimeout);
        const query = e.target.value.trim();
        if (query.length < 2) {
          this.closeSearchDropdown();
          return;
        }
        this.searchTimeout = setTimeout(async () => {
          try {
            const res = await ApiClient.searchUsers(query);
            UI.renderSearchResults(res.users);
          } catch (err) {
            console.warn('Search error:', err);
          }
        }, 250);
      });
    }

    // Close search dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.search-container')) {
        this.closeSearchDropdown();
      }
    });

    // Edit Profile Form
    const editProfileForm = document.getElementById('editProfileForm');
    if (editProfileForm) {
      editProfileForm.addEventListener('submit', (e) => this.handleEditProfile(e));
    }
  },

  setLandingAuthMode(mode) {
    const loginTabBtn = document.getElementById('tabBtnLogin');
    const registerTabBtn = document.getElementById('tabBtnRegister');
    const nameGroup = document.getElementById('landingNameGroup');
    const emailGroup = document.getElementById('landingEmailGroup');
    const submitBtn = document.getElementById('landingSubmitBtn');
    const container = document.getElementById('landingAuthContainer');

    if (mode === 'register') {
      container.dataset.mode = 'register';
      loginTabBtn.classList.remove('active');
      registerTabBtn.classList.add('active');
      nameGroup.style.display = 'block';
      emailGroup.style.display = 'block';
      submitBtn.textContent = 'Create Account ✨';
    } else {
      container.dataset.mode = 'login';
      registerTabBtn.classList.remove('active');
      loginTabBtn.classList.add('active');
      nameGroup.style.display = 'none';
      emailGroup.style.display = 'none';
      submitBtn.textContent = 'Log In 💖';
    }
  },

  handleLandingAuthSubmit(e) {
    e.preventDefault();
    const container = document.getElementById('landingAuthContainer');
    const isRegister = container.dataset.mode === 'register';

    const username = document.getElementById('landingUsername').value.trim();
    const password = document.getElementById('landingPassword').value;

    if (isRegister) {
      const email = document.getElementById('landingEmail').value.trim();
      const displayName = document.getElementById('landingDisplayName').value.trim();
      AuthManager.register({ username, email, password, display_name: displayName }).then(success => {
        if (success) {
          this.loadStories();
          this.refreshFeed();
          this.loadSuggestions();
        }
      });
    } else {
      AuthManager.login(username, password).then(success => {
        if (success) {
          this.loadStories();
          this.refreshFeed();
          this.loadSuggestions();
        }
      });
    }
  },

  async loadStories() {
    try {
      const res = await ApiClient.getStories();
      UI.renderStories(res.stories);
    } catch (err) {
      console.warn('Could not load stories:', err);
    }
  },

  openStoryModal(storyId) {
    const modal = document.getElementById('storyModal');
    if (!modal) return;

    ApiClient.getStories().then(res => {
      const story = res.stories.find(s => s.id === storyId);
      if (story) {
        document.getElementById('storyModalImg').src = story.media_url;
        document.getElementById('storyModalAvatar').src = story.avatar_url;
        document.getElementById('storyModalUsername').textContent = story.display_name;
        document.getElementById('storyModalCaption').textContent = story.caption;
        UI.openModal('storyModal');
      }
    });
  },

  async refreshFeed() {
    const feedContainer = document.getElementById('postsContainer');
    if (!feedContainer) return;

    feedContainer.innerHTML = '<div class="loading-spinner">✨ Polishing BarbieGram posts...</div>';

    try {
      if (this.currentFeedType === 'user' && this.currentProfileUsername) {
        const profileRes = await ApiClient.getProfile(this.currentProfileUsername);
        UI.renderProfileHeader(profileRes.user);
      } else {
        UI.hideProfileHeader();
      }

      const data = await ApiClient.getPosts(this.currentFeedType, this.currentProfileUsername);
      if (!data.posts || data.posts.length === 0) {
        feedContainer.innerHTML = `
          <div class="glass-panel text-center p-4" style="margin-top: 20px;">
            <div style="font-size: 2.5rem;">💖</div>
            <h3 style="margin-top: 10px;">No posts here yet!</h3>
            <p style="color: var(--text-muted); font-size: 0.9rem;">Be the first to share something fabulous with BarbieGram! ✨</p>
          </div>
        `;
        return;
      }

      feedContainer.innerHTML = data.posts.map(post => UI.renderPostCard(post)).join('');
    } catch (err) {
      feedContainer.innerHTML = `<div class="error-state">Failed to load feed: ${err.message}</div>`;
    }
  },

  async loadSuggestions() {
    try {
      const res = await ApiClient.getSuggestions();
      UI.renderSuggestions(res.suggestions);
    } catch (err) {
      console.warn('Could not load suggestions:', err);
    }
  },

  async handleCreatePost(e) {
    e.preventDefault();
    const textarea = document.getElementById('postContentInput');
    const content = textarea.value.trim();

    if (!content && !this.selectedImageFile) {
      UI.showNotification('Please enter a message or select an image! ✨', 'error');
      return;
    }

    try {
      let imageUrl = '';
      if (this.selectedImageFile) {
        const uploadRes = await ApiClient.uploadImage(this.selectedImageFile);
        imageUrl = uploadRes.url;
      }

      await ApiClient.createPost(content, imageUrl);
      textarea.value = '';
      this.clearImagePreview();
      UI.showNotification('Posted to BarbieGram! ✨💖', 'success');
      this.refreshFeed();
    } catch (err) {
      UI.showNotification(err.message || 'Failed to create post', 'error');
    }
  },

  clearImagePreview() {
    this.selectedImageFile = null;
    const input = document.getElementById('postImageInput');
    if (input) input.value = '';
    const preview = document.getElementById('imagePreview');
    if (preview) preview.style.display = 'none';
  },

  async handleToggleLike(postId, btnEl) {
    if (!AuthManager.currentUser) {
      UI.showNotification('Please log in to react to posts! ✨', 'info');
      return;
    }

    try {
      const res = await ApiClient.toggleLike(postId);
      const iconEl = btnEl.querySelector('.reaction-icon');
      const countEl = btnEl.querySelector('.like-count');

      if (res.is_liked) {
        btnEl.classList.add('liked');
        if (iconEl) iconEl.textContent = '❤️';
      } else {
        btnEl.classList.remove('liked');
        if (iconEl) iconEl.textContent = '🤍';
      }
      if (countEl) countEl.textContent = res.likes_count;
    } catch (err) {
      UI.showNotification(err.message || 'Failed to update reaction', 'error');
    }
  },

  handleReaction(postId, emoji, emojiEl) {
    const postCard = document.querySelector(`.post-card[data-post-id="${postId}"]`);
    if (!postCard) return;

    const likeBtn = postCard.querySelector('.action-btn');
    const iconEl = likeBtn.querySelector('.reaction-icon');
    
    this.handleToggleLike(postId, likeBtn).then(() => {
      if (iconEl) iconEl.textContent = emoji;
      UI.showNotification(`Reacted with ${emoji} ✨`, 'success');
    });
  },

  sharePost(postId) {
    const url = `${window.location.origin}/#post-${postId}`;
    navigator.clipboard.writeText(url).then(() => {
      UI.showNotification('Post link copied to clipboard! 📋✨', 'success');
    }).catch(() => {
      UI.showNotification('Shared post link ✨', 'info');
    });
  },

  async toggleComments(postId) {
    const commentsSec = document.getElementById(`comments-${postId}`);
    if (!commentsSec) return;

    if (commentsSec.style.display === 'none' || commentsSec.style.display === '') {
      commentsSec.style.display = 'block';
      const list = document.getElementById(`comments-list-${postId}`);
      list.innerHTML = '<div class="loading-spinner">Loading comments...</div>';

      try {
        const res = await ApiClient.getComments(postId);
        if (!res.comments || res.comments.length === 0) {
          list.innerHTML = '<p class="text-muted text-sm text-center py-2">No comments yet. Be the first! ✨</p>';
          return;
        }
        list.innerHTML = res.comments.map(c => UI.renderCommentItem(c)).join('');
      } catch (err) {
        list.innerHTML = `<p class="text-danger text-sm">Failed to load comments</p>`;
      }
    } else {
      commentsSec.style.display = 'none';
    }
  },

  async handleAddComment(e, postId) {
    e.preventDefault();
    const input = e.target.querySelector('.comment-input');
    const content = input.value.trim();
    if (!content) return;

    try {
      const res = await ApiClient.addComment(postId, content);
      input.value = '';
      
      const list = document.getElementById(`comments-list-${postId}`);
      const emptyMsg = list.querySelector('.text-muted');
      if (emptyMsg) emptyMsg.remove();

      list.insertAdjacentHTML('beforeend', UI.renderCommentItem(res.comment));
      
      const postCard = document.querySelector(`.post-card[data-post-id="${postId}"]`);
      if (postCard) {
        const countSpan = postCard.querySelector('.comment-count');
        if (countSpan) countSpan.textContent = res.comments_count;
      }
    } catch (err) {
      UI.showNotification(err.message || 'Failed to post comment', 'error');
    }
  },

  async handleDeleteComment(commentId, postId) {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    try {
      const res = await ApiClient.deleteComment(commentId);
      const commentEl = document.getElementById(`comment-${commentId}`);
      if (commentEl) commentEl.remove();

      const postCard = document.querySelector(`.post-card[data-post-id="${postId}"]`);
      if (postCard) {
        const countSpan = postCard.querySelector('.comment-count');
        if (countSpan) countSpan.textContent = res.comments_count;
      }
      UI.showNotification('Comment deleted', 'info');
    } catch (err) {
      UI.showNotification(err.message || 'Failed to delete comment', 'error');
    }
  },

  async handleDeletePost(postId) {
    if (!confirm('Are you sure you want to delete this post? 💖')) return;

    try {
      await ApiClient.deletePost(postId);
      const postCard = document.querySelector(`.post-card[data-post-id="${postId}"]`);
      if (postCard) postCard.remove();
      UI.showNotification('Post deleted successfully', 'info');
    } catch (err) {
      UI.showNotification(err.message || 'Failed to delete post', 'error');
    }
  },

  async handleToggleFollow(userId, btnEl) {
    if (!AuthManager.currentUser) {
      return;
    }

    try {
      const res = await ApiClient.toggleFollow(userId);
      if (res.is_following) {
        btnEl.classList.remove('btn-pink-gradient');
        btnEl.classList.add('btn-outline');
        btnEl.textContent = 'Following';
      } else {
        btnEl.classList.remove('btn-outline');
        btnEl.classList.add('btn-pink-gradient');
        btnEl.textContent = 'Follow ✨';
      }
      this.loadSuggestions();
    } catch (err) {
      UI.showNotification(err.message || 'Failed to update follow', 'error');
    }
  },

  async viewProfile(username) {
    this.currentFeedType = 'user';
    this.currentProfileUsername = username;
    document.getElementById('feedTitle').textContent = `@${username}'s Profile`;
    this.refreshFeed();
  },

  openEditProfileModal() {
    const u = AuthManager.currentUser;
    if (!u) return;

    document.getElementById('editDisplayName').value = u.display_name || '';
    document.getElementById('editBio').value = u.bio || '';
    document.getElementById('editAvatarUrl').value = u.avatar_url || '';
    document.getElementById('editCoverUrl').value = u.cover_url || '';
    UI.openModal('editProfileModal');
  },

  async handleEditProfile(e) {
    e.preventDefault();
    const display_name = document.getElementById('editDisplayName').value.trim();
    const bio = document.getElementById('editBio').value.trim();
    const avatar_url = document.getElementById('editAvatarUrl').value.trim();
    const cover_url = document.getElementById('editCoverUrl').value.trim();

    try {
      await ApiClient.updateProfile({ display_name, bio, avatar_url, cover_url });
      UI.showNotification('Profile updated successfully! ✨💖', 'success');
      UI.closeModal('editProfileModal');

      const meRes = await ApiClient.getMe();
      AuthManager.currentUser = meRes.user;
      AuthManager.updateAuthUI();
      this.refreshFeed();
    } catch (err) {
      UI.showNotification(err.message || 'Failed to update profile', 'error');
    }
  },

  closeSearchDropdown() {
    const dropdown = document.getElementById('searchResultsDropdown');
    if (dropdown) dropdown.classList.remove('active');
  },

  searchHashtag(tag) {
    UI.showNotification(`Filtering feed for #${tag} ✨`, 'info');
  },

  toggleTheme() {
    const themes = ['dark', 'light', 'neon'];
    const currentIndex = themes.indexOf(this.currentTheme);
    const nextTheme = themes[(currentIndex + 1) % themes.length];
    
    this.currentTheme = nextTheme;
    document.documentElement.setAttribute('data-theme', nextTheme);
    UI.showNotification(`Switched to ${nextTheme.toUpperCase()} theme 🎨`, 'info');
  }
};

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});

window.App = App;
