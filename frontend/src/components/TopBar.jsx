import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client.js';

export default function TopBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ classes: [], students: [] });
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const searchRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
// frontend/src/pages/TopBar.jsx

// inside your TopBar.jsx useEffect
const fetchResults = async () => {
  if (!query.trim()) {
    setResults({ classes: [], students: [] });
    setIsOpen(false);
    return;
  }

  try {
    // FORCE the key to be 'search'
    const [classRes, studentRes] = await Promise.all([
      api.get(`/classes?search=${encodeURIComponent(query)}`), 
      api.get(`/users/search?search=${encodeURIComponent(query)}&role=student`)
    ]);

    setResults({
      classes: classRes.data.data || [],
      students: studentRes.data.data || []
    });
    setIsOpen(true);
  } catch (err) {
    console.error("Search failed:", err);
  }
};

    // Fast debounce for instant feedback
    const timer = setTimeout(fetchResults, 150); 
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <header className="flex items-center gap-4 border-b border-slate-200 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-900 sticky top-0 z-50">
      <div className="mx-auto flex w-full max-w-5xl flex-1 items-center gap-4">
        
        <div className="relative w-full max-w-xl" ref={searchRef}>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => query.length >= 1 && setIsOpen(true)}
            placeholder="Type to search..."
            className="w-full rounded-full border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none ring-brand-600 focus:ring-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white transition-all"
          />

          {/* SUGGESTIONS PANEL */}
          {isOpen && query.length >= 1 && (
            <div className="absolute top-full mt-2 w-full overflow-hidden rounded-[2rem] border border-slate-200 bg-white/90 backdrop-blur-xl shadow-2xl dark:border-slate-700 dark:bg-slate-900/90 animate-in fade-in slide-in-from-top-2 duration-200">
              
              {/* CLASSES */}
              {results.classes.length > 0 && (
                <div className="p-3">
                  <p className="px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Matched Classes</p>
                  {results.classes.map(cls => (
                    <div 
                      key={cls._id}
                      onClick={() => { navigate(`/app/classes`); setIsOpen(false); setQuery(''); }}
                      className="flex cursor-pointer items-center gap-4 rounded-2xl px-4 py-3 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors group"
                    >
                      <span className="text-xl group-hover:scale-110 transition-transform">🏫</span>
                      <div className="text-left">
                        <p className="text-sm font-black text-slate-800 dark:text-white">{cls.name}</p>
                        <p className="text-[10px] font-bold text-slate-500 uppercase">{cls.subject} · {cls.standard}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* STUDENTS */}
              {results.students.length > 0 && (
                <div className="border-t border-slate-100 p-3 dark:border-slate-800">
                  <p className="px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Students</p>
                  {results.students.map(std => (
                    <div 
                      key={std._id}
                      onClick={() => { navigate(`/app/messages`, { state: { contactId: std._id } }); setIsOpen(false); setQuery(''); }}
                      className="flex cursor-pointer items-center gap-4 rounded-2xl px-4 py-3 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors group"
                    >
                      <span className="text-xl group-hover:scale-110 transition-transform">👤</span>
                      <div className="text-left">
                        <p className="text-sm font-black text-slate-800 dark:text-white">{std.firstName} {std.lastName}</p>
                        <p className="text-[10px] font-bold text-slate-500">@{std.username}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {results.classes.length === 0 && results.students.length === 0 && (
                <div className="p-10 text-center">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No matching results for "{query}"</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="ml-auto flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-sm cursor-pointer hover:bg-brand-100 transition-colors">🔔</div>
          <div className="w-10 h-10 rounded-full bg-brand-600 text-white flex items-center justify-center text-sm font-black cursor-pointer shadow-lg shadow-brand-200">?</div>
        </div>
      </div>
    </header>
  );
}