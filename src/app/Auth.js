'use client';

import {useState} from 'react';
import {supabase} from './supabaseClient';

export default function Auth({onAuthSuccess}) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      if (isSignUp) {
        // 1. Sign up the user account
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        
        // 2. If Supabase auto-logs them in, flip the screen immediately
        if (data?.session) {
          if (onAuthSuccess) onAuthSuccess();
        } else {
          alert('Account created! Please check your email or disable email confirmation in your Supabase dashboard.');
        }
      } else {
        // 3. Regular Sign In path
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (onAuthSuccess) onAuthSuccess();
      }
    } catch (error) {
      setErrorMsg(error.message);
    } finally {
      setLoading(false);
    }
  };

return (
    <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200 space-y-4 max-w-md mx-auto">
      <div className="text-center">
        <h2 className="text-xl font-bold text-blue-900">
          {isSignUp ? 'Create a Church Account' : 'Sign In to Prayer Wall'}
        </h2>
        <p className="text-xs text-gray-500 mt-1">
          {isSignUp ? 'Join our community to share prayer requests' : 'Log in to share requests and pray for others'}
        </p>
      </div>

      {errorMsg && (
        <div className="text-xs font-medium text-red-600 bg-red-50 p-2 rounded-lg border border-red-100">
          ⚠️ {errorMsg}
        </div>
      )}

      <form onSubmit={handleAuth} className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Email Address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-gray-900"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-gray-900"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm py-2 px-4 rounded-lg transition duration-200 shadow-sm min-h-[44px] disabled:opacity-50"
        >
          {loading ? 'Processing...' : isSignUp ? 'Sign Up' : 'Sign In'}
        </button>
      </form>

      <div className="text-center pt-2 border-t border-gray-100">
        <button
          type="button"
          onClick={() => setIsSignUp(!isSignUp)}
          className="text-xs text-blue-600 hover:underline font-medium"
        >
          {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
        </button>
      </div>
    </div>
  );
}