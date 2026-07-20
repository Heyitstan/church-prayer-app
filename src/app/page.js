'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient';
import Auth from './Auth';
import { updateBanner } from './actions';
import { toast } from 'sonner';

export default function Home() {
  // Application State
  const [prayers, setPrayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [user, setUser] = useState(null);
  const [filterMyRequests, setFilterMyRequests] = useState(false);


  // Banner States
  const [bannerText, setBannerText] = useState('');
  const [bannerReference, setBannerReference] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEditingBanner, setIsEditingBanner] = useState(false);

  // Form Field States
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [author, setAuthor] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);

  // Helper Functions
  const fetchBannerSettings = useCallback(async (isMounted) => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('banner_text, banner_reference')
        .eq('id', 1)
        .single();
      if (error) throw error;

      if (isMounted && data) {
        setBannerText(data.banner_text || '');
        setBannerReference(data.banner_reference || '');
      }
    } catch (err) {
      console.error(`Error loading banner text: ${err.message}`);
    }
  }, []);
 

  const fetchPrayers = useCallback(async (isMounted) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('prayers')
        .select('*')
        .order('created_at', {ascending: false});
      if (error) throw error;
      if (isMounted) {
        setPrayers(data || []);
      }
    } catch (error) {
      console.error(`Error loading prayers: ${error.message}`);
      setPrayers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch prayers from Supabase on component mount
  useEffect(() => {
    let isMounted = true;
    fetchBannerSettings(isMounted);
    fetchPrayers(isMounted);
    const { data: {subscription}} = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      setUser(session?.user ?? null);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [fetchBannerSettings, fetchPrayers]);

  useEffect(() => {
    let isMounted = true;

    async function syncAdminPrivileges() {
      if (!user?.id) {
        setIsAdmin(false);
        return;
    }

      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle();
        if (!isMounted) return;

        if (error) {
          console.warn(`Note: Could not fetch explicit admin role (${error.message}). Defaulting to standard user.`);
          setIsAdmin(false);
          return;
        }
        setIsAdmin(data?.role === 'admin');
      } catch (err) {
        console.error(`Admin authorization context synchronization failed: ${err.message}`);
      }
    }

      syncAdminPrivileges();

      return () => {
        isMounted = false;
      };
    }, [user?.id]);

  useEffect(() => {
    if (!user) return;

    let isMounted = true;
    
    
    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'prayers' 
      }, (payload) => {
        if (!isMounted) return;
        const { eventType, new: newRow, old: oldRow } = payload;

        if (eventType === 'INSERT') {
          setPrayers((prev) => prev.some((p) => p.id === newRow.id) ? prev : [newRow, ...prev]);
        } else if (eventType === 'UPDATE') {
          setPrayers((prev) => prev.map((p) => (p.id === newRow.id ? newRow : p)));
        } else if (eventType === 'DELETE') {
          setPrayers((prev) => prev.filter((p) => p.id !== oldRow.id));
        }
      })
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;

    if (!title.trim() || !description.trim()) {
      toast.error('Please fill out both the title and prayer request description.');
      return;
    }

    const payload = {
      title: title.trim(),
      description: description.trim(),
      author: isAnonymous ? 'Anonymous' : author.trim() || 'Church Member',
      is_anonymous: isAnonymous,
      prayer_count: 0,
      user_id: user.id,
    };

    try {
      const { error } = await supabase
        .from('prayers')
        .insert([payload])

      if (error) throw error;

      // Reset form controls
      setTitle('');
      setDescription('');
      setAuthor('');
      setIsAnonymous(false);
      setShowForm(false);
    } catch (error) {
      console.error('Error submitting prayer:', error.message);
      toast.error('Failed to send request. Check your connection and try again.');
    }
  };

  const handleBannerFormSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    try {
      console.log("calling update banner");
      await updateBanner(formData);
      setBannerText(formData.get('banner_text'));
      setBannerReference(formData.get('banner_reference'));
      setIsEditingBanner(false);
      toast.success('Banner updated successfully!');
    } catch (err) {
      console.error(`Failed to update banner: ${err.message}`);
      toast.error('Banner was unable to be updated!');
    }
  };

  // 3. Atomically increment the "I Prayed" count on the database
  const handleIPrayed = async (id) => {
    if (!user) {
      toast.error('Please sign in to let this member know you are praying for them!');
      return;
    }

    try {
      const { error } = await supabase
        .rpc('increment_prayer_count', {row_id: id});

      if (error) throw error;
    } catch (error) {
      console.error('Error updating interaction counter:', error.message);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  }

  const handleDelete = async (id, postUserId) => {
    if (user?.id !== postUserId && !isAdmin) {
      toast.error("You can only delete your own prayer requests!");
      return;
    }

    if (!confirm("Are you sure you want to remove this prayer request?")) return;

    try {
      const {error} = await supabase
      .from('prayers')
      .delete()
      .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error(error.message);
      toast.error(`Failed to delete request.`);
    }
  }

  const displayedPrayers = filterMyRequests
    ? prayers.filter((p) => p.user_id === user?.id) : prayers;

  return (
    <main className="min-h-screen bg-gray-100 px-4 py-6 md:py-12 pb-24 relative">

      {/* Public Banner Container */}
      {bannerText && (
        <div className='bg-[url("/banner-bg.jpg")] bg-cover bg-center max-w-md mx-auto mb-4 p-4 rounded-xl shadow-sm text-center'>
          <p className='text-m font-medium text-amber-900 italic mt-3'>
            {bannerText}
          </p>
          {bannerReference && (
            <p className='text-sm font-bold text-amber-700 mt-4 uppercase tracking-wider'>
              - {bannerReference}
            </p>
          )}
        </div>
      )}

      {/* CASE 1: User is NOT logged in -> Show ONLY the Auth component screen */}
      {!user ? (
        <div className="max-w-md mx-auto pt-12">
          <Auth onAuthSuccess={() => setShowForm(false)} />
        </div>
      ) : (
        /* CASE 2: User IS logged in -> Reveal the entire app feed and workspace */
        <div className="max-w-md mx-auto space-y-4">

          {/* Admin Form Control Panel */}
          {isAdmin && (
            <section className="bg-white p-4 rounded-xl shadow-sm border border-dashed border-amber-300">
              <div className='flex justify-between items-center'>
                <h3 className='text-xs font-bold text-amber-800 uppercase tracking-wider'>Banner Control</h3>
                <button 
                  type="button"
                  onClick={() => setIsEditingBanner(!isEditingBanner)}
                  className='text-xs bg-amber-50 hover:bg-amber-100 text-amber-800 px-2 py-1 rounded border border-amber-200 transition font-medium'>
                    {isEditingBanner ? 'Cancel' : 'Edit Banner'}
                  </button>
              </div>

              {isEditingBanner && (
                /* Edit Mode */
                <form onSubmit={handleBannerFormSubmit} className="space-y-2">
                  <input
                    type="text"
                    name="banner_text"
                    defaultValue={bannerText}
                    placeholder="Update banner text..."
                    className="w-full text-xs text-gray-900 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none bg-gray-50"
                    required
                  />
                  <div className="flex gap-2">
                    <input
                      type="text"
                      name="banner_reference"
                      defaultValue={bannerReference}
                      placeholder="Reference (e.g., Psalm 23:1)"
                      className="flex-1 text-xs text-gray-900 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none bg-gray-50"
                    />
                    <button
                      type="submit"
                      className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition"
                    >
                      Save Changes
                    </button>
                  </div>
                </form>
              )}
            </section>
          )}
          
          {/* Header App Bar */}
          <header className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold text-blue-900 tracking-tight">VBCG Prayer Wall</h1>
              <button onClick={handleSignOut} className="text-[11px] text-red-500 hover:underline font-medium block mt-0.5">
                Sign Out ({user.email?.split('@')[0]})
              </button>
            </div>
            
            <button
              onClick={() => setShowForm(!showForm)}
              className={`text-xs font-semibold px-3 py-2 rounded-lg border transition min-h-[36px] ${
                showForm 
                  ? 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200' 
                  : 'bg-blue-600 text-white border-transparent hover:bg-blue-700'
              }`}
            >
              {showForm ? 'View Feed' : 'New Request'}
            </button>
          </header>

          {/* Request Submission Form */}
          {showForm && (
            <section className="bg-white p-5 rounded-xl shadow-md border border-blue-100 transition-all duration-200">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-base font-semibold text-gray-800">Submit a New Prayer Request</h2>
                <button onClick={() => setShowForm(false)} className="text-gray-400 text-sm p-1">✕</button>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="title" className="block text-xs font-medium text-gray-600 mb-1">Prayer Title *</label>
                  <input
                    id="title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Healing for my grandmother"
                    className="w-full text-sm text-gray-900 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="description" className="block text-xs font-medium text-gray-600 mb-1">Your Request *</label>
                  <textarea
                    id="description"
                    rows="3"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="How can our church community pray for you?"
                    className="w-full text-sm text-gray-900 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 resize-none"
                    required
                  />
                </div>

                {!isAnonymous && (
                  <div>
                    <label htmlFor="author" className="block text-xs font-medium text-gray-600 mb-1">Your Name (Optional)</label>
                    <input
                      id="author"
                      type="text"
                      value={author}
                      onChange={(e) => setAuthor(e.target.value)}
                      placeholder="e.g., Jane Doe"
                      className="w-full text-sm text-gray-900 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between pt-1">
                  <label htmlFor="anonymous-toggle" className="text-xs font-medium text-gray-600 cursor-pointer">Share anonymously</label>
                  <input
                    id="anonymous-toggle"
                    type="checkbox"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm py-2 px-4 rounded-lg transition min-h-[44px]"
                >
                  Post to Prayer Wall
                </button>
              </form>
            </section>
          )}

          {/* Dynamic Prayer Feed */}
          <section className="space-y-4" aria-label="Active Prayer Requests">
            <div className='flex justify-between items-center px-1'>
              <h2 className='text-xs font-bold text-gray-500 tracking-wider uppercase'>
                {filterMyRequests ? 'My Requests' : 'Community Feed'} ({displayedPrayers.length})
              </h2>

              <div className='flex bg-gray-200 p-0.5 rounded-lg text-xs'>
                <button
                type="button"
                onClick={() => setFilterMyRequests(false)}
                className={`px-3 py-1 rounded-md font-medium transition ${!filterMyRequests 
                ? 'bg-white text-blue-900 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'}`}>
                  All
                </button>
                <button 
                type="button"
                onClick={() => setFilterMyRequests(true)}
                className={`px-3 py-1 rounded-md font-medium transition ${filterMyRequests 
                  ? 'bg-white text-blue-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
                }`}>
                  Mine
                </button>
              </div>
            </div>
            
            {loading ? (
              <div className="text-center py-12 text-sm text-gray-400 font-medium">
                Synchronizing with prayer wall...
              </div>
            ) : displayedPrayers.length === 0 ? (
              <div className="text-center py-12 text-sm text-gray-400 bg-white rounded-xl border border-gray-200">
                {filterMyRequests 
                ? "You haven't posted any prayer requests yet."
                : "No prayer requests shared yet. Be the first to share!"}
              </div>
            ) : (
              displayedPrayers.map((prayer) => (
                <article key={prayer.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 space-y-3">
                  <div className="flex justify-between items-start">
                    <h3 className="font-semibold text-gray-900 text-base leading-tight">{prayer.title}</h3>
                    <div className='flex items-center gap-2'>
                      {(user.id === prayer.user_id || isAdmin) && (
                        <button 
                        onClick={()=>handleDelete(prayer.id, prayer.user_id)}
                        className="text-[11px] text-red-500 hover:text-red-700 font-medium px-2 py-0.5 rounded bg-red-50 hover:bg-red-100 transition">
                          Delete
                        </button>
                      )}
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{prayer.author}</span>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">{prayer.description}</p>

                  <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs text-gray-400">
                    <span>
                      {new Date(prayer.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                    
                    <button
                      onClick={() => handleIPrayed(prayer.id)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium transition cursor-pointer min-h-[36px]"
                    >
                      🙏 <span>I Prayed ({prayer.prayer_count})</span>
                    </button>
                  </div>
                </article>
              ))
            )}
          </section>

          {/* Mobile Floating Action Button */}
          {!showForm && (
            <button
              onClick={() => {
                setShowForm(true);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-2xl flex items-center justify-center w-14 h-14 z-50 md:hidden"
            >
              <span className="text-2xl font-light leading-none">+</span>
            </button>
          )}

        </div>
      )}
    </main>
  );
}
