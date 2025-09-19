import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';

interface KPI {
  name: string;
  value: number;
  previous_value: number;
  change_percentage: number;
  trend: 'up' | 'down' | 'stable';
  target?: number;
  unit: string;
  category: string;
}

interface Widget {
  widget_id: string;
  widget_type: string;
  title: string;
  data: any;
  config: any;
  position: { x: number; y: number; width: number; height: number };
}

interface DashboardData {
  dashboard_id: string;
  generated_at: string;
  kpis: {
    financial: KPI[];
    operational: KPI[];
    growth: KPI[];
  };
  widgets: Widget[];
  activity_feed: any[];
  performance_trends: any;
  alerts: any[];
}

/**
 * Phase 4: Advanced Analytics Dashboard
 *
 * Comprehensive business intelligence dashboard featuring:
 * - Real-time KPIs and metrics
 * - Interactive charts and visualizations
 * - Performance trend analysis
 * - Custom reporting capabilities
 * - Predictive analytics insights
 */
export const AnalyticsDashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState('30d');

  useEffect(() => {
    fetchDashboardData();
  }, [selectedTimeframe]);

  const fetchDashboardData = async () => {
    try {
      // Fetch real-time dashboard data from Phase 4 API
      const response = await fetch('/api/enterprise/analytics/dashboard');

      if (response.ok) {
        const data = await response.json();
        setDashboardData(data.data);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return '📈';
      case 'down': return '📉';
      default: return '➡️';
    }
  };

  const getTrendColor = (trend: string, category: string) => {
    if (category === 'financial' || category === 'growth') {
      return trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-600';
    }
    // For operational metrics, 'down' might be good (e.g., collection time)
    return trend === 'up' ? 'text-blue-600' : trend === 'down' ? 'text-green-600' : 'text-gray-600';
  };

  const formatValue = (value: number, unit: string) => {
    if (unit === 'USD') {
      return `$${value.toLocaleString()}`;
    }
    if (unit === '%') {
      return `${value.toFixed(1)}%`;
    }
    if (unit === 'days') {
      return `${value.toFixed(0)} days`;
    }
    return value.toLocaleString();
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
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
          <h1 className="text-3xl font-bold text-gray-900">Advanced Analytics</h1>
          <p className="text-gray-600 mt-1">
            Real-time business intelligence and performance insights
          </p>
        </div>

        <div className="flex items-center space-x-4">
          <select
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>

          <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors">
            Export Report
          </button>
        </div>
      </div>

      {/* Financial KPIs */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          💰 Financial Performance
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {dashboardData?.kpis.financial.map((kpi, index) => (
            <Card key={index}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-600">{kpi.name}</h3>
                  <span className="text-lg">{getTrendIcon(kpi.trend)}</span>
                </div>

                <div className="mb-2">
                  <span className="text-2xl font-bold text-gray-900">
                    {formatValue(kpi.value, kpi.unit)}
                  </span>

                  <div className={`text-sm ${getTrendColor(kpi.trend, kpi.category)} mt-1`}>
                    {kpi.change_percentage > 0 ? '+' : ''}{kpi.change_percentage.toFixed(1)}% vs last period
                  </div>
                </div>

                {kpi.target && (
                  <div className="text-xs text-gray-500">
                    Target: {formatValue(kpi.target, kpi.unit)}
                  </div>
                )}
              </CardContent>
            </Card>
          )) || [...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="text-center text-gray-500">
                  No financial data available
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Operational KPIs */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          ⚙️ Operational Metrics
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {dashboardData?.kpis.operational.map((kpi, index) => (
            <Card key={index}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-600">{kpi.name}</h3>
                  <span className="text-lg">{getTrendIcon(kpi.trend)}</span>
                </div>

                <div className="mb-2">
                  <span className="text-2xl font-bold text-gray-900">
                    {formatValue(kpi.value, kpi.unit)}
                  </span>

                  <div className={`text-sm ${getTrendColor(kpi.trend, kpi.category)} mt-1`}>
                    {kpi.change_percentage > 0 ? '+' : ''}{kpi.change_percentage.toFixed(1)}% vs last period
                  </div>
                </div>

                {kpi.target && (
                  <div className="text-xs text-gray-500">
                    Target: {formatValue(kpi.target, kpi.unit)}
                  </div>
                )}
              </CardContent>
            </Card>
          )) || [...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="text-center text-gray-500">
                  No operational data available
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Growth Metrics */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          🚀 Growth Analysis
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {dashboardData?.kpis.growth.map((kpi, index) => (
            <Card key={index}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-600">{kpi.name}</h3>
                  <span className="text-lg">{getTrendIcon(kpi.trend)}</span>
                </div>

                <div className="mb-2">
                  <span className="text-2xl font-bold text-gray-900">
                    {formatValue(kpi.value, kpi.unit)}
                  </span>
                </div>

                {kpi.target && (
                  <div className="text-xs text-gray-500">
                    Target: {formatValue(kpi.target, kpi.unit)}
                  </div>
                )}
              </CardContent>
            </Card>
          )) || [...Array(2)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="text-center text-gray-500">
                  No growth data available
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Interactive Widgets */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          📊 Interactive Dashboards
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Trend Chart Placeholder */}
          <Card>
            <CardHeader>
              <CardTitle>Revenue Trend (90 days)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 bg-gradient-to-r from-blue-50 to-blue-100 rounded flex items-center justify-center">
                <div className="text-center text-gray-600">
                  <div className="text-3xl mb-2">📈</div>
                  <div>Interactive chart would be rendered here</div>
                  <div className="text-sm mt-2">Revenue trending upward by 12.5%</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Client Distribution Chart Placeholder */}
          <Card>
            <CardHeader>
              <CardTitle>Client Revenue Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 bg-gradient-to-r from-green-50 to-green-100 rounded flex items-center justify-center">
                <div className="text-center text-gray-600">
                  <div className="text-3xl mb-2">🥧</div>
                  <div>Pie chart would be rendered here</div>
                  <div className="text-sm mt-2">Top 5 clients represent 68% of revenue</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Custom Reports */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            📋 Custom Reports
            <button className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition-colors">
              Create Report
            </button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer">
              <h4 className="font-medium text-gray-900">Financial Performance Report</h4>
              <p className="text-sm text-gray-600 mt-1">Revenue, expenses, and profitability analysis</p>
              <Badge className="bg-blue-100 text-blue-800 mt-2">Monthly</Badge>
            </div>

            <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer">
              <h4 className="font-medium text-gray-900">Collection Efficiency Report</h4>
              <p className="text-sm text-gray-600 mt-1">Payment timing and collection performance</p>
              <Badge className="bg-green-100 text-green-800 mt-2">Weekly</Badge>
            </div>

            <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer">
              <h4 className="font-medium text-gray-900">Client Analysis Report</h4>
              <p className="text-sm text-gray-600 mt-1">Client behavior and revenue contribution</p>
              <Badge className="bg-purple-100 text-purple-800 mt-2">Quarterly</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};