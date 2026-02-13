# JNJGO Resume Builder

An AI-powered master resume builder for IT professionals. This application creates decision-making documents for high-end professionals, focusing on impact over storytelling.

## ✨ Features

- **AI-Powered Interview**: Interactive AI agent guides you through building your resume
- **Role-Specific Templates**: Specialized templates for Consultants/PMs and Senior Engineers/Tech Leads
- **Resume Import**: Import existing resumes and AI analyzes them automatically
- **Quality Scoring**: Built-in evaluation system scores your resume on structure, reproducibility, role fit, and risk handling
- **Timeline Management**: Ensures continuous career timeline with no unexplained gaps
- **Project Deep Dives**: Focus on decision-making documentation rather than task lists
- **MongoDB Storage**: Secure cloud-based data storage with automatic migration from localStorage
- **PDF Export**: Print-optimized resume output

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ installed
- A Google Gemini API key (get one at [Google AI Studio](https://aistudio.google.com/app/apikey))
- A MongoDB database (MongoDB Atlas recommended for free cloud hosting)

### Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment variables**
   
   Create or update the `.env.local` file in the root directory:
   ```env
   # Google Gemini API Key for AI features
   GEMINI_API_KEY=your_gemini_api_key_here
   
   # MongoDB Connection URI
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority
   ```

   **Getting a MongoDB URI:**
   1. Sign up for [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) (free tier available)
   2. Create a new cluster
   3. Click "Connect" and select "Connect your application"
   4. Copy the connection string and replace `<password>` with your database password

3. **Run the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📖 How to Use

### Creating a New Resume

1. **Start**: Click "Start New Resume" on the dashboard
2. **Select Role**: Choose between Consultant/PM or Senior Engineer/Tech Lead
3. **Import (Optional)**: Paste existing resume text for AI analysis
4. **Personal Info**: Enter your contact details (saved for future resumes)
5. **AI Interview**: Answer AI questions about your career timeline and projects
6. **Generate**: Once you've answered enough questions, generate your master resume
7. **Edit & Score**: Edit the generated resume and run quality analysis
8. **Export**: Print to PDF when satisfied with your score

### Understanding the Scoring System

The resume is evaluated on 100 points:

- **Structure (50 pts)**: Chronological format, quantified achievements, proper formatting
- **Reproducibility (25 pts)**: Decision-making rationale, process clarity, individual contribution
- **Role Fit (15 pts)**: Alignment with target role expectations
- **Risk Handling (10 pts)**: Proper handling of career gaps and red flags

**Passing Score**: 80+ points

## 🏗️ Project Structure

```
jnjgo-resume-builder/
├── app/
│   ├── [locale]/
│   │   ├── layout.tsx      # Localized layout
│   │   └── page.tsx        # Main application logic
│   ├── api/
│   │   ├── health/         # Health check endpoint
│   │   ├── profile/        # User profile API
│   │   ├── projects/       # Projects CRUD API
│   │   ├── parse/          # Resume parsing API
│   │   ├── chat/           # AI chat API
│   │   └── analyze/        # Resume analysis API
│   ├── providers.tsx       # React Query provider
│   └── globals.css         # Global styles
├── components/
│   ├── InterviewView.tsx   # AI interview interface
│   ├── ResumeEditor.tsx    # Resume editing and preview
│   ├── TimelineChart.tsx   # Timeline visualization
│   └── LanguageSwitcher.tsx # i18n language switcher
├── lib/
│   ├── mongodb.ts          # MongoDB connection with pooling
│   ├── models.ts           # Mongoose schemas and models
│   ├── apiClient.ts        # API client utilities
│   └── prompts.ts          # AI prompt templates
├── services/
│   ├── geminiService.ts    # Google Gemini AI integration
│   ├── storageService.ts   # API-based storage service
│   └── semanticAnalysisService.ts  # Semantic analysis
├── utils/
│   ├── dataMigration.ts    # localStorage to MongoDB migration
│   ├── gapDetection.ts     # Career gap detection
│   ├── dateParser.ts       # Date parsing utilities
│   └── timelineGenerator.ts # Timeline generation
├── types.ts                # TypeScript type definitions
├── env.d.ts                # Environment variable types
├── next.config.ts          # Next.js configuration
├── package.json            # Dependencies
└── .env.local             # Environment variables (not in git)
```

## 🔧 Technology Stack

- **Framework**: Next.js 16.1.6 (App Router)
- **Language**: TypeScript 5.8.2
- **Styling**: Tailwind CSS 4
- **Icons**: Lucide React
- **AI**: Google Gemini API (@google/genai)
- **Database**: MongoDB with Mongoose ODM
- **State Management**: React Hooks + React Query
- **Internationalization**: next-intl
- **Storage**: MongoDB Atlas (with automatic localStorage migration)

## 🌟 Key Features Explained

### AI Interview System

The application uses Google's Gemini AI to conduct intelligent interviews:
- Adapts questions based on your role type
- Probes for quantitative details (budget, team size, impact)
- Intelligently transitions between topics
- Provides hints when you're stuck
- Validates completeness before allowing resume generation

### Master Resume Philosophy

This is not a traditional resume builder. It creates a **Decision-Making Document** that:
- Focuses on HOW you work, not just WHAT you did
- Requires quantified achievements and scope
- Documents your decision-making process
- Explains any career gaps
- Provides reproducible insights into your work methodology

### Data Privacy & Migration

- **Cloud Storage**: All data securely stored in MongoDB Atlas
- **Automatic Migration**: Legacy localStorage data is automatically migrated to MongoDB on first load
- **Connection Pooling**: Optimized database connections for performance
- **Health Monitoring**: Built-in health check endpoint at `/api/health`
- **Data Ownership**: You control your own MongoDB database

## 📝 Development

### Running in Development

```bash
npm run dev
```

### Building for Production

```bash
npm run build
npm start
```

### Linting

```bash
npm run lint
```

## 🆘 Troubleshooting

### Common Issues

1. **API Key Error**: Make sure your `.env.local` file contains a valid Gemini API key
2. **MongoDB Connection Error**: Verify your MONGODB_URI is correct and your IP is whitelisted in MongoDB Atlas
3. **Build Errors**: Try deleting `node_modules` and `.next`, then run `npm install` again
4. **Migration Issues**: Check browser console for migration logs if projects aren't loading
5. **TypeScript Errors**: Ensure all dependencies are installed correctly

### Health Check

Visit `/api/health` to verify your MongoDB connection status and application health.

### Getting Help

- Check the browser console for detailed error messages
- Verify your API key is valid at [Google AI Studio](https://aistudio.google.com/)
- Ensure you're using Node.js 18 or higher

## 🎯 Next Steps

1. Add your Gemini API key to `.env.local`
2. Run `npm install` to install all dependencies
3. Run `npm run dev` to start the development server
4. Start building your world-class resume!

---

**Built with ❤️ for world-class professionals**
