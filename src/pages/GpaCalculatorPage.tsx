import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calculator, Plus, Trash2, RotateCcw, AlertCircle, BookOpen, GraduationCap, Percent, Star, ExternalLink } from 'lucide-react';

// === SRM STUDENT REDIRECT LINK ===
// Paste your deployed/obtained SRM portal link here between the quotes when deploying!
const SRM_REDIRECT_URL = "https://example.com/srm-student-portal";


interface Course {
  id: string;
  name: string;
  credits: number;
  gradePoints: number; // e.g. 10 for O/A+, 9 for A, etc.
}

interface SemStats {
  id: string;
  semesterName: string;
  sgpa: number;
  totalCredits: number;
}

export function GpaCalculatorPage() {
  const [activeTab, setActiveTab] = useState<'sgpa' | 'cgpa'>('sgpa');
  const [scale, setScale] = useState<10 | 4>(10);

  // --- SGPA State ---
  const [courses, setCourses] = useState<Course[]>([
    { id: '1', name: 'Academic Course 1', credits: 4, gradePoints: 10 },
    { id: '2', name: 'Academic Course 2', credits: 3, gradePoints: 9 },
    { id: '3', name: 'Academic Course 3', credits: 3, gradePoints: 8 },
    { id: '4', name: 'Practical Lab 1', credits: 2, gradePoints: 10 },
  ]);

  const [courseNameInput, setCourseNameInput] = useState('');
  const [creditsInput, setCreditsInput] = useState<number>(3);
  const [gradeInput, setGradeInput] = useState<number>(10);

  // --- CGPA State ---
  const [semesters, setSemesters] = useState<SemStats[]>([
    { id: 'sem-1', semesterName: 'Semester 1', sgpa: 9.1, totalCredits: 20 },
    { id: 'sem-2', semesterName: 'Semester 2', sgpa: 8.8, totalCredits: 22 },
  ]);

  const [semNameInput, setSemNameInput] = useState('');
  const [semSgpaInput, setSemSgpaInput] = useState<number>(9.0);
  const [semCreditsInput, setSemCreditsInput] = useState<number>(20);

  // --- Calculations for SGPA ---
  const sgpaTotalWeightedPoints = courses.reduce((sum, c) => sum + (c.credits * c.gradePoints), 0);
  const sgpaTotalCredits = courses.reduce((sum, c) => sum + c.credits, 0);
  const calculatedSgpa = sgpaTotalCredits > 0 ? sgpaTotalWeightedPoints / sgpaTotalCredits : 0;

  // --- Calculations for CGPA ---
  const cgpaTotalWeightedPoints = semesters.reduce((sum, s) => sum + (s.sgpa * s.totalCredits), 0);
  const cgpaTotalCredits = semesters.reduce((sum, s) => sum + s.totalCredits, 0);
  const calculatedCgpa = cgpaTotalCredits > 0 ? cgpaTotalWeightedPoints / cgpaTotalCredits : 0;

  // Percentage estimations (approximate formula used universally: (CGPA - 0.75) * 10 or CGPA * 9.5)
  const getPercentageString = (gpaVal: number) => {
    if (gpaVal === 0) return '0%';
    if (scale === 10) {
      // standard formula: CGPA * 9.5
      return `${(gpaVal * 9.5).toFixed(1)}%`;
    } else {
      // standard 4.0 percentage mapping approximation
      return `${(gpaVal / 4 * 100).toFixed(1)}%`;
    }
  };

  const addCourse = (e: React.FormEvent) => {
    e.preventDefault();
    const newCourse: Course = {
      id: Math.random().toString(),
      name: courseNameInput.trim() || `Course ${courses.length + 1}`,
      credits: Number(creditsInput) || 3,
      gradePoints: Number(gradeInput),
    };
    setCourses([...courses, newCourse]);
    setCourseNameInput('');
  };

  const removeCourse = (id: string) => {
    setCourses(courses.filter(c => c.id !== id));
  };

  const clearCourses = () => {
    setCourses([]);
  };

  const addSemester = (e: React.FormEvent) => {
    e.preventDefault();
    const newSem: SemStats = {
      id: Math.random().toString(),
      semesterName: semNameInput.trim() || `Semester ${semesters.length + 1}`,
      sgpa: Number(semSgpaInput) || 8.0,
      totalCredits: Number(semCreditsInput) || 20,
    };
    setSemesters([...semesters, newSem]);
    setSemNameInput('');
  };

  const removeSemester = (id: string) => {
    setSemesters(semesters.filter(s => s.id !== id));
  };

  const clearSemesters = () => {
    setSemesters([]);
  };

  // Switch scale helper
  const handleScaleChange = (newScale: 10 | 4) => {
    setScale(newScale);
    // Convert current courses to sound equivalent defaults for scale 4
    if (newScale === 4) {
      setCourses(courses.map(c => ({
        ...c,
        gradePoints: c.gradePoints > 4 ? Math.max(1, Math.round((c.gradePoints / 10) * 4)) : c.gradePoints,
      })));
      setGradeInput(4);
      setSemesters(semesters.map(s => ({
        ...s,
        sgpa: s.sgpa > 4 ? Number(((s.sgpa / 10) * 4).toFixed(2)) : s.sgpa,
      })));
      setSemSgpaInput(4.0);
    } else {
      setCourses(courses.map(c => ({
        ...c,
        gradePoints: c.gradePoints <= 4 ? Math.min(10, Math.round((c.gradePoints / 4) * 10)) : c.gradePoints,
      })));
      setGradeInput(10);
      setSemesters(semesters.map(s => ({
        ...s,
        sgpa: s.sgpa <= 4 ? Number(((s.sgpa / 4) * 10).toFixed(2)) : s.sgpa,
      })));
      setSemSgpaInput(10.0);
    }
  };

  // Grade labels 10-point scale
  const getGradePointLabel10 = (pts: number) => {
    if (pts >= 10) return 'O (Outstanding / 10)';
    if (pts >= 9) return 'A+ (Excellent / 9)';
    if (pts >= 8) return 'A (Very Good / 8)';
    if (pts >= 7) return 'B+ (Good / 7)';
    if (pts >= 6) return 'B (Above Average / 6)';
    if (pts >= 5) return 'C (Average / 5)';
    if (pts >= 4) return 'P (Pass / 4)';
    return 'F (Fail / 0)';
  };

  // Grade labels 4-point scale
  const getGradePointLabel4 = (pts: number) => {
    if (pts >= 4) return 'A (Outstanding / 4.0)';
    if (pts >= 3) return 'B (Good / 3.0)';
    if (pts >= 2) return 'C (Satisfactory / 2.0)';
    if (pts >= 1) return 'D (Passing / 1.0)';
    return 'F (Fail / 0.0)';
  };

  return (
    <div className="min-h-screen pt-32 pb-24 px-4 sm:px-10 bg-[#070a13] relative overflow-hidden">
      {/* Visual lighting gradients */}
      <div className="absolute top-1/4 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-brand-blue/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-purple-500/5 rounded-full blur-[125px] pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header Section */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-brand-blue/10 border border-brand-blue/20 rounded-full text-brand-blue text-[10px] font-black uppercase tracking-[0.2em] mb-4"
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Academic Performance Terminal</span>
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl sm:text-5xl md:text-6xl font-serif font-bold text-white uppercase tracking-wider mb-4"
          >
            Grade Point <span className="text-brand-blue">GPA +</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="text-slate-400 text-sm sm:text-base leading-relaxed mb-6"
          >
            A smart, responsive calculators system for students to instantly compute their Semester SGPA and Cumulative CGPA with instant visual metrics mapping.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="inline-block"
          >
            <a
              href={SRM_REDIRECT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-brand-blue hover:bg-blue-600 border border-brand-blue/30 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 shadow-xl shadow-brand-blue/20 hover:scale-[1.03] active:scale-95"
            >
              Are you a SRM Student?
              <ExternalLink className="w-4 h-4" />
            </a>
          </motion.div>
        </div>

        {/* Global Controls: Grade Scale Choice & Navigation Tabs */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mb-10 p-4 bg-white/[0.02] border border-white/15 rounded-2xl">
          {/* Navigation Tabs */}
          <div className="flex bg-black/40 p-1.5 rounded-xl border border-white/5 w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('sgpa')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'sgpa'
                  ? 'bg-brand-blue text-white shadow-lg'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Calculator className="w-4 h-4" />
              SGPA Calculator
            </button>
            <button
              onClick={() => setActiveTab('cgpa')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'cgpa'
                  ? 'bg-brand-blue text-white shadow-lg'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Star className="w-4 h-4" />
              CGPA Aggregator
            </button>
          </div>

          {/* Standard Grading System Choice */}
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Grading scale:</span>
            <div className="flex bg-black/30 p-1 rounded-lg border border-white/5">
              <button
                onClick={() => handleScaleChange(10)}
                className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                  scale === 10 
                    ? 'bg-white/10 text-brand-blue border border-brand-blue/30' 
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                10.0 Scale
              </button>
              <button
                onClick={() => handleScaleChange(4)}
                className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                  scale === 4 
                    ? 'bg-white/10 text-brand-blue border border-brand-blue/30' 
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                4.0 Scale
              </button>
            </div>
          </div>
        </div>

        {/* Outer Grid: Forms / Calculated Output Blocks */}
        <AnimatePresence mode="wait">
          {activeTab === 'sgpa' ? (
            /* --- SGPA WORKSPACE --- */
            <motion.div 
              key="sgpa-panel"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-8"
            >
              {/* Form and Course List Inputs */}
              <div className="lg:col-span-2 space-y-6">
                {/* Course Addition Row Header Form */}
                <div className="p-6 bg-[#0b101f] border border-white/10 rounded-2xl shadow-xl">
                  <h3 className="text-sm font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-brand-blue" />
                    Insert Semester Course Details
                  </h3>

                  <form onSubmit={addCourse} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Course / Subject Name</label>
                      <input 
                        type="text"
                        value={courseNameInput}
                        onChange={(e) => setCourseNameInput(e.target.value)}
                        placeholder="e.g. Artificial Intelligence"
                        className="w-full h-11 px-4 bg-[#03060d] border border-white/10 rounded-xl text-white outline-none focus:border-brand-blue text-xs transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Credit Hours</label>
                      <select
                        value={creditsInput}
                        onChange={(e) => setCreditsInput(Number(e.target.value))}
                        className="w-full h-11 px-3 bg-[#03060d] border border-white/10 rounded-xl text-white outline-none focus:border-brand-blue text-xs transition-colors"
                      >
                        {[1, 2, 3, 4, 5, 6, 8, 10, 12].map(cr => (
                          <option key={cr} value={cr}>{cr} Cr</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <button
                        type="submit"
                        className="w-full h-11 bg-brand-blue hover:bg-blue-600 font-black text-xs uppercase tracking-wider text-white rounded-xl transition-all flex items-center justify-center gap-1.5"
                      >
                        <Plus className="w-4 h-4 text-white" />
                        Add Course
                      </button>
                    </div>
                  </form>

                  {/* Manual fast-buttons grade input bar */}
                  <div className="mt-5 pt-5 border-t border-white/5">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2.5">Select Grade Points</label>
                    <div className="flex flex-wrap gap-2">
                      {scale === 10 ? (
                        [10, 9, 8, 7, 6, 5, 4, 0].map(val => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setGradeInput(val)}
                            className={`px-3.5 py-1.5 rounded-lg border text-xs font-mono font-bold transition-all ${
                              gradeInput === val 
                                ? 'bg-brand-blue/20 text-white border-brand-blue' 
                                : 'bg-black/30 border-white/5 text-slate-400 hover:text-white'
                            }`}
                          >
                            {getGradePointLabel10(val).split(' (')[0]} ({val})
                          </button>
                        ))
                      ) : (
                        [4, 3, 2, 1, 0].map(val => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setGradeInput(val)}
                            className={`px-3.5 py-1.5 rounded-lg border text-xs font-mono font-bold transition-all ${
                              gradeInput === val 
                                ? 'bg-brand-blue/20 text-white border-brand-blue' 
                                : 'bg-black/30 border-white/5 text-slate-400 hover:text-white'
                            }`}
                          >
                            {getGradePointLabel4(val).split(' (')[0]} ({val.toFixed(1)})
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Courses Matrix table database view matches speed test */}
                <div className="p-6 bg-[#0b101f] border border-white/10 rounded-2xl shadow-xl">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-sm font-black text-white uppercase tracking-widest">
                      Subjects Logged ({courses.length})
                    </h3>
                    {courses.length > 0 && (
                      <button
                        onClick={clearCourses}
                        className="flex items-center gap-1.5 text-[10px] text-red-400 hover:text-red-300 uppercase tracking-widest font-black transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Clear All
                      </button>
                    )}
                  </div>

                  {courses.length === 0 ? (
                    <div className="py-12 text-center rounded-xl border border-dashed border-white/10 bg-white/[0.01]">
                      <AlertCircle className="w-8 h-8 text-slate-500 mx-auto mb-3" />
                      <p className="text-sm text-slate-400 uppercase tracking-wider font-bold mb-1">No Courses Found</p>
                      <p className="text-xs text-slate-500 max-w-xs mx-auto">Fill the top input fields and append your subjects roster list safely.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-white/5 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                            <th className="pb-3 pl-2">Course Title</th>
                            <th className="pb-3 text-center">Credit Hours</th>
                            <th className="pb-3 text-center">Grade Points Point</th>
                            <th className="pb-3 text-right pr-2">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {courses.map((course) => (
                            <tr key={course.id} className="group hover:bg-white/[0.02]">
                              <td className="py-4 pl-2 font-serif font-bold text-white uppercase tracking-wide">
                                {course.name}
                              </td>
                              <td className="py-4 text-center font-mono font-bold text-slate-300">
                                {course.credits}
                              </td>
                              <td className="py-4 text-center">
                                <span className="inline-block px-2.5 py-1 rounded bg-brand-blue/10 border border-brand-blue/20 text-brand-blue font-mono font-bold">
                                  {scale === 10 ? getGradePointLabel10(course.gradePoints) : getGradePointLabel4(course.gradePoints)}
                                </span>
                              </td>
                              <td className="py-4 text-right pr-2">
                                <button
                                  onClick={() => removeCourse(course.id)}
                                  className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/15 rounded-lg transition-all"
                                  title="Delete Course row"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* SGPA visual gauge metrics sidebar */}
              <div className="space-y-6">
                <div className="p-6 bg-[#0b101f] border border-white/10 rounded-2xl shadow-xl flex flex-col items-center text-center relative overflow-hidden">
                  <div className="absolute top-4 right-4 text-[9px] font-black uppercase tracking-widest text-slate-500">
                    Calculated Live
                  </div>

                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Your SGPA Score</h3>

                  {/* SVG Circle Gauge dial tracker */}
                  <div className="relative w-40 h-40 mb-6 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                      <circle 
                        cx="50" 
                        cy="50" 
                        r="42" 
                        className="stroke-white/5" 
                        strokeWidth="8" 
                        fill="transparent" 
                      />
                      <circle 
                        cx="50" 
                        cy="50" 
                        r="42" 
                        className="stroke-brand-blue transition-all duration-500" 
                        strokeWidth="8" 
                        fill="transparent" 
                        strokeDasharray={263.8}
                        strokeDashoffset={263.8 - (263.8 * (calculatedSgpa / scale))}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute flex flex-col items-center">
                      <span className="text-3xl font-serif font-black text-white">{calculatedSgpa.toFixed(2)}</span>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">/ {scale.toFixed(1)}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 w-full mb-4">
                    <div className="p-3 bg-black/40 border border-white/5 rounded-xl">
                      <span className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Credits</span>
                      <span className="text-lg font-mono font-bold text-white">{sgpaTotalCredits}</span>
                    </div>
                    <div className="p-3 bg-black/40 border border-white/5 rounded-xl">
                      <span className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Percentage</span>
                      <span className="text-lg font-mono font-bold text-brand-blue">{getPercentageString(calculatedSgpa)}</span>
                    </div>
                  </div>

                  <div className="p-4 bg-brand-blue/5 border border-brand-blue/10 rounded-xl text-left w-full">
                    <div className="flex gap-2 items-start">
                      <Percent className="w-4 h-4 text-brand-blue shrink-0 mt-0.5" />
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Your SGPA of <strong className="text-white">{calculatedSgpa.toFixed(2)}</strong> is calculated by dividing total weighted points ({sgpaTotalWeightedPoints}) by overall registered credits ({sgpaTotalCredits}).
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl">
                  <h4 className="text-[11px] font-black uppercase text-slate-500 tracking-wider mb-2">Calculation Paradigm</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    🎓 SGPA = Σ (Course Credit × Grade Point Value) / Σ (Total Course Credits)
                  </p>
                </div>
              </div>
            </motion.div>
          ) : (
            /* --- CGPA WORKSPACE --- */
            <motion.div 
              key="cgpa-panel"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-8"
            >
              {/* Form and Semester Aggregations List */}
              <div className="lg:col-span-2 space-y-6">
                {/* Semester additions section */}
                <div className="p-6 bg-[#0b101f] border border-white/10 rounded-2xl shadow-xl">
                  <h3 className="text-sm font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                    <GraduationCap className="w-5 h-5 text-brand-blue" />
                    Enter Semesters Stats for CGPA
                  </h3>

                  <form onSubmit={addSemester} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Semester Title</label>
                      <input 
                        type="text"
                        value={semNameInput}
                        onChange={(e) => setSemNameInput(e.target.value)}
                        placeholder="e.g. 1st Semester / First Year"
                        className="w-full h-11 px-4 bg-[#03060d] border border-white/10 rounded-xl text-white outline-none focus:border-brand-blue text-xs transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Semester SGPA</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max={scale}
                        value={semSgpaInput}
                        onChange={(e) => setSemSgpaInput(Number(e.target.value))}
                        className="w-full h-11 px-4 bg-[#03060d] border border-white/10 rounded-xl text-white outline-none focus:border-brand-blue text-xs transition-colors"
                      />
                    </div>

                    <div>
                      <button
                        type="submit"
                        className="w-full h-11 bg-brand-blue hover:bg-blue-600 font-black text-xs uppercase tracking-wider text-white rounded-xl transition-all flex items-center justify-center gap-1.5"
                      >
                        <Plus className="w-4 h-4 text-white" />
                        Add Term
                      </button>
                    </div>
                  </form>

                  {/* Manual Credit sizing inputs */}
                  <div className="flex gap-4 items-center mt-5 pt-4 border-t border-white/5">
                    <div className="w-full max-w-[200px]">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Total Term Credits</label>
                      <input 
                        type="number"
                        min="1"
                        max="100"
                        value={semCreditsInput}
                        onChange={(e) => setSemCreditsInput(Number(e.target.value))}
                        className="w-full h-10 px-3 bg-[#03060d] border border-white/10 rounded-xl text-white outline-none focus:border-brand-blue text-xs transition-colors"
                      />
                    </div>
                    <div>
                      <span className="block text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-1">Standard:</span>
                      <span className="text-[11px] text-slate-400 leading-none">Typical semester credit average runs around 18-24.</span>
                    </div>
                  </div>
                </div>

                {/* Term and Semesters Registry log table */}
                <div className="p-6 bg-[#0b101f] border border-white/10 rounded-2xl shadow-xl">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-sm font-black text-white uppercase tracking-widest">
                      Recorded Semesters ({semesters.length})
                    </h3>
                    {semesters.length > 0 && (
                      <button
                        onClick={clearSemesters}
                        className="flex items-center gap-1.5 text-[10px] text-red-400 hover:text-red-300 uppercase tracking-widest font-black transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Clear All
                      </button>
                    )}
                  </div>

                  {semesters.length === 0 ? (
                    <div className="py-12 text-center rounded-xl border border-dashed border-white/10 bg-white/[0.01]">
                      <AlertCircle className="w-8 h-8 text-slate-500 mx-auto mb-3" />
                      <p className="text-sm text-slate-400 uppercase tracking-wider font-bold mb-1">No Semesters Added</p>
                      <p className="text-xs text-slate-500 max-w-xs mx-auto">Fill & add your individual academic semester SGPAs to review cumulative CGPA.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-white/5 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                            <th className="pb-3 pl-2">Semester Term</th>
                            <th className="pb-3 text-center">Semester Credits</th>
                            <th className="pb-3 text-center">SGPA Rating</th>
                            <th className="pb-3 text-right pr-2">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {semesters.map((sem) => (
                            <tr key={sem.id} className="group hover:bg-white/[0.02]">
                              <td className="py-4 pl-2 font-serif font-bold text-white uppercase tracking-wide">
                                {sem.semesterName}
                              </td>
                              <td className="py-4 text-center font-mono font-bold text-slate-300">
                                {sem.totalCredits}
                              </td>
                              <td className="py-4 text-center">
                                <span className="inline-block px-3 py-1 rounded bg-brand-blue/10 border border-brand-blue/20 text-brand-blue font-mono font-bold">
                                  {sem.sgpa.toFixed(2)}
                                </span>
                              </td>
                              <td className="py-4 text-right pr-2">
                                <button
                                  onClick={() => removeSemester(sem.id)}
                                  className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/15 rounded-lg transition-all"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* Sidebar metrics for Cumulative CGPA computation */}
              <div className="space-y-6">
                <div className="p-6 bg-[#0b101f] border border-white/10 rounded-2xl shadow-xl flex flex-col items-center text-center relative overflow-hidden">
                  <div className="absolute top-4 right-4 text-[9px] font-black uppercase tracking-widest text-slate-500">
                    Cumulative Calculation
                  </div>

                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Your Cumulative CGPA</h3>

                  {/* SVG Circle Gauge dial for CGPA */}
                  <div className="relative w-40 h-40 mb-6 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                      <circle 
                        cx="50" 
                        cy="50" 
                        r="42" 
                        className="stroke-white/5" 
                        strokeWidth="8" 
                        fill="transparent" 
                      />
                      <circle 
                        cx="50" 
                        cy="50" 
                        r="42" 
                        className="stroke-emerald-500 transition-all duration-500" 
                        strokeWidth="8" 
                        fill="transparent" 
                        strokeDasharray={263.8}
                        strokeDashoffset={263.8 - (263.8 * (calculatedCgpa / scale))}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute flex flex-col items-center">
                      <span className="text-3xl font-serif font-black text-white">{calculatedCgpa.toFixed(2)}</span>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">/ {scale.toFixed(1)}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 w-full mb-4">
                    <div className="p-3 bg-black/40 border border-white/5 rounded-xl">
                      <span className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Sem Credits</span>
                      <span className="text-lg font-mono font-bold text-white">{cgpaTotalCredits}</span>
                    </div>
                    <div className="p-3 bg-black/40 border border-white/5 rounded-xl">
                      <span className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Overall percentage</span>
                      <span className="text-lg font-mono font-bold text-emerald-400">{getPercentageString(calculatedCgpa)}</span>
                    </div>
                  </div>

                  <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl text-left w-full animate-fade-in">
                    <div className="flex gap-2 items-start">
                      <Percent className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        CGPA of <strong className="text-white">{calculatedCgpa.toFixed(2)}</strong> sums credit-weighted SGPAs ({cgpaTotalWeightedPoints.toFixed(1)}) and divides by cumulative overall register hours ({cgpaTotalCredits}).
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl">
                  <h4 className="text-[11px] font-black uppercase text-slate-500 tracking-wider mb-2">CGPA Equation</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    🎓 CGPA = Σ (Term SGPA × Term Credits) / Σ (Total Combined Credits)
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
