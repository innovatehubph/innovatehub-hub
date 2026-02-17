import { useState } from 'react';

const API_BASE = 'https://webhook.innoserver.cloud';

const SCENE_PRESETS = [
  { id: 'ofw_remittance', name: 'OFW Remittance', description: 'Family receiving money from abroad', emotion: 'hope, gratitude' },
  { id: 'rural_queue', name: 'Rural Queue', description: 'Provincial residents at PlataPay outlet', emotion: 'trust, accessibility' },
  { id: 'school_students', name: 'School Students', description: 'Students paying tuition or buying load', emotion: 'convenience, youth' },
  { id: 'market_vendors', name: 'Market Vendors', description: 'Vendors depositing daily earnings', emotion: 'productivity, empowerment' },
  { id: 'agent_success', name: 'Agent Success', description: 'Proud outlet owner with customers', emotion: 'pride, entrepreneurship' },
  { id: 'senior_citizen', name: 'Senior Citizen', description: 'Elderly receiving pension', emotion: 'care, dignity' },
  { id: 'motorcycle_delivery', name: 'Delivery Rider', description: 'Rider cashing out earnings', emotion: 'freedom, hustle' },
  { id: 'fiesta_celebration', name: 'Fiesta', description: 'Town fiesta payments', emotion: 'joy, community' },
  { id: 'micro_business', name: 'Sari-sari Store', description: 'Store with PlataPay integration', emotion: 'growth, opportunity' },
  { id: 'tech_savvy_youth', name: 'Tech-Savvy Youth', description: 'Young professionals using app', emotion: 'modern, digital' },
];

interface GeneratedImage {
  url: string;
  publicUrl: string;
  emailUrl: string;
  scene: string;
  timestamp: string;
  cost?: number;
}

export default function ImageGenerator() {
  const [selectedScene, setSelectedScene] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [error, setError] = useState('');
  
  // Email form
  const [emailTo, setEmailTo] = useState('');
  const [emailSubject, setEmailSubject] = useState('Start Your Own PlataPay Outlet – Earn Up to ₱50,000/Month');
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [emailStatus, setEmailStatus] = useState('');

  const generateImage = async () => {
    if (!selectedScene && !customPrompt) {
      setError('Please select a scene or enter a custom prompt');
      return;
    }
    
    setIsGenerating(true);
    setError('');
    
    try {
      let response;
      if (selectedScene) {
        response = await fetch(`${API_BASE}/api/platapay/generate-scene`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scene: selectedScene }),
        });
      } else {
        response = await fetch(`${API_BASE}/api/platapay/generate-image`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: customPrompt }),
        });
      }
      
      const data = await response.json();
      
      if (data.success) {
        const newImage: GeneratedImage = {
          url: data.url,
          publicUrl: data.publicUrl,
          emailUrl: data.emailUrl || data.publicUrl,
          scene: selectedScene || 'custom',
          timestamp: data.timestamp,
          cost: data.cost,
        };
        setGeneratedImages([newImage, ...generatedImages]);
        setSelectedImage(newImage);
      } else {
        setError(data.error || 'Failed to generate image');
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setIsGenerating(false);
    }
  };

  const sendEmail = async () => {
    if (!emailTo || !selectedImage) {
      setError('Please enter email and select an image');
      return;
    }
    
    setIsSending(true);
    setEmailStatus('');
    
    try {
      const emails = emailTo.split(',').map(e => e.trim());
      
      for (const email of emails) {
        const response = await fetch(`${API_BASE}/api/send-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: email,
            subject: emailSubject,
            template: 'agent_recruitment',
            data: {
              heroImage: selectedImage.publicUrl,
              preheader: 'Be your own boss. Join 500+ successful PlataPay agents nationwide.',
            },
          }),
        });
        
        const data = await response.json();
        if (!data.success) {
          throw new Error(data.error || `Failed to send to ${email}`);
        }
      }
      
      setEmailStatus(`✅ Sent to ${emails.length} recipient(s)`);
      setEmailTo('');
    } catch (err: any) {
      setEmailStatus(`❌ Error: ${err.message}`);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">🎨 AI Image Generator</h1>
        <p className="text-gray-600 mt-2">Generate marketing images for PlataPay campaigns using GPT-5 Image</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column - Generator */}
        <div className="space-y-6">
          {/* Scene Selection */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-lg font-semibold mb-4">📸 Select Scene</h2>
            <div className="grid grid-cols-2 gap-3">
              {SCENE_PRESETS.map((scene) => (
                <button
                  key={scene.id}
                  onClick={() => { setSelectedScene(scene.id); setCustomPrompt(''); }}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    selectedScene === scene.id
                      ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-200'
                      : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="font-medium text-sm">{scene.name}</div>
                  <div className="text-xs text-gray-500 mt-1">{scene.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Prompt */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-lg font-semibold mb-4">✏️ Or Custom Prompt</h2>
            <textarea
              value={customPrompt}
              onChange={(e) => { setCustomPrompt(e.target.value); setSelectedScene(''); }}
              placeholder="Describe your ideal PlataPay marketing image..."
              className="w-full h-24 p-3 border rounded-lg resize-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>

          {/* Generate Button */}
          <button
            onClick={generateImage}
            disabled={isGenerating || (!selectedScene && !customPrompt)}
            className="w-full py-4 bg-purple-600 text-white font-semibold rounded-xl hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {isGenerating ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Generating (~30-60s)...
              </span>
            ) : (
              '🚀 Generate Image'
            )}
          </button>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}
        </div>

        {/* Right Column - Preview & Email */}
        <div className="space-y-6">
          {/* Image Preview */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-lg font-semibold mb-4">🖼️ Preview</h2>
            {selectedImage ? (
              <div>
                <img
                  src={selectedImage.publicUrl}
                  alt="Generated"
                  className="w-full rounded-lg border"
                />
                <div className="mt-3 flex gap-2">
                  <a
                    href={selectedImage.publicUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-purple-600 hover:underline"
                  >
                    Open Full Size ↗
                  </a>
                  {selectedImage.cost && (
                    <span className="text-sm text-gray-500">
                      Cost: ${selectedImage.cost.toFixed(4)}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
                Generated image will appear here
              </div>
            )}
          </div>

          {/* Email Form */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-lg font-semibold mb-4">📧 Send Marketing Email</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Recipients (comma-separated)
                </label>
                <input
                  type="text"
                  value={emailTo}
                  onChange={(e) => setEmailTo(e.target.value)}
                  placeholder="email1@example.com, email2@example.com"
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subject
                </label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <button
                onClick={sendEmail}
                disabled={isSending || !selectedImage || !emailTo}
                className="w-full py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {isSending ? 'Sending...' : '📤 Send Email with Image'}
              </button>
              {emailStatus && (
                <div className={`p-3 rounded-lg text-sm ${
                  emailStatus.includes('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                }`}>
                  {emailStatus}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Generated Images Gallery */}
      {generatedImages.length > 0 && (
        <div className="mt-8 bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-semibold mb-4">🎨 Generated Images ({generatedImages.length})</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {generatedImages.map((img, idx) => (
              <div
                key={idx}
                onClick={() => setSelectedImage(img)}
                className={`cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                  selectedImage?.url === img.url ? 'border-purple-500 ring-2 ring-purple-200' : 'border-transparent hover:border-purple-300'
                }`}
              >
                <img src={img.emailUrl || img.publicUrl} alt={`Generated ${idx + 1}`} className="w-full h-32 object-cover" />
                <div className="p-2 bg-gray-50 text-xs text-gray-600">
                  {img.scene || 'custom'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
