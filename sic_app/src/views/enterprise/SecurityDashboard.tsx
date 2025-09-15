import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';

interface SecurityEvent {
  id: number;
  type: string;
  description: string;
  risk_score: number;
  timestamp: string;
  user_id?: number;
}

interface ComplianceFeatures {
  gdpr_enabled: boolean;
  sox_enabled: boolean;
  mfa_required: boolean;
  encryption_enabled: boolean;
}

interface SecurityDashboardData {
  security_score: number;
  compliance_score: number;
  total_events_30d: number;
  high_risk_events_30d: number;
  recent_events: SecurityEvent[];
  compliance_features: ComplianceFeatures;
}

/**
 * Phase 4: Security & Compliance Dashboard
 *
 * Enterprise security monitoring and compliance management:
 * - Real-time security scoring
 * - Audit event monitoring
 * - GDPR/SOX compliance tracking
 * - Risk assessment and alerting
 * - Access control management
 */
export const SecurityDashboard: React.FC = () => {
  const [securityData, setSecurityData] = useState<SecurityDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'events' | 'compliance' | 'settings'>('overview');

  useEffect(() => {
    fetchSecurityData();
  }, []);

  const fetchSecurityData = async () => {
    try {
      // Fetch security dashboard data from Phase 4 API
      const response = await fetch('/api/enterprise/security/dashboard');

      if (response.ok) {
        const data = await response.json();
        setSecurityData(data.data);
      }
    } catch (error) {
      console.error('Error fetching security data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-100';
    if (score >= 70) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getRiskColor = (riskScore: number) => {
    if (riskScore >= 80) return 'bg-red-100 text-red-800';
    if (riskScore >= 60) return 'bg-yellow-100 text-yellow-800';
    if (riskScore >= 40) return 'bg-blue-100 text-blue-800';
    return 'bg-green-100 text-green-800';
  };

  const formatEventType = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Security & Compliance</h1>
          <p className="text-gray-600 mt-1">
            Enterprise security monitoring and compliance management
          </p>
        </div>

        <div className="flex items-center space-x-4">
          <button className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors">
            🚨 View Alerts
          </button>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors">
            📊 Generate Report
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: '🛡️' },
            { id: 'events', label: 'Security Events', icon: '📋' },
            { id: 'compliance', label: 'Compliance', icon: '✅' },
            { id: 'settings', label: 'Settings', icon: '⚙️' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                selectedTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {selectedTab === 'overview' && (
        <div className="space-y-6">
          {/* Security Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Security Score</p>
                    <p className={`text-2xl font-bold ${getScoreColor(securityData?.security_score || 0).split(' ')[0]}`}>
                      {securityData?.security_score || 0}%
                    </p>
                  </div>
                  <div className={`p-2 rounded-full ${getScoreColor(securityData?.security_score || 0)}`}>
                    🛡️
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Compliance Score</p>
                    <p className={`text-2xl font-bold ${getScoreColor(securityData?.compliance_score || 0).split(' ')[0]}`}>
                      {securityData?.compliance_score || 0}%
                    </p>
                  </div>
                  <div className={`p-2 rounded-full ${getScoreColor(securityData?.compliance_score || 0)}`}>
                    ✅
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Events (30d)</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {securityData?.total_events_30d || 0}
                    </p>
                  </div>
                  <div className="p-2 rounded-full bg-blue-100 text-blue-600">
                    📊
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">High Risk Events</p>
                    <p className="text-2xl font-bold text-red-600">
                      {securityData?.high_risk_events_30d || 0}
                    </p>
                  </div>
                  <div className="p-2 rounded-full bg-red-100 text-red-600">
                    ⚠️
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Compliance Features */}
          <Card>
            <CardHeader>
              <CardTitle>Compliance Features Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${
                    securityData?.compliance_features.gdpr_enabled ? 'bg-green-500' : 'bg-red-500'
                  }`}></div>
                  <span className="text-sm font-medium">GDPR Compliance</span>
                </div>

                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${
                    securityData?.compliance_features.sox_enabled ? 'bg-green-500' : 'bg-red-500'
                  }`}></div>
                  <span className="text-sm font-medium">SOX Compliance</span>
                </div>

                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${
                    securityData?.compliance_features.mfa_required ? 'bg-green-500' : 'bg-red-500'
                  }`}></div>
                  <span className="text-sm font-medium">MFA Required</span>
                </div>

                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${
                    securityData?.compliance_features.encryption_enabled ? 'bg-green-500' : 'bg-red-500'
                  }`}></div>
                  <span className="text-sm font-medium">Encryption Enabled</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Security Events Tab */}
      {selectedTab === 'events' && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Security Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {securityData?.recent_events.length ? securityData.recent_events.map((event) => (
                <div key={event.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900">
                      {formatEventType(event.type)}
                    </span>
                    <div className="flex items-center space-x-2">
                      <Badge className={getRiskColor(event.risk_score)}>
                        Risk: {event.risk_score}/100
                      </Badge>
                      <span className="text-sm text-gray-500">
                        {new Date(event.timestamp).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">{event.description}</p>
                  {event.user_id && (
                    <p className="text-xs text-gray-500 mt-1">User ID: {event.user_id}</p>
                  )}
                </div>
              )) : (
                <div className="text-center py-8 text-gray-500">
                  No recent security events to display
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Compliance Tab */}
      {selectedTab === 'compliance' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>GDPR Compliance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Data Protection Rights</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>✅ Right to access personal data</li>
                    <li>✅ Right to rectification</li>
                    <li>✅ Right to erasure</li>
                    <li>✅ Right to data portability</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Technical Measures</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>✅ Encryption at rest</li>
                    <li>✅ Encryption in transit</li>
                    <li>✅ Access logging</li>
                    <li>✅ Data retention policies</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Audit Trail</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <div className="text-3xl mb-2">📋</div>
                <div>Audit trail records all data access and modifications</div>
                <div className="text-sm mt-2">Last 30 days: {securityData?.total_events_30d || 0} events logged</div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Settings Tab */}
      {selectedTab === 'settings' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Security Policies</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">Multi-Factor Authentication</h4>
                    <p className="text-sm text-gray-600">Require MFA for all users</p>
                  </div>
                  <button className="bg-green-600 text-white px-3 py-1 rounded text-sm">
                    Enabled
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">Session Timeout</h4>
                    <p className="text-sm text-gray-600">Automatic logout after inactivity</p>
                  </div>
                  <select className="border border-gray-300 rounded px-3 py-1 text-sm">
                    <option>30 minutes</option>
                    <option>1 hour</option>
                    <option>2 hours</option>
                    <option>4 hours</option>
                  </select>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">Password Policy</h4>
                    <p className="text-sm text-gray-600">Minimum password requirements</p>
                  </div>
                  <button className="bg-blue-600 text-white px-3 py-1 rounded text-sm">
                    Configure
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Data Export Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <button className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 transition-colors">
                  Request Data Export
                </button>
                <p className="text-sm text-gray-600 mt-2">
                  Export user data for GDPR compliance
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};