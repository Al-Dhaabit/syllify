// Helper to parse time string "3:00 PM" to minutes from midnight
// Also handles Google Sheets Date format like "Date(1899,11,30,13,5,0)"
function parseTime(timeStr) {
    if (!timeStr) return null;

    const str = timeStr.toString().trim();
    if (!str) return null;

    // Case 1: Standard format "3:00 PM" or "10:00 AM"
    const match = str.match(/(\d{1,2}):(\d{2})\s?(AM|PM)/i);
    if (match) {
        let [, hoursStr, minutesStr, ampm] = match;
        let hours = parseInt(hoursStr, 10);
        let minutes = parseInt(minutesStr, 10);
        ampm = ampm.toUpperCase();

        if (ampm === 'PM' && hours !== 12) hours += 12;
        if (ampm === 'AM' && hours === 12) hours = 0;

        return hours * 60 + minutes;
    }

    // Case 2: Google Sheets Date format "Date(1899,11,30,13,5,0)"
    const dateMatch = str.match(/Date\(\d+,\d+,\d+,\s*(\d+),\s*(\d+)/);
    if (dateMatch) {
        const hours = parseInt(dateMatch[1], 10);
        const minutes = parseInt(dateMatch[2], 10);
        return hours * 60 + minutes;
    }

    // Case 3: Decimal (fraction of day) - Google Sheets stores times as 0-1 fraction
    const numVal = parseFloat(str);
    if (!isNaN(numVal) && numVal >= 0 && numVal <= 1) {
        const totalMinutes = Math.round(numVal * 24 * 60);
        return totalMinutes;
    }

    return null;
}

// Helper to parse days string "MW", "TR", "F" to array of integers
function parseDays(daysStr) {
    if (!daysStr) return [];
    const days = [];
    const map = { M: 1, T: 2, W: 3, R: 4, F: 5, S: 6, U: 0 };

    for (let char of daysStr.toUpperCase()) {
        if (map[char] !== undefined) {
            days.push(map[char]);
        }
    }
    return days;
}

function checkConflict(sectionA, sectionB) {
    if (
        !sectionA.days ||
        !sectionA.timestart ||
        !sectionA.timeend ||
        !sectionB.days ||
        !sectionB.timestart ||
        !sectionB.timeend
    ) {
        return false;
    }

    const daysA = parseDays(sectionA.days);
    const daysB = parseDays(sectionB.days);

    const commonDays = daysA.filter((d) => daysB.includes(d));
    if (commonDays.length === 0) return false;

    const startA = parseTime(sectionA.timestart);
    const endA = parseTime(sectionA.timeend);
    const startB = parseTime(sectionB.timestart);
    const endB = parseTime(sectionB.timeend);

    if (startA === null || endA === null || startB === null || endB === null)
        return false;

    return startA < endB && endA > startB;
}

function checkBundleConflict(bundle, schedule) {
    for (const section of bundle) {
        for (const existing of schedule) {
            if (checkConflict(section, existing)) {
                return true;
            }
        }
    }
    return false;
}



function getBundleLatestTime(bundle) {
    let maxTime = 0;
    for (const section of bundle) {
        const endTime = parseTime(section.timeend);
        if (endTime && endTime > maxTime) {
            maxTime = endTime;
        }
    }
    return maxTime;
}

function getBundleEarliestTime(bundle) {
    let minTime = Infinity;
    for (const section of bundle) {
        const startTime = parseTime(section.timestart);
        if (startTime && startTime < minTime) {
            minTime = startTime;
        }
    }
    return minTime === Infinity ? 0 : minTime;
}

export function getInstructor(row) {
    return (row.instructor || row.prof || row.professor || row.teacher || '')
        .toString()
        .trim();
}

function bundleHasPreferredProfessor(bundle, preferredProfessors) {
    if (!preferredProfessors || preferredProfessors.length === 0) {
        return true;
    }

    for (const section of bundle) {
        const instructor = getInstructor(section).toLowerCase();
        for (const preferred of preferredProfessors) {
            const preferredLower = preferred.toLowerCase().trim();
            if (
                instructor.includes(preferredLower) ||
                preferredLower.includes(instructor)
            ) {
                return true;
            }
        }
    }
    return false;
}

function getCourseCode(row) {
    const subject = (
        row.subject ||
        row.subj ||
        row.course ||
        row.dept ||
        ''
    ).toUpperCase();
    const cat = (row.cat || row.catalog || row.number || row.num || '')
        .toString()
        .toUpperCase();
    return (subject + cat).replace(/[^A-Z0-9]/g, '');
}

function getSectionNum(row) {
    return (row.section || row.sec || row.sect || '').toString().toUpperCase();
}

function isLabSection(row) {
    const sectionNum = getSectionNum(row);

    // Primary: Section number is the definitive signal
    // If section contains 'L' (e.g. "60L1"), it's a lab
    if (sectionNum.includes('L')) return true;
    // If section is purely numeric (e.g. "600"), it's NOT a lab
    if (/^\d+$/.test(sectionNum)) return false;

    // Fallback: Only check the title when section number is empty/ambiguous
    const title = (
        row.title ||
        row.coursetitle ||
        row.name ||
        row.coursename ||
        row.classtitle ||
        row.description ||
        ''
    ).toString().toUpperCase();
    return title.includes('LAB');
}

// Check if a section has valid/confirmed time data (not TBD, empty, or invalid)
export function hasValidTimeData(row) {
    const days = (row.days || '').toString().trim().toUpperCase();
    const timeStart = (row.timestart || '').toString().trim().toUpperCase();
    const timeEnd = (row.timeend || '').toString().trim().toUpperCase();

    // Check if any are empty or TBD
    if (!days || !timeStart || !timeEnd) return false;
    if (days === 'TBD' || timeStart === 'TBD' || timeEnd === 'TBD') return false;
    if (days === 'TBA' || timeStart === 'TBA' || timeEnd === 'TBA') return false;

    // Check if times can actually be parsed
    const parsedStart = parseTime(timeStart);
    const parsedEnd = parseTime(timeEnd);
    if (parsedStart === null || parsedEnd === null) return false;

    // Check if days contain valid day letters
    const parsedDays = parseDays(days);
    if (parsedDays.length === 0) return false;

    return true;
}


// Helper to get the Class # from a row
function getClassNum(row) {
    return (row.class || row.classNumber || row.classNum || row.id || '').toString().trim();
}

function createCourseBundles(sections) {
    // PRE-PROCESSING: Group sections by Class # (if available)
    const groupedSections = [];
    const classNumMap = new Map();

    // First pass: Group by Class #
    sections.forEach((section, idx) => {
        const classNum = getClassNum(section);

        if (classNum) {
            if (!classNumMap.has(classNum)) {
                // New group
                const group = {
                    sections: [section],
                    originalIndex: idx, // Use first occurrence index
                    isLab: isLabSection(section),
                    classNum: classNum
                };
                classNumMap.set(classNum, group);
                groupedSections.push(group);
            } else {
                // Add to existing group
                const group = classNumMap.get(classNum);
                group.sections.push(section);
                // If any part is a lab, treat the whole group as a lab (mostly relevant for hybrid cases)
                if (isLabSection(section)) {
                    group.isLab = true;
                }
            }
        } else {
            // No Class # - treat as individual section
            groupedSections.push({
                sections: [section],
                originalIndex: idx,
                isLab: isLabSection(section),
                classNum: null
            });
        }
    });

    const lectures = [];
    const labs = [];
    const usedLabIndices = new Set(); // Track which labs have been matched

    // Second pass: Categorize groups into lectures and labs
    groupedSections.forEach((group, idx) => {
        if (group.isLab) {
            labs.push({ ...group, groupIndex: idx });
        } else {
            lectures.push({ ...group, groupIndex: idx });
        }
    });

    // Case: No labs found - each lecture group is a valid option
    // Note: A "lecture group" might contain multiple rows (e.g., MW and F)
    if (labs.length === 0) {
        return lectures.map((lec) => lec.sections);
    }

    // Case: No lectures found - each lab group is a valid option
    if (lectures.length === 0) {
        return labs.map((lab) => lab.sections);
    }

    const bundles = [];

    for (const lectureObj of lectures) {
        // We use the first section in the group for matching logic
        const lectureMain = lectureObj.sections[0];
        const lecSection = getSectionNum(lectureMain);
        const lecDigits = lecSection.replace(/[^0-9]/g, '');

        // If no digits in section number, just output the lecture group as is
        if (lecDigits.length === 0) {
            bundles.push(lectureObj.sections);
            continue;
        }

        // Strategy 1: Pattern matching (lecture "600" matches lab "60L1")
        // Formula: lab prefix = lecture digits except last
        //          lab number = lecture's last digit + 1
        const lecPrefix = lecDigits.slice(0, -1); // "60" from "600"
        const lecLastDigit = parseInt(lecDigits.slice(-1), 10); // 0 from "600"
        const expectedLabNum = lecLastDigit + 1; // 1

        let matchingLabGroup = null;
        let matchingLabIdx = -1;

        // Try pattern match first (60L1 for 600)
        for (let i = 0; i < labs.length; i++) {
            if (usedLabIndices.has(i)) continue;

            const labGroup = labs[i];
            // Use first section of lab group for matching
            const labMain = labGroup.sections[0];
            const labSection = getSectionNum(labMain);

            // Match format: digits + L + digits (e.g., "60L1")
            const labMatch = labSection.match(/^(\d*)L(\d+)$/i);
            if (!labMatch) continue;

            const labPrefix = labMatch[1]; // "60" from "60L1"
            const labNum = parseInt(labMatch[2], 10); // 1 from "60L1"

            if (labPrefix === lecPrefix && labNum === expectedLabNum) {
                matchingLabGroup = labGroup;
                matchingLabIdx = i;
                break;
            }
        }

        // Strategy 2: If no pattern match, check for same-section-number lab
        // that appears immediately after this lecture in the original spreadsheet order
        // Note: We check the original index of the *groups*
        if (!matchingLabGroup) {
            for (let i = 0; i < labs.length; i++) {
                if (usedLabIndices.has(i)) continue;

                const labGroup = labs[i];
                const labMain = labGroup.sections[0];
                const labSection = getSectionNum(labMain);

                // Check if lab has same section number AND is the row right after lecture
                // We compare original indices from the pre-processing step
                // Ideally, the lab group's original index should be > lecture group's original index
                // but reasonably close. For simplicity, we stick to the sequential assumption or same section assumption.

                // Relaxed sequential check: just check same section number for now as primary fallback
                if (labSection === lecSection) {
                    matchingLabGroup = labGroup;
                    matchingLabIdx = i;
                    break;
                }
            }
        }

        if (matchingLabGroup) {
            // Bundle = All lecture rows + All lab rows
            bundles.push([...lectureObj.sections, ...matchingLabGroup.sections]);
            usedLabIndices.add(matchingLabIdx);
        } else {
            // No matching lab found - include lecture group alone
            bundles.push(lectureObj.sections);
        }
    }

    // Add any unmatched labs as standalone bundles
    labs.forEach((labGroup, i) => {
        if (!usedLabIndices.has(i)) {
            bundles.push(labGroup.sections);
        }
    });

    if (bundles.length === 0) {
        // Fallback: return original sections as individual bundles if all else fails
        return sections.map((s) => [s]);
    }

    return bundles;
}


function getLatestClassTime(schedule) {
    let maxTime = 0;
    for (const section of schedule) {
        const endTime = parseTime(section.timeend);
        if (endTime && endTime > maxTime) {
            maxTime = endTime;
        }
    }
    return maxTime;
}

function getEarliestClassTime(schedule) {
    let minTime = Infinity;
    for (const section of schedule) {
        const startTime = parseTime(section.timestart);
        if (startTime && startTime < minTime) {
            minTime = startTime;
        }
    }
    return minTime === Infinity ? 0 : minTime;
}

function getTotalGapTime(schedule) {
    const dayMap = {};
    for (const section of schedule) {
        const days = parseDays(section.days || '');
        const start = parseTime(section.timestart);
        const end = parseTime(section.timeend);
        if (start === null || end === null) continue;

        for (const day of days) {
            if (!dayMap[day]) dayMap[day] = [];
            dayMap[day].push({ start, end });
        }
    }

    let totalGap = 0;
    for (const day of Object.keys(dayMap)) {
        const classes = dayMap[day].sort((a, b) => a.start - b.start);
        for (let i = 1; i < classes.length; i++) {
            const gap = classes[i].start - classes[i - 1].end;
            if (gap > 0) totalGap += gap;
        }
    }

    return totalGap;
}

// Calculate how balanced classes are across days (lower = more balanced)
function getDayBalanceScore(schedule) {
    const dayCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }; // M-F

    for (const section of schedule) {
        const days = parseDays(section.days || '');
        for (const day of days) {
            if (day >= 1 && day <= 5) {
                dayCounts[day]++;
            }
        }
    }

    const counts = Object.values(dayCounts).filter((c) => c > 0);
    if (counts.length === 0) return 0;

    const max = Math.max(...counts);
    const min = Math.min(...counts);
    const spread = max - min;

    // Also calculate variance for finer granularity
    const avg = counts.reduce((a, b) => a + b, 0) / counts.length;
    const variance =
        counts.reduce((sum, c) => sum + Math.pow(c - avg, 2), 0) / counts.length;

    return spread * 100 + variance * 50;
}

