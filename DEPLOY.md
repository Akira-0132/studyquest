# Vercel Deployment Instructions

## Manual Deployment Steps

1. Go to [vercel.com](https://vercel.com)
2. Click "Add New" → "Project"
3. Import Git Repository
4. Select: `https://github.com/Akira-0132/studyquest`
5. Configure project:
   - Framework Preset: Next.js
   - Root Directory: `studyquest` (if needed)
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm ci`

## Environment Variables (if needed)
- No environment variables required for basic deployment

## Post-Deployment
- Test iOS PWA notifications
- Verify all features work correctly
- Check Service Worker registration

## Latest Commit to Deploy
- Commit: `a54a204`
- Features: iOS PWA background notifications, fixed TypeScript errors