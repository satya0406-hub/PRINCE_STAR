import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Gamepad2, Play, Sparkles, Image as ImageIcon, Lock, CheckCircle2, 
  Clock, Heart, RotateCcw, Award, ChevronLeft, ChevronRight, HelpCircle, AlertTriangle, Laptop, Eye, HelpCircle as HelpIcon, Plus, EyeOff, Save, Trash2 
} from 'lucide-react';
import { Challenge, DayProgress, ChallengeProgress } from './challengeTypes';
import { useAuth } from '../lib/AuthContext';
import { db } from '../lib/firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc, getDocs } from 'firebase/firestore';

export function GamesPage() {
  // Tabs: 'arcade' or 'challenge'
  const [activeTab, setActiveTab] = useState<'arcade' | 'challenge'>('challenge');

  // Track which game is currently loaded in full page/fullscreen mode for Arcade
  const [activeGameId, setActiveGameId] = useState<string | null>(null);

  // 1. Arcade Cabinet games
  const myGames = [
    {
      id: 'game-1',
      title: 'Retro Galaxy Shooter',
      description: 'Your awesome arcade galaxy shooter game config.',
      src: '', 
      image: '',
      category: 'Arcade',
    },
    {
      id: 'game-2',
      title: 'Cosmic Memory',
      description: 'A stellar sound and color memory pattern sequence game.',
      src: 'https://www.novelgames.com/en/missionaries/', 
      image: 'https://images.unsplash.com/photo-1614730321146-b6fa6a46bcb4?auto=format&fit=crop&w=800&q=80', 
      category: 'Puzzle',
    }
  ];

  // 2. 14 Days Challenges defaults (Placeholders to be configured by the admin)
  const defaultChallenges: Challenge[] = Array.from({ length: 14 }, (_, i) => ({
    day: i + 1,
    title: `Challenge Day ${i + 1}`,
    codename: `day_${i + 1}`,
    description: `Please configure this Day ${i + 1} challenge puzzle. Paste your deployed game URL and related cover image below to make it playable!`,
    src: '',
    image: '',
    category: 'Logic',
    difficulty: 'Medium',
  }));

  // PERSISTENCE STATE: Progress & custom play URLs
  const { user } = useAuth();
  const isAdminUser = user?.email === 'satyamanikantareddysathi@gmail.com';

  const [challenges, setChallenges] = useState<Challenge[]>(defaultChallenges);
  const [challengesLoading, setChallengesLoading] = useState<boolean>(true);

  // Load challenges from Firestore (real-time!)
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'challenges'), (snapshot) => {
      const list: Challenge[] = [];
      snapshot.forEach(docSnap => {
        list.push({ ...docSnap.data() } as Challenge);
      });
      
      // Merge default challenges with incoming Firestore challenges to build a continuous Day 1-15+ sequence
      const mergedMap = new Map<number, Challenge>();
      defaultChallenges.forEach(c => {
        mergedMap.set(c.day, c);
      });
      list.forEach(c => {
        mergedMap.set(c.day, c);
      });
      const sortedMergedList = Array.from(mergedMap.values()).sort((a, b) => a.day - b.day);
      
      setChallenges(sortedMergedList);
      setChallengesLoading(false);
    }, (err) => {
      console.error("Error loading challenges from firestore: ", err);
      setChallenges(defaultChallenges);
      setChallengesLoading(false);
    });

    return () => unsub();
  }, [user]);

  // Seeding support function
  const handleSeedChallenges = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'challenges'));
      if (!querySnapshot.empty) {
        showNotice("Challenges are already initialized in the database!", "info");
        return;
      }
      for (const item of defaultChallenges) {
        await setDoc(doc(db, 'challenges', `day-${item.day}`), {
          day: item.day,
          title: item.title,
          codename: item.codename,
          description: item.description,
          src: item.src || '',
          image: item.image || '',
          category: item.category,
          difficulty: item.difficulty
        });
      }
      showNotice("Successfully seeded original 14 challenges to Firestore!", "success");
    } catch (err: any) {
      console.error(err);
      showNotice("Error seeding challenges: " + err.message, "error");
    }
  };

  // Clear support function to remove custom / seeded challenges in Firestore
  const handleClearFirestoreChallenges = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'challenges'));
      if (querySnapshot.empty) {
        showNotice("No challenges found in Firestore to clear.", "info");
        return;
      }
      
      const promises: Promise<void>[] = [];
      querySnapshot.forEach((docSnap) => {
        promises.push(deleteDoc(doc(db, 'challenges', docSnap.id)));
      });
      await Promise.all(promises);
      
      showNotice("Successfully cleared all custom challenge alignments from Firestore!", "success");
    } catch (err: any) {
      console.error(err);
      showNotice("Error clearing challenges: " + err.message, "error");
    }
  };

  const [progress, setProgress] = useState<ChallengeProgress>(() => {
    const saved = localStorage.getItem('prince_14day_progress');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error parsing progress data', e);
      }
    }
    
    // Default initial progress structure
    const init: ChallengeProgress = {};
    for (let d = 1; d <= 14; d++) {
      init[d] = {
        status: d === 1 ? 'unlocked' : 'locked',
        attemptsLeft: 3,
      };
    }
    return init;
  });

  // Dynamically initialize / ensure progress entries for any extra days loaded from DB:
  useEffect(() => {
    if (challenges.length === 0) return;
    let changed = false;
    const updated = { ...progress };
    challenges.forEach((c) => {
      if (!updated[c.day]) {
        updated[c.day] = {
          status: 'locked', // start as locked by default for sequential exploration
          attemptsLeft: 3,
        };
        changed = true;
      }
    });
    if (changed) {
      setProgress(updated);
    }
  }, [challenges, progress]);

  // Ticking time for 24h countdown
  const [nowTime, setNowTime] = useState<number>(Date.now());
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const bentoScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Smoothly core-scroll active day card into center view
    if (bentoScrollRef.current) {
      const children = bentoScrollRef.current.children;
      const targetCard = Array.from(children).find(child => {
        return child.getAttribute('data-day') === String(selectedDay);
      });
      if (targetCard) {
        targetCard.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center'
        });
      }
    }
  }, [selectedDay]);

  const scrollBento = (direction: 'left' | 'right') => {
    if (bentoScrollRef.current) {
      const scrollAmount = 300;
      bentoScrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const handleScrollAndSelectDay = (direction: 'prev' | 'next') => {
    const sortedDays = challenges.map(c => c.day).sort((a, b) => a - b);
    if (sortedDays.length === 0) return;
    
    const currentIndex = sortedDays.indexOf(selectedDay);
    let targetDay = selectedDay;
    
    if (direction === 'prev') {
      if (currentIndex > 0) {
        targetDay = sortedDays[currentIndex - 1];
      }
    } else {
      if (currentIndex < sortedDays.length - 1) {
        targetDay = sortedDays[currentIndex + 1];
      }
    }

    if (targetDay !== selectedDay) {
      setSelectedDay(targetDay);
    } else {
      scrollBento(direction === 'prev' ? 'left' : 'right');
    }
  };
  const [showDevPanel, setShowDevPanel] = useState<boolean>(false);
  const [editingUrlDay, setEditingUrlDay] = useState<number | null>(null);
  const [tempUrlValue, setTempUrlValue] = useState<string>('');
  const [tempImageValue, setTempImageValue] = useState<string>('');
  const [tempTitleValue, setTempTitleValue] = useState<string>('');
  const [tempDescValue, setTempDescValue] = useState<string>('');
  const [tempCategoryValue, setTempCategoryValue] = useState<string>('');
  const [tempDifficultyValue, setTempDifficultyValue] = useState<'Easy' | 'Medium' | 'Hard' | 'Expert'>('Medium');
  const [tempCodenameValue, setTempCodenameValue] = useState<string>('');

  // Immersive Sandbox Mode (playing custom or fallback game)
  const [sandboxItem, setSandboxItem] = useState<{ day: number; type: 'iframe' | 'local' } | null>(null);

  // Custom non-blocking notifications & confirmation states
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [confirmDeleteDay, setConfirmDeleteDay] = useState<number | null>(null);

  const showNotice = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification((prev) => prev?.message === message ? null : prev);
    }, 4500);
  };

  // Sync state to local storage
  useEffect(() => {
    if (Object.keys(progress).length > 0) {
      localStorage.setItem('prince_14day_progress', JSON.stringify(progress));
    }
  }, [progress]);

  // Clock Ticker to auto update countdowns
  useEffect(() => {
    const clock = setInterval(() => {
      setNowTime(Date.now());
    }, 1000);
    return () => clearInterval(clock);
  }, []);

  // Listen to postMessage integrations from user custom iframe games
  useEffect(() => {
    const handleRemoteMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data) return;

      // Detect various common solve message structures from custom iframe games
      let isSolvedMessage = false;

      // 1. If it's a string, inspect the string content recursively or check for keywords
      if (typeof data === 'string') {
        const valUpper = data.toUpperCase();
        if (
          valUpper === 'SOLVED' || 
          valUpper === 'CHALLENGE_SOLVED' || 
          valUpper === 'COMPLETED' || 
          valUpper === 'SUCCESS' || 
          valUpper === 'WIN' || 
          valUpper === 'PASSED' || 
          valUpper.includes('CHALLENGE_SOLVED') ||
          valUpper.includes('PUZZLE_SOLVED') ||
          valUpper.includes('GAME_COMPLETE')
        ) {
          isSolvedMessage = true;
        } else {
          // Check if it's a JSON string of an object
          try {
            const parsed = JSON.parse(data);
            if (
              parsed === 'SOLVED' ||
              parsed === 'CHALLENGE_SOLVED' ||
              parsed?.success === true ||
              parsed?.solved === true ||
              parsed?.completed === true ||
              parsed?.status === 'completed' ||
              parsed?.status === 'success' ||
              parsed?.type === 'CHALLENGE_SOLVED' ||
              parsed?.action === 'unlock_day'
            ) {
              isSolvedMessage = true;
            }
          } catch (e) {
            // Not a JSON string is fine
          }
        }
      } 
      // 2. If it's an object, check various common boolean properties or action tags
      else if (typeof data === 'object') {
        const valType = String(data?.type || '').toUpperCase();
        const valAction = String(data?.action || '').toUpperCase();
        const valStatus = String(data?.status || '').toUpperCase();
        const valEvent = String(data?.event || '').toUpperCase();

        if (
          data.type === 'CHALLENGE_SOLVED' ||
          data.action === 'unlock_day' ||
          data.success === true ||
          data.solved === true ||
          data.completed === true ||
          valType.includes('SOLVE') ||
          valType.includes('COMPLETE') ||
          valType.includes('SUCCESS') ||
          valAction.includes('SOLVE') ||
          valAction.includes('COMPLETE') ||
          valStatus === 'COMPLETED' ||
          valStatus === 'SUCCESS' ||
          valEvent === 'COMPLETED' ||
          valEvent === 'SOLVED'
        ) {
          isSolvedMessage = true;
        }
      }

      if (isSolvedMessage) {
        // Fallback to active sandbox day or selectedDay if no specific day passed in e.data
        const targetDay = (data && typeof data.day === 'number') 
          ? data.day 
          : (data && typeof data?.data?.day === 'number' ? data.data.day : (sandboxItem ? sandboxItem.day : selectedDay));

        console.log(`[Remote Bridge] Custom iframe solved message received for Day ${targetDay}`, data);
        handleDayChallengeSuccess(targetDay);
      }
    };

    window.addEventListener('message', handleRemoteMessage);
    return () => window.removeEventListener('message', handleRemoteMessage);
  }, [sandboxItem, selectedDay, progress]);

  // DERIVE AVAILABILITY based on 24-hour limit
  // For each Day D (d from 2 to maxDay):
  // Let's run a check if it should unlock right now.
  useEffect(() => {
    const updated = { ...progress };
    let changed = false;
    const maxDay = challenges.length > 0 ? Math.max(...challenges.map(c => c.day)) : 14;

    for (let d = 2; d <= maxDay; d++) {
      const current = updated[d] || { status: 'locked', attemptsLeft: 3 };
      const prev = updated[d - 1];

      if (prev && prev.status === 'completed' && current.status === 'locked') {
        const completedAtPost = prev.completedAt || 0;
        const cooldown = 24 * 60 * 60 * 1000; // 24 hours
        if (Date.now() - completedAtPost >= cooldown) {
          updated[d] = {
            ...current,
            status: 'unlocked',
            attemptsLeft: 3,
          };
          changed = true;
          console.log(`[Timer Engine] Automatically unlocked Day ${d} as 24h passed!`);
        }
      }
    }

    if (changed) {
      setProgress(updated);
    }
  }, [nowTime, progress, challenges]);

  // Handle Play button for normal arcade games
  const handleArcadePlay = (id: string, hasSrc: boolean) => {
    if (!hasSrc) return;
    setActiveGameId(id);
  };

  const activeArcadeGame = myGames.find(g => g.id === activeGameId);

  // Success handler for daily puzzle solvers
  const handleDayChallengeSuccess = (dayIndex: number) => {
    const updated = { ...progress };
    
    // Complete active day
    updated[dayIndex] = {
      ...updated[dayIndex],
      status: 'completed',
      completedAt: Date.now(),
    };

    // Lock upcoming days and launch countdown
    const maxDay = challenges.length > 0 ? Math.max(...challenges.map(c => c.day)) : 14;
    for (let d = dayIndex + 1; d <= maxDay; d++) {
      if (!updated[d] || updated[d].status !== 'completed') {
        updated[d] = {
          status: 'locked',
          attemptsLeft: 3,
        };
      }
    }

    setProgress(updated);
    setSandboxItem(null); // Return
  };

  // Failure handler (heart dock)
  const handleDayChallengeFailure = (dayIndex: number) => {
    const updated = { ...progress };
    const current = updated[dayIndex];
    if (current.attemptsLeft > 0) {
      updated[dayIndex] = {
        ...current,
        attemptsLeft: current.attemptsLeft - 1,
      };
      setProgress(updated);
    }
  };

  // DEV OVERRIDES FOR TESTING
  const devCompleteDay = (dayIndex: number) => {
    handleDayChallengeSuccess(dayIndex);
  };

  const devSkip24H = (dayIndex: number) => {
    const updated = { ...progress };
    const prevDayIndex = dayIndex - 1;
    if (updated[prevDayIndex]) {
      updated[prevDayIndex] = {
        ...updated[prevDayIndex],
        status: 'completed',
        // Set completedAt to exactly 24.1 hours ago to instantly fulfill criteria
        completedAt: Date.now() - (24.1 * 60 * 60 * 1000),
      };
      // Next day unlocks immediately via interval tracker
      updated[dayIndex] = {
        ...updated[dayIndex],
        status: 'unlocked',
        attemptsLeft: 3,
      };
      setProgress(updated);
    }
  };

  const devUnlockAll = () => {
    const updated = { ...progress };
    const maxDay = challenges.length > 0 ? Math.max(...challenges.map(c => c.day)) : 14;
    for (let d = 1; d <= maxDay; d++) {
      updated[d] = {
        status: 'unlocked',
        attemptsLeft: 3,
      };
    }
    setProgress(updated);
  };

  const devResetAll = () => {
    const init: ChallengeProgress = {};
    const maxDay = challenges.length > 0 ? Math.max(...challenges.map(c => c.day)) : 14;
    for (let d = 1; d <= maxDay; d++) {
      init[d] = {
        status: d === 1 ? 'unlocked' : 'locked',
        attemptsLeft: 3,
      };
    }
    setProgress(init);
    setSelectedDay(1);
    setSandboxItem(null);
  };

  const startCustomUrlEditing = (dayIndex: number) => {
    const chap = challenges.find(c => c.day === dayIndex) || defaultChallenges.find(c => c.day === dayIndex);
    if (!chap) return;
    setEditingUrlDay(dayIndex);
    setTempUrlValue(chap.src || '');
    setTempImageValue(chap.image || '');
    setTempTitleValue(chap.title || '');
    setTempDescValue(chap.description || '');
    setTempCategoryValue(chap.category || '');
    setTempDifficultyValue(chap.difficulty || 'Medium');
    setTempCodenameValue(chap.codename || 'custom');
  };

  const saveCustomUrl = async (dayIndex: number) => {
    try {
      const docId = `day-${dayIndex}`;
      await setDoc(doc(db, 'challenges', docId), {
        day: dayIndex,
        title: tempTitleValue || 'Untitled Challenge',
        codename: tempCodenameValue || 'custom',
        description: tempDescValue || '',
        src: tempUrlValue || '',
        image: tempImageValue || '',
        category: tempCategoryValue || 'Custom',
        difficulty: tempDifficultyValue || 'Medium'
      });
      setEditingUrlDay(null);
    } catch (err: any) {
      console.error(err);
      alert("Error saving challenge details: " + err.message);
    }
  };

  const handleAddNewDayChallenge = async () => {
    try {
      const nextDayNum = challenges.length > 0 ? Math.max(...challenges.map(c => c.day)) + 1 : 15;
      const docId = `day-${nextDayNum}`;
      await setDoc(doc(db, 'challenges', docId), {
        day: nextDayNum,
        title: `Dynamic Challenge Day ${nextDayNum}`,
        codename: `custom_day_${nextDayNum}`,
        description: 'Configure and describe this awesome custom task here!',
        src: '',
        image: 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?auto=format&fit=crop&w=800&q=80',
        category: 'Logic',
        difficulty: 'Medium'
      });
      setSelectedDay(nextDayNum);
      showNotice(`Added Day ${nextDayNum} Challenge successfully! You can now configure it dynamically.`, 'success');
    } catch (err: any) {
      console.error(err);
      showNotice("Error adding new challenge day: " + err.message, 'error');
    }
  };

  const handleDeleteDayChallenge = async (dayIndex: number) => {
    try {
      // 1. Delete standard doc ID day-X
      const docId = `day-${dayIndex}`;
      await deleteDoc(doc(db, 'challenges', docId));
      
      // 2. Query any other docs that might have "day === dayIndex" (in case they have a different doc ID)
      const q = collection(db, 'challenges');
      const querySnapshot = await getDocs(q);
      const promises: Promise<void>[] = [];
      querySnapshot.forEach((docSnap) => {
        if (docSnap.data().day === dayIndex) {
          promises.push(deleteDoc(doc(db, 'challenges', docSnap.id)));
        }
      });
      await Promise.all(promises);
      
      const remaining = challenges.filter(c => c.day !== dayIndex);
      setChallenges(remaining); // instant state sync
      
      if (remaining.some(c => c.day === dayIndex - 1)) {
        setSelectedDay(dayIndex - 1);
      } else if (remaining.length > 0) {
        setSelectedDay(remaining[0].day);
      } else {
        setSelectedDay(1);
      }
      showNotice(`Successfully deleted Day ${dayIndex} Challenge!`, 'success');
    } catch (err: any) {
      console.error(err);
      showNotice("Error deleting challenge day: " + err.message, 'error');
    }
  };

  const activeChallenge = challenges.find(c => c.day === selectedDay) || defaultChallenges.find(c => c.day === selectedDay) || challenges[0] || defaultChallenges[0];
  const activeDayProgress = progress[selectedDay] || { status: 'locked', attemptsLeft: 3 };

  // Calculate overall Completed Days percentage
  const completedCount = Object.values(progress).filter(p => p.status === 'completed').length;
  const totalDaysCount = challenges.length > 0 ? challenges.length : 14;
  const completionPercentage = Math.round((completedCount / totalDaysCount) * 100);

  // Calculate week-specific Completed Days out of 7
  const selectedWeekNum = Math.ceil(selectedDay / 7);
  const weekStartDay = (selectedWeekNum - 1) * 7 + 1;
  const weekEndDay = selectedWeekNum * 7;
  const weekCompletedCount = Object.keys(progress).filter(dayNumStr => {
    const dNum = parseInt(dayNumStr);
    return dNum >= weekStartDay && dNum <= weekEndDay && progress[dNum]?.status === 'completed';
  }).length;
  const weekCompletionPercentage = Math.round((weekCompletedCount / 7) * 100);

  // Format countdown string for a locked day target
  const getCooldownString = (dayIndex: number): string => {
    const prevDay = progress[dayIndex - 1];
    if (!prevDay || prevDay.status !== 'completed' || !prevDay.completedAt) return '24:00:00';
    
    const unlockTime = prevDay.completedAt + (24 * 60 * 60 * 1000);
    const diff = unlockTime - nowTime;
    
    if (diff <= 0) return '00:00:00';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    const pad = (num: number) => String(num).padStart(2, '0');
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  };

  // Fullscreen Iframe handler
  if (activeArcadeGame && activeArcadeGame.src) {
    return (
      <div className="fixed inset-0 w-screen h-screen z-50 bg-[#03060d] flex flex-col overflow-hidden select-none animate-fade-in">
        <div className="absolute top-5 left-5 z-50">
          <button
            onClick={() => setActiveGameId(null)}
            className="flex items-center gap-2.5 px-6 py-3.5 bg-brand-blue hover:bg-blue-600 active:scale-95 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-2xl border border-white/10 transition-all cursor-pointer"
          >
            ← Return to Games
          </button>
        </div>
        <div className="w-full h-full flex-1 bg-black">
          <iframe 
            src={activeArcadeGame.src}
            className="w-full h-full border-none outline-none"
            allow="autoplay; fullscreen; keyboard; gamepad"
            title={activeArcadeGame.title}
            referrerPolicy="no-referrer"
          />
        </div>
      </div>
    );
  }

  // Fullscreen sandbox iframe handler for weekly challenges
  if (sandboxItem && sandboxItem.type === 'iframe') {
    const matchedChallenge = challenges.find(c => c.day === sandboxItem.day) || defaultChallenges.find(c => c.day === sandboxItem.day);
    const challengeUrl = matchedChallenge?.src || '';
    return (
      <div className="fixed inset-0 w-screen h-screen z-50 bg-[#03060d] flex flex-col overflow-hidden select-none animate-fade-in">
        <div className="absolute top-5 left-5 z-50 flex items-center gap-4">
          <button
            onClick={() => setSandboxItem(null)}
            className="flex items-center gap-2.5 px-5 py-3 bg-neutral-900/90 hover:bg-neutral-850 active:scale-95 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-2xl border border-white/10 transition-all cursor-pointer"
          >
            ← Close Sandbox Game
          </button>
          
          <button
            onClick={() => handleDayChallengeSuccess(sandboxItem.day)}
            className="flex items-center gap-2.5 px-5 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-2xl border border-white/10 transition-all cursor-pointer"
          >
            ✓ Solve & Claim Day Success Key
          </button>
        </div>
        
        <div className="w-full h-full flex-1 bg-black">
          {challengeUrl ? (
            <iframe 
              src={challengeUrl}
              className="w-full h-full border-none outline-none"
              allow="autoplay; fullscreen; keyboard; gamepad"
              title={`Challenge Day ${sandboxItem.day}`}
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-center p-6 bg-slate-950">
              <AlertTriangle className="w-16 h-16 text-yellow-500 mb-4" />
              <h3 className="text-xl font-bold text-white uppercase tracking-wider mb-2">Challenge Link Not Configured</h3>
              <p className="text-slate-400 text-xs max-w-sm mb-6">
                An administrator has not loaded a live deployed link for Day {sandboxItem.day} yet. If you are the admin, use the "Configure" button under Deployed Play Configurations on this Day's card to add your own puzzle web link and custom cover image!
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-32 pb-24 px-4 sm:px-10 bg-[#070a13] relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-brand-blue/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[300px] h-[300px] bg-purple-500/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        
        {/* Page title header */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-brand-blue/10 border border-brand-blue/20 rounded-full text-brand-blue text-[10px] font-black uppercase tracking-[0.2em] mb-4"
          >
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            <span>Interactive Node Arcades</span>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="text-3xl sm:text-5xl md:text-6xl font-serif font-bold text-white uppercase tracking-wider mb-4 leading-tight"
          >
            Prince Star <span className="text-brand-blue">Play</span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-slate-400 text-xs sm:text-sm leading-relaxed"
          >
            Welcome to Prince Star Games! Access custom classic browser cabinets or test your logic boundaries inside our customized daily puzzles matrix.
          </motion.p>
        </div>

        {/* Dynamic Category Selector Menu */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex bg-slate-900/60 p-1 rounded-2xl border border-white/5 shadow-2xl">
            <button
              onClick={() => setActiveTab('challenge')}
              className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'challenge' 
                  ? 'bg-brand-blue text-white shadow-lg shadow-brand-blue/20' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Award className="w-4 h-4" /> 14-Day Chrono Challenge
              <span className="ml-1.5 px-1.5 py-0.5 bg-brand-blue/20 rounded text-[9px] text-brand-blue-light font-mono">
                {completionPercentage}%
              </span>
            </button>
            <button
              onClick={() => setActiveTab('arcade')}
              className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'arcade' 
                  ? 'bg-brand-blue text-white shadow-lg shadow-brand-blue/20' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Gamepad2 className="w-4 h-4" /> Custom Arcade Cabinets
            </button>
          </div>
        </div>

        {/* ----------------- TAB: ARCADE CABINETS ----------------- */}
        <AnimatePresence mode="wait">
          {activeTab === 'arcade' && (
            <motion.div
              key="arcade"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-8"
            >
              {myGames.map((game, idx) => {
                const hasSrc = !!game.src;
                return (
                  <div 
                    key={game.id}
                    className="bg-[#0b101f] border border-white/10 rounded-2xl overflow-hidden shadow-xl hover:border-brand-blue/40 transition-all flex flex-col group relative"
                  >
                    <div className="w-full h-[280px] relative bg-[#03060d] border-b border-white/5 overflow-hidden flex items-center justify-center">
                      <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center p-6 text-center">
                        {game.image ? (
                          <>
                            <img 
                              src={game.image} 
                              alt={game.title} 
                              className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-65 group-hover:scale-105 transition-all duration-500"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#0b101f] via-black/40 to-black/20" />
                          </>
                        ) : (
                          <div className="absolute inset-0 bg-[radial-gradient(#151b2e_1px,transparent_1px)] [background-size:16px_16px] opacity-30" />
                        )}

                        <div className="absolute top-4 left-4 px-2 py-0.5 bg-brand-blue/20 border border-brand-blue/30 backdrop-blur-sm rounded text-[9px] font-black uppercase text-brand-blue tracking-wider">
                          {game.category}
                        </div>
                        
                        <div className="relative z-10 w-14 h-14 rounded-full bg-white/5 flex items-center justify-center mb-4 border border-white/10 group-hover:scale-110 group-hover:border-brand-blue/30 group-hover:bg-brand-blue/10 transition-all text-slate-400 group-hover:text-brand-blue">
                          {game.image ? <Gamepad2 className="w-6 h-6" /> : <ImageIcon className="w-6 h-6 opacity-30" />}
                        </div>
                        
                        <h4 className="relative z-10 text-base font-serif font-black text-white uppercase tracking-wider mb-2 drop-shadow-md">
                          {game.title}
                        </h4>
                        <p className="relative z-10 text-xs text-slate-300 max-w-xs drop-shadow">
                          {game.description}
                        </p>
                      </div>
                    </div>
                    
                    <div className="p-6 flex items-center justify-between mt-auto bg-[#070b16]">
                      <div>
                        <span className={`text-[10px] font-black uppercase tracking-widest block mb-1 ${hasSrc ? 'text-emerald-400' : 'text-brand-blue'}`}>
                          Status: {hasSrc ? 'Deploy Active' : 'Offline'}
                        </span>
                        <span className="text-xs font-bold text-slate-300 uppercase tracking-wide">
                          {hasSrc ? 'Click Play to Connect' : 'Waiting for URL Link'}
                        </span>
                      </div>

                      {hasSrc ? (
                        <button
                          onClick={() => handleArcadePlay(game.id, hasSrc)}
                          className="px-5 py-2.5 bg-brand-blue hover:bg-blue-600 active:scale-95 text-white shadow-lg text-xs font-black uppercase tracking-wider rounded-xl transition"
                        >
                          <Play className="w-3.5 h-3.5 fill-current inline mr-1.5" /> Play
                        </button>
                      ) : (
                        <div className="px-5 py-2.5 bg-white/5 text-slate-500 border border-white/10 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 cursor-not-allowed">
                          <Play className="w-3.5 h-3.5 fill-current" /> Play
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </motion.div>
          )}

          {/* ----------------- TAB: 14-DAY CHALLENGE ----------------- */}
          {activeTab === 'challenge' && (
            <motion.div
              key="challenge"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-10"
            >
              {/* Overall Progress Board Card */}
              <div className="bg-[#0b101f] border border-white/10 p-6 sm:p-8 rounded-2xl shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="absolute top-0 right-0 w-80 h-80 bg-brand-blue/5 rounded-full blur-[100px] pointer-events-none" />
                            <div className="text-left space-y-2">
                  <h2 className="text-2xl font-serif font-black text-white uppercase tracking-wider">
                    🏆 Your Chrono Journey Progress
                  </h2>
                  <p className="text-slate-400 text-xs sm:text-sm max-w-xl">
                    Clear one riddle puzzle each day to unlock subsequent days sequentially. In order to preserve standard security and test real gameplay experience, a 24-hour ticker countdown will start immediately after solving a challenge!
                  </p>
                </div>

                <div className="flex items-center gap-4 bg-slate-900/60 border border-white/5 p-4 rounded-xl">
                  <div className="text-center">
                    <span className="text-3xl font-black text-brand-blue block">
                      {weekCompletedCount} <span className="text-sm font-normal text-slate-400">/ 7</span>
                    </span>
                    <span className="text-[9px] text-slate-500 font-extrabold uppercase tracking-widest block font-sans">Week {selectedWeekNum} Progress</span>
                  </div>
                  
                  {/* Circular/Line visual loading bar */}
                  <div className="w-24 bg-neutral-800 rounded-full h-3 overflow-hidden border border-white/10 relative">
                    <div 
                      style={{ width: `${weekCompletionPercentage}%` }} 
                      className="bg-brand-blue h-full transition-all duration-500 shadow-md shadow-brand-blue" 
                    />
                  </div>
                  <span className="text-xs font-black text-white font-mono">{weekCompletionPercentage}%</span>
                </div>
              </div>

              {/* Day Calendar Bento Slider Map */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400 text-left flex items-center gap-1.5 select-none">
                    <Clock className="w-4 h-4 text-brand-blue" />
                    <span>Interactive Bento Calendar Grid Track</span>
                  </h3>
                  
                  {/* Floating Forward & Backward Navigation Symbols */}
                  <div className="flex items-center gap-1.5 shrink-0 select-none">
                    <button
                      onClick={() => handleScrollAndSelectDay('prev')}
                      className="w-10 h-10 bg-[#0e1426] hover:bg-[#141b34] text-white rounded-xl border border-white/10 hover:border-brand-blue/50 flex items-center justify-center transition-all duration-200 cursor-pointer active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
                      title="View Previous Day Challenge"
                      disabled={selectedDay === (challenges[0]?.day || 1)}
                    >
                      <ChevronLeft className="w-5 h-5 text-slate-200" />
                    </button>
                    <button
                      onClick={() => handleScrollAndSelectDay('next')}
                      className="w-10 h-10 bg-[#0e1426] hover:bg-[#141b34] text-white rounded-xl border border-white/10 hover:border-brand-blue/50 flex items-center justify-center transition-all duration-200 cursor-pointer active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
                      title="View Next Day Challenge"
                      disabled={selectedDay === (challenges[challenges.length - 1]?.day || 14)}
                    >
                      <ChevronRight className="w-5 h-5 text-slate-200" />
                    </button>
                  </div>
                </div>
                
                <div 
                  ref={bentoScrollRef}
                  className="flex overflow-x-auto gap-4 pb-4 pt-1 scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] w-full"
                >
                  {challenges.map((challenge) => {
                    const prog = progress[challenge.day] || { status: 'locked', attemptsLeft: 3 };
                    const isCompleted = prog.status === 'completed';
                    const isUnlocked = prog.status === 'unlocked' || isCompleted;
                    const isSelected = selectedDay === challenge.day;
                    
                    // Determine if the previous day was completed and if this one is locked (waiting for 24h)
                    const prevProg = progress[challenge.day - 1];
                    const isWaitingCooldown = challenge.day > 1 && prevProg?.status === 'completed' && prog.status === 'locked';

                    return (
                      <button
                        key={challenge.day}
                        data-day={challenge.day}
                        onClick={() => setSelectedDay(challenge.day)}
                        className={`p-4 rounded-xl border transition-all text-left flex flex-col justify-between h-28 shrink-0 w-36 sm:w-40 md:w-[152px] relative overflow-hidden cursor-pointer ${
                          isSelected 
                            ? 'bg-brand-blue/15 border-brand-blue ring-2 ring-brand-blue/25 scale-[1.02] shadow-xl' 
                            : isCompleted 
                            ? 'bg-emerald-500/5 hover:bg-emerald-500/10 border-emerald-500/30' 
                            : isWaitingCooldown 
                            ? 'bg-yellow-500/5 border-yellow-500/20 shadow-md hover:border-yellow-500/40'
                            : isUnlocked 
                            ? 'bg-[#0f152a] hover:bg-[#151c38] border-white/10' 
                            : 'bg-neutral-900/40 border-white/5 opacity-55 cursor-not-allowed'
                        }`}
                      >
                        {/* Day Index banner */}
                        <div className="flex items-center justify-between w-full">
                          <span className="text-[10px] font-black font-mono uppercase tracking-widest text-slate-500">
                            Day {challenge.day}
                          </span>
                          {isCompleted ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 fill-emerald-500/20" />
                          ) : isWaitingCooldown ? (
                            <Clock className="w-4 h-4 text-yellow-500 animate-spin" style={{ animationDuration: '4s' }} />
                          ) : isUnlocked ? (
                            <span className="w-2 h-2 rounded-full bg-brand-blue animate-pulse" />
                          ) : (
                            <Lock className="w-3.5 h-3.5 text-slate-600" />
                          )}
                        </div>

                        {/* Codename */}
                        <div className="mt-2 text-xs font-serif font-black text-white uppercase tracking-wider truncate max-w-[95%]">
                          {challenge.title.split(' ')[0]}...
                        </div>

                        {/* Cooldown Timer or attempts badge */}
                        <div className="mt-auto pt-1 w-full text-left">
                          {isWaitingCooldown ? (
                            <span className="text-[10px] font-mono font-bold text-yellow-400 block bg-yellow-400/10 px-1.5 py-0.5 rounded text-center">
                              ⏳ {getCooldownString(challenge.day)}
                            </span>
                          ) : isCompleted ? (
                            <span className="text-[8px] uppercase tracking-widest font-black text-emerald-400 block font-mono">
                              SOLVED
                            </span>
                          ) : isUnlocked ? (
                            <span className="text-[8px] uppercase tracking-widest font-black text-brand-blue block font-mono">
                              READY!
                            </span>
                          ) : (
                            <span className="text-[8px] uppercase tracking-widest font-black text-slate-600 block font-mono">
                              LOCKED
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}

                  {isAdminUser && (
                    <button
                      onClick={handleAddNewDayChallenge}
                      className="p-4 rounded-xl border border-dashed border-brand-blue/40 bg-brand-blue/5 hover:bg-brand-blue/10 transition-all text-center flex flex-col items-center justify-center h-28 shrink-0 w-36 sm:w-40 md:w-[152px] cursor-pointer group"
                    >
                      <Plus className="w-6 h-6 text-brand-blue group-hover:scale-110 transition-transform mb-1" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">
                        Add Day {challenges.length > 0 ? Math.max(...challenges.map(c => c.day)) + 1 : 15}
                      </span>
                    </button>
                  )}
                </div>
              </div>

              {/* Active Day detailed panel */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Visual poster card & instructions details */}
                <div className="lg:col-span-4 bg-[#0b101f] border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
                  <div className="w-full h-44 relative bg-black">
                    {activeChallenge.image ? (
                      <img 
                        src={activeChallenge.image} 
                        alt={activeChallenge.title} 
                        className="absolute inset-0 w-full h-full object-cover opacity-50"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-[radial-gradient(#151b2e_1px,transparent_1px)] [background-size:16px_16px] opacity-30" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0b101f] via-black/40 to-black/10" />
                    <div className="absolute top-4 left-4 px-2 py-0.5 bg-brand-blue border border-brand-blue/30 rounded text-[9px] font-black uppercase text-white tracking-wider animate-pulse">
                      Day {activeChallenge.day} Topic
                    </div>

                    {/* Floating Forward & Backward Navigation Symbols */}
                    <div className="absolute top-4 right-4 flex items-center gap-1.5 z-20">
                      <button
                        onClick={() => {
                          const sortedDays = challenges.map(c => c.day).sort((a, b) => a - b);
                          const currentIndex = sortedDays.indexOf(selectedDay);
                          if (currentIndex > 0) {
                            setSelectedDay(sortedDays[currentIndex - 1]);
                          }
                        }}
                        disabled={selectedDay === (challenges[0]?.day || 1)}
                        className="w-7 h-7 bg-black/60 hover:bg-black/80 text-white rounded-lg border border-white/10 flex items-center justify-center transition disabled:opacity-30 disabled:pointer-events-none cursor-pointer hover:border-brand-blue/50"
                        title="Previous Day Challenge"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => {
                          const sortedDays = challenges.map(c => c.day).sort((a, b) => a - b);
                          const currentIndex = sortedDays.indexOf(selectedDay);
                          if (currentIndex !== -1 && currentIndex < sortedDays.length - 1) {
                            setSelectedDay(sortedDays[currentIndex + 1]);
                          }
                        }}
                        disabled={selectedDay === (challenges[challenges.length - 1]?.day || 14)}
                        className="w-7 h-7 bg-black/60 hover:bg-black/80 text-white rounded-lg border border-white/10 flex items-center justify-center transition disabled:opacity-30 disabled:pointer-events-none cursor-pointer hover:border-brand-blue/50"
                        title="Next Day Challenge"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Quick Switch Navigation Toolbar */}
                  <div className="bg-[#0e1426] px-4 py-2.5 border-b border-white/5 flex items-center justify-between text-xs font-mono font-black tracking-wider text-slate-400">
                    <button
                      onClick={() => {
                        const sortedDays = challenges.map(c => c.day).sort((a, b) => a - b);
                        const currentIndex = sortedDays.indexOf(selectedDay);
                        if (currentIndex > 0) {
                          setSelectedDay(sortedDays[currentIndex - 1]);
                        }
                      }}
                      disabled={selectedDay === (challenges[0]?.day || 1)}
                      className="flex items-center gap-1 hover:text-white transition disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4 text-brand-blue" />
                      <span>BACK</span>
                    </button>
                    
                    <span className="text-slate-500 font-bold uppercase text-[9px] select-none">
                      Challenge Day {selectedDay} / {challenges[challenges.length - 1]?.day || 14}
                    </span>

                    <button
                      onClick={() => {
                        const sortedDays = challenges.map(c => c.day).sort((a, b) => a - b);
                        const currentIndex = sortedDays.indexOf(selectedDay);
                        if (currentIndex !== -1 && currentIndex < sortedDays.length - 1) {
                          setSelectedDay(sortedDays[currentIndex + 1]);
                        }
                      }}
                      disabled={selectedDay === (challenges[challenges.length - 1]?.day || 14)}
                      className="flex items-center gap-1 hover:text-white transition disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                    >
                      <span>NEXT</span>
                      <ChevronRight className="w-4 h-4 text-brand-blue" />
                    </button>
                  </div>

                  <div className="p-6 text-left space-y-4">
                    <div>
                      <span className="text-[10px] text-brand-blue uppercase tracking-widest font-black">
                        Category: {activeChallenge.category}
                      </span>
                      <h3 className="text-xl font-serif font-black text-white uppercase tracking-wider mt-1 flex items-center justify-between gap-3 flex-wrap">
                        <span>{activeChallenge.title}</span>
                        {isAdminUser && activeChallenge.day > 14 && (
                          <button
                            onClick={() => setConfirmDeleteDay(activeChallenge.day)}
                            className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500/25 text-red-400 hover:text-red-300 border border-red-500/20 hover:border-red-500/40 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1 transition-all duration-200 cursor-pointer active:scale-95"
                            title="Delete this custom challenge"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete Day {activeChallenge.day}
                          </button>
                        )}
                      </h3>
                      <div className="mt-2 inline-block px-2.5 py-0.5 bg-neutral-900 border border-white/15 rounded text-[9px] font-bold uppercase tracking-wider text-slate-300">
                        Difficulty: <span className={
                          activeChallenge.difficulty === 'Easy' ? 'text-emerald-400' :
                          activeChallenge.difficulty === 'Medium' ? 'text-brand-blue' :
                          activeChallenge.difficulty === 'Hard' ? 'text-yellow-500' : 'text-red-500'
                        }>{activeChallenge.difficulty}</span>
                      </div>
                    </div>

                    <p className="text-slate-400 text-xs sm:text-sm leading-relaxed border-t border-white/5 pt-4">
                      {activeChallenge.description}
                    </p>

                    {/* Deployed Play Link Sandbox block */}
                    {isAdminUser ? (
                      <div className="bg-neutral-950/40 p-4 border border-white/5 rounded-xl space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider flex items-center gap-1">
                            <Laptop className="w-3.5 h-3.5" /> Deployed Play Configurations (Admin)
                          </span>
                          
                          <button
                            onClick={() => startCustomUrlEditing(activeChallenge.day)}
                            className="text-[9px] text-brand-blue uppercase font-black hover:underline tracking-wider"
                          >
                            Configure
                          </button>
                        </div>

                        {editingUrlDay === activeChallenge.day ? (
                          <div className="space-y-3 border-y border-white/5 py-3">
                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <label className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">Title</label>
                                <input
                                  type="text"
                                  value={tempTitleValue}
                                  onChange={(e) => setTempTitleValue(e.target.value)}
                                  className="w-full bg-neutral-900 border border-white/15 rounded-lg px-2 py-1 text-xs text-white outline-none focus:border-brand-blue"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">Codename</label>
                                <input
                                  type="text"
                                  value={tempCodenameValue}
                                  onChange={(e) => setTempCodenameValue(e.target.value)}
                                  className="w-full bg-neutral-900 border border-white/15 rounded-lg px-2 py-1 text-xs text-white outline-none focus:border-brand-blue"
                                />
                              </div>
                            </div>

                            <div className="space-y-1">
                              <label className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">Description</label>
                              <textarea
                                value={tempDescValue}
                                onChange={(e) => setTempDescValue(e.target.value)}
                                rows={2}
                                className="w-full bg-neutral-900 border border-white/15 rounded-lg px-2 py-1 text-xs text-white outline-none focus:border-brand-blue resize-none"
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <label className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">Category</label>
                                <input
                                  type="text"
                                  value={tempCategoryValue}
                                  onChange={(e) => setTempCategoryValue(e.target.value)}
                                  className="w-full bg-neutral-900 border border-white/15 rounded-lg px-2 py-1 text-xs text-white outline-none focus:border-brand-blue"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">Difficulty</label>
                                <select
                                  value={tempDifficultyValue}
                                  onChange={(e) => setTempDifficultyValue(e.target.value as any)}
                                  className="w-full bg-neutral-900 border border-white/15 rounded-lg px-2 py-1 text-xs text-white outline-none focus:border-brand-blue"
                                >
                                  <option value="Easy">Easy</option>
                                  <option value="Medium">Medium</option>
                                  <option value="Hard">Hard</option>
                                  <option value="Expert">Expert</option>
                                </select>
                              </div>
                            </div>

                            <div className="space-y-1">
                              <label className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">Deployed Game Link URL</label>
                              <input
                                type="text"
                                value={tempUrlValue}
                                onChange={(e) => setTempUrlValue(e.target.value)}
                                placeholder="e.g. https://my-deployed-puzzle.com"
                                className="w-full bg-neutral-900 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-brand-blue"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">Custom Cover Image URL</label>
                              <input
                                type="text"
                                value={tempImageValue}
                                onChange={(e) => setTempImageValue(e.target.value)}
                                placeholder="e.g. https://images.unsplash.com/photo-xxx"
                                className="w-full bg-[#151a2e]/60 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-brand-blue"
                              />
                            </div>

                            <div className="flex gap-1.5 justify-end pt-1">
                              <button
                                onClick={() => setEditingUrlDay(null)}
                                className="px-2.5 py-1 bg-neutral-800 text-slate-300 text-[10px] font-black uppercase tracking-wider rounded border border-white/5"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => saveCustomUrl(activeChallenge.day)}
                                className="px-2.5 py-1 bg-brand-blue text-white text-[10px] font-black uppercase tracking-wider rounded flex items-center gap-1"
                              >
                                <Save className="w-3 h-3" /> Save Changes
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="space-y-1">
                              <span className="text-[8px] uppercase tracking-wider text-slate-600 font-black block">Play Redirect:</span>
                              <div className="text-xs truncate text-slate-400 bg-neutral-900/80 px-2.5 py-2 font-mono rounded border border-white/5">
                                {activeChallenge.src || 'No custom URL loaded yet'}
                              </div>
                            </div>
                            
                            <div className="space-y-1 block">
                              <span className="text-[8px] uppercase tracking-wider text-slate-600 font-black block">Custom Cover Image:</span>
                              <div className="text-xs truncate text-slate-400 bg-neutral-900/80 px-2.5 py-2 font-mono rounded border border-white/5">
                                {activeChallenge.image || 'Default Challenge Poster active'}
                              </div>
                            </div>

                            {activeChallenge.day > 14 && (
                              <button
                                onClick={() => setConfirmDeleteDay(activeChallenge.day)}
                                className="w-full py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Delete Day {activeChallenge.day} Challenge
                              </button>
                            )}
                          </div>
                        )}

                        <div className="flex gap-2 pt-1.5">
                          <button
                            disabled={!activeDayProgress.status || activeDayProgress.status === 'locked'}
                            onClick={() => setSandboxItem({ day: activeChallenge.day, type: 'iframe' })}
                            className="flex-1 py-2 bg-neutral-900 hover:bg-neutral-850 active:scale-95 text-white rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 border border-white/10 transition disabled:opacity-35"
                          >
                            <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> Launch Deployed Redirect</span>
                          </button>
                        </div>

                        {/* Interactive postMessage Help Accordion */}
                        <div className="mt-3 pt-3 border-t border-white/5">
                          <details className="group">
                            <summary className="text-[10px] font-bold text-brand-blue hover:text-blue-400 cursor-pointer flex items-center justify-between select-none list-none uppercase tracking-wider font-mono">
                              <span>⚡ Auto-Solve from Custom Link</span>
                              <span className="transition-transform group-open:rotate-180">▼</span>
                            </summary>
                            <div className="mt-2 text-[11px] text-slate-400 leading-normal space-y-2 bg-black/30 p-2.5 rounded border border-white/5">
                              <p>
                                If your deployed puzzle page calls this simple JavaScript snippet from inside the iframe on success, our hub will intercept the notification and instantly unlock the next day!
                              </p>
                              <pre className="text-[10px] font-mono text-emerald-400 bg-black p-2 rounded overflow-x-auto border border-white/5">
  {`window.parent.postMessage({
    type: "CHALLENGE_SOLVED",
    day: ${activeChallenge.day}
  }, "*");`}
                              </pre>
                              <p className="text-[10px] text-slate-500 italic">
                                * Tip: You can also always click the green manual solved button in the upper sandbox menu block at any time!
                              </p>
                            </div>
                          </details>
                        </div>
                      </div>
                    ) : (
                      // Regular Users Display
                      activeChallenge.src ? (
                        <div className="bg-neutral-950/40 p-4 border border-white/5 rounded-xl space-y-3">
                          <span className="text-[10px] text-brand-blue font-extrabold uppercase tracking-wider flex items-center gap-1">
                            🚀 Custom Deployed Puzzle
                          </span>
                          <p className="text-slate-300 text-xs">
                            This challenge redirects to a custom puzzle deployment. Click below to start playing!
                          </p>
                          <button
                            disabled={!activeDayProgress.status || activeDayProgress.status === 'locked'}
                            onClick={() => setSandboxItem({ day: activeChallenge.day, type: 'iframe' })}
                            className="w-full py-2.5 bg-[#152e4f] hover:bg-blue-600 active:scale-95 text-white rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 border border-white/10 transition disabled:opacity-35 cursor-pointer"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" /> Play Deployed Game
                          </button>
                        </div>
                      ) : null
                    )}
                  </div>
                </div>

                {/* Main Interactive Solving Simulator Panel */}
                <div className="lg:col-span-8">
                  {activeDayProgress.status === 'locked' ? (
                    // Display COOLDOWN COUNTDOWN or standard LOCKED screen
                    <div className="bg-[#0b101f] border border-white/10 p-10 rounded-2xl shadow-2xl text-center space-y-6">
                      <div className="w-16 h-16 bg-neutral-900 rounded-full border border-white/10 flex items-center justify-center mx-auto">
                        <Lock className="w-6 h-6 text-slate-500 animate-pulse" />
                      </div>
                      
                      {/* Check if is in actual 24h countdown screen */}
                      {activeChallenge.day > 1 && progress[activeChallenge.day - 1]?.status === 'completed' ? (
                        <div className="space-y-3">
                          <span className="text-[10px] text-yellow-500 font-extrabold uppercase tracking-[0.2em] block">
                            ⌛ Day Challenge Lock Activated
                          </span>
                          <h4 className="text-2xl font-serif font-black text-white uppercase tracking-wider">
                            Countdown to Next Day Unlock
                          </h4>
                          <p className="text-slate-400 text-xs sm:text-sm max-w-md mx-auto leading-relaxed">
                            Outstanding job on Day {activeChallenge.day - 1}! To promote consistent coding & logic recall practices, Day {activeChallenge.day} unlocks in exactly:
                          </p>
                          <div className="text-5xl sm:text-6xl font-black text-yellow-400 tracking-wider font-mono bg-neutral-950 p-6 rounded-2xl max-w-xs mx-auto border border-white/5 shadow-2xl relative overflow-hidden">
                            <span className="relative z-10">{getCooldownString(activeChallenge.day)}</span>
                            <div className="absolute inset-0 bg-yellow-400/5 blur-3xl rounded-full" />
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono italic block pt-2">
                            * Use the developer override console below to bypass this countdown instantly for demonstration review!
                          </span>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-[0.2em] block">
                            🔒 Sequential Lock Ingress
                          </span>
                          <h4 className="text-xl font-serif font-black text-white uppercase tracking-wider">
                            Day Locked Prior Task Incomplete
                          </h4>
                          <p className="text-slate-400 text-xs sm:text-sm max-w-sm mx-auto leading-relaxed">
                            This sector challenge is locked. Complete the prior Day {activeChallenge.day - 1} challenge first to access this zone.
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    // Play Arena is active (Day is unlocked or completed)
                    <div className="space-y-6">
                      {activeChallenge.src ? (
                        <div className="bg-[#0b101f] border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
                          {/* Top Iframe Bar */}
                          <div className="px-5 py-3.5 bg-[#0e1426] border-b border-white/5 flex flex-wrap items-center justify-between gap-3 text-xs">
                            <div className="flex items-center gap-2">
                              {activeDayProgress.status === 'completed' ? (
                                <span className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-[10px] font-black uppercase tracking-wider font-mono">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Challenge Solved
                                </span>
                              ) : (
                                <span className="flex items-center gap-1.5 px-2.5 py-1 bg-brand-blue/10 border border-brand-blue/20 text-brand-blue-light rounded-lg text-[10px] font-black uppercase tracking-wider font-mono animate-pulse">
                                  <Play className="w-3.5 h-3.5 fill-current" /> Play Live Session
                                </span>
                              )}
                              <span className="text-slate-400 font-medium">
                                Hosted at: <code className="text-[10px] bg-neutral-900 px-1.5 py-0.5 rounded text-brand-blue font-mono">
                                  {(() => {
                                    try {
                                      return new URL(activeChallenge.src).hostname;
                                    } catch (e) {
                                      return 'External Provider';
                                    }
                                  })()}
                                </code>
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              {activeDayProgress.status !== 'completed' && (
                                <button
                                  onClick={() => handleDayChallengeSuccess(activeChallenge.day)}
                                  className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider rounded-lg transition active:scale-95 cursor-pointer flex items-center gap-1"
                                >
                                  Claim Day Victory Key
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Embed Frame */}
                          <div className="w-full h-[550px] bg-black relative">
                            <iframe 
                              src={activeChallenge.src}
                              className="w-full h-full border-none outline-none"
                              allow="autoplay; fullscreen; keyboard; gamepad"
                              title={`Challenge Day ${activeChallenge.day}`}
                              referrerPolicy="no-referrer"
                            />
                          </div>

                          {/* Help / Completion Footer Banner */}
                          {activeDayProgress.status === 'completed' ? (
                            <div className="p-4 bg-emerald-500/5 border-t border-emerald-500/20 text-emerald-400 font-bold text-xs text-center uppercase tracking-wider font-mono flex items-center justify-center gap-2">
                              <Sparkles className="w-4 h-4 animate-bounce" />
                              <span>Congratulations! Success key logged. The subsequent Day's challenge has been unlocked in series.</span>
                            </div>
                          ) : (
                            <div className="p-3 bg-neutral-950 text-slate-500 text-[10px] text-center leading-normal font-sans border-t border-white/5">
                              * Play the custom puzzle above. If playing outside this window, click "Claim Day Victory Key" in the menu header banner to log completion!
                            </div>
                          )}
                        </div>
                      ) : (
                        // Awaiting Configuration Placeholder
                        <div className="bg-[#0b101f] border border-white/10 p-10 rounded-2xl shadow-2xl text-center space-y-6">
                          <div className="w-16 h-16 bg-neutral-900 rounded-full border border-white/10 flex items-center justify-center mx-auto">
                            <AlertTriangle className="w-6 h-6 text-yellow-500 animate-pulse" />
                          </div>

                          <div className="space-y-3">
                            <span className="text-[10px] text-yellow-500 font-extrabold uppercase tracking-[0.2em] block font-mono">
                              ⚠️ Custom Deployed Link Required
                            </span>
                            <h4 className="text-xl font-serif font-black text-white uppercase tracking-wider">
                              Awaiting Challenge Game URL
                            </h4>
                            <p className="text-slate-400 text-xs sm:text-sm max-w-md mx-auto leading-relaxed">
                              {isAdminUser 
                                ? `You have not linked a live web URL puzzle for Day ${activeChallenge.day} yet. Use the customizable URL configurator panel on the left card (or click 'Configure' below the cover poster) to paste your deployed puzzle and related image instantly!` 
                                : `This day is open! However, the game architect has not configured a custom deployed web puzzle link for Day ${activeChallenge.day} yet. Please check back shortly or notify the site host.`}
                            </p>
                          </div>

                          {/* Manual action buttons */}
                          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                            {isAdminUser && (
                              <button
                                onClick={() => startCustomUrlEditing(activeChallenge.day)}
                                className="px-4 py-2 bg-[#152e4f] hover:bg-blue-600 text-white text-[10px] font-black uppercase tracking-wider rounded-lg transition active:scale-95 cursor-pointer flex items-center gap-1.5"
                              >
                                <Laptop className="w-3.5 h-3.5" /> Configure Game Link Now
                              </button>
                            )}
                            {activeDayProgress.status !== 'completed' && (
                              <button
                                onClick={() => handleDayChallengeSuccess(activeChallenge.day)}
                                className="px-4 py-2 bg-emerald-500/15 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-400 text-[10px] font-black uppercase tracking-wider rounded-lg transition active:scale-95 cursor-pointer"
                              >
                                Skip & Set Day Completed (Key Claim)
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Collapsible Developer Override & Configuration Hub */}
              <div className="bg-[#0d1222] border-t-2 border-dashed border-white/10 p-6 rounded-2xl shadow-xl text-left bg-gradient-to-r from-neutral-950/40 via-neutral-900/10 to-transparent">
                <button
                  onClick={() => setShowDevPanel(!showDevPanel)}
                  className="flex items-center justify-between w-full text-xs font-black uppercase text-slate-400 hover:text-white tracking-[0.15em] transition duration-200 cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <RotateCcw className="w-4 h-4 animate-spin" style={{ animationDuration: '6s' }} /> ⚙️ COLLAPSIBLE DEV DEMO CONSOLE (FOR TESTING UNLOCKS & COOLDOWN)
                  </span>
                  <span>{showDevPanel ? 'Collapse ▲' : 'Expand ▼'}</span>
                </button>
                
                {showDevPanel && (
                  <div className="mt-8 border-t border-white/5 pt-6 grid grid-cols-1 md:grid-cols-2 gap-8 text-xs text-slate-400 animate-slide-up">
                    <div className="space-y-4">
                      <span className="text-[10px] text-brand-blue uppercase font-black block tracking-widest border-b border-brand-blue/20 pb-1">
                        🔒 Sequential Bypass Core Rules
                      </span>
                      <p className="text-slate-500 leading-relaxed text-[11px]">
                        Since you requested arrangements and countdown rules, we implemented a ticking 24-hour limit from Day to Day. To test the sequential loop immediately without waiting 24 actual hours, utilize these override switches:
                      </p>
                      <div className="flex flex-wrap items-center gap-2.5 pt-1">
                        <button
                          onClick={() => devSkip24H(selectedDay)}
                          disabled={selectedDay === 1 || progress[selectedDay - 1]?.status !== 'completed'}
                          className="px-4 py-2.5 bg-yellow-500/10 hover:bg-yellow-500/25 border border-yellow-500/20 text-yellow-400 rounded-lg text-[10px] uppercase font-black tracking-wider transition disabled:opacity-30 cursor-pointer"
                        >
                          Skip COOLDOWN to Unlock Day {selectedDay}
                        </button>
                        <button
                          onClick={() => devCompleteDay(selectedDay)}
                          className="px-4 py-2.5 bg-brand-blue/15 hover:bg-brand-blue/30 border border-brand-blue/30 text-brand-blue rounded-lg text-[10px] uppercase font-black tracking-wider transition cursor-pointer"
                        >
                          Instant Complete Day {selectedDay}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <span className="text-[10px] text-slate-400 uppercase font-black block tracking-widest border-b border-white/10 pb-1">
                        🛠️ Master Control & Persistence Data
                      </span>
                      <p className="text-slate-500 leading-relaxed text-[11px]">
                        Erase LocalStorage progress to experience the Day 1 locked flow again, or instantly unlock all sectors for full review.
                      </p>
                      <div className="flex flex-wrap items-center gap-2.5 pt-1">
                        <button
                          onClick={devUnlockAll}
                          className="px-4 py-2.5 bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-400 rounded-lg text-[10px] uppercase font-black tracking-wider transition border border-emerald-500/30 cursor-pointer"
                        >
                          Unlock All Sectors
                        </button>
                        <button
                          onClick={devResetAll}
                          className="px-4 py-2.5 bg-red-500/10 hover:bg-red-500/25 border border-red-500/30 text-red-400 rounded-lg text-[10px] uppercase font-black tracking-wider transition cursor-pointer"
                        >
                          Reset Progress to Day 1
                        </button>
                        {isAdminUser && (
                          <>
                            <button
                              onClick={handleSeedChallenges}
                              className="px-4 py-2.5 bg-brand-blue/15 hover:bg-brand-blue/30 border border-brand-blue/40 text-brand-blue rounded-lg text-[10px] uppercase font-black tracking-wider transition cursor-pointer"
                              title="Seed standard blank placeholder items to Firestore"
                            >
                              Initialize All 14 Blank Challenges
                            </button>
                            <button
                              onClick={handleClearFirestoreChallenges}
                              className="px-4 py-2.5 bg-red-500/10 hover:bg-red-500/25 border border-red-500/30 text-red-400 rounded-lg text-[10px] uppercase font-black tracking-wider transition cursor-pointer"
                              title="Wipe custom configurations in the DB to start completely clean"
                            >
                              Wipe Firestore DB Challenges
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {isAdminUser && (
                      <div className="space-y-3 pt-4 border-t border-white/5 text-left">
                        <span className="text-[10px] text-brand-blue uppercase font-black block tracking-widest font-mono">
                          🧩 Custom Puzzle Design Rules & Requirements
                        </span>
                        <div className="bg-slate-900/40 p-4 border border-white/5 rounded-xl space-y-3.5 text-[11px] text-slate-400 leading-relaxed font-sans">
                          <div>
                            <span className="text-white font-bold text-xs uppercase tracking-wider text-brand-blue block mb-1">
                              How to build and integrate custom games:
                            </span>
                            <p>
                              You can construct your own custom puzzles using any web tech (HTML5/Canvas, React/Vue, Unity WebGL, Phaser, etc.), host them on any platform (e.g., GitHub Pages, Netlify, Vercel), and paste both the URL and a cover image in the <b>Configure</b> panel!
                            </p>
                          </div>
                          
                          <div className="space-y-1">
                            <span className="text-slate-200 font-bold block">1. Target Iframe Responsive Layout</span>
                            <p>
                              Set your game's frame to adapt gracefully to responsive widths and heights. Ensure the puzzle holds its focus correctly on smaller devices.
                            </p>
                          </div>

                          <div className="space-y-1">
                            <span className="text-slate-200 font-bold block">2. Native Auto-Solve Event Interaction (Crucial)</span>
                            <p>
                              Let your hosted game notify Prince Star instantly when a player wins by calling this simple JavaScript snippet within your code on success:
                            </p>
                            <pre className="text-[10px] font-mono text-emerald-400 bg-neutral-950 p-3 rounded-lg overflow-x-auto border border-white/5 mt-1 select-all">
{`window.parent.postMessage({
  type: "CHALLENGE_SOLVED",
  day: <DayNumber> // e.g. 1
}, "*");`}
                            </pre>
                            <p className="text-[10px] text-slate-500 italic mt-1 font-mono">
                              * If loaded inside an iframe, this automatically unlocks the subsequent day sequentially inside the user's browser!
                            </p>
                          </div>

                          <div className="space-y-1">
                            <span className="text-slate-200 font-bold block">3. Fallback Solved Button Override</span>
                            <p>
                              If users play your puzzle outside an iframe, they can also click the fallback <b>"✓ Solve & Claim Day Success Key"</b> button in the sandbox frame corner at any time to claim their key and log the win manually.
                            </p>
                          </div>

                          <div className="space-y-1">
                            <span className="text-slate-200 font-bold block">4. Visuals & Cover Images</span>
                            <p>
                              Pick landscape images (aspect ratio ~<code className="text-brand-blue font-mono text-[10px]">16:9</code>) from Unsplash or other CDNs to preserve the modern card aesthetic layouts.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating custom HTML Toast Notification */}
        <AnimatePresence>
          {notification && (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-2xl max-w-sm"
              style={{
                backgroundColor: notification.type === 'error' ? '#1c1015' : notification.type === 'success' ? '#0d1c16' : '#0f172a',
                borderColor: notification.type === 'error' ? '#ef444430' : notification.type === 'success' ? '#10b98130' : '#3b82f630'
              }}
            >
              <div
                className={`w-2 h-2 rounded-full ${
                  notification.type === 'error' ? 'bg-red-500' : notification.type === 'success' ? 'bg-emerald-500' : 'bg-blue-500'
                }`}
              />
              <p className="text-xs font-semibold text-slate-100">
                {notification.message}
              </p>
              <button
                onClick={() => setNotification(null)}
                className="text-slate-400 hover:text-white text-xs ml-auto font-bold pl-2 cursor-pointer"
              >
                ✕
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Custom Confirmation Dialog Modal Overlay (Doesn't use window.confirm) */}
        <AnimatePresence>
          {confirmDeleteDay !== null && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="bg-[#0b0f19] border border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl relative"
              >
                <div className="flex items-start gap-4 text-left">
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 flex items-center justify-center">
                    <Trash2 className="w-6 h-6" />
                  </div>
                  <div className="text-left flex-1">
                    <h3 className="text-lg font-serif font-black text-white uppercase tracking-wider">
                      Delete Challenge Day {confirmDeleteDay}?
                    </h3>
                    <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                      Are you absolutely sure you want to delete Challenge Day {confirmDeleteDay}? This action is permanent and cannot be undone. All players' progress data on this day will be detached.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 mt-6">
                  <button
                    onClick={() => setConfirmDeleteDay(null)}
                    className="px-4 py-2 bg-neutral-950 hover:bg-neutral-900 border border-white/10 text-slate-300 hover:text-white text-[10px] font-black uppercase tracking-wider rounded-lg transition duration-200 cursor-pointer active:scale-95"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      handleDeleteDayChallenge(confirmDeleteDay);
                      setConfirmDeleteDay(null);
                    }}
                    className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-[10px] font-black uppercase tracking-wider rounded-lg transition duration-200 cursor-pointer active:scale-95"
                  >
                    Yes, Permanent Delete
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