// Exported scoring function for re-sorting schedules when preferences change
export function scoreSchedule(schedule, preferences = {}) {
    let score = 0;

    const latestTime = getLatestClassTime(schedule);
    const earliestTime = getEarliestClassTime(schedule);
    const totalGap = getTotalGapTime(schedule);
    const dayImbalance = getDayBalanceScore(schedule);

    // 1. PRIMARY: Earliest End Time
    const maxPossibleEnd = 1320;
    const endScore = Math.pow(maxPossibleEnd - latestTime, 2) / 100;
    score += endScore;

    // 2. SECONDARY: Prefer later start times
    if (earliestTime >= 540) {
        score += 500;
    } else if (earliestTime >= 480) {
        score += 200;
    }
    score += Math.min(earliestTime - 420, 180);

    // 3. TERTIARY: Compact schedule (less gaps)
    score -= totalGap / 6;

    // 4. Day Balance: Penalize uneven distribution
    score -= dayImbalance;

    // 5. Preferences: End By Time
    if (preferences.endBy) {
        const timeStr = preferences.endBy.toLowerCase();
        const hour = timeStr.replace(/[ap]m/, '');
        const ampm = timeStr.includes('pm') ? 'PM' : 'AM';
        const formattedTime = `${hour}:00 ${ampm}`;
        const endByTime = parseTime(formattedTime);

        if (endByTime) {
            if (latestTime <= endByTime) {
                score += 1000000;
            } else {
                const overtime = latestTime - endByTime;
                score -= overtime * 5;
            }
        }
    }

    // 6. Preferences: No Fridays
    if (preferences.noFridays) {
        let fridayCount = 0;
        for (const section of schedule) {
            const days = parseDays(section.days || '');
            if (days.includes(5)) fridayCount++;
        }

        if (fridayCount === 0) {
            score += 1000000;
        } else {
            score -= fridayCount * 500;
        }
    }

    // 7. Preferences: No 9am Classes
    if (preferences.no9am) {
        let nineAmCount = 0;
        const nineAmStart = 540;
        const nineAmEnd = 600;

        for (const section of schedule) {
            const start = parseTime(section.timestart);
            const end = parseTime(section.timeend);

            if (start !== null && end !== null) {
                if (start < nineAmEnd && end > nineAmStart) {
                    nineAmCount++;
                }
            }
        }

        if (nineAmCount === 0) {
            score += 1000000;
        } else {
            score -= nineAmCount * 500;
        }
    }

    // 8. Preferred Professors
    const preferredProfessors = preferences.preferredProfessors || [];
    if (preferredProfessors.length > 0) {
        for (const section of schedule) {
            const instructor = getInstructor(section).toLowerCase();
            for (const preferred of preferredProfessors) {
                const preferredLower = preferred.toLowerCase().trim();
                if (
                    instructor.includes(preferredLower) ||
                    preferredLower.includes(instructor)
                ) {
                    score += 50000;
                    break;
                }
            }
        }
    }

    return score;
}

