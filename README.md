# Zerodha Portfolio Dashboard

A modern, standalone Next.js application that connects directly to Zerodha Kite's API to display your equity holdings and mutual fund investments in a beautiful, minimal interface.

![Dashboard Preview](https://img.shields.io/badge/Next.js-14+-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue?style=flat-square&logo=typescript)
![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)

## ✨ Features

- 🔐 **Secure OAuth Integration** - Direct integration with Zerodha Kite API
- 📊 **Real-time Portfolio Tracking** - Live equity and mutual fund holdings
- 💰 **P&L Analysis** - Detailed profit/loss tracking with percentage gains
- 📈 **Visual Analytics** - Size-proportional equity grid based on portfolio weight
- 🎨 **Minimal Design** - Clean, Claude-inspired UI with Tailwind CSS
- ⚡ **Fast & Efficient** - Built-in caching with 15-minute TTL
- 🗄️ **SQLite Database** - Lightweight session management and data caching
- 🚀 **Easy Deployment** - Single Next.js app, no separate backend needed

## 🏗️ Architecture

This is a **unified Next.js application** that handles everything:

```
┌─────────────────────────────────────────┐
│         Next.js Application             │
├─────────────────────────────────────────┤
│  Frontend (React + Tailwind CSS)        │
│  ├─ Dashboard                           │
│  ├─ Equity Holdings (Proportional Grid) │
│  └─ Mutual Funds                        │
├─────────────────────────────────────────┤
│  Backend (Next.js API Routes)           │
│  ├─ Authentication (/api/auth/*)        │
│  ├─ Holdings (/api/holdings/*)          │
│  ├─ Mutual Funds (/api/mutualfunds/*)   │
│  └─ Portfolio (/api/portfolio/*)        │
├─────────────────────────────────────────┤
│  Kite Connect SDK (Node.js)             │
│  └─ Direct API integration              │
├─────────────────────────────────────────┤
│  SQLite Database                         │
│  ├─ Session Management                  │
│  └─ Data Caching (15min TTL)            │
└─────────────────────────────────────────┘
```

**No separate Python backend required!** Everything runs in a single Next.js application.

## 🚀 Quick Start

### Prerequisites

- Node.js 18 or higher
- npm or yarn
- Zerodha Kite API credentials ([Get them here](https://kite.trade/))

### Installation

1. **Clone the repository**

```bash
git clone <your-repo-url>
cd zerodha-portfolio-dashboard
```

2. **Install dependencies**

```bash
npm install
```

3. **Configure environment variables**

Create or edit `.env.local`:

```env
KITE_API_KEY=your_api_key_here
KITE_API_SECRET=your_api_secret_here
NEXTAUTH_URL=http://localhost:3000
DATABASE_PATH=./data/portfolio.db
```

4. **Run the development server**

```bash
npm run dev
```

5. **Open your browser**

Navigate to [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
zerodha-portfolio-dashboard/
├── app/
│   ├── api/                    # Next.js API routes (backend)
│   │   ├── auth/              # Authentication endpoints
│   │   ├── holdings/          # Equity holdings endpoints
│   │   ├── mutualfunds/       # Mutual funds endpoints
│   │   └── portfolio/         # Portfolio overview endpoints
│   ├── dashboard/             # Dashboard pages
│   │   ├── page.tsx          # Main dashboard
│   │   ├── equity/           # Equity holdings page
│   │   └── mutualfunds/      # Mutual funds page
│   ├── login/                # Login page
│   └── layout.tsx            # Root layout
├── components/               # Reusable UI components
│   ├── cards/               # Card components
│   ├── charts/              # Chart components
│   └── ui/                  # Base UI components
├── lib/
│   ├── api.ts               # Frontend API client
│   ├── db.ts                # SQLite database utilities
│   ├── kite-client.ts       # Kite Connect SDK wrapper
│   ├── types.ts             # TypeScript types
│   └── utils.ts             # Utility functions
├── hooks/                   # Custom React hooks (SWR)
├── .env.local              # Environment variables (not in git)
├── package.json
└── README.md
```

## 🔐 Authentication Flow

1. User clicks "Connect with Zerodha Kite"
2. Redirects to Kite's OAuth page
3. User authorizes the app
4. Kite redirects back with request token
5. App exchanges token for access token
6. Access token stored in SQLite
7. User redirected to dashboard

## 📊 Features in Detail

### Equity Holdings

- **Size-Proportional Grid**: Holdings displayed in cards sized by portfolio weight
- **Real-time P&L**: Live profit/loss tracking with color-coded indicators
- **Day Change**: Track intraday performance
- **Portfolio Weights**: Visual representation of allocation

### Mutual Funds

- **Fund Classification**: Auto-categorized as Equity, Debt, ELSS, or Hybrid
- **SIP Tracking**: Active SIP indicators on fund cards
- **NAV Tracking**: Current vs average NAV comparison
- **Type-wise Breakdown**: Summary by fund category

### Portfolio Overview

- **Net Worth**: Combined equity + mutual funds value
- **Total P&L**: Overall profit/loss across all investments
- **Day Performance**: Today's portfolio change
- **Asset Allocation**: Visual split between equity and MF

## 🎨 Design System

The UI follows a minimal, Claude-inspired design language:

**Colors:**

- Background: `#ffffff`, `#f7f7f5`, `#f0efeb`
- Text: `#1a1a1a`, `#6b6b6b`, `#9b9b9b`
- Accent: Green (`#16a34a`), Red (`#dc2626`), Blue (`#2563eb`)

**Typography:**

- Font: Inter
- Headings: 500 weight (never bold)
- Body: 15px, line-height 1.6

**Principles:**

- No gradients
- No shadows (except focus rings)
- Minimal animations (only `transition-colors`)
- Sentence case for all text

## 🔧 Development

### Available Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm start        # Start production server
npm run lint     # Run ESLint
```

### Environment Variables

| Variable          | Description                                         | Required |
| ----------------- | --------------------------------------------------- | -------- |
| `KITE_API_KEY`    | Your Kite API key                                   | ✅ Yes   |
| `KITE_API_SECRET` | Your Kite API secret                                | ✅ Yes   |
| `NEXTAUTH_URL`    | App URL (default: http://localhost:3000)            | ✅ Yes   |
| `DATABASE_PATH`   | SQLite database path (default: ./data/portfolio.db) | ❌ No    |

## 📦 Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy!

**Note**: For production, consider using Vercel Postgres or another persistent database solution instead of SQLite.

### Docker

```bash
docker build -t zerodha-dashboard .
docker run -p 3000:3000 \
  -e KITE_API_KEY=your_key \
  -e KITE_API_SECRET=your_secret \
  -v $(pwd)/data:/app/data \
  zerodha-dashboard
```

### Traditional Server

```bash
npm run build
npm start
```

## 🔒 Security

- ✅ Access tokens stored server-side only
- ✅ No CORS issues (same-origin)
- ✅ Environment variables never exposed to browser
- ✅ All API calls run server-side via Next.js API routes
- ⚠️ Never commit `.env.local` to version control

## 🐛 Troubleshooting

### "Not authenticated" errors

- Verify Kite API credentials are correct
- Try logging out and logging in again
- Check if access token exists in database

### Database errors

- Ensure `data/` directory exists and is writable
- Check file permissions on SQLite database

### Kite API errors

- Verify API key and secret
- Check if Kite app is active
- Ensure redirect URL matches app settings

## 📝 API Endpoints

All endpoints available at `/api/*`:

**Authentication:**

- `GET /api/auth/login` - Get Kite login URL
- `GET /api/auth/callback` - OAuth callback
- `GET /api/auth/status` - Check auth status
- `POST /api/auth/logout` - Logout

**Holdings:**

- `GET /api/holdings` - All equity holdings
- `GET /api/holdings/summary` - Equity summary

**Mutual Funds:**

- `GET /api/mutualfunds` - All MF holdings
- `GET /api/mutualfunds/summary` - MF summary

**Portfolio:**

- `GET /api/portfolio/overview` - Complete overview

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Kite Connect API by [Zerodha](https://kite.trade/)
- Design inspired by [Claude](https://claude.ai/)
- UI components with [Tailwind CSS](https://tailwindcss.com/)

## 📞 Support

For issues and questions:

- Open an issue on GitHub
- Check the troubleshooting section above
- Review Kite Connect API documentation

---

**Made with ❤️ for Indian investors**
