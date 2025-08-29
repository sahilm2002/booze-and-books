# 🍻📚 Booze & Books

**Where Literature Meets Libations**

A sophisticated book swapping platform that brings together bibliophiles who appreciate fine literature and craft cocktails. Built with modern web technologies for an elegant user experience.

![Next.js](https://img.shields.io/badge/Next.js-14.2.5-black?style=flat&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.2.2-blue?style=flat&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4.0-38B2AC?style=flat&logo=tailwind-css)
![React](https://img.shields.io/badge/React-18.2.0-61DAFB?style=flat&logo=react)

## ✨ Features

### 🎯 **Current (Phase 1 - Foundation)**
- ✅ **Modern Stack**: Next.js 14 with App Router, TypeScript, Tailwind CSS
- ✅ **Beautiful UI**: Dark theme with elegant amber/orange accents
- ✅ **Responsive Design**: Mobile-first approach with professional styling
- ✅ **Performance Optimized**: Fast loading and smooth animations
- ✅ **Developer Experience**: ESLint, Prettier, Husky pre-commit hooks
- ✅ **Component Library**: Reusable UI components with Radix UI integration

### 🚧 **Coming Soon (Phase 2-7)**
- 🔐 **User Authentication**: Secure login/signup with Supabase
- 👤 **User Profiles**: Personal dashboards and statistics
- 📚 **Book Management**: Add, browse, and search book collections
- 🔄 **Smart Swapping**: Intelligent book exchange system
- ⭐ **Reviews & Ratings**: Community-driven book recommendations
- 🎨 **Advanced Features**: PWA support, dark mode toggle, notifications
- 🏘️ **Community**: Book clubs, reading challenges, social features

## 🏗️ **Architecture**

Built with a modern, scalable architecture:

```
booze-and-books/
├── src/
│   ├── app/                 # Next.js 14 App Router
│   │   ├── auth/           # Authentication pages
│   │   ├── dashboard/      # User dashboard
│   │   ├── books/          # Book management
│   │   └── api/            # API routes
│   ├── components/
│   │   ├── ui/             # Reusable UI components
│   │   ├── layout/         # Layout components
│   │   ├── auth/           # Authentication components
│   │   └── shared/         # Shared components
│   ├── lib/                # Utilities and configurations
│   ├── hooks/              # Custom React hooks
│   ├── stores/             # State management (Zustand)
│   └── types/              # TypeScript type definitions
├── .vscode/
│   └── mcp.json           # Supabase MCP configuration
└── public/                # Static assets
```

## 🚀 **Getting Started**

### Prerequisites

- **Node.js 20.x LTS** (v23+ not supported due to compatibility issues)
- **npm** or **yarn**
- **Git**

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/sahilm2002/booze-and-books.git
   cd booze-and-books
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.local.example .env.local
   ```
   
   Edit `.env.local` with your configuration:
   ```env
   # Database (when ready for Phase 2)
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   
   # NextAuth
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your_nextauth_secret_key
   
   # App Configuration
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   NEXT_PUBLIC_APP_NAME="Booze & Books"
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   
   Visit [http://localhost:3000](http://localhost:3000) to see your app!

## 🛠️ **Development**

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues
npm run type-check   # Run TypeScript type checking
npm run format       # Format code with Prettier
npm run format:check # Check code formatting
```

### Code Quality

- **ESLint**: Code linting with Next.js and TypeScript rules
- **Prettier**: Code formatting with Tailwind CSS plugin
- **Husky**: Pre-commit hooks for code quality
- **TypeScript**: Strict type checking enabled

### Component Development

Components follow a consistent pattern:
- **UI Components**: Located in `src/components/ui/`
- **Styled with Tailwind**: Using the custom design system
- **TypeScript**: Fully typed with proper interfaces
- **Accessible**: Built with Radix UI primitives where applicable

## 🎨 **Design System**

### Colors
- **Primary**: Amber (#f59e0b) to Orange (#ea580c) gradient
- **Background**: Slate 900 to Purple 900 gradient
- **Text**: Slate variants for hierarchy
- **Accents**: Amber 400 for highlights

### Typography
- **Font**: Inter (system fallback)
- **Scale**: Tailwind's default scale
- **Weights**: 400 (normal), 500 (medium), 600 (semibold), 700 (bold)

## 🗺️ **Development Roadmap**

### Phase 1: Foundation ✅ **COMPLETE**
- Next.js setup with TypeScript
- Tailwind CSS styling system  
- Basic UI components
- Project structure and tooling

### Phase 2: User Management 🚧 **IN PROGRESS**
- Supabase authentication setup
- User registration and login
- User dashboard and profiles
- Session management

### Phase 3: Book Management 📋 **PLANNED**
- Book CRUD operations
- Search and filtering
- Google Books API integration
- Image uploads

### Phase 4: Book Swapping 📋 **PLANNED**
- Swap request system
- User communication
- Swap tracking and history
- Location-based matching

### Phase 5: Reviews & Ratings 📋 **PLANNED**
- Book review system
- User rating system
- Recommendation engine
- Community features

### Phase 6: Performance & Polish 📋 **PLANNED**
- PWA implementation
- Performance optimization
- Advanced UI/UX features
- Mobile app feel

### Phase 7: Advanced Features 📋 **PLANNED**
- Book clubs and communities
- Reading challenges
- Analytics and insights
- Admin dashboard

## 🤝 **Contributing**

This project is currently in active development. Contributions will be welcome once the core features are stable.

### Development Philosophy
- **User-First**: Every feature prioritizes user experience
- **Performance**: Fast, responsive, and accessible
- **Code Quality**: Clean, maintainable, and well-documented
- **Modern Stack**: Using the latest stable technologies

## 📄 **License**

This project is private and proprietary.

## 🙏 **Acknowledgments**

- Built with [Next.js](https://nextjs.org/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)
- UI components powered by [Radix UI](https://www.radix-ui.com/)
- Icons from [Lucide React](https://lucide.dev/)
- Development accelerated with [Claude Code](https://claude.ai/code)

---

**Made with ❤️ and ☕ for book lovers and cocktail enthusiasts**

*"The perfect blend of culture and craft"*