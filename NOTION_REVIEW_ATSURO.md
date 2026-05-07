# JNJGO Resume Builder — Pre-Launch Test Guide

> **Who this is for:** Atsuro (product review, non-technical)
> **Estimated time:** 45–60 minutes to complete all tests
> **App URL:** `[FILL IN THE LIVE URL HERE]`
> **Support contact:** dev@kerofi.net

---

## Before You Start

**You will need:**
- A personal Google account (for Candidate tests)
- A corporate/work Google account (for Recruiter tests) — Gmail, Yahoo, and Outlook are blocked for recruiters by design
- The live app URL (ask the team if you don't have it)
- A desktop or laptop browser (Chrome or Safari recommended)

**How to read this document:**

- Each test has numbered steps — follow them in order
- **✅ PASS** — the green box tells you exactly what success looks like
- **❌ FAIL** — the red box tells you what a problem looks like
- If you see a FAIL, take a screenshot and note the test number before moving on

---

---

# SECTION 1 — Candidate Tests

*A "Candidate" is someone building a resume on JNJGO.*

---

## Test C-1 — Sign In as a Candidate

**What this checks:** New users can create an account and pick the Candidate role without errors.

**Steps:**
1. Open the app URL in your browser
2. You should see the landing page with the headline **"Build Resumes That Win Interviews"**
3. Click **"Get Started Free"** (or **"Sign In"** in the top-right corner)
4. A sign-in screen appears — click **"Continue with Google"**
5. Complete Google's login flow (pick your personal Google account)
6. After logging in for the first time, you should see a screen asking you to choose your role
7. The screen will show two cards: one for **"Candidate"** and one for **"Recruiter"**
8. Click the **Candidate** card — it highlights in blue with a checkmark
9. Click the **"Continue"** button
10. Wait a few seconds — the button shows a spinner while setting up your account

**✅ PASS if:**
You land on a page titled **"Dashboard"** that says *"No resumes yet"* with a large button labelled **"Start New Resume"**

**❌ FAIL if:**
- The page shows an error message
- You stay on the role selection screen after clicking Continue
- The screen goes blank or shows a spinning loader that never stops (wait 15 seconds before concluding it's stuck)

---

## Test C-2 — Create a New Resume (Role Selection)

**What this checks:** Candidates can start a new resume and choose their professional role type.

**Steps:**
1. From the Dashboard, click the **"Start New Resume"** button (or **"Create New Project"** if you already have resumes)
2. A setup screen appears — look for a section labelled with role options
3. You will see at least 3 choices. For this test, select **"Consultant / PM"**
4. Click **"Next"** or **"Continue"** to proceed

**✅ PASS if:**
You are moved to the next step (Personal Info form) without any error

**❌ FAIL if:**
- Clicking the role card does nothing
- An error appears after clicking Continue
- The page reloads and takes you back to the Dashboard

---

## Test C-3 — Fill In Personal Info

**What this checks:** The personal information form saves correctly.

**Steps:**
1. After selecting a role, you should see a form asking for your details
2. Fill in all required fields:
   - **Full Name** — e.g., `Atsuro Tanaka`
   - **Email** — your email address
   - **Phone** — e.g., `090-1234-5678`
   - **Location** — e.g., `Tokyo, Japan`
   - **LinkedIn URL** — (optional) e.g., `https://linkedin.com/in/yourname`
3. Click **"Save"** or **"Next"** to continue

**✅ PASS if:**
The form saves and you are moved to the next screen (the AI interview chat interface)

**❌ FAIL if:**
- An error appears saying a valid field is invalid (e.g., correctly formatted phone number rejected)
- The form won't submit even with all fields filled
- You are stuck on the same form after clicking Save

> **Note:** If you leave the LinkedIn field empty, that is fine — it is optional. The form should still save successfully.

---

## Test C-4 — AI Interview (Core Feature)

**What this checks:** The AI interview agent responds correctly, asks relevant questions, and tracks progress as you answer.

**Steps:**
1. You should now be on the interview screen. You will see a chat interface with a message from the AI agent (labelled **"JNJGO Agent"**)
2. The AI's first message will ask about your work history
3. In the text box at the bottom (labelled *"Type your answer..."*), type a response about your career — for example:
   > *"I have been working as an IT consultant for 8 years. Most recently I was a project manager at a system integration company, leading a team of 12 people on a ¥500M ERP implementation."*
4. Press **Enter** on your keyboard (or click the arrow button) to send
5. Wait for the AI to respond — you will see *"Agent is thinking..."* while it processes
6. The AI's response will appear as a new message — read it and answer its follow-up question
7. Repeat this back-and-forth at least **6 times**
8. Watch the **"Interview Progress"** sidebar or panel — it should show sections being ticked off as you cover them (Work History, Experience Details, Education, Skills, Certifications, Gaps)

**✅ PASS if:**
- The AI responds within about 15 seconds after each message
- Each AI response is relevant to what you wrote (it asks follow-up questions about your career, not random topics)
- At least 1–2 sections in the progress tracker get marked as covered after your first few answers
- At some point the AI says something like *"I have everything I need"* or the green banner **"All Sections Collected!"** appears

**❌ FAIL if:**
- The AI never responds (spinner stays on screen for more than 30 seconds)
- The AI's response is in the wrong language (e.g., Japanese when the app is in English)
- The AI says the same thing repeatedly without advancing the conversation
- Clicking Send does nothing
- An error message appears in the chat

> **Tip:** If the AI asks about a career gap (a period when you weren't employed), make up a simple answer like: *"I took 3 months off to care for a family member."* The AI should accept this and move on.

---

## Test C-5 — Generate Resume

**What this checks:** Once the interview is complete, the resume generation process works and produces a real resume.

**Steps:**
1. Continue the interview until either:
   - The green banner **"All Sections Collected!"** appears at the top of the chat, **OR**
   - The button **"Generate Resume"** lights up in the progress panel
2. Click the **"Generate Resume"** button
3. A confirmation dialog will appear showing a summary of what was collected — click **"✓ Confirm & Generate"**
4. You are taken to a generation screen — it shows the message *"Generating Your Master Resume"* with a loading animation
5. Wait — this usually takes 20–40 seconds

**✅ PASS if:**
After the loading screen, a full resume document appears. It should contain:
- Your name and contact information at the top
- Multiple sections (Work Experience, Skills, Education, etc.)
- Real content based on what you told the AI — not placeholder text like "Lorem ipsum"

**❌ FAIL if:**
- The loading spinner runs for more than 2 minutes without showing a resume
- The generated resume is blank or shows only placeholder text
- An error message appears during generation
- You are redirected back to the Dashboard without a resume being shown

> **Note:** If the AI says *"Some sections may not be fully covered yet"* and offers **"Generate Early"**, you can click that instead. The resume may be less complete, but the test is still valid — a result should appear.

---

## Test C-6 — Score / Analyse the Resume

**What this checks:** The scoring system evaluates the resume and gives a score out of 100.

**Steps:**
1. After generation, you should be on the Resume Editor screen
2. Look for the button labelled **"Run Score Analysis"** — it has a small bar-chart icon next to it
3. Click **"Run Score Analysis"**
4. Wait about 15–20 seconds — the button will show a spinning icon while it works
5. A score will appear with the heading **"{number}/100"**

**✅ PASS if:**
- A number score appears (e.g., **72/100** or **85/100**)
- Below the score, you see four coloured progress bars labelled: **Structure**, **Reproducibility**, **Role Fit**, **Risk**
- If the score is 80 or above, a green badge says **"Passing"**
- If the score is below 80, an amber badge says **"Needs Work"** — this is also acceptable; the test passes as long as a score is shown

**❌ FAIL if:**
- Clicking "Run Score Analysis" does nothing
- The spinner runs for more than 1 minute without producing a score
- An error message appears
- The score shown is `0/100` with no breakdown

---

## Test C-7 — Export the Resume (Copy for LinkedIn / BizReach)

**What this checks:** Candidates can copy their resume content in a format ready for job platforms.

**Steps:**
1. In the top navigation bar, click **"Export"**
2. You will see the Export page with two large cards:
   - **"LinkedIn Protocol"**
   - **"BizReach Setup Wizard"**
3. Click **"Open Exporter"** under LinkedIn Protocol
4. A section-by-section view appears with headings like **Headline**, **About**, **Experience**
5. Click **"Copy All"** at the top right of the export panel
6. A small green notification should appear at the bottom of the screen saying **"Copied to clipboard!"**
7. Open a text editor (Notepad, Notes, etc.) and paste — you should see the resume content

**✅ PASS if:**
- The exported text contains real content from your resume (not empty, not "Lorem ipsum")
- The **"Copied to clipboard!"** notification appears after clicking Copy All
- Pasting into a text editor shows the resume text

**❌ FAIL if:**
- Clicking "Open Exporter" shows an empty or broken page
- "Copy All" does not trigger the green notification
- Pasting into a text editor gives empty content
- An error appears on the Export page

---

---

# SECTION 2 — Recruiter Tests

*A "Recruiter" is someone who uses JNJGO to search for and contact candidates.*

> **Important:** Recruiter accounts require a **corporate/work Google account** (Google Workspace). Personal Gmail, Yahoo, or Outlook addresses will be blocked by design. Use a work email linked to Google.

---

## Test R-1 — Sign Up as a Recruiter

**What this checks:** A recruiter can create an account, select the Recruiter role, and complete company onboarding.

**Steps:**
1. Open the app URL in a browser where you are **not** already signed in (or use an Incognito window)
2. Click **"Sign In"** and sign in with your **work Google account**
3. On the role selection screen, click the **"Recruiter"** card (green theme)
4. Click **"Continue"**
5. You will be taken to a Recruiter Onboarding form — fill in:
   - **Company Name** — e.g., `Kerofi Inc.`
   - **Job Title** — e.g., `Head of Talent`
   - **Recruiter Type** — select either "In-house" or "Agency"
6. Click **"Save"** or **"Submit"**

**✅ PASS if:**
After submitting, you see a screen with a large clock icon that says something like **"Your application is under review"** — this is the Pending Approval screen

**❌ FAIL if:**
- The onboarding form won't submit
- After submitting, you are sent directly to the Recruiter Dashboard (this would mean approval was skipped, which is a bug)
- An error appears saying your work email is invalid (assuming it is a genuine corporate Google Workspace email)

---

## Test R-2 — Admin Approves the Recruiter Account

**What this checks:** The admin can approve a recruiter, and the recruiter then gains access.

**Steps (Admin side — do this from an admin-enabled account):**
1. Sign in to the app with the admin account
2. Navigate to **Admin** in the top bar
3. Click the **"Users"** tab
4. Find the recruiter account you just created — it should show status **"Pending"** or **"pending_recruiter"**
5. Click the approve button (it may be labelled **"Approve"** or show a checkmark icon)

**Steps (Recruiter side — verify after approval):**
6. Refresh the page in the recruiter browser (or sign out and back in)
7. You should now land on the **Recruiter Dashboard** instead of the Pending page

**✅ PASS if:**
The recruiter now sees the **Recruiter Dashboard** with stats (Profiles Viewed, Saved Candidates, Active Candidates, Scouts Sent)

**❌ FAIL if:**
- The recruiter still sees the Pending Approval screen after refresh
- The Users tab in Admin does not show the pending recruiter
- Approving the recruiter causes an error

---

## Test R-3 — Browse Candidates

**What this checks:** Approved recruiters can see and search candidate profiles.

**Steps:**
1. In the Recruiter Dashboard, click the **"Browse"** tab
2. A list of candidate cards should appear (only candidates who have published their profile are visible)
3. Each card shows a candidate's current role, skills, salary expectation, and availability
4. Click on a candidate card or the **"View Full Profile"** link
5. The candidate's full profile page opens

**✅ PASS if:**
- At least one candidate card is visible (if no candidates have published profiles yet, see the note below)
- Clicking "View Full Profile" opens a detailed profile page with sections for skills, work history, and an AI objective summary

**❌ FAIL if:**
- The Browse tab shows an error
- Clicking "View Full Profile" causes an error or blank page

> **Note:** If the Browse tab shows "No candidates found", this may simply mean no candidates have published their profiles yet — not a bug. First complete at least one Candidate flow (Test C-1 through C-6) and publish the profile (see Test C-8 below), then return here.

---

## Test R-4 — Send a Scout Message to a Candidate

**What this checks:** Recruiters can send messages, and the message appears in the candidate's inbox.

**Steps (Recruiter):**
1. From a candidate's full profile page, look for a **"Send Message"** or **"Contact"** button
2. Click it — a text input area appears
3. Write a short message, e.g.: *"Hello, I came across your profile and would love to connect regarding an opportunity at our company."*
4. Click **"Send"**

**Steps (Candidate — verify receipt):**
5. Sign in as the candidate (use a different browser or Incognito window)
6. In the top navigation, click **"Messages"** or look for a messages link
7. The recruiter's message should appear in the inbox

**✅ PASS if:**
- The message sends without an error (recruiter sees a confirmation or the message appears in the chat thread)
- The candidate sees the message in their inbox

**❌ FAIL if:**
- Clicking Send causes an error
- The message never appears in the candidate's inbox (wait 30 seconds and refresh before concluding)

---

---

# SECTION 3 — Admin Tests

*The Admin panel lets the team manage users, review activity, and edit AI prompts.*

---

## Test A-1 — Access the Admin Panel

**What this checks:** The Admin panel is accessible only to authorised accounts, and the main sections load.

**Steps:**
1. Sign in with the designated admin account (the email set up as admin)
2. In the top navigation bar, you should see an **"Admin"** link — click it
3. You land on the **Admin Dashboard** with six tabs: **Overview**, **Funnel**, **Prompts**, **Settings**, **Users**, **Audit Log**
4. Click each tab and verify it loads without error:
   - **Overview** — shows stats on total users, candidates, recruiters
   - **Users** — shows a list of all registered users with their roles
   - **Audit Log** — shows a list of recent actions (logins, approvals, etc.)

**✅ PASS if:**
All three tabs (Overview, Users, Audit Log) load and show content without errors

**❌ FAIL if:**
- The "Admin" link doesn't appear in the nav for the admin account
- Any tab shows an error or blank page
- A non-admin account can access `/admin` — this would be a serious security issue

> **To test the security check:** Sign in with a normal (non-admin) candidate account and manually navigate to `[APP URL]/en/admin` — you should see an **"Access Denied"** message, not the dashboard.

---

## Test A-2 — Edit an AI Prompt

**What this checks:** Admins can change the AI interview prompts without touching the code.

**Steps:**
1. In the Admin panel, click the **"Prompts"** tab
2. You should see a list of editable prompt templates (these are the instructions the AI follows during interviews)
3. Find any prompt — click into the text area
4. Make a small, harmless edit (e.g., add a space at the end, or add the word "test")
5. Click **"Save"**
6. Refresh the page
7. Verify your edit is still there

**✅ PASS if:**
The edit persists after saving and refreshing the page

**❌ FAIL if:**
- The Save button does nothing
- After refreshing, the change is gone
- An error appears after saving

> **Important:** After this test, undo your edit and save again so the prompts are restored to their original state.

---

---

# SECTION 4 — Language Switch Test

*JNJGO supports both English and Japanese. This test verifies both languages work.*

---

## Test L-1 — Switch to Japanese

**What this checks:** The entire UI switches to Japanese when the language toggle is used.

**Steps:**
1. Sign in as a Candidate and go to the Dashboard
2. Look for a language toggle in the top navigation bar — it will show **"EN"** or **"JA"** (or a globe icon)
3. Click to switch to **Japanese (JA)**
4. The page should reload or update — all text should now be in Japanese
5. Navigate to the Export page — confirm the export page is also in Japanese
6. Switch back to **English (EN)** — confirm the UI returns to English

**✅ PASS if:**
- After switching to JA, navigation labels, button text, and page headings all appear in Japanese
- After switching back to EN, everything is back in English
- No pages break or show errors during the switch

**❌ FAIL if:**
- Some parts of the UI remain in English after switching to Japanese (partial translation)
- Switching languages causes an error or blank page
- The language toggle doesn't appear or doesn't respond to clicks

---

---

# SECTION 5 — Additional Check: Candidate Profile Visibility

*This test connects the Candidate and Recruiter flows — a candidate must publish their profile before a recruiter can find them.*

---

## Test C-8 — Publish a Candidate Profile

**What this checks:** A candidate can make their profile visible to recruiters.

**Steps:**
1. Sign in as a Candidate
2. In the top navigation bar, click **"Profile"**
3. You should see a **"Private Profile"** section — this is the profile that recruiters see
4. If the profile hasn't been generated yet, look for a **"Generate"** button and click it — this creates a public-facing summary of your resume
5. Once the profile is generated, look for a toggle labelled **"Publish profile"** or similar
6. Toggle it ON
7. Return to the Recruiter Dashboard (as a recruiter) and check the Browse tab — the candidate should now appear

**✅ PASS if:**
After publishing, the candidate appears in the Recruiter Dashboard's Browse tab

**❌ FAIL if:**
- The profile generation fails with an error
- The publish toggle doesn't save (refreshing the page shows it toggled back off)
- The recruiter Browse tab still shows no candidates after publishing and refreshing

---

---

# Summary Checklist

Use this as a quick sign-off sheet. Tick each one when confirmed working:

| # | Test | Status |
|---|------|--------|
| C-1 | Sign in as Candidate + role selection | ⬜ Pass / ⬜ Fail |
| C-2 | Create new resume + role type selection | ⬜ Pass / ⬜ Fail |
| C-3 | Fill in Personal Info form | ⬜ Pass / ⬜ Fail |
| C-4 | AI Interview — agent responds, progress tracked | ⬜ Pass / ⬜ Fail |
| C-5 | Generate Resume | ⬜ Pass / ⬜ Fail |
| C-6 | Score / Analyse the Resume | ⬜ Pass / ⬜ Fail |
| C-7 | Export — copy for LinkedIn | ⬜ Pass / ⬜ Fail |
| C-8 | Publish candidate profile | ⬜ Pass / ⬜ Fail |
| R-1 | Sign up as Recruiter + onboarding | ⬜ Pass / ⬜ Fail |
| R-2 | Admin approves recruiter account | ⬜ Pass / ⬜ Fail |
| R-3 | Browse candidates | ⬜ Pass / ⬜ Fail |
| R-4 | Send scout message + candidate receives it | ⬜ Pass / ⬜ Fail |
| A-1 | Admin panel accessible + tabs load | ⬜ Pass / ⬜ Fail |
| A-2 | Edit and save an AI prompt | ⬜ Pass / ⬜ Fail |
| L-1 | Language switch EN ↔ JA | ⬜ Pass / ⬜ Fail |

**Target for launch approval: all 15 tests marked Pass**

---

# If Something Fails — How to Report It

1. **Note the test number** (e.g., "C-4")
2. **Take a screenshot** of what you see on screen
3. **Write down:**
   - What step you were on
   - What you expected to happen
   - What actually happened
4. Send to **dev@kerofi.net** with the subject line: `[JNJGO Review] Issue on Test [number]`

---

# Known Limitations (Not Bugs)

These are things that may look broken but are intentional in this version:

| What you might see | Why it's not a bug |
|--------------------|-------------------|
| GitHub / LinkedIn sign-in buttons are missing | Not yet built — Google only for now |
| A "Job Board" or "Job Matching" section is empty or missing | Coming in a future release |
| The AI occasionally asks the same question twice | Known limitation being improved |
| Recruiter sign-in blocks personal Gmail | By design — recruiter accounts require corporate email |
| Recruiter accounts need manual approval | By design — protects candidate privacy |

---

*Document prepared: 2026-05-06 | Contact: dev@kerofi.net*
