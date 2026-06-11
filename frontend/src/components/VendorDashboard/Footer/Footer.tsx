import { Heart, ExternalLink } from 'lucide-react'

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-brand-500 border-t border-slate-200 px-6 py-4">
      <div className="flex flex-col md:flex-row justify-between items-center space-y-2 md:space-y-0">
        {/* Left Section - Copyright */}
        <div className="flex items-center space-x-1 text-sm text-white">
          <span>© {currentYear} Vendor Marketplace.</span>
          <span>Made with</span>
          <Heart className="h-4 w-4 text-slate-500 fill-current" />
          <span>by Admin Team</span>
        </div>

        {/* Center Section - Quick Stats */}
        <div className="hidden lg:flex items-center space-x-6 text-sm text-white">
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>System Status: Online</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span>Last Updated: 2 min ago</span>
          </div>
        </div>

        {/* Right Section - Links */}
        <div className="flex items-center space-x-4 text-sm">
          <a
            href="/dashboard/help"
            className="text-white transition-colors"
          >
            Help Center
          </a>
          <a
            href="/dashboard/support"
            className="text-white transition-colors"
          >
            Support
          </a>
          <a
            href="/dashboard/docs"
            className="text-white transition-colors flex items-center space-x-1"
          >
            <span>API Docs</span>
            <ExternalLink className="h-3 w-3" />
          </a>
          <div className="text-white">|</div>
          <span className="text-white">v2.1.0</span>
        </div>
      </div>

      {/* Mobile Quick Stats */}
      <div className="lg:hidden mt-3 pt-3 border-t border-slate-100">
        <div className="flex justify-center space-x-6 text-xs text-slate-500">
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>Online</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span>Updated 2m ago</span>
          </div>
        </div>
      </div>
    </footer>
  )
}