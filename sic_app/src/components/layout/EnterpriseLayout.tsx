import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Card, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';

interface EnterpriseLayoutProps {
  children: React.ReactNode;
}

/**
 * Phase 4: Enterprise Layout Component
 *
 * Provides the main layout for enterprise features with:
 * - Enterprise-specific navigation
 * - Role-based access indicators
 * - Organization context switching
 * - Advanced sidebar with analytics
 */
export const EnterpriseLayout: React.FC<EnterpriseLayoutProps> = ({ children }) => {
  const location = useLocation();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const navigationItems = [
    {
      path: '/enterprise/dashboard',
      label: 'Organization',
      icon: '🏢',
      description: 'Organization overview and management'
    },
    {
      path: '/enterprise/analytics',
      label: 'Analytics',
      icon: '📊',
      description: 'Advanced business intelligence'
    },
    {
      path: '/enterprise/ai-insights',
      label: 'AI Insights',
      icon: '🤖',
      description: 'Machine learning predictions'
    },
    {
      path: '/enterprise/security',
      label: 'Security',
      icon: '🔒',
      description: 'Security and compliance'
    },
    {
      path: '/enterprise/teams',
      label: 'Teams',
      icon: '👥',
      description: 'Team collaboration and permissions'
    }
  ];

  const isActivePath = (path: string) => {
    return location.pathname === path;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Enterprise Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="lg:hidden p-2 rounded-md hover:bg-gray-100"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">DueSpark Enterprise</h1>
              <p className="text-sm text-gray-500">Advanced business intelligence platform</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <Badge className="bg-purple-100 text-purple-800">
              Enterprise Tier
            </Badge>
            <Badge className="bg-green-100 text-green-800">
              Active
            </Badge>

            {/* User Menu */}
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">A</span>
              </div>
              <span className="text-sm font-medium text-gray-700">Admin User</span>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Enterprise Sidebar */}
        <aside className={`${
          isSidebarCollapsed ? 'w-16' : 'w-64'
        } bg-white border-r border-gray-200 transition-all duration-300 ease-in-out`}>
          <nav className="p-4 space-y-2">
            {navigationItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`block p-3 rounded-lg transition-all duration-200 ${
                  isActivePath(item.path)
                    ? 'bg-purple-50 border-purple-200 text-purple-700 border'
                    : 'hover:bg-gray-50 text-gray-700 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-xl">{item.icon}</span>
                  {!isSidebarCollapsed && (
                    <div>
                      <div className="font-medium">{item.label}</div>
                      <div className="text-xs text-gray-500 mt-1">{item.description}</div>
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </nav>

          {/* Quick Stats */}
          {!isSidebarCollapsed && (
            <div className="p-4 border-t border-gray-200 mt-6">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Quick Stats</h3>
              <div className="space-y-3">
                <Card className="p-3">
                  <CardContent className="p-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Active Users</span>
                      <span className="text-sm font-medium">12</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="p-3">
                  <CardContent className="p-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Monthly Revenue</span>
                      <span className="text-sm font-medium text-green-600">$45,230</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="p-3">
                  <CardContent className="p-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Security Score</span>
                      <span className="text-sm font-medium text-blue-600">94%</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};