import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';
import { Message, ResumeData, ImportData } from '@/types';
import { GEMINI_MODEL } from '@/config/models';

// Validate API key exists
const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
    console.error('GEMINI_API_KEY environment variable is not set');
}

export async function POST(request: NextRequest) {
    try {
        if (!API_KEY) {
            return NextResponse.json(
                { error: 'Server configuration error: API key not configured' },
                { status: 500 }
            );
        }

        const body = await request.json();
        const { history, importData }: { history: Message[], importData?: ImportData } = body;

        const ai = new GoogleGenAI({ apiKey: API_KEY });
        const model = GEMINI_MODEL;

        const conversationText = history.map(m => `${m.role.toUpperCase()}: ${m.text}`).join('\n');
        const importedText = importData ? `IMPORTED RESUME CONTENT:\n${importData.sourceText}\n\n` : '';

        const prompt = `
    Create a structured, professional resume from this conversation following best practices.
    
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
    
    5. CERTIFICATIONS - MANDATORY - Always check if mentioned:
       - Extract certification names exactly (e.g., "AWS Certified Solutions Architect", "PMP", "CPA")
       - Include issuing organization if mentioned (e.g., "Amazon Web Services", "PMI")
       - Include year obtained if mentioned
       - If user explicitly says "no certifications" or they don't mention any, output empty array []
       - Common certifications: AWS/Azure/GCP certifications, PMI certifications, Professional licenses, Industry-specific certs
    
    6. CAREER GAPS - Detect and explain gaps of 90+ days:
       - Analyze timeline for gaps between positions longer than 90 days (3 months)
       - For each gap detected:
         * Extract the period (e.g., "March 2019 - November 2019")
         * Extract the reason if explained in conversation (e.g., "Freelancing", "Career break", "Job search", "Further education", "Personal reasons", "Sabbatical")
         * Set isExplained to true if reason was mentioned, false otherwise
       - If no explanation found in conversation, set reason to empty string and isExplained to false
       - Only include gaps of 90+ days (3+ months)
    
    7. CAREER OVERVIEW - Calculate statistics:
       - Total experience in years
       - Number of different employers
       - Average tenure per position
       - Current position duration
    
    8. PROFESSIONAL SUMMARY:
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

        const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        fullName: { type: Type.STRING },
                        currentRole: { type: Type.STRING },
                        careerSummary: { type: Type.STRING },
                        contactInfo: {
                            type: Type.OBJECT,
                            properties: {
                                email: { type: Type.STRING },
                                phone: { type: Type.STRING },
                                location: { type: Type.STRING },
                                linkedin: { type: Type.STRING }
                            }
                        },
                        timeline: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    id: { type: Type.STRING },
                                    period: { type: Type.STRING },
                                    organization: { type: Type.STRING },
                                    role: { type: Type.STRING },
                                    type: { type: Type.STRING, enum: ['work', 'education'] },
                                    notes: { type: Type.STRING },
                                    duration: { type: Type.STRING }
                                }
                            }
                        },
                        careerOverview: {
                            type: Type.OBJECT,
                            properties: {
                                totalExperience: { type: Type.STRING },
                                numberOfEmployers: { type: Type.NUMBER },
                                averageTenure: { type: Type.STRING },
                                areasOfExpertise: { type: Type.ARRAY, items: { type: Type.STRING } },
                                projectCount: { type: Type.STRING },
                                typicalDuration: { type: Type.STRING }
                            }
                        },
                        projectPortfolio: {
                            type: Type.OBJECT,
                            properties: {
                                summary: { type: Type.ARRAY, items: { type: Type.STRING } },
                                representativeProjects: {
                                    type: Type.ARRAY,
                                    items: {
                                        type: Type.OBJECT,
                                        properties: {
                                            id: { type: Type.STRING },
                                            title: { type: Type.STRING },
                                            period: { type: Type.STRING },
                                            clientType: { type: Type.STRING },
                                            theme: { type: Type.STRING },
                                            teamStructure: { type: Type.STRING },
                                            role: { type: Type.STRING },
                                            context: { type: Type.STRING },
                                            contribution: { type: Type.STRING },
                                            challenges: { type: Type.STRING }
                                        }
                                    }
                                },
                                additionalEngagements: { type: Type.STRING }
                            }
                        },
                        careerGaps: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    period: { type: Type.STRING },
                                    reason: { type: Type.STRING },
                                    isExplained: { type: Type.BOOLEAN }
                                }
                            }
                        },
                        workExperience: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    id: { type: Type.STRING },
                                    company: { type: Type.STRING },
                                    position: { type: Type.STRING },
                                    period: { type: Type.STRING },
                                    responsibilities: { type: Type.ARRAY, items: { type: Type.STRING } }
                                }
                            }
                        },
                        education: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    id: { type: Type.STRING },
                                    degree: { type: Type.STRING },
                                    institution: { type: Type.STRING },
                                    period: { type: Type.STRING },
                                    notes: { type: Type.STRING }
                                }
                            }
                        },
                        skills: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                        },
                        certifications: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                        }
                    }
                }
            }
        });

        if (response.text) {
            try {
                const data = JSON.parse(response.text) as ResumeData;
                // Ensure IDs and initialize arrays if not present
                if (data.timeline) {
                    data.timeline = data.timeline.map((e, i) => ({ ...e, id: e.id || `time_${i}` }));
                } else {
                    data.timeline = [];
                }

                if (data.projectPortfolio?.representativeProjects) {
                    data.projectPortfolio.representativeProjects = data.projectPortfolio.representativeProjects.map((e, i) => ({ ...e, id: e.id || `proj_${i}` }));
                } else {
                    if (!data.projectPortfolio) data.projectPortfolio = {
                        summary: [],
                        representativeProjects: [],
                        additionalEngagements: ''
                    };
                    if (!data.projectPortfolio.representativeProjects) data.projectPortfolio.representativeProjects = [];
                    if (!data.projectPortfolio.summary) data.projectPortfolio.summary = [];
                    if (!data.projectPortfolio.additionalEngagements) data.projectPortfolio.additionalEngagements = '';
                }

                // Ensure IDs for workExperience, education
                if (data.workExperience) {
                    data.workExperience = data.workExperience.map((e, i) => ({ ...e, id: e.id || `work_${i}` }));
                } else {
                    data.workExperience = [];
                }

                if (data.education) {
                    data.education = data.education.map((e, i) => ({ ...e, id: e.id || `edu_${i}` }));
                } else {
                    data.education = [];
                }

                // Initialize other arrays if not present
                if (!data.skills) data.skills = [];
                if (!data.certifications) data.certifications = [];
                if (!data.careerGaps) data.careerGaps = [];

                // Initialize careerOverview if not present
                if (!data.careerOverview) {
                    data.careerOverview = {
                        totalExperience: '',
                        numberOfEmployers: 0,
                        averageTenure: '',
                        areasOfExpertise: [],
                        projectCount: '',
                        typicalDuration: ''
                    };
                }

                // Additional gap detection from timeline with auto-generation of reasons
                const workTimeline = data.timeline.filter(t => t.type === 'work').sort((a, b) => {
                    // Sort by start date (reverse chronological)
                    const aStart = parseDate(a.period.split('–')[0] || a.period.split('-')[0]);
                    const bStart = parseDate(b.period.split('–')[0] || b.period.split('-')[0]);
                    if (!aStart || !bStart) return 0;
                    return bStart.getTime() - aStart.getTime();
                });

                // Get conversation text to search for gap explanations
                const conversationText = history.map(h => h.text).join('\n').toLowerCase();

                for (let i = 0; i < workTimeline.length - 1; i++) {
                    const current = workTimeline[i];
                    const next = workTimeline[i + 1];

                    // Parse end date of next position and start date of current position
                    const nextEnd = parseDate(current.period.split('–')[1]?.trim() || current.period.split('-')[1]?.trim() || '');
                    const currentStart = parseDate(next.period.split('–')[0]?.trim() || next.period.split('-')[0]?.trim() || '');

                    if (nextEnd && currentStart) {
                        const daysDiff = Math.floor((currentStart.getTime() - nextEnd.getTime()) / (1000 * 60 * 60 * 24));

                        // Check if gap is 90+ days (3+ months)
                        if (daysDiff >= 90) {
                            const gapStart = formatDate(nextEnd);
                            const gapEnd = formatDate(currentStart);
                            const gapPeriod = `${gapStart} – ${gapEnd}`;

                            // Extract company names and years for better matching
                            const prevCompany = current.organization.toLowerCase();
                            const nextCompany = next.organization.toLowerCase();
                            const gapYears = gapPeriod.match(/\d{4}/g) || [];

                            // Check if this gap is already explained
                            const existingGap = data.careerGaps.find(g => g.period === gapPeriod ||
                                (g.period.includes(gapStart.split(' ')[0]) && g.period.includes(gapEnd.split(' ')[0])));

                            if (!existingGap) {
                                // Try to auto-generate gap reason from conversation
                                let autoReason = '';
                                let isExplained = false;

                                // Check if gap overlaps with education
                                const educationDuringGap = data.timeline.find(t => {
                                    if (t.type !== 'education') return false;

                                    // Check if education period overlaps with gap
                                    const eduStart = parseDate(t.period.split('–')[0]?.trim() || t.period.split('-')[0]?.trim() || '');
                                    const eduEnd = parseDate(t.period.split('–')[1]?.trim() || t.period.split('-')[1]?.trim() || '');

                                    if (eduStart && eduEnd) {
                                        // Gap is covered if education overlaps at all with the gap period
                                        return (eduStart <= currentStart && eduEnd >= nextEnd) ||
                                            (eduStart >= nextEnd && eduStart <= currentStart) ||
                                            (eduEnd >= nextEnd && eduEnd <= currentStart);
                                    }

                                    return t.notes?.toLowerCase().includes('overlap') ||
                                        t.period.toLowerCase().includes(gapStart.split(' ')[0].toLowerCase()) ||
                                        t.period.toLowerCase().includes(gapEnd.split(' ')[0].toLowerCase());
                                });

                                if (educationDuringGap) {
                                    autoReason = `Pursuing ${educationDuringGap.role} at ${educationDuringGap.organization}`;
                                    isExplained = true;
                                }
                                // Check conversation for gap discussion
                                else {
                                    // Look for any discussion about gaps between these specific companies or years
                                    const gapDiscussionPatterns = [
                                        // Explicit gap mention with companies
                                        new RegExp(`(gap|between|after|leaving).*${prevCompany}.*${nextCompany}`, 'i'),
                                        new RegExp(`(gap|between|after|leaving).*${nextCompany}.*${prevCompany}`, 'i'),
                                        // Year-based gap discussion
                                        ...gapYears.map(year => new RegExp(`(gap|during|in).*${year}`, 'i')),
                                        // General gap acknowledgment patterns
                                        /(i was|i did|during (that|this) (time|period|gap))/i,
                                        /(between jobs|career break|time off|break in|employment gap)/i
                                    ];

                                    // Check if ANY gap discussion pattern is found
                                    const hasGapDiscussion = gapDiscussionPatterns.some(pattern => pattern.test(conversationText));

                                    if (hasGapDiscussion) {
                                        // Now look for the explanation keywords
                                        const gapKeywords = [
                                            { pattern: /(job search|looking for|finding|searching for work|search mode)/i, reason: 'Job search and career transition' },
                                            { pattern: /(freelanc|contract|consulting|independent|own work|side project)/i, reason: 'Freelance/contract work' },
                                            { pattern: /(personal|family|health|medical|care|sabbatical|personal time)/i, reason: 'Personal/family matters' },
                                            { pattern: /(travel|abroad|overseas|explore|trip)/i, reason: 'Travel and personal development' },
                                            { pattern: /(upskill|learn|stud|course|training|certif|educat|school|university|degree)/i, reason: 'Professional development and upskilling' },
                                            { pattern: /(relocation|relocating|moving|moved|shift|new city)/i, reason: 'Relocation' },
                                            { pattern: /(startup|own business|entrepreneur|venture|launch)/i, reason: 'Entrepreneurial venture' },
                                            { pattern: /(pandemic|covid|lockdown)/i, reason: 'Career transition during pandemic' },
                                            { pattern: /(taking (time|break)|needed (time|break)|took (time|break))/i, reason: 'Career break' }
                                        ];

                                        for (const { pattern, reason } of gapKeywords) {
                                            if (pattern.test(conversationText)) {
                                                autoReason = reason;
                                                isExplained = true;
                                                break;
                                            }
                                        }

                                        // If gap was discussed but no specific reason found, mark as explained with generic reason
                                        if (!isExplained) {
                                            autoReason = 'Career transition (explained in interview)';
                                            isExplained = true;
                                        }
                                    }
                                }

                                // Only add gap if it's truly unexplained or explicitly explained
                                // Don't add vague/uncertain gaps
                                if (isExplained) {
                                    data.careerGaps.push({
                                        period: gapPeriod,
                                        reason: autoReason,
                                        isExplained: true
                                    });
                                }
                            }
                        }
                    }
                }

                return NextResponse.json({ data });
            } catch (e) {
                console.error("Failed to parse JSON", e);
                return NextResponse.json(
                    { error: 'Failed to parse resume data' },
                    { status: 500 }
                );
            }
        }

        // Helper functions for date parsing
        function parseDate(dateStr: string): Date | null {
            if (!dateStr || dateStr.toLowerCase().includes('present') || dateStr.toLowerCase().includes('current')) {
                return new Date();
            }

            // Try various date formats
            const cleanStr = dateStr.trim();

            // Format: "April 2015", "Apr 2015", "2015"
            const monthYearMatch = cleanStr.match(/([A-Za-z]+)\s+(\d{4})/);
            if (monthYearMatch) {
                const month = monthYearMatch[1];
                const year = parseInt(monthYearMatch[2]);
                const monthNum = new Date(Date.parse(month + " 1, 2000")).getMonth();
                return new Date(year, monthNum, 1);
            }

            // Format: "2015"
            const yearMatch = cleanStr.match(/(\d{4})/);
            if (yearMatch) {
                return new Date(parseInt(yearMatch[1]), 0, 1);
            }

            return null;
        }

        function formatDate(date: Date): string {
            const months = ['January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'];
            return `${months[date.getMonth()]} ${date.getFullYear()}`;
        }

        return NextResponse.json(
            { error: 'No data generated' },
            { status: 500 }
        );

    } catch (error) {
        console.error('Parse API error:', error);
        return NextResponse.json(
            { error: 'Failed to parse resume', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
