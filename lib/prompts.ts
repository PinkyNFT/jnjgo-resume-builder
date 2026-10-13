import { RoleType, ImportData, ResumeData, ValidationResult } from '@/types';
import { getAdminPromptContent, getAdminSetting } from '@/lib/admin-settings-reader';
import { resumeForPrompt } from '@/lib/ai-guards';

const DEFAULT_GAP_THRESHOLD = 90;

/**
 * Reads the admin-configured gap detection threshold (in days).
 * Falls back to 90 if the setting hasn't been configured.
 */
async function getGapThreshold(): Promise<number> {
  return getAdminSetting<number>('gap_detection_threshold_days', DEFAULT_GAP_THRESHOLD);
}

/**
 * Prompt resolution strategy (layered override):
 *
 *   1. Admin DB override  — editable via /admin → Prompts
 *   2. prompt-defaults.ts — immutable source-of-truth in code
 *
 * All prompts use {{VARIABLE}} placeholders that are substituted at runtime.
 * The inline hardcoded fallbacks that previously lived here have been removed;
 * `getAdminPromptContent` handles the full fallback chain.
 */

/**
 * Helper: substitute {{VARIABLE}} placeholders in a template string.
 */
function substituteVars(template: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce(
    (result, [key, value]) => result.replaceAll(`{{${key}}}`, value),
    template
  );
}

/**
 * Build the role-specific criteria text for evaluate_resume prompts.
 */
function getRoleCriteria(role: RoleType): string {
  if (role === 'consultant') {
    return `### CONSULTANT EVALUATION:
- Problem Framing (3 pts): Shows ability to define/scope business problems
- As-Is/To-Be Analysis (3 pts): Demonstrates current state vs desired state thinking
- Proposals & Recommendations (3 pts): Shows advisory/proposal work
- Execution & Implementation (3 pts): Demonstrates delivery capability
- Stakeholder Management (3 pts): Shows client/stakeholder collaboration
TOTAL: Sum of above (max 15 points)`;
  }
  if (role === 'senior_engineer') {
    return `### SENIOR ENGINEER EVALUATION:
- System Design (3 pts): Shows architecture/design decisions
- Operations & Reliability (3 pts): Demonstrates production system management
- Scale & Performance (3 pts): Shows handling of scale/performance challenges
- Technical Choices (3 pts): Demonstrates technology selection and trade-offs
- Technical Leadership (3 pts): Shows mentoring, code review, or technical guidance
TOTAL: Sum of above (max 15 points)`;
  }
  return `### GENERAL EVALUATION:
- Role Clarity & Positioning (3 pts): Is the candidate's professional function clearly communicated with a defined scope?
- Cross-Functional Impact (3 pts): Does the resume show measurable deliverables and stakeholder collaboration?
- Growth Trajectory (3 pts): Does the career progression demonstrate increasing scope, responsibility, or seniority?
- Communication of Value (3 pts): Are achievements framed in terms of business or team impact, not just task completion?
- Adaptability & Breadth (3 pts): Does the candidate show versatility across contexts, tools, or domains?
TOTAL: Sum of above (max 15 points)`;
}

// ===== SYSTEM INSTRUCTION (Chat) =====

