import React, { useState, useEffect, useRef, useCallback } from 'react';
import { generateSchedules, refreshSchedule, getScheduleHash, checkPreferences, getInstructor, scoreSchedule, hasValidTimeData } from '../utils/scheduler';
import { levenshtein } from '../utils/stringUtils';
import ScheduleView from './ScheduleView';
import {
  FaPlus,
  FaTimes,
  FaExclamationTriangle,
  FaHistory,
  FaSlidersH,
  FaCheck,
  FaTrashAlt,
  FaHeart,
  FaArrowLeft,
  FaArrowRight,
  FaChalkboardTeacher,
  FaChevronDown,
  FaChevronUp,
  FaCalendarAlt,
  FaLeaf,
  FaSeedling,
} from 'react-icons/fa';

// Returns array of all matching professors
const findProfessors = (query, data) => {
  if (!query || !data) return [];
  const normalizedQuery = query.toLowerCase().trim();
  if (normalizedQuery.length < 2) return [];

  const instructors = new Set();
  data.forEach(row => {
    const name = getInstructor(row);
    if (name && name !== 'TBA') instructors.add(name);
  });

  const matches = [];

  for (const instructor of instructors) {
    const normalizedInstructor = instructor.toLowerCase();

    // Exact match - highest priority
    if (normalizedInstructor === normalizedQuery) {
      return [instructor]; // Return only exact match
    }

    // Substring match
    if (normalizedInstructor.includes(normalizedQuery)) {
      matches.push({ name: instructor, score: 0 });
      continue;
    }

    // Fuzzy match - only for longer queries (4+ chars) to avoid too many false positives
    // Threshold is based on query length, not instructor name length
    if (normalizedQuery.length >= 4) {
      const dist = levenshtein(normalizedQuery, normalizedInstructor);
      // Allow ~25% of query length as edits, minimum 2
      const threshold = Math.max(2, Math.floor(normalizedQuery.length / 4));

      if (dist <= threshold) {
        matches.push({ name: instructor, score: dist });
      }
    }
  }

  // Sort by score (lower is better) and return names
  matches.sort((a, b) => a.score - b.score);
  return matches.map(m => m.name);
};

const formatSemesterName = (sem) => {
  switch(sem) {
    case 'fall25': return "Fall '25";
    case 'spring26': return "Spring '26";
    case 'fall26': return "Fall '26";
    case 'spring27': return "Spring '27";
    default: return sem;
  }
};

