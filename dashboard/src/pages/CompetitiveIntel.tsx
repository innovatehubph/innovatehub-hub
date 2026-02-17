import React, { useState, useEffect } from 'react';

interface Competitor {
  id: string;
  name: string;
  facebookPageName: string;
  website: string;
  keywords: string[];
  industry: string;
  lastScannedAt: string | null;
  createdAt: string;
}

interface CompetitorAd {
  id: string;
  competitorName: string;
  platform: string;
  adType: string;
  headline: string;
  bodyText: string;
  ctaText: string;
  landingUrl: string;
  aiAnalysis: any;
  createdAt: string;
}

const API_BASE = import.meta.env.VITE_API_URL || 'https://webhook.innoserver.cloud';

export default function CompetitiveIntel() {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [ads, setAds] = useState<CompetitorAd[]>([]);
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'competitors' | 'ads' | 'report'>('competitors');
  
  // New competitor form
  const [newCompetitor, setNewCompetitor] = useState({
    name: '',
    facebookPageName: '',
    website: '',
    keywords: '',
    industry: 'fintech'
  });

  // New ad form
  const [newAd, setNewAd] = useState({
    competitorId: '',
    platform: 'facebook',
    adType: 'image',
    headline: '',
    bodyText: '',
    ctaText: '',
    landingUrl: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [compRes, adsRes, reportRes] = await Promise.all([
        fetch(`${API_BASE}/api/competitors`),
        fetch(`${API_BASE}/api/competitor-ads?limit=20`),
        fetch(`${API_BASE}/api/competitive-report?days=30`)
      ]);
      
      const compData = await compRes.json();
      const adsData = await adsRes.json();
      const reportData = await reportRes.json();
      
      setCompetitors(compData.competitors || []);
      setAds(adsData.ads || []);
      setReport(reportData);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    }
    setLoading(false);
  };

  const addCompetitor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/api/competitors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newCompetitor,
          keywords: newCompetitor.keywords.split(',').map(k => k.trim()).filter(Boolean)
        })
      });
      if (res.ok) {
        setNewCompetitor({ name: '', facebookPageName: '', website: '', keywords: '', industry: 'fintech' });
        fetchData();
      }
    } catch (err) {
      console.error('Failed to add competitor:', err);
    }
  };

  const addAd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/api/competitor-ads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAd)
      });
      if (res.ok) {
        setNewAd({ competitorId: '', platform: 'facebook', adType: 'image', headline: '', bodyText: '', ctaText: '', landingUrl: '' });
        fetchData();
      }
    } catch (err) {
      console.error('Failed to add ad:', err);
    }
  };

  const analyzeAd = async (adId: string) => {
    try {
      await fetch(`${API_BASE}/api/competitor-ads/${adId}/analyze`, { method: 'POST' });
      fetchData();
    } catch (err) {
      console.error('Failed to analyze ad:', err);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">Loading competitive intelligence...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Competitive Intelligence</h1>
        <span className="text-sm text-gray-500">{competitors.length} competitors tracked</span>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {(['competitors', 'ads', 'report'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-2 px-1 border-b-2 font-medium text-sm capitalize ${
                activeTab === tab
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'ads' ? 'Competitor Ads' : tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Competitors Tab */}
      {activeTab === 'competitors' && (
        <div className="space-y-6">
          {/* Add Competitor Form */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium mb-4">Add Competitor</h3>
            <form onSubmit={addCompetitor} className="grid grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Company Name"
                value={newCompetitor.name}
                onChange={(e) => setNewCompetitor({ ...newCompetitor, name: e.target.value })}
                className="border rounded px-3 py-2"
                required
              />
              <input
                type="text"
                placeholder="Facebook Page Name"
                value={newCompetitor.facebookPageName}
                onChange={(e) => setNewCompetitor({ ...newCompetitor, facebookPageName: e.target.value })}
                className="border rounded px-3 py-2"
              />
              <input
                type="url"
                placeholder="Website URL"
                value={newCompetitor.website}
                onChange={(e) => setNewCompetitor({ ...newCompetitor, website: e.target.value })}
                className="border rounded px-3 py-2"
              />
              <input
                type="text"
                placeholder="Keywords (comma-separated)"
                value={newCompetitor.keywords}
                onChange={(e) => setNewCompetitor({ ...newCompetitor, keywords: e.target.value })}
                className="border rounded px-3 py-2"
              />
              <button type="submit" className="col-span-2 bg-purple-600 text-white py-2 rounded hover:bg-purple-700">
                Add Competitor
              </button>
            </form>
          </div>

          {/* Competitors List */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Facebook</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Keywords</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Added</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {competitors.map((comp) => (
                  <tr key={comp.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{comp.name}</div>
                      {comp.website && (
                        <a href={comp.website} target="_blank" rel="noopener noreferrer" className="text-sm text-purple-600 hover:underline">
                          {comp.website}
                        </a>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {comp.facebookPageName || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {comp.keywords?.map((kw, i) => (
                          <span key={i} className="px-2 py-1 text-xs bg-gray-100 rounded">{kw}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(comp.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Ads Tab */}
      {activeTab === 'ads' && (
        <div className="space-y-6">
          {/* Add Ad Form */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium mb-4">Add Competitor Ad</h3>
            <form onSubmit={addAd} className="grid grid-cols-2 gap-4">
              <select
                value={newAd.competitorId}
                onChange={(e) => setNewAd({ ...newAd, competitorId: e.target.value })}
                className="border rounded px-3 py-2"
                required
              >
                <option value="">Select Competitor</option>
                {competitors.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <select
                value={newAd.platform}
                onChange={(e) => setNewAd({ ...newAd, platform: e.target.value })}
                className="border rounded px-3 py-2"
              >
                <option value="facebook">Facebook</option>
                <option value="instagram">Instagram</option>
                <option value="tiktok">TikTok</option>
                <option value="youtube">YouTube</option>
              </select>
              <input
                type="text"
                placeholder="Headline"
                value={newAd.headline}
                onChange={(e) => setNewAd({ ...newAd, headline: e.target.value })}
                className="border rounded px-3 py-2 col-span-2"
              />
              <textarea
                placeholder="Body Text"
                value={newAd.bodyText}
                onChange={(e) => setNewAd({ ...newAd, bodyText: e.target.value })}
                className="border rounded px-3 py-2 col-span-2"
                rows={3}
              />
              <input
                type="text"
                placeholder="CTA Text"
                value={newAd.ctaText}
                onChange={(e) => setNewAd({ ...newAd, ctaText: e.target.value })}
                className="border rounded px-3 py-2"
              />
              <input
                type="url"
                placeholder="Landing URL"
                value={newAd.landingUrl}
                onChange={(e) => setNewAd({ ...newAd, landingUrl: e.target.value })}
                className="border rounded px-3 py-2"
              />
              <button type="submit" className="col-span-2 bg-purple-600 text-white py-2 rounded hover:bg-purple-700">
                Add Ad
              </button>
            </form>
          </div>

          {/* Ads List */}
          <div className="grid gap-4">
            {ads.map((ad) => (
              <div key={ad.id} className="bg-white p-6 rounded-lg shadow">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="text-sm font-medium text-purple-600">{ad.competitorName}</span>
                    <span className="mx-2 text-gray-300">|</span>
                    <span className="text-sm text-gray-500 capitalize">{ad.platform}</span>
                  </div>
                  <button
                    onClick={() => analyzeAd(ad.id)}
                    className="text-sm bg-purple-100 text-purple-700 px-3 py-1 rounded hover:bg-purple-200"
                  >
                    Analyze with AI
                  </button>
                </div>
                {ad.headline && <h4 className="font-medium text-lg mb-2">{ad.headline}</h4>}
                {ad.bodyText && <p className="text-gray-600 mb-3">{ad.bodyText}</p>}
                {ad.ctaText && (
                  <span className="inline-block bg-green-100 text-green-800 px-3 py-1 rounded text-sm">
                    {ad.ctaText}
                  </span>
                )}
                {ad.aiAnalysis && (
                  <div className="mt-4 p-4 bg-purple-50 rounded">
                    <h5 className="font-medium text-purple-800 mb-2">AI Analysis</h5>
                    <div className="text-sm space-y-1">
                      {ad.aiAnalysis.targetAudience && (
                        <p><strong>Target:</strong> {ad.aiAnalysis.targetAudience}</p>
                      )}
                      {ad.aiAnalysis.keyMessages && (
                        <p><strong>Messages:</strong> {ad.aiAnalysis.keyMessages.join(', ')}</p>
                      )}
                      {ad.aiAnalysis.recommendedCounterStrategy && (
                        <p><strong>Counter Strategy:</strong> {ad.aiAnalysis.recommendedCounterStrategy}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
            {ads.length === 0 && (
              <div className="text-center py-8 text-gray-500">No competitor ads tracked yet</div>
            )}
          </div>
        </div>
      )}

      {/* Report Tab */}
      {activeTab === 'report' && report && (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white p-6 rounded-lg shadow text-center">
              <div className="text-3xl font-bold text-purple-600">{report.summary?.totalCompetitors || 0}</div>
              <div className="text-sm text-gray-500">Competitors Tracked</div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow text-center">
              <div className="text-3xl font-bold text-purple-600">{report.summary?.totalAdsTracked || 0}</div>
              <div className="text-sm text-gray-500">Ads Collected</div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow text-center">
              <div className="text-3xl font-bold text-purple-600">{report.summary?.adsAnalyzed || 0}</div>
              <div className="text-sm text-gray-500">Ads Analyzed</div>
            </div>
          </div>

          {report.topCompetitorMessages?.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium mb-4">Top Competitor Messages</h3>
              <div className="space-y-2">
                {report.topCompetitorMessages.map((msg: any, i: number) => (
                  <div key={i} className="flex justify-between items-center py-2 border-b">
                    <span className="text-gray-700">{msg.message}</span>
                    <span className="text-sm text-gray-500">{msg.count}x</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {report.recommendations?.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium mb-4">Recommendations</h3>
              <ul className="space-y-2">
                {report.recommendations.map((rec: string, i: number) => (
                  <li key={i} className="flex items-start">
                    <span className="text-purple-600 mr-2">•</span>
                    <span className="text-gray-700">{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
