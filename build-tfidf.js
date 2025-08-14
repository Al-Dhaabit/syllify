const fs = require("fs");
const { stemmer } = require("porter-stemmer");

const courses = [
 {
  id: 1,
  code: "ENGL211",
  title: "Introduction to Creative Writing: Prose and Poetry",
  summary:
    "Explore fiction, nonfiction, and poetry through writing, peer workshops, and revision.\n---\nGrading: 30% workshop pieces, 60% portfolios (fiction, nonfiction, poetry), 10% terminology quiz. Assessment is project-based with a strong focus on writing and revision; only one quiz.",
  tags: ["no midterm", "no final", "artistic perspective", "writing intensive"]
},
{
  id: 2,
  code: "NSSA241",
  title: "Introduction to Routing and Switching",
  summary:
    "Provides an introduction to wired network infrastructures, topologies, technologies, and protocols for end-to-end communication. Covers TCP/IP protocol suite, Ethernet LAN, switching, and routing protocols. Labs mirror lecture content for hands-on learning.\n---\nGrading: 20% quizzes (4), 30% labs (5), 20% midterm exam, 30% final exam. Assessments include quizzes, lab activities (some group-based), a midterm, and a comprehensive final exam.",
  tags: ["networking"]
},
{
  id: 3,
  code: "GCIS124",
  title: "Software Development and Problem Solving II",
  summary:
    "A second course in computational problem solving, focusing on object-oriented programming and software engineering using Java. Covers classes, objects, encapsulation, inheritance, interfaces, polymorphism, UML, data structures (lists, trees, sets, maps, graphs), exception handling, I/O, concurrency, and GUIs. Emphasizes software design principles, test-driven development, teamwork, and practical coding assignments.\n---\nGrading: 18% quizzes (3), 32% assignments (4), 20% midterm exam, 30% final exam. Assessments include quizzes, individual and group assignments, a midterm practical, and a comprehensive final exam.",
  tags: ["programming", "Java"]
},
{
  id: 4,
  code: "BIOL101",
  title: "General Biology I",
  summary:
    "Introductory biology course covering cellular, molecular, and evolutionary biology. Topics include cell structure and function, macromolecules, genetics, enzymes, cell division, biotechnology, and evolution.\n---\nGrading: 15% homework (3), 10% quizzes (3), 25% midterm, 25% lab activity, 25% final project. Assessment includes regular homework, quizzes, a midterm exam, lab activity, and a final research project presentation.",
  tags: ["final project", "science", "no final"]
},
{
  id: 5,
  code: "CSEC140",
  title: "Introduction to Cybersecurity",
  summary:
    "Introductory course covering core cybersecurity concepts including authentication, cryptography, risk management, data and network security, application security, and societal/ethical issues.\n---\nGrading: 20% labs (4), 15% term paper, 10% presentation, 25% midterm, 30% final exam. Assessment includes hands-on labs, a group term paper and presentation, and comprehensive exams.",
  tags: ["networking", "hacker"]
},
{
  id: 6,
  code: "GCIS123",
  title: "Software Development and Problem Solving I",
  summary:
    "An introduction to computational problem solving and programming using Python. Covers problem decomposition, algorithms, debugging, software engineering concepts, and basic data structures such as arrays and stacks. Includes both in-class and out-of-class assignments, group work, and hands-on activities.\n---\nGrading: 15% quizzes (5), 20% class activities & problem solving (4), 15% assignments (3), 20% midterm exam, 30% final exam. Assessments include quizzes, coding activities, assignments, a midterm (practical and written), and a comprehensive final exam.",
  tags: ["programming", "Python"]
},
{
  id: 7,
  code: "UWRT150",
  title: "Writing Seminar",
  summary:
    "Develops first-year students' proficiency in analytical writing, rhetorical reading, and critical thinking. Focuses on academic and non-fiction texts, argumentation, research, and the writing process. Emphasizes teacher-student conferencing, peer review, and academic honesty. Coursework includes research paper assignments, annotated bibliography, poster, peer review, and class participation.\n---\nGrading: 15% SPQ+ APA Test, 15% Annotated Bibliography, 15% Research Paper Proposal, 10% Class Participation, 10% Research Paper Poster, 5% Draft of Research Paper (in-class exam), 10% Peer Comments, 5% Peer Review Reflection Paper, 15% Final Research Paper.",
  tags: ["no midterm", "no final", "presentation", "writing intensive"]
},
{
  id: 8,
  code: "PSYC101",
  title: "Introduction to Psychology",
  summary:
    "A survey of basic concepts, theories, and research methods in psychology. Topics include neuroscience, sensation and perception, learning, memory, cognition, motivation, emotion, personality, psychological disorders, therapy, and social psychology. Includes lectures, experimental labs, discussions, quizzes, assignments, oral presentation, midterm, and final exam.\n---\nGrading: 15% SmartBook assignments (5), 25% quizzes (5), 10% in-class activities (5), 5% oral presentation, 20% midterm, 25% final exam.",
  tags: ["science", "social perspective"]
},
{
  id: 9,
  code: "MATH181",
  title: "Calculus I",
  summary:
    "First in a two-course sequence for math, science, or engineering majors. Covers functions, limits, continuity, derivatives, differentiation rules, applications of derivatives, Riemann sums, definite and indefinite integrals. Emphasizes conceptual understanding and problem solving, with lectures, recitations, quizzes, homework, and exams.\n---\nGrading: 21% quizzes (3), 15% homework assignments (5), 17% midterm 1, 17% midterm 2, 30% final exam.",
  tags: ["mathematics", "STEM"]
},
{
  id: 10,
  code: "ANTH365",
  title: "Culture and Politics in the Middle East",
  summary:
    "Examines the diverse cultures and peoples of the Middle East in the context of political and economic forces, both past and present. Topics include European colonialism and its legacies, ethnic inequalities, economic vulnerability, labor migration, urbanism, social unrest, art, music, oral traditions, literature, political activism, religious diversity, gender, rebellion, revolution, war, and globalization. The course is lecture-based with supplemental media, daily individual work, and group discussion. Includes quizzes, a midterm, a final exam, an essay, a presentation, and a material culture exercise.\n---\nGrading: 30% final exam, 20% midterm, 25% essay & presentation, 15% coursework/readings, 10% material culture exercise.",
  tags: ["islamic culture"]
},
{
  id: 11,
  code: "BIOL102",
  title: "General Biology II",
  summary: "Introduces animal and plant anatomy, physiology, and ecology. Topics include animal and plant development, body systems, photosynthesis, coevolution, terrestrial and aquatic ecosystems, population and community ecology, animal behavior, and conservation biology. The course uses lectures, homework, quizzes, a lab activity, a midterm, and a final research project with presentation. Emphasizes scientific terminology, critical thinking, and active participation.\n---\nGrading: 35% final project (report & presentation), 20% midterm exam, 20% lab activity, 15% homework (3), 10% quizzes (3) .",
  tags: ["science", "no final", "final project"]
},
{
  id: 12,
  code: "COMM212",
  title: "Public Relations",
  summary: "An introduction to the theory and practice of public relations, including history, research, law, ethics, and social responsibility. Students develop skills in writing news releases and speeches, evaluating research methods, and planning and producing PR campaigns. The course features lectures, in-class activities, group projects, case studies, presentations, and writing assignments, emphasizing professional communication and campaign strategy.\n---\nGrading: 20% midterm, 20% final, 20% PR campaign project, 15% writing for PR, 15% CSR campaign, 10% quizzes (2).",
  tags: ["branding", "outreach", "collaboration", "creativity", "group work"]
},
{
  id: 13,
  code: "MATH241",
  title: "Linear Algebra",
  summary: "An introduction to the fundamental concepts and techniques of linear algebra, including matrix operations, linear transformations, Gaussian elimination, determinants, vector spaces, independence, basis, eigenvalues, eigenvectors, similarity, and diagonalization. Emphasizes problem solving, mathematical reasoning, and applications. Coursework includes homework, quizzes, two midterms, and a comprehensive final exam.\n---\nGrading: 15% homework (2), 25% quizzes (5), 15% midterm I, 15% midterm II, 30% final exam.",
  tags: ["proofs", "STEM", "theory", "calculation", "in-person"]
},
{
  id: 14,
  code: "CSEC99",
  title: "Cooperative Education Seminar",
  summary: "Prepares students for the job search and professional experience in engineering fields. Covers strategies for job applications, resume and cover letter writing, behavioral interviewing, and effective use of social media. Emphasizes professional and ethical responsibilities, workplace skills, and creative problem solving through design thinking. Coursework includes assignments on CVs, LinkedIn profiles, interviews, ethics, and a group case study.\n---\nGrading: S/F based on points: 25% CV, 20% LinkedIn profile, 20% interview, 20% case study (group), 15% ethics assignment.",
  tags: ["career", "networking", "design thinking", "workplace", "presentation", "CO-OP", "no final"]
},
{
  id: 15,
  code: "CSEC201",
  title: "Programming for Information Security",
  summary: "Builds on basic programming skills to prepare students for computing security. Covers network programming, memory management, operating system calls, compilation, and the relationship between high-level and low-level programming. Focuses on identifying and exploiting memory corruption vulnerabilities, with hands-on activities in C, Python, and x86 assembly. Assessment includes class activities, a group project, a midterm, and a final exam.\n---\nGrading: 30% class activities (3), 20% project, 25% midterm, 25% final exam.",
  tags: ["exploitation", "assembly", "sockets", "malware", "reverse engineering"]
},
{
  id: 16,
  code: "CSEC202",
  title: "Reverse Engineering Fundamentals",
  summary: "Introduces core concepts and tools for analyzing unknown source code and binaries. Covers low-level programming languages, the relationship between high-level and low-level code, and techniques for static and dynamic analysis. Students use debuggers, perform code tracing, and complete practical assignments and projects to build foundational skills for further study in malware analysis.\n---\nGrading: 40% homework assignments (4), 20% midterm exam, 30% project, 10% quizzes (2).",
  tags: ["debugging", "binary analysis", "static analysis", "dynamic analysis", "malware", "no final"]
},
{
  id: 17,
  code: "ENGL260",
  title: "Written Argument",
  summary: "A rigorous introduction to rhetoric and the art of persuasion, exploring how language shapes meaning, identity, and social change. Students analyze rhetorical theory from ancient to contemporary sources, examine the ethical dimensions of argument, and study the role of texts in shaping knowledge and ideology. Coursework includes analysis of written and visual texts, debates, research, and composing arguments for diverse audiences.\n---\nGrading: 15% autoethnography, 10% reading quizzes (11), 20% midterm, 15% debate, 25% disciplinary analysis, 15% synthesis paper.",
  tags: ["rhetoric", "critical thinking", "debate", "media", "discourse", "artistic perspective", "ethical perspective", "writing intensive", "no final"]
},
{
  id: 18,
  code: "ENGL418",
  title: "Major Authors",
  summary: "Provides an in-depth study of the life and works of a significant writer, focusing on their literary contributions and cultural impact. Students read multiple works by a single author, analyze the author's life and historical context, and examine critical responses to their work. The course emphasizes literary criticism, artistic expression, and the analysis of human experience through various assignments, including critical response papers, multimedia projects, quizzes, a midterm, and a research paper with presentation.\n---\nGrading: 25% critical response papers (2), 20% multimedia project, 15% reading quizzes (5), 15% midterm, 25% research paper and presentation.",
  tags: ["literature", "historical context", "multimedia", "artistic perspective", "research", "no final"]
},
{
  id: 19,
  code: "MATH190",
  title: "Discrete Math for Computing",
  summary: "Introduces fundamental concepts and techniques from discrete mathematics widely used in computer science. Topics include propositional and predicate logic, set theory, relations, functions, recursion, counting, equivalence relations, and partial orders. Emphasizes mathematical reasoning, abstraction, and problem solving, with applications to computing. Assessment includes homework, quizzes, a midterm, and a final exam.\n---\nGrading: 25% midterm exam, 20% homework assignments (5), 25% quizzes (5), 30% final exam.",
  tags: ["logic", "abstraction", "proofs", "problem solving", "computing"]
},
{
  id: 20,
  code: "HIST150",
  title: "World History Since 1500",
  summary: "Explores the emergence of the contemporary global order from 1500 to the present, focusing on political, social, economic, and technological developments. Examines intercultural and transregional interactions, major revolutions, and the evolution of global systems. Students analyze primary sources, compare historical systems, and critique established interpretations through essays, presentations, a midterm, and a final exam.\n---\nGrading: 25% essay, 25% presentation, 25% midterm, 25% final exam.",
  tags: ["revolutions", "primary sources", "comparison", "interpretation", "global perspective"]
},
{
  id: 21,
  code: "MATH101",
  title: "College Algebra",
  summary: "Provides foundational algebra skills for students preparing for calculus. Topics include linear, quadratic, fractional, exponential, logarithmic, and rational equations; functions and their graphs; systems of equations; and polynomial operations. Emphasizes problem solving, conceptual understanding, and mathematical reasoning. Assessment includes quizzes, two midterms, and a comprehensive final exam.\n---\nGrading: 20% quizzes (6), 25% midterm I, 25% midterm II, 30% final exam.",
  tags: ["functions", "equations", "precalculus", "reasoning", "STEM"]
},
{
  id: 22,
  code: "MATH182",
  title: "Calculus II",
  summary: "Second in a two-course sequence for mathematics, science, or engineering majors. Covers techniques of integration (including by parts, partial fractions, improper integrals), applications of integration, infinite series, convergence and divergence, parametric curves, and polar coordinates. Emphasizes conceptual understanding, problem solving, and real-world applications. Assessment includes homework, quizzes, two midterms, and a comprehensive final exam.\n---\nGrading: 15% homework assignments (3), 25% quizzes (4), 15% midterm exam 1, 15% midterm exam 2, 30% final exam.",
  tags: ["integration", "series", "STEM", "problem solving", "applications"]
},
{
  id: 23,
  code: "NSSA245",
  title: "Network Services",
  summary: "Investigates protocols and tasks involved in configuring and administering network-based services in virtualized Linux and Windows environments. Topics include TCP/IP, TCP and UDP, DHCP, DNS, SSH, and VoIP. Students gain theoretical knowledge and hands-on experience in administering, monitoring, securing, and troubleshooting network services. Assessment includes quizzes, labs, a midterm, and a comprehensive final exam.\n---\nGrading: 15% quizzes (3), 40% labs (4), 20% midterm exam, 25% final exam.",
  tags: ["TCP/IP", "virtualization", "VoIP", "administration", "security"]
},
{
  id: 24,
  code: "PSYC222",
  title: "Biopsychology",
  summary: "Introduction to behavioral neuroscience, focusing on the neurobiological basis of cognition and behavior. Topics include neuroanatomy, physiology, localization of function, brain injury, research methods, and the biological basis of language, memory, emotion, consciousness, and sexual behavior from an evolutionary perspective. Assessment includes quizzes or assignments, a midterm, a neuroscience research methods paper, and a comprehensive final exam.\n---\nGrading: 30% quizzes or assignments (6), 25% midterm exam, 15% neuroscience research methods paper, 30% final exam.",
  tags: ["neuroscience", "brain", "behavior", "research", "science", "social perspective"]
},
{
  id: 25,
  code: "PSYC225",
  title: "Social Psychology",
  summary: "Explores individual behaviors and mental processes in social situations. Topics include social perception, social cognition, the self, attitudes, prejudice, attraction, social influence, pro-social behavior, aggression, and group behaviors. Course activities include lectures, demonstrations, assignments, presentations, and group projects. Assessment includes a micro-presentation, home assignment, critical essay, group presentation, midterm exam, and final exam.\n---\nGrading: 10% micro-presentation, 10% home assignment, 10% critical essay, 20% group presentation, 25% midterm exam, 25% final exam.",
  tags: ["groups", "attitudes", "influence", "presentation", "social perspective"]
},
{
  id: 26,
  code: "PSYC241",
  title: "Health Psychology",
  summary: "Introduces the role of behavior in health and the impact of psychological factors on physical well-being. Topics include stress and health, health behaviors, chronic illness, addiction, positive psychology, pain management, critical thinking about health products, and research methods in health psychology. Assessment includes quizzes, a midterm exam, a final exam, reflective writing, and a research presentation.\n---\nGrading: 10% quiz 1, 10% quiz 2, 20% midterm exam, 25% final exam, 15% reflective writing, 20% research presentation.",
  tags: ["well-being", "addiction", "prevention", "research", "behavior"]
},
{
  id: 27,
  code: "PSYC251",
  title: "Research Methods II",
  summary: "Advanced research methods course in psychology building on foundational knowledge from Research Methods I. Covers experimental and non-experimental design, statistical analysis, IRB applications, ethics training, observational and survey research, and APA-style presentation of results. Assessment includes assignments, a midterm exam, IRB application and ethics training, research paper peer review, a research paper, and a poster presentation.\n---\nGrading: 25% assignments (5), 25% midterm exam, 10% IRB application and CITI ethics training, 5% research paper peer review, 25% research paper, 10% research paper poster presentation.",
  tags: ["experiments", "ethics", "statistics", "APA style", "quantitative"]
},
{
  id: 28,
  code: "PSYC250",
  title: "Research Methods I",
  summary: "Introduction to research methods in psychology, focusing on research design, analysis, and scientific writing. Topics include experimental and non-experimental methods, research ethics, hypothesis development, statistical concepts, interpreting results, and APA-style research and review papers. Assessment includes quizzes, a final exam, a literature review assignment, a research proposal presentation, and a written research proposal.\n---\nGrading: 25% quizzes (5), 20% final exam, 15% literature review assignment, 15% research proposal presentation, 25% research proposal assignment.",
  tags: ["design", "APA style", "ethics", "statistics", "writing"]
},
{
  id: 29,
  code: "PSYC236",
  title: "Personality",
  summary: "Covers the history and current status of major personality theories, including psychoanalytic, behaviorist, humanistic, and trait perspectives. Students learn the strengths and weaknesses of each theory, as well as methods for assessing, researching, and applying personality theories to real-life situations. Assessment includes two quizzes, a midterm exam, a presentation project, and a final exam.\n---\nGrading: 10% quiz 1, 15% quiz 2, 25% midterm exam, 25% presentation, 25% final exam.",
  tags: ["theories", "assessment", "traits", "application", "psychology"]
},
{
  id: 30,
  code: "MLFR201",
  title: "Beginning French I",
  summary: "First in a two-course sequence for students with no prior exposure to French. Focuses on developing proficiency in speaking, listening, reading, and writing, with an emphasis on oral communication and contemporary culture in French-speaking countries. Students practice grammar, vocabulary, and cultural competence through lectures, activities, homework, quizzes, presentations, a midterm, and a final exam.\n---\nGrading: 10% homework (4), 20% quizzes (2), 20% presentations (2), 20% midterm, 30% final exam.",
  tags: ["language", "communication", "culture", "oral proficiency", "global perspective"]
},
{
  id: 31,
  code: "SOCI102",
  title: "Social and Cultural Theory",
  summary: "Introduces the study of society, socialization, and social structures through both macro- and micro-sociological perspectives. Covers major theoretical paradigms, social groups, inequality, institutions, culture, social change, deviance, class, race, gender, and global issues. Assessment includes quizzes, a midterm, a critical essay, group project and presentation, participation, and a comprehensive final exam.\n---\nGrading: 10% quizzes (2), 20% midterm, 10% critical essay, 20% group project and presentation, 10% participation, 30% final exam.",
  tags: ["inequality", "institutions", "culture", "socialization"]
},
{
  id: 32,
  code: "NSSA221",
  title: "Systems Administration I",
  summary: "Introduces the role of the system administrator in large organizations, covering operating systems, system security, network and service deployment strategies, and automation. Students gain hands-on experience through labs and projects, learning about enterprise network security, scripting, and best practices in the field. Assessment includes lab reports, quizzes, a site book, a midterm project, and a comprehensive final exam.\n---\nGrading: 30% lab reports (5), 15% quizzes (3), 5% site book, 20% midterm project, 30% final exam.",
  tags: ["automation", "security", "Linux", "Windows", "networks"]
},
{
  id: 33,
  code: "STAT145",
  title: "Introduction to Statistics I",
  summary: "Introduces statistical methods for extracting meaning from data and basic inferential statistics. Topics include data integrity, exploratory data analysis, data visualization, summary measures, normal and sampling distributions, confidence intervals, and hypothesis testing. Emphasizes statistical thinking and the use of software. Assessment includes homework, quizzes, a project and presentation, a midterm exam, and a comprehensive final exam.\n---\nGrading: 10% homework (5), 20% quizzes (4), 15% project, 5% project presentation, 20% midterm exam, 30% final exam.",
  tags: ["data", "inference", "visualization", "software", "quantitative"]
},
{
  id: 34,
  code: "STAT146",
  title: "Introduction to Statistics II",
  summary: "Elementary introduction to regression and analysis of variance, with a focus on business applications. Topics include confidence intervals, hypothesis testing, ANOVA, chi-square tests, regression analysis, and correlation. Emphasizes statistical thinking, data analysis, and the use of statistical software. Assessment includes quizzes, homework, two midterm exams, and a comprehensive final exam.\n---\nGrading: 20% quizzes (4), 20% homework (4), 15% midterm exam I, 15% midterm exam II, 30% final exam.",
  tags: ["regression", "ANOVA", "business", "software", "data analysis"]
},
{
  id: 35,
  code: "MATH161",
  title: "Applied Calculus",
  summary: "Introduction to differential and integral calculus with applications in business, management, and life sciences. Topics include functions and graphs, limits, continuity, derivatives, applications of derivatives, definite integrals, the fundamental theorem of calculus, techniques of integration, exponential and logarithmic functions, differential equations, and geometric series. Emphasizes manipulative skills and real-world problem solving. Assessment includes homework, classwork, quizzes, a midterm, and a comprehensive final exam.\n---\nGrading: 15% homework assignments (3), 15% classwork assignments (3), 20% quizzes (3), 20% midterm exam, 30% final exam.",
  tags: ["business", "integration", "differentiation", "applications", "STEM"]
},
{
  id: 36,
  code: "CHMG141",
  title: "General and Analytical Chemistry I",
  summary: "General chemistry course for life and physical sciences, emphasizing empirical evidence, conceptual models, and mathematical tools. Covers atomic structure, chemical bonds, chemical reactions, stoichiometry, thermochemistry, gases, quantum theory, periodicity, bonding theories, and introductory organic chemistry. Includes applications to real-world problems and laboratory work. Assessment includes homework, quizzes, a midterm exam, a lab activity, and a comprehensive final exam.\n---\nGrading: 10% homework assignments (3), 15% quizzes (3), 20% midterm exam, 20% lab activity, 35% final exam.",
  tags: ["chemistry", "reactions", "stoichiometry", "lab", "science"]
},
{
  id: 37,
  code: "ANTH102",
  title: "Cultural Anthropology",
  summary: "Explores human cultural diversity and the tools for understanding and appreciating cultural differences. Examines the relationship between individuals and communities, ritual, religion, politics, and social life across the globe. Covers key theories, research methods, cultural similarities and differences, and the interplay of local and global processes. Assessment includes quizzes, a midterm, a critical essay, group project and presentation, participation, and a comprehensive final exam.\n---\nGrading: 10% quizzes (2), 20% midterm, 10% critical essay, 20% group project and presentation, 10% participation, 30% final exam.",
  tags: ["diversity", "culture", "ethnography", "society", "global perspective"]
},
{
  id: 38,
  code: "MATH131",
  title: "Discrete Mathematics",
  summary: "Introduction to discrete mathematics covering number systems, sets and logic, relations, combinatorics, graph theory, regular sets, vectors, and matrices. Students learn set theory notation, proof techniques, binary/octal/hexadecimal representations, induction, combinatorial methods, matrix operations, graph properties, algorithms, and finite state automata. Assessment includes assignments, quizzes, a midterm exam, and a comprehensive final exam.\n---\nGrading: 30% midterm exam, 20% quizzes (4), 20% assignments (5), 30% final exam.",
  tags: ["logic", "proofs", "combinatorics", "graphs", "algorithms"]
},
{
  id: 39,
  code: "ENGL309",
  title: "The Short Story",
  summary: "Explores the short story as a dynamic and innovative literary genre. Students read a variety of short stories to understand their defining features, analyze them in social and cultural contexts, and develop skills in literary analysis and critique. The course emphasizes discussion, group work, and critical engagement with literary devices and theories. Assessment includes two critical responses, a midterm, final presentations, and reflections.\n---\nGrading: 20% critical response 1, 20% critical response 2, 20% midterm, 20% final presentations, 20% reflections.",
  tags: ["literature", "analysis", "artistic perspective", "writing intensive", "genre", "no final"]
},
{
  id: 40,
  code: "ISTE140",
  title: "Web & Mobile I",
  summary: "Introduction to Internet and web technologies, focusing on development for Macintosh/UNIX platforms. Covers HTML, CSS, digital images, web page design, web publishing, user experience, mobile design, and copyright/intellectual property. Emphasizes web standards, design principles, and hands-on projects. Assessment includes two web projects, homework assignments, quizzes, a midterm exam, and a comprehensive final exam.\n---\nGrading: 5% web project 1, 10% web project 2, 15% homework assignments (3), 20% quizzes (3), 20% midterm exam, 30% final exam.",
  tags: ["web", "HTML", "CSS", "design", "mobile"]
},
{
  id: 41,
  code: "ISTE230",
  title: "Introduction to Database and Data Modeling",
  summary: "Covers fundamental concepts and theories for organizing and structuring data. Topics include data modeling, entity-relationship diagrams, relational models, normalization, relational algebra, database schema mapping, SQL, and database security. Students complete practical exercises and a final project involving conceptual, logical, and physical database design. Assessment includes quizzes, practical exercises, a midterm exam, and a final project with presentation.\n---\nGrading: 18% quizzes (4), 32% practical exercises (4), 30% midterm exam, 20% final project.",
  tags: ["databases", "SQL", "modeling", "normalization", "project", "no final"]
},
{
  id: 42,
  code: "ISTE240",
  title: "Web and Mobile II",
  summary: "Builds on web development basics to cover theories, issues, and technologies for designing and developing web sites. Topics include usability, accessibility, information architecture, graphic design, client-side programming (JavaScript, DOM), server-side programming (Spring, Java), databases, HTTP, and dynamic page generation. Emphasizes teamwork, project work, and proficiency in Git/GitHub. Assessment includes class activities, a group project, quizzes, a midterm exam, and a comprehensive final exam.\n---\nGrading: 15% class activities (3), 30% project, 10% quizzes (2), 20% midterm exam, 25% final exam.",
  tags: ["web", "JavaScript", "Spring", "databases", "teamwork"]
},
{
  id: 43,
  code: "ISTE340",
  title: "Client Programming",
  summary: "Explores the analysis, design, development, and implementation of client-side programming for web, mobile, and desktop applications. Topics include standards-based tools and technologies, user interface design, interaction control structures, data handling, synchronous and asynchronous I/O, and platform compatibility. Emphasizes practical skills with React and JavaScript, milestone-based progress, and a final project. Assessment includes four milestones and a final exam or project.\n---\nGrading: 15% milestone 1, 15% milestone 2, 15% milestone 3, 15% milestone 4, 40% final exam/project.",
  tags: ["React", "JavaScript", "UI", "web", "asynchronous"]
},
{
  id: 44,
  code: "MGMT340",
  title: "Business Ethics and Corporate Social Responsibility",
  summary: "Applies concepts of ethics to business at both macro and micro levels. Examines business ideologies, ethical concerns of capitalism, stakeholder theory, corporate governance, marketing and advertising ethics, employee rights and responsibilities, product safety, environmental responsibility, and ethical leadership. Emphasizes ethical reasoning, leadership, and the development of a culture of integrity. Assessment includes critical analyses, a midterm assessment, a group project, and an end-term assessment.\n---\nGrading: 20% critical analysis of problems, 20% mid-term assessment, 30% group project, 30% end-term assessment.",
  tags: ["ethics", "CSR", "leadership", "stakeholders"]
},
{
  id: 45,
  code: "NSSA102",
  title: "Computer System Concepts",
  summary: "Covers essential technologies for NSSA majors, focusing on PC and mainframe hardware, system operation, configuration, and internal components. Topics include computer architecture, operating system interactions, physical security, number systems, binary arithmetic, and ethical issues in computing. Students gain hands-on experience with assembly language, OS loading in VMs, and hardware/software operations. Assessment includes homeworks, labs, a midterm exam, and a comprehensive final exam.\n---\nGrading: 7% homework, 8% homework, 10% homework, 20% labs (4), 25% midterm exam, 30% final exam.",
  tags: ["hardware", "architecture", "assembly", "operating systems", "security"]
},
{
  id: 46,
  code: "PHIL202",
  title: "Foundations of Moral Philosophy",
  summary: "Survey of foundational and normative approaches to moral philosophy, including virtue ethics, deontology, consequentialism, and related questions about human nature, moral obligations, reasoning, and universal goods. Students critically assess philosophical theories, explore connections to other philosophical disciplines, and develop skills in argumentation and analysis. Assessment includes participation, discussion board posts, chapter presentations, study guides, essay argument reconstruction, and a comprehensive final exam.\n---\nGrading: 15% participation, 15% discussion board posts (2), 20% chapter presentation, 15% study guide, 15% essay argument reconstruction, 20% final exam.",
  tags: ["ethics", "reasoning", "argument", "analysis", "philosophy", "ethical perspective"]
},
{
  id: 47,
  code: "PHYS211",
  title: "University Physics I",
  summary: "Calculus-based physics course for science and engineering majors. Topics include kinematics, Newton's laws, gravitation, work and energy, momentum, conservation laws, systems of particles, rotational motion, static equilibrium, oscillations, waves, and data analysis. The course integrates lecture, workshop, and lab activities. Assessment includes worksheets, homework, quizzes, labs, a midterm exam, and a comprehensive final exam.\n---\nGrading: 10% worksheets, 10% homework, 20% quizzes, 10% labs, 25% midterm exam, 25% final exam.",
  tags: ["physics", "mechanics", "calculus", "lab", "science"]
},
{
  id: 48,
  code: "PHYS212",
  title: "University Physics II",
  summary: "Continuation of University Physics I, covering electrostatics, Gauss' law, electric fields and potential, capacitance, resistance, DC circuits, magnetism, Ampere's law, inductance, electromagnetic waves, and optics. Integrates lecture, workshop, and lab activities. Emphasizes problem solving, data analysis, and scientific reasoning. Assessment includes worksheets, homework, quizzes, labs, a midterm exam, and a comprehensive final exam.\n---\nGrading: 10% worksheets, 10% homework, 20% quizzes, 10% labs, 25% midterm exam, 25% final exam.",
  tags: ["physics", "electricity", "magnetism", "optics", "science"]
},
{
  id: 49,
  code: "ISEE323",
  title: "Systems and Facilities Planning",
  summary: "Introduces quantitative models for layout, material handling, and warehousing in industrial engineering. Topics include product and process analysis, flow of materials, material handling systems, warehousing, and layout design. Students use computer-aided layout design tools, develop from-to charts, solve facility location problems, and design and evaluate layout alternatives. Assessment includes three homework assignments, labs, a midterm exam, and a comprehensive final exam.\n---\nGrading: 10% homework 1, 5% homework 2, 10% homework 3, 15% labs, 30% midterm exam, 30% final exam.",
  tags: ["facilities", "layout", "optimization", "warehousing", "engineering"]
},
{
  id: 50,
  code: "ISEE350",
  title: "Engineering Management",
  summary: "Covers fundamental engineering management principles with an emphasis on project management. Topics include project management characteristics, network scheduling techniques (PERT/CPM, crashing, resource leveling), mathematical analysis, decision-making models, earned value analysis, risk and uncertainty, and ethical decision-making. Students work in teams on a case study/project and apply management tools to real-world engineering scenarios. Assessment includes three homework assignments, a case study/project, a midterm exam, and a comprehensive final exam.\n---\nGrading: 5% homework 1, 5% homework 2, 5% homework 3, 25% case study/project, 30% midterm exam, 30% final exam.",
  tags: ["management", "project", "scheduling", "risk", "ethics"]
},
{
  id: 51,
  code: "MATH221",
  title: "Multivariable & Vector Calculus",
  summary: "Studies calculus of functions of two or more variables, including vectors, vector-valued functions, limits, partial derivatives, multiple integrals, Stokes' Theorem, Green's Theorem, and the Divergence Theorem. Emphasizes differentiation and integration techniques for multivariable functions, vector calculus, and applications in physics. Assessment includes homework, quizzes, a midterm exam, and a comprehensive final exam.\n---\nGrading: 10% homework (3), 40% quizzes (4), 20% midterm exam, 30% final exam.",
  tags: ["calculus", "vectors", "integration", "theorems", "STEM"]
},
{
  id: 52,
  code: "ISEE330",
  title: "Ergonomics and Human Factors",
  summary: "Covers the physical and cognitive aspects of human performance to design workplaces, products, and processes that align with human capabilities and limitations. Topics include ergonomic assessment tools, human modeling, anthropometry, cognitive processes, display and control design, and human-computer interface design. Students conduct lab experiments, write technical reports, and complete a course project. Assessment includes homeworks, quizzes, lab reports, a course project, a midterm, and a final exam.\n---\nGrading: 5% homework 1, 5% homework 2, 5% homework 3, 5% homework 4, 5% quiz 1, 5% quiz 2, 5% quiz 3, 20% lab reports (1-9), 15% course project, 15% midterm, 15% final.",
  tags: ["ergonomics", "human factors", "lab", "design", "engineering"]
},
{
  id: 53,
  code: "ISEE345",
  title: "Engineering Economy",
  summary: "Introduces the financial analysis of engineering projects, covering time value of money, methods for comparing alternatives, depreciation, depletion, income tax considerations, and capital budgeting. Students learn to compute present worth, internal rate of return, and other metrics, analyze financial statements, and evaluate project alternatives. Assessment includes homework, quizzes, a project/case study, a midterm exam, and a comprehensive final exam.\n---\nGrading: 15% homework, 15% quizzes, 20% project/case, 20% midterm exam, 30% final exam.",
  tags: ["economics", "finance", "projects", "analysis", "engineering"]
},
{
  id: 54,
  code: "ISEE200",
  title: "Computing for Engineers",
  summary: "Introduces software engineering techniques and their applications in industrial and systems engineering. Covers computer programming fundamentals, algorithm development, software engineering, computational problem solving, and data analytics using Python. Students complete quizzes, a midterm, and a final exam, and develop computer-based solutions to engineering problems.\n---\nGrading: 10% quiz 1, 10% quiz 2, 10% quiz 3, 10% quiz 4, 30% midterm exam, 30% final exam.",
  tags: ["Python", "programming", "algorithms", "data analysis", "engineering"]
},
{
  id: 55,
  code: "ISEE120",
  title: "Fundamentals of IE",
  summary: "Introduces industrial engineering and foundational tools used in the profession. Topics include systems design, integration, problem solving, improvement tools, supply chain concepts, technical reporting, and project management. Students participate in lectures, labs, projects, and group exercises. Assessment includes classwork, homework, labs, quizzes, exams, a case study/project, and a final exam.\n---\nGrading: 30% class/homework/lab, 10% quizzes, 20% exams, 15% case study/project, 25% final exam.",
  tags: ["industrial engineering", "systems", "project", "lab", "tools"]
},
{
  id: 56,
  code: "ISEE301",
  title: "Operations Research",
  summary: "Introduction to optimization and mathematical programming techniques, including linear programming, transportation and assignment algorithms, and their applications in manufacturing, healthcare, finance, and supply chain. Emphasizes sensitivity analysis, decision-making, and the use of software tools for modeling large discrete optimization problems. Assessment includes lab exams and assignments, coursework/homework/quizzes, exams, and a final exam.\n---\nGrading: 30% lab (exams & assignments), 30% coursework/homework/quizzes, 20% exams, 20% final exam.",
  tags: ["optimization", "linear programming", "decision-making", "software", "engineering"]
},
{
  id: 57,
  code: "MECE200",
  title: "Fundamentals of Mechanics",
  summary: "Covers statics, strength of materials, and dynamics for mechanical and industrial engineering students. Topics include equilibrium, force systems, centroids, trusses, friction, axial stresses and strains, torsion, bending, kinematics, kinetics, work, energy, impulse, momentum, and mechanical vibrations. Emphasizes problem solving and application of engineering principles. Assessment includes homework assignments, quizzes, classwork, two midterm exams, and a comprehensive final exam.\n---\nGrading: 10% homework assignments, 20% quizzes, classwork (unweighted), 20% midterm exam 1, 20% midterm exam 2, 30% final exam.",
  tags: ["mechanics", "statics", "dynamics", "engineering", "problem solving"]
},
{
  id: 58,
  code: "ISEE304",
  title: "Fundamentals of Materials Science",
  summary: "Overview of the structure, properties, and processing of metals, polymers, ceramics, and composites. Emphasizes the impact of materials on manufacturing optimization, throughput, and quality in industrial engineering. Topics include crystalline structures, heat treatment, stress and strain, material selection, and experimental data analysis. Assessment includes homework, lab sessions, quizzes, two midterms, and a comprehensive final exam.\n---\nGrading: 5% homework, 15% lab sessions, 15% quizzes, 20% midterm 1, 20% midterm 2, 25% final exam.",
  tags: ["materials", "manufacturing", "lab", "properties", "engineering"]
},
{
  id: 59,
  code: "ISEE325",
  title: "Engineering Statistics and Design of Experiments",
  summary: "Covers statistics for engineering and the primary concepts of experimental design. Topics include point estimation, hypothesis testing, confidence intervals, regression, ANOVA, and design and analysis of experiments. Students use statistical software (MINITAB) for data analysis and applications. Assessment includes three homework assignments, a midterm exam, and a comprehensive final exam.\n---\nGrading: 15% homework 1, 15% homework 2, 10% homework 3, 30% midterm exam, 30% final exam.",
  tags: ["statistics", "experiments", "ANOVA", "regression", "data analysis"]
},
{
  id: 60,
  code: "ISEE140",
  title: "Material Processing",
  summary: "Combines design process, computer-aided design (CAD), and machine shop fabrication in a design/build/test project. Students learn teamwork, formalized design processes, 3D CAD modeling, and safe fabrication using mills and lathes. Topics include GD&T, engineering communication, ideation, concept development, and hands-on experience with shop tools. Assessment includes homework/studio classwork, quizzes/lecture classwork, machine workshop reports, a CAD project, and a main design project.\n---\nGrading: 15% homework & studio classwork, 20% quizzes & lecture classwork, 25% machine workshop reports, 20% design CAD project, 20% main design project.",
  tags: ["CAD", "fabrication", "design", "manufacturing", "project"]
},
{
  id: 61,
  code: "ECON101",
  title: "Principles of Microeconomics",
  summary: "Studies the workings of individual markets, examining the interaction of demanders and suppliers, and how consumer and producer behavior, as well as market competition, influence market outcomes. Topics include opportunity cost, supply and demand, elasticity, economic surplus, efficiency, international trade, protectionism, costs, and market structures. Assessment includes multiple assignments and quizzes, two midterm tests, and a comprehensive final exam.\n---\nGrading: 25% assignments & quizzes, 20% midterm test 1, 20% midterm test 2, 35% final exam.",
  tags: ["markets", "trade", "efficiency", "global perspective", "social perspective"]
},
{
  id: 62,
  code: "CHMG142",
  title: "General and Analytical Chemistry II",
  summary: "Covers thermodynamics and kinetics of chemical reactions, emphasizing the relationship between energy and entropy in chemical processes. Topics include solubility equilibrium, acid-base equilibrium, oxidation-reduction reactions, chemical kinetics, buffers, titration curves, and the effect of common ions. Students develop quantitative skills in analyzing chemical equilibria and reaction rates. Assessment includes homework assignments, quizzes, a midterm exam, a lab activity, and a comprehensive final exam.\n---\nGrading: 10% homework assignments (3), 15% quizzes (3), 20% midterm exam, 20% lab activity, 35% final exam.",
  tags: ["chemistry", "thermodynamics", "equilibrium", "kinetics", "science"]
},
{
  id: 63,
  code: "MECE102",
  title: "Engineering Mechanics Lab",
  summary: "Examines classical Newtonian mechanics from a calculus-based perspective with integrated laboratory experiences. Topics include kinematics, Newton’s laws, work, energy, power, momentum, rotation, oscillations, and gravitation. Students conduct experiments using modern data acquisition technology, analyze and interpret results with software, and document findings in lab reports and logbooks. Assessment includes lab reports, lab quizzes, logbooks, theory quizzes, midterm exams (theory and lab), and a comprehensive final exam.\n---\nGrading: 12% lab reports (10), 10% lab quizzes (4), 8% logbooks (2), 15% theory quizzes (4), 15% midterm exam (theory), 10% midterm exam (lab), 30% final exam.",
  tags: ["mechanics", "lab", "experiments", "data analysis", "engineering"]
},
{
  id: 64,
  code: "MECE117",
  title: "Introduction to Programming for Engineers",
  summary: "Provides an overview of computer programming for solving engineering problems. Students learn algorithm development, structured programming techniques, and implementation using MATLAB. Topics include computer structure, program flow, variable types, flowcharts, pseudo-code, conditionals, loops, arrays, functions, file I/O, and graphical output. Assessment includes four quizzes, a midterm exam, and a comprehensive final exam.\n---\nGrading: 10% quiz 1, 10% quiz 2, 10% quiz 3, 10% quiz 4, 30% midterm exam, 30% final exam.",
  tags: ["MATLAB", "programming", "algorithms", "engineering", "problem solving"]
},
{
  id: 65,
  code: "MECE104",
  title: "Engineering Design Tools",
  summary: "Combines the design process, computer-aided design (CAD), and machine shop fabrication in a project-oriented course. Students learn teamwork, formalized design processes, 3D CAD modeling, and safe fabrication using mills and lathes. Topics include GD&T, engineering communication, ideation, concept development, and hands-on experience with shop tools. Assessment includes homeworks and studio classwork, quizzes and lecture classwork, machine workshop reports, a CAD project, and a main design project.\n---\nGrading: 15% homeworks & studio classwork, 20% quizzes & lecture classwork, 25% machine workshop reports, 20% design CAD project, 20% main design project.",
  tags: ["CAD", "fabrication", "design", "manufacturing", "project"]
},
{
  id: 66,
  code: "ANTH275",
  title: "Global Islam",
  summary: "Examines the spread of Islam beyond its origins in the Middle East and the cultural, social, and political interactions that followed. Explores core tenets of Islam, historical narratives, and the diversity of Muslim practices across regions. Topics include the compatibility of Islam with Western society, Islamic history, cultural adaptation, and the experience of Muslims in minority contexts. Special emphasis is placed on the UAE as a microcosm of global Islamic diversity. Assessment includes a comprehensive final exam, midterm, essay and presentation, coursework, and five take-home tasks.\n---\nGrading: 30% final exam, 20% midterm, 25% essay & presentation, 15% coursework, 10% take-home tasks (5).",
  tags: ["islamic culture", "culture", "history", "diversity", "global perspective"]
},
{
  id: 67,
  code: "EGEN99",
  title: "Engineering Coop Prep",
  summary: "Prepares engineering students for the job search and employment process. Covers strategies for job applications, resume and cover letter writing, LinkedIn profile creation, behavioral interviewing, and professional communication. Emphasizes ethical responsibilities, workplace skills, and creative problem solving through design thinking. Assessment includes a CV, LinkedIn profile, interview, group case study (design thinking), and an ethics assignment. Grading is S/F based on points.",
  tags: ["career", "job search", "communication", "design thinking", "CO-OP", "no midterm", "no final"]
},
{
  id: 68,
  code: "MATH231",
  title: "Differential Equations",
  summary: "Introduction to ordinary differential equations and their applications. Topics include solutions to first-order and linear second-order equations, method of undetermined coefficients, variation of parameters, linear independence, the Wronskian, vibrating systems, and Laplace transforms. Emphasizes problem solving, mathematical notation, and real-world modeling. Assessment includes two homework assignments, five quizzes, two midterm exams, and a comprehensive final exam.\n---\nGrading: 15% homework/assignments (2), 25% quizzes (5), 15% midterm exam 1, 15% midterm exam 2, 30% final exam.",
  tags: ["differential equations", "Laplace", "modeling", "mathematics", "STEM"]
},
{
  id: 69,
  code: "MECE103",
  title: "Statics",
  summary: "Covers the equilibrium of particles and rigid bodies under the action of forces, integrating calculus, vector algebra, and algebraic equations with physical concepts of equilibrium in two and three dimensions. Topics include force and moment, friction, centroids, moments of inertia, equilibrium of trusses, frames, and machines. Emphasizes free body diagrams, force-couple systems, and problem solving. Assessment includes homeworks, quizzes, two midterm exams, and a comprehensive final exam.\n---\nGrading: 10% homeworks (5), 15% quizzes (4), 20% midterm 1, 20% midterm 2, 35% final exam.",
  tags: ["statics", "equilibrium", "forces", "engineering", "problem solving"]
},
{
  id: 70,
  code: "MECE110",
  title: "Thermodynamics I",
  summary: "Introduces the classical theory of thermodynamics for mechanical engineering students. Topics include states, properties, processes, open and closed systems, heat transfer, work, equilibrium, the first and second laws of thermodynamics, entropy, enthalpy, thermodynamic cycles, and energy analysis of engines and components. Emphasizes problem solving and real-world applications. Assessment includes quizzes, a midterm exam, and a comprehensive final exam.\n---\nGrading: 40% quizzes, 30% midterm exam, 30% final exam.",
  tags: ["thermodynamics", "energy", "cycles", "engineering", "problem solving"]
},
{
  id: 71,
  code: "MECE203",
  title: "Strength of Materials I",
  summary: "Covers the fundamental principles of mechanics of deformable media, including stress, strain, deflections, and their relationships. Topics include tension, compression, shear, torsion, bending, stress concentration, shear and bending moment diagrams, Mohr's circle, beam deflection, and design of shafts and mechanical elements under combined loading. Emphasizes problem solving and practical applications in engineering. Assessment includes five to seven homework assignments, an innovation project, two midterm exams, three to four quizzes, and a comprehensive final exam.\n---\nGrading: 10% homework assignments, 5% innovation project, 20% midterm exam I, 20% midterm exam II, 30% final exam, 15% quizzes (3-4).",
  tags: ["mechanics", "stress", "strain", "bending", "engineering"]
},
{
  id: 72,
  code: "MECE210",
  title: "Fluid Mechanics I",
  summary: "Investigates the physical characteristics and behavior of fluids, including density, pressure, viscosity, temperature, vapor pressure, and compressibility. Topics include fluid statics, hydrostatics, buoyancy, flow fields, conservation laws, Bernoulli’s equation, pipe flow, laminar and turbulent flows, dimensional analysis, and boundary layers. Emphasizes problem solving, system diagrams, and engineering applications. Assessment includes three to four quizzes, two midterm exams, a final exam, and five to seven homework assignments.\n---\nGrading: 15% quizzes (3-4), 20% midterm 1, 20% midterm 2, 35% final exam, 10% homework assignments (5-7).",
  tags: ["fluids", "statics", "Bernoulli", "pipes", "engineering"]
},
{
  id: 73,
  code: "MECE204",
  title: "Strength of Materials I Lab",
  summary: "Lab course covering the fundamental principles of mechanics of deformable media, including stress, strain, deflections, and basic loadings such as tension, compression, shear, torsion, and bending. Students gain hands-on experience with materials testing equipment, reinforce theoretical principles with lab measurements, process and analyze experimental data, and write lab reports. Assessment includes lab reports, three exams, and quizzes/discussions. There is no final exam.\n---\nGrading: 50% lab reports, 40% exams (3), 10% quizzes & discussions.",
  tags: ["materials", "lab", "experiments", "testing", "no final"]
},
{
  id: 74,
  code: "MECE211",
  title: "Engineering Measurements Lab",
  summary: "Focuses on developing skills in instrumentation, computer data acquisition (DAQ), measurement theory, uncertainty analysis, data analysis, and technical report writing. Students learn about measurement errors, documentation, LabVIEW programming, data acquisition principles, and common instrumentation. Emphasizes teamwork in lab experiments, data analysis, and clear communication of results. Assessment includes lab reports, discussions, midterm exams (theory and lab), and final exams (theory and lab).\n---\nGrading: 25% lab reports, 15% discussions, 20% midterm exam (theory), 10% midterm exam (lab), 20% final exam (theory), 10% final exam (lab).",
  tags: ["measurement", "lab", "instrumentation", "data analysis", "engineering"]
},
{
  id: 75,
  code: "CMPR271",
  title: "Computational Problem Solving for Engineers",
  summary: "Introduces computational problem solving for engineers using C and MATLAB. Covers basic problem-solving techniques, algorithm development, top-down design, stepwise refinement, and functional decomposition. Students learn classical algorithms for numerical problems in engineering and science, and implement solutions using programming assignments. Assessment includes two in-class tests, four homework assignments, and a comprehensive final exam.\n---\nGrading: 25% test 1, 25% test 2, 20% homework (4), 30% final exam.",
  tags: ["C", "MATLAB", "algorithms", "programming", "engineering"]
},
{
  id: 76,
  code: "EEEE497",
  title: "Multidisciplinary Senior Design I",
  summary: "First in a two-course capstone sequence focused on solving real-world engineering design problems in multidisciplinary teams. Students follow a systems engineering design process, including assessing customer needs, developing specifications, generating and evaluating concepts, system design, project planning, and initial implementation. Emphasizes teamwork, communication, project management, and ethical considerations. Assessment includes deliverables (presentations, reports, peer reviews), project effort and teamwork, and a final committee evaluation.\n---\nGrading: 20% deliverable I (presentation & report), 30% deliverable II (presentation, report, peer review), 15% behavior and contribution (effort, teamwork, peer review), 35% deliverable III (final presentation, report, peer review).",
  tags: ["capstone", "design", "teamwork", "project management", "engineering"]
},
{
  id: 77,
  code: "EEEE498",
  title: "Multidisciplinary Senior Design II",
  summary: "Second in a two-course capstone design sequence where multidisciplinary student teams complete the design, build, test, and documentation of an engineering system. Emphasizes teamwork, project management, system integration, stakeholder engagement, and professional communication. Students deliver presentations, reports, and prototypes, and are evaluated by mentors and exam committees. Assessment includes three major deliverables (presentations, reports, peer reviews), project effort and teamwork, and a final committee evaluation.\n---\nGrading: 20% deliverable I (presentation, report, individual tasks), 30% deliverable II (presentation, report, individual tasks, peer review), 15% behavior, teamwork, and contribution, 35% deliverable III (final presentation, report, individual tasks, peer review).",
  tags: ["capstone", "design", "teamwork", "system integration", "engineering"]
},
{
  id: 78,
  code: "EEEE120",
  title: "Digital Systems I",
  summary: "Introduces the basic components and methodologies used in digital systems design, including Boolean algebra, combinational and sequential logic circuits, arithmetic circuits, memory elements, finite state machines, and data transfers. Students gain hands-on experience through labs and projects, using tools such as Altera Quartus and FPGA prototyping boards. Assessment includes five homework assignments, nine labs, a project, two midterm exams, and a comprehensive final exam.\n---\nGrading: 15% homework, 25% labs, 10% project, 15% midterm exam 1, 15% midterm exam 2, 20% final exam.",
  tags: ["digital", "logic", "FPGA", "circuits", "engineering"]
},
{
  id: 79,
  code: "EEEE220",
  title: "Digital Systems II",
  summary: "Covers the design of digital systems using hardware description languages (HDLs) and computer design methodology. Topics include VHDL and Verilog coding, combinational and sequential logic, datapath and control unit design, CPU architecture, memory, I/O peripherals, and system optimization for speed, cost, or power. Labs reinforce concepts through FPGA implementation and CAD tools. Assessment includes two midterm exams, mandatory labs, and a comprehensive final exam. Homework is required for course progress but not graded for points.\n---\nGrading: 20% midterm exam 1, 20% midterm exam 2, 30% laboratories, 30% final exam.",
  tags: ["digital", "VHDL", "Verilog", "FPGA", "hardware"]
},
{
  id: 80,
  code: "EEEE260",
  title: "Introduction to Semiconductor Devices",
  summary: "Introductory course on the fundamentals of semiconductor physics and the operation of basic devices. Topics include crystal structure, carrier concentration, energy band models, drift and diffusion currents, pn junction diodes, bipolar junction transistors (BJT), MOS capacitors, and MOSFETs. Students learn to analyze and design semiconductor devices and understand their applications in circuits. Assessment includes five homework assignments, four quizzes, two midterm exams, and a comprehensive final exam.\n---\nGrading: 20% homework (5), 10% quizzes (4), 20% midterm exam 1, 20% midterm exam 2, 30% final exam.",
  tags: ["semiconductors", "devices", "diodes", "transistors", "engineering"]
},
{
  id: 81,
  code: "EEEE281",
  title: "Circuits I",
  summary: "Covers the basics of DC circuit analysis, including voltage, current, resistance, power, energy, and circuit elements. Topics include Ohm’s Law, Kirchhoff’s laws, series and parallel circuits, Thevenin and Norton theorems, superposition, op-amps, and transient analysis of RL, RC, and RLC circuits. The course includes a lab component with hands-on experiments and a project. Assessment includes five homework assignments, two midterm exams, seven labs, four quizzes, and a comprehensive final exam.\n---\nGrading: 10% homework (5), 30% midterm exams (2), 20% lab, 25% final exam, 15% quizzes (4).",
  tags: ["circuits", "DC", "op-amps", "lab", "engineering"]
},
{
  id: 82,
  code: "EEEE282",
  title: "Circuits II",
  summary: "Covers the fundamentals of AC circuit analysis, including sinusoidal steady-state solutions, phasors, impedances, admittances, nodal and mesh analysis, Thevenin and Norton theorems, mutual induction, transformers, resonance, filters, Bode plots, and two-port network theory. Students use MATLAB for simulation and analysis. Assessment includes five homework assignments, five quizzes, a MATLAB project, two midterm exams, and a comprehensive final exam.\n---\nGrading: 10% quizzes (5), 10% MATLAB project, 15% homework (5), 20% midterm exam 1, 20% midterm exam 2, 25% final exam.",
  tags: ["AC circuits", "phasors", "resonance", "MATLAB", "engineering"]
},
{
  id: 83,
  code: "EEEE321",
  title: "Energy Conversion",
  summary: "Covers the fundamentals of energy conversion, electromechanical systems, and electric machines. Topics include electromagnetic principles, single-phase transformers, DC machines, three-phase machines, synchronous generators and motors, induction machines, circuit models, efficiency, voltage regulation, and power factor improvement. Students participate in laboratory experiments and use MATLAB for analysis. Assessment includes four homework assignments, four quizzes, four laboratory experiments, a midterm exam, and a comprehensive final exam.\n---\nGrading: 10% homework (4), 20% quizzes (4), 15% laboratory experiments (4), 25% midterm exam, 30% final exam.",
  tags: ["energy", "machines", "transformers", "motors", "lab"]
},
{
  id: 84,
  code: "EEEE353",
  title: "Linear Systems",
  summary: "Provides foundations of continuous and discrete signal and system analysis and modeling. Topics include differential and difference equations, convolution, Fourier series and transforms, Laplace and Z transforms, transfer functions, frequency response, Bode plots, resonance, digital filters, and system analysis using MATLAB. Emphasizes both theoretical concepts and practical problem solving. Assessment includes four homework assignments, two exams, and a comprehensive final exam.\n---\nGrading: 30% homework (4), 20% exam 1, 20% exam 2, 30% final exam.",
  tags: ["signals", "systems", "Fourier", "Laplace", "MATLAB"]
},
{
  id: 85,
  code: "EEEE374",
  title: "EM Fields & Transmission Lines",
  summary: "Provides foundations of electromagnetic fields and wave propagation, including static and time-varying fields, Maxwell’s equations, wave equations, Poynting theorem, boundary conditions, and transmission line theory. Topics include electric and magnetic fields, Gauss' Law, Faraday's Law, plane waves, reflection and transmission, Smith Chart, impedance matching, waveguides, and antenna design. Students use MATLAB and ADS software for simulation and participate in lab experiments and projects. Assessment includes homework, quizzes, labs, projects, two midterm exams, and a comprehensive final exam.\n---\nGrading: 10% homework, 10% quizzes, 20% lab, 15% projects, 20% midterm exams, 25% final exam.",
  tags: ["electromagnetics", "waves", "transmission lines", "simulation", "lab"]
},
{
  id: 86,
  code: "EEEE380",
  title: "Digital Electronics",
  summary: "Introductory course in digital MOS circuit analysis and design. Topics include MOSFET I-V behavior, static and dynamic characteristics of NMOS and CMOS inverters, combinational and sequential logic networks, dynamic CMOS logic, memory circuits, and interconnect behavior. Students use PSpice for simulation and participate in lab experiments covering design and analysis of digital circuits. Assessment includes three homework assignments, six labs, two midterm exams, and a comprehensive final exam.\n---\nGrading: 20% midterm exam I, 20% midterm exam II, 20% final exam, 20% labs (6), 20% homework assignments (3).",
  tags: ["digital", "CMOS", "MOSFET", "logic", "lab"]
},
{
  id: 87,
  code: "EEEE414",
  title: "Classical Control",
  summary: "Introduces linear continuous-time classical control systems, their behavior, design, and use in engineering. Topics include Laplace transforms, block diagrams, root locus, frequency-domain analysis, Bode and Nyquist plots, system modeling, stability analysis, steady-state error, feedback control, PID controllers, and design using analytical and computational techniques. Students use MATLAB for simulation and participate in lab experiments and a design project. Assessment includes labs, a design project, three exams, and a comprehensive final exam.\n---\nGrading: 15% labs, 10% design project, 15% exam 1, 15% exam 2, 15% exam 3, 30% final exam.",
  tags: ["control", "feedback", "Laplace", "PID", "MATLAB"]
},
{
  id: 88,
  code: "EEEE420",
  title: "Embedded Systems Design",
  summary: "Covers hardware and software components of digital embedded systems, focusing on the interface between hardware and software. Topics include microcontroller architecture, memory organization, instruction set architectures, I/O configuration, timers, A/D and D/A conversion, assembly and C programming, and analog front-end optimization. Labs use MSP430 and Arduino platforms for hands-on experience. Assessment includes three homework assignments, two midterm exams, a final exam, and nine labs plus a project.\n---\nGrading: 15% homework (3), 20% midterm exam I, 20% midterm exam II, 20% final exam, 25% labs (9) + project.",
  tags: ["embedded", "microcontroller", "C", "assembly", "lab"]
},
{
  id: 89,
  code: "EEEE480",
  title: "Analog Electronics",
  summary: "Introductory course in analog electronic circuit analysis and design. Topics include diode circuits, MOSFET and BJT characteristics, DC biasing, current sources, small-signal and multistage amplifiers, differential and cascode amplifiers, frequency response, feedback, and stability. Students participate in lab experiments using PSpice and complete homework assignments. Assessment includes three homework assignments, five labs, two midterm exams, and a comprehensive final exam.\n---\nGrading: 20% midterm exam I, 20% midterm exam II, 20% final exam, 20% labs (5), 20% homework assignments (3).",
  tags: ["analog", "amplifiers", "MOSFET", "BJT", "lab"]
},
{
  id: 90,
  code: "EEEE484",
  title: "Communication Systems",
  summary: "Introduces the basics of information formation, transmission, and reception over communication channels. Topics include spectral density, correlation, amplitude and angle modulation (AM, FM, PM), carrier detection, synchronization, phase-locked loops, digital communication (ASK, FSK, PSK), noise effects, optimum detection, matched filters, and bit error rate. Labs use MATLAB and hardware boards for analog and digital modulation experiments. Assessment includes two midterm exams, a comprehensive final exam, labs, and a writing assignment.\n---\nGrading: 20% midterm exam I, 20% midterm exam II, 30% final exam, 22% labs, 8% writing assignment.",
  tags: ["communication", "modulation", "noise", "digital", "lab", "writing intensive"]
},
{
  id: 91,
  code: "EEEE585",
  title: "Principles of Robotics",
  summary: "Introduction to robotics covering sensors, actuators, mobile robot drive and steering, kinematics, dynamics, manipulator types, and control. Topics include forward and inverse kinematics, Jacobian analysis, mobile robot dynamics, manipulator design, and electromechanical systems. Students gain hands-on experience with ROS, MATLAB, and lab experiments, and complete a final project. Assessment includes three homework assignments, six laboratory experiments, a midterm exam, a final exam, and a final project.\n---\nGrading: 20% homework (3), 20% laboratory experiments (6), 20% midterm exam, 20% final exam, 20% final project.",
  tags: ["robotics", "kinematics", "sensors", "actuators", "lab"]
},
{
  id: 92,
  code: "MATH219",
  title: "Multivariable Calculus",
  summary: "Studies calculus of functions of two or more variables, including vectors, vector-valued functions and their derivatives, limits, partial derivatives, multiple integrals, and applications in physics. Emphasizes differentiation and integration techniques for multivariable functions and problem solving. Assessment includes three homework assignments, four quizzes, two midterm exams, and a comprehensive final exam.\n---\nGrading: 10% homework (3), 7.5% quiz 1, 7.5% quiz 2, 7.5% quiz 3, 7.5% quiz 4, 15% midterm exam 1, 15% midterm exam 2, 30% final exam.",
  tags: ["calculus", "multivariable", "integration", "vectors", "STEM"]
},
{
  id: 93,
  code: "MATH381",
  title: "Complex Variables",
  summary: "Covers the algebra of complex numbers, analytic functions, Cauchy-Riemann equations, complex integration, Cauchy’s integral theorem and formulas, Taylor and Laurent series, residues, real integrals by complex methods, and conformal mappings. Emphasizes problem solving, series expansions, and applications in engineering and science. Assessment includes three homework assignments, four quizzes, two midterm exams, and a comprehensive final exam.\n---\nGrading: 10% homework (3), 7.5% quiz 1, 7.5% quiz 2, 7.5% quiz 3, 7.5% quiz 4, 15% midterm exam 1, 15% midterm exam 2, 30% final exam.",
  tags: ["complex analysis", "integration", "series", "residues", "mathematics"]
},
{
  id: 94,
  code: "MATH251",
  title: "Probability and Statistics I",
  summary: "Covers basic probability and statistical concepts, sampling theory, hypothesis testing, confidence intervals, point estimation, and simple linear regression. Students learn to use discrete and continuous probability models, solve problems in statistics and mathematical modeling, and apply probability and statistics to real-world problems. Assessment includes three homework assignments, four quizzes, two midterm exams, and a comprehensive final exam.\n---\nGrading: 10% homework (3), 7.5% quiz 1, 7.5% quiz 2, 7.5% quiz 3, 7.5% quiz 4, 15% midterm exam 1, 15% midterm exam 2, 30% final exam.",
  tags: ["probability", "statistics", "estimation", "regression", "STEM"]
},
{
  id: 95,
  code: "MECE352",
  title: "Thermodynamics II",
  summary: "Advanced course in thermodynamics focusing on the design and analysis of gas and vapor power cycles, cogeneration, combined cycles, vapor compression and air-conditioning cycles, and exergy analysis. Topics include the first and second laws of thermodynamics, entropy generation, irreversibility, psychrometrics, combustion, and thermo-economics. Emphasizes real-world applications and system performance. Assessment includes quizzes, a midterm exam, and a comprehensive final exam.\n---\nGrading: 40% quizzes, 30% midterm exam, 30% final exam.",
  tags: ["thermodynamics", "cycles", "entropy", "combustion", "engineering"]
},
{
  id: 96,
  code: "MLAR201",
  title: "Beginning Arabic I",
  summary: "Introduces students with no prior knowledge to Modern Standard Arabic, focusing on foundational skills in speaking, listening, reading, writing, and culture. Emphasizes conversation, vocabulary, grammar, and cultural understanding. Students practice the Arabic alphabet, basic sentence construction, and engage with cultural topics related to Arabic-speaking countries. Assessment includes a project, five homework assignments, unit quizzes, a midterm exam, and a comprehensive final exam.\n---\nGrading: 10% project, 10% homework assignments (5), 30% unit quizzes, 20% midterm exam, 30% final exam.",
  tags: ["Arabic", "language", "culture", "communication", "beginner", "global perspective"]
},
{
  id: 97,
  code: "MLAR202",
  title: "Beginning Arabic II",
  summary: "Second course in beginning Modern Standard Arabic, focusing on developing functional competence in speaking, listening, reading, writing, and cultural understanding. Students engage in interpersonal communication, interpret familiar texts, present information, and write short essays on familiar topics. Emphasizes vocabulary, grammar, and cultural topics related to Arabic-speaking countries. Assessment includes class participation, a project, homework assignments, quizzes, a midterm exam, and a comprehensive final exam.\n---\nGrading: 5% class participation, 5% project, 10% homework assignments, 30% quizzes, 20% midterm exam, 30% final exam.",
  tags: ["Arabic", "language", "culture", "communication", "beginner", "global perspective"]
},
{
  id: 98,
  code: "MLAR301",
  title: "Intermediate Arabic I",
  summary: "Continues intermediate-level development of functional skills in Modern Standard Arabic, focusing on speaking, listening, reading, writing, and culture. Students communicate effectively on a variety of topics, read and interpret authentic materials, summarize spoken discourse, and develop skills in discussions, debates, and creative writing. Emphasizes vocabulary, grammar, and cultural understanding. Assessment includes a project, homework assignments, quizzes, a midterm exam, and a comprehensive final exam.\n---\nGrading: 10% project, 10% homework assignments, 30% quizzes, 20% midterm exam, 30% final exam.",
  tags: ["Arabic", "language", "culture", "communication", "intermediate"]
},
{
  id: 99,
  code: "PHIL403",
  title: "Social and Political Philosophy",
  summary: "Examines major problems of social and political philosophy through analysis and comparison of views on individuality, society, and their interrelations. Topics include philosophical assumptions in society, the relationship between individual and society, similarities and differences among societies, and the roles of morality, law, politics, government, religion, art, and education. Assessment includes participation, in-class passage analysis, debates, group article analysis/summary, contemporary case chat, and a comprehensive final exam.\n---\nGrading: 15% participation, 15% in-class passage analysis, 20% debates, 15% group article analysis/summary, 15% contemporary case chat, 20% final exam.",
  tags: ["philosophy", "society", "politics", "debate", "critical thinking", "writing intensive"]
},
{
  id: 100,
  code: "ANTH220",
  title: "Language and Culture: Introduction to Linguistic Anthropology",
  summary: "Explores the interplay between language and culture, focusing on how language shapes social relationships, meaning, and identity. Topics include language structure, language acquisition, language change, multilingualism, language and power, language ideologies, and methods in linguistic anthropology. Students engage in class participation, self-reflection, quizzes, oral presentations, and a final essay. Assessment includes class participation, self-reflection/discussions, quizzes, oral presentations, a final essay proposal, and a final essay.\n---\nGrading: 10% class participation, 20% self-reflection/discussions, 15% quizzes (3), 20% oral presentations, 15% final essay proposal, 20% final essay.",
  tags: ["linguistics", "culture", "language", "anthropology", "communication", "social perspective"]
},
{
  id: 101,
  code: "CSEC520",
  title: "Cyber Analytics and Machine Learning",
  summary: "Explores methods and applications in cyber analytics using advanced machine learning algorithms, including deep learning. Students learn to apply machine learning to cybersecurity problems such as network security, anomaly detection, and malware analysis. Topics include clustering, neural networks, adversarial machine learning, and evaluation of ML solutions. Assessment includes labs, a midterm exam, a term paper, quizzes, and a comprehensive final exam.\n---\nGrading: 30% labs (3), 20% midterm, 20% term paper, 10% quizzes (2), 20% final exam.",
  tags: ["cybersecurity", "machine learning", "analytics", "anomaly detection", "malware", "advanced elective"]
},
{
  id: 102,
  code: "CSEC468",
  title: "Risk Management for Information Security",
  summary: "Introduces the principles and practices of risk management in information security, including risk analysis, risk assessment, and vulnerability assessment. Covers both quantitative and qualitative methodologies, security metrics, cost-benefit and business impact analysis, and the development of risk mitigation plans. Students conduct risk assessments, develop reports, and present findings. Assessment includes three homework assignments, a project, a midterm exam, and a comprehensive final exam.\n---\nGrading: 30% homeworks (3), 25% project, 20% midterm, 25% final exam.",
  tags: ["risk", "security", "assessment", "metrics", "cybersecurity", "advanced elective"]
},
{
  id: 103,
  code: "CSEC471",
  title: "Penetration Testing Frameworks & Methodologies",
  summary: "Covers the process and methodologies of penetration testing, including contract negotiation, test planning, execution, and reporting. Students learn tools and techniques for penetration testing, develop security metrics, and create comprehensive reports. Emphasizes ethical issues and the value of penetration testing to organizations. Assessment includes labs, quizzes, a project report, a midterm exam, and a project presentation.\n---\nGrading: 30% labs (6), 10% quizzes (2), 20% project report, 30% midterm, 10% project presentation.",
  tags: ["penetration testing", "security", "metrics", "project", "cybersecurity", "advanced elective", "no final"]
},
{
  id: 104,
  code: "PHIL305",
  title: "Philosophy of Peace",
  summary: "Introduces philosophical dimensions of the search for world peace, including just and lasting peace, nations as moral entities, justice and national self-interest, force and violence, the morality of the use of force, and the roles of peace-making and peace-keeping groups. Students analyze historical and contemporary instances of warfare and peace, and critically examine the ethical, social, and political issues involved. Assessment includes participation, critical thinking questions, discussion board posts, group article analysis/summary, group contemporary case chat, and a comprehensive final exam.\n---\nGrading: 20% participation, 10% critical thinking question, 20% discussion board posts (2), 20% group article analysis/summary, 10% group contemporary case chat, 20% final exam.",
  tags: ["philosophy", "peace", "conflict", "social perspective", "global perspective", "ethical perspective"]
},
{
  id: 105,
  code: "COMM253",
  title: "Communication",
  summary: "Introduces communication contexts and processes with emphasis on both conceptual and practical dimensions. Students engage in public speaking, small group problem solving, leadership, and professional writing exercises while acquiring theoretical background to understand these skills. Topics include informative and persuasive speaking, small group decision-making, conflict management, professional writing (memos, reports, agendas, minutes, executive overviews), nonverbal and intercultural communication, and use of presentation software. Tailored for business students with a focus on professional communication, collaboration, and leadership.\n---\nGrading: 10% project, 10% homeworks (5), 30% quizzes (3), 20% midterm exam, 30% final exam.",
  tags: ["communication", "public speaking", "professional writing", "teamwork", "business communication", "writing intensive"]
},
{
  id: 106,
  code: "FDTN111",
  title: "Drawing I",
  summary: "An introduction to the visualization of form, thought, and expression through drawing. First of two sequential foundation courses in the drawing curriculum for Art and Design. Students explore a wide range of media, tools, techniques, and subjects to develop observational skills, creative expression, and problem-solving abilities related to form and composition. Emphasis on drawing as a tool for self-expression and communication. Projects include still life, perspective, human figure, character design, self-portrait, and final portfolio with exhibition.\n---\nGrading: 10% drawing 1, 10% drawing 2, 10% drawing 3, 20% midterm project, 10% drawing 4, 10% drawing 5, 10% drawing 6, 20% final portfolio and presentation.",
  tags: ["drawing", "art", "design", "visual communication", "portfolio", "no final"]
},
{
  id: 107,
  code: "BIOL130",
  title: "Introduction to Bioinformatics",
  summary: "Explores topics in bioinformatics including tools and resources used in the discipline, with emphasis on practical application in a common user environment. Students learn to identify publicly available bioinformatics information sources, use common tools and algorithms, describe biological problems addressed by bioinformatics, recognize ethical issues in the field, and apply Unix/Linux for solving simple bioinformatics problems. Includes lectures, workshops, AI-enhanced activities, and a final research project presentation.\n---\nGrading: 15% homework (3), 10% quizzes (3), 25% midterm exam, 25% activity, 25% final project.",
  tags: ["bioinformatics", "biology", "data analysis", "computational biology", "research", "no final"]
},
{
  id: 108,
  code: "FDTN121",
  title: "2D Design I",
  summary: "Introduces the basic elements and principles of two-dimensional design, foundational to the Art and Design curriculum. Focuses on developing visual and verbal vocabularies through exploration of media, tools, and techniques, alongside theoretical and experimental processes. Students engage with historical and cultural themes, personal interpretation, and practical projects including typography, textures, realistic drawings, pictograms, abstraction, and calligraphy. Culminates in a final project and exhibition.\n---\nGrading: 10% project 1, 10% project 2, 10% project 3, 20% midterm report, 15% project 4, 15% project 5, 20% final project and presentation.",
  tags: ["2d design", "art", "design", "visual communication", "typography", "no final"]
},
{
  id: 109,
  code: "FDTN141",
  title: "4D Design",
  summary: "Explores the basic concepts of art and design in time and space, focusing on moving images, continuity, editing, sound-image relationships, and principles of movement. Students use video, photography, sound, and animation tools to create time-based works. Covers historical and contemporary approaches to time in art and design, with projects including cinemagraphs, parallax animation, stop motion, continuity-based films, motion graphics, and a final creative portfolio piece.\n---\nGrading: 10% project 1, 10% project 2, 10% project 3, 10% midterm (practical and theory quiz), 10% project 4, 10% project 5, 10% project 6, 20% final project, 10% project 7.",
  tags: ["4d design", "motion graphics", "animation", "video production", "time-based media", "no final"]
},
{
  id: 110,
  code: "FDTN112",
  title: "Drawing II Workshop Topics",
  summary: "Advanced exploration of drawing as a tool for form, thought, and expression, building on foundational skills. Students work on themed projects while developing technical, aesthetic, and conceptual abilities. Topics include still life, complex compositions, mixed media, landscapes, collaborative 'exquisite corpse' works, and storytelling through drawing. Emphasis on critique, presentation, and portfolio development, culminating in a digital portfolio.\n---\nGrading: 10% presentations, 10% project 1, 10% project 2, 10% project 3, 20% midterm, 10% project 4, 10% project 5, 20% final digital portfolio.",
  tags: ["drawing", "art", "design", "visual communication", "portfolio", "no final"]
},
{
  id: 111,
  code: "NMDE103",
  title: "New Media Design Interactive I",
  summary: "Introduces key internet, web, and multimedia technologies for interactive design. Covers computer-based communication, HTML, CSS, WYSIWYG editors, digital images, audio and video techniques, web animation, and publishing. Students develop and publish web pages, create animations, and integrate multimedia elements to enhance user experience. Emphasis on design principles, usability, and aesthetic evaluation.\n---\nGrading: 20% final project, 20% project 1, 20% project 2, 20% midterm, 10% critique, 10% documentation of exhibition.",
  tags: ["web design", "interactive media", "html", "css", "multimedia", "no final"]
},
{
  id: 112,
  code: "NMDE111",
  title: "New Media Design Digital Survey I",
  summary: "Project-based introduction to the computer as a tool for illustration, imaging, and graphic generation. Develops foundational skills in raster and vector image creation, editing, compositing, layout, and visual design for online production. Emphasis on applying visual design principles to create effective solutions for electronic media. Students work with Photoshop, Illustrator, and Acrobat to produce branding, typography, and infographic projects.\n---\nGrading: 20% presentations, 10% moodboard project, 10% masking + pen tool project, 10% midterm composite, 20% throwie typography project, 30% infographic project and presentation.",
  tags: ["digital design", "graphic design", "photoshop", "illustrator", "visual communication", "no final"]
},
{
  id: 113,
  code: "NMDE112",
  title: "New Media Design Digital Survey II",
  summary: "Builds on Digital Survey I with advanced studies in aesthetics, graphic form, structure, typography, visual organization, and interaction principles. Students design communication solutions for static and interactive projects, focusing on usability and multi-device output. Projects explore gestalt principles, design elements, image-based storytelling, expressive typography, and logo/type applications, culminating in an exhibition.\n---\nGrading: 10% presentations, 10% project 1 gestalt, 10% project 2 elements, 10% project 3 images, 20% midterm poster project, 10% project 4 expressive type, 20% final logo & type applications, 10% documentation of exhibition.",
  tags: ["digital design", "graphic design", "typography", "visual communication", "branding", "no final"]
},

];

