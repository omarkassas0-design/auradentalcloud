import { supabase } from './supabaseClient';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
const entityCache = new Map();

async function apiFetch(path, options = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.error || payload.message || `Request failed (${response.status})`);
    error.status = response.status; error.code = payload.code; error.data = payload;
    throw error;
  }
  return payload;
}

function normalizeUser(authUser, profile = {}) {
  if (!authUser) return null;
  const metadata = authUser.user_metadata || {};
  return { ...metadata, ...profile, id: authUser.id, email: authUser.email, data: { ...metadata, ...(profile.data || {}) } };
}

const auth = {
  async me() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    if (!user) return null;
    // Enforce Supabase AAL2 when the account has a verified MFA factor.
    const assurance = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (assurance.data?.nextLevel === 'aal2' && assurance.data?.currentLevel !== 'aal2' && window.location.pathname !== '/mfa') {
      const factors = await supabase.auth.mfa.listFactors();
      const factor = (factors.data?.totp || []).find(item => item.status === 'verified');
      if (factor) {
        const challenge = await supabase.auth.mfa.challenge({ factorId: factor.id });
        if (!challenge.error) {
          sessionStorage.setItem('auradental_mfa_challenge', JSON.stringify({ factorId: factor.id, challengeId: challenge.data.id }));
          window.location.assign('/mfa?verify=1');
          return null;
        }
      }
    }
    return normalizeUser(user, user.user_metadata || {});
  },
  async loginViaEmailPassword(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return { ...data, access_token: data.session?.access_token };
  },
  async register({ email, password, ...metadata }) {
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: metadata } });
    if (error) throw error;
    return data;
  },
  async verifyOtp({ email, otpCode, token, type = 'signup' }) {
    const { data, error } = await supabase.auth.verifyOtp({ email, token: token || otpCode, type });
    if (error) throw error;
    return data;
  },
  async resendOtp(email) {
    const { data, error } = await supabase.auth.resend({ type: 'signup', email });
    if (error) throw error;
    return data;
  },
  async resetPasswordRequest(email) {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
    if (error) throw error;
    return data;
  },
  async resetPassword({ newPassword }) {
    const { data, error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
    return data;
  },
  async updateMe(updates) {
    const { data: { user }, error } = await supabase.auth.updateUser({ data: updates });
    if (error) throw error;
    // Only safe, non-authoritative profile fields are mirrored here. Worker controls security fields.
    const allowed = ['preferred_language', 'phone', 'clinic_name'];
    const profilePatch = Object.fromEntries(Object.entries(updates).filter(([key]) => allowed.includes(key)));
    // Profile values remain in Auth user_metadata; authorization fields are excluded.
    return normalizeUser(user, profilePatch);
  },
  async logout() { const { error } = await supabase.auth.signOut(); if (error) throw error; },
  async loginWithProvider(provider, returnTo = '/') {
    const { data, error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: `${window.location.origin}${returnTo}` } });
    if (error) throw error; return data;
  },
  async setToken(token) {
    // Supabase requires both access and refresh tokens. Legacy one-token legacy MFA
    // handoffs are intentionally not accepted as a Supabase session.
    if (!token) throw new Error('Missing access token');
    throw new Error('Legacy MFA handoff is not compatible with Supabase Auth. Use Supabase MFA enrollment and verification.');
  },
  async isAuthenticated() { const { data } = await supabase.auth.getSession(); return !!data.session; },
};

function entityApi(entityName) {
  if (entityCache.has(entityName)) return entityCache.get(entityName);
  const invoke = (action, payload = {}) => apiFetch(`/api/functions/clinicScopedCrud`, { method: 'POST', body: JSON.stringify({ action, entity: entityName, ...payload }) });
  const api = {
    async list(sort) { const result = await invoke('filter', { filter: {}, sort, limit: 500 }); return result.records || []; },
    async filter(filter = {}, sort, limit) { const result = await invoke('filter', { filter, sort, limit }); return result.records || []; },
    async get(id) { const result = await invoke('get', { id }); return result.record; },
    async create(record) { const result = await invoke('create', { record }); return result.record; },
    async update(id, patch) { const result = await invoke('update', { id, patch }); return result.record; },
    async delete(id) { return invoke('delete', { id }); },
  };
  entityCache.set(entityName, api); return api;
}

export const aura = {
  auth,
  functions: {
    async invoke(name, payload = {}) {
      const data = await apiFetch(`/api/functions/${encodeURIComponent(name)}`, { method: 'POST', body: JSON.stringify(payload) });
      // Preserve the original SDK response contract used throughout the UI.
      return { data };
    },
  },
  entities: new Proxy({}, { get: (_target, name) => typeof name === 'string' ? entityApi(name) : undefined }),
  integrations: {
    Core: {
      async UploadFile({ file }) { return apiFetch('/api/files/upload', { method: 'POST', body: await fileToFormData(file) }); },
      async UploadPrivateFile({ file }) { return apiFetch('/api/files/private-upload', { method: 'POST', body: await fileToFormData(file) }); },
    },
  },
};

async function fileToFormData(file) {
  const form = new FormData(); form.append('file', file); return form;
}
