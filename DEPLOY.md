# Vercel Deployment Instructions

## Manual Deployment Steps

1. Go to [vercel.com](https://vercel.com)
2. Click "Add New" → "Project"
3. Import Git Repository
4. Select: `https://github.com/Akira-0132/studyquest`
5. Configure project:
   - Project Name: `studyquest-ios-20250816` (or any unique name)
   - Framework Preset: Next.js
   - Root Directory: `studyquest` (if needed)
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm ci`

## Important Notes
- **Cron Jobs Removed**: Vercel Hobby accounts only support daily cron jobs
- **Notifications**: Now handled client-side via Service Worker
- **No Pro Plan Required**: All features work on free tier

## Environment Variables
- No environment variables required for deployment

## Post-Deployment
- Test iOS PWA notifications (client-side scheduling)
- Verify all features work correctly
- Check Service Worker registration

## Latest Features
- iOS PWA background notifications
- Client-side notification scheduling
- Hobby account compatible
- TypeScript build optimized