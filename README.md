# en-rupee

A comprehensive personal finance management web application built with Next.js, featuring innovative expense tracking with partial-needs categorization, investment portfolio management, and intelligent budget allocation.

## ✨ Features

### 🔐 Authentication & Authorization
- **Email/Password Authentication** using Auth.js with bcrypt encryption
- **Role-Based Access Control (RBAC)** with Customer and Super Admin roles
- **Secure Sessions** with JWT tokens and CSRF protection
- **Protected Routes** with middleware-based authentication

### 👤 User Profile Management
- **Profile Information** - Name, email, and role management
- **Password Management** - Secure password change functionality
- **Net Salary Tracking** - Historical salary records with effective dates
- **Profile Pictures** - Avatar support with fallback initials

### 💰 Smart Tax Configuration
- **Multiple Tax Modes**:
  - **Percentage Mode**: Tax as percentage of net salary
  - **Fixed Mode**: Fixed monthly tax amount
  - **Hybrid Mode**: Higher of percentage or fixed amount
- **Real-time Projections** - Monthly and annual tax calculations
- **Visual Tax Breakdown** - Clear visualization of tax flow

### 🛍️ Innovative Expense Tracking
- **Smart Categorization**:
  - **Needs**: Essential expenses (groceries, rent, utilities)
  - **Partial-Needs**: Mixed expenses with intelligent splitting
  - **Avoid**: Non-essential expenses (entertainment, luxury)
- **Partial-Needs Innovation**:
  - Split single transactions into "needs" and "avoid" portions
  - Example: ₹1000 grocery bill → ₹700 needs + ₹300 avoid
- **Expected vs Unexpected** classification
- **Advanced Filtering & Sorting**
- **Real-time Analytics** with needs vs avoid breakdowns

### 📊 Investment Portfolio Management (Coming Soon)
- **Multi-Asset Support**:
  - Mutual Funds
  - Indian Stocks
  - Foreign (US) Stocks
  - Cryptocurrency
  - Emergency Fund
- **Portfolio Allocation** - Percentage-based SIP distributions
- **Holdings Tracking** - Quantity, average cost, P&L calculations
- **Investment Overview** - Comprehensive portfolio dashboard

### 📈 Financial Pipeline Visualization
- **Salary Flow Management**: Net Salary → Tax → Investments → Expenses
- **Real-time Calculations** - Automatic allocation based on configurations
- **Visual Dashboard** - Clear representation of money flow
- **Budget Tracking** - Remaining amounts for each category

### 📱 Modern UI/UX
- **Dark/Light Theme** support with system preference detection
- **Responsive Design** - Mobile-first approach with adaptive layouts
- **Professional Components** using shadcn/ui and Radix primitives
- **Accessible Interface** - WCAG compliant design patterns
- **Loading States** and optimistic UI updates

## 🛠️ Technology Stack

### Frontend
- **Next.js 14** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **shadcn/ui** component library
- **Radix UI** primitives
- **React Hook Form** with Zod validation
- **Lucide React** icons

### Backend
- **Next.js API Routes** for serverless functions
- **Prisma ORM** with PostgreSQL
- **Auth.js (NextAuth)** for authentication
- **bcrypt** for password hashing
- **Zod** for schema validation

### Database
- **PostgreSQL** with comprehensive schema
- **Prisma migrations** for version control
- **Foreign key relationships** for data integrity
- **Indexed queries** for performance

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL database
- npm or yarn package manager

### Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/enrupee"
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="your-strong-secret-key"
   ```

3. **Set up the database**
   ```bash
   npx prisma migrate dev --name init
   npx prisma generate
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📊 Core Features Implemented

### ✅ Authentication System
- Complete email/password authentication
- User registration and login
- Session management with Auth.js
- Role-based access control

### ✅ Profile Management
- User profile editing
- Secure password changes
- Net salary history tracking
- Avatar and display name management

### ✅ Tax Configuration
- Multiple tax calculation modes
- Real-time tax projections
- Monthly and annual calculations
- Visual tax breakdown

