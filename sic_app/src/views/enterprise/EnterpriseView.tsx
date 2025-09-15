import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { EnterpriseLayout } from '../../components/layout/EnterpriseLayout';
import { OrganizationDashboard } from './OrganizationDashboard';
import { AnalyticsDashboard } from './AnalyticsDashboard';
import { SecurityDashboard } from './SecurityDashboard';
import { AIInsightsView } from './AIInsightsView';
import { TeamManagement } from './TeamManagement';

/**
 * Phase 4: Enterprise Scale & AI Intelligence
 *
 * Main enterprise view container that provides routing for all enterprise features:
 * - Multi-tenancy organization management
 * - Advanced analytics and BI dashboards
 * - Enterprise security and compliance
 * - AI-powered insights and predictions
 * - Team collaboration and permissions
 */
export const EnterpriseView: React.FC = () => {
  return (
    <EnterpriseLayout>
      <Routes>
        <Route path="/" element={<Navigate to="/enterprise/dashboard" replace />} />
        <Route path="/dashboard" element={<OrganizationDashboard />} />
        <Route path="/analytics" element={<AnalyticsDashboard />} />
        <Route path="/security" element={<SecurityDashboard />} />
        <Route path="/ai-insights" element={<AIInsightsView />} />
        <Route path="/teams" element={<TeamManagement />} />
      </Routes>
    </EnterpriseLayout>
  );
};