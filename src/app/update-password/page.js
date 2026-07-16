'use client';

import { useState } from 'react';
import { supabase } from '../supabaseClient'; // Relative path to your client config
import { useRouter } from 'next/navigation';

export default function UpdatePasswordPage() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      setMessage("❌ Passwords do not match!");
      return;
    }

    try {
      setLoading(true);
      setMessage('');
      
      // Updates the user's password using the active token session from the email link
      const { error } = await supabase.auth.updateUser({ password: newPassword });

      if (error) throw error;

      setMessage("✅ Password updated successfully! Redirecting...");
      setTimeout(() => {
        router.push('/');
      }, 2500);
    } catch (err) {
      setMessage(`❌ Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="max-w-md w-full space-y-4 bg-white p-6 rounded-xl shadow-md border border-gray-200">
        <div className="text-center">
          <h2 className="text-xl font-bold text-blue-900">Create New Password</h2>
          <p className="text-xs text-gray-500 mt-1">Please enter your secure new password details below.</p>
        </div>
        
        {message && (
          <div className="p-3 text-xs text-center bg-blue-50 text-blue-700 rounded-lg font-medium border border-blue-100">
            {message}
          </div>
        )}

        <form onSubmit={handleUpdatePassword} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">New Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-gray-900"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Confirm New Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-gray-900"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm py-2 px-4 rounded-lg transition duration-200 shadow-sm min-h-[44px] disabled:opacity-50"
          >
            {loading ? 'Saving Changes...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}