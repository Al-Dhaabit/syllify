import React, { useState, useEffect, useRef, useCallback } from "react";
import "./App.css";
import { stemmer } from "porter-stemmer";
import {
  FaEnvelope,
  FaLinkedin,
  FaLightbulb,
  FaCoffee,
  FaClock,
  FaChevronDown,
  // FaArrowUp, // commented out: no longer used
  FaArrowLeft,
  FaArrowRight,
  FaCalendarAlt,
  FaSearch,
} from "react-icons/fa";
import Papa from "papaparse";
import ScheduleInterface from "./components/ScheduleInterface";
import { levenshtein } from "./utils/stringUtils";

const ALL_TAGS = [
  // assessment / course structure
  "no final",
  "no midterm",
  "low quizzes",
  "presentation",
  "final project",
  "group project",

  // // general education / liberal arts requirements
  // "general education elective",
  // "islamic culture course",
  // "writing intensive",
  // "global perspective",
  // "artistic perspective",
  // "ethical perspective",
  // "social perspective",
  // "science principles (non-lab science)",
  // "lab science",
  // "natural science principle",
  // "immersion",
  // "immersion required course option",

  // // immersions
  // "cultural anthropology",
  // "advertising and public relations",
  // "modern languages and cultures - arabic",
  // "creative writing",
  // "digital literature and comparative media",
  // "economics",
  // "english",
  // // "ethics",
  // "modern languages and cultures - french",
  // "history",
  // "literature and media",
  // "mathematics",
  // "philosophy",
  // "psychology",
  // "religious studies",

  // // major electives
  // "BS electrical engineering professional elective",
  // "BS industrial engineering professional elective",
  // "BS mechanical engineering extended core elective",
  // "BS mechanical engineering applied elective",
  // "BS cit concentration",
  // "BS csec advanced option",
];

// --- IMPROVEMENT: Tag synonyms for fuzzy matching
const TAG_SYNONYMS = {
  "no final": [
    "with no final exam",
    "no finals",
    "no final exam",
    "no final exams",
    "without final",
    "without finals",
    "without final exam",
    "without final exams",
    "no final test",
    "no final tests",
    "without final test",
    "without final tests",
    "no end exam",
    "no end exams",
    "without end exam",
    "without end exams",
  ],
  "no midterm": [
    "no midterms",
    "no midterm exam",
    "no midterm exams",
    "without midterm",
    "without midterms",
    "without midterm exam",
    "without midterm exams",
    "no midterm test",
    "no midterm tests",
    "without midterm test",
    "without midterm tests",
  ],
  "low quizzes": [
    "low quiz",
    "no quiz",
    "no quizzes",
    "without quiz",
    "without quizzes",
    "few quizzes",
    "few quiz",
    "fewest quizzes",
    "least quizzes",
    "minimum quizzes",
    "min quizzes",
    "lowest quizzes",
    "less quizzes",
    "smallest quizzes",
    "zero quizzes",
    "as few quizzes as possible",
    "as little quizzes as possible",
    "quiz with the fewest",
    "quiz having no",
    "only one quiz",
    "just one quiz",
    "single quiz",
  ],
  "final project": [
    "project",
    "capstone",
    "final assignment",
    "end project",
    "end assignment",
    "major project",
    "term project",
  ],
  "group project": [
    "team project",
    "collaborative project",
    "group assignment",
    "team assignment",
    "collaboration project",
    "joint project",
  ],
  policy: [
    "policies",
    "regulation",
    "regulations",
    "rules",
    "guidelines",
    "policy making",
  ],
  hacker: [
    "hacking",
    "cybersecurity",
    "security",
    "ethical hacking",
    "penetration testing",
    "pentesting",
  ],
  presentation: [
    "presenting",
    "oral presentation",
    "presentations",
    "slideshow",
    "pitch",
    "talk",
    "speech",
  ],
  "writing intensive": [
    "writing",
    "writing heavy",
    "lots of writing",
    "essay heavy",
    "writing focused",
    "writing based",
    "WI",
  ],
  "advanced elective": [
    "upper level elective",
    "advanced course",
    "specialized elective",
  ],

  // new GEN ED / LIBERAL ARTS REQUIREMENTS
  "general education elective": ["GE"],
  "islamic culture course": ["islcult"],
  "global perspective": ["glb"],
  "artistic perspective": ["art"],
  "ethical perspective": ["eth"],
  "social perspective": ["soc"],
  "science principles (non-lab science)": ["sciprin", "SciPrin (Bus,ME)"],
  "lab science": ["labsci", "LabSci(CSec)"],
  "natural science principle": ["natsci", ""],
  immersion: ["imm"],
  "immersion required course option": ["imm*"],

  // new IMMERSIONS
  "cultural anthropology": ["anth"],
  "advertising and public relations": ["apr"],
  "modern languages and cultures - arabic": ["arb"],
  "creative writing": ["crtwrt"],
  "digital literature and comparative media": ["diglit"],
  economics: ["econ"],
  english: ["engl"],
  // ethics: ["ethics"],
  "modern languages and cultures - french": ["fr"],
  history: ["hist"],
  "literature and media": ["lit"],
  mathematics: ["math"],
  philosophy: ["phil"],
  psychology: ["psyc", "psychology immersion", "imm: psychology"],
  "religious studies": ["rel"],

  // new MAJOR ELECTIVES
  "BS electrical engineering professional elective": ["ee pe"],
  "BS industrial engineering professional elective": ["ie pe"],
  "BS mechanical engineering extended core elective": ["ext core"],
  "BS mechanical engineering applied elective": ["appl"],
  "BS cit concentration": ["cit conc"],
  "BS csec advanced option": ["adv opt"],
};

const STOP_WORDS = new Set([
  "quiz",
  "quizzes",
  "there",
  "looking",
  "searching",
  "find",
  "show",
  "give",
  "tell",
  "need",
  "want",
  "like",
  "just",
  "really",
  "kind",
  "kindof",
  "sort",
  "sortof",
  "maybe",
  "please",
  "about",
  "i",
  "im",
  "i'm",
  "me",
  "my",
  "mine",
  "you",
  "your",
  "yours",
  "we",
  "us",
  "our",
  "ours",
  "he",
  "him",
  "his",
  "she",
  "her",
  "hers",
  "they",
  "them",
  "their",
  "theirs",
  "it",
  "its",
  "a",
  "an",
  "the",
  "this",
  "that",
  "these",
  "those",
  "am",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "do",
  "does",
  "did",
  "done",
  "doing",
  "has",
  "have",
  "had",
  "having",
  "will",
  "would",
  "shall",
  "should",
  "can",
  "could",
  "may",
  "might",
  "must",
  "and",
  "or",
  "but",
  "if",
  "then",
  "so",
  "because",
  "since",
  "while",
  "although",
  "though",
  "unless",
  "until",
  "before",
  "after",
  "when",
  "whenever",
  "where",
  "wherever",
  "whether",
  "for",
  "with",
  "without",
  "to",
  "of",
  "in",
  "on",
  "at",
  "by",
  "from",
  "into",
  "onto",
  "over",
  "under",
  "about",
  "around",
  "through",
  "across",
  "between",
  "within",
  "outside",
  "inside",
  "yes",
  "no",
  "not",
  "course",
  "courses",
  "class",
  "classes",
  "subject",
  "subjects",
  "topic",
  "topics",
  "cover",
  "covers",
  "covering",
]);

