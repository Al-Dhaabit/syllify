import React, { useState, useEffect, useRef } from "react";
import "./App.css";
import { stemmer } from "porter-stemmer";
import {
  FaEnvelope,
  FaLinkedin,
  FaRegLightbulb,
  FaCoffee,
  FaClock,
  FaChevronDown,
  FaArrowUp,
} from "react-icons/fa";

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
    "writing heavy",
    "lots of writing",
    "essay heavy",
    "writing focused",
    "writing based",
  ],
  "advanced elective": [
    "upper level elective",
    "advanced course",
    "specialized elective",
  ],
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

const ALL_TAGS = [
  "no final",
  "no midterm",
  "low quizzes",
  "artistic perspective",
  "ethical perspective",
  "presentation",
  "final project",
  "group project",
  "social perspective",
  "global perspective",
  "writing intensive",
  "advanced elective",
  "science",
  "islamic culture",
];

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

function fuzzyTermFrequency(queryTokens, vocab) {
  const tf = Array(vocab.length).fill(0);
  queryTokens.forEach((qToken) => {
    vocab.forEach((vToken, idx) => {
      if (vToken.startsWith(qToken)) {
        tf[idx] += 1;
      }
    });
  });
  return tf;
}

function tfidfVector(tf, idf) {
  return tf.map((t, i) => t * idf[i]);
}

function cosineSimilarity(a, b) {
  const dot = a.reduce((sum, v, i) => sum + v * b[i], 0);
  const normA = Math.sqrt(a.reduce((sum, v) => sum + v * v, 0));
  const normB = Math.sqrt(b.reduce((sum, v) => sum + v * v, 0));
  if (normA === 0 || normB === 0) return 0;
  return dot / (normA * normB);
}

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

function highlightText(text, queryTokens) {
  if (!queryTokens.length) return text;
  const words = text.split(/(\W+)/);
  return words.map((word, i) => {
    const stemmed = stemmer(word.toLowerCase().replace(/[^a-z]/g, ""));
    if (queryTokens.includes(stemmed) && /[a-z]/i.test(word)) {
      return (
        <span className="highlight" key={i}>
          {word}
        </span>
      );
    }
    return word;
  });
}

// --- STRONGER Damerau–Levenshtein distance ---
function levenshtein(a, b) {
  const dp = Array.from({ length: a.length + 1 }, () =>
    Array(b.length + 1).fill(0)
  );

  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );

      // Damerau transposition
      if (
        i > 1 &&
        j > 1 &&
        a[i - 1] === b[j - 2] &&
        a[i - 2] === b[j - 1]
      ) {
        dp[i][j] = Math.min(dp[i][j], dp[i - 2][j - 2] + 1);
      }
    }
  }
  return dp[a.length][b.length];
}

function isCourseCodeQuery(query) {
  const codePattern = /^[A-Z]{2,5}\s?\d{0,4}$/i;
  return codePattern.test(query.trim());
}