export const getSystemInstruction = async (roleType: RoleType, importData?: ImportData, initialData?: ResumeData, locale: string = 'en'): Promise<string> => {
  const isJa = locale === 'ja';
  const gapDays = await getGapThreshold();

  // Build variable values
  const roleContextEn = roleType === 'consultant'
    ? 'a consultant'
    : roleType === 'senior_engineer'
      ? 'an engineer'
      : 'a professional in any field. IMPORTANT: Ask for their job title and industry in your very first question (e.g. "What is your current title and what industry do you work in?"). Once you know, adapt all follow-up questions to that specific domain — a marketer needs questions about campaigns and revenue impact; a sales professional needs questions about quotas and deals; an HR professional needs questions about hiring, retention, and initiatives. Frame every question around the language and concerns of their actual field';

  const roleContextJa = roleType === 'consultant'
    ? 'コンサルタント'
    : roleType === 'senior_engineer'
      ? 'エンジニア'
      : 'あらゆる職種のプロフェッショナル。重要：最初の質問で必ず役職と業界を確認してください（例：「現在の役職と業界を教えてください」）。それが分かったら、その職種に合わせた質問をしてください。マーケターにはキャンペーンや売上への影響を、営業職にはクォータや商談を、HR職には採用・定着・施策を中心に質問してください';

  const roleContext = isJa ? roleContextJa : roleContextEn;

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
    : '';

  const importContext = importData
    ? (isJa ? `
      コンテキスト: ユーザーはすでにレジュメを提供しています。
      インポートされたレジュメ全体:
      "${importData.sourceText.substring(0, 10000)}"
      
      指示: 
      1. インポートされた情報の中に、基本情報、職務経歴、学歴、スキルなどの必須項目がすでに存在する場合は、それらを再度質問しないでください。既存のデータを尊重してください。
      2. まずタイムラインを確認してください。ポジション間に${gapDays}日以上のギャップがないか探してください。
      2. 検出された各ギャップについて、1つだけ質問してください：「[ポジションA終了]から[ポジションB開始]の間は何をしていましたか？」
      3. どのような説明でも受け入れ、次のギャップに進んでください。
      4. 高レベルの意思決定を示す2-3の「代表的なプロジェクト」を特定してください。
      5. それらのプロジェクトを深掘りしてください。
    ` : `
      CONTEXT: The user has already provided a complete resume. 
      IMPORTED RESUME: 
      "${importData.sourceText.substring(0, 10000)}"
      
      INSTRUCTION: 
      1. CRITICAL: Do NOT ask for basic information (work history, education, skills) that is already present in the imported resume. Acknowledge what you have and move on.
      2. Confirm the timeline first. Look for ANY gaps of ${gapDays}+ days between positions.
      2. For each gap detected, ask ONE question: "What were you doing between [end of Position A] and [start of Position B]?"
      3. Accept any explanation and move to next gap if any.
      4. Identify 2-3 "Representative Projects" that show high-level decision making.
      5. Deep dive into those projects.
    `)
    : (isJa
      ? `コンテキスト: ユーザーはゼロから作成しています。まずタイムラインの構築をガイドし、${gapDays}日以上のキャリアギャップを確認して説明を求め、その後プロジェクトの選定に進んでください。`
      : `CONTEXT: The user is starting from scratch. Guide them through Timeline construction first, check for career gaps of ${gapDays}+ days and get explanations, then Project Selection.`);

  // Try to load from admin DB (falls back to prompt-defaults.ts automatically)
  const content = await getAdminPromptContent('system_instruction', locale);
  if (!content) {
    throw new Error('Prompt "system_instruction" not found in DB or defaults. Check prompt-defaults.ts.');
  }

  return substituteVars(content, {
    ROLE_CONTEXT: roleContext,
    PERSONAL_INFO_CONTEXT: personalInfoContext,
    IMPORT_CONTEXT: importContext,
    GAP_THRESHOLD_DAYS: String(gapDays),
  });
};

// ===== INTERVIEW FOLLOW-UP (scripted mode) =====

export const getFollowUpInstruction = async (roleType: RoleType, locale: string = 'en'): Promise<string> => {
  const isJa = locale === 'ja';
  const roleContext = roleType === 'consultant'
    ? (isJa ? 'コンサルタント' : 'a consultant')
    : roleType === 'senior_engineer'
      ? (isJa ? 'エンジニア' : 'an engineer')
      : (isJa ? 'あらゆる職種のプロフェッショナル' : 'a professional in any field');

  const content = await getAdminPromptContent('interview_followup', locale);
  if (!content) {
    throw new Error('Prompt "interview_followup" not found in DB or defaults. Check prompt-defaults.ts.');
  }
  return substituteVars(content, { ROLE_CONTEXT: roleContext });
};

/** The single question and answer a follow-up is written from (never the whole conversation). */
export const getFollowUpInput = (question: string, answer: string, context: string | undefined, locale: string = 'en'): string => {
  const isJa = locale === 'ja';
  return [
    context ? `${isJa ? '職務' : 'Role'}: ${context}` : '',
    `${isJa ? '質問' : 'Question'}: ${question}`,
    `${isJa ? '回答' : 'Answer'}: ${answer}`,
  ].filter(Boolean).join('\n');
};

// ===== ANALYZE IMPORT =====

export const getAnalyzeImportPrompt = async (text: string, locale: string = 'en'): Promise<string> => {
  const truncatedText = text.substring(0, 10000);
  const gapDays = await getGapThreshold();

  const content = await getAdminPromptContent('analyze_import', locale);
  if (!content) {
    throw new Error('Prompt "analyze_import" not found in DB or defaults. Check prompt-defaults.ts.');
  }

  return substituteVars(content, {
    RESUME_TEXT: truncatedText,
    GAP_THRESHOLD_DAYS: String(gapDays),
  });
};

// ===== EVALUATE RESUME =====

