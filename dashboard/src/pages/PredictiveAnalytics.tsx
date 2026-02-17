import React, { useState, useEffect } from 'react';

interface HistoricalData {
  metric: string;
  period: string;
  data: { date: string; value: number }[];
  statistics: {
    total: number;
    average: number;
    max: number;
    min: number;
    trend: string;
    trendSlope: number;
  };
}

interface ForecastData {
  metric: string;
  historical: {
    average: number;
    trend: string;
    trendPercent: number;
    standardDeviation: number;
  };
  forecast: { date: string; predicted: number; confidence: string }[];
  totalForecast: number;
}

interface FatigueData {
  period: string;
  fatigueIndicators: {
    type: string;
    name?: string;
    template?: string;
    changePercent: number;
    severity: string;
    recommendation: string;
  }[];
  summary: {
    totalIndicators: number;
    highSeverity: number;
    mediumSeverity: number;
  };
  generalRecommendations: string[];
}

interface BudgetData {
  period: string;
  totalLeadsAnalyzed: number;
  sourcePerformance: {
    source: string;
    totalLeads: number;
    hotLeads: number;
    converted: number;
    avgScore: number;
    hotLeadRate: number;
    conversionRate: number;
    efficiencyScore: number;
  }[];
  recommendations: {
    type: string;
    priority: string;
    action: string;
    reason: string;
    potentialImpact: string;
  }[];
  summary: {
    topPerformer: string;
    totalRecommendations: number;
    highPriority: number;
  };
}

const API_BASE = import.meta.env.VITE_API_URL || 'https://webhook.innoserver.cloud';