export function generateSchedules(
    selectedCourseCodes,
    sheetData,
    preferences = {}
) {
    const courseSections = {};
    const tbdSections = {}; // Track sections with TBD times per course

    // Separate course codes into base codes and target sections
    const parsedTargets = selectedCourseCodes.map((c) => {
        const parts = c.split('.');
        const baseCode = parts[0].toUpperCase().replace(/[^A-Z0-9]/g, '');
        const targetSection = parts[1] ? parts[1].toUpperCase().trim() : null;
        return { original: c, baseCode, targetSection };
    });

    const targetBaseCodes = parsedTargets.map(t => t.baseCode);

    sheetData.forEach((row) => {
        const fullCode = getCourseCode(row);

        if (targetBaseCodes.includes(fullCode)) {
            // Check if this section matches a specific target section for this course
            const target = parsedTargets.find(t => t.baseCode === fullCode);
            const sectionNum = getSectionNum(row);

            // If a specific section was requested and this isn't it, skip it
            if (target.targetSection && sectionNum !== target.targetSection) {
                // However, we MUST NOT skip it if it's the matching lab for a specific lecture!
                // But wait, it's simpler to filter the final bundles instead.
                // If I keep ALL sections here, createCourseBundles will make all possible combinations.
                // Then I just filter out bundles that don't contain the specific section requested.
            }

            // Check if this section has valid time data
            if (hasValidTimeData(row)) {
                if (!courseSections[fullCode]) {
                    courseSections[fullCode] = [];
                }
                courseSections[fullCode].push(row);
            } else {
                // Track TBD sections
                if (!tbdSections[fullCode]) {
                    tbdSections[fullCode] = [];
                }
                tbdSections[fullCode].push(getSectionNum(row));
            }
        }
    });

    const foundCodes = Object.keys(courseSections);
    const tbdOnlyCodes = targetBaseCodes.filter((t) => !foundCodes.includes(t) && tbdSections[t]);
    const missingCodes = targetBaseCodes.filter((t) => !foundCodes.includes(t) && !tbdSections[t]);

    // If a course ONLY has TBD sections, report it specially
    if (tbdOnlyCodes.length > 0) {
        return {
            error: `All sections for ${tbdOnlyCodes.join(', ')} have unconfirmed times (TBD). Please try again later.`,
            schedules: [],
            tbdCourses: tbdOnlyCodes,
        };
    }

    if (missingCodes.length > 0) {
        return {
            error: `No sections found for: ${missingCodes.join(', ')}`,
            schedules: [],
        };
    }

    const courseBundles = {};
    for (const courseCode of Object.keys(courseSections)) {
        let bundles = createCourseBundles(courseSections[courseCode]);

        // Filter bundles if a target section was specified for this course
        const target = parsedTargets.find(t => t.baseCode === courseCode);
        if (target && target.targetSection) {
            bundles = bundles.filter(bundle => 
                bundle.some(section => getSectionNum(section) === target.targetSection)
            );
        }

        bundles.sort((a, b) => {
            const endA = getBundleLatestTime(a);
            const endB = getBundleLatestTime(b);
            if (endA !== endB) return endA - endB;
            const startA = getBundleEarliestTime(a);
            const startB = getBundleEarliestTime(b);
            return startB - startA;
        });

        courseBundles[courseCode] = bundles;
    }

    let bestSchedules = [];
    let maxCourses = 0;

    const courseKeys = Object.keys(courseBundles);
    const preferredProfessors = preferences.preferredProfessors || [];

    // Convert preference format (e.g., '1pm') to parseTime format (e.g., '1:00 PM')
    let endByTime = null;
    if (preferences.endBy) {
        const timeStr = preferences.endBy.toLowerCase();
        const hour = timeStr.replace(/[ap]m/, '');
        const ampm = timeStr.includes('pm') ? 'PM' : 'AM';
        const formattedTime = `${hour}:00 ${ampm}`;
        endByTime = parseTime(formattedTime);
    }

    function scoreSchedule(schedule) {
        let score = 0;

        const latestTime = getLatestClassTime(schedule);
        const earliestTime = getEarliestClassTime(schedule);
        const totalGap = getTotalGapTime(schedule);
        const dayImbalance = getDayBalanceScore(schedule);

        // 1. PRIMARY: Earliest End Time
        const maxPossibleEnd = 1320;
        const endScore = Math.pow(maxPossibleEnd - latestTime, 2) / 100;
        score += endScore;

        // 2. SECONDARY: Prefer later start times
        if (earliestTime >= 540) {
            score += 500;
        } else if (earliestTime >= 480) {
            score += 200;
        }
        score += Math.min(earliestTime - 420, 180);

        // 3. TERTIARY: Compact schedule (less gaps)
        score -= totalGap / 6;

        // 4. Day Balance: Penalize uneven distribution
        score -= dayImbalance;

        // 5. Preferences: End By Time
        if (endByTime) {
            if (latestTime <= endByTime) {
                score += 1000000;
            } else {
                const overtime = latestTime - endByTime;
                score -= overtime * 5;
            }
        }

        // 6. Preferences: No Fridays
        if (preferences.noFridays) {
            let fridayCount = 0;
            for (const section of schedule) {
                const days = parseDays(section.days || '');
                if (days.includes(5)) fridayCount++;
            }

            if (fridayCount === 0) {
                score += 1000000;
            } else {
                score -= fridayCount * 500;
            }
        }

        // 7. Preferences: No 9am Classes
        if (preferences.no9am) {
            let nineAmCount = 0;
            const nineAmStart = 540; // 9:00 AM
            const nineAmEnd = 600;   // 10:00 AM

            for (const section of schedule) {
                const start = parseTime(section.timestart);
                const end = parseTime(section.timeend);

                if (start !== null && end !== null) {
                    // Check if class overlaps with 9:00 AM - 10:00 AM
                    if (start < nineAmEnd && end > nineAmStart) {
                        nineAmCount++;
                    }
                }
            }

            if (nineAmCount === 0) {
                score += 1000000;
            } else {
                score -= nineAmCount * 500;
            }
        }

        // 8. Preferred Professors
        if (preferredProfessors.length > 0) {
            for (const section of schedule) {
                const instructor = getInstructor(section).toLowerCase();
                for (const preferred of preferredProfessors) {
                    const preferredLower = preferred.toLowerCase().trim();
                    if (
                        instructor.includes(preferredLower) ||
                        preferredLower.includes(instructor)
                    ) {
                        score += 50000;
                        break;
                    }
                }
            }
        }

        return score;
    }

    function backtrack(courseIndex, currentSchedule, coursesIncluded) {
        if (coursesIncluded + (courseKeys.length - courseIndex) < maxCourses) {
            return;
        }

        if (courseIndex === courseKeys.length) {
            if (coursesIncluded > maxCourses) {
                maxCourses = coursesIncluded;
                bestSchedules = [[...currentSchedule]];
            } else if (coursesIncluded === maxCourses && coursesIncluded > 0) {
                bestSchedules.push([...currentSchedule]);
            }
            return;
        }

        const courseCode = courseKeys[courseIndex];
        let bundles = [...courseBundles[courseCode]];

        if (preferredProfessors.length > 0) {
            const preferredBundles = bundles.filter((b) =>
                bundleHasPreferredProfessor(b, preferredProfessors)
            );
            const otherBundles = bundles.filter(
                (b) => !bundleHasPreferredProfessor(b, preferredProfessors)
            );
            bundles = [...preferredBundles, ...otherBundles];
        }

        for (const bundle of bundles) {
            if (!checkBundleConflict(bundle, currentSchedule)) {
                currentSchedule.push(...bundle);
                backtrack(courseIndex + 1, currentSchedule, coursesIncluded + 1);
                currentSchedule.splice(currentSchedule.length - bundle.length);
            }
        }

        backtrack(courseIndex + 1, currentSchedule, coursesIncluded);
    }

    backtrack(0, [], 0);

    // Sort all schedules by score (best first)
    bestSchedules.sort((a, b) => scoreSchedule(b) - scoreSchedule(a));

    // Filter to keep only schedules with max courses
    if (bestSchedules.length > 0) {
        const countCourses = (schedule) => {
            const codes = new Set(schedule.map(getCourseCode));
            return codes.size;
        };

        const realMax = countCourses(bestSchedules[0]);
        bestSchedules = bestSchedules.filter((s) => countCourses(s) === realMax);
    }

    if (bestSchedules.length === 0) {
        return {
            error: 'Conflict detected! No valid schedule exists.',
            schedules: [],
        };
    }

    const isPartial = maxCourses < courseKeys.length;

    // Collect info about courses that had some TBD sections
    const coursesWithTbdSections = Object.keys(tbdSections).filter(code => foundCodes.includes(code));

    return {
        schedules: bestSchedules, // Return ALL schedules
        isPartial: isPartial,
        coursesFound: maxCourses,
        totalCourses: courseKeys.length,
        error: null,
        tbdSections: coursesWithTbdSections.length > 0 ? tbdSections : null, // Info about which courses had some TBD sections
    };
}

