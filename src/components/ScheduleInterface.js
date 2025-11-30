import React, { useState, useEffect, useRef } from 'react';
import { generateSchedules, refreshSchedule, getScheduleHash, checkPreferences } from '../utils/scheduler';
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
} from 'react-icons/fa';

const ScheduleInterface = ({ sheetData, sheetDataSpring }) => {
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

  // Scroll to top when page changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPage]);

  const schedulesPerPage = 5;

  const activeSheetData = semester === 'fall25' ? sheetData : sheetDataSpring;

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
    };
    try {
      localStorage.setItem('coursalog_state', JSON.stringify(stateToSave));
    } catch (e) {
      console.error('Failed to save state:', e);
    }
  }, [semester, courseInput, selectedCourses, preferences]);

  // Save schedule results whenever they change
  useEffect(() => {

    const resultsToSave = {
      schedules,
      error,
      isPartial,
      coursesFound,
      totalCourses,
      currentPage,
    };
    try {
      localStorage.setItem('coursalog_schedule_results', JSON.stringify(resultsToSave));
    } catch (e) {
      console.error('Failed to save schedule results:', e);
    }
  }, [schedules, error, isPartial, coursesFound, totalCourses, currentPage]);

  useEffect(() => {
    // Don't clear results on initial mount (when loading from localStorage)
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    setSchedules([]);
    setError(null);
    setCurrentPage(1);
    setIsPartial(false);
    setCoursesFound(0);
    setTotalCourses(0);
    // Note: We don't need to manually save to localStorage here because
    // updating the state variables (setSchedules, etc.) will trigger
    // the useEffect above which handles the saving.
  }, [semester]);

  // Initial conflict check for existing favorites when data loads
  useEffect(() => {
    if (!favoritesLoaded || favorites.length === 0) return;
    if (!sheetData || sheetData.length === 0) return;
    if (!sheetDataSpring || sheetDataSpring.length === 0) return;

    // Check if any favorite needs conflict detection
    const needsCheck = favorites.some(fav => fav.hasConflicts === undefined);

    if (!needsCheck) return;

    setFavorites((prevFavorites) => {
      return prevFavorites.map((fav) => {
        // Skip if already has conflict status
        if (fav.hasConflicts !== undefined) return fav;

        const data = fav.semester === 'spring26' ? sheetDataSpring : sheetData;
        const { hasConflicts } = refreshSchedule(fav.schedule, data);

        return {
          ...fav,
          hasConflicts: hasConflicts,
        };
      });
    });
  }, [favoritesLoaded, favorites, sheetData, sheetDataSpring]);


  // Update favorites when sheet data changes
  useEffect(() => {
    if (!favoritesLoaded) return;

    setFavorites((prevFavorites) => {
      let anyChanges = false;
      const newFavorites = prevFavorites.map((fav) => {
        const data = fav.semester === 'spring26' ? sheetDataSpring : sheetData;

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
  }, [sheetData, sheetDataSpring, favoritesLoaded]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        preferencesRef.current &&
        !preferencesRef.current.contains(event.target)
      ) {
        setShowPreferences(false);
      }
    };

    if (showPreferences) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showPreferences]);

  // Lock background scroll when comparison modal is open
  useEffect(() => {
    if (showComparisonFor) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
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

    const code = courseInput.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (code && !selectedCourses.includes(code)) {
      setSelectedCourses([...selectedCourses, code]);
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

    setTimeout(() => {
      const result = generateSchedules(
        selectedCourses,
        activeSheetData,
        preferences
      );

      if (result.error) {
        setError(result.error);
      } else {
        setSchedules(result.schedules);
        setIsPartial(result.isPartial);
        setCoursesFound(result.coursesFound);
        setTotalCourses(result.totalCourses);

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

  const handlePrevPage = () => {
    setCurrentPage((p) => Math.max(1, p - 1));
  };

  const handleNextPage = () => {
    setCurrentPage((p) => Math.min(totalPages, p + 1));
  };

  const handlePageInput = (e) => {
    const value = e.target.value;
    if (value === '') {
      setCurrentPage('');
      return;
    }
    const page = parseInt(value, 10);
    if (!isNaN(page) && page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handlePageBlur = () => {
    if (currentPage === '' || currentPage < 1) {
      setCurrentPage(1);
    } else if (currentPage > totalPages) {
      setCurrentPage(totalPages);
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
                placeholder="Enter Course Code (e.g. MATH181)"
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
              <div className="semester-toggle" style={{ marginBottom: 0 }}>
                <button
                  className={semester === 'fall25' ? 'active' : ''}
                  onClick={() => setSemester('fall25')}
                >
                  Fall '25
                </button>
                <button
                  className={semester === 'spring26' ? 'active' : ''}
                  onClick={() => setSemester('spring26')}
                >
                  Spring '26
                </button>
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
                  onClick={() => {
                    setShowHistory(!showHistory);
                    if (!showHistory) setShowFavorites(false);
                  }}
                  className={`history-icon-btn ${showHistory ? 'active' : ''}`}
                  title="View History"
                >
                  <FaHistory />
                </button>
              )}
            </div>
          </div>
        </div>

        {selectedCourses.length > 0 && (() => {
          // Calculate total credits for selected courses
          const data = semester === 'spring26' ? sheetDataSpring : sheetData;
          const totalCredits = selectedCourses.reduce((sum, courseCode) => {
            const normalizedCode = courseCode.toUpperCase().replace(/[^A-Z0-9]/g, '');
            const courseSections = data.filter(row => {
              const rowCode = ((row.subject || row.subj || '') + (row.cat || row.number || '')).toUpperCase().replace(/[^A-Z0-9]/g, '');
              return rowCode === normalizedCode;
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
            <div className="error-message">{error}</div>
          </div>
        )}


        {showFavorites && favorites.length > 0 && (
          <div className="results-section">
            <div className="schedules-list">
              <h3 className="results-heading">
                <FaHeart style={{ color: '#ff6b6b', marginRight: '8px' }} />
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
                        ⚠️ Time conflict detected! This schedule has overlapping courses.
                      </span>
                    </div>
                  )}
                  {fav.modified && (
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
                  setSelectedCourses(entry.courses);
                  setPreferences(entry.preferences);
                  if (entry.semester) setSemester(entry.semester);
                  setShowHistory(false);
                }}
              >
                <div className="history-courses">
                  {entry.courses.join(', ')}
                </div>
                <div className="history-meta">
                  {entry.semester === 'spring26' ? "Spring '26" : "Fall '25"} •{' '}
                  {new Date(entry.timestamp).toLocaleDateString()} •{' '}
                  {entry.scheduleCount} schedule
                  {entry.scheduleCount !== 1 ? 's' : ''}
                  {entry.isPartial && ' (Partial)'}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="results-section">
          {schedules.length > 0 && (
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
                  Found {schedules.length} valid schedule
                  {schedules.length !== 1 ? 's' : ''}
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
                      <FaExclamationTriangle style={{ fontSize: '1.2em', flexShrink: 0 }} />
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
                  />
                </div>
              ))}

              {totalPages > 1 && (
                <div className="pagination-bar">
                  <button
                    className="pagination-arrow"
                    onClick={handlePrevPage}
                    disabled={currentPage <= 1}
                    aria-label="Previous page"
                  >
                    ←
                  </button>

                  <div className="pagination-page">
                    <span className="pagination-label">Page</span>
                    <input
                      type="number"
                      className="pagination-input"
                      value={currentPage}
                      onChange={handlePageInput}
                      onBlur={handlePageBlur}
                      min={1}
                      max={totalPages}
                      aria-label="Current page number"
                    />
                    <span className="pagination-total">of {totalPages}</span>
                  </div>

                  <button
                    className="pagination-arrow"
                    onClick={handleNextPage}
                    disabled={currentPage >= totalPages}
                    aria-label="Next page"
                  >
                    →
                  </button>
                </div>
              )}
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
              className="coursalog-popup"
              onClick={e => e.stopPropagation()}
              style={{
                maxWidth: '1400px',
                width: '95vw',
                height: '90vh',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                padding: '24px',
              }}
            >
              <div style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column' }}>
                <h2 style={{ margin: '0 0 16px 0', fontSize: '1.3rem' }}>Schedule Changes</h2>

                {/* Conflict Warning */}
                {fav.hasConflicts && (
                  <div style={{
                    background: 'rgba(255, 107, 107, 0.15)',
                    border: '1px solid rgba(255, 107, 107, 0.4)',
                    color: '#ff6b6b',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    marginBottom: '16px',
                    fontSize: '0.95rem',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    flexWrap: 'wrap',
                  }}>
                    <FaExclamationTriangle />
                    <span style={{ flex: '1 1 auto', minWidth: '200px' }}>
                      ⚠️ Time conflict detected! This updated schedule has overlapping courses.
                    </span>
                  </div>
                )}
              </div>

              <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', marginTop: '8px', overflowY: 'auto' }}>
                <h3 style={{ color: '#ffab00', marginTop: 0, marginBottom: '8px', fontSize: '1rem', flex: '0 0 auto' }}>Your Schedule (Before Changes)</h3>
                <p style={{ fontSize: '0.85rem', color: '#aaa', marginBottom: '10px', marginTop: 0, flex: '0 0 auto' }}>
                  This is how your schedule looked before the updates. Changed sections are highlighted.
                </p>
                <div style={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto', paddingRight: '8px' }}>
                  {fav.previousSchedule ? (
                    <ScheduleView
                      schedule={fav.previousSchedule}
                      hideHeader={true}
                      highlightIds={highlightIds}
                      semester={fav.semester}
                    />
                  ) : (
                    <div style={{ padding: '20px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', textAlign: 'center' }}>
                      Original schedule data not available.
                    </div>
                  )}
                </div>

                {/* Change Summary - Now at the bottom */}
                {fav.changeDetails && fav.changeDetails.length > 0 && (
                  <div style={{
                    background: 'rgba(255, 171, 0, 0.1)',
                    border: '1px solid rgba(255, 171, 0, 0.3)',
                    borderRadius: '12px',
                    padding: '12px 16px',
                    marginTop: '16px',
                    flex: '0 0 auto',
                  }}>
                    <h3 style={{ color: '#ffab00', marginTop: 0, marginBottom: '8px', fontSize: '0.95rem' }}>Changes Summary</h3>
                    {fav.changeDetails.map((change, idx) => (
                      <div key={idx} style={{
                        marginBottom: '12px',
                        paddingBottom: '12px',
                        borderBottom: idx < fav.changeDetails.length - 1 ? '1px solid rgba(255, 171, 0, 0.2)' : 'none'
                      }}>
                        <div style={{ fontWeight: '600', color: '#fff', marginBottom: '6px' }}>
                          {change.courseCode} {change.section && `- Section ${change.section}`}
                        </div>
                        {change.type === 'removed' ? (
                          <div style={{ color: '#ff6b6b', fontSize: '0.9rem' }}>
                            ⚠️ This section has been removed from the course catalog
                          </div>
                        ) : (
                          <div style={{ fontSize: '0.85rem', color: '#ddd' }}>
                            {Object.entries(change.changes).map(([field, values]) => (
                              <div key={field} style={{ marginBottom: '4px' }}>
                                <span style={{ color: '#ffab00', textTransform: 'capitalize' }}>{field}:</span>{' '}
                                <span style={{ color: '#ff9999', textDecoration: 'line-through' }}>{values.old || '(empty)'}</span>
                                {' → '}
                                <span style={{ color: '#99ff99' }}>{values.new || '(empty)'}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
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
          border-color: #ffcf7a;
          color: #fff;
        }

        .pref-icon {
          color: #ffcf7a;
          display: flex;
          align-items: center;
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
          font-size: 0.9rem;
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

        .history-icon-btn {
          display: grid;
          place-items: center;
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: transparent;
          border: 1px solid rgba(140, 151, 247, 0.35);
          color: #ffcf7a;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .history-icon-btn:hover,
        .history-icon-btn.active {
          background: rgba(140, 151, 247, 0.12);
          border-color: #ffcf7a;
          transform: translateY(-1px);
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
        }

        .pagination-bar {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          margin-top: 24px;
          padding: 16px;
          background: rgba(24, 26, 54, 0.6);
          border-radius: 12px;
          border: 1px solid rgba(140, 151, 247, 0.2);
        }

        .pagination-arrow {
          background: rgba(140, 151, 247, 0.1);
          border: 1px solid rgba(140, 151, 247, 0.3);
          color: #cfd5ff;
          padding: 10px 16px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 1.1rem;
          transition: all 0.2s;
        }

        .pagination-arrow:hover:not(:disabled) {
          background: rgba(140, 151, 247, 0.2);
          border-color: #ffcf7a;
          color: #ffcf7a;
        }

        .pagination-arrow:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .pagination-page {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #aeb5e9;
          font-size: 0.95rem;
        }

        .pagination-input {
          width: 50px;
          padding: 6px 8px;
          border: 1px solid rgba(140, 151, 247, 0.3);
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.05);
          color: #fff;
          font-size: 0.95rem;
          text-align: center;
          outline: none;
        }

        .pagination-input:focus {
          border-color: #ffcf7a;
        }

        .pagination-input::-webkit-outer-spin-button,
        .pagination-input::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }

        .pagination-input[type='number'] {
          -moz-appearance: textfield;
        }

        /* ============== RESPONSIVE STYLES ============== */

        @media (max-width: 900px) {
          .controls-section {
            padding: 0 16px;
          }

          .selected-courses-list {
            gap: 0.5rem;
          }

          .selected-courses-section {
            margin-top: 0.9rem;
          }

          .generate-section {
            margin-top: 1.25rem;
          }

          .error-wrapper {
            margin-top: 1.25rem;
            padding: 0 16px;
          }
        }

        @media (max-width: 768px) {
          .controls-section {
            padding: 0 16px;
          }

          .preferences-dropdown {
            position: fixed;
            top: 50%;
            left: 50%;
            right: auto;
            bottom: auto;
            transform: translate(-50%, -50%);
            width: calc(100% - 40px);
            max-width: 320px;
            border-radius: 16px;
            animation: fadeIn 0.2s ease-out;
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
            padding: 0 16px;
          }

          .error-message {
            padding: 10px 20px;
            font-size: 0.9rem;
          }



          .favorites-header {
            padding: 16px 20px;
          }

          .favorite-main {
            padding: 14px 16px;
          }

          .favorite-schedule-preview {
            padding: 0 16px 16px 16px;
          }
        }

        @media (max-width: 600px) {
          .controls-section {
            padding: 0 12px;
          }

          .semester-toggle button {
            padding: 7px 14px;
            font-size: 0.85rem;
          }

          .pref-btn-text {
            display: none;
          }

          .preferences-toggle {
            padding: 6px 10px;
          }

          .favorites-icon-btn {
            padding: 6px 10px;
          }

          .favorites-count {
            display: flex;
            align-items: center;
            justify-content: center;
            position: absolute;
            top: -4px;
            right: -4px;
            background: #ff6b6b;
            color: white;
            font-size: 0.65rem;
            font-weight: 700;
            width: 16px;
            height: 16px;
            border-radius: 50%;
            padding: 0;
            border: 2px solid #1c1e38; /* Cutout effect */
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          }

          .favorites-icon-btn {
            position: relative;
            overflow: visible;
          }

          .selected-courses-list {
            gap: 0.45rem;
            padding: 0 4px;
          }

          .selected-courses-section {
            margin-top: 0.75rem;
            gap: 0.6rem;
          }

          .course-tag {
            padding: 0.3em 0.8em;
            font-size: 0.88rem;
            gap: 6px;
          }

          .course-tag button {
            font-size: 0.75rem;
          }

          .clear-all-btn {
            padding: 5px 12px;
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
            padding: 0 12px;
          }

          .error-message {
            padding: 10px 16px;
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
            padding: 0 10px;
          }

          .semester-toggle {
            padding: 2px;
            gap: 2px;
          }

          .semester-toggle button {
            padding: 6px 12px;
            font-size: 0.8rem;
          }

          .preferences-toggle,
          .history-icon-btn {
            width: 38px;
            height: 38px;
            padding: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 10px;
            font-size: 1.1rem;
          }

          .preferences-toggle {
            justify-content: center;
          }

          .favorites-icon-btn {
            width: 38px;
            height: 38px;
            padding: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 10px;
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
            gap: 5px;
          }

          .course-tag button {
            font-size: 0.7rem;
          }

          .clear-all-btn {
            padding: 5px 10px;
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
            padding: 0 10px;
          }

          .error-message {
            padding: 8px 14px;
            font-size: 0.85rem;
          }

          .favorites-list {
            padding: 12px;
          }

          .favorite-item {
            margin-bottom: 12px;
          }

          .favorite-main {
            padding: 12px 14px;
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }

          .favorite-actions {
            width: 100%;
            justify-content: flex-end;
          }

          .favorite-schedule-preview {
            padding: 0 14px 14px 14px;
          }

          .pagination-bar {
            gap: 12px;
            padding: 12px;
          }

          .pagination-arrow {
            padding: 8px 12px;
            font-size: 1rem;
          }

          .pagination-page {
            font-size: 0.9rem;
          }

          .pagination-input {
            width: 45px;
            padding: 5px 6px;
            font-size: 0.9rem;
          }
        }

        @media (max-width: 360px) {
          .controls-section {
            padding: 0 8px;
          }

          .semester-toggle button {
            padding: 5px 10px;
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
            gap: 4px;
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
            padding: 0 8px;
          }

          .error-message {
            padding: 8px 12px;
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