const NO_RESULTS_VARIATIONS = [
  "except your pretty face.",
  "but you're still awesome.",
  "maybe try a different keyword?",
  "but don't give up!",
  "but hey, you tried!",
  "but tomorrow is another day.",
];

const RESERVED_COMMANDS = new Set(["/all", "pineapple on pizza"]);

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .filter((word) => !STOP_WORDS.has(word))
    .map((word) => stemmer(word));
}

// function fuzzyTermFrequency(queryTokens, vocab) {
//   const tf = Array(vocab.length).fill(0);
//   queryTokens.forEach((qToken) => {
//     vocab.forEach((vToken, idx) => {
//       if (vToken.startsWith(qToken)) {
//         tf[idx] += 1;
//       }
//     });
//   });
//   return tf;
// }

// function tfidfVector(tf, idf) {
//   return tf.map((t, i) => t * idf[i]);
// }

// function cosineSimilarity(a, b) {
//   const dot = a.reduce((sum, v, i) => sum + v * b[i], 0);
//   const normA = Math.sqrt(a.reduce((sum, v) => sum + v * v, 0));
//   const normB = Math.sqrt(b.reduce((sum, v) => sum + v * v, 0));
//   if (normA === 0 || normB === 0) return 0;
//   return dot / (normA * normB);
// }

function stemCode(code) {
  return code.toLowerCase().replace(/[^a-z]/g, "");
}

function normalizeTag(tag) {
  return stemmer(tag.toLowerCase().replace(/[^a-z]/g, ""));
}

function extractQuizCount(summary) {
  let gradingSection = "";
  const gradingMatch = summary.match(/Grading:(.*?)(?:\n|---|$)/i);
  if (gradingMatch) {
    gradingSection = gradingMatch[1];
  }
  const matchParen = gradingSection.match(/quiz(?:zes)?\s*\((\d+)\)/i);
  if (matchParen) {
    return parseInt(matchParen[1], 10);
  }
  const matchOne = gradingSection.match(/(?:only\s+)?one\s+quiz/i);
  if (matchOne) {
    return 1;
  }
  if (/quiz(?:zes)?/i.test(gradingSection)) {
    return 1;
  }
  return 0;
}

function highlightText(text, queryWords = [], requiredTags = []) {
  // Use raw query words (not stemmed) for highlighting
  const allTokens = [
    ...queryWords.map((w) => w.toLowerCase()),
    ...requiredTags.map((t) => t.toLowerCase()),
  ].filter(Boolean);

  if (!allTokens.length) return text;

  const words = text.split(/(\W+)/); // split into words + punctuation

  return words.map((word, i) => {
    const lower = word.toLowerCase();
    const isMatch = allTokens.some((token) =>
      token && lower.includes(token) // substring match
    );
    return isMatch ? (
      <span className="highlight" key={i}>
        {word}
      </span>
    ) : (
      word
    );
  });
}