export function refreshSchedule(schedule, sheetData) {
    let changesDetected = false;
    const changedIndices = [];
    const changeDetails = []; // Detailed change information

    // Track which sheetData rows have been matched to avoid double-matching
    // split-timing courses (multiple rows with same course code + section number)
    const usedSheetIndices = new Set();

    const updatedSchedule = schedule.map((oldSection, index) => {
        const oldCode = getCourseCode(oldSection);
        const oldSecNum = getSectionNum(oldSection);
        const oldDays = (oldSection.days || '').toString().trim().toUpperCase();
        const oldClassNum = getClassNum(oldSection);

        // Find matching row in new sheetData, handling split-timing courses
        // by preferring a row with matching days/Class # and not already used
        let bestMatchIdx = -1;
        let fallbackIdx = -1;

        for (let i = 0; i < sheetData.length; i++) {
            if (usedSheetIndices.has(i)) continue;

            const row = sheetData[i];
            if (getCourseCode(row) !== oldCode || getSectionNum(row) !== oldSecNum) continue;

            const rowDays = (row.days || '').toString().trim().toUpperCase();
            const rowClassNum = getClassNum(row);

            // Exact match on days or Class # — this is the right split-timing row
            if (oldDays && rowDays && oldDays === rowDays) {
                bestMatchIdx = i;
                break;
            }
            if (oldClassNum && rowClassNum && oldClassNum === rowClassNum) {
                // Class # match but days differ — still a candidate (days might have changed)
                if (bestMatchIdx === -1) bestMatchIdx = i;
            }
            // Keep track of the first code+section match as a fallback
            if (fallbackIdx === -1) fallbackIdx = i;
        }

        const matchIdx = bestMatchIdx !== -1 ? bestMatchIdx : fallbackIdx;
        const newSection = matchIdx !== -1 ? sheetData[matchIdx] : null;

        if (newSection) {
            usedSheetIndices.add(matchIdx);

            // Check for changes in critical fields
            const criticalFields = ['days', 'timestart', 'timeend', 'instructor', 'room', 'Room #', 'title'];
            const fieldChanges = {};
            let hasChanged = false;

            criticalFields.forEach(field => {
                const oldVal = (oldSection[field] || '').toString().trim();
                const newVal = (newSection[field] || '').toString().trim();
                if (oldVal !== newVal) {
                    hasChanged = true;
                    fieldChanges[field] = { old: oldVal, new: newVal };
                }
            });

            if (hasChanged) {
                changesDetected = true;
                changedIndices.push(index);
                changeDetails.push({
                    courseCode: oldCode,
                    section: oldSecNum,
                    changes: fieldChanges,
                    type: 'modified'
                });
                return newSection;
            }
            return oldSection;
        } else {
            // Section no longer exists - remove it
            changesDetected = true;
            changedIndices.push(index);
            changeDetails.push({
                courseCode: oldCode,
                section: oldSecNum,
                type: 'removed'
            });
            return null;
        }
    }).filter(Boolean);

    // Check for conflicts in the updated schedule
    // Skip conflict check between sections that belong to the same bundle
    // (same course code + section number = split-timing rows of the same class)
    let hasConflicts = false;
    for (let i = 0; i < updatedSchedule.length; i++) {
        for (let j = i + 1; j < updatedSchedule.length; j++) {
            // Skip pairs from the same split-timing course
            const codeI = getCourseCode(updatedSchedule[i]);
            const secI = getSectionNum(updatedSchedule[i]);
            const codeJ = getCourseCode(updatedSchedule[j]);
            const secJ = getSectionNum(updatedSchedule[j]);
            if (codeI === codeJ && secI === secJ) continue;

            if (checkConflict(updatedSchedule[i], updatedSchedule[j])) {
                hasConflicts = true;
                break;
            }
        }
        if (hasConflicts) break;
    }

    return { updatedSchedule, changesDetected, changedIndices, changeDetails, hasConflicts };
}

