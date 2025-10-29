import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#e6ffff] via-white to-[#00f9e3]/10">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-[#033c3a] to-[#00e5c0] bg-clip-text text-transparent">
              Skills Intelligence System
            </h1>
            <Link
              href="/signin"
              className="px-6 py-2 bg-[#00e5c0] text-[#033c3a] rounded-lg hover:bg-[#0eafaa] transition-colors font-medium"
            >
              Sign In
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold text-slate-900 mb-6">
            Intelligence-Driven Skills Development
          </h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto mb-8">
            Transform your apprenticeship data into actionable insights with AI-powered analytics
            and real-time PowerBI reporting.
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/signin"
              className="px-8 py-3 bg-[#00e5c0] text-[#033c3a] rounded-lg hover:bg-[#0eafaa] transition-colors font-semibold text-lg"
            >
              Get Started
            </Link>
            <a
              href="#features"
              className="px-8 py-3 bg-white text-[#00e5c0] border-2 border-[#00e5c0] rounded-lg hover:bg-[#e6ffff] transition-colors font-semibold text-lg"
            >
              Learn More
            </a>
          </div>
        </div>

        {/* Features Section */}
        <div id="features" className="grid md:grid-cols-3 gap-8 mt-20">
          <div className="bg-white rounded-xl p-8 shadow-sm border border-slate-200">
            <div className="w-12 h-12 bg-[#e6ffff] rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-[#00e5c0]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-3">
              Real-Time Analytics
            </h3>
            <p className="text-slate-600">
              Monitor apprenticeship progress, attendance, and achievements with live PowerBI dashboards
              tailored to your role.
            </p>
          </div>

          <div className="bg-white rounded-xl p-8 shadow-sm border border-slate-200">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-3">
              Role-Based Access
            </h3>
            <p className="text-slate-600">
              From Senior Leaders to Skills Coaches, everyone sees the reports they need with
              appropriate data access controls.
            </p>
          </div>

          <div className="bg-white rounded-xl p-8 shadow-sm border border-slate-200">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-3">
              AI-Powered Insights
            </h3>
            <p className="text-slate-600">
              Leverage AI to identify at-risk apprentices, predict outcomes, and optimize
              training programs automatically.
            </p>
          </div>
        </div>

        {/* Stats Section */}
        <div className="grid md:grid-cols-4 gap-8 mt-20 bg-white rounded-xl p-12 shadow-sm border border-slate-200">
          <div className="text-center">
            <div className="text-4xl font-bold text-[#00e5c0] mb-2">14</div>
            <div className="text-slate-600">Module Types</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-blue-600 mb-2">12</div>
            <div className="text-slate-600">User Roles</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-green-600 mb-2">100%</div>
            <div className="text-slate-600">Data Security</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-orange-600 mb-2">24/7</div>
            <div className="text-slate-600">Access</div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-white mt-20 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-xl font-bold mb-4">Skills Intelligence System</h3>
              <p className="text-slate-400">
                Transforming apprenticeship data into actionable insights.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-slate-400">
                <li>
                  <Link href="/signin" className="hover:text-white transition-colors">
                    Sign In
                  </Link>
                </li>
                <li>
                  <a href="#features" className="hover:text-white transition-colors">
                    Features
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Contact</h4>
              <p className="text-slate-400">
                For support or inquiries, please contact your administrator.
              </p>
            </div>
          </div>
          <div className="border-t border-slate-800 mt-8 pt-8 text-center text-slate-400">
            <p>&copy; 2025 Skills Intelligence System. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
