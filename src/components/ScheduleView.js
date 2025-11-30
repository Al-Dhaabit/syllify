import React, { useRef, useMemo, useState, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { FaDownload, FaHeart, FaRegHeart, FaCopy, FaCheck, FaCalendarPlus, FaTimes } from 'react-icons/fa';

const COLORS = [
  { bg: '#FF6B6B', text: '#FFF' },
  { bg: '#4361EE', text: '#FFF' },
  { bg: '#ffcf7a', text: '#000' },
  { bg: '#7209B7', text: '#FFF' },
  { bg: '#2EC4B6', text: '#000' },
  { bg: '#FF9F1C', text: '#000' },
  { bg: '#F72585', text: '#FFF' },
  { bg: '#06D6A0', text: '#000' },
  { bg: '#FFE66D', text: '#000' },
  { bg: '#118AB2', text: '#FFF' },
];

const ScheduleView = ({
  schedule = [],
  scheduleIndex,
  totalSchedules,
  onFavorite,
  isFavorited,
  favoriteName,
  hideHeader = false,
  highlightIds = [], // Array of courseCode-sectionNum strings to highlight
  semester = '', // New prop
  satisfiedPreferences = {},
  activePreferences = {},
}) => {
  const scheduleRef = useRef(null);
  const [showNameInput, setShowNameInput] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [calendarSuccess, setCalendarSuccess] = useState(false);
  const hourHeight = 70;

  const getMinutesFromMidnight = (timeStr) => {
    if (!timeStr) return 0;
    const match = timeStr.match(/(\d{1,2}):(\d{2})\s?(AM|PM)/i);
    if (!match) return 0;
    let [, h, m, ap] = match;
    h = parseInt(h);
    m = parseInt(m);
    if (ap.toUpperCase() === 'PM' && h !== 12) h += 12;
    if (ap.toUpperCase() === 'AM' && h === 12) h = 0;
    return h * 60 + m;
  };

  const { startHour, endHour } = useMemo(() => {
    let earliest = 24 * 60;
    let latest = 0;

    schedule.forEach((section) => {
      const start = getMinutesFromMidnight(section.timestart);
      const end = getMinutesFromMidnight(section.timeend);
      if (start > 0 && start < earliest) earliest = start;
      if (end > 0 && end > latest) latest = end;
    });

    if (earliest === 24 * 60 || latest === 0) {
      return { startHour: 8, endHour: 17 };
    }

    const startHour = Math.max(0, Math.floor(earliest / 60) - 1);
    const endHour = Math.min(24, Math.ceil(latest / 60) + 1);

    return { startHour, endHour };
  }, [schedule]);



  const courseColorMap = useMemo(() => {
    const uniqueCodes = [
      ...new Set(
        schedule.map(
          (section) =>
            (section.subject || section.subj || '') +
            (section.cat || section.number || '')
        )
      ),
    ];

    const colorMap = {};
    uniqueCodes.forEach((code, index) => {
      colorMap[code] = COLORS[index % COLORS.length];
    });

    return colorMap;
  }, [schedule]);

  const handleExport = async () => {
    if (scheduleRef.current) {
      const originalDisplay = scheduleRef.current.style.display;
      const originalWidth = scheduleRef.current.style.width;

      scheduleRef.current.style.display = 'block';
      scheduleRef.current.style.width = '1000px'; // Force desktop width

      try {
        const canvas = await html2canvas(scheduleRef.current, {
          backgroundColor: '#0f1327',
          scale: 2,
          windowWidth: 1200, // Simulate desktop window
        });
        const link = document.createElement('a');
        link.download = `schedule-${scheduleIndex + 1}.png`;
        link.href = canvas.toDataURL();
        link.click();
      } finally {
        scheduleRef.current.style.display = originalDisplay;
        scheduleRef.current.style.width = originalWidth;
      }
    }
  };

  const handleCopy = async () => {
    if (scheduleRef.current) {
      const originalDisplay = scheduleRef.current.style.display;
      const originalWidth = scheduleRef.current.style.width;

      scheduleRef.current.style.display = 'block';
      scheduleRef.current.style.width = '1000px'; // Force desktop width

      try {
        const canvas = await html2canvas(scheduleRef.current, {
          backgroundColor: '#0f1327',
          scale: 2,
          windowWidth: 1200, // Simulate desktop window
        });

        // Use toDataURL (same as export) then convert to blob for consistency
        const dataUrl = canvas.toDataURL('image/png');
        const response = await fetch(dataUrl);
        const blob = await response.blob();

        await navigator.clipboard.write([
          new ClipboardItem({
            'image/png': blob,
          }),
        ]);

        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      } catch (err) {
        console.error('Failed to copy to clipboard:', err);
        alert('Failed to copy to clipboard. Please try downloading instead.');
      } finally {
        scheduleRef.current.style.display = originalDisplay;
        scheduleRef.current.style.width = originalWidth;
      }
    }
  };

  // Google Calendar API Integration
  const [isGapiLoaded, setIsGapiLoaded] = useState(false);

  // Load scripts on mount
  useEffect(() => {
    const loadScripts = async () => {
      const { loadGoogleScripts, initTokenClient } = await import('../utils/googleCalendar');
      loadGoogleScripts(() => {
        initTokenClient((response) => {
          // Token received, we can now make API calls
          // This callback is set during init, but the actual flow is triggered by requestAccessToken
        });
        setIsGapiLoaded(true);
      });
    };
    loadScripts();
  }, []);

  const getRoom = (section) => {
    return (section['Room #'] || section.room || section.Room || 'TBA').toString().trim();
  };

  const handleExportCalendar = async () => {
    const { getTokenClient, createCalendarEvent } = await import('../utils/googleCalendar');

    if (!isGapiLoaded) {
      alert('Google Calendar API is still loading. Please try again in a moment.');
      return;
    }

    const tokenClient = getTokenClient();

    // Trigger the popup
    tokenClient.callback = async (resp) => {
      if (resp.error) {
        throw resp;
      }

      // User authorized, now create events
      const daysMap = { M: 'MO', T: 'TU', W: 'WE', R: 'TH', F: 'FR', S: 'SA', U: 'SU' };

      // Google Calendar Color IDs (1-11)
      // 1: Lavender, 2: Sage, 3: Grape, 4: Flamingo, 5: Banana, 6: Tangerine, 
      // 7: Peacock, 8: Graphite, 9: Blueberry, 10: Basil, 11: Tomato
      const googleColors = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'];

      // Create a map of course codes to colors to ensure consistency
      const uniqueCodes = [...new Set(schedule.map(s =>
        (s.subject || s.subj || '') + (s.cat || s.number || '')
      ))];

      const colorMap = {};
      uniqueCodes.forEach((code, index) => {
        colorMap[code] = googleColors[index % googleColors.length];
      });

      let successCount = 0;

      for (const section of schedule) {
        if (!section.days || !section.timestart || !section.timeend) continue;

        const sectionDays = section.days.toUpperCase().split('').map(d => daysMap[d]).filter(Boolean);
        if (sectionDays.length === 0) continue;

        const startMin = getMinutesFromMidnight(section.timestart);
        const endMin = getMinutesFromMidnight(section.timeend);
        const duration = endMin - startMin;

        // Calculate start date (next occurrence)
        const firstDayCode = sectionDays[0];
        const targetDayIndex = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'].indexOf(firstDayCode);

        let startDate = new Date();
        const currentDayIndex = startDate.getDay();
        let daysToAdd = (targetDayIndex - currentDayIndex + 7) % 7;
        // Ensure we start from at least today or tomorrow
        if (daysToAdd === 0 && (startDate.getHours() * 60 + startDate.getMinutes()) > startMin) {
          daysToAdd = 7;
        }

        startDate.setDate(startDate.getDate() + daysToAdd);
        const startHour = Math.floor(startMin / 60);
        const startMinute = startMin % 60;
        startDate.setHours(startHour, startMinute, 0, 0);

        const endDate = new Date(startDate);
        endDate.setMinutes(endDate.getMinutes() + duration);

        // Recurrence: Until 4 months from now
        const untilDate = new Date(startDate);
        untilDate.setMonth(untilDate.getMonth() + 4);
        const untilStr = untilDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

        const courseCode = (section.subject || section.subj || '') + (section.cat || section.number || '');
        const sectionNum = section.section || section.sec || section.sect || '';

        // Only append title if it exists, otherwise just use course code
        const summary = section.title ? `${courseCode} - ${section.title}` : courseCode;
        const room = getRoom(section);

        const event = {
          'summary': summary,
          'location': room,
          'description': `Instructor: ${getInstructor(section)}\nSection: ${sectionNum}\n\nMade using Syllify.info`,
          'colorId': colorMap[courseCode],
          'start': {
            'dateTime': startDate.toISOString(),
            'timeZone': Intl.DateTimeFormat().resolvedOptions().timeZone
          },
          'end': {
            'dateTime': endDate.toISOString(),
            'timeZone': Intl.DateTimeFormat().resolvedOptions().timeZone
          },
          'recurrence': [
            `RRULE:FREQ=WEEKLY;BYDAY=${sectionDays.join(',')};UNTIL=${untilStr}`
          ],
        };

        try {
          await createCalendarEvent(event);
          successCount++;
        } catch (e) {
          console.error('Error creating event for ' + courseCode, e);
        }
      }

      if (successCount > 0) {
        setCalendarSuccess(true);
        setTimeout(() => setCalendarSuccess(false), 2000);
      }
    };

    // Request access token
    tokenClient.requestAccessToken({ prompt: 'consent' });
  };

  const handleFavoriteClick = () => {
    if (isFavorited) {
      onFavorite(schedule, null); // Remove favorite
    } else {
      setNameInput(`Schedule ${scheduleIndex + 1}`);
      setShowNameInput(true);
    }
  };

  const handleSaveFavorite = () => {
    if (nameInput.trim()) {
      onFavorite(schedule, nameInput.trim());
      setShowNameInput(false);
      setNameInput('');
    }
  };

  const handleCancelFavorite = () => {
    setShowNameInput(false);
    setNameInput('');
  };

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const daysShort = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const dayMap = { M: 0, T: 1, W: 2, R: 3, F: 4 };

  const getInstructor = (section) => {
    return (
      section.instructor ||
      section.prof ||
      section.professor ||
      section.teacher ||
      ''
    )
      .toString()
      .trim();
  };

  const sectionsByDay = days.map(() => []);
  schedule.forEach((section) => {
    const courseCode =
      (section.subject || section.subj || '') +
      (section.cat || section.number || '');
    const sectionNum = section.section || section.sec || section.sect || '';
    const instructor = getInstructor(section);
    const sectionDays = section.days || '';

    for (let char of sectionDays.toUpperCase()) {
      const dayIndex = dayMap[char];
      if (dayIndex !== undefined) {
        sectionsByDay[dayIndex].push({
          ...section,
          courseCode,
          sectionNum,
          instructor,
          colorStyle: courseColorMap[courseCode],
          isHighlighted: highlightIds.includes(`${courseCode}-${sectionNum}`),
        });
      }
    }
  });

  sectionsByDay.forEach((daySections) => {
    daySections.sort(
      (a, b) =>
        getMinutesFromMidnight(a.timestart) -
        getMinutesFromMidnight(b.timestart)
    );
  });

  const formatHour = (hour) => {
    const displayHour = hour % 12 === 0 ? 12 : hour % 12;
    const period = hour >= 12 ? 'PM' : 'AM';
    return `${displayHour} ${period}`;
  };

  // Calculate total credits for this schedule
  const totalCredits = useMemo(() => {
    const uniqueCourses = {};
    schedule.forEach((section) => {
      const courseCode = (section.subject || section.subj || '') + (section.cat || section.number || '');
      if (!uniqueCourses[courseCode]) {
        const credits = parseFloat(section.Crdt || section.crdt || section.credits || 0);
        uniqueCourses[courseCode] = credits;
      }
    });
    return Object.values(uniqueCourses).reduce((sum, credits) => sum + credits, 0);
  }, [schedule]);

  const Watermark = () => (
    <div className="watermark">
      <img src="/logo.png" alt="Syllify" className="watermark-logo" />
      <span>Made using Syllify.info</span>
    </div>
  );

  return (
    <div className={`schedule-card ${hideHeader ? 'no-header' : ''}`}>
      {!hideHeader && (
        <div className="schedule-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h3>
              {favoriteName || `Option ${scheduleIndex + 1} of ${totalSchedules}`}
            </h3>
          </div>
          <div className="header-actions">
            <button
              onClick={handleFavoriteClick}
              className={`favorite-btn ${isFavorited ? 'favorited' : ''}`}
              title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
            >
              {isFavorited ? <FaHeart /> : <FaRegHeart />}
            </button>
            <button
              onClick={handleCopy}
              className={`copy-btn ${copySuccess ? 'success' : ''}`}
              title="Copy PNG to clipboard"
            >
              {copySuccess ? (
                <>
                  <FaCheck /> <span className="copy-text">Copied!</span>
                </>
              ) : (
                <>
                  <FaCopy /> <span className="copy-text">Copy PNG</span>
                </>
              )}
            </button>
            <button
              onClick={handleExportCalendar}
              className={`calendar-btn ${calendarSuccess ? 'success' : ''}`}
              title="Export to Google Calendar"
            >
              {calendarSuccess ? (
                <>
                  <FaCheck /> <span className="export-text">Added!</span>
                </>
              ) : (
                <>
                  <FaCalendarPlus /> <span className="export-text">Google Calendar (RIT Gmail Only)</span>
                </>
              )}
            </button>
            <button onClick={handleExport} className="export-btn">
              <FaDownload /> <span className="export-text">Export PNG</span>
            </button>
          </div>
        </div>
      )}

      {/* Preference Status Indicators */}
      {activePreferences && (activePreferences.noFridays || activePreferences.no9am || activePreferences.endBy) && (
        <div className="preference-status-bar">
          {activePreferences.noFridays && (
            <div className={`pref-status-item ${satisfiedPreferences?.noFridays ? 'met' : 'unmet'}`}>
              {satisfiedPreferences?.noFridays ? <FaCheck /> : <FaTimes />} No Fridays
            </div>
          )}
          {activePreferences.no9am && (
            <div className={`pref-status-item ${satisfiedPreferences?.no9am ? 'met' : 'unmet'}`}>
              {satisfiedPreferences?.no9am ? <FaCheck /> : <FaTimes />} No 9am
            </div>
          )}
          {activePreferences.endBy && (
            <div className={`pref-status-item ${satisfiedPreferences?.endBy ? 'met' : 'unmet'}`}>
              {satisfiedPreferences?.endBy ? <FaCheck /> : <FaTimes />} End by {activePreferences.endBy}
            </div>
          )}
        </div>
      )}

      {showNameInput && (
        <div className="name-input-overlay">
          <div className="name-input-modal">
            <h4>Name this schedule</h4>
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="Enter a name..."
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveFavorite();
                if (e.key === 'Escape') handleCancelFavorite();
              }}
            />
            <div className="name-input-actions">
              <button onClick={handleCancelFavorite} className="cancel-btn">
                Cancel
              </button>
              <button onClick={handleSaveFavorite} className="save-btn">
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile View - All days stacked */}
      <div className="mobile-schedule">
        {days.map((day, dayIndex) => (
          <div key={day} className="mobile-day">
            <div className="mobile-day-header">{daysShort[dayIndex]}</div>
            <div className="mobile-day-classes">
              {sectionsByDay[dayIndex].length === 0 ? (
                <div className="no-classes">—</div>
              ) : (
                sectionsByDay[dayIndex].map((section, idx) => (
                  <div
                    key={`${section.courseCode}-${section.sectionNum}-${idx}`}
                    className="mobile-class-card"
                    style={{
                      backgroundColor: section.colorStyle.bg,
                      color: section.colorStyle.text,
                      border: section.isHighlighted ? '2px solid #ffab00' : 'none',
                      boxShadow: section.isHighlighted ? '0 0 10px rgba(255, 171, 0, 0.5)' : '0 2px 4px rgba(0, 0, 0, 0.2)',
                    }}
                  >
                    <div className="mobile-class-name">
                      {section.courseCode}
                      {section.sectionNum && `-${section.sectionNum}`}
                    </div>
                    <div className="mobile-class-details">
                      <span>
                        {section.timestart} - {section.timeend}
                      </span>
                      {getRoom(section) !== 'TBA' && <><span>|</span><span>{getRoom(section)}</span></>}
                      {section.instructor && <><span>|</span><span>{section.instructor}</span></>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
        <div className="schedule-footer">
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {totalCredits > 0 && (
              <div className="schedule-credits-badge">
                <strong>{totalCredits}</strong> {totalCredits === 1 ? 'Credit' : 'Credits'}
              </div>
            )}
            {semester && (
              <div className="semester-badge">
                {semester === 'spring26' ? "Spring '26" : "Fall '25"}
              </div>
            )}
          </div>
          <Watermark />
        </div>
      </div>

      {/* Desktop Grid View */}
      <div className="desktop-schedule" ref={scheduleRef}>
        <div className="schedule-wrapper">
          <div className="time-column">
            <div className="grid-header-cell">Time</div>
            {Array.from({ length: endHour - startHour }).map((_, i) => (
              <div key={i} className="time-slot">
                <span className="time-label">{formatHour(startHour + i)}</span>
              </div>
            ))}
          </div>

          {days.map((day, dayIndex) => (
            <div key={day} className="day-column">
              <div className="grid-header-cell">{day}</div>
              <div className="day-content">
                {Array.from({ length: endHour - startHour }).map((_, i) => (
                  <div key={i} className="grid-cell"></div>
                ))}

                {sectionsByDay[dayIndex].map((section, idx) => {
                  const startMin = getMinutesFromMidnight(section.timestart);
                  const endMin = getMinutesFromMidnight(section.timeend);

                  // Calculate position in pixels for exact alignment with grid
                  const minutesFromStart = startMin - (startHour * 60);
                  const durationMinutes = endMin - startMin;

                  const topPx = (minutesFromStart / 60) * hourHeight;
                  const heightPx = (durationMinutes / 60) * hourHeight;

                  return (
                    <div
                      key={`${section.courseCode}-${section.sectionNum}-${idx}`}
                      className="course-block"
                      style={{
                        backgroundColor: section.colorStyle.bg,
                        color: section.colorStyle.text,
                        top: `${topPx}px`,
                        height: `${heightPx}px`,
                        border: section.isHighlighted ? '2px solid #ffab00' : '1px solid rgba(255, 255, 255, 0.1)',
                        boxShadow: section.isHighlighted ? '0 0 10px rgba(255, 171, 0, 0.5)' : '0 2px 4px rgba(0, 0, 0, 0.15)',
                        zIndex: section.isHighlighted ? 30 : 10,
                      }}
                    >
                      <div className="course-block-content">
                        <strong>
                          {section.courseCode}
                          {section.sectionNum && `-${section.sectionNum}`}
                        </strong>
                        {section.instructor && (
                          <span>{section.instructor}</span>
                        )}
                        <span>
                          {section.timestart} - {section.timeend}
                        </span>
                        {getRoom(section) !== 'TBA' && (
                          <span className="room-text">📍 {getRoom(section)}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="schedule-footer">
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {totalCredits > 0 && (
              <div className="schedule-credits-badge">
                <strong>{totalCredits}</strong> {totalCredits === 1 ? 'Credit' : 'Credits'}
              </div>
            )}
            {semester && (
              <div className="semester-badge">
                {semester === 'spring26' ? "Spring '26" : "Fall '25"}
              </div>
            )}
          </div>
          <Watermark />
        </div>
      </div>

      <style jsx>{`
        .schedule-card {
          background: rgba(30, 30, 40, 0.5);
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 24px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
          backdrop-filter: blur(8px);
          position: relative;
        }
        .schedule-card.no-header {
          margin-bottom: 0;
        }
        .schedule-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          padding-bottom: 12px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }
        .schedule-header h3 {
          margin: 0;
          font-size: 1rem;
          color: #fff;
          font-weight: 500;
        }
        .header-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .schedule-credits-badge {
          display: inline-block;
          background: rgba(140, 151, 247, 0.15);
          border: 1px solid rgba(140, 151, 247, 0.3);
          color: #8c97f7;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 0.8rem;
          font-weight: 600;
          letter-spacing: 0.02em;
        }
        .semester-badge {
          display: inline-block;
          background: rgba(255, 207, 122, 0.15);
          border: 1px solid rgba(255, 207, 122, 0.3);
          color: #ffcf7a;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 0.8rem;
          font-weight: 600;
          letter-spacing: 0.02em;
        }
        .favorite-btn {
          background: transparent;
          border: 1px solid rgba(255, 107, 107, 0.3);
          padding: 7px 10px;
          border-radius: 6px;
          color: #8b9bb4;
          font-size: 1rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          transition: all 0.2s ease;
        }
        .favorite-btn:hover {
          color: #ff6b6b;
          border-color: rgba(255, 107, 107, 0.5);
          background: rgba(255, 107, 107, 0.1);
        }
        .favorite-btn.favorited {
          color: #ff6b6b;
          border-color: rgba(255, 107, 107, 0.5);
        }
        .copy-btn {
          background: rgba(140, 151, 247, 0.1);
          border: 1px solid rgba(140, 151, 247, 0.25);
          padding: 7px 12px;
          border-radius: 6px;
          color: #8c97f7;
          font-weight: 500;
          font-size: 0.85rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: all 0.3s ease;
        }
        .copy-btn:hover {
          background: rgba(140, 151, 247, 0.18);
          border-color: rgba(140, 151, 247, 0.4);
        }
        .copy-btn.success {
          background: rgba(6, 214, 160, 0.15);
          border-color: rgba(6, 214, 160, 0.4);
          color: #06d6a0;
          animation: successPulse 0.4s ease;
        }
        @keyframes successPulse {
          0% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
          100% {
            transform: scale(1);
          }
        }
        .export-btn {
          background: rgba(255, 207, 122, 0.1);
          border: 1px solid rgba(255, 207, 122, 0.25);
          padding: 7px 12px;
          border-radius: 6px;
          color: #ffcf7a;
          font-weight: 500;
          font-size: 0.85rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: background 0.2s ease;
        }
        .export-btn:hover {
          background: rgba(255, 207, 122, 0.18);
        }
        .calendar-btn {
          background: rgba(52, 168, 83, 0.1);
          border: 1px solid rgba(52, 168, 83, 0.25);
          padding: 7px 12px;
          border-radius: 6px;
          color: #66bb6a;
          font-weight: 500;
          font-size: 0.85rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: background 0.2s ease;
        }
        .calendar-btn:hover {
          background: rgba(52, 168, 83, 0.18);
          border-color: rgba(52, 168, 83, 0.4);
        }
        .calendar-btn.success {
          background: rgba(6, 214, 160, 0.15);
          border-color: rgba(6, 214, 160, 0.4);
          color: #06d6a0;
          animation: successPulse 0.4s ease;
        }

        /* Name input modal */
        .name-input-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
          border-radius: 12px;
        }
        .name-input-modal {
          background: rgba(24, 26, 54, 0.98);
          border: 1px solid rgba(140, 151, 247, 0.3);
          border-radius: 12px;
          padding: 20px;
          width: 90%;
          max-width: 320px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
        }
        .name-input-modal h4 {
          margin: 0 0 12px 0;
          color: #fff;
          font-size: 1rem;
          font-weight: 600;
        }
        .name-input-modal input {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid rgba(140, 151, 247, 0.3);
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.05);
          color: #fff;
          font-size: 0.95rem;
          outline: none;
          box-sizing: border-box;
        }
        .name-input-modal input:focus {
          border-color: #ffcf7a;
        }
        .name-input-actions {
          display: flex;
          gap: 8px;
          margin-top: 16px;
          justify-content: flex-end;
        }
        .cancel-btn {
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: #aaa;
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.9rem;
          transition: all 0.2s;
        }
        .cancel-btn:hover {
          border-color: rgba(255, 255, 255, 0.4);
          color: #fff;
        }
        .save-btn {
          background: #ffcf7a;
          border: none;
          color: #11132f;
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.9rem;
          font-weight: 600;
          transition: all 0.2s;
        }
        .save-btn:hover {
          background: #ffd98a;
        }

        /* Watermark */
        .schedule-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 8px 6px 8px;
          gap: 16px;
          flex-wrap: wrap;
        }
        @media (max-width: 768px) {
          .schedule-footer {
            justify-content: center;
            text-align: center;
          }
        }
        .schedule-total-credits {
          color: #8c97f7;
          font-size: 13px;
          font-weight: 600;
          background: rgba(140, 151, 247, 0.12);
          padding: 6px 12px;
          border-radius: 12px;
          border: 1px solid rgba(140, 151, 247, 0.25);
          letter-spacing: 0.02em;
        }
        .schedule-total-credits strong {
          color: #ffcf7a;
          font-size: 14px;
        }
        .watermark {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          color: rgba(255, 255, 255, 0.7);
          font-size: 12px;
          font-weight: 600;
        }
        .watermark-logo {
          height: 20px;
          width: auto;
          opacity: 0.85;
        }

        /* Mobile Schedule - Stacked days */
        .mobile-schedule {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .mobile-day {
          display: flex;
          gap: 12px;
          align-items: flex-start;
        }
        .mobile-day-header {
          width: 40px;
          flex-shrink: 0;
          font-size: 0.75rem;
          font-weight: 600;
          color: #8b9bb4;
          text-transform: uppercase;
          padding-top: 8px;
        }
        .mobile-day-classes {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .no-classes {
          color: #4a5568;
          font-size: 0.85rem;
          padding: 8px 0;
        }
        .mobile-class-card {
          padding: 10px 12px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
        .mobile-class-name {
          font-size: 0.9rem;
          font-weight: 700;
          margin-bottom: 2px;
        }
        .mobile-class-details {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          font-size: 0.75rem;
          opacity: 0.85;
          align-items: center;
        }
        .mobile-class-details span {
          white-space: nowrap;
        }

        /* Desktop Schedule */
        .desktop-schedule {
          display: none;
          background: #1a1b23;
          padding: 12px;
          border-radius: 8px;
          overflow-x: auto;
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
        .schedule-wrapper {
          display: flex;
          min-width: 700px;
        }
        .time-column {
          width: 65px;
          flex-shrink: 0;
          border-right: 1px solid rgba(255, 255, 255, 0.08);
        }
        .day-column {
          flex: 1;
          min-width: 0;
        }
        .grid-header-cell {
          text-align: center;
          font-weight: 600;
          color: #8b9bb4;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          padding: 8px;
          font-size: 0.8rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .time-slot {
          height: ${hourHeight}px;
          display: flex;
          align-items: flex-start;
          padding-right: 8px;
          border-top: 1px solid rgba(255, 255, 255, 0.04);
        }
        .time-label {
          color: #64748b;
          font-size: 9px;
          font-weight: 500;
          transform: translateY(-6px);
        }
        .day-content {
          position: relative;
          height: calc(${hourHeight}px * ${endHour - startHour});
        }
        .grid-cell {
          height: ${hourHeight}px;
          border-top: 1px solid rgba(255, 255, 255, 0.04);
          border-left: 1px solid rgba(255, 255, 255, 0.04);
        }
        .course-block {
          position: absolute;
          left: 2px;
          right: 2px;
          padding: 5px;
          border-radius: 4px;
          font-size: 9px;
          overflow: hidden;
          box-sizing: border-box;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
          z-index: 10;
          border: 1px solid rgba(255, 255, 255, 0.1);
          transition: transform 0.15s ease;
          cursor: pointer;
        }
        .course-block:hover {
          transform: scale(1.02);
          z-index: 20;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.25);
        }
        .course-block-content {
          display: flex;
          flex-direction: column;
          gap: 1px;
          height: 100%;
        }
        .course-block-content strong {
          font-size: 10px;
          font-weight: 700;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
        }
        .course-block-content span {
          font-weight: 400;
          opacity: 0.85;
          font-size: 8px;
        }
        .room-text {
          font-weight: 600 !important;
          opacity: 1 !important;
          margin-top: 1px;
        }

        @media (min-width: 768px) {
          .schedule-card {
            padding: 20px;
          }
          .schedule-header h3 {
            font-size: 1.1rem;
          }
          .mobile-schedule {
            display: none;
          }
          .desktop-schedule {
            display: block;
          }
          .export-text {
            display: inline;
          }
          .copy-text {
            display: inline;
          }
          .watermark {
            font-size: 13px;
            padding: 14px 8px 8px 8px;
            justify-content: center;
          }
          .watermark-logo {
            height: 22px;
          }
        }

        @media (max-width: 767px) {
          .export-text {
            display: none;
          }
          .copy-text {
            display: none;
          }
          .export-btn {
            padding: 8px 10px;
          }
          .copy-btn {
            padding: 8px 10px;
          }
          .calendar-btn {
            padding: 8px 10px;
          }
        }

        @media (min-width: 1024px) {
          .schedule-wrapper {
            min-width: 800px;
          }
          .time-column {
            width: 70px;
          }
          .grid-header-cell {
            font-size: 0.85rem;
          }
          .time-label {
            font-size: 10px;
          }
          .course-block {
            padding: 6px;
            font-size: 10px;
          }
          .course-block-content strong {
            font-size: 11px;
          }
          .course-block-content span {
            font-size: 9px;
          }
        }
      `}</style>
    </div>
  );
};

export default ScheduleView;