export function getScheduleHash(schedule) {
    return JSON.stringify(
        schedule.map((s) => ({
            code: (s.subject || s.subj || '') + (s.cat || s.number || ''),
            section: s.section || s.sec || s.sect || '',
            days: s.days,
            timestart: s.timestart,
            timeend: s.timeend,
        }))
    );
}

export function checkPreferences(schedule, preferences) {
    const result = {};

    // Check No Fridays
    if (preferences.noFridays) {
        const hasFriday = schedule.some(section => {
            const days = parseDays(section.days || '');
            return days.includes(5);
        });
        result.noFridays = !hasFriday;
    }

    // Check No 9am
    if (preferences.no9am) {
        const nineAmStart = 540;
        const nineAmEnd = 600;
        const has9am = schedule.some(section => {
            const start = parseTime(section.timestart);
            const end = parseTime(section.timeend);
            if (start === null || end === null) return false;
            return start < nineAmEnd && end > nineAmStart;
        });
        result.no9am = !has9am;
    }

    // Check End By
    if (preferences.endBy) {
        // Convert preference format (e.g., '1pm') to parseTime format (e.g., '1:00 PM')
        const timeStr = preferences.endBy.toLowerCase();
        const hour = timeStr.replace(/[ap]m/, '');
        const ampm = timeStr.includes('pm') ? 'PM' : 'AM';
        const formattedTime = `${hour}:00 ${ampm}`;

        const endByTime = parseTime(formattedTime);

        if (endByTime) {
            const latestTime = getLatestClassTime(schedule);
            result.endBy = latestTime <= endByTime;
        }
    }

    return result;
}