const ScheduleInterface = ({ sheetDataFall25, sheetDataSpring26, sheetDataFall26, sheetDataSpring27 }) => {
  // Lazy initialize state from localStorage
  const [semester, setSemester] = useState(() => {
    try {
      const saved = localStorage.getItem('coursalog_state');
      return saved ? (JSON.parse(saved).semester || 'fall25') : 'fall25';
    } catch (e) { return 'fall25'; }
  });

  const [courseInput, setCourseInput] = useState(() => {
    try {
      const saved = localStorage.getItem('coursalog_state');
      return saved ? (JSON.parse(saved).courseInput || '') : '';
    } catch (e) { return ''; }
  });

  const [selectedCourses, setSelectedCourses] = useState(() => {
    try {
      const saved = localStorage.getItem('coursalog_state');
      return saved ? (JSON.parse(saved).selectedCourses || []) : [];
    } catch (e) { return []; }
  });

  const [preferences, setPreferences] = useState(() => {
    try {
      const saved = localStorage.getItem('coursalog_state');
      return saved ? (JSON.parse(saved).preferences || { noFridays: false, no9am: false, endBy: null }) : { noFridays: false, no9am: false, endBy: null };
    } catch (e) { return { noFridays: false, no9am: false, endBy: null }; }
  });

  const [showPreferences, setShowPreferences] = useState(false);
  const preferencesRef = useRef(null);
  const [showSemesterDropdown, setShowSemesterDropdown] = useState(false);
  const semesterDropdownRef = useRef(null);

  const [professorMode, setProfessorMode] = useState(() => {
    try {
      const saved = localStorage.getItem('coursalog_state');
      return saved ? (JSON.parse(saved).professorMode || null) : null;
    } catch (e) { return null; }
  });

  // Store pending professor name when they don't teach in current semester
  const [pendingProfessor, setPendingProfessor] = useState(null);

  // Lazy initialize results state
  const [isPartial, setIsPartial] = useState(() => {
    try {
      const saved = localStorage.getItem('coursalog_schedule_results');
      return saved ? (JSON.parse(saved).isPartial || false) : false;
    } catch (e) { return false; }
  });

  const [coursesFound, setCoursesFound] = useState(() => {
    try {
      const saved = localStorage.getItem('coursalog_schedule_results');
      return saved ? (JSON.parse(saved).coursesFound || 0) : 0;
    } catch (e) { return 0; }
  });

  const [totalCourses, setTotalCourses] = useState(() => {
    try {
      const saved = localStorage.getItem('coursalog_schedule_results');
      return saved ? (JSON.parse(saved).totalCourses || 0) : 0;
    } catch (e) { return 0; }
  });

  const [schedules, setSchedules] = useState(() => {
    try {
      const saved = localStorage.getItem('coursalog_schedule_results');
      return saved ? (JSON.parse(saved).schedules || []) : [];
    } catch (e) { return []; }
  });

  const [error, setError] = useState(() => {
    try {
      const saved = localStorage.getItem('coursalog_schedule_results');
      return saved ? (JSON.parse(saved).error || null) : null;
    } catch (e) { return null; }
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [tbdSections, setTbdSections] = useState(null); // Track courses with TBD sections

  // Track if user has clicked Generate at least once (for auto-regeneration on semester switch)
  const [hasGenerated, setHasGenerated] = useState(() => {
    try {
      const saved = localStorage.getItem('coursalog_schedule_results');
      return saved ? (JSON.parse(saved).hasGenerated || false) : false;
    } catch (e) { return false; }
  });

  const [scheduleHistory, setScheduleHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('scheduleHistory');
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });

  const [showHistory, setShowHistory] = useState(false);

  // Favorites state
  const [favorites, setFavorites] = useState([]);
  const [showFavorites, setShowFavorites] = useState(false);

  const [favoritesLoaded, setFavoritesLoaded] = useState(false);
  const [showComparisonFor, setShowComparisonFor] = useState(null); // ID of favorite to compare

  // Track if this is the initial mount to prevent clearing saved state on semester change
  const isInitialMount = useRef(true);

  // Welcome Modal State
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 600);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 600);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const hasSeenModal = localStorage.getItem('coursalog_schedule_welcome_seen');
    if (!hasSeenModal) {
      setShowWelcomeModal(true);
    }
  }, []);

  const closeWelcomeModal = () => {
    localStorage.setItem('coursalog_schedule_welcome_seen', 'true');
    setShowWelcomeModal(false);
  };

  // Pagination state
  const [currentPage, setCurrentPage] = useState(() => {
    try {
      const saved = localStorage.getItem('coursalog_schedule_results');
      return saved ? (JSON.parse(saved).currentPage || 1) : 1;
    } catch (e) { return 1; }
  });
  // Page input state (string-based like App.js)
  const [pageInput, setPageInput] = useState("1");

  // Scroll to top when page changes
  useEffect(() => {
    if (schedules.length > 0) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      if (document.documentElement) {
        document.documentElement.scrollTop = 0;
      }
      if (document.body) {
        document.body.scrollTop = 0;
      }
    }
  }, [currentPage, schedules.length]);

  // Sync the text input when current page changes
  useEffect(() => {
    setPageInput(String(currentPage));
  }, [currentPage]);

  const schedulesPerPage = 5;

  const getSheetData = useCallback((sem) => {
    switch (sem) {
      case 'fall25': return sheetDataFall25;
      case 'spring26': return sheetDataSpring26;
      case 'fall26': return sheetDataFall26;
      case 'spring27': return sheetDataSpring27;
      default: return sheetDataFall25;
    }
  }, [sheetDataFall25, sheetDataSpring26, sheetDataFall26, sheetDataSpring27]);

  const activeSheetData = getSheetData(semester);

  // Calculate pagination values
  const totalPages = Math.ceil(schedules.length / schedulesPerPage);
  const startIndex = (currentPage - 1) * schedulesPerPage;
  const visibleSchedules = schedules.slice(
    startIndex,
    startIndex + schedulesPerPage
  );

  // Load favorites from localStorage on mount
  useEffect(() => {
    const savedFavorites = localStorage.getItem('scheduleFavorites');
    if (savedFavorites) {
      try {
        setFavorites(JSON.parse(savedFavorites));
      } catch (e) {
        console.error('Failed to load favorites:', e);
      }
    }
    setFavoritesLoaded(true);
  }, []);

  // Save favorites to localStorage only after initial load
  useEffect(() => {
    if (favoritesLoaded) {
      localStorage.setItem('scheduleFavorites', JSON.stringify(favorites));
    }
  }, [favorites, favoritesLoaded]);



  // Save state whenever it changes
  useEffect(() => {

    const stateToSave = {
      semester,
      courseInput,
      selectedCourses,
      preferences,
      professorMode,
    };
    try {
      localStorage.setItem('coursalog_state', JSON.stringify(stateToSave));
    } catch (e) {
      console.error('Failed to save state:', e);
    }
  }, [semester, courseInput, selectedCourses, preferences, professorMode]);

  // Save schedule results whenever they change
  useEffect(() => {

    const resultsToSave = {
      schedules,
      error,
      isPartial,
      coursesFound,
      totalCourses,
      currentPage,
      hasGenerated,
    };
    try {
      localStorage.setItem('coursalog_schedule_results', JSON.stringify(resultsToSave));
    } catch (e) {
      console.error('Failed to save schedule results:', e);
    }
  }, [schedules, error, isPartial, coursesFound, totalCourses, currentPage, hasGenerated]);

  // Re-sort schedules when preferences change (without regenerating)
  useEffect(() => {
    if (schedules.length > 1 && !professorMode) {
      const sorted = [...schedules].sort((a, b) =>
        scoreSchedule(b, preferences) - scoreSchedule(a, preferences)
      );
      // Only update if the order actually changed
      const orderChanged = sorted.some((s, i) => s !== schedules[i]);
      if (orderChanged) {
        setSchedules(sorted);
        setCurrentPage(1);
      }
    }
  }, [preferences]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // Don't clear results on initial mount (when loading from localStorage)
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (professorMode) {
      const newData = getSheetData(semester);

      // If data isn't loaded yet, don't do anything (keep current state)
      if (!newData || newData.length === 0) return;

      // Check if this is multi-professor mode (professorMode contains "professors matching")
      const isMultiProfessor = professorMode.includes('professors matching');

      if (isMultiProfessor) {
        // Extract the search query from the professorMode string
        const queryMatch = professorMode.match(/"([^"]+)"/);
        if (queryMatch) {
          const searchQuery = queryMatch[1];
          const matches = findProfessors(searchQuery, newData);

          if (matches.length > 0) {
            let excludedSections = [];
            const allSchedules = matches.map(profName => {
              const allSections = newData.filter(row => getInstructor(row) === profName);
              return allSections.filter(row => {
                if (hasValidTimeData(row)) {
                  return true;
                } else {
                  const courseCode = ((row.subject || row.subj || '') + (row.cat || row.number || '')).toUpperCase();
                  const section = row.section || row.sec || '';
                  excludedSections.push(`${courseCode}-${section}`);
                  return false;
                }
              });
            }).filter(schedule => schedule.length > 0);

            if (allSchedules.length > 0) {
              setSchedules(allSchedules);
              setProfessorMode(`${matches.length} professors matching "${searchQuery}"`);
              setCoursesFound(allSchedules.reduce((sum, s) => sum + s.length, 0));
              setTotalCourses(allSchedules.reduce((sum, s) => sum + s.length, 0) + excludedSections.length);
              if (excludedSections.length > 0) {
                setError(`Some sections have unconfirmed times and were excluded: ${excludedSections.join(', ')}`);
              } else {
                setError(null);
              }
              setIsPartial(false);
              setCurrentPage(1);
              setTbdSections(null);
              return;
            }
          }
        }
        // No matches in new semester
        setSchedules([]);
        setError(`No matching professors found in ${formatSemesterName(semester)}`);
        setTbdSections(null);
        return;
      }

      // Single professor mode - try to find by exact name
      let allProfSections = newData.filter(row => getInstructor(row) === professorMode);
      
      // Fallback: If exact match fails, try fuzzy search with the name we already have
      if (allProfSections.length === 0) {
        const matches = findProfessors(professorMode, newData);
        if (matches.length > 0) {
          const matchedName = matches[0];
          allProfSections = newData.filter(row => getInstructor(row) === matchedName);
          // Set professor mode to the new name format found in this semester
          setProfessorMode(matchedName);
          return; // The effect will re-run with the updated name
        }
      }

      let excludedSections = [];
      const profSchedule = allProfSections.filter(row => {
        if (hasValidTimeData(row)) {
          return true;
        } else {
          const courseCode = ((row.subject || row.subj || '') + (row.cat || row.number || '')).toUpperCase();
          const section = row.section || row.sec || '';
          excludedSections.push(`${courseCode}-${section}`);
          return false;
        }
      });

      if (profSchedule.length > 0) {
        setSchedules([profSchedule]);
        setCoursesFound(profSchedule.length);
        setTotalCourses(profSchedule.length + excludedSections.length);
        if (excludedSections.length > 0) {
          setError(`Some sections have unconfirmed times and were excluded: ${excludedSections.join(', ')}`);
        } else {
          setError(null);
        }
        setIsPartial(false);
        setCurrentPage(1);
        setTbdSections(null);
        return;
      } else if (excludedSections.length > 0) {
        // All sections had invalid time data
        setSchedules([]);
        setCoursesFound(0);
        setTotalCourses(excludedSections.length);
        setError(`All of ${professorMode}'s sections have unconfirmed times.`);
        setTbdSections(null);
        return;
      } else {
        // Professor not found in new semester even after fuzzy search
        setSchedules([]);
        setCoursesFound(0);
        setTotalCourses(0);
        setError(`No schedule found for ${professorMode} in ${formatSemesterName(semester)}`);
        setTbdSections(null);
        return;
      }
    }

    // Check if there's a pending professor search from wrong semester
    if (pendingProfessor) {
      const newData = getSheetData(semester);
      if (!newData || newData.length === 0) return;

      let allProfSections = newData.filter(row => getInstructor(row) === pendingProfessor);
      
      // Fallback for pending professor
      if (allProfSections.length === 0) {
        const matches = findProfessors(pendingProfessor, newData);
        if (matches.length > 0) {
          const matchedName = matches[0];
          allProfSections = newData.filter(row => getInstructor(row) === matchedName);
          setPendingProfessor(matchedName); // This might cause double update, but it's okay
        }
      }
      let excludedSections = [];
      const profSchedule = allProfSections.filter(row => {
        if (hasValidTimeData(row)) {
          return true;
        } else {
          const courseCode = ((row.subject || row.subj || '') + (row.cat || row.number || '')).toUpperCase();
          const section = row.section || row.sec || '';
          excludedSections.push(`${courseCode}-${section}`);
          return false;
        }
      });

      if (profSchedule.length > 0) {
        setSchedules([profSchedule]);
        setProfessorMode(pendingProfessor);
        setCoursesFound(profSchedule.length);
        setTotalCourses(profSchedule.length + excludedSections.length);
        if (excludedSections.length > 0) {
          setError(`Some sections have unconfirmed times and were excluded: ${excludedSections.join(', ')}`);
        } else {
          setError(null);
        }
        setIsPartial(false);
        setCurrentPage(1);
        setPendingProfessor(null);
        setTbdSections(null);
        return;
      } else if (allProfSections.length > 0) {
        // Professor found but ALL sections have invalid time data
        setProfessorMode(pendingProfessor);
        setSchedules([]);
        setCoursesFound(0);
        setTotalCourses(excludedSections.length);
        setError(`All of ${pendingProfessor}'s sections have unconfirmed times.`);
        setPendingProfessor(null);
        setTbdSections(null);
        return;
      }
      // Professor not found in this semester either, keep pending
    }

    // Auto-regenerate schedules when switching semesters if user has generated before
    if (selectedCourses.length > 0 && hasGenerated) {
      const newData = getSheetData(semester);
      if (!newData || newData.length === 0) return;

      // Check which courses exist in the new semester
      const coursesNotInNewSemester = [];

      selectedCourses.forEach(code => {
        const baseCode = code.split('.')[0].toUpperCase().replace(/[^A-Z0-9]/g, '');
        const existsInNew = newData.some(row => {
          const rowCode = ((row.subject || row.subj || '') + (row.cat || row.number || '')).toUpperCase().replace(/[^A-Z0-9]/g, '');
          return rowCode === baseCode;
        });
        if (!existsInNew) {
          coursesNotInNewSemester.push(code);
        }
      });

      const semesterName = formatSemesterName(semester);

      // If ANY courses don't exist in this semester, show error and don't generate
      if (coursesNotInNewSemester.length > 0) {
        const missingText = coursesNotInNewSemester.length === 1
          ? `${coursesNotInNewSemester[0]} isn't available in ${semesterName}`
          : `${coursesNotInNewSemester.join(', ')} aren't available in ${semesterName}`;
        setError(missingText + ". Switch back or remove unavailable courses.");
        setSchedules([]);
        setCurrentPage(1);
        setIsPartial(false);
        setTbdSections(null);
        return;
      }

      // All courses exist - generate schedules
      const result = generateSchedules(selectedCourses, newData, preferences);

      if (result.error) {
        setError(result.error);
        setSchedules([]);
        setTbdSections(null);
      } else {
        setSchedules(result.schedules);
        setIsPartial(result.isPartial);
        setCoursesFound(result.coursesFound);
        setTotalCourses(result.totalCourses);
        setTbdSections(result.tbdSections);
        setError(null);
      }
      setCurrentPage(1);
      return;
    }

    setSchedules([]);
    setError(null);
    setCurrentPage(1);
    setIsPartial(false);
    setCoursesFound(0);
    setTotalCourses(0);
    setTbdSections(null); // Clear TBD warning when resetting
    // Note: We don't need to manually save to localStorage here because
    // updating the state variables (setSchedules, etc.) will trigger
    // the useEffect above which handles the saving.
  }, [semester, professorMode, pendingProfessor, sheetDataFall25, sheetDataSpring26, sheetDataFall26, sheetDataSpring27, selectedCourses, preferences, hasGenerated, getSheetData]); // eslint-disable-line react-hooks/exhaustive-deps

  // Initial conflict check for existing favorites when data loads
  useEffect(() => {
    if (!favoritesLoaded || favorites.length === 0) return;
    if (!sheetDataFall25 || sheetDataFall25.length === 0) return;
    if (!sheetDataSpring26 || sheetDataSpring26.length === 0) return;
    if (!sheetDataFall26 || sheetDataFall26.length === 0) return;
    if (!sheetDataSpring27 || sheetDataSpring27.length === 0) return;

    // Check if any favorite needs conflict detection
    const needsCheck = favorites.some(fav => fav.hasConflicts === undefined);

    if (!needsCheck) return;

    setFavorites((prevFavorites) => {
      return prevFavorites.map((fav) => {
        // Skip if already has conflict status
        if (fav.hasConflicts !== undefined) return fav;

        const data = getSheetData(fav.semester);
        const { hasConflicts } = refreshSchedule(fav.schedule, data);

        return {
          ...fav,
          hasConflicts: hasConflicts,
        };
      });
    });
  }, [favoritesLoaded, favorites, sheetDataFall25, sheetDataSpring26, sheetDataFall26, sheetDataSpring27, getSheetData]);


  // Update favorites when sheet data changes
  useEffect(() => {
    if (!favoritesLoaded) return;

    setFavorites((prevFavorites) => {
      let anyChanges = false;
      const newFavorites = prevFavorites.map((fav) => {
        const data = getSheetData(fav.semester);

        // If data isn't loaded yet, don't touch the favorite
        if (!data || data.length === 0) return fav;

        // Use originalSchedule if it exists (from previous mismatch), otherwise use current schedule
        const scheduleToCheck = fav.originalSchedule || fav.schedule;

        const { updatedSchedule, changesDetected, changedIndices, changeDetails, hasConflicts } = refreshSchedule(
          scheduleToCheck,
          data
        );

        // Check if schedule became empty (data source mismatch)
        const dataSourceMismatch = updatedSchedule.length === 0 && scheduleToCheck.length > 0;

        // Check if schedule was restored (was mismatched, now has courses)
        const wasRestored = fav.dataSourceMismatch && updatedSchedule.length > 0;

        // Update if changes detected OR if conflict status changed OR if mismatch status changed
        const conflictStatusChanged = fav.hasConflicts !== hasConflicts;
        const mismatchStatusChanged = (fav.dataSourceMismatch || false) !== dataSourceMismatch;

        if (changesDetected || conflictStatusChanged || mismatchStatusChanged || wasRestored) {
          anyChanges = true;
          const newHash = changesDetected ? getScheduleHash(updatedSchedule) : fav.hash;

          // Determine the previous schedule for comparison
          let newPreviousSchedule = fav.previousSchedule;
          if (dataSourceMismatch && !fav.dataSourceMismatch) {
            // Just became mismatched - save current schedule as previous
            newPreviousSchedule = fav.schedule;
          } else if (wasRestored) {
            // Just restored - save empty schedule as previous
            newPreviousSchedule = [];
          } else if (changesDetected) {
            // Normal changes - use existing logic
            newPreviousSchedule = fav.previousSchedule || fav.schedule;
          }

          return {
            ...fav,
            hash: newHash,
            schedule: dataSourceMismatch ? [] : updatedSchedule, // Empty if mismatch, otherwise use updated
            originalSchedule: dataSourceMismatch ? scheduleToCheck : null, // Store original when mismatch
            previousSchedule: newPreviousSchedule,
            changedIndices: wasRestored ? [] : (changesDetected ? changedIndices : fav.changedIndices),
            changeDetails: wasRestored ? [] : (changesDetected ? changeDetails : fav.changeDetails),
            hasConflicts: hasConflicts,
            dataSourceMismatch: dataSourceMismatch,
            modified: wasRestored ? false : (changesDetected || mismatchStatusChanged ? true : fav.modified),
            lastUpdated: (changesDetected || mismatchStatusChanged || wasRestored) ? new Date().toISOString() : fav.lastUpdated,
          };
        }
        return fav;
      });

      return anyChanges ? newFavorites : prevFavorites;
    });
  }, [sheetDataFall25, sheetDataSpring26, sheetDataFall26, sheetDataSpring27, favoritesLoaded, getSheetData]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        preferencesRef.current &&
        !preferencesRef.current.contains(event.target)
      ) {
        setShowPreferences(false);
      }
      if (
        semesterDropdownRef.current &&
        !semesterDropdownRef.current.contains(event.target)
      ) {
        setShowSemesterDropdown(false);
      }
    };

    if (showPreferences || showSemesterDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showPreferences, showSemesterDropdown]);

  // Lock background scroll when comparison modal is open
  useEffect(() => {
    if (showComparisonFor) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showComparisonFor]);

  // Generate a unique hash for a schedule to check if it's favorited


  // Check if a schedule is favorited
  const isScheduleFavorited = (schedule) => {
    const hash = getScheduleHash(schedule);
    return favorites.some((f) => f.hash === hash);
  };

  // Get favorite name for a schedule
  const getFavoriteName = (schedule) => {
    const hash = getScheduleHash(schedule);
    const fav = favorites.find((f) => f.hash === hash);
    return fav?.name || null;
  };

  // Handle favorite toggle
  const handleFavorite = (schedule, name) => {
    const hash = getScheduleHash(schedule);

    if (name === null) {
      // Remove from favorites
      setFavorites(favorites.filter((f) => f.hash !== hash));
    } else {
      // Add to favorites
      const newFavorite = {
        id: Date.now(),
        hash,
        name,
        schedule,
        semester,
        courses: [
          ...new Set(
            schedule.map(
              (s) => (s.subject || s.subj || '') + (s.cat || s.number || '')
            )
          ),
        ],
        createdAt: new Date().toISOString(),
      };
      setFavorites([newFavorite, ...favorites]);
    }
  };

  const handleRemoveFavorite = (id) => {
    setFavorites((prev) => prev.filter((f) => f.id !== id));
  };

  const handleAddCourse = (e) => {
    e.preventDefault();
    if (!courseInput.trim()) return;

    // Easter egg for John Doe
    if (courseInput.trim().toLowerCase() === 'john doe') {
      setError("Why'd you actually search for John Doe? 🙄");
      setSchedules([]);
      setCourseInput('');
      return;
    }

    // Easter egg for Rik Rolster 🎵
    if (courseInput.trim().toLowerCase() === 'rik rolster') {
      setError("rik_rolster_easter_egg");
      setSchedules([]);
      setCourseInput('');
      return;
    }

    // Check for professor matches in BOTH semesters (to identify if it's a professor name)
    const professorMatchesActive = findProfessors(courseInput, activeSheetData);
    const otherSemesters = ['fall25', 'spring26', 'fall26', 'spring27'].filter(s => s !== semester);
    const professorMatchesOther = otherSemesters.map(s => findProfessors(courseInput, getSheetData(s))).flat();

    // If it's a professor name in either semester
    if (professorMatchesActive.length > 0 || professorMatchesOther.length > 0) {
      if (professorMatchesActive.length > 0) {
        // Professors found in current semester - show all their schedules
        // Filter out sections with invalid time data and track excluded sections
        let excludedSections = [];

        const allSchedules = professorMatchesActive.map(profName => {
          const allSections = activeSheetData.filter(row => getInstructor(row) === profName);
          const validSections = allSections.filter(row => {
            if (hasValidTimeData(row)) {
              return true;
            } else {
              // Track excluded sections (course code + section number)
              const courseCode = ((row.subject || row.subj || '') + (row.cat || row.number || '')).toUpperCase();
              const section = row.section || row.sec || '';
              excludedSections.push(`${courseCode}-${section}`);
              return false;
            }
          });
          return validSections;
        }).filter(schedule => schedule.length > 0);

        if (allSchedules.length > 0) {
          setSchedules(allSchedules);
          // If only one professor matched, enter professor mode with their name
          // If multiple matched, use a special mode indicator
          setProfessorMode(professorMatchesActive.length === 1 ? professorMatchesActive[0] : `${professorMatchesActive.length} professors matching "${courseInput}"`);
          setSelectedCourses([]);
          setCourseInput('');
          setIsPartial(false);
          setCoursesFound(allSchedules.reduce((sum, s) => sum + s.length, 0));
          setTotalCourses(allSchedules.reduce((sum, s) => sum + s.length, 0) + excludedSections.length);

          // Show warning if any sections were excluded due to invalid time data
          if (excludedSections.length > 0) {
            setError(`Some sections have unconfirmed times and were excluded: ${excludedSections.join(', ')}`);
          } else {
            setError(null);
          }
          setTbdSections(null); // Clear TBD warning (we're using error message instead for professor mode)

          // Add to history (only if single match)
          if (professorMatchesActive.length === 1) {
            const historyEntry = {
              id: Date.now(),
              timestamp: new Date().toISOString(),
              professorName: professorMatchesActive[0],
              semester: semester,
              scheduleCount: 1,
              isPartial: false,
            };
            const newHistory = [historyEntry, ...scheduleHistory].slice(0, 10);
            setScheduleHistory(newHistory);
            localStorage.setItem('scheduleHistory', JSON.stringify(newHistory));
          }
          return;
        } else if (excludedSections.length > 0) {
          // All sections had invalid time data - still set professor mode for semester switching
          setProfessorMode(professorMatchesActive[0]);
          setSelectedCourses([]);
          setError(`All of ${professorMatchesActive[0]}'s sections have unconfirmed times.`);
          setSchedules([]);
          setCourseInput('');
          return;
        }
      } else {
        // Professors exist but not in current semester - save for when they switch
        const semesterName = formatSemesterName(semester);
        const firstMatch = professorMatchesOther[0];
        setError(`${firstMatch}${professorMatchesOther.length > 1 ? ` and ${professorMatchesOther.length - 1} other(s)` : ''} teaches in a DIFFERENT semester, not ${semesterName}. Switch semesters to view.`);
        setSchedules([]);
        setProfessorMode(null);
        setPendingProfessor(firstMatch); // Save first match for semester switch
        setCourseInput('');
        return;
      }
    }

    // Support multiple space-separated course codes
    const inputCodes = courseInput.trim().toUpperCase().split(/\s+/);
    const cleanedCodes = inputCodes
      .map(c => c.replace(/[^A-Z0-9.]/g, ''))
      .filter(c => c && !selectedCourses.includes(c));

    if (cleanedCodes.length > 0) {
      // Validate each course code exists
      const validCodes = [];
      const notInSemester = []; // Exists in other semester
      const notExistAtAll = []; // Doesn't exist anywhere

      const otherSemesters = ['fall25', 'spring26', 'fall26', 'spring27'].filter(s => s !== semester);

      cleanedCodes.forEach(code => {
        const baseCode = code.split('.')[0].toUpperCase().replace(/[^A-Z0-9]/g, '');
        const existsInCurrent = activeSheetData.some(row => {
          const rowCode = ((row.subject || row.subj || '') + (row.cat || row.number || '')).toUpperCase().replace(/[^A-Z0-9]/g, '');
          return rowCode === baseCode;
        });

        if (existsInCurrent) {
          validCodes.push(code);
        } else {
          // Check if it exists in the other semester
          const existsInOther = otherSemesters.some(s => {
            return getSheetData(s).some(row => {
              const rowCode = ((row.subject || row.subj || '') + (row.cat || row.number || '')).toUpperCase().replace(/[^A-Z0-9]/g, '');
              return rowCode === baseCode;
            });
          });

          if (existsInOther) {
            notInSemester.push(code);
          } else {
            notExistAtAll.push(code);
          }
        }
      });

      // Add valid courses - only exit professor mode if we have valid courses
      if (validCodes.length > 0) {
        // Exit professor mode and clear professor schedule when switching to course mode
        if (professorMode) {
          setProfessorMode(null);
          setSchedules([]);
        }
        setSelectedCourses([...selectedCourses, ...validCodes]);
        setError(null); // Clear any previous error when successfully adding courses
      }

      // Show appropriate error messages (but keep professor schedule if no valid courses)
      if (notExistAtAll.length > 0) {
        setError("Uh... that course/professor doesn't exist sir/madam.");
      } else if (notInSemester.length > 0) {
        const semesterName = formatSemesterName(semester);
        if (notInSemester.length === 1) {
          setError(`${notInSemester[0]} not found in ${semesterName}.`);
        } else {
          setError(`${notInSemester.join(', ')} not found in ${semesterName}.`);
        }
      }
    }
    setCourseInput('');
  };

  const handleRemoveCourse = (code) => {
    setSelectedCourses(selectedCourses.filter((c) => c !== code));
  };

  const handleClearAll = () => {
    setSelectedCourses([]);
    setSchedules([]);
    setError(null);
    setIsPartial(false);
    setCurrentPage(1);
    setHasGenerated(false); // Reset so user needs to click Generate again
  };

  const handleGenerate = () => {
    if (selectedCourses.length === 0) {
      setError('Please add at least one course.');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setSchedules([]);
    setIsPartial(false);
    setCurrentPage(1);
    setTbdSections(null); // Clear TBD sections
    setHasGenerated(true); // Mark that user has generated at least once

    setTimeout(() => {
      const result = generateSchedules(
        selectedCourses,
        activeSheetData,
        preferences
      );

      if (result.error) {
        setError(result.error);
        setTbdSections(null);
      } else {
        setSchedules(result.schedules);
        setIsPartial(result.isPartial);
        setCoursesFound(result.coursesFound);
        setTotalCourses(result.totalCourses);
        setTbdSections(result.tbdSections); // Store TBD sections info

        const historyEntry = {
          id: Date.now(),
          timestamp: new Date().toISOString(),
          courses: selectedCourses,
          preferences: preferences,
          semester: semester,
          scheduleCount: result.schedules.length,
          isPartial: result.isPartial,
        };
        const newHistory = [historyEntry, ...scheduleHistory].slice(0, 10);
        setScheduleHistory(newHistory);
        localStorage.setItem('scheduleHistory', JSON.stringify(newHistory));
      }
      setIsGenerating(false);
    }, 100);
  };

  // Helpers to clamp and apply page input (matching App.js)
  const clampPage = (val) => {
    if (!Number.isFinite(val) || val < 1) return 1;
    if (val > totalPages) return totalPages;
    return val;
  };

  const applyPageInput = () => {
    const n = parseInt(pageInput, 10);
    if (!isNaN(n)) {
      const clamped = clampPage(n);
      setCurrentPage(clamped);
      setPageInput(String(clamped));
    } else {
      setPageInput(String(currentPage));
    }
  };

  return (
    <div className="schedule-interface">
      <div className="controls-section">
        <div className="search-bar-block">
          <div className="search-bar-row">
            <form onSubmit={handleAddCourse} className="search-form">
              <input
                type="text"
                value={courseInput}
                onChange={(e) => setCourseInput(e.target.value)}
                placeholder={isMobile ? "Course codes or Professor names" : "Courses (e.g. ENGL211 ENGL211.600) or Professor names (e.g. Rik Rolster)"}
                className="search-input"
              />
              <button
                type="submit"
                className="search-btn"
                style={{ padding: '0.8em 1em' }}
              >
                <FaPlus />
              </button>
            </form>
          </div>

          <div className="utility-bar">
            <div className="util-left">
              <div className="semester-dropdown-container" ref={semesterDropdownRef}>
                <button
                  className="semester-dropdown-button"
                  onClick={() => setShowSemesterDropdown(!showSemesterDropdown)}
                >
                  <FaCalendarAlt style={{ marginRight: '8px', color: '#ffcf7a' }} /> Semester {showSemesterDropdown ? <FaChevronUp style={{ marginLeft: '8px', fontSize: '12px' }} /> : <FaChevronDown style={{ marginLeft: '8px', fontSize: '12px' }} />}
                </button>
                {showSemesterDropdown && (
                  <div className="semester-dropdown-menu">
                    <div className="academic-year-column">
                      <div className="academic-year-title">2025 - 2026</div>
                      <button
                        className={`semester-option ${semester === 'fall25' ? 'active' : ''}`}
                        onClick={() => { 
                          setSemester('fall25'); 
                          setShowSemesterDropdown(false);
                        }}
                      >
                        <div className="semester-icon fall-icon">
                          <FaLeaf style={{ color: '#ff9800' }} />
                        </div>
                        <div className="semester-text-wrapper">
                          <div className="semester-name">Fall '25</div>
                          <div className="semester-subname">Semester</div>
                        </div>
                        {semester === 'fall25' && <FaCheck className="check-icon" />}
                      </button>
                      <button
                        className={`semester-option ${semester === 'spring26' ? 'active' : ''}`}
                        onClick={() => { 
                          setSemester('spring26'); 
                          setShowSemesterDropdown(false);
                        }}
                      >
                        <div className="semester-icon spring-icon">
                          <FaSeedling style={{ color: '#4caf50' }} />
                        </div>
                        <div className="semester-text-wrapper">
                          <div className="semester-name">Spring '26</div>
                          <div className="semester-subname">Semester</div>
                        </div>
                        {semester === 'spring26' && <FaCheck className="check-icon" />}
                      </button>
                    </div>
                    <div className="vertical-divider" />
                    <div className="academic-year-column">
                      <div className="academic-year-title">2026 - 2027</div>
                      <button
                        className={`semester-option ${semester === 'fall26' ? 'active' : ''}`}
                        onClick={() => { 
                          setSemester('fall26'); 
                          setShowSemesterDropdown(false);
                        }}
                      >
                        <div className="semester-icon fall-icon">
                          <FaLeaf style={{ color: '#ff9800' }} />
                        </div>
                        <div className="semester-text-wrapper">
                          <div className="semester-name">Fall '26</div>
                          <div className="semester-subname">Semester</div>
                        </div>
                        {semester === 'fall26' && <FaCheck className="check-icon" />}
                      </button>
                      <button
                        className={`semester-option ${semester === 'spring27' ? 'active' : ''}`}
                        onClick={() => { 
                          setSemester('spring27'); 
                          setShowSemesterDropdown(false);
                        }}
                      >
                        <div className="semester-icon spring-icon">
                          <FaSeedling style={{ color: '#4caf50' }} />
                        </div>
                        <div className="semester-text-wrapper">
                          <div className="semester-name">Spring '27</div>
                          <div className="semester-subname">Semester</div>
                        </div>
                        {semester === 'spring27' && <FaCheck className="check-icon" />}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="util-icons">
              <div className="preferences-container" ref={preferencesRef}>
                <button
                  className={`preferences-toggle ${showPreferences || (preferences.noFridays || preferences.no9am || preferences.endBy) ? 'active' : ''}`}
                  onClick={() => setShowPreferences(!showPreferences)}
                  title="Schedule Preferences"
                  style={{ position: 'relative' }}
                >
                  <span className="pref-icon">
                    <FaSlidersH />
                  </span>
                  <span className="pref-btn-text">Preferences</span>
                  {(preferences.noFridays || preferences.no9am || preferences.endBy) && (
                    <span className="pref-badge">
                      {(preferences.noFridays ? 1 : 0) + (preferences.no9am ? 1 : 0) + (preferences.endBy ? 1 : 0)}
                    </span>
                  )}
                </button>

                {showPreferences && (
                  <div className="preferences-dropdown">
                    <div className="pref-header">Preferences</div>

                    {professorMode ? (
                      <div style={{
                        padding: '12px 14px',
                        color: 'rgba(255, 255, 255, 0.6)',
                        fontSize: '0.85rem',
                        lineHeight: '1.4',
                        fontStyle: 'italic',
                      }}>
                        Preferences don't apply to professor schedules.
                      </div>
                    ) : (
                      <>
                        <label className="pref-item">
                          <div className="pref-label">
                            <span>No Fridays</span>
                          </div>
                          <button
                            className={`checkbox-btn ${preferences.noFridays ? 'checked' : ''}`}
                            onClick={() =>
                              setPreferences({
                                ...preferences,
                                noFridays: !preferences.noFridays,
                              })
                            }
                          >
                            {preferences.noFridays && <FaCheck />}
                          </button>
                        </label>

                        <label className="pref-item">
                          <div className="pref-label">
                            <span>No 9AM Classes</span>
                          </div>
                          <button
                            className={`checkbox-btn ${preferences.no9am ? 'checked' : ''}`}
                            onClick={() =>
                              setPreferences({
                                ...preferences,
                                no9am: !preferences.no9am,
                              })
                            }
                          >
                            {preferences.no9am && <FaCheck />}
                          </button>
                        </label>

                        <div className="pref-divider" />

                        <div className="pref-section-title">End Classes By</div>

                        {['1pm', '3pm', '4pm'].map((time) => (
                          <label key={time} className="pref-item">
                            <div className="pref-label">
                              <span>{time.toUpperCase()}</span>
                            </div>
                            <button
                              className={`checkbox-btn ${preferences.endBy === time ? 'checked' : ''}`}
                              onClick={() =>
                                setPreferences({
                                  ...preferences,
                                  endBy: preferences.endBy === time ? null : time,
                                })
                              }
                            >
                              {preferences.endBy === time && <FaCheck />}
                            </button>
                          </label>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>

              {favorites.length > 0 && (
                <button
                  onClick={() => {
                    setShowFavorites(!showFavorites);
                    if (!showFavorites) setShowHistory(false);
                  }}
                  className={`favorites-icon-btn ${showFavorites ? 'active' : ''}`}
                  title="View Favorites"
                >
                  <FaHeart />
                  <span className="favorites-count">{favorites.length}</span>
                </button>
              )}

              {scheduleHistory.length > 0 && (
                <button
                  className={`action-icon history-icon-btn ${showHistory ? 'active' : ''}`}
                  onClick={() => {
                    setShowHistory(!showHistory);
                    if (!showHistory) setShowFavorites(false);
                  }}
                  title="View History"
                  aria-label="View History"
                >
                  <FaHistory />
                </button>
              )}
            </div>
          </div>
        </div>

        {selectedCourses.length > 0 && (() => {
          // Calculate total credits for selected courses
          const data = getSheetData(semester);
          const totalCredits = selectedCourses.reduce((sum, courseCode) => {
            const baseCode = courseCode.split('.')[0].toUpperCase().replace(/[^A-Z0-9]/g, '');
            const courseSections = data.filter(row => {
              const rowCode = ((row.subject || row.subj || '') + (row.cat || row.number || '')).toUpperCase().replace(/[^A-Z0-9]/g, '');
              return rowCode === baseCode;
            });

            if (courseSections.length > 0) {
              const credits = parseFloat(courseSections[0].Crdt || courseSections[0].crdt || courseSections[0].credits || 0);
              return sum + credits;
            }
            return sum;
          }, 0);

          return (
            <div className="selected-courses-section">
              <div className="selected-courses-list">
                {selectedCourses.map((code) => (
                  <div key={code} className="course-tag">
                    {code}
                    <button onClick={() => handleRemoveCourse(code)}>
                      <FaTimes />
                    </button>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {totalCredits > 0 && (
                  <div className="credits-badge">
                    {totalCredits} {totalCredits === 1 ? 'Credit' : 'Credits'}
                  </div>
                )}
                <button
                  onClick={handleClearAll}
                  className="clear-all-btn"
                  title="Clear all courses"
                >
                  <FaTrashAlt />
                  <span className="clear-all-text">Clear All</span>
                </button>
              </div>
            </div>
          );
        })()}

        {selectedCourses.length > 0 && (
          <div className="generate-section">
            <button
              onClick={handleGenerate}
              className="generate-btn-large"
              disabled={isGenerating}
            >
              {isGenerating ? 'Generating...' : 'Generate'}
            </button>
          </div>
        )}
      </div>

      <div className="schedule-content-container">
        {error && (
          <div className="error-wrapper">
            {error === 'rik_rolster_easter_egg' ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                <div className="error-message">Why'd you actually search for Rik Rolster? 😂</div>
                <img
                  src="https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExcnVmZXN5dHF0dXFoNmVnaGNvcDFmM3QxZjV6MXFqaWthZXFxcm10NyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/Vuw9m5wXviFIQ/giphy.gif"
                  alt=""
                  style={{ maxWidth: '280px', borderRadius: '12px' }}
                />
              </div>
            ) : (
              <div className="error-message">{error}</div>
            )}
          </div>
        )}

        {/* TBD Sections Warning - shown after search/error area */}
        {tbdSections && Object.keys(tbdSections).length > 0 && !showFavorites && (
          <div className="warning-message" style={{
            textAlign: 'left',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            maxWidth: '1000px',
            marginLeft: 'auto',
            marginRight: 'auto',
            marginBottom: '16px',
          }}>
            <FaExclamationTriangle style={{ flexShrink: 0 }} />
            <div>
              <strong>Heads up:</strong> Some sections haven't been confirmed yet ({Object.entries(tbdSections).map(([course, sections]) =>
                `${course}: ${sections.join(', ')}`
              ).join('; ')}). These were excluded from scheduling.
            </div>
          </div>
        )}

        {showFavorites && favorites.length > 0 && (
          <div className="results-section">
            <div className="schedules-list">
              <h3 className="results-heading">
                <FaHeart />
                {favorites.length} Saved Schedule{favorites.length !== 1 ? 's' : ''}
              </h3>

              {favorites.map((fav) => (
                <div key={fav.id} style={{ marginBottom: '20px' }}>
                  {fav.dataSourceMismatch && (
                    <div
                      className="mismatch-warning"
                      style={{
                        background: 'rgba(255, 152, 0, 0.15)',
                        border: '1px solid rgba(255, 152, 0, 0.4)',
                        color: '#ff9800',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        marginBottom: '12px',
                        fontSize: '0.9rem',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                      }}
                    >
                      <FaExclamationTriangle />
                      <span>
                        No matching courses found in current data source. This schedule may be from a different semester.
                      </span>
                    </div>
                  )}
                  {fav.hasConflicts && (
                    <div
                      className="conflict-warning"
                      style={{
                        background: 'rgba(255, 107, 107, 0.15)',
                        border: '1px solid rgba(255, 107, 107, 0.4)',
                        color: '#ff6b6b',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        marginBottom: '12px',
                        fontSize: '0.9rem',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                      }}
                    >
                      <FaExclamationTriangle />
                      <span>
                        Time conflict detected! This schedule has overlapping courses.
                      </span>
                    </div>
                  )}
                  {fav.modified && fav.lastUpdated && (Date.now() - new Date(fav.lastUpdated).getTime() < 7 * 24 * 60 * 60 * 1000) && (
                    <div
                      className="modified-warning"
                      style={{
                        background: 'rgba(255, 171, 0, 0.15)',
                        border: '1px solid rgba(255, 171, 0, 0.4)',
                        color: '#ffab00',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        marginBottom: '12px',
                        fontSize: '0.9rem',
                        fontWeight: '500',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                      }}
                    >
                      <FaExclamationTriangle />
                      <span>
                        This schedule has been updated due to changes in course
                        data.
                      </span>
                      {fav.previousSchedule && (
                        <button
                          onClick={() => setShowComparisonFor(fav.id)}
                          style={{
                            marginLeft: 'auto',
                            background: 'rgba(255, 171, 0, 0.2)',
                            border: '1px solid rgba(255, 171, 0, 0.5)',
                            color: '#ffab00',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: '600',
                          }}
                        >
                          See Changes
                        </button>
                      )}
                    </div>
                  )}
                  <ScheduleView
                    schedule={fav.schedule}
                    scheduleIndex={0}
                    totalSchedules={favorites.length}
                    onFavorite={(s, n) => {
                      if (n === null) {
                        handleRemoveFavorite(fav.id);
                      }
                    }}
                    isFavorited={true}
                    favoriteName={fav.name}
                    semester={fav.semester}
                  />
                </div>
              ))}
            </div>
          </div>
        )}


        {showHistory && scheduleHistory.length > 0 && (
          <div className="history-section">
            <h3>Previous Schedules</h3>
            {scheduleHistory.map((entry) => (
              <div
                key={entry.id}
                className="history-item"
                onClick={() => {
                  if (entry.professorName) {
                    // Professor history entry
                    const data = getSheetData(entry.semester);
                    const profSchedule = data.filter(row => getInstructor(row) === entry.professorName);
                    if (profSchedule.length > 0) {
                      setSchedules([profSchedule]);
                      setProfessorMode(entry.professorName);
                      setSelectedCourses([]);
                      setError(null);
                      setIsPartial(false);
                      setCoursesFound(profSchedule.length);
                      setTotalCourses(profSchedule.length);
                    } else {
                      setError(`No schedule found for ${entry.professorName}`);
                    }
                    if (entry.semester) setSemester(entry.semester);
                  } else {
                    // Course history entry
                    setProfessorMode(null);
                    setSelectedCourses(entry.courses || []);
                    setPreferences(entry.preferences || {});
                    if (entry.semester) setSemester(entry.semester);
                  }
                  setShowHistory(false);
                }}
              >
                <div className="history-courses">
                  {entry.professorName ? (
                    <><FaChalkboardTeacher style={{ marginRight: '6px', color: 'inherit' }} />{entry.professorName}</>
                  ) : (
                    entry.courses?.join(', ')
                  )}
                </div>
                <div className="history-meta">
                  {formatSemesterName(entry.semester)} •{' '}
                  {new Date(entry.timestamp).toLocaleDateString()} •{' '}
                  {entry.professorName ? 'Professor' : `${entry.scheduleCount} schedule${entry.scheduleCount !== 1 ? 's' : ''}`}
                  {entry.isPartial && ' (Partial)'}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="results-section">
          {!showFavorites && schedules.length > 0 && (
            <div className="schedules-list">
              {isPartial ? (
                <div className="warning-message">
                  <h3>
                    <FaExclamationTriangle /> Partial Match Found
                  </h3>
                  <p>
                    We couldn't find a schedule with all {totalCourses} courses.
                    Here are the best options with {coursesFound} courses:
                  </p>
                </div>
              ) : (
                <h3 className="results-heading">
                  {professorMode ? (
                    <>
                      <FaChalkboardTeacher style={{ marginRight: '8px', color: '#ffcf7a' }} />
                      Schedule for {professorMode}
                    </>
                  ) : (
                    <>Found {schedules.length} valid schedule{schedules.length !== 1 ? 's' : ''}</>
                  )}
                </h3>
              )}

              {(() => {
                if (schedules.length === 0) return null;
                const bestSchedule = schedules[0];
                const prefsMet = checkPreferences(bestSchedule, preferences);
                const unsatisfied = [];
                if (preferences.noFridays && !prefsMet.noFridays) unsatisfied.push("'No Fridays'");
                if (preferences.no9am && !prefsMet.no9am) unsatisfied.push("'No 9am Classes'");
                if (preferences.endBy && !prefsMet.endBy) unsatisfied.push(`'End by ${preferences.endBy}'`);

                if (unsatisfied.length > 0) {
                  return (
                    <div className="warning-message" style={{ textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <FaExclamationTriangle />
                      <div>
                        <strong>Notice:</strong> The {unsatisfied.join(', ')} preference{unsatisfied.length > 1 ? 's' : ''} could not be satisfied with the available course sections.
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              {visibleSchedules.map((schedule, idx) => (
                <div key={startIndex + idx} style={{ marginBottom: '20px' }}>
                  <ScheduleView
                    schedule={schedule}
                    scheduleIndex={startIndex + idx}
                    totalSchedules={schedules.length}
                    onFavorite={handleFavorite}
                    isFavorited={isScheduleFavorited(schedule)}
                    favoriteName={getFavoriteName(schedule)}
                    semester={semester}
                    satisfiedPreferences={checkPreferences(schedule, preferences)}
                    activePreferences={preferences}
                    professorMode={professorMode}
                  />
                </div>
              ))}

              {/* --- Pagination Controls --- */}
              {totalPages > 1 && (
                <div className="pagination-bar">
                  <button
                    className="pagination-arrow"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    aria-label="Previous page"
                  >
                    <FaArrowLeft />
                  </button>

                  {/* NEW: Editable page number */}
                  <div className="pagination-page">
                    <span className="pagination-label">Page</span>
                    <input
                      className="pagination-input"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={pageInput}
                      onChange={(e) => {
                        const onlyDigits = e.target.value.replace(/\D/g, "");
                        setPageInput(onlyDigits);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          applyPageInput();
                        }
                      }}
                      onBlur={applyPageInput}
                      aria-label="Current page"
                    />
                    <span className="pagination-total">of {totalPages}</span>
                  </div>

                  <button
                    className="pagination-arrow"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    aria-label="Next page"
                  >
                    <FaArrowRight />
                  </button>
                </div>
              )}
              {/* --- END Pagination Controls --- */}
            </div>
          )}
        </div>
      </div>

      {/* Comparison Modal */}
      {showComparisonFor && (() => {
        const fav = favorites.find(f => f.id === showComparisonFor);
        if (!fav) return null;

        const getHighlightIds = (changeDetails) => {
          if (!changeDetails || !Array.isArray(changeDetails)) return [];
          return changeDetails.map(change => {
            if (!change.courseCode) return null;
            return `${change.courseCode}-${change.section || ''}`;
          }).filter(Boolean);
        };

        const highlightIds = getHighlightIds(fav.changeDetails);

        return (
          <div
            className="coursalog-popup-overlay"
            onClick={() => setShowComparisonFor(null)}
          >
            <div
              className="coursalog-popup comparison-modal"
              onClick={e => e.stopPropagation()}
            >
              <div className="comparison-modal-header">
                <h2>Schedule Changes</h2>

                {/* Conflict Warning */}
                {fav.hasConflicts && (
                  <div className="conflict-warning-box">
                    <FaExclamationTriangle />
                    <span>
                      Time conflict detected! This updated schedule has overlapping courses.
                    </span>
                  </div>
                )}
              </div>

              <div className="comparison-modal-content">
                <h3 className="comparison-subtitle">Your Schedule (Before Changes)</h3>
                <p className="comparison-description">
                  This is how your schedule looked before the updates. Changed sections are highlighted.
                </p>
                <div className="comparison-schedule-wrapper">
                  {fav.previousSchedule ? (
                    <ScheduleView
                      schedule={fav.previousSchedule}
                      hideHeader={true}
                      highlightIds={highlightIds}
                      semester={fav.semester}
                    />
                  ) : (
                    <div className="no-schedule-placeholder">
                      Original schedule data not available.
                    </div>
                  )}
                </div>

                {/* Change Summary - Now at the bottom */}
                {fav.changeDetails && fav.changeDetails.length > 0 && (() => {
                  // Group changes by courseCode + section to merge split-timing entries
                  const groupedChanges = [];
                  const groupMap = new Map();

                  fav.changeDetails.forEach((change) => {
                    const key = `${change.courseCode}-${change.section}`;
                    if (groupMap.has(key)) {
                      groupMap.get(key).entries.push(change);
                    } else {
                      const group = {
                        courseCode: change.courseCode,
                        section: change.section,
                        entries: [change],
                      };
                      groupMap.set(key, group);
                      groupedChanges.push(group);
                    }
                  });

                  return (
                    <div className="change-summary-section">
                      <h3>Changes Summary</h3>
                      {groupedChanges.map((group, gIdx) => (
                        <div key={gIdx} className="change-item" style={{
                          borderBottom: gIdx < groupedChanges.length - 1 ? '1px solid rgba(255, 171, 0, 0.2)' : 'none'
                        }}>
                          <div className="change-course-code">
                            {group.courseCode} {group.section && `- Section ${group.section}`}
                          </div>
                          {group.entries.map((change, eIdx) => (
                            <div key={eIdx}>
                              {group.entries.length > 1 && (
                                <div style={{ fontSize: '0.8rem', color: '#8b9bb4', marginTop: eIdx > 0 ? '8px' : '2px', marginBottom: '2px' }}>
                                  Timing {eIdx + 1}
                                </div>
                              )}
                              {change.type === 'removed' ? (
                                <div className="change-removed">
                                  ⚠️ This section has been removed from the course catalog
                                </div>
                              ) : (
                                <div className="change-details">
                                  {Object.entries(change.changes).map(([field, values]) => (
                                    <div key={field} className="change-field">
                                      <span className="change-field-name">{field}:</span>{' '}
                                      <span className="change-old-value">{values.old || '(empty)'}</span>
                                      {' → '}
                                      <span className="change-new-value">{values.new || '(empty)'}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {/* Close Button at Bottom */}
              <div style={{ flex: '0 0 auto', paddingTop: '16px', display: 'flex', justifyContent: 'center' }}>
                <button
                  className="search-btn"
                  onClick={() => setShowComparisonFor(null)}
                  style={{
                    padding: '10px 32px',
                    fontSize: '1rem',
                    minWidth: '120px',
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      <style jsx>{`
        .schedule-interface {
          width: 100%;
          color: #e9ebff;
          font-family: 'Inter', 'Segoe UI', Arial, sans-serif;
        }

        .schedule-content-container {
          max-width: 1100px;
          margin: 0 auto;
          padding: 0 20px 20px 20px;
        }

        .controls-section {
          margin-bottom: 2rem;
          text-align: center;
          max-width: 1000px;
          margin-left: auto;
          margin-right: auto;
          padding: 0 20px;
        }

        .search-bar-block {
          width: 100%;
          max-width: 1000px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          align-items: center;
          box-sizing: border-box;
        }

        .search-bar-row {
          width: 100%;
        }

        .semester-toggle {
          display: inline-flex;
          background: rgba(255, 255, 255, 0.1);
          padding: 3px;
          border-radius: 25px;
          gap: 4px;
        }

        .semester-toggle button {
          background: transparent;
          border: none;
          color: #aaa;
          padding: 8px 18px;
          border-radius: 20px;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s;
        }

        .semester-toggle button.active {
          background: #ffcf7a;
          color: #000;
          box-shadow: 0 2px 10px rgba(255, 207, 122, 0.3);
        }

        .semester-toggle button:hover:not(.active) {
          color: #fff;
        }

        .selected-courses-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
          margin: 1rem auto 0 auto;
          max-width: 1000px;
        }

        .selected-courses-list {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 0.6rem;
          padding: 0;
        }

        .course-tag {
          background: rgba(29, 32, 62, 0.75);
          border: 1px solid rgba(140, 151, 247, 0.35);
          padding: 0.4em 1em;
          border-radius: 999px;
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 600;
          font-size: 1rem;
          color: #cfd5ff;
          letter-spacing: 0.02em;
          box-shadow: 0 1px 8px rgba(10, 12, 26, 0.35);
          transition: box-shadow 200ms ease, transform 160ms ease;
        }

        .course-tag:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 16px rgba(124, 132, 255, 0.28);
        }

        .course-tag button {
          background: none;
          border: none;
          color: #ffcf7a;
          cursor: pointer;
          opacity: 0.7;
          display: flex;
          align-items: center;
          padding: 0;
          font-size: 0.85rem;
          transition: opacity 0.2s ease;
        }

        .course-tag button svg {
          width: 1em;
          height: 1em;
        }

        .course-tag button:hover {
          opacity: 1;
        }

        .clear-all-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          background: transparent;
          border: 1px solid rgba(255, 107, 107, 0.3);
          color: #ff6b6b;
          padding: 6px 14px;
          border-radius: 20px;
          cursor: pointer;
          font-size: 0.85rem;
          font-weight: 500;
          transition: all 0.2s ease;
          opacity: 0.8;
        }

        .clear-all-btn svg {
          width: 1em;
          height: 1em;
        }

        .clear-all-btn:hover {
          opacity: 1;
          background: rgba(255, 107, 107, 0.1);
          border-color: rgba(255, 107, 107, 0.5);
          transform: translateY(-1px);
        }

        .clear-all-text {
          display: inline;
        }

        .credits-badge {
          display: flex;
          align-items: center;
          padding: 6px 14px;
          border-radius: 20px;
          background: rgba(140, 151, 247, 0.15);
          border: 1px solid rgba(140, 151, 247, 0.35);
          color: #8c97f7;
          font-size: 0.85rem;
          font-weight: 600;
          letter-spacing: 0.02em;
          box-shadow: 0 1px 8px rgba(10, 12, 26, 0.35);
        }

        .preferences-container {
          position: relative;
        }

        .preferences-toggle {
          display: flex;
          align-items: center;
          gap: 8px;
          background: transparent;
          border: 1px solid rgba(140, 151, 247, 0.35);
          color: #cfd5ff;
          padding: 6px 12px;
          border-radius: 10px;
          cursor: pointer;
          font-size: 0.9rem;
          font-weight: 600;
          transition: all 0.2s ease;
          height: 36px;
        }

        .preferences-toggle:hover,
        .preferences-toggle.active {
          background: rgba(140, 151, 247, 0.12);
          border-color: rgba(140, 151, 247, 0.35);
          color: #fff;
        }

        .pref-icon {
          color: #ffcf7a;
          display: flex;
          align-items: center;
          font-size: 1rem;
        }

        .pref-icon svg {
          width: 1em;
          height: 1em;
        }

        .pref-btn-text {
          display: inline;
        }

        .preferences-dropdown {
          position: absolute;
          bottom: calc(100% + 10px);
          right: 0;
          width: 280px;
          background: rgba(24, 26, 54, 0.98);
          border: 1px solid rgba(140, 151, 247, 0.28);
          border-radius: 16px;
          padding: 16px;
          z-index: 1000;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5),
            0 0 0 1px rgba(140, 151, 247, 0.15) inset;
          backdrop-filter: blur(12px);
          animation: slideUp 0.2s ease-out;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .pref-header {
          font-size: 0.95rem;
          font-weight: 700;
          color: #fff;
          margin-bottom: 12px;
          padding-bottom: 8px;
          border-bottom: 1px solid rgba(140, 151, 247, 0.15);
        }

        .pref-section-title {
          font-size: 0.8rem;
          font-weight: 600;
          color: #aeb5e9;
          margin: 12px 0 8px 0;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .pref-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 0;
          cursor: pointer;
        }

        .pref-label {
          display: flex;
          flex-direction: column;
          gap: 2px;
          font-size: 0.9rem;
          color: #e9ebff;
        }

        .checkbox-btn {
          width: 22px;
          height: 22px;
          border-radius: 6px;
          border: 2px solid #aeb5e9;
          background: transparent;
          display: grid;
          place-items: center;
          color: #11132f;
          font-size: 0.7rem;
          transition: all 0.2s ease;
          padding: 0;
          cursor: pointer;
        }

        .checkbox-btn.checked {
          background: #ffcf7a;
          border-color: #ffcf7a;
        }

        .pref-divider {
          height: 1px;
          background: rgba(140, 151, 247, 0.15);
          margin: 8px 0;
        }

        /* Favorites button */
        .favorites-icon-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 10px;
          background: transparent;
          border: 1px solid rgba(255, 107, 107, 0.35);
          color: #ff6b6b;
          cursor: pointer;
          transition: all 0.2s ease;
          height: 36px;
          font-size: 1rem;
        }

        .favorites-icon-btn svg {
          width: 1em;
          height: 1em;
        }

        .favorites-icon-btn:hover,
        .favorites-icon-btn.active {
          background: rgba(255, 107, 107, 0.12);
          border-color: #ff6b6b;
        }

        .favorites-count {
          background: rgba(255, 107, 107, 0.2);
          padding: 2px 8px;
          border-radius: 10px;
          font-size: 0.8rem;
          font-weight: 600;
        }



        .generate-section {
          max-width: 1000px;
          margin: 1.5rem auto 0 auto;
          padding: 0 20px;
          display: flex;
          justify-content: center;
        }

        .generate-btn-large {
          padding: 0.8em 2.5em;
          border-radius: 10px;
          font-size: 1rem;
          font-weight: 700;
          cursor: pointer;
          color: #b5bdff;
          background: rgba(28, 30, 56, 0.6);
          border: 1.5px solid rgba(157, 167, 255, 0.45);
          transition: all 0.2s ease;
          box-shadow: 0 4px 12px rgba(16, 20, 44, 0.3);
        }

        .generate-btn-large:hover:not(:disabled) {
          background-color: #ffcf7a;
          color: #11132f;
          border-color: #ffcf7a;
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(255, 207, 122, 0.3);
        }

        .generate-btn-large:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }


        .history-section {
          margin-top: 1.2rem;
          padding: 1rem;
          background: rgba(24, 26, 54, 0.96);
          border-radius: 12px;
          border: 1px solid rgba(140, 151, 247, 0.28);
          text-align: left;
          box-shadow: 0 18px 60px rgba(18, 20, 40, 0.62);
          backdrop-filter: blur(6px);
        }

        .history-section h3 {
          margin: 0 0 12px 0;
          font-size: 0.95rem;
          color: #aeb5e9;
          font-weight: 600;
        }

        .history-item {
          padding: 10px 14px;
          background: rgba(32, 35, 66, 0.7);
          border-radius: 10px;
          margin-bottom: 8px;
          cursor: pointer;
          transition: background 0.2s ease, border-color 0.2s ease;
          border: 1px solid rgba(140, 151, 247, 0.35);
        }

        .history-item:last-child {
          margin-bottom: 0;
        }

        .history-item:hover {
          background: rgba(140, 151, 247, 0.15);
          border-color: rgba(140, 151, 247, 0.6);
        }

        .history-courses {
          font-weight: 600;
          font-size: 0.95rem;
          color: #e9ebff;
          margin-bottom: 4px;
        }

        .history-meta {
          font-size: 0.85rem;
          color: #aeb5e9;
        }

        .error-wrapper {
          display: flex;
          justify-content: center;
          width: 100%;
          margin-top: 1.5rem;
          padding: 0 20px;
          box-sizing: border-box;
        }

        .error-message {
          color: #ff6b6b;
          background: rgba(255, 107, 107, 0.1);
          padding: 12px 24px;
          border-radius: 10px;
          border: 1px solid rgba(255, 107, 107, 0.25);
          font-size: 0.95rem;
          font-weight: 500;
          text-align: center;
          max-width: 100%;
        }

        .warning-message {
          background: rgba(255, 193, 7, 0.1);
          border: 1px solid rgba(255, 193, 7, 0.3);
          color: #ffc107;
          padding: 1.2rem;
          border-radius: 12px;
          margin-bottom: 1.5rem;
          text-align: center;
        }

        .warning-message h3 {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin: 0 0 8px 0;
          font-size: 1.1rem;
          font-weight: 700;
        }

        .warning-message p {
          margin: 0;
          font-size: 0.95rem;
        }



        .results-heading {
          color: #cfd5ff;
          font-weight: 700;
          margin-bottom: 1.2rem;
          font-size: 1.15rem;
          display: flex;
          align-items: center;
        }

        .results-heading svg {
          color: #ff6b6b;
          margin-right: 8px;
        }



        /* ============== RESPONSIVE STYLES ============== */

        @media (max-width: 900px) {
          .controls-section {
            padding: 0 1rem;
          }

          .preferences-dropdown {
            position: fixed;
            top: 50%;
            left: 50%;
            right: auto;
            bottom: auto;
            transform: translate(-50%, -50%);
            width: calc(100% - 2.5rem);
            max-width: 20rem;
            border-radius: 1rem;
            animation: fadeIn 0.2s ease-out;
            z-index: 100; /* Ensure it's on top */
            box-shadow: 0 1.25rem 3.75rem rgba(0,0,0,0.5);
          }

          @keyframes fadeIn {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }

          .selected-courses-list {
            gap: 0.5rem;
          }

          .selected-courses-section {
            margin-top: 0.85rem;
          }

          .course-tag {
            padding: 0.35em 0.9em;
            font-size: 0.95rem;
          }

          .generate-section {
            margin-top: 1.25rem;
          }

          .error-wrapper {
            margin-top: 1.2rem;
            padding: 0 1rem;
          }

          .error-message {
            padding: 0.625rem 1.25rem;
            font-size: 0.9rem;
          }

          .favorites-header {
            padding: 1rem 1.25rem;
          }

          .favorite-main {
            padding: 0.875rem 1rem;
          }

          .favorite-schedule-preview {
            padding: 0 1rem 1rem 1rem;
          }
        }

        @media (max-width: 600px) {
          .controls-section {
            padding: 0 0.75rem;
          }

          .semester-toggle button {
            padding: 0.4375rem 0.875rem;
            font-size: 0.85rem;
          }

          .pref-btn-text {
            display: inline; /* Keep visible until 480px */
          }

          .preferences-toggle {
            padding: 0.375rem 0.625rem;
          }

          .favorites-icon-btn {
            padding: 0.375rem 0.625rem;
          }

          .favorites-count {
            display: flex;
            align-items: center;
            justify-content: center;
            position: absolute;
            top: -0.25rem;
            right: -0.25rem;
            background: #ff6b6b;
            color: white;
            font-size: 0.65rem;
            font-weight: 700;
            width: 1rem;
            height: 1rem;
            border-radius: 50%;
            padding: 0;
            border: 2px solid #1c1e38; /* Cutout effect */
            box-shadow: 0 0.125rem 0.25rem rgba(0,0,0,0.2);
          }

          .favorites-icon-btn {
            position: relative;
            overflow: visible;
          }

          .selected-courses-list {
            gap: 0.45rem;
            padding: 0 0.25rem;
          }

          .selected-courses-section {
            margin-top: 0.75rem;
            gap: 0.6rem;
          }

          .course-tag {
            padding: 0.3em 0.8em;
            font-size: 0.88rem;
            gap: 0.375rem;
          }

          .course-tag button {
            font-size: 0.75rem;
          }

          .clear-all-btn {
            padding: 0.3125rem 0.75rem;
            font-size: 0.8rem;
          }

          .generate-section {
            margin-top: 1.1rem;
          }

          .generate-btn-large {
            font-size: 0.95rem;
            padding: 0.75em 2em;
          }

          .error-wrapper {
            margin-top: 1rem;
            padding: 0 0.75rem;
          }

          .error-message {
            padding: 0.625rem 1rem;
            font-size: 0.88rem;
          }

          .favorite-name {
            font-size: 0.95rem;
          }

          .favorite-meta {
            font-size: 0.8rem;
          }
        }

        @media (max-width: 480px) {
          .controls-section {
            padding: 0 0.625rem;
          }

          .semester-toggle {
            padding: 0.125rem;
            gap: 0.125rem;
          }

          .semester-toggle button {
            padding: 0.375rem 0.75rem;
            font-size: 0.8rem;
          }

          /* Hide preference text on smaller screens (aligned with App.css .recent-toggle) */
          .pref-btn-text {
            display: none;
          }

          .preferences-toggle,
          .history-icon-btn {
            width: 2.375rem;
            height: 2.375rem;
            padding: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 0.625rem;
            font-size: 1.1rem;
          }

          .preferences-toggle {
            justify-content: center;
          }

          .favorites-icon-btn {
            width: 2.375rem;
            height: 2.375rem;
            padding: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 0.625rem;
            font-size: 1.1rem;
            position: relative;
            overflow: visible;
            background: rgba(255, 107, 107, 0.1); /* Subtle background */
            border: 1px solid rgba(255, 107, 107, 0.3);
          }

          .selected-courses-list {
            gap: 0.4rem;
          }

          .selected-courses-section {
            margin-top: 0.65rem;
            gap: 0.5rem;
          }

          .course-tag {
            padding: 0.28em 0.7em;
            font-size: 0.82rem;
            gap: 0.3125rem;
          }

          .course-tag button {
            font-size: 0.7rem;
          }

          .clear-all-btn {
            padding: 0.3125rem 0.625rem;
            font-size: 0.75rem;
          }

          .clear-all-text {
            display: none;
          }

          .generate-section {
            margin-top: 1rem;
          }

          .generate-btn-large {
            font-size: 0.9rem;
            padding: 0.7em 1.8em;
          }

          .error-wrapper {
            margin-top: 0.9rem;
            padding: 0 0.625rem;
          }

          .error-message {
            padding: 0.5rem 0.875rem;
            font-size: 0.85rem;
          }

          .favorites-list {
            padding: 0.75rem;
          }

          .favorite-item {
            margin-bottom: 0.75rem;
          }

          .favorite-main {
            padding: 0.75rem 0.875rem;
            flex-direction: column;
            align-items: flex-start;
            gap: 0.75rem;
          }

          .favorite-actions {
            width: 100%;
            justify-content: flex-end;
          }

          .favorite-schedule-preview {
            padding: 0 0.875rem 0.875rem 0.875rem;
          }
        }

        @media (max-width: 420px) {
          .controls-section {
            padding: 0 0.5rem;
          }

          .semester-toggle button {
            padding: 0.3125rem 0.625rem;
            font-size: 0.75rem;
          }

          .selected-courses-list {
            gap: 0.35rem;
          }

          .selected-courses-section {
            margin-top: 0.6rem;
          }

          .course-tag {
            padding: 0.25em 0.6em;
            font-size: 0.78rem;
            gap: 0.25rem;
          }

          .generate-section {
            margin-top: 0.9rem;
          }

          .generate-btn-large {
            font-size: 0.85rem;
            padding: 0.65em 1.5em;
          }

          .error-wrapper {
            margin-top: 0.8rem;
            padding: 0 0.5rem;
          }

          .error-message {
            padding: 0.5rem 0.75rem;
            font-size: 0.8rem;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .generate-btn-large,
          .course-tag,
          .history-item,
          .semester-toggle button,
          .preferences-toggle,
          .history-icon-btn,
          .favorites-icon-btn,
          .clear-all-btn,
          .favorite-action-btn {
            transition: none;
          }
        }

        /* Comparison Modal Styles */
        .comparison-modal {
          max-width: 1400px !important;
          width: 95vw !important;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          padding: 24px !important;
          border-radius: 1.5rem !important;
        }

        .comparison-modal-header {
          flex: 0 0 auto;
          display: flex;
          flex-direction: column;
        }

        .comparison-modal h2 {
          margin: 0 0 16px 0 !important;
          font-size: 1.3rem !important;
        }

        .conflict-warning-box {
          background: rgba(255, 107, 107, 0.15);
          border: 1px solid rgba(255, 107, 107, 0.4);
          color: #ff6b6b;
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 16px;
          font-size: 0.95rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .comparison-modal-content {
          flex: 1 1 auto;
          min-height: 0;
          display: flex;
          flex-direction: column;
          margin-top: 8px;
          overflow-y: auto;
        }

        .comparison-subtitle {
          color: #ffab00;
          margin: 0 0 8px 0;
          font-size: 1rem;
          flex: 0 0 auto;
        }

        .comparison-description {
          font-size: 0.85rem;
          color: #aaa;
          margin: 0 0 10px 0;
          flex: 0 0 auto;
        }

        .comparison-schedule-wrapper {
          flex: 1 1 auto;
          min-height: 0;
          overflow-y: auto;
          padding-right: 8px;
        }

        .no-schedule-placeholder {
          padding: 20px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          text-align: center;
        }

        .change-summary-section {
          background: rgba(255, 171, 0, 0.1);
          border: 1px solid rgba(255, 171, 0, 0.3);
          border-radius: 12px;
          padding: 12px 16px;
          margin-top: 16px;
          flex: 0 0 auto;
        }

        .change-summary-section h3 {
          color: #ffab00;
          margin: 0 0 8px 0;
          font-size: 0.95rem;
        }

        .change-item {
          margin-bottom: 12px;
          padding-bottom: 12px;
        }

        .change-course-code {
          font-weight: 600;
          color: #fff;
          margin-bottom: 6px;
        }

        .change-removed {
          color: #ff6b6b;
          font-size: 0.9rem;
        }

        .change-details {
          font-size: 0.85rem;
          color: #ddd;
        }

        .change-field {
          margin-bottom: 4px;
        }

        .change-field-name {
          color: #ffab00;
          text-transform: capitalize;
        }

        .change-old-value {
          color: #ff9999;
          text-decoration: line-through;
        }

        .change-new-value {
          color: #99ff99;
        }

        @media (max-width: 600px) {
          .comparison-modal {
            width: 100vw !important;
            max-width: 100vw !important;
            max-height: 100vh;
            height: 100vh;
            border-radius: 0 !important;
            padding: 16px !important;
          }

          .comparison-modal h2 {
            font-size: 1.1rem !important;
            margin-bottom: 12px !important;
          }

          .conflict-warning-box {
            padding: 10px 12px;
            font-size: 0.85rem;
            margin-bottom: 12px;
          }

          .comparison-subtitle {
            font-size: 0.9rem;
          }

          .comparison-description {
            font-size: 0.8rem;
          }

          .change-summary-section {
            padding: 10px 12px;
            margin-top: 12px;
          }

          .change-summary-section h3 {
            font-size: 0.9rem;
            margin-bottom: 6px;
          }

          .change-item {
            margin-bottom: 10px;
            padding-bottom: 10px;
            font-size: 0.85rem;
          }

          .change-course-code {
            font-size: 0.9rem;
          }

          .change-removed,
          .change-details {
            font-size: 0.8rem;
          }
        }
      `}</style>
      {showWelcomeModal && (
        <div className="coursalog-popup-overlay">
          <div className="coursalog-popup">
            <h2>Welcome to Schedule Mode!</h2>
            <ul>
              <li>
                <strong>Smart Sorting:</strong> The algorithm prioritizes schedules that finish earliest while strictly following your preferences.
              </li>
              <li>
                <strong>Preference First:</strong> Your selected preferences (e.g., "No Fridays") are the top priority.
              </li>
              <li>
                <strong>Worst Case Last:</strong> Schedules that don't meet your criteria or have late finishes are shown towards the end.
              </li>
              <li>
                <strong>Verify Data:</strong> Machines can mistakes too. Always confirm from SIS that the timings exist.
              </li>
            </ul>
            <button className="search-btn" onClick={closeWelcomeModal}>
              Got it!
            </button>
          </div>
        </div>
      )}
    </div >
  );
};

export default ScheduleInterface;