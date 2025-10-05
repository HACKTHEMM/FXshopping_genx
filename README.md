# LumenFX - Modern Payments Dashboard

A modern, responsive financial dashboard application built with Next.js, featuring wallet management, savings tracking, and transaction history. LumenFX leverages the Stellar blockchain for optimized cross-border payments with transparent fee structures.

## 🚀 Features

### Landing Page
- **Hero Section**: Compelling value proposition with "No hidden fees, no guesswork"
- **Interactive FAQ**: Expandable FAQ section with comprehensive answers
- **How It Works**: 3-step process explanation with visual guides
- **Call-to-Action**: Multiple conversion points throughout the page
- **Responsive Design**: Mobile-first approach with tablet and desktop optimizations

### Dashboard
- **Wallet Management**: View USDC balance with deposit/payout functionality
- **Savings Tracking**: Monitor Aave-based savings with growth projections
- **Visual Charts**: Interactive savings projection charts with time-based filtering
- **Real-time Data**: Live rate updates and transaction status
- **Responsive Layout**: Adaptive layouts for mobile, tablet, and desktop

### Transaction Management
- **Transaction History**: Comprehensive transaction listing with filtering
- **Transaction Types**: Support for wallet-to-payout, savings transfers, and deposits
- **Hash Tracking**: Blockchain transaction hash display with copy functionality
- **Time Filtering**: Filter by last 7, 30, 90 days or all time
- **Currency Support**: USDC, USD, and ETH filtering options

### Settings & Security
- **Password Management**: Secure password change functionality
- **Account Security**: Profile and security settings management
- **Form Validation**: Input validation and error handling
- **Responsive Forms**: Mobile-optimized form layouts

### Authentication
- **Login System**: Email/password authentication with social login options
- **Session Management**: Local storage-based authentication state
- **Social Integration**: Google and Twitter OAuth options
- **Security Features**: Password visibility toggles and validation

## 🛠️ Technology Stack

- **Framework**: Next.js 15.5.4 with App Router
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4 with PostCSS
- **UI Components**: Custom React components
- **Fonts**: 
  - PP Valve (Custom font family)
  - Inter (Google Fonts)
- **Icons**: Heroicons (SVG-based)
- **Build Tool**: Turbopack (Next.js built-in)

## 📁 Project Structure

```
FXshopping_genx/
├── app/                          # Next.js App Router directory
│   ├── components/              # Reusable React components
│   │   ├── Login.tsx           # Authentication component
│   │   ├── Navbar.tsx          # Navigation component
│   │   ├── Settings.tsx        # Settings and profile management
│   │   └── Transactions.tsx    # Transaction history component
│   ├── dashboard/              # Dashboard page
│   │   └── page.tsx           # Main dashboard implementation
│   ├── login/                  # Login page
│   │   └── page.tsx           # Login page wrapper
│   ├── favicon.ico             # Site favicon
│   ├── globals.css             # Global styles and Tailwind imports
│   ├── layout.tsx              # Root layout component
│   └── page.tsx                # Landing page component
├── fonts/                      # Custom font files
│   ├── PPValve-PlainExtralight.otf
│   ├── PPValve-PlainMedium.otf
│   ├── PPValve-PlainExtrabold.otf
│   └── [Additional font variants]
├── public/                     # Static assets
│   ├── stellar-xlm-logo.png    # Stellar blockchain logo
│   └── [Other SVG assets]
├── eslint.config.mjs           # ESLint configuration
├── next.config.ts              # Next.js configuration
├── package.json                # Dependencies and scripts
├── postcss.config.mjs          # PostCSS configuration
├── tsconfig.json               # TypeScript configuration
└── README.md                   # This file
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm, yarn, pnpm, or bun

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd FXshopping_genx
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   # or
   bun install
   ```

3. **Run the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   # or
   bun dev
   ```

4. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000) to see the application.

### Available Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build the application for production
- `npm run start` - Start the production server
- `npm run lint` - Run ESLint for code quality checks

## 🎨 Design System

### Typography
- **Primary Font**: PP Valve (Custom font family)
- **Secondary Font**: Inter (Google Fonts)
- **Font Weights**: 200 (Extralight), 500 (Medium), 800 (Extrabold)

### Color Palette
- **Primary**: Blue (#2563eb)
- **Background**: White (#ffffff)
- **Text**: Black (#000000)
- **Accent**: Green (for savings/growth indicators)
- **Gray Scale**: Various gray shades for UI elements

### Layout Breakpoints
- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: 1024px+

### Component Architecture
- **Responsive Design**: Mobile-first approach with progressive enhancement
- **Component Composition**: Modular, reusable React components
- **State Management**: React hooks for local state management
- **Type Safety**: Full TypeScript implementation

## 🔧 Configuration

### Next.js Configuration
The application uses Next.js 15 with Turbopack for fast development builds. Configuration is minimal and can be extended in `next.config.ts`.

### Tailwind CSS
Tailwind CSS 4 is configured with custom theme extensions and PostCSS processing. The design system enforces sharp corners globally for a modern, clean aesthetic.

### TypeScript
Strict TypeScript configuration with proper type definitions for all components and interfaces.

## 🌟 Key Features Implementation

### Responsive Design
- **Mobile Layout**: Stacked components with optimized touch targets
- **Tablet Layout**: Grid-based layouts with improved spacing
- **Desktop Layout**: Multi-column layouts with fixed and scrollable sections

### State Management
- **Authentication State**: Local storage-based session management
- **Form State**: Controlled components with validation
- **UI State**: Mobile menu toggles and modal states

### Performance Optimizations
- **Font Loading**: Optimized font loading with `display: swap`
- **Image Optimization**: Next.js automatic image optimization
- **Code Splitting**: Automatic code splitting with Next.js App Router

## 🔒 Security Features

- **Input Validation**: Client-side form validation
- **Password Security**: Secure password input with visibility toggles
- **Session Management**: Secure authentication state handling
- **XSS Protection**: React's built-in XSS protection

## 📱 Mobile Experience

The application is fully optimized for mobile devices with:
- Touch-friendly interface elements
- Responsive navigation with mobile menu
- Optimized form layouts
- Mobile-specific component arrangements

## 🚀 Deployment

The application is ready for deployment on platforms like:
- **Vercel** (Recommended for Next.js)
- **Netlify**
- **AWS Amplify**
- **Any Node.js hosting platform**

### Build for Production
```bash
npm run build
npm run start
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **Stellar Development Foundation** for blockchain infrastructure
- **Next.js Team** for the amazing React framework
- **Tailwind CSS** for the utility-first CSS framework
- **Heroicons** for the beautiful icon set

## 📞 Support

For support, email support@lumenfx.com or join our community Discord.

---

**LumenFX** - Optimizing your money with transparent, blockchain-powered payments.