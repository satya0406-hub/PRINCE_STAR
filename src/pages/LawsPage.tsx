import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError } from '../lib/errorHandler';
import { Search, Scale, ShieldAlert, BookOpen, ChevronRight, Gavel } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Law {
  id: string;
  section: string;
  title: string;
  description: string;
  content: string;
  author?: string;
  date?: any;
}

export function LawsPage() {
  const [laws, setLaws] = useState<Law[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function fetchLaws() {
      setLoading(true);
      try {
        const snapshot = await getDocs(query(collection(db, 'laws'), orderBy('section', 'asc')));
        setLaws(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Law)));
      } catch (err) {
        handleFirestoreError(err, 'list', 'laws');
      } finally {
        setLoading(false);
      }
    }
    fetchLaws();
  }, []);

  const filteredLaws = laws.filter(l => 
    l.section?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="pt-32 pb-24 px-4 max-w-7xl mx-auto min-h-screen">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-12"
      >
        {/* Page Hero Section */}
        <div className="text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-blue/10 border border-brand-blue/20 text-brand-blue text-[10px] font-black uppercase tracking-[0.3em] mb-2">
            <Scale className="w-3.5 h-3.5" /> Legal Database Protocol
          </div>
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-serif font-bold tracking-tight leading-none text-white">
            Indian <span className="text-brand-blue">Laws</span>
          </h1>
          <p className="text-gray-400 max-w-xl mx-auto text-sm md:text-base leading-relaxed">
            Real-time neural gateway to Indian Penal codes, legal architectures, and official constitutional references for developers and professionals.
          </p>
        </div>

        {/* Search Bar Section */}
        <div className="max-w-2xl mx-auto">
          <div className="relative group">
            <div className="absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-brand-blue/30 to-transparent transition-all group-focus-within:via-brand-blue" />
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-brand-blue transition-colors" />
            <input
              type="text"
              placeholder="Search by section, keyword, or title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-14 pr-6 py-4 bg-[#0a0d16]/80 text-white rounded-2xl border border-white/5 focus:outline-none focus:border-brand-blue/40 focus:ring-1 focus:ring-brand-blue/40 placeholder-slate-500 text-sm tracking-wide transition-all shadow-xl"
            />
          </div>
        </div>

        {/* Laws Grid Content */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="glass-card p-8 space-y-4 animate-pulse border-white/5 bg-white/[0.01]">
                <div className="h-6 w-24 bg-white/5 rounded-lg" />
                <div className="h-8 w-3/4 bg-white/5 rounded-lg" />
                <div className="space-y-2">
                  <div className="h-4 w-full bg-white/5 rounded" />
                  <div className="h-4 w-5/6 bg-white/5 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredLaws.map((law, i) => (
                <motion.div
                  key={law.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="group relative glass-card p-8 bg-gradient-to-b from-[#0a0e1a]/80 to-[#060911]/85 border border-white/5 hover:border-brand-blue/25 transition-all duration-300 flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-brand-blue/10 border border-brand-blue/20 text-brand-blue text-[10px] font-bold uppercase tracking-widest">
                        <Gavel className="w-3 h-3" /> Section {law.section}
                      </span>
                      <BookOpen className="w-4 h-4 text-slate-600 group-hover:text-brand-blue transition-colors" />
                    </div>
                    
                    <h3 className="text-xl font-bold font-serif text-white tracking-tight group-hover:text-brand-blue transition-colors duration-200">
                      {law.title}
                    </h3>
                    
                    <p className="text-gray-400 text-sm leading-relaxed line-clamp-3">
                      {law.description}
                    </p>
                  </div>

                  <div className="pt-6 mt-6 border-t border-white/5 flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                      {law.author || 'Indian Penal Code'}
                    </span>
                    <Link
                      to={`/laws/${law.id}`}
                      className="inline-flex items-center gap-1 text-[10px] sm:text-xs text-brand-blue font-bold tracking-widest uppercase hover:text-white transition-colors"
                    >
                      View Section <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </motion.div>
              ))}
            </div>

            {!loading && filteredLaws.length === 0 && (
              <div className="text-center py-24 glass-card border-white/5 flex flex-col items-center justify-center space-y-4">
                <ShieldAlert className="w-12 h-12 text-slate-600 animate-bounce" />
                <div className="text-slate-500 italic text-sm md:text-base">No laws matched your search criteria in this sub-directory.</div>
              </div>
            )}
          </>
        )}
      </motion.div>
    </div>
  );
}
