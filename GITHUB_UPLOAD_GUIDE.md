# GitHub Upload Guide

This guide will help you upload the AI News Aggregator to GitHub and set up continuous deployment.

## Prerequisites

- GitHub account
- Git installed locally (or use GitHub Desktop)
- Basic familiarity with Git commands

## Step 1: Create GitHub Repository

1. **Go to GitHub.com** and sign in to your account
2. **Click the "+" icon** in the top right corner
3. **Select "New repository"**
4. **Configure repository:**
   - Repository name: `ai-news-aggregator`
   - Description: `Advanced AI-powered market intelligence platform`
   - Set to Public or Private (your choice)
   - ✅ Add a README file (we'll replace it)
   - ✅ Add .gitignore: Node
   - ✅ Choose a license: MIT License
5. **Click "Create repository"**

## Step 2: Clone and Upload Files

### Option A: Using Git Command Line

1. **Clone the new repository:**
```bash
git clone https://github.com/YOUR_USERNAME/ai-news-aggregator.git
cd ai-news-aggregator
```

2. **Copy all project files** from this Replit environment to your local repository folder:
   - Copy all files and folders except `.git/`, `node_modules/`, and any `.env` files
   - Make sure to include: `client/`, `server/`, `shared/`, all configuration files

3. **Stage and commit files:**
```bash
git add .
git commit -m "Initial commit: AI News Aggregator v2.0.0

- Complete React + TypeScript frontend
- Express.js backend with PostgreSQL
- 54+ news sources with AI analysis
- Market intelligence dashboard
- Automated daily collection system
- Comprehensive caching and deduplication"
```

4. **Push to GitHub:**
```bash
git push origin main
```

### Option B: Using GitHub Desktop

1. **Download GitHub Desktop** from desktop.github.com
2. **Clone repository** using GitHub Desktop
3. **Copy all project files** to the cloned folder
4. **Commit changes** with a descriptive message
5. **Push to origin**

### Option C: Upload via GitHub Web Interface

1. **Go to your new repository** on GitHub.com
2. **Click "uploading an existing file"**
3. **Drag and drop all project files** (except .env, node_modules)
4. **Add commit message**: "Initial commit: AI News Aggregator v2.0.0"
5. **Click "Commit changes"**

## Step 3: Configure Repository Settings

1. **Update README.md** with your repository URL:
   - Replace `https://github.com/[your-username]/ai-news-aggregator.git` with your actual URL
   - Update any references to your GitHub username

2. **Set up repository topics** (in Settings → General):
   - `ai`, `news-aggregator`, `machine-learning`, `typescript`, `react`, `postgresql`

3. **Configure branch protection** (optional, in Settings → Branches):
   - Require pull request reviews
   - Require status checks to pass

## Step 4: Set Up Deployment

### For Vercel Deployment

1. **Install Vercel CLI locally:**
```bash
npm i -g vercel
```

2. **In your local repository, run:**
```bash
vercel
```

3. **Follow prompts:**
   - Link to existing project? No
   - What's your project's name? ai-news-aggregator
   - In which directory is your code located? ./
   - Want to override settings? No

4. **Set environment variables:**
```bash
vercel env add DATABASE_URL
vercel env add OPENAI_API_KEY
vercel env add APP_PASSWORD
```

5. **Deploy to production:**
```bash
vercel --prod
```

### For Railway Deployment

1. **Go to railway.app**
2. **Click "New Project"**
3. **Select "Deploy from GitHub repo"**
4. **Choose your ai-news-aggregator repository**
5. **Add environment variables** in Railway dashboard:
   - `DATABASE_URL`
   - `OPENAI_API_KEY`
   - `APP_PASSWORD`

### For Render Deployment

1. **Go to render.com**
2. **Click "New +" → "Web Service"**
3. **Connect your GitHub repository**
4. **Configure:**
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
5. **Add environment variables** in Render dashboard

## Step 5: Configure GitHub Actions (Optional)

The repository includes `.github/workflows/deploy.yml` for automatic deployment.

1. **Go to repository Settings → Secrets and variables → Actions**
2. **Add repository secrets:**
   - `DATABASE_URL`: Your PostgreSQL connection string
   - `OPENAI_API_KEY`: Your OpenAI API key
   - `APP_PASSWORD`: Your admin password
   - Add platform-specific secrets (e.g., `VERCEL_TOKEN`, `RAILWAY_TOKEN`)

3. **Update deploy.yml** with your specific deployment commands

## Step 6: Update Documentation

1. **Replace placeholder URLs** in README.md with your actual repository URL
2. **Update deployment URLs** once deployed
3. **Add live demo link** to README.md
4. **Consider adding screenshots** of the application

## Important Files Created

✅ **README.md** - Comprehensive project documentation
✅ **LICENSE** - MIT license file
✅ **.env.example** - Environment variables template
✅ **CHANGELOG.md** - Version history and updates
✅ **DEPLOYMENT.md** - Detailed deployment guide
✅ **.github/workflows/deploy.yml** - GitHub Actions workflow
✅ **GITHUB_UPLOAD_GUIDE.md** - This upload guide

## Security Checklist

- [ ] Never commit `.env` files with real credentials
- [ ] Add `.env` to `.gitignore` (should already be there)
- [ ] Use environment variables for all sensitive data
- [ ] Configure secrets properly in deployment platform
- [ ] Set up proper access controls in production

## Post-Upload Tasks

1. **Test deployment** with your actual environment variables
2. **Monitor application** for any deployment issues
3. **Set up monitoring** and logging for production
4. **Configure custom domain** (if desired)
5. **Set up SSL certificate** for production use

## Troubleshooting

### Common Issues:

1. **Build failures:**
   - Check Node.js version compatibility
   - Verify all dependencies are included
   - Check for TypeScript compilation errors

2. **Database connection issues:**
   - Verify DATABASE_URL format
   - Ensure database is accessible from deployment platform
   - Check firewall settings

3. **API key issues:**
   - Verify OpenAI API key is valid
   - Check usage limits and billing
   - Ensure proper environment variable naming

### Getting Help:

- Check the Issues tab in your GitHub repository
- Review deployment platform documentation
- Consult the DEPLOYMENT.md guide for platform-specific help

## Next Steps

After uploading to GitHub:

1. **Share your repository** with others
2. **Set up issue tracking** for bug reports and feature requests
3. **Create a project board** for managing development tasks
4. **Consider setting up automated testing** with GitHub Actions
5. **Add contributors** if working with a team

Your AI News Aggregator is now ready for collaborative development and professional deployment! 🚀