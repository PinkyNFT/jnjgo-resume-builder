# Social Authentication Setup Guide

## Quick Setup

### 1. Install Dependencies

```bash
npm install next-auth @auth/mongodb-adapter
```

### 2. Generate Secret Key

```bash
openssl rand -base64 32
```

Copy the output and add it to `.env.local` as `NEXTAUTH_SECRET`

### 3. Setup Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable "Google+ API"
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Application type: "Web application"
6. Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
7. Copy Client ID and Client Secret to `.env.local`

### 4. Setup GitHub OAuth (Optional)

1. Go to [GitHub Settings > Developer settings > OAuth Apps](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Application name: "JNJGO Resume Builder"
4. Homepage URL: `http://localhost:3000`
5. Authorization callback URL: `http://localhost:3000/api/auth/callback/github`
6. Copy Client ID and Client Secret to `.env.local`

### 5. Update .env.local

```env
# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-generated-secret-here

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# GitHub OAuth (optional)
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# Existing
GEMINI_API_KEY=your-api-key
MONGODB_URI=your-mongodb-uri
```

### 6. Test

Run your dev server:
```bash
npm run dev
```

Visit `http://localhost:3000` and click "Sign in"

## Features

✅ **Google Sign-In** - Primary authentication method  
✅ **GitHub Sign-In** - Alternative authentication  
✅ **MongoDB Session Storage** - Persistent sessions  
✅ **User Data Isolation** - Each user sees only their data  
✅ **Automatic Migration** - Existing localStorage data preserved  

## How It Works

1. **Authentication**: Users sign in with Google or GitHub
2. **Session Creation**: NextAuth creates a session in MongoDB
3. **User ID**: Each API request uses the authenticated user's ID
4. **Data Isolation**: Projects and profiles are linked to the user ID
5. **Fallback**: Unauthenticated users get a temporary local ID

## Production Deployment

For production, update:

1. `NEXTAUTH_URL` - Your production domain
2. OAuth redirect URIs - Add production URLs
3. Ensure `NEXTAUTH_SECRET` is secure and unique

## Troubleshooting

**Can't sign in?**
- Check OAuth credentials are correct
- Verify redirect URIs match exactly
- Check MongoDB connection

**Session not persisting?**
- Verify `NEXTAUTH_SECRET` is set
- Check MongoDB connection
- Clear browser cookies and try again

**Data not showing?**
- Check browser console for errors
- Verify user ID is being set correctly
- Check MongoDB for user data