### ✅ Expense Tracking
- Smart expense categorization
- Partial-needs splitting innovation
- Expected vs unexpected classification
- Advanced filtering and analytics

### ✅ Dashboard & Navigation
- Financial pipeline visualization
- Responsive sidebar navigation
- Dark/light theme support
- Professional UI components

## 💡 Innovative Partial-Needs Feature

The standout feature of en-rupee is the **partial-needs** expense categorization:

```typescript
// Example: ₹1000 grocery expense
{
  title: "Grocery Shopping",
  category: "PARTIAL_NEEDS",
  amount: 1000,
  needsPortion: 700,    // Essential items (rice, vegetables)
  avoidPortion: 300     // Luxury items (imported snacks, premium brands)
}
```

**Benefits:**
- More accurate financial insights
- Better understanding of spending patterns
- Precise needs vs wants analysis
- Improved budgeting decisions

## 🔧 Database Schema

### Key Models
- **User** - Authentication and profile
- **Profile** - Extended user information
- **NetSalaryHistory** - Salary tracking with dates
- **TaxSetting** - Tax configuration per user
- **Expense** - Expense tracking with partial-needs support
- **InvestmentAllocation** - Portfolio allocation (ready for implementation)
- **Holding** - Investment positions (ready for implementation)

## 🛡️ Security Features

- **Password Security**: bcrypt hashing with 12 rounds
- **Session Security**: JWT tokens with secure HTTP-only cookies
- **Route Protection**: Middleware-based authentication
- **Data Validation**: Zod schemas on all endpoints
- **SQL Injection Prevention**: Prisma ORM protection
- **CSRF Protection**: Built-in Next.js security

## 🎨 UI/UX Design

- **Modern Interface**: Clean, professional design
- **Responsive Layout**: Mobile-first approach
- **Dark/Light Theme**: System preference detection
- **Accessible Components**: WCAG compliant
- **Loading States**: Smooth user experience
- **Error Handling**: User-friendly error messages

## 🚧 Roadmap

### Phase 1: Core Features ✅
- [x] Authentication system
- [x] User profile management
- [x] Tax configuration
- [x] Expense tracking with partial-needs
- [x] Basic dashboard

### Phase 2: Investment Management
- [ ] Investment allocation settings
- [ ] Holdings management
- [ ] P&L calculations
- [ ] Portfolio dashboard

### Phase 3: Advanced Analytics
- [ ] Period-based reports
- [ ] Spending pattern analysis
- [ ] Budget vs actual comparisons
- [ ] Export functionality

### Phase 4: Enhanced Features
- [ ] OAuth providers (Google, Apple)
- [ ] Mobile app (React Native)
- [ ] Bank integration
- [ ] Real-time price feeds

## 🔄 Current Status

**Completed Components:**
- ✅ Authentication & authorization
- ✅ User profile management
- ✅ Tax configuration system
- ✅ Expense tracking with partial-needs
- ✅ Dashboard and navigation
- ✅ Database schema and APIs

**In Progress:**
- 🚧 Investment portfolio management
- 🚧 Advanced reporting
- 🚧 Admin panel

**Ready for Implementation:**
- 📋 All database models are defined
- 📋 API structure is established
- 📋 UI components are available

## 🤝 Getting Started for Development

1. **Clone and setup** (see Quick Start above)
2. **Review the codebase structure**:
   ```
   src/
   ├── app/              # Next.js App Router pages
   ├── components/       # Reusable UI components
   ├── lib/             # Utilities and configurations
   └── types/           # TypeScript type definitions
   ```
3. **Start with existing features** to understand the patterns
4. **Follow the established conventions** for new features

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

Built with modern web technologies:
- Next.js for the full-stack framework
- Prisma for database management
- shadcn/ui for beautiful components
- Auth.js for authentication
- Tailwind CSS for styling

---

**en-rupee** - Empowering personal finance management with intelligent expense categorization and comprehensive tracking.