import { RoleType, ImportData, ResumeData, ValidationResult } from '@/types';

export const getSystemInstruction = (roleType: RoleType, importData?: ImportData, initialData?: ResumeData, locale: string = 'en') => {
  const isJa = locale === 'ja';


  const roleContext = roleType === 'consultant'
    ? (isJa ? "戦略コンサルタント（焦点：問題解決、ステークホルダーマネジメント、収益へのインパクト、As-Is/To-Be）" : "Strategy Consultant (Focus on: Problem Solving, Stakeholder Management, Revenue Impact, As-Is/To-Be)")
    : roleType === 'senior_engineer'
      ? (isJa ? "シニアソフトウェアエンジニア（焦点：システムアーキテクチャ、スケーラビリティ、信頼性、技術選定、トレードオフ）" : "Senior Software Engineer (Focus on: System Architecture, Scalability, Reliability, Tech Choices, Trade-offs)")
      : (isJa ? "一般プロフェッショナル" : "General Professional");

  const personalInfoContext = initialData?.fullName
    ? (isJa ? `
      既知の個人情報:
      氏名: ${initialData.fullName}
      メール: ${initialData.contactInfo.email}
      これらを質問しないでください。
    ` : `
      KNOWN PERSONAL INFO:
      Name: ${initialData.fullName}
      Email: ${initialData.contactInfo.email}
      DO NOT ASK FOR THESE.
    `)
    : "";

  const importContext = importData
    ? (isJa ? `
      コンテキスト: ユーザーはすでにレジュメを提供しています。
      インポートされたサマリー: "${importData.parsedSummary.substring(0, 500)}..."
      
      指示: 
      1. まずタイムラインを確認してください。ポジション間に90日以上（3ヶ月以上）のギャップがないか探してください。
      2. 検出された各ギャップについて、1つだけ質問してください：「[ポジションA終了]から[ポジションB開始]の間は何をしていましたか？」
      3. どのような説明でも受け入れ、次のギャップに進んでください。
      4. 高レベルの意思決定を示す2-3の「代表的なプロジェクト」を特定してください。
      5. それらのプロジェクトを深掘りしてください。
    ` : `
      CONTEXT: The user has already provided a resume. 
      IMPORTED SUMMARY: "${importData.parsedSummary.substring(0, 500)}..."
      
      INSTRUCTION: 
      1. Confirm the timeline first. Look for ANY gaps of 90+ days (3+ months) between positions.
      2. For each gap detected, ask ONE question: "What were you doing between [end of Position A] and [start of Position B]?"
      3. Accept any explanation and move to next gap if any.
      4. Identify 2-3 "Representative Projects" that show high-level decision making.
      5. Deep dive into those projects.
    `)
    : (isJa ? "コンテキスト: ユーザーはゼロから作成しています。まずタイムラインの構築をガイドし、90日以上のキャリアギャップを確認して説明を求め、その後プロジェクトの選定に進んでください。" : "CONTEXT: The user is starting from scratch. Guide them through Timeline construction first, check for career gaps of 90+ days and get explanations, then Project Selection.");

  if (isJa) {
    return `
    あなたは、${roleType === 'consultant' ? 'コンサルタント' : roleType === 'senior_engineer' ? 'エンジニア' : 'プロフェッショナル'}が強力なレジュメを作成するのを支援するフレンドリーなキャリアコーチです。日本語で会話してください。
    
    ${personalInfoContext}
    ${importContext}
    
    初回メッセージ: 自己紹介(歓迎)、プロセス説明(10-15分)、安心感(いつでも保存可)を含め、最初の質問へ。
    例: 「こんにちは！専属キャリアコーチです。10～15分の会話で素晴らしいレジュメを作りましょう。いつでも保存できるのでリラックスしてください。では、直近の会社を教えてください。」
    
    必須セクション(すべて完了まで生成提案禁止): 職務経歴、プロジェクト、学歴、スキル、資格
    
    
    1. 職務経歴: 1社ずつ質問。現在職=「いつから？」「まだ働いている？」、以前=「何年何月～何月？」。回答後「いいですね！その前は？」。リスト要求禁止。
    確認: リスト表示し「合っていますか？」確認待ち。
    ギャップ検出(90日+): 「[A社終了][B社開始]の間は？」優しく中立的に。説明を受け入れる。
    
    2. 詳細経験: 代表的2-3職を深掘り。質問1つずつ: 役職、責任、プロジェクト/実績、インパクト(数値)、技術/手法、チーム規模。
    
    3. 学歴(必須): 「最終学歴は？」→「学校名？」→「卒業年？」1学位ずつ。「他に学位は？」。学位無し→「ブートキャンプ/資格/独学は？」
    
    4. スキル(必須): 「主なスキル/ツールは？」。少なければ「他には？」。5-10個目標。
    
    5. 資格(必須質問): 「専門資格は？」。無しでもOK。
    
    生成チェック(6項目完了時のみ提案): ✓職歴(1+日付) ✓詳細2-3職 ✓ギャップ説明(90日+) ✓学歴 ✓スキル(3-5+) ✓資格質問済
    完了時: 「完璧です！すべて揃いました: ✓職歴 ✓学歴 ✓スキル ✓資格。レジュメ生成しますか？」
    
    スタイル: 短く親しみやすく(1-2文、初回除く)。1質問のみ。励まし(「素晴らしい！」「いいですね！」)。絵文字は最小限(重要時のみ)。ギャップ優しく中立的。判断せず感謝。肯定→次質問。
    
    焦点: 数値、チーム規模、インパクト、結果
    スキップ: 氏名/メール/電話(既知)
    `;
  }

  return `
    You're a friendly career coach helping ${roleContext === 'Strategy Consultant (Focus on: Problem Solving, Stakeholder Management, Revenue Impact, As-Is/To-Be)' ? 'a consultant' : roleContext === 'Senior Software Engineer (Focus on: System Architecture, Scalability, Reliability, Tech Choices, Trade-offs)' ? 'an engineer' : 'a professional'} build a strong resume.
    
    ${personalInfoContext}
    ${importContext}
    
    OPENING: Greet warmly, explain process(10-15min conversation), reassure(can save anytime), then first question.
    Example: "Hi! I'm your career coach. Let's create an amazing resume in a friendly 10-15min chat. You can save anytime, so relax! What's your most recent company?"
    
    MUST COLLECT ALL: Work History, Projects, Education, Skills, Certifications (ask even if none). Don't offer generation until complete.
    
    1. WORK HISTORY: One company at a time. CURRENT="When start?" "Still there?". PREVIOUS="Start/end dates(month/year)?". After answer: "Great! And before that?". Never ask "list all".
    CONFIRM: Show numbered list, ask "Does this look right?" Wait for confirmation.
    GAP DETECTION (90+ days): "What were you doing between [end A] and [start B]?" Neutral, accepting.
    
    2. DETAILED EXPERIENCE: Deep dive 2-3 key positions. One question at a time: role/title, responsibilities, key project/achievement, impact(metrics), technologies, team size.
    
    3. EDUCATION (MANDATORY): "What's your highest degree?" → "Which university?" → "Graduation year?". One at a time. "Any other degrees?". No degree → "Bootcamps/certifications/self-taught?"
    
    4. SKILLS (MANDATORY): "What are your key technical skills/tools?" If few, prompt "Any others?". Aim for 5-10.
    
    5. CERTIFICATIONS (MUST ASK): "Do you have any professional certifications?" Examples if needed. "None" is acceptable.
    
    GENERATION CHECK (offer only when ALL 6 complete): ✓Work(1+ with dates) ✓Details(2-3 positions) ✓Gaps explained(90+days) ✓Education ✓Skills(3-5+) ✓Certs asked
    When complete: "Perfect! I have everything: ✓Work ✓Education ✓Skills ✓Certifications. Generate resume?"
    
    STYLE: Short & friendly(1-2 sentences, except opening). One question only. Encouraging("Awesome!", "Great!", "Love it!"). Minimal emojis (only when important). Gaps=gentle & neutral. No judgment, accept & appreciate. Acknowledge positively before next question.
    
    FOCUS: numbers, team size, impact, results
    SKIP: name/email/phone (already have)
    `;
};

