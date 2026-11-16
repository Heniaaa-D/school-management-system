// ---------------------------------------------------------------------------
// Auth: the JWT session token lives in sessionStorage. This is only a login
// credential handed back by the Node/Express backend — all real application
// data (students, grades, attendance, etc.) lives in the SQLite database on
// the server and is fetched fresh from the API on every page load.
// ---------------------------------------------------------------------------
const Auth = {
  getToken() { return sessionStorage.getItem('sms_token'); },
  getUser() {
    const raw = sessionStorage.getItem('sms_user');
    return raw ? JSON.parse(raw) : null;
  },
  setSession(token, user) {
    sessionStorage.setItem('sms_token', token);
    sessionStorage.setItem('sms_user', JSON.stringify(user));
  },
  clear() {
    sessionStorage.removeItem('sms_token');
    sessionStorage.removeItem('sms_user');
  },
  requireLogin() {
    if (!this.getToken()) {
      const depth = window.location.pathname.includes('/pages/') ? '../' : '';
      window.location.href = depth + 'index.html';
    }
  },
  logout() {
    this.clear();
    const depth = window.location.pathname.includes('/pages/') ? '../' : '';
    window.location.href = depth + 'index.html';
  }
};

const Api = {
  async request(method, path, body, { auth = true } = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (auth) {
      const token = Auth.getToken();
      if (token) headers['Authorization'] = `Bearer ${token}`;
    }
    const res = await fetch(path, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (res.status === 401 && auth) {
      Auth.logout();
      return;
    }

    let data = null;
    try { data = await res.json(); } catch (_) { /* no body */ }

    if (!res.ok) {
      throw new Error((data && data.error) || `Request failed (${res.status}).`);
    }
    return data;
  },
  get(path, opts)        { return this.request('GET', path, undefined, opts); },
  post(path, body, opts) { return this.request('POST', path, body, opts); },
  put(path, body, opts)  { return this.request('PUT', path, body, opts); },
  del(path, opts)        { return this.request('DELETE', path, undefined, opts); },
};
