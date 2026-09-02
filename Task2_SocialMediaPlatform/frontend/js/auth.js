/* ==========================================================================
   BARBIEGRAM AUTHENTICATION MODULE (STRICT AUTHENTICATION GATE)
   ========================================================================== */

const AuthManager = {
  currentUser: null,

  async init() {
    const token = ApiClient.getToken();
    if (token) {
      try {
        const res = await ApiClient.getMe();
        this.currentUser = res.user;
      } catch (err) {
        console.warn('Session expired or invalid token');
        ApiClient.setToken(null);
        this.currentUser = null;
      }
    }
    this.updateAuthUI();
  },

  async login(username, password) {
    try {
      const res = await ApiClient.login(username, password);
      ApiClient.setToken(res.token);
      this.currentUser = res.user;
      this.updateAuthUI();
      UI.showNotification(`Welcome back, ${res.user.display_name}! 💖`, 'success');
      App.refreshFeed();
      return true;
    } catch (err) {
      UI.showNotification(err.message || 'Login failed', 'error');
      return false;
    }
  },

  async register(userData) {
    try {
      const res = await ApiClient.register(userData);
      ApiClient.setToken(res.token);
      this.currentUser = res.user;
      this.updateAuthUI();
      UI.showNotification(`Welcome to BarbieGram, ${res.user.display_name}! ✨`, 'success');
      App.refreshFeed();
      return true;
    } catch (err) {
      UI.showNotification(err.message || 'Registration failed', 'error');
      return false;
    }
  },

  logout() {
    ApiClient.setToken(null);
    this.currentUser = null;
    this.updateAuthUI();
    UI.showNotification('Logged out successfully 💕', 'info');
  },

  updateAuthUI() {
    const landingContainer = document.getElementById('landingContainer');
    const dashboardContainer = document.getElementById('dashboardContainer');
    const searchContainer = document.querySelector('.search-container');
    const userNav = document.getElementById('userNav');
    const userAvatarNav = document.getElementById('userAvatarNav');
    const currentUserNameNav = document.getElementById('currentUserNameNav');
    const createPostCard = document.getElementById('createPostCard');

    if (this.currentUser) {
      // User Logged In -> Show Dashboard, Hide Landing
      if (landingContainer) landingContainer.style.display = 'none';
      if (dashboardContainer) dashboardContainer.style.display = 'grid';
      if (searchContainer) searchContainer.style.display = 'block';
      if (userNav) userNav.style.display = 'flex';
      if (createPostCard) createPostCard.style.display = 'block';
      if (userAvatarNav) userAvatarNav.src = this.currentUser.avatar_url;
      if (currentUserNameNav) currentUserNameNav.textContent = this.currentUser.display_name;
    } else {
      // User Not Logged In -> Show Landing Screen, Hide Dashboard
      if (landingContainer) landingContainer.style.display = 'flex';
      if (dashboardContainer) dashboardContainer.style.display = 'none';
      if (searchContainer) searchContainer.style.display = 'none';
      if (userNav) userNav.style.display = 'none';
      if (createPostCard) createPostCard.style.display = 'none';
    }
  }
};

window.AuthManager = AuthManager;
