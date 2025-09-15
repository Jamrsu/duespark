import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';

interface PaymentPrediction {
  invoice_id: number;
  predicted_date: string;
  confidence: number;
  risk_factors: string[];
  recommended_actions: string[];
}

interface CollectionStrategy {
  client_id: number;
  client_name: string;
  strategy_type: 'gentle' | 'standard' | 'aggressive' | 'legal';
  contact_frequency: number;
  channels: string[];
  escalation_timeline: string;
}

interface BusinessInsight {
  type: 'cash_flow' | 'client_risk' | 'efficiency' | 'growth';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  recommendation: string;
}

/**
 * Phase 4: AI Intelligence Dashboard
 *
 * Displays AI-powered insights and predictions:
 * - Payment date and probability predictions
 * - Debt collection strategy recommendations
 * - Business intelligence and cash flow insights
 * - Risk assessment and automated scoring
 */
export const AIInsightsView: React.FC = () => {
  const [predictions, setPredictions] = useState<PaymentPrediction[]>([]);
  const [strategies, setStrategies] = useState<CollectionStrategy[]>([]);
  const [insights, setInsights] = useState<BusinessInsight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAIData();
  }, []);

  const fetchAIData = async () => {
    try {
      // Fetch AI insights from Phase 4 API
      const [predictionsRes, strategiesRes, insightsRes] = await Promise.all([
        fetch('/api/enterprise/ai/recent-predictions'),
        fetch('/api/enterprise/ai/collection-strategies'),
        fetch('/api/enterprise/ai/business-insights')
      ]);

      if (predictionsRes.ok) {
        const predictionsData = await predictionsRes.json();
        setPredictions(predictionsData.data || []);
      }

      if (strategiesRes.ok) {
        const strategiesData = await strategiesRes.json();
        setStrategies(strategiesData.data || []);
      }

      if (insightsRes.ok) {
        const insightsData = await insightsRes.json();
        setInsights(insightsData.data || []);
      }
    } catch (error) {
      console.error('Error fetching AI data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getConfidenceBadgeColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-100 text-green-800';
    if (confidence >= 0.6) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getStrategyBadgeColor = (strategy: string) => {
    switch (strategy) {
      case 'gentle': return 'bg-blue-100 text-blue-800';
      case 'standard': return 'bg-gray-100 text-gray-800';
      case 'aggressive': return 'bg-orange-100 text-orange-800';
      case 'legal': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getImpactBadgeColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">AI Intelligence Dashboard</h1>
        <p className="text-gray-600 mt-1">
          Machine learning insights for payment prediction and business optimization
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Predictions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4" />
              </svg>
              Payment Predictions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {predictions.length > 0 ? predictions.map((prediction, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">Invoice #{prediction.invoice_id}</span>
                    <Badge className={getConfidenceBadgeColor(prediction.confidence)}>
                      {Math.round(prediction.confidence * 100)}% confidence
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">
                    Predicted payment: {new Date(prediction.predicted_date).toLocaleDateString()}
                  </p>
                  {prediction.risk_factors.length > 0 && (
                    <div className="mb-2">
                      <span className="text-xs font-medium text-red-600">Risk factors:</span>
                      <ul className="text-xs text-gray-600 ml-2">
                        {prediction.risk_factors.map((factor, i) => (
                          <li key={i}>• {factor}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {prediction.recommended_actions.length > 0 && (
                    <div>
                      <span className="text-xs font-medium text-green-600">Recommendations:</span>
                      <ul className="text-xs text-gray-600 ml-2">
                        {prediction.recommended_actions.map((action, i) => (
                          <li key={i}>• {action}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )) : (
                <p className="text-gray-500 text-center py-8">
                  No payment predictions available. AI predictions will appear as invoices are analyzed.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Collection Strategies */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <svg className="w-5 h-5 mr-2 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Collection Strategies
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {strategies.length > 0 ? strategies.map((strategy, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{strategy.client_name}</span>
                    <Badge className={getStrategyBadgeColor(strategy.strategy_type)}>
                      {strategy.strategy_type.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Contact frequency:</span>
                      <p className="text-gray-600">Every {strategy.contact_frequency} days</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Channels:</span>
                      <p className="text-gray-600">{strategy.channels.join(', ')}</p>
                    </div>
                  </div>
                  <div className="mt-2">
                    <span className="font-medium text-gray-700">Escalation timeline:</span>
                    <p className="text-gray-600 text-sm">{strategy.escalation_timeline}</p>
                  </div>
                </div>
              )) : (
                <p className="text-gray-500 text-center py-8">
                  No collection strategies available. AI recommendations will appear for overdue invoices.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Business Insights */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center">
              <svg className="w-5 h-5 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              Business Intelligence Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {insights.length > 0 ? insights.map((insight, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium">{insight.title}</h3>
                    <Badge className={getImpactBadgeColor(insight.impact)}>
                      {insight.impact.toUpperCase()} IMPACT
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{insight.description}</p>
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <span className="text-xs font-medium text-blue-800">AI Recommendation:</span>
                    <p className="text-sm text-blue-700 mt-1">{insight.recommendation}</p>
                  </div>
                </div>
              )) : (
                <div className="col-span-2">
                  <p className="text-gray-500 text-center py-8">
                    No business insights available. AI will analyze your data to generate actionable recommendations.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>AI Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prediction Confidence Threshold
              </label>
              <select className="w-full border border-gray-300 rounded-md px-3 py-2">
                <option value="0.5">50% - Show all predictions</option>
                <option value="0.7" selected>70% - Show high confidence</option>
                <option value="0.9">90% - Show only very high confidence</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Collection Strategy Aggressiveness
              </label>
              <select className="w-full border border-gray-300 rounded-md px-3 py-2">
                <option value="conservative">Conservative approach</option>
                <option value="balanced" selected>Balanced approach</option>
                <option value="aggressive">Aggressive approach</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Insight Frequency
              </label>
              <select className="w-full border border-gray-300 rounded-md px-3 py-2">
                <option value="daily">Daily insights</option>
                <option value="weekly" selected>Weekly insights</option>
                <option value="monthly">Monthly insights</option>
              </select>
            </div>
          </div>
          <div className="mt-6">
            <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors">
              Update AI Settings
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};