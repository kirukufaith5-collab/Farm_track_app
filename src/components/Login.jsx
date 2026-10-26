
import { useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { auth } from '../firebase.js';
import { tokens as t } from '../theme.js';

const MESSAGES = {
  'auth/invalid-credential': 'Incorrect email or password.',
  'auth/user-not-found': 'Incorrect email or password.',
  'auth/wrong-password': 'Incorrect email or password.',
  'auth/invalid-email': 'Enter a valid email address.',
  'auth/email-already-in-use': 'An account with this email already exists. Sign in instead.',
  'auth/weak-password': 'Password must be at least 6 characters.',
  'auth/too-many-requests': 'Too many attempts. Wait a moment and try again.',
  'auth/network-request-failed': 'Network error. Check your connection and try again.',
  'auth/operation-not-allowed': 'Email/password sign-in is not enabled in Firebase Authentication.',
};

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '11px 12px',
  borderRadius: '7px',
  border: `1px solid ${t.hairline}`,
  background: t.bg,
  fontSize: '14px',
  fontFamily: 'inherit',
  color: t.ink,
};

export default function Login() {
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'error' | 'ok', text }

  const fail = (err) =>
    setMessage({ type: 'error', text: MESSAGES[err.code] || 'Something went wrong. Please try again.' });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      if (mode === 'signup') {
        await createUserWithEmailAndPassword(auth, email.trim(), password);
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    if (!email.trim()) {
      setMessage({ type: 'error', text: 'Enter your email above, then choose "Forgot password".' });
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setMessage({ type: 'ok', text: 'Password reset email sent. Check your inbox.' });
    } catch (err) {
      fail(err);
    }
  };

  const signup = mode === 'signup';

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: `linear-gradient(180deg, #F3EEE3 0%, ${t.bg} 100%)`, padding: '24px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
    }}>
      <form onSubmit={submit} style={{
        width: '100%', maxWidth: '380px', background: t.bgCard, border: `1px solid ${t.hairline}`,
        borderRadius: '14px', padding: '28px', display: 'flex', flexDirection: 'column', gap: '14px',
        boxShadow: '0 12px 40px rgba(43,36,32,0.08)',
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', color: t.ink, letterSpacing: '-0.3px' }}>FarmTrack</h1>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: t.inkSoft }}>
            {signup ? 'Create your account to start mapping parcels.' : 'Sign in to your land records.'}
          </p>
        </div>

        <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11.5px', fontWeight: 600, color: t.inkSoft }}>
          Email
          <input type="email" required autoComplete="email" value={email}
            onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11.5px', fontWeight: 600, color: t.inkSoft }}>
          Password
          <input type="password" required minLength={6}
            autoComplete={signup ? 'new-password' : 'current-password'} value={password}
            onChange={(e) => setPassword(e.target.value)} style={inputStyle} />
        </label>

        {message && (
          <div role="alert" style={{
            fontSize: '12px', borderRadius: '6px', padding: '8px 10px',
            color: message.type === 'ok' ? '#065F46' : t.errorText,
            background: message.type === 'ok' ? '#ECFDF5' : t.errorBg,
            border: `1px solid ${message.type === 'ok' ? '#10B981' : t.errorBorder}`,
          }}>
            {message.text}
          </div>
        )}

        <button type="submit" disabled={busy} style={{
          background: t.ink, color: '#fff', border: 'none', borderRadius: '8px', padding: '12px',
          fontSize: '14px', fontWeight: 600, cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.7 : 1,
        }}>
          {busy ? 'Please wait…' : signup ? 'Create account' : 'Sign in'}
        </button>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
          <button type="button" onClick={() => { setMode(signup ? 'signin' : 'signup'); setMessage(null); }}
            style={{ background: 'none', border: 'none', color: t.sage, fontWeight: 600, cursor: 'pointer', padding: 0 }}>
            {signup ? 'Have an account? Sign in' : 'New here? Create account'}
          </button>
          {!signup && (
            <button type="button" onClick={reset}
              style={{ background: 'none', border: 'none', color: t.inkSoft, cursor: 'pointer', padding: 0 }}>
              Forgot password
            </button>
          )}
        </div>
      </form>
    </div>
  );
}