export default function PredictiveAnalytics() {
  const [historical, setHistorical] = useState<HistoricalData | null>(null);
  const [forecast, setForecast] = useState<ForecastData | null>(null);
  const [fatigue, setFatigue] = useState<FatigueData | null>(null);
  const [budget, setBudget] = useState<BudgetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState('leads');
  const [forecastDays, setForecastDays] = useState(7);

  useEffect(() => {
    fetchData();
  }, [selectedMetric, forecastDays]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [histRes, forecastRes, fatigueRes, budgetRes] = await Promise.all([
        fetch(`${API_BASE}/api/analytics/historical?metric=${selectedMetric}&days=30`),
        fetch(`${API_BASE}/api/analytics/forecast?metric=${selectedMetric}&forecastDays=${forecastDays}`),
        fetch(`${API_BASE}/api/analytics/fatigue-detection?days=14`),
        fetch(`${API_BASE}/api/analytics/budget-optimization?days=30`)
      ]);
      
      setHistorical(await histRes.json());
      setForecast(await forecastRes.json());
      setFatigue(await fatigueRes.json());
      setBudget(await budgetRes.json());
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    }
    setLoading(false);
  };

  const getTrendIcon = (trend: string) => {
    if (trend === 'increasing') return '↗️';
    if (trend === 'decreasing') return '↘️';
    return '→';
  };

  const getTrendColor = (trend: string) => {
    if (trend === 'increasing') return 'text-green-600';
    if (trend === 'decreasing') return 'text-red-600';
    return 'text-gray-600';
  };

  const getSeverityColor = (severity: string) => {
    if (severity === 'high') return 'bg-red-100 text-red-800';
    if (severity === 'medium') return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority: string) => {
    if (priority === 'high') return 'bg-red-100 text-red-800 border-red-200';
    if (priority === 'medium') return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">Loading predictive analytics...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Predictive Analytics</h1>
        <div className="flex gap-4">
          <select
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value)}
            className="border rounded px-3 py-2"
          >
            <option value="leads">Leads</option>
            <option value="emails">Emails</option>
            <option value="conversations">Conversations</option>
            <option value="messages">Messages</option>
          </select>
          <select
            value={forecastDays}
            onChange={(e) => setForecastDays(Number(e.target.value))}
            className="border rounded px-3 py-2"
          >
            <option value={7}>7 Day Forecast</option>
            <option value={14}>14 Day Forecast</option>
            <option value={30}>30 Day Forecast</option>
          </select>
        </div>
      </div>

      {/* Statistics Cards */}
      {historical && (
        <div className="grid grid-cols-5 gap-4">
          <div className="bg-white p-4 rounded-lg shadow text-center">
            <div className="text-2xl font-bold text-purple-600">{historical.statistics.total}</div>
            <div className="text-sm text-gray-500">Total (30d)</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow text-center">
            <div className="text-2xl font-bold text-purple-600">{historical.statistics.average.toFixed(1)}</div>
            <div className="text-sm text-gray-500">Daily Avg</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow text-center">
            <div className="text-2xl font-bold text-green-600">{historical.statistics.max}</div>
            <div className="text-sm text-gray-500">Peak Day</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow text-center">
            <div className="text-2xl font-bold text-gray-600">{historical.statistics.min}</div>
            <div className="text-sm text-gray-500">Low Day</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow text-center">
            <div className={`text-2xl font-bold ${getTrendColor(historical.statistics.trend)}`}>
              {getTrendIcon(historical.statistics.trend)} {historical.statistics.trend}
            </div>
            <div className="text-sm text-gray-500">Trend</div>
          </div>
        </div>
      )}

      {/* Historical Chart (simplified bar representation) */}
      {historical && historical.data.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-4">Historical Performance (30 Days)</h3>
          <div className="flex items-end gap-1 h-40">
            {historical.data.map((d, i) => {
              const maxVal = Math.max(...historical.data.map(x => x.value), 1);
              const height = (d.value / maxVal) * 100;
              return (
                <div
                  key={i}
                  className="flex-1 bg-purple-500 rounded-t hover:bg-purple-600 transition-colors"
                  style={{ height: `${height}%`, minHeight: d.value > 0 ? '4px' : '0' }}
                  title={`${d.date}: ${d.value}`}
                />
              );
            })}
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-500">
            <span>{historical.data[0]?.date}</span>
            <span>{historical.data[historical.data.length - 1]?.date}</span>
          </div>
        </div>
      )}

      {/* Forecast */}
      {forecast && (
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">Forecast ({forecastDays} Days)</h3>
            <div className="text-sm text-gray-500">
              Expected total: <span className="font-bold text-purple-600">{forecast.totalForecast}</span>
            </div>
          </div>
          
          <div className="mb-4 p-4 bg-purple-50 rounded">
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-lg font-bold">{forecast.historical.average.toFixed(1)}</div>
                <div className="text-xs text-gray-500">Current Avg</div>
              </div>
              <div>
                <div className={`text-lg font-bold ${getTrendColor(forecast.historical.trend)}`}>
                  {forecast.historical.trendPercent > 0 ? '+' : ''}{forecast.historical.trendPercent}%
                </div>
                <div className="text-xs text-gray-500">Weekly Trend</div>
              </div>
              <div>
                <div className="text-lg font-bold">{forecast.historical.standardDeviation.toFixed(1)}</div>
                <div className="text-xs text-gray-500">Std Dev</div>
              </div>
              <div>
                <div className="text-lg font-bold capitalize">{forecast.historical.trend}</div>
                <div className="text-xs text-gray-500">Direction</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {forecast.forecast.map((f, i) => (
              <div key={i} className="text-center p-3 bg-gray-50 rounded">
                <div className="text-xs text-gray-500">{new Date(f.date).toLocaleDateString('en-US', { weekday: 'short' })}</div>
                <div className="text-lg font-bold text-purple-600">{f.predicted}</div>
                <div className="text-xs text-gray-400">{f.confidence}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Creative Fatigue Detection */}
      {fatigue && (
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">Creative Fatigue Detection</h3>
            <div className="flex gap-2">
              {fatigue.summary.highSeverity > 0 && (
                <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-sm">
                  {fatigue.summary.highSeverity} High
                </span>
              )}
              {fatigue.summary.mediumSeverity > 0 && (
                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-sm">
                  {fatigue.summary.mediumSeverity} Medium
                </span>
              )}
              {fatigue.summary.totalIndicators === 0 && (
                <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm">
                  All Clear
                </span>
              )}
            </div>
          </div>

          {fatigue.fatigueIndicators.length > 0 ? (
            <div className="space-y-3">
              {fatigue.fatigueIndicators.map((ind, i) => (
                <div key={i} className={`p-4 rounded border ${getSeverityColor(ind.severity)}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-medium capitalize">{ind.type.replace('_', ' ')}</span>
                      {ind.name && <span className="ml-2 text-gray-600">— {ind.name}</span>}
                      {ind.template && <span className="ml-2 text-gray-600">— {ind.template}</span>}
                    </div>
                    <span className="text-red-600 font-bold">{ind.changePercent}%</span>
                  </div>
                  <p className="text-sm mt-2">{ind.recommendation}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500">
              <p className="text-lg">No fatigue detected</p>
              <p className="text-sm mt-1">{fatigue.generalRecommendations[0]}</p>
            </div>
          )}
        </div>
      )}

      {/* Budget Optimization */}
      {budget && (
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">Budget Optimization</h3>
            <span className="text-sm text-gray-500">{budget.totalLeadsAnalyzed} leads analyzed</span>
          </div>

          {/* Source Performance Table */}
          {budget.sourcePerformance.length > 0 && (
            <div className="mb-6 overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Leads</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Hot</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Converted</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Conv %</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Efficiency</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {budget.sourcePerformance.map((src, i) => (
                    <tr key={i} className={i === 0 ? 'bg-green-50' : ''}>
                      <td className="px-4 py-2 text-sm font-medium">
                        {src.source}
                        {i === 0 && <span className="ml-2 text-xs text-green-600">TOP</span>}
                      </td>
                      <td className="px-4 py-2 text-sm text-right">{src.totalLeads}</td>
                      <td className="px-4 py-2 text-sm text-right">{src.hotLeads}</td>
                      <td className="px-4 py-2 text-sm text-right">{src.converted}</td>
                      <td className="px-4 py-2 text-sm text-right">{src.conversionRate}%</td>
                      <td className="px-4 py-2 text-sm text-right font-bold text-purple-600">{src.efficiencyScore}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Recommendations */}
          {budget.recommendations.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-gray-700">Recommendations</h4>
              {budget.recommendations.map((rec, i) => (
                <div key={i} className={`p-4 rounded border ${getPriorityColor(rec.priority)}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-medium">{rec.action}</span>
                      <p className="text-sm mt-1">{rec.reason}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded uppercase font-medium ${
                      rec.priority === 'high' ? 'bg-red-200' : 'bg-yellow-200'
                    }`}>
                      {rec.priority}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">Impact: {rec.potentialImpact}</p>
                </div>
              ))}
            </div>
          )}

          {budget.recommendations.length === 0 && budget.sourcePerformance.length === 0 && (
            <div className="text-center py-6 text-gray-500">
              Not enough data for budget optimization recommendations
            </div>
          )}
        </div>
      )}
    </div>
  );
}