// --- Utility functions (copied from your App.js) ---
const STOP_WORDS = new Set([
  "i", "im", "a", "an", "the", "covers", "covering", "want", "cover", "for",
  "and", "or", "but", "if", "then", "that", "has", "have", "with", "to", "of",
  "in", "on", "at", "by", "from", "is", "are", "was", "were", "be", "been",
  "being", "as", "it", "this", "so", "do", "does", "did", "not", "no", "yes",
  "you", "your", "my", "me", "we", "us", "our", "course", "courses"
]);

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .filter(word => !STOP_WORDS.has(word))
    .map((word) => stemmer(word));
}

function codeTokens(code) {
  const match = code.toLowerCase().match(/([a-z]+)(\d+)/i);
  if (match) {
    return [match[1], match[2], code.toLowerCase()];
  }
  return [code.toLowerCase()];
}

function buildVocabulary(docs) {
  const vocabSet = new Set();
  docs.forEach((doc) => {
    tokenize(doc).forEach((word) => vocabSet.add(word));
  });
  return Array.from(vocabSet);
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

function inverseDocumentFrequency(docs, vocab) {
  const N = docs.length;
  return vocab.map((term) => {
    const df = docs.filter((doc) => tokenize(doc).includes(term)).length;
    return Math.log((N + 1) / (df + 1)) + 1;
  });
}

function tfidfVector(tf, idf) {
  return tf.map((t, i) => t * idf[i]);
}

// --- NEW: extractQuizCount from App.js ---
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

// --- NEW: Auto-tag "low quizzes" permanently ---
courses.forEach((course) => {
  const quizCount = extractQuizCount(course.summary || "");
  if (quizCount <= 2) { // threshold for "low quizzes"
    if (!course.tags) course.tags = [];
    if (!course.tags.includes("low quizzes")) {
      course.tags.push("low quizzes");
    }
  }
});

// --- Build the index ---
const docs = courses.map(
  (c) =>
    `${codeTokens(c.code).join(" ")} ${c.title} ${c.summary} ${(c.tags || []).join(" ")}`
);
const vocab = buildVocabulary(docs);
const idf = inverseDocumentFrequency(docs, vocab);
const courseVectors = docs.map((doc) =>
  tfidfVector(fuzzyTermFrequency(tokenize(doc), vocab), idf)
);

// --- Write files ---
fs.writeFileSync("public/courses.json", JSON.stringify(courses, null, 2));
fs.writeFileSync(
  "public/tfidf.json",
  JSON.stringify({ vocab, idf, courseVectors }, null, 2)
);

console.log("✅ Done! Files written to public/courses.json and public/tfidf.json with 'low quizzes' auto-tagged.");