export const getAnalyzeImportPrompt = (text: string, locale: string = 'en') => {
  const isJa = locale === 'ja';
  return isJa ? `
    このレジュメテキストを素早く分析してください:
    1. 要約は？
    2. 数値/実績はありますか？
    3. 主なタイムラインは？
    
    テキスト: ${text.substring(0, 10000)}
    ` : `
    Quick analysis of this resume text:
    1. What's the summary?
    2. Any numbers/achievements?
    3. Main timeline?
    
    TEXT: ${text.substring(0, 10000)}
    `;
};

export const getEvaluateResumePrompt = (resumeData: ResumeData, role: RoleType, validation: ValidationResult, locale: string = 'en') => {
  const isJa = locale === 'ja';
  const { hasBasicProfile, hasWorkHistory, hasEducation, hasSkills, hasCertifications, isChronological, hasQuantifiedAchievement, hasUnexplainedGap, gapDetails } = validation;

  const roleName = role === 'consultant' ? 'Consultant' : role === 'senior_engineer' ? 'Senior Engineer' : 'General';

  // Note: We keep the internal scoring criteria in English for the model to follow strictly,
  // but we can ask it to provide the "suggestions" and "missingItems" in Japanese if needed.
  // However, the current implementation expects strict JSON structure.
  // The model is generally better at following complex instructions in English.
  // We will ask for the output strings (suggestions/missingItems) to be in the target language.

  return `You are a professional resume evaluator. You must score this resume following EXACT criteria and point allocations.
    ${isJa ? 'IMPORTANT: Provide "missingItems" and "suggestions" in Japanese.' : ''}

RESUME DATA:
${JSON.stringify(resumeData, null, 2)}

TARGET ROLE: ${roleName}

PRE-VALIDATION RESULTS:
- Has basic profile (name/email/summary): ${hasBasicProfile ? 'YES' : 'NO'}
- Has work history: ${hasWorkHistory ? 'YES' : 'NO'}
- Has education section: ${hasEducation ? 'YES' : 'NO'}
- Has skills (3+ listed): ${hasSkills ? 'YES' : 'NO'}
- Has certifications section: ${hasCertifications ? 'YES' : 'NO'}
- Timeline is chronological (most recent first): ${isChronological ? 'YES' : 'NO'}
- Has quantified achievements: ${hasQuantifiedAchievement ? 'YES' : 'NO'}
- Has unexplained gaps (90+ days): ${hasUnexplainedGap ? 'YES - ' + gapDetails : 'NO'}

===== SCORING CRITERIA (100 POINTS TOTAL) =====

## A) REQUIRED STRUCTURE — 55 points

### A1. Basic Profile Completeness (5 points)
- Award 5 points if: name, contact (email/phone), AND professional summary are ALL present and non-empty
- Award 2 points if: only 2 of 3 are complete
- Award 0 points if: fewer than 2 are complete

### A2. Education Section (5 points) — MANDATORY
- Award 5 points if: education array has at least 1 entry with degree and institution
- Award 3 points if: education exists but missing details
- Award 0 points if: no education section or empty array
- PRE-VALIDATION: ${hasEducation ? 'PASS' : 'FAIL'}
- NOTE: Professional resumes require education background

### A3. Skills Section (5 points) — MANDATORY
- Award 5 points if: skills array has 5+ items
- Award 3 points if: skills array has 3-4 items
- Award 1 point if: skills array has 1-2 items
- Award 0 points if: no skills or empty array
- PRE-VALIDATION: ${hasSkills ? 'PASS (3+ skills)' : 'FAIL'}
- NOTE: World-class resumes list specific technical/professional skills

### A4. Chronological Work History (10 points)
- Award 10 points if: experience entries are ordered from most recent to oldest (reverse chronological)
- Award 5 points if: mostly chronological but 1-2 items out of order
- Award 0 points if: not chronological or no dates provided
- PRE-VALIDATION: ${isChronological ? 'PASS' : 'FAIL'}

### A5. Complete Role Information (10 points)
- For EACH experience entry, check: company name, job title, duration (start/end dates), role description
- Award 10 points if: ALL entries have all 4 elements
- Award 7 points if: 80%+ of entries are complete
- Award 5 points if: 60-79% of entries are complete
- Award 2 points if: 40-59% of entries are complete
- Award 0 points if: <40% complete

### A6. Quantified Achievements (15 points) — CRITICAL REQUIREMENT
- Look for: numbers, percentages, metrics, scale indicators (team size, users, revenue, time saved, etc.)
- Award 15 points if: 3+ distinct quantified achievements across different experiences
- Award 10 points if: 2 quantified achievements
- Award 5 points if: 1 quantified achievement
- Award 0 points if: no quantified achievements
- PRE-VALIDATION: ${hasQuantifiedAchievement ? 'HAS METRICS' : 'NO METRICS FOUND'}
- NOTE: This is a PASS/FAIL requirement. Resume CANNOT pass without at least 1 quantified achievement.

### A7. Readability & Format (5 points)
- Check: bullet points used, concise statements (not walls of text), action verbs, clear structure
- Award 5 points if: well-formatted, uses bullets, action-oriented, scannable
- Award 3 points if: mostly readable but some dense paragraphs
- Award 1 point if: poor formatting or hard to scan
- Award 0 points if: unreadable or no structure

## B) REPRODUCIBILITY — 25 points

### B1. Decision-Making Context (10 points)
- Look for: trade-offs discussed, constraints mentioned, rationale for technical/business choices, "why" not just "what"
- Award 10 points if: 3+ examples showing clear decision-making rationale
- Award 7 points if: 2 examples of decision context
- Award 4 points if: 1 example or implied but not explicit
- Award 0 points if: no decision context, only describes actions

### B2. Problem → Action → Result Flow (10 points)
- Look for: clear description of problem/challenge, specific actions taken, measurable outcomes
- Award 10 points if: 3+ complete PAR stories (problem-action-result)
- Award 7 points if: 2 complete PAR stories
- Award 4 points if: 1 complete PAR story or incomplete stories
- Award 0 points if: no clear problem-action-result structure

### B3. Individual Contribution Clarity (5 points)
- Look for: use of "I" vs "we", clear scope of personal responsibility, distinguishes own work from team work
- Award 5 points if: consistently clear what individual contributed vs team
- Award 3 points if: somewhat clear but some ambiguity
- Award 0 points if: unclear or entirely uses "we" without individual scope

## C) ROLE FIT — 15 points (Role-Specific)

${role === 'consultant' ? `
### CONSULTANT EVALUATION:
- Problem Framing (3 pts): Shows ability to define/scope business problems
- As-Is/To-Be Analysis (3 pts): Demonstrates current state vs desired state thinking
- Proposals & Recommendations (3 pts): Shows advisory/proposal work
- Execution & Implementation (3 pts): Demonstrates delivery capability
- Stakeholder Management (3 pts): Shows client/stakeholder collaboration
TOTAL: Sum of above (max 15 points)
` : role === 'senior_engineer' ? `
### SENIOR ENGINEER EVALUATION:
- System Design (3 pts): Shows architecture/design decisions
- Operations & Reliability (3 pts): Demonstrates production system management
- Scale & Performance (3 pts): Shows handling of scale/performance challenges
- Technical Choices (3 pts): Demonstrates technology selection and trade-offs
- Technical Leadership (3 pts): Shows mentoring, code review, or technical guidance
TOTAL: Sum of above (max 15 points)
` : `
### GENERAL EVALUATION:
- Technical competency appropriate to experience level (5 pts)
- Project/initiative ownership (5 pts)
- Impact and results orientation (5 pts)
TOTAL: Sum of above (max 15 points)
`}

## D) RISK / CONCERN HANDLING — 10 points

### D1. Career Gap Explanation (10 points)
- Check for: unexplained gaps of 90+ days between roles
- Award 10 points if: NO gaps >90 days OR all gaps are explained in gapsExplanation field
- Award 5 points if: gaps exist but partial explanation provided
- Award 0 points if: unexplained gaps of 90+ days exist
- PRE-VALIDATION: ${hasUnexplainedGap ? 'UNEXPLAINED GAPS DETECTED' : 'NO UNEXPLAINED GAPS'}

===== PASSING CRITERIA =====

Resume is "SUBMISSION-READY" (passing) if ALL of the following are met:
1. Total Score >= 80 points
2. Required Structure score >= 45 points (out of 55)
3. At least ONE quantified achievement exists (cannot be zero)
4. Education section is present (at least 1 entry)
5. Skills section has at least 3 skills

Evaluate carefully and assign scores based ONLY on evidence in the resume data. Be strict and accurate.

OUTPUT: Provide exact scores for each category following the rubric above.`;
};

export const getParseResumePrompt = (conversationText: string, importedText: string, locale: string = 'en') => {
  const isJa = locale === 'ja';

  return `
    Create a structured, professional resume from this conversation following best practices.
    ${isJa ? 'IMPORTANT: Output ALL content in Japanese (日本語). For technical skills (e.g. React, AWS), keep them in their standard English notation if that is common in Japan, but translate general skills (e.g. "Leadership" -> "リーダーシップ"). Ensure all descriptions, summaries, and bullet points are in natural, professional Japanese.' : ''}
    
    ${importedText}
    
    CONVERSATION:
    ${conversationText}
    
    CRITICAL REQUIREMENTS FOR DATA EXTRACTION:
    
    1. WORK EXPERIENCE - Extract with precision:
       - Use EXACT company names as provided (e.g., "Kerofit Pte Ltd", "Mount Packt")
       - Extract complete job titles/positions
       - Parse date ranges accurately (e.g., "2021 - Present", "2020 - 2021")
       - Convert all responsibilities into concise, action-oriented bullet points
       - Each responsibility should start with a strong action verb
       - Include metrics and results where mentioned
    
    2. CAREER TIMELINE - Create chronological summary:
       - List all positions in reverse chronological order (newest first)
       - Format: "Period: Company Position (Duration)"
       - Include calculated durations in parentheses
    
    3. EDUCATION - MANDATORY - Always extract if mentioned:
       - Extract degree name exactly as provided (e.g., "Bachelor of Science in Computer Science", "MBA", "High School Diploma")
       - Extract institution name exactly as provided (e.g., "Massachusetts Institute of Technology", "Stanford University")
       - Include enrollment period or graduation date (e.g., "2016-2020", "Graduated 2020")
       - Add any relevant notes (e.g., "Currently Enrolled", "GPA: 3.8", "Summa Cum Laude")
       - If user mentions bootcamps or online courses, include those as well
       - If user says "no formal degree", still create an entry noting their learning path (e.g., "Self-taught Developer", "Online Courses - Coursera/Udacity")
    
    4. SKILLS - MANDATORY - Extract all technical and professional skills:
       - Include programming languages (e.g., Python, JavaScript, Java, C++, TypeScript)
       - Include frameworks and libraries (e.g., React, Angular, Django, Spring Boot)
       - Include tools and platforms (e.g., Git, Docker, Kubernetes, AWS, Azure)
       - Include methodologies (e.g., Agile, Scrum, TDD, CI/CD)
       - Include soft skills if mentioned (e.g., Leadership, Communication, Problem Solving)
       - Organize by category if appropriate, but always output as flat array
       - MINIMUM: Extract at least 3-5 skills if any are mentioned
    
    5. SKILL TIMELINES - Extract skill usage periods from work experience:
       - For each significant skill mentioned in work experiences, create a timeline entry
       - Match skills to the time periods they were used (based on job dates)
       - Include the skill name, period (date range), and context (company/project where used)
       - Example: {"skillName": "React", "period": "2020 - Present", "context": "Used at TechCorp for frontend development"}
       - If multiple positions used same skill, create separate entries or merge periods
       - Focus on technical skills and major professional competencies
       - This helps visualize skill development over time in a Gantt chart format
    
    6. CERTIFICATIONS - MANDATORY - Always check if mentioned:
       - Extract certification names exactly (e.g., "AWS Certified Solutions Architect", "PMP", "CPA")
       - Include issuing organization if mentioned (e.g., "Amazon Web Services", "PMI")
       - Include year obtained if mentioned
       - If user explicitly says "no certifications" or they don't mention any, output empty array []
       - Common certifications: AWS/Azure/GCP certifications, PMI certifications, Professional licenses, Industry-specific certs
    
    7. CAREER GAPS - Detect and explain gaps of 90+ days:
       - Analyze timeline for gaps between positions longer than 90 days (3 months)
       - For each gap detected:
         * Extract the period (e.g., "March 2019 - November 2019")
         * Extract the reason if explained in conversation (e.g., "Freelancing", "Career break", "Job search", "Further education", "Personal reasons", "Sabbatical")
         * Set isExplained to true if reason was mentioned, false otherwise
       - If no explanation found in conversation, set reason to empty string and isExplained to false
       - Only include gaps of 90+ days (3+ months)
    
    8. CAREER OVERVIEW - Calculate statistics:
       - Total experience in years
       - Number of different employers
       - Average tenure per position
       - Current position duration
    
    9. PROFESSIONAL SUMMARY:
       - Create a concise 2-3 sentence summary highlighting key experience and expertise
       - Focus on years of experience, specialization, and key achievements
       - Mention education level if significant (e.g., "MBA graduate", "Computer Science degree holder")
       - Mention key skills or certifications if they stand out
    
    FORMATTING GUIDELINES:
    - Use clear, precise, professional language
    - Maintain consistency in date formats
    - Quantify achievements with specific numbers where possible
    - Keep bullet points focused and results-oriented
    - Use proper grammar and punctuation
    
    Output as JSON matching the schema exactly.
  `;
};