export const getEvaluateResumePrompt = async (resumeData: ResumeData, role: RoleType, validation: ValidationResult, locale: string = 'en'): Promise<string> => {
  const isJa = locale === 'ja';
  const gapDays = await getGapThreshold();
  const { hasBasicProfile, hasWorkHistory, hasEducation, hasSkills, hasCertifications, isChronological, hasQuantifiedAchievement, hasUnexplainedGap, gapDetails } = validation;

  const roleName = role === 'consultant' ? 'Consultant' : role === 'senior_engineer' ? 'Senior Engineer' : 'General';
  const roleCriteria = getRoleCriteria(role);

  // Build variable map for template substitution
  const vars: Record<string, string> = {
    LOCALE_INSTRUCTION: isJa ? 'IMPORTANT: Provide "missingItems" and "suggestions" in Japanese.' : '',
    // Compact JSON without the photo (a base64 data URL worth 38k–77k tokens).
    RESUME_DATA: resumeForPrompt(resumeData),
    ROLE_NAME: roleName,
    HAS_BASIC_PROFILE: hasBasicProfile ? 'YES' : 'NO',
    HAS_WORK_HISTORY: hasWorkHistory ? 'YES' : 'NO',
    HAS_EDUCATION: hasEducation ? 'YES' : 'NO',
    HAS_SKILLS: hasSkills ? 'YES' : 'NO',
    HAS_CERTIFICATIONS: hasCertifications ? 'YES' : 'NO',
    IS_CHRONOLOGICAL: isChronological ? 'YES' : 'NO',
    HAS_QUANTIFIED: hasQuantifiedAchievement ? 'YES' : 'NO',
    HAS_UNEXPLAINED_GAP: hasUnexplainedGap ? 'YES - ' + gapDetails : 'NO',
    EDUCATION_VALIDATION: hasEducation ? 'PASS' : 'FAIL',
    SKILLS_VALIDATION: hasSkills ? 'PASS (3+ skills)' : 'FAIL',
    CHRONOLOGICAL_VALIDATION: isChronological ? 'PASS' : 'FAIL',
    QUANTIFIED_VALIDATION: hasQuantifiedAchievement ? 'HAS METRICS' : 'NO METRICS FOUND',
    ROLE_CRITERIA: roleCriteria,
    GAP_VALIDATION: hasUnexplainedGap ? 'UNEXPLAINED GAPS DETECTED' : 'NO UNEXPLAINED GAPS',
    GAP_THRESHOLD_DAYS: String(gapDays),
  };

  const content = await getAdminPromptContent('evaluate_resume', locale);
  if (!content) {
    throw new Error('Prompt "evaluate_resume" not found in DB or defaults. Check prompt-defaults.ts.');
  }

  return substituteVars(content, vars);
};

// ===== PARSE RESUME (Generation) =====

export const getParseResumePrompt = async (conversationText: string, importedText: string, locale: string = 'en'): Promise<string> => {
  const gapDays = await getGapThreshold();

  const content = await getAdminPromptContent('parse_resume', locale);
  if (!content) {
    throw new Error('Prompt "parse_resume" not found in DB or defaults. Check prompt-defaults.ts.');
  }

  return substituteVars(content, {
    CONVERSATION_TEXT: conversationText,
    IMPORTED_TEXT: importedText,
    GAP_THRESHOLD_DAYS: String(gapDays),
  });
};

// ===== PROFESSIONAL HEADSHOT (Image generation) =====

/**
 * Instruction prompt for the image model ("Nano Banana") to turn a user's photo
 * into a professional business headshot WITHOUT changing the face.
 *
 * This is an instruction to the image model — it produces no visible text in the
 * output image, so it is intentionally English-only and needs no i18n.
 *
 * Structure follows Google's official Gemini image-editing guidance ("change only
 * X, keep everything else exactly the same") plus community face-consistency
 * practice: lead with the identity lock, then enumerate the exact features to
 * preserve. The model reinterprets rather than hard-locks faces, so the UI always
 * keeps the original and offers regenerate/revert.
 */
export const getProfessionalHeadshotPrompt = (): string =>
  `Using the provided photo, create a professional business headshot of the exact same person.

CRITICAL — PRESERVE IDENTITY: Use the face, skin tone, facial features, and hair of the person in the uploaded photo exactly as shown. Keep their exact facial structure, face shape, facial proportions, eyes, nose, mouth, jawline, natural skin texture, and natural expression. Do NOT alter, beautify, slim, smooth, reshape, or retouch the face in any way. Do not change their age, gender, ethnicity, weight, or identity. It must remain unmistakably the same real person.

Change ONLY the following, and keep everything about the face and head exactly the same:
- Attire: dress the person in clean, well-fitted professional business attire (e.g. a dark tailored blazer over a crisp collared shirt) suitable for a corporate resume.
- Background: replace the background with a clean, evenly lit, neutral studio backdrop (light gray or soft white).
- Lighting: apply soft, flattering, professional studio lighting (soft key light with gentle fill) while keeping skin tones natural and true to the original.
- Framing: a head-and-shoulders portrait in a square 1:1 aspect ratio, subject centered, facing the camera.

Output a single photorealistic, high-resolution, square (1:1) headshot. Do not add any text, logos, watermarks, borders, or graphic elements.`;
