import React, { useEffect, useState } from 'react';
import { fetchDashboardData } from '../../utils/admin/api';
import { getUserJourneyMetrics } from '../../utils/analytics/admin/user-journey';
import { getRevenueMetrics } from '../../utils/analytics/admin/revenue';
import { getBusinessInsights } from '../../utils/analytics/admin/business';
import { AlertCircle, BarChart2 } from 'lucide-react';
import { MetricsOverview } from './MetricsOverview';
import { UserJourneyPanel } from './UserJourneyPanel';
import { RevenueAnalysis } from './RevenueAnalysis';
import { BusinessInsightsPanel } from './BusinessInsightsPanel';
import { RequestsMonitor } from './RequestsMonitor';
import { ErrorsPanel } from './ErrorsPanel';

export const AdminDashboard: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [
          dashboardData,
          journeyMetrics,
          revenueMetrics,
          businessInsights
        ] = await Promise.all([
          fetchDashboardData(),
          getUserJourneyMetrics(),
          getRevenueMetrics(),
          getBusinessInsights()
        ]);

        setData({
          ...dashboardData,
          journeyMetrics,
          revenueMetrics,
          businessInsights
        });
        setError(null);
      } catch (err) {
        setError('Failed to load dashboard data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
    const interval = setInterval(loadData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow p-6">
          <div className="flex items-center text-red-600 mb-4">
            <AlertCircle className="h-6 w-6 mr-2" />
            <h2 className="text-lg font-semibold">Error Loading Dashboard</h2>
          </div>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Analysis Dashboard</h1>
          <div className="flex items-center text-sm text-gray-500">
            <BarChart2 className="h-4 w-4 mr-1" />
            Last updated: {new Date().toLocaleTimeString()}
          </div>
        </div>

        {/* Overview Metrics */}
        <MetricsOverview metrics={data.stats} />

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* User Journey Analysis */}
          <UserJourneyPanel metrics={data.journeyMetrics} />
          
          {/* Revenue Analysis */}
          <RevenueAnalysis metrics={data.revenueMetrics} />
          
          {/* Business Insights */}
          <BusinessInsightsPanel insights={data.businessInsights} />
          
          {/* Requests Monitor */}
          <RequestsMonitor stats={data.stats} />
        </div>

        {/* Errors Panel */}
        {data.errors.length > 0 && (
          <ErrorsPanel errors={data.errors} />
        )}
      </div>
    </div>
  );
};