// --- Helper: Format Time from Google Sheets ---
function formatTime(value) {
  if (!value) return "";

  // Case 1: Already a string like "10:00 AM" or "9:55 AM"
  if (
    typeof value === "string" &&
    /^\d{1,2}:\d{2}\s?(AM|PM)$/i.test(value.trim())
  ) {
    return value.trim();
  }

  // Case 2: Google Sheets stores time as fraction of a day
  if (typeof value === "number") {
    const totalMinutes = Math.round(value * 24 * 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const ampm = hours >= 12 ? "PM" : "AM";
    const displayHours = ((hours + 11) % 12) + 1;
    return `${displayHours}:${minutes.toString().padStart(2, "0")} ${ampm}`;
  }

  // Case 3: "Date(1899,11,30,13,5,0)" string
  const match = /Date\(\d+,\d+,\d+,\s*(\d+),\s*(\d+)/.exec(value);
  if (match) {
    let hours = parseInt(match[1], 10);
    let minutes = parseInt(match[2], 10);
    const ampm = hours >= 12 ? "PM" : "AM";
    const displayHours = ((hours + 11) % 12) + 1;
    return `${displayHours}:${minutes.toString().padStart(2, "0")} ${ampm}`;
  }

  // Case 4: Already a range string like "10:00 AM - 10:55 AM"
  if (
    typeof value === "string" &&
    /^\d{1,2}:\d{2}\s?(AM|PM)\s*-\s*\d{1,2}:\d{2}\s?(AM|PM)$/i.test(value.trim())
  ) {
    return value.trim();
  }

  return "";
}

// --- Helper: Format Time Range from Google Sheets ---
function formatTimeRange(start, end) {
  // If both are empty, return empty
  if (!start && !end) return "";

  // If start is a string like "Date(...) - Date(...)", parse both
  if (
    typeof start === "string" &&
    start.includes("Date(") &&
    start.includes(" - Date(")
  ) {
    const parts = start.split(" - ");
    if (parts.length === 2) {
      return `${formatTime(parts[0])} - ${formatTime(parts[1])}`;
    }
  }

  // If start is a string like "10:00 AM - 10:55 AM"
  if (
    typeof start === "string" &&
    /^\d{1,2}:\d{2}\s?(AM|PM)\s*-\s*\d{1,2}:\d{2}\s?(AM|PM)$/i.test(start.trim())
  ) {
    return start.trim();
  }

  // If start and end are both "Date(...)" strings
  if (
    typeof start === "string" &&
    typeof end === "string" &&
    start.includes("Date(") &&
    end.includes("Date(")
  ) {
    return `${formatTime(start)} - ${formatTime(end)}`;
  }

  // If start and end are both numbers
  if (typeof start === "number" && typeof end === "number") {
    return `${formatTime(start)} - ${formatTime(end)}`;
  }

  // If only start is present and looks like a time
  if (start && !end) return formatTime(start);

  // If only end is present and looks like a time
  if (!start && end) return formatTime(end);

  // Fallback: join as string if both present
  if (start && end) return `${formatTime(start)} - ${formatTime(end)}`;

  return "";
}

function isCourseCodeQuery(query) {
  const codePattern = /^[A-Z]{2,5}\s?\d{0,4}$/i;
  return codePattern.test(query.trim());
}

const SHEET_ID_25_26 = "1UUjSCTgCK7yZLvlrwwoZ2341K9aCwiYMiR7Qs8fegRA";
const SHEET_ID_26_27 = "1bI-jXiF48S7j6YuvvNYRcpzh9e2MlZE-cICxu3ONZGg";
const SHEET_GID_FALL = "672481223";
const SHEET_GID_SPRING = "1605186669";

// NEW: origins to preconnect/dns-prefetch (keep ≤ 4)
const PRECONNECT_ORIGINS = [
  "https://docs.google.com",
  "https://doc-0g-10-sheets.googleusercontent.com",
  "https://www.gstatic.com",
];

// Accept docId and gid as argument
async function fetchGoogleSheet(docId, gid) {
  const url = `https://docs.google.com/spreadsheets/d/${docId}/export?format=csv&gid=${gid}`;
  // console.log("🔗 Fetching URL:", url);

  try {
    const res = await fetch(url);
    const text = await res.text();

    const parsed = Papa.parse(text, {
      header: false,
      skipEmptyLines: true,
    });

    const rows = parsed.data;
    if (!rows || rows.length === 0) {
      console.error("❌ No rows found in sheet");
      return [];
    }

    // Find header row
    let headerRowIndex = -1;
    let headerRow = null;
    for (let i = 0; i < Math.min(10, rows.length); i++) {
      const row = rows[i];
      if (
        row &&
        row.some((cell) => {
          const cellStr = (cell || "").toString().toLowerCase();
          return (
            cellStr.includes("subject") ||
            cellStr.includes("subj") ||
            cellStr.includes("course") ||
            cellStr.includes("code") || // Added 'code'
            cellStr.includes("id") ||   // Added 'id'
            cellStr.includes("dept") ||
            cellStr.includes("cat") ||
            cellStr.includes("number") ||
            cellStr.includes("sect") ||
            cellStr.includes("instructors") ||
            cellStr.includes("credit") ||
            cellStr.includes("crdt")
          );
        })
      ) {
        headerRowIndex = i;
        headerRow = row;
        break;
      }
    }

    if (!headerRow) {
      console.error("❌ Could not find header row in sheet");
      // console.log("First 5 rows:", rows.slice(0, 5));
      return [];
    }

    // Normalize headers
    const headers = headerRow.map((h) =>
      (h || "")
        .toString()
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "")
        .replace(/[^a-z0-9]/g, "")
    );

    // console.log("📌 Normalized headers:", headers);

    // Data rows
    const dataRows = rows.slice(headerRowIndex + 1);

    // Convert rows into objects
    const objects = dataRows.map((row) => {
      const obj = {};
      headers.forEach((h, i) => {
        // Only keep the FIRST occurrence of each header (e.g. columns M/N "Time Start"/"Time End"
        // take priority over duplicate Ramadan timing columns Q/R)
        if (!(h in obj)) {
          obj[h] = row[i] != null ? String(row[i]).trim() : "";
        }
      });
      return obj;
    });

    // console.log(`✅ Found ${objects.length} rows`);
    // console.log(`✅ Found ${objects.length} rows`);
    if (objects.length > 0) {
      // console.log("✅ Sample row:", objects[0]);
    }

    return objects;
  } catch (error) {
    console.error("❌ Error fetching sheet:", error);
    return [];
  }
}

function getSectionsForCourse(course, sheetData) {
  if (!sheetData || sheetData.length === 0) return [];

  const normalize = (str) =>
    (str || "").toString().replace(/[^a-zA-Z0-9]/g, "").toUpperCase();

  const courseCodeNorm = normalize(course.code);

  const matches = sheetData.filter((row) => {
    // Try to find subject
    const subject =
      row.subject ||
      row.subj ||
      row.course ||
      row.dept ||
      row.department ||
      "";

    // Try to find catalog/number
    const cat =
      row.cat ||
      row.catalog ||
      row.number ||
      row.num ||
      row.crn ||
      "";

    const sheetCodeNorm = normalize(subject + cat);
    return sheetCodeNorm === courseCodeNorm;
  });

  // console.log(
  //   `🔎 Looking for ${course.code}, found ${matches.length} sections`
  // );

  return matches;
}

function App() {
  const [mode, setMode] = useState(() => {
    const saved = localStorage.getItem('coursalog_mode');
    return saved || 'search';
  }); // 'search' or 'schedule'
  const [query, setQuery] = useState(() => {
    try {
      const saved = localStorage.getItem('coursalog_search_state');
      return saved ? (JSON.parse(saved).query || "") : "";
    } catch (e) { return ""; }
  });
  const [results, setResults] = useState(() => {
    try {
      const saved = localStorage.getItem('coursalog_search_state');
      return saved ? (JSON.parse(saved).results || []) : [];
    } catch (e) { return []; }
  });
  const [hasSearched, setHasSearched] = useState(() => {
    try {
      const saved = localStorage.getItem('coursalog_search_state');
      return saved ? (JSON.parse(saved).hasSearched || false) : false;
    } catch (e) { return false; }
  });
  const [searchHistory, setSearchHistory] = useState([]);
  // const [tfidfData, setTfidfData] = useState({
  //   vocab: [],
  //   idf: [],
  //   courseVectors: [],
  // });
  const [courses, setCourses] = useState([]);
  const [noResultsVariation, setNoResultsVariation] = useState(() => {
    try {
      const saved = localStorage.getItem('coursalog_search_state');
      return saved ? (JSON.parse(saved).noResultsVariation || "") : "";
    } catch (e) { return ""; }
  });
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [didYouMean, setDidYouMean] = useState(() => {
    try {
      const saved = localStorage.getItem('coursalog_search_state');
      return saved ? (JSON.parse(saved).didYouMean || "") : "";
    } catch (e) { return ""; }
  });
  const [closestMatches, setClosestMatches] = useState(() => {
    try {
      const saved = localStorage.getItem('coursalog_search_state');
      return saved ? (JSON.parse(saved).closestMatches || []) : [];
    } catch (e) { return []; }
  });

  const [showTips, setShowTips] = useState(false);
  const handleShowTips = () => setShowTips(true);
  const handleCloseTips = () => setShowTips(false);

  const [showTipPopup, setShowTipPopup] = useState(false);
  const handleShowTipPopup = () => setShowTipPopup(true);
  const handleCloseTipPopup = () => setShowTipPopup(false);

  const [openRecent, setOpenRecent] = useState(false);
  const dropdownRef = useRef(null);

  // NEW: Back to Top visibility state
  // const [showBackToTop, setShowBackToTop] = useState(false);

  // NEW: Selected course for sections popup
  const [selectedCourse, setSelectedCourse] = useState(null);

  // NEW: Refresh reminder popup state
  const [showRefreshReminder, setShowRefreshReminder] = useState(false);

  // NEW: Timer for refresh reminder (every 30 minutes)
  useEffect(() => {
    // Show reminder after 30 minutes (1800000 ms)
    const timer = setTimeout(() => {
      setShowRefreshReminder(true);
    }, 1800000);

    return () => clearTimeout(timer);
  }, []);
  // Lock background scroll for ANY modal popup
  useEffect(() => {
    const modalOpen =
      showDisclaimer || showTips || showTipPopup || selectedCourse;
    if (modalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [showDisclaimer, showTips, showTipPopup, selectedCourse]);

  // NEW: track lazy sheet loading + errors
  const [sheetDataFall25, setSheetDataFall25] = useState([]);
  const [sheetDataSpring26, setSheetDataSpring26] = useState([]);
  const [sheetDataFall26, setSheetDataFall26] = useState([]);
  const [sheetDataSpring27, setSheetDataSpring27] = useState([]);
  const [selectedSemester, setSelectedSemester] = useState("fall25");
  const [isLoadingSheet, setIsLoadingSheet] = useState(false);
  const [sheetError, setSheetError] = useState(null);
  const loadingRef = useRef({ fall25: false, spring26: false, fall26: false, spring27: false });

  // NEW: Add resource hints + preload early
  useEffect(() => {
    try {
      const head = document.head;
      PRECONNECT_ORIGINS.forEach((origin) => {
        const pre = document.createElement("link");
        pre.rel = "preconnect";
        pre.href = origin;
        pre.crossOrigin = "anonymous";
        head.appendChild(pre);

        const dns = document.createElement("link");
        dns.rel = "dns-prefetch";
        dns.href = origin;
        head.appendChild(dns);
      });

      const preloadCourses = document.createElement("link");
      preloadCourses.rel = "preload";
      preloadCourses.as = "fetch";
      preloadCourses.href = "/courses.json";
      preloadCourses.crossOrigin = "anonymous";
      head.appendChild(preloadCourses);
    } catch { }
  }, []);

  // NEW: Register a lightweight service worker for caching
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => { });
    }
  }, []);

  // NOTE: Removed eager Google Sheets fetch on mount.
  // Old code:
  // useEffect(() => {
  //   fetchGoogleSheet(SHEET_GID_FALL2025).then(setSheetDataFall);
  //   fetchGoogleSheet(SHEET_GID_SPRING2026).then(setSheetDataSpring);
  // }, []);

  // NEW: Lazy loader for a semester's sheet (memoized)
  const loadSheet = useCallback(async (semester) => {
    if (loadingRef.current[semester]) return;
    if (semester === "fall25" && sheetDataFall25.length > 0) return;
    if (semester === "spring26" && sheetDataSpring26.length > 0) return;
    if (semester === "fall26" && sheetDataFall26.length > 0) return;
    if (semester === "spring27" && sheetDataSpring27.length > 0) return;

    loadingRef.current[semester] = true;
    setIsLoadingSheet(true);
    setSheetError(null);
    try {
      let docId, gid;
      if (semester === "fall25") { docId = SHEET_ID_25_26; gid = SHEET_GID_FALL; }
      else if (semester === "spring26") { docId = SHEET_ID_25_26; gid = SHEET_GID_SPRING; }
      else if (semester === "fall26") { docId = SHEET_ID_26_27; gid = SHEET_GID_FALL; }
      else if (semester === "spring27") { docId = SHEET_ID_26_27; gid = SHEET_GID_SPRING; }

      const data = await fetchGoogleSheet(docId, gid);
      if (semester === "fall25") setSheetDataFall25(data || []);
      else if (semester === "spring26") setSheetDataSpring26(data || []);
      else if (semester === "fall26") setSheetDataFall26(data || []);
      else if (semester === "spring27") setSheetDataSpring27(data || []);
    } catch (e) {
      setSheetError("Failed to load sections.");
    } finally {
      setIsLoadingSheet(false);
      loadingRef.current[semester] = false;
    }
  }, [sheetDataFall25.length, sheetDataSpring26.length, sheetDataFall26.length, sheetDataSpring27.length]);

  // NEW: On modal open or tab switch, ensure the needed semester is loaded
  // Load both semesters when in schedule mode, or selected semester for course popup
  useEffect(() => {
    if (mode === "schedule") {
      loadSheet("fall25");
      loadSheet("spring26");
      loadSheet("fall26");
      loadSheet("spring27");
    } else if (selectedCourse) {
      loadSheet(selectedSemester);
    }
  }, [selectedCourse, selectedSemester, loadSheet, mode]);

  // NEW: Opportunistically prefetch Fall 25 sheet when the browser is idle
  useEffect(() => {
    const idleId =
      "requestIdleCallback" in window
        ? window.requestIdleCallback(() => loadSheet("fall25"))
        : setTimeout(() => loadSheet("fall25"), 1500);
    return () => {
      if ("cancelIdleCallback" in window) {
        window.cancelIdleCallback(idleId);
      } else {
        clearTimeout(idleId);
      }
    };
  }, [loadSheet]);



  // Save search state to localStorage whenever it changes
  useEffect(() => {
    const searchState = {
      query,
      results,
      hasSearched,
      didYouMean,
      closestMatches,
      noResultsVariation,
    };
    localStorage.setItem('coursalog_search_state', JSON.stringify(searchState));
  }, [query, results, hasSearched, didYouMean, closestMatches, noResultsVariation]);

  // Save mode to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('coursalog_mode', mode);
  }, [mode]);

  // Clear active session data on refresh/close
  useEffect(() => {
    const handleUnload = () => {
      // Clear active search state
      localStorage.removeItem('coursalog_search_state');
      // Clear active schedule state
      localStorage.removeItem('coursalog_state');
      localStorage.removeItem('coursalog_schedule_results');
      // Clear active mode (optional, but requested "reset everything")
      localStorage.removeItem('coursalog_mode');
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, []);

  useEffect(() => {
    if (!localStorage.getItem("coursalogDisclaimerAgreed")) {
      setShowDisclaimer(true);
    }
  }, []);

  const handleAgree = () => {
    setShowDisclaimer(false);
    localStorage.setItem("coursalogDisclaimerAgreed", "yes");
  };

  useEffect(() => {
    // Small improvement: allow cache usage for courses.json
    fetch("/courses.json", { cache: "force-cache" })
      .then((res) => res.json())
      .then((coursesData) => {
        setCourses(coursesData);
      });
  }, []);

  useEffect(() => {
    const history = JSON.parse(localStorage.getItem("searchHistory") || "[]");
    setSearchHistory(history);
  }, []);

  useEffect(() => {
    if (hasSearched && results.length === 0) {
      const idx = Math.floor(Math.random() * NO_RESULTS_VARIATIONS.length);
      setNoResultsVariation(NO_RESULTS_VARIATIONS[idx]);
    }
  }, [hasSearched, results]);

  // NEW: Track scroll position for Back to Top button
  // useEffect(() => {
  //   const handleScroll = () => {
  //     if (window.scrollY > 300) {
  //       setShowBackToTop(true);
  //     } else {
  //       setShowBackToTop(false);
  //     }
  //   };
  //   window.addEventListener("scroll", handleScroll);
  //   return () => window.removeEventListener("scroll", handleScroll);
  // }, []);

  // const scrollToTop = () => {
  //   window.scrollTo({ top: 0, behavior: "smooth" });
  // };

  const saveSearchHistory = (q) => {
    if (!q.trim()) return;
    let history = JSON.parse(localStorage.getItem("searchHistory") || "[]");
    history = [q, ...history.filter((x) => x !== q)].slice(0, 12);
    localStorage.setItem("searchHistory", JSON.stringify(history));
    setSearchHistory(history);
  };

  function buildDictionary(courses) {
    const freq = new Map();
    courses.forEach((course) => {
      const text = `${course.title} ${course.summary} ${(course.tags || []).join(
        " "
      )}`;
      text.toLowerCase()
        .split(/\W+/)
        .forEach((w) => {
          if (!w) return;
          freq.set(w, (freq.get(w) || 0) + 1);
        });
    });
    return freq;
  }

  function findClosestMatch(query) {
    if (!query.trim() || courses.length === 0) return "";

    const dictionaryFreq = buildDictionary(courses);
    const dictionary = Array.from(dictionaryFreq.keys());

    const words = query.split(/\s+/);
    let changed = false;

    const correctedWords = words.map((word) => {
      const lowerWord = word.toLowerCase();

      if (/^[0-9]+$/.test(lowerWord) || /^[a-z]{2,5}\d{0,4}$/i.test(word))
        return word;
      if (STOP_WORDS.has(lowerWord)) return word;
      if (dictionaryFreq.has(lowerWord)) return word;

      let bestMatch = lowerWord;
      let bestDistance = Infinity;
      let bestFreq = 0;

      dictionary.forEach((dictWord) => {
        if (!dictWord || dictWord.length < 2) return;
        const dist = levenshtein(lowerWord, dictWord);

        if (
          dist < bestDistance ||
          (dist === bestDistance &&
            (dictionaryFreq.get(dictWord) || 0) > bestFreq)
        ) {
          bestDistance = dist;
          bestMatch = dictWord;
          bestFreq = dictionaryFreq.get(dictWord) || 0;
        }
      });

      const threshold =
        lowerWord.length <= 4
          ? 1
          : Math.max(2, Math.floor(lowerWord.length * 0.34));

      if (bestDistance <= threshold && bestFreq >= 2) {
        changed = true;
        return bestMatch;
      }

      return word;
    });

    const correctedQuery = correctedWords.join(" ");
    return changed ? correctedQuery : "";
  }

  const doSearch = (overrideQuery) => {
    setDidYouMean("");
    setClosestMatches([]);
    let searchTerm = (overrideQuery ?? query).trim();
    if (!searchTerm) {
      setQuery("");
      setResults([]);
      setHasSearched(false);
      return;
    }
    const queryLower = searchTerm.toLowerCase();
    setHasSearched(true);
    saveSearchHistory(searchTerm);

    const suggestion = findClosestMatch(searchTerm);
    if (suggestion && suggestion !== searchTerm) {
      setDidYouMean(suggestion);
    }

    // Reserved commands
    if (RESERVED_COMMANDS.has(queryLower) || isCourseCodeQuery(searchTerm)) {
      if (queryLower === "/all") {
        setResults(courses);
        return;
      } else if (queryLower === "pineapple on pizza") {
        setResults([]);
        return;
      }
    }

    // Exact course code match
    const codeQuery = searchTerm.replace(/\s+/g, "").toUpperCase();
    const exactMatch = courses.find(
      (course) => course.code.replace(/\s+/g, "").toUpperCase() === codeQuery
    );
    if (exactMatch) {
      setResults([exactMatch]);
      return;
    }
    if (/^[A-Z]{2,6}$/.test(codeQuery)) {
      const prefixMatches = courses.filter((course) =>
        course.code.toUpperCase().startsWith(codeQuery)
      );
      if (prefixMatches.length > 0) {
        setResults(prefixMatches);
        return;
      }
    }

    // --- NEW: Exact course title match ---
    const exactTitleMatches = courses.filter(
      (course) => course.title.trim().toLowerCase() === queryLower
    );
    if (exactTitleMatches.length > 0) {
      setResults(exactTitleMatches);
      return;
    }

    // --- Normal search logic ---
    let requiredTags = [];
    let queryForKeywords = queryLower;

    // Extract tags
    const tagPatterns = [];
    ALL_TAGS.forEach((tag) => {
      tagPatterns.push({ tag, pattern: tag });
      if (TAG_SYNONYMS[tag]) {
        TAG_SYNONYMS[tag].forEach((syn) => {
          tagPatterns.push({ tag, pattern: syn });
        });
      }
    });
    tagPatterns.sort((a, b) => b.pattern.length - a.pattern.length);

    tagPatterns.forEach(({ tag, pattern }) => {
      const regex = new RegExp(
        `\\b${pattern.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}\\b`,
        "gi"
      );
      if (regex.test(queryForKeywords)) {
        requiredTags.push(tag);
        queryForKeywords = queryForKeywords.replace(regex, "");
      }
    });

    queryForKeywords = queryForKeywords
      .replace(
        /\b(and|or|the|a|an|for|with|to|of|in|on|at|by|from|is|are|was|were|be|been|being|as|it|this|so|do|does|did|not|no|yes|you|your|my|me|we|us|our|course|courses)\b/gi,
        ""
      )
      .replace(/\s+/g, " ")
      .trim();

    const featureKeywords = queryForKeywords ? tokenize(queryForKeywords) : [];
    const codeKeywords = featureKeywords.filter((word) =>
      /^[a-z]{2,5}$/.test(word)
    );

    let filteredCourses = courses;

    // ✅ Combined AND logic (tags OR text, keywords in text)
    if (featureKeywords.length > 0 || requiredTags.length > 0) {
      filteredCourses = filteredCourses.filter((course) => {
        const text = `${course.title} ${course.summary} ${(course.tags || []).join(
          " "
        )}`.toLowerCase();

        // Check all keywords in text
        const allKeywordsPresent = featureKeywords.every((word) =>
          text.includes(word.toLowerCase())
        );

        // Check all required tags (allow match in tags OR text, with synonyms)
        const allTagsPresent = requiredTags.every((tag) => {
          const normalizedRequiredTag = normalizeTag(tag);
          const normalizedCourseTags = (course.tags || []).map((t) =>
            normalizeTag(t)
          );

          if (normalizedCourseTags.includes(normalizedRequiredTag)) return true;
          if (text.includes(normalizedRequiredTag)) return true;
          if (TAG_SYNONYMS[tag]) {
            return TAG_SYNONYMS[tag].some((syn) => {
              const normSyn = normalizeTag(syn);
              return (
                normalizedCourseTags.includes(normSyn) || text.includes(normSyn)
              );
            });
          }
          return false;
        });

        return allKeywordsPresent && allTagsPresent;
      });

      if (requiredTags.includes("low quizzes")) {
        filteredCourses = filteredCourses
          .map((course) => ({
            ...course,
            quizCount: extractQuizCount(course.summary || ""),
          }))
          .sort((a, b) => a.quizCount - b.quizCount);
      }
    }

    // --- Scoring ---
    if (featureKeywords.length > 0 || codeKeywords.length > 0) {
      let scoredCourses = filteredCourses.map((course) => {
        let score = 0;
        featureKeywords.forEach((kw) => {
          if (tokenize(course.title).includes(kw)) score += 2;
          if (tokenize(course.summary).includes(kw)) score += 1;
          if (tokenize((course.tags || []).join(" ")).includes(kw)) score += 2;
        });
        codeKeywords.forEach((codeFrag) => {
          if (stemCode(course.code) === codeFrag) score += 4;
          else if (stemCode(course.code).startsWith(codeFrag)) score += 2;
        });
        if (course.title.toLowerCase().includes(queryLower)) score += 4;
        if (course.summary.toLowerCase().includes(queryLower)) score += 2;
        if ((course.tags || []).join(" ").toLowerCase().includes(queryLower))
          score += 2;
        return { ...course, score };
      });
      scoredCourses = scoredCourses
        .filter((c) => c.score > 0)
        .sort((a, b) => b.score - a.score);

      if (scoredCourses.length > 0) {
        setResults(scoredCourses);
        return;
      } else {
        // OR fallback
        let orMatches = courses.map((course) => {
          const text = `${course.title} ${course.summary} ${(course.tags || []).join(
            " "
          )}`.toLowerCase();
          let matchCount = 0;
          featureKeywords.forEach((word) => {
            if (text.includes(word)) matchCount++;
          });
          requiredTags.forEach((tag) => {
            const normalizedCourseTags = (course.tags || []).map((t) =>
              normalizeTag(t)
            );
            if (normalizedCourseTags.includes(normalizeTag(tag))) {
              matchCount++;
            } else if (
              TAG_SYNONYMS[tag] &&
              TAG_SYNONYMS[tag].some((syn) =>
                normalizedCourseTags.includes(normalizeTag(syn))
              )
            ) {
              matchCount++;
            }
          });
          return { ...course, matchCount };
        });

        const maxMatch = Math.max(...orMatches.map((c) => c.matchCount), 0);
        orMatches = orMatches.filter(
          (c) => c.matchCount === maxMatch && maxMatch > 0
        );

        if (orMatches.length > 0) {
          setClosestMatches(orMatches);
          setResults([]);
          return;
        }
      }
    }

    // --- Tag-only fallback ---
    if (requiredTags.length > 0) {
      if (filteredCourses.length > 0) {
        setResults(filteredCourses);
        return;
      } else {
        let orMatches = courses.map((course) => {
          let matchCount = 0;
          requiredTags.forEach((tag) => {
            const normalizedCourseTags = (course.tags || []).map((t) =>
              normalizeTag(t)
            );
            if (normalizedCourseTags.includes(normalizeTag(tag))) {
              matchCount++;
            } else if (
              TAG_SYNONYMS[tag] &&
              TAG_SYNONYMS[tag].some((syn) =>
                normalizedCourseTags.includes(normalizeTag(syn))
              )
            ) {
              matchCount++;
            }
          });
          return { ...course, matchCount };
        });
        const maxMatch = Math.max(...orMatches.map((c) => c.matchCount), 0);
        orMatches = orMatches.filter(
          (c) => c.matchCount === maxMatch && maxMatch > 0
        );
        if (orMatches.length > 0) {
          setClosestMatches(orMatches);
          setResults([]);
          return;
        }
      }
    }

    // // --- TF-IDF fallback ---
    // const queryTokensArr = tokenize(searchTerm);
    // const queryTf = fuzzyTermFrequency(queryTokensArr, tfidfData.vocab);
    // const queryVec = tfidfVector(queryTf, tfidfData.idf);
    // const ranked = courses
    //   .map((course, i) => ({
    //     ...course,
    //     score: cosineSimilarity(queryVec, tfidfData.courseVectors[i]),
    //   }))
    //   .sort((a, b) => b.score - a.score);
    // const maxScore = ranked.length > 0 ? ranked[0].score : 0;
    // const threshold = 0.2;
    // const filtered = ranked.filter(
    //   (c) => c.score > 0 && c.score >= threshold * maxScore
    // );
    // setResults(filtered.length ? filtered : []);
  };

  const isPineapplePizza = query.trim().toLowerCase() === "pineapple on pizza";

  // Pagination state
  const PAGE_SIZE = 10;
  const [currentPage, setCurrentPage] = useState(1);
  // NEW: page input state
  const [pageInput, setPageInput] = useState("1");

  // Scroll to top when page changes
  useEffect(() => {
    if (hasSearched && (results.length > 0 || closestMatches.length > 0)) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      if (document.documentElement) {
        document.documentElement.scrollTop = 0;
      }
      if (document.body) {
        document.body.scrollTop = 0;
      }
    }
  }, [currentPage, hasSearched, results.length, closestMatches.length]);

  // Reset page on new search
  useEffect(() => {
    setCurrentPage(1);
  }, [results, closestMatches, hasSearched]);

  // Sync the text input when current page changes
  useEffect(() => {
    setPageInput(String(currentPage));
  }, [currentPage]);

  // Pagination logic
  const paginatedResults =
    hasSearched && results.length > 0
      ? results.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
      : [];

  const paginatedClosest =
    hasSearched && closestMatches.length > 0
      ? closestMatches.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
      : [];

  const totalResults = results.length > 0 ? results.length : closestMatches.length;
  const totalPages = Math.ceil(totalResults / PAGE_SIZE);

  // NEW: helpers to clamp and apply page input
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
    <div className="app">
      {/* --- NEW: Refresh Reminder Popup --- */}
      {showRefreshReminder && (
        <div className="coursalog-popup-overlay">
          <div className="coursalog-popup" style={{ maxWidth: 420 }}>
            <h2>Refresh for Latest Info</h2>
            <div style={{ marginBottom: "1.5em", textAlign: "center" }}>
              <span>
                Course and sheet data change WAY TOO often.
              </span>
            </div>
            <button
              className="search-btn"
              style={{ marginBottom: "0em" }}
              onClick={() => window.location.reload()}
            >
              Refresh
            </button>
          </div>
        </div>
      )}

      {/* Disclaimer Popup */}
      {showDisclaimer && (
        <div className="coursalog-popup-overlay">
          <div className="coursalog-popup">
            <h2>By using Syllify you agree that:</h2>
            <ul>
              <li>
                <b>Syllify is for convenience only.</b> You should not solely
                depend on it for official course planning.
              </li>
              <li>
                <b>Always use official university sources</b> like SIS, official
                Google Sheets, and academic advisors for the most accurate and
                up-to-date course information.
              </li>
              <li>
                <b>Data on Syllify may be inaccurate or outdated.</b>{" "}
                Double-check all information before making decisions.
              </li>
              <li>
                <b>Syllify is not an official RIT resource</b> and is not
                managed by RIT or any RIT staff. It is developed and maintained
                by a single student at RIT Dubai.
              </li>
            </ul>
            <button className="search-btn" onClick={handleAgree}>
              I agree
            </button>
          </div>
        </div>
      )}

      {/* Tips Popup */}
      {showTips && (
        <div className="coursalog-popup-overlay" onClick={handleCloseTips}>
          <div
            className="coursalog-popup"
            onClick={(e) => e.stopPropagation()}
          >
            <h2>Tips for using Syllify</h2>
            <ul>
              <li>
                <b>Use "/all" to see all courses.</b>
              </li>
              <li>
                <b>Search by code, tag, or topic:</b>
                <br />
                Try things like "NSSA", "no final", or "pineapple on pizza".
              </li>
              <li>
                <b>Combine keywords:</b>
                <br />
                For example, "I want a course with <b>no final</b> and is an{" "}
                <b>artisitic perspective.</b>"
              </li>
              <li>
                <b>When looking for the least amount of quizzes:</b>
                <br />
                By simply typing "low quizzes", "few quizzes", or what is
                similar, Syllify will show you courses with two quizzes or less
                only; you can also combine it with other tags like "ethical
                perspective".
              </li>
              <li>
                <b>Clicking/Pressing on a course's name or code</b>
                <br />
                This will allow you to quickly view more details about the course,
                including its sections, timings, and instructors.
              </li>
            </ul>
            <button className="search-btn" onClick={handleCloseTips}>
              Close
            </button>
          </div>
        </div>
      )}

      {/* Tip/Support Popup */}
      {showTipPopup && (
        <div className="coursalog-popup-overlay" onClick={handleCloseTipPopup}>
          <div
            className="coursalog-popup"
            onClick={(e) => e.stopPropagation()}
          >
            <h2>Support Syllify</h2>
            <div
              style={{
                fontSize: "1.15rem",
                margin: "1.5rem 0 2.2rem 0",
                textAlign: "center",
              }}
            >
              Syllify is a free, student-built project.
              <br />
              <br />
              If this tool saved you time, stress, or confusion, you can say
              thanks by giving me a billion dollars.
              <br />
              <br />
              <a
                href="https://ko-fi.com/lancer1"
                target="_blank"
                rel="noopener noreferrer"
                className="tip-link"
                style={{
                  color: "#ff5f5f",
                  fontWeight: 700,
                  fontSize: "1.2rem",
                  textDecoration: "underline",
                  display: "inline-block",
                  margin: "0.5em 0",
                }}
              >
                Tip on Ko-fi ☕
              </a>
            </div>
            <button className="search-btn" onClick={handleCloseTipPopup}>
              Close
            </button>
          </div>
        </div>
      )}

      <div className="starfield"></div>
      <main>
        <div className="center-vertical">
          <h1
            className="title"
            style={{ cursor: "pointer" }}
            onClick={() => {
              setQuery("");
              setResults([]);
              setHasSearched(false);
              setDidYouMean("");
              setClosestMatches([]);
            }}
          >
            Syllify
          </h1>

          <div className="mode-controls">
            <div className="mode-toggle">
              <button
                className={mode === "search" ? "active" : ""}
                onClick={() => setMode("search")}
              >
                <FaSearch /> Search
              </button>
              <button
                className={mode === "schedule" ? "active" : ""}
                onClick={() => setMode("schedule")}
              >
                <FaCalendarAlt /> Schedule
              </button>
            </div>
          </div>

          {mode === "search" ? (
            <>
              <div className="search-bar-block">
                <div className="search-bar-row">
                  <form
                    className="search-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      doSearch();
                    }}
                  >
                    <input
                      className="search-input"
                      type="text"
                      placeholder="Search for courses or topics..."
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      autoFocus
                      spellCheck={true}
                    />
                    <button className="search-btn" type="submit">
                      Search
                    </button>
                  </form>
                </div>

                <div className="utility-bar" ref={dropdownRef}>
                  <div className="util-left">
                    <button
                      className={`recent-toggle${openRecent ? " open" : ""}`}
                      type="button"
                      onClick={() => setOpenRecent((v) => !v)}
                      aria-expanded={openRecent}
                      aria-controls="recent-dropdown"
                    >
                      <FaClock className="recent-icon" />
                      <span>Recent</span>
                      <FaChevronDown className="recent-caret" />
                    </button>

                    {openRecent && (
                      <div
                        id="recent-dropdown"
                        role="menu"
                        className="recent-dropdown"
                      >
                        {searchHistory.length === 0 ? (
                          <div className="recent-empty">No recent searches</div>
                        ) : (
                          <div className="recent-list">
                            {searchHistory.map((q, i) => (
                              <button
                                key={i}
                                className="history-btn"
                                role="menuitem"
                                onClick={() => {
                                  setQuery(q);
                                  setOpenRecent(false);
                                  setTimeout(
                                    () =>
                                      document
                                        .querySelector(".search-input")
                                        ?.focus(),
                                    0
                                  );
                                }}
                              >
                                {q}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="util-icons">
                    <button
                      className="action-icon"
                      type="button"
                      onClick={handleShowTips}
                      title="Search tips"
                      aria-label="Search tips"
                    >
                      <FaLightbulb />
                    </button>
                    <button
                      className="action-icon"
                      type="button"
                      onClick={handleShowTipPopup}
                      title="Support Syllify"
                      aria-label="Support Syllify"
                    >
                      <FaCoffee />
                    </button>
                  </div>
                </div>
              </div>

              {hasSearched && (
                <div className="results-count">
                  {results.length === 1
                    ? "1 course found"
                    : `${results.length} courses found`}

                  {didYouMean && (
                    <>
                      {" — Did you mean"}
                      <span
                        className="did-you-mean-inline"
                        onClick={() => {
                          setQuery(didYouMean);
                          doSearch(didYouMean);
                        }}
                        role="button"
                        tabIndex={0}
                      >
                        {didYouMean}
                      </span>
                      ?
                    </>
                  )}

                  {closestMatches.length > 0 && (
                    <>
                      {" — "}
                      <span className="closest-matches">
                        {`${closestMatches.length} closest ${closestMatches.length === 1 ? "match" : "matches"
                          } shown`}
                      </span>
                    </>
                  )}
                </div>
              )}

              <section
                className={`results${hasSearched && results.length === 0 && closestMatches.length === 0
                  ? " empty"
                  : ""
                  }`}
              >
                {hasSearched &&
                  results.length === 0 &&
                  closestMatches.length === 0 && (
                    <div className="no-results">
                      <div className="no-results-bold">
                        {isPineapplePizza
                          ? "...is a crime."
                          : "Sorry! I couldn't find anything…"}
                      </div>
                      {!isPineapplePizza && (
                        <div className="no-results-variation">
                          {noResultsVariation}
                        </div>
                      )}
                    </div>
                  )}

                {hasSearched &&
                  (results.length > 0 ? paginatedResults : paginatedClosest).map((course) => (
                    <div 
                      className="course-card" 
                      key={course.id}
                      onClick={() => setSelectedCourse(course)}
                    >
                      <div className="course-header">
                        <span className="course-title">
                          {highlightText(course.title, query.split(/\s+/))}
                        </span>
                        <span className="course-code">{course.code}</span>
                      </div>

                      {course.summary.split("\n---\n").map((part, idx, arr) =>
                        idx < arr.length - 1 ? (
                          <React.Fragment key={idx}>
                            <p className="course-summary">
                              {highlightText(part, tokenize(query))}
                            </p>
                            <div className="course-divider"></div>
                          </React.Fragment>
                        ) : (
                          <p className="course-summary" key={idx}>
                            {highlightText(part, tokenize(query))}
                          </p>
                        )
                      )}

                      {course.tags && course.tags.length > 0 && (
                        <div className="course-tags">
                          {course.tags.map((tag) => (
                            <span className="tag" key={tag}>
                              {highlightText(tag, tokenize(query))}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* --- REMOVED: Inline expandable sections --- */}
                      {/* {course.open && (
                    <div className="course-sections">
                      ...sections table...
                    </div>
                  )} */}
                    </div>
                  ))}
              </section>

              {/* --- Pagination Controls --- */}
              {hasSearched && totalPages > 1 && (
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
            </>
          ) : (
            <ScheduleInterface
              sheetDataFall25={sheetDataFall25}
              sheetDataSpring26={sheetDataSpring26}
              sheetDataFall26={sheetDataFall26}
              sheetDataSpring27={sheetDataSpring27}
            />
          )}

          {selectedCourse && (() => {
            const activeSheetData =
              selectedSemester === "fall25" ? sheetDataFall25 :
              selectedSemester === "spring26" ? sheetDataSpring26 :
              selectedSemester === "fall26" ? sheetDataFall26 : sheetDataSpring27;
            const sections =
              activeSheetData && activeSheetData.length > 0
                ? getSectionsForCourse(selectedCourse, activeSheetData)
                : [];

            return (
              <div
                className="coursalog-popup-overlay"
                onClick={() => setSelectedCourse(null)}
              >
                <div
                  className="coursalog-popup fullscreen-modal"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="fullscreen-modal-content">
                    <h2>
                      {selectedCourse.code} — {selectedCourse.title}
                    </h2>

                    {/* Semester Toggle */}
                    <div className="semester-toggle">
                      <button
                        className={selectedSemester === "fall25" ? "active" : ""}
                        onClick={() => setSelectedSemester("fall25")}
                      >
                        Fall 2025
                      </button>
                      <button
                        className={selectedSemester === "spring26" ? "active" : ""}
                        onClick={() => setSelectedSemester("spring26")}
                      >
                        Spring 2026
                      </button>
                      <button
                        className={selectedSemester === "fall26" ? "active" : ""}
                        onClick={() => setSelectedSemester("fall26")}
                      >
                        Fall 2026
                      </button>
                      <button
                        className={selectedSemester === "spring27" ? "active" : ""}
                        onClick={() => setSelectedSemester("spring27")}
                      >
                        Spring 2027
                      </button>
                    </div>

                    {/* NEW: Better loading/error/empty states */}
                    <div style={{ marginBottom: "1.2em" }}>
                      {isLoadingSheet ? (
                        <p>Loading sections…</p>
                      ) : sheetError ? (
                        <p>{sheetError}</p>
                      ) : !activeSheetData || activeSheetData.length === 0 ? (
                        <p>Section data unavailable.</p>
                      ) : sections.length === 0 ? (
                        <p>No sections found for this course.</p>
                      ) : (
                        <table className="sections-table">
                          <thead>
                            <tr>
                              <th>Section</th>
                              <th>Credits</th>
                              <th>Instructor</th>
                              <th>Days</th>
                              <th>Time</th>
                              <th>Room</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sections.map((s, i) => (
                              <tr key={i}>
                                <td>{s.sect}</td>
                                <td>{s.crdt}</td>
                                <td>{s.instructor}</td>
                                <td>{s.days}</td>
                                <td>{formatTimeRange(s.timestart, s.timeend)}</td>
                                <td>{s.room}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                  <button className="search-btn" onClick={() => setSelectedCourse(null)}>
                    Close
                  </button>
                </div>
              </div>
            );
          })()}
          {/* --- END Course Sections Popup --- */}
        </div>
      </main>

      <footer className="footer">
        <span className="footer-text">
          Developed by Khaled Miari for RIT Dubai |{" "}
          <a
            href="https://docs.google.com/document/d/1b_Jvh-drFciVR0QkT0-NWbAfpPMUBGiRQtkv3mb1G4A/edit?usp=sharing"
            className="footer-link"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Terms and Conditions"
            title="Terms and Conditions"
          >
            Terms and Conditions
          </a>{" "}
          | Contact me&nbsp;@
          <a
            href="mailto:km2495@rit.edu"
            className="footer-icon"
            aria-label="Email"
            title="Email"
          >
            <FaEnvelope />
          </a>
          <a
            href="https://linkedin.com/in/khaledmiari"
            className="footer-icon"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="LinkedIn"
            title="LinkedIn"
          >
            <FaLinkedin />
          </a>
        </span>
      </footer>

      {/* Back to Top Button (only visible after scroll) */}
      {/* {showBackToTop && (
        <button
          className="back-to-top"
          onClick={scrollToTop}
          aria-label="Back to top"
        >
          <FaArrowUp />
        </button>
      )} */}
    </div>
  );
}

export default App;