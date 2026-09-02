/* ==========================================================================
   BARBIEGRAM REST API CLIENT
   ========================================================================== */

const API_BASE = '/api';

class ApiClient {
  static getToken() {
    return localStorage.getItem('barbiegram_token');
  }

  static setToken(token) {
    if (token) {
      localStorage.setItem('barbiegram_token', token);
    } else {
      localStorage.removeItem('barbiegram_token');
    }
  }

  static getHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  static async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const config = {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options.headers
      }
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'An API error occurred');
      }
      return data;
    } catch (error) {
      console.error(`API Error on ${endpoint}:`, error);
      throw error;
    }
  }

  // Upload Local Image File
  static async uploadImage(file) {
    const formData = new FormData();
    formData.append('image', file);

    const headers = {};
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      headers,
      body: formData
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to upload image');
    }
    return data;
  }

  // Auth Endpoints
  static login(username, password) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
  }

  static register(userData) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  }

  static getMe() {
    return this.request('/auth/me');
  }

  static getDemoUsers() {
    return this.request('/auth/demo-users');
  }

  // Instagram/Facebook Stories
  static getStories() {
    return this.request('/posts/stories/list');
  }

  // Posts Feed Endpoints
  static getPosts(feedType = 'for_you', username = '') {
    let query = `?feed=${feedType}`;
    if (username) query += `&username=${encodeURIComponent(username)}`;
    return this.request(`/posts${query}`);
  }

  static createPost(content, image_url = '') {
    return this.request('/posts', {
      method: 'POST',
      body: JSON.stringify({ content, image_url })
    });
  }

  static deletePost(postId) {
    return this.request(`/posts/${postId}`, {
      method: 'DELETE'
    });
  }

  static toggleLike(postId) {
    return this.request(`/posts/${postId}/like`, {
      method: 'POST'
    });
  }

  // User & Profile Endpoints
  static getProfile(username) {
    return this.request(`/users/profile/${encodeURIComponent(username)}`);
  }

  static updateProfile(profileData) {
    return this.request('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData)
    });
  }

  static toggleFollow(userId) {
    return this.request(`/users/${userId}/follow`, {
      method: 'POST'
    });
  }

  static getSuggestions() {
    return this.request('/users/suggestions/list');
  }

  static searchUsers(query) {
    return this.request(`/users/search?q=${encodeURIComponent(query)}`);
  }

  // Comments Endpoints
  static getComments(postId) {
    return this.request(`/comments/post/${postId}`);
  }

  static addComment(postId, content) {
    return this.request(`/comments/post/${postId}`, {
      method: 'POST',
      body: JSON.stringify({ content })
    });
  }

  static deleteComment(commentId) {
    return this.request(`/comments/${commentId}`, {
      method: 'DELETE'
    });
  }
}

window.ApiClient = ApiClient;