function App() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchHistory, setSearchHistory] = useState([]);
  const [tfidfData, setTfidfData] = useState({
    vocab: [],
    idf: [],
    courseVectors: [],
  });
  const [courses, setCourses] = useState([]);
  const [noResultsVariation, setNoResultsVariation] = useState("");
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [didYouMean, setDidYouMean] = useState("");
  const [closestMatches, setClosestMatches] = useState([]);

  const [showTips, setShowTips] = useState(false);
  const handleShowTips = () => setShowTips(true);
  const handleCloseTips = () => setShowTips(false);

  const [showTipPopup, setShowTipPopup] = useState(false);
  const handleShowTipPopup = () => setShowTipPopup(true);
  const handleCloseTipPopup = () => setShowTipPopup(false);

  const [openRecent, setOpenRecent] = useState(false);
  const dropdownRef = useRef(null);

  // NEW: Back to Top visibility state
  const [showBackToTop, setShowBackToTop] = useState(false);

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
    Promise.all([
      fetch("/courses.json").then((res) => res.json()),
      fetch("/tfidf.json").then((res) => res.json()),
    ]).then(([coursesData, tfidfData]) => {
      setCourses(coursesData);
      setTfidfData(tfidfData);
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
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setShowBackToTop(true);
      } else {
        setShowBackToTop(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (document.documentElement) {
      document.documentElement.scrollTop = 0;
    }
    if (document.body) {
      document.body.scrollTop = 0;
    }
  };

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

    if (RESERVED_COMMANDS.has(queryLower) || isCourseCodeQuery(searchTerm)) {
      if (queryLower === "/all") {
        setResults(courses);
        return;
      } else if (queryLower === "pineapple on pizza") {
        setResults([]);
        return;
      }
    }

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

    // --- Normal search logic ---
    let requiredTags = [];
    let queryForKeywords = queryLower;

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

    if (requiredTags.length > 0) {
      filteredCourses = filteredCourses.filter((course) => {
        if (!course.tags) return false;
        for (const requiredTag of requiredTags) {
          let tagFound = false;
          const normalizedRequiredTag = normalizeTag(requiredTag);
          for (const courseTag of course.tags) {
            if (normalizeTag(courseTag) === normalizedRequiredTag) {
              tagFound = true;
              break;
            }
          }
          if (!tagFound && TAG_SYNONYMS[requiredTag]) {
            for (const synonym of TAG_SYNONYMS[requiredTag]) {
              const normalizedSynonym = normalizeTag(synonym);
              for (const courseTag of course.tags) {
                if (normalizeTag(courseTag) === normalizedSynonym) {
                  tagFound = true;
                  break;
                }
              }
              if (tagFound) break;
            }
          }
          if (!tagFound) {
            return false;
          }
        }
        return true;
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

    if (featureKeywords.length > 0) {
      filteredCourses = filteredCourses.filter((course) => {
        const text = `${course.title} ${course.summary} ${(course.tags || []).join(
          " "
        )}`.toLowerCase();
        return featureKeywords.every((word) =>
          text.includes(word.toLowerCase())
        );
      });
    }

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
        let orMatches = courses.map((course) => {
          const text = `${course.title} ${course.summary} ${(course.tags || []).join(
            " "
          )}`.toLowerCase();
          let matchCount = 0;
          featureKeywords.forEach((word) => {
            if (text.includes(word)) matchCount++;
          });
          requiredTags.forEach((tag) => {
            if (
              (course.tags || [])
                .map((t) => normalizeTag(t))
                .includes(normalizeTag(tag))
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

    if (requiredTags.length > 0) {
      if (filteredCourses.length > 0) {
        setResults(filteredCourses);
        return;
      } else {
        let orMatches = courses.map((course) => {
          let matchCount = 0;
          requiredTags.forEach((tag) => {
            if (
              (course.tags || [])
                .map((t) => normalizeTag(t))
                .includes(normalizeTag(tag))
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

    const queryTokensArr = tokenize(searchTerm);
    const queryTf = fuzzyTermFrequency(queryTokensArr, tfidfData.vocab);
    const queryVec = tfidfVector(queryTf, tfidfData.idf);
    const ranked = courses
      .map((course, i) => ({
        ...course,
        score: cosineSimilarity(queryVec, tfidfData.courseVectors[i]),
      }))
      .sort((a, b) => b.score - a.score);
    const maxScore = ranked.length > 0 ? ranked[0].score : 0;
    const threshold = 0.2;
    const filtered = ranked.filter(
      (c) => c.score > 0 && c.score >= threshold * maxScore
    );
    setResults(filtered.length ? filtered : []);
  };

  const isPineapplePizza = query.trim().toLowerCase() === "pineapple on pizza";

  return (
    <div className="app">
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
                <b>This is a search engine, not ChatGPT:</b>
                <br />
                The more specific your search, the better your results.
              </li>
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
                  <FaRegLightbulb size={18} />
                </button>
                <button
                  className="action-icon"
                  type="button"
                  onClick={handleShowTipPopup}
                  title="Support CoursaLog"
                  aria-label="Support CoursaLog"
                >
                  <FaCoffee size={18} />
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
                    {`${closestMatches.length} closest ${
                      closestMatches.length === 1 ? "match" : "matches"
                    } shown`}
                  </span>
                </>
              )}
            </div>
          )}

          <section
            className={`results${
              hasSearched && results.length === 0 && closestMatches.length === 0
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
              (results.length > 0 ? results : closestMatches).map((course) => (
                <div className="course-card" key={course.id}>
                  <div className="course-header">
                    <span className="course-title">
                      {highlightText(course.title, tokenize(query))}
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
                </div>
              ))}
          </section>
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
            <FaEnvelope size={22} />
          </a>
          <a
            href="https://linkedin.com/in/khaledmiari"
            className="footer-icon"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="LinkedIn"
            title="LinkedIn"
          >
            <FaLinkedin size={22} />
          </a>
        </span>
      </footer>

      {/* Back to Top Button (only visible after scroll) */}
      {showBackToTop && (
        <button
          className="back-to-top"
          onClick={scrollToTop}
          aria-label="Back to top"
        >
          <FaArrowUp size={20} />
        </button>
      )}
    </div>
  );
}

export default App;