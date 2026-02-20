/**
 * Google Maps Business Leads Scraper
 * Finds potential PlataPay agents: sari-sari stores, payment centers, 
 * convenience stores, remittance centers, etc.
 * 
 * Uses Google Places API (requires API key) or SerpAPI as fallback
 */

const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// Import regional sheets integration
let mapsLeadsIntegration;
try {
  mapsLeadsIntegration = require('./maps-leads-integration');
} catch (err) {
  console.log('[Maps] maps-leads-integration not available');
}

// Configuration
const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY || '';
const SERPAPI_KEY = process.env.SERPAPI_KEY || '';
const LEADS_SHEET_ID = '1tJMLWrGUkraYERwAOeJ6l1WfSfOZ0C9CK1OajeQh0kA';

// Business types to search for potential PlataPay agents (small scale)
const TARGET_BUSINESS_TYPES = [
  'sari-sari store',
  'convenience store',
  'payment center',
  'bills payment',
  'remittance center',
  'pawnshop',
  'loading station',
  'internet cafe',
  'computer shop',
  'grocery store',
  'variety store',
  'general merchandise'
];

// FRANCHISE PACKAGE - Bigger, established businesses (higher investment capacity)
// EXCLUDES: Payment centers, remittance, banks (competitors), sari-sari stores (too small)
const FRANCHISE_BUSINESS_TYPES = [
  // Retail & Commerce (PRIMARY TARGETS)
  'pharmacy drugstore',
  'hardware store',
  'supermarket grocery',
  'department store',
  'appliance center',
  'electronics store',
  'furniture store',
  'auto supply shop',
  
  // Services (NO banks/financial - they're competitors)
  'insurance agency',
  'real estate office',
  'travel agency',
  'printing press',
  'computer shop internet cafe',
  
  // Food & Hospitality
  'restaurant',
  'hotel inn',
  'resort',
  'bakery',
  
  // Agricultural & Industrial
  'rice dealer',
  'agricultural supply',
  'feed store',
  'construction supply',
  'building materials',
  
  // Professional Services
  'medical clinic',
  'dental clinic',
  'veterinary clinic',
  'optical shop',
  'water refilling station'
];

// Qualification criteria for franchise leads
const FRANCHISE_QUALIFIERS = {
  minRating: 3.5,           // Minimum Google rating
  minReviews: 5,            // Minimum review count (indicates established business)
  maxReviews: 500,          // Cap reviews - too many = corporate chain
  preferWebsite: true,      // Prioritize businesses with websites
  preferEmail: true,        // Prioritize businesses with contact email
  excludeKeywords: [        // Filter out small operations
    'sari-sari', 'sari sari', 'sarisari',
    'carinderia', 'karinderya', 'carenderia',
    'tindahan', 'tingi', 'retail store',
    'small', 'mini', 'mobile', 'stall', 'kiosk', 'booth',
    'ambulant', 'sidewalk', 'palengke',
    'variety store', 'general merchandise'
  ],
  excludeChains: [          // Filter out big corporate chains (they have their own systems)
    // Major Retail Chains
    'sm ', 'sm supermarket', 'sm hypermarket', 'sm savemore', 'savemore',
    'robinsons', 'robinsons supermarket', 'robinsons mall',
    'puregold', 'puregold price club', 's&r', 'snr',
    'walter mart', 'waltermart', 'ever gotesco', 'landmark',
    'metro gaisano', 'gaisano', 'nccc', 'rustans', "rustan's",
    'shopwise', 'super8', 'super 8', 'cherry foodarama',
    
    // Hardware Chains
    'ace hardware', 'cw home depot', 'wilcon', 'handyman',
    'true value', 'our home', 'all home', 'allhome',
    
    // Pharmacy Chains
    'mercury drug', 'watsons', 'southstar drug', 'rose pharmacy',
    'generika', 'the generics pharmacy', 'tgp',
    
    // Convenience Store & Grocery Chains (ALL - including local chains)
    '7-eleven', '7 eleven', '7eleven', 'ministop', 'family mart', 'familymart',
    'lawson', 'alfamart', 'circle k', 'allday', 'all day',
    
    // Local Grocery Chains (Batangas/CALABARZON)
    'dali', 'dali everyday', 'dali grocery',
    'prince warehouse', 'prince hypermart',
    'super8', 'super 8', 'superama',
    'citimall', 'citimart', 'citi mart',
    'isetann', 'ever gotesco', 'gotesco',
    '168 mall', '168 shopping',
    'one stop shop', 'onestop',
    
    // Appliance/Electronics Chains
    'abenson', 'ansons', 'automatic centre', 'automatic center',
    'emcor', 'western appliances', 'asian home appliances',
    'octagon', 'pc express', 'pcx', 'complink', 'villman',
    'digital walker', 'beyond the box', 'power mac',
    
    // Furniture Chains
    'mandaue foam', 'our home', 'sm home', 'index living',
    'blims', 'dimensione', 'sogo', 'uratex',
    
    // Hardware Chains (add more)
    'citi hardware', 'citihardware',
    
    // Home Along (local chain)
    'home along',
    
    // Gas Station Chains
    'petron', 'shell', 'caltex', 'phoenix', 'seaoil', 'total', 'ptt',
    'flying v', 'unioil', 'jetti', 'cleanfuel',
    
    // Fast Food / Restaurant Chains
    'jollibee', 'mcdonalds', "mcdonald's", 'kfc', 'chowking',
    'mang inasal', 'greenwich', 'red ribbon', 'goldilocks',
    'starbucks', 'dunkin', "dunkin'", 'tim hortons',
    
    // Bank Branches (already have financial services)
    'bdo', 'bpi', 'metrobank', 'landbank', 'pnb', 'rcbc', 'unionbank',
    'security bank', 'eastwest', 'chinabank', 'psbank', 'robinsons bank',
    
    // Pawnshop Chains (competitors)
    'cebuana', 'cebuana lhuillier', 'palawan pawnshop', 'palawan express',
    'm lhuillier', 'mlhuillier', 'villarica', 'h lhuillier',
    
    // Remittance Chains (competitors)
    'western union', 'moneygram', 'xoom', 'remitly', 'wise',
    
    // ALL Payment Centers & Remittance (COMPETITORS - exclude ALL)
    'payment center', 'payment centre', 'bills payment', 'bayad center', 'bayad',
    'remittance', 'padala', 'pera padala', 'money transfer',
    'gcash', 'paymaya', 'maya', 'coins.ph', 'grabpay',
    'smart padala', 'touch mobile', 'load central', 'loadcentral',
    'ecpay', 'cliqq', 'expresspay', 'posible', 'dragonpay',
    
    // Courier & Logistics (not retail businesses)
    'lbc', 'lbc express', 'jrs express', 'j&t', 'j&t express', 'jtexpress',
    'ninja van', 'ninjavan', 'lazada', 'shopee', 'grab express',
    'lalamove', 'transportify', 'mrspeedy', 'borzo', 'flash express',
    'dhl', 'fedex', 'ups', 'air21', '2go',
    
    // Rural Banks (already have payment services)
    'rural bank', 'cooperative bank', 'savings bank', 'thrift bank',
    
    // Loading Stations (too small, similar to sari-sari)
    'loading station', 'load station', 'e-load', 'eload'
  ]
};

// Philippine locations to search - Comprehensive list with barangay-level coverage
const PHILIPPINE_LOCATIONS = {
  // === NCR (Metro Manila) ===
  'manila': { lat: 14.5995, lng: 120.9842, name: 'Manila', region: 'NCR' },
  'quezon_city': { lat: 14.6760, lng: 121.0437, name: 'Quezon City', region: 'NCR' },
  'makati': { lat: 14.5547, lng: 121.0244, name: 'Makati', region: 'NCR' },
  'pasig': { lat: 14.5764, lng: 121.0851, name: 'Pasig', region: 'NCR' },
  'taguig': { lat: 14.5176, lng: 121.0509, name: 'Taguig', region: 'NCR' },
  'mandaluyong': { lat: 14.5794, lng: 121.0359, name: 'Mandaluyong', region: 'NCR' },
  'paranaque': { lat: 14.4793, lng: 121.0198, name: 'Parañaque', region: 'NCR' },
  'las_pinas': { lat: 14.4445, lng: 120.9939, name: 'Las Piñas', region: 'NCR' },
  'muntinlupa': { lat: 14.4081, lng: 121.0415, name: 'Muntinlupa', region: 'NCR' },
  'marikina': { lat: 14.6507, lng: 121.1029, name: 'Marikina', region: 'NCR' },
  'san_juan': { lat: 14.6019, lng: 121.0355, name: 'San Juan', region: 'NCR' },
  'caloocan': { lat: 14.6570, lng: 120.9840, name: 'Caloocan', region: 'NCR' },
  'valenzuela': { lat: 14.7011, lng: 120.9830, name: 'Valenzuela', region: 'NCR' },
  'malabon': { lat: 14.6625, lng: 120.9567, name: 'Malabon', region: 'NCR' },
  'navotas': { lat: 14.6667, lng: 120.9417, name: 'Navotas', region: 'NCR' },
  'pasay': { lat: 14.5500, lng: 121.0000, name: 'Pasay', region: 'NCR' },
  'pateros': { lat: 14.5456, lng: 121.0672, name: 'Pateros', region: 'NCR' },
  
  // === CALABARZON (Region IV-A) ===
  // Batangas
  'batangas_city': { lat: 13.7565, lng: 121.0583, name: 'Batangas City', region: 'IV-A', province: 'Batangas' },
  'lipa': { lat: 13.9411, lng: 121.1632, name: 'Lipa City', region: 'IV-A', province: 'Batangas' },
  'tanauan': { lat: 14.0834, lng: 121.1500, name: 'Tanauan', region: 'IV-A', province: 'Batangas' },
  'san_pascual': { lat: 13.8183, lng: 121.0255, name: 'San Pascual', region: 'IV-A', province: 'Batangas' },
  'bauan': { lat: 13.7911, lng: 121.0097, name: 'Bauan', region: 'IV-A', province: 'Batangas' },
  'nasugbu': { lat: 14.0694, lng: 120.6333, name: 'Nasugbu', region: 'IV-A', province: 'Batangas' },
  'rosario': { lat: 13.8444, lng: 121.2139, name: 'Rosario', region: 'IV-A', province: 'Batangas' },
  'lemery': { lat: 13.8778, lng: 120.9083, name: 'Lemery', region: 'IV-A', province: 'Batangas' },
  'ibaan': { lat: 13.8167, lng: 121.1333, name: 'Ibaan', region: 'IV-A', province: 'Batangas' },
  'padre_garcia': { lat: 13.8792, lng: 121.2167, name: 'Padre Garcia', region: 'IV-A', province: 'Batangas' },
  'malvar': { lat: 14.0417, lng: 121.1583, name: 'Malvar', region: 'IV-A', province: 'Batangas' },
  'sto_tomas': { lat: 14.1083, lng: 121.1417, name: 'Santo Tomas', region: 'IV-A', province: 'Batangas' },
  'taysan': { lat: 13.7583, lng: 121.1333, name: 'Taysan', region: 'IV-A', province: 'Batangas' },
  
  // Laguna
  'calamba': { lat: 14.2117, lng: 121.1653, name: 'Calamba', region: 'IV-A', province: 'Laguna' },
  'san_pedro': { lat: 14.3595, lng: 121.0473, name: 'San Pedro', region: 'IV-A', province: 'Laguna' },
  'binan': { lat: 14.3414, lng: 121.0839, name: 'Biñan', region: 'IV-A', province: 'Laguna' },
  'sta_rosa': { lat: 14.3108, lng: 121.1114, name: 'Santa Rosa', region: 'IV-A', province: 'Laguna' },
  'cabuyao': { lat: 14.2728, lng: 121.1250, name: 'Cabuyao', region: 'IV-A', province: 'Laguna' },
  'los_banos': { lat: 14.1694, lng: 121.2428, name: 'Los Baños', region: 'IV-A', province: 'Laguna' },
  'san_pablo': { lat: 14.0689, lng: 121.3256, name: 'San Pablo City', region: 'IV-A', province: 'Laguna' },
  
  // Cavite
  'bacoor': { lat: 14.4624, lng: 120.9645, name: 'Bacoor', region: 'IV-A', province: 'Cavite' },
  'imus': { lat: 14.4297, lng: 120.9367, name: 'Imus', region: 'IV-A', province: 'Cavite' },
  'dasmarinas': { lat: 14.3294, lng: 120.9367, name: 'Dasmariñas', region: 'IV-A', province: 'Cavite' },
  'general_trias': { lat: 14.3833, lng: 120.8833, name: 'General Trias', region: 'IV-A', province: 'Cavite' },
  'cavite_city': { lat: 14.4833, lng: 120.9000, name: 'Cavite City', region: 'IV-A', province: 'Cavite' },
  'tagaytay': { lat: 14.1000, lng: 120.9333, name: 'Tagaytay', region: 'IV-A', province: 'Cavite' },
  'silang': { lat: 14.2167, lng: 120.9667, name: 'Silang', region: 'IV-A', province: 'Cavite' },
  'trece_martires': { lat: 14.2833, lng: 120.8667, name: 'Trece Martires', region: 'IV-A', province: 'Cavite' },
  
  // Rizal
  'antipolo': { lat: 14.5864, lng: 121.1761, name: 'Antipolo', region: 'IV-A', province: 'Rizal' },
  'taytay': { lat: 14.5656, lng: 121.1356, name: 'Taytay', region: 'IV-A', province: 'Rizal' },
  'cainta': { lat: 14.5778, lng: 121.1222, name: 'Cainta', region: 'IV-A', province: 'Rizal' },
  'binangonan': { lat: 14.4667, lng: 121.1833, name: 'Binangonan', region: 'IV-A', province: 'Rizal' },
  'angono': { lat: 14.5250, lng: 121.1536, name: 'Angono', region: 'IV-A', province: 'Rizal' },
  
  // === Central Luzon (Region III) ===
  'bulacan': { lat: 14.7942, lng: 120.8800, name: 'Malolos', region: 'III', province: 'Bulacan' },
  'meycauayan': { lat: 14.7372, lng: 120.9608, name: 'Meycauayan', region: 'III', province: 'Bulacan' },
  'bocaue': { lat: 14.7992, lng: 120.9297, name: 'Bocaue', region: 'III', province: 'Bulacan' },
  'sta_maria': { lat: 14.8167, lng: 120.9667, name: 'Santa Maria', region: 'III', province: 'Bulacan' },
  'san_jose_del_monte': { lat: 14.8139, lng: 121.0453, name: 'San Jose del Monte', region: 'III', province: 'Bulacan' },
  'pampanga': { lat: 15.0794, lng: 120.6200, name: 'San Fernando', region: 'III', province: 'Pampanga' },
  'angeles': { lat: 15.1450, lng: 120.5887, name: 'Angeles City', region: 'III', province: 'Pampanga' },
  'clark': { lat: 15.1860, lng: 120.5459, name: 'Clark', region: 'III', province: 'Pampanga' },
  'tarlac': { lat: 15.4755, lng: 120.5963, name: 'Tarlac City', region: 'III', province: 'Tarlac' },
  'nueva_ecija': { lat: 15.5833, lng: 120.9667, name: 'Cabanatuan', region: 'III', province: 'Nueva Ecija' },
  'olongapo': { lat: 14.8292, lng: 120.2828, name: 'Olongapo', region: 'III', province: 'Zambales' },
  
  // === Visayas ===
  'cebu': { lat: 10.3157, lng: 123.8854, name: 'Cebu City', region: 'VII', province: 'Cebu' },
  'mandaue': { lat: 10.3236, lng: 123.9222, name: 'Mandaue', region: 'VII', province: 'Cebu' },
  'lapu_lapu': { lat: 10.3103, lng: 123.9494, name: 'Lapu-Lapu', region: 'VII', province: 'Cebu' },
  'talisay_cebu': { lat: 10.2444, lng: 123.8494, name: 'Talisay', region: 'VII', province: 'Cebu' },
  'bacolod': { lat: 10.6840, lng: 122.9563, name: 'Bacolod', region: 'VI', province: 'Negros Occidental' },
  'iloilo': { lat: 10.7202, lng: 122.5621, name: 'Iloilo City', region: 'VI', province: 'Iloilo' },
  'dumaguete': { lat: 9.3068, lng: 123.3054, name: 'Dumaguete', region: 'VII', province: 'Negros Oriental' },
  'tacloban': { lat: 11.2543, lng: 124.9611, name: 'Tacloban', region: 'VIII', province: 'Leyte' },
  
  // === Mindanao ===
  'davao': { lat: 7.1907, lng: 125.4553, name: 'Davao City', region: 'XI', province: 'Davao del Sur' },
  'cagayan_de_oro': { lat: 8.4542, lng: 124.6319, name: 'Cagayan de Oro', region: 'X', province: 'Misamis Oriental' },
  'general_santos': { lat: 6.1164, lng: 125.1716, name: 'General Santos', region: 'XII', province: 'South Cotabato' },
  'zamboanga': { lat: 6.9214, lng: 122.0790, name: 'Zamboanga City', region: 'IX', province: 'Zamboanga del Sur' },
  'butuan': { lat: 8.9475, lng: 125.5406, name: 'Butuan', region: 'XIII', province: 'Agusan del Norte' },
  'cotabato': { lat: 7.2236, lng: 124.2464, name: 'Cotabato City', region: 'BARMM' },
  'iligan': { lat: 8.2289, lng: 124.2452, name: 'Iligan City', region: 'X', province: 'Lanao del Norte' },
  
  // === Northern Luzon ===
  'baguio': { lat: 16.4023, lng: 120.5960, name: 'Baguio City', region: 'CAR', province: 'Benguet' },
  'dagupan': { lat: 16.0433, lng: 120.3327, name: 'Dagupan', region: 'I', province: 'Pangasinan' },
  'laoag': { lat: 18.1978, lng: 120.5936, name: 'Laoag', region: 'I', province: 'Ilocos Norte' },
  'vigan': { lat: 17.5747, lng: 120.3869, name: 'Vigan', region: 'I', province: 'Ilocos Sur' },
  'tuguegarao': { lat: 17.6131, lng: 121.7269, name: 'Tuguegarao', region: 'II', province: 'Cagayan' },
  
  // === Bicol ===
  'naga': { lat: 13.6192, lng: 123.1814, name: 'Naga City', region: 'V', province: 'Camarines Sur' },
  'legazpi': { lat: 13.1391, lng: 123.7438, name: 'Legazpi', region: 'V', province: 'Albay' }
};

/**
 * Search Google Maps using Places API
 */
async function searchGooglePlaces(query, location, radius = 5000) {
  if (!GOOGLE_PLACES_API_KEY) {
    console.log('[Maps] No Google Places API key, using alternative method');
    return searchViaSerpAPI(query, location);
  }

  const url = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json');
  url.searchParams.set('location', `${location.lat},${location.lng}`);
  url.searchParams.set('radius', radius);
  url.searchParams.set('keyword', query);
  url.searchParams.set('key', GOOGLE_PLACES_API_KEY);

  try {
    const res = await fetch(url.toString());
    const data = await res.json();

    if (data.status !== 'OK') {
      console.error('[Maps] Places API error:', data.status);
      return [];
    }

    return data.results.map(place => ({
      name: place.name,
      address: place.vicinity || place.formatted_address,
      location: `${place.geometry?.location?.lat},${place.geometry?.location?.lng}`,
      rating: place.rating,
      totalRatings: place.user_ratings_total,
      types: place.types,
      placeId: place.place_id,
      source: 'google_places'
    }));
  } catch (err) {
    console.error('[Maps] Places API error:', err.message);
    return [];
  }
}

/**
 * Search using SerpAPI (Google Maps results)
 */
async function searchViaSerpAPI(query, location) {
  if (!SERPAPI_KEY) {
    console.log('[Maps] No SerpAPI key, using web scraping fallback');
    return searchViaWebScraping(query, location);
  }

  const url = new URL('https://serpapi.com/search.json');
  url.searchParams.set('engine', 'google_maps');
  url.searchParams.set('q', query);
  url.searchParams.set('ll', `@${location.lat},${location.lng},15z`);
  url.searchParams.set('type', 'search');
  url.searchParams.set('api_key', SERPAPI_KEY);

  try {
    const res = await fetch(url.toString());
    const data = await res.json();

    if (!data.local_results) {
      return [];
    }

    return data.local_results.map(place => ({
      name: place.title,
      address: place.address,
      phone: place.phone,
      website: place.website,
      rating: place.rating,
      totalRatings: place.reviews,
      hours: place.hours,
      placeId: place.place_id,
      source: 'serpapi'
    }));
  } catch (err) {
    console.error('[Maps] SerpAPI error:', err.message);
    return [];
  }
}

/**
 * Fallback: Search using free web scraping approach
 */
async function searchViaWebScraping(query, location) {
  // Use a simple approach with Google search
  const searchQuery = `${query} near ${location.name || 'Philippines'}`;
  
  try {
    // Use DuckDuckGo or similar for basic results
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(searchQuery + ' site:google.com/maps')}`;
    
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const html = await res.text();
    
    // Extract business mentions from results
    const businesses = [];
    const nameMatches = html.matchAll(/class="result__title"[^>]*>([^<]+)</g);
    
    for (const match of nameMatches) {
      if (match[1] && !match[1].includes('Google Maps')) {
        businesses.push({
          name: match[1].trim(),
          address: location.name || 'Philippines',
          source: 'web_search'
        });
      }
    }
    
    return businesses.slice(0, 20);
  } catch (err) {
    console.error('[Maps] Web scraping error:', err.message);
    return [];
  }
}

/**
 * Get place details (phone, website, hours)
 */
async function getPlaceDetails(placeId) {
  if (!GOOGLE_PLACES_API_KEY || !placeId) return null;

  const url = new URL('https://maps.googleapis.com/maps/api/place/details/json');
  url.searchParams.set('place_id', placeId);
  url.searchParams.set('fields', 'name,formatted_address,formatted_phone_number,website,opening_hours,geometry');
  url.searchParams.set('key', GOOGLE_PLACES_API_KEY);

  try {
    const res = await fetch(url.toString());
    const data = await res.json();

    if (data.status !== 'OK') return null;

    return {
      name: data.result.name,
      address: data.result.formatted_address,
      phone: data.result.formatted_phone_number,
      website: data.result.website,
      hours: data.result.opening_hours?.weekday_text,
      location: data.result.geometry?.location
    };
  } catch (err) {
    console.error('[Maps] Details error:', err.message);
    return null;
  }
}

/**
 * Extract core business name (remove location suffixes)
 * e.g., "XYZ Store - Lipa Branch" → "xyz store"
 */
function extractCoreName(name) {
  let coreName = (name || '').toLowerCase();
  
  // Remove common location/branch suffixes
  const suffixPatterns = [
    /\s*-\s*(lipa|batangas|tanauan|san pascual|bauan|nasugbu|rosario|lemery|ibaan|padre garcia|malvar|sto\.?\s*tomas|taysan|branch|city|poblacion|brgy\.?|barangay).*/i,
    /\s*,\s*(lipa|batangas|tanauan|san pascual|bauan|nasugbu|rosario|lemery|ibaan|padre garcia|malvar|sto\.?\s*tomas|taysan|branch|city|poblacion|brgy\.?|barangay).*/i,
    /\s+(lipa|batangas|tanauan|san pascual|bauan|nasugbu|rosario|lemery|ibaan|padre garcia|malvar|sto\.?\s*tomas|taysan)\s*(city|branch)?$/i,
    /\s+branch\s*\d*$/i,
    /\s+store\s*#?\d+$/i,
    /\s+outlet$/i,
  ];
  
  for (const pattern of suffixPatterns) {
    coreName = coreName.replace(pattern, '');
  }
  
  return coreName.trim();
}

// Track seen business names to detect local chains
const seenBusinessNames = new Map();

/**
 * Check if business qualifies for franchise package
 */
function qualifiesForFranchise(lead) {
  const name = (lead.name || '').toLowerCase();
  const address = (lead.address || '').toLowerCase();
  const coreName = extractCoreName(name);
  
  // Exclude small operations
  for (const keyword of FRANCHISE_QUALIFIERS.excludeKeywords) {
    if (name.includes(keyword)) {
      return { qualified: false, reason: `Small operation: ${keyword}` };
    }
  }
  
  // Exclude big corporate chains - they already have their own systems!
  for (const chain of FRANCHISE_QUALIFIERS.excludeChains) {
    if (name.includes(chain)) {
      return { qualified: false, reason: `Corporate chain: ${chain}` };
    }
  }
  
  // Check rating
  if (lead.rating && lead.rating < FRANCHISE_QUALIFIERS.minRating) {
    return { qualified: false, reason: `Rating ${lead.rating} below minimum ${FRANCHISE_QUALIFIERS.minRating}` };
  }
  
  // Check reviews - too few means not established
  if (lead.totalRatings && lead.totalRatings < FRANCHISE_QUALIFIERS.minReviews) {
    return { qualified: false, reason: `Only ${lead.totalRatings} reviews, needs ${FRANCHISE_QUALIFIERS.minReviews}+` };
  }
  
  // Check reviews - too many likely means corporate chain
  if (lead.totalRatings && lead.totalRatings > FRANCHISE_QUALIFIERS.maxReviews) {
    return { qualified: false, reason: `${lead.totalRatings} reviews suggests corporate chain (max ${FRANCHISE_QUALIFIERS.maxReviews})` };
  }
  
  // Score the lead - ideal range is 20-200 reviews (established local business)
  let score = 50; // Base score
  
  // Rating scoring
  if (lead.rating >= 4.5) score += 20;
  else if (lead.rating >= 4.0) score += 15;
  else if (lead.rating >= 3.5) score += 10;
  
  // Review count scoring - sweet spot is 20-100 reviews (local but established)
  if (lead.totalRatings >= 50 && lead.totalRatings <= 200) score += 20;  // Ideal range
  else if (lead.totalRatings >= 20 && lead.totalRatings <= 300) score += 15;
  else if (lead.totalRatings >= 10) score += 10;
  else if (lead.totalRatings >= 5) score += 5;
  
  // Contact info scoring
  if (lead.website) score += 10;
  if (lead.phone) score += 5;
  
  // Bonus for local business indicators in name
  const localIndicators = ['trading', 'enterprise', 'store', 'center', 'depot', 'supply', 'farm'];
  for (const indicator of localIndicators) {
    if (name.includes(indicator)) {
      score += 5;
      break;
    }
  }
  
  return { 
    qualified: true, 
    score,
    tier: score >= 80 ? 'Premium' : score >= 65 ? 'Standard' : 'Prospect'
  };
}

/**
 * Find franchise-qualified leads in a location (bigger businesses)
 * Now with chain detection - businesses appearing in multiple locations are excluded
 */
async function findFranchiseLeads(locationKey, options = {}) {
  const location = PHILIPPINE_LOCATIONS[locationKey];
  if (!location) {
    throw new Error(`Unknown location: ${locationKey}. Available: ${Object.keys(PHILIPPINE_LOCATIONS).join(', ')}`);
  }

  const {
    businessTypes = FRANCHISE_BUSINESS_TYPES,
    minLeadsPerType = 2,
    maxLeadsPerLocation = 50,
    radius = 10000  // 10km radius for broader coverage
  } = options;

  const allResults = [];
  const seen = new Set();
  const localNameCount = new Map(); // Track business names in this location
  const qualifiedCount = { Premium: 0, Standard: 0, Prospect: 0 };

  console.log(`[Maps] 🏢 Searching for FRANCHISE leads in ${location.name}...`);
  console.log(`[Maps] Targeting ${businessTypes.length} business types`);

  // First pass: collect all results and count name occurrences
  const tempResults = [];
  
  for (const type of businessTypes) {
    console.log(`[Maps] Searching: ${type}`);
    
    const results = await searchGooglePlaces(type, location, radius);
    
    for (const result of results) {
      // Deduplicate by exact match
      const key = `${result.name}|${result.address}`.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      
      // Track core name frequency (to detect local chains)
      const coreName = extractCoreName(result.name);
      localNameCount.set(coreName, (localNameCount.get(coreName) || 0) + 1);
      
      // Also track globally across all locations
      seenBusinessNames.set(coreName, (seenBusinessNames.get(coreName) || 0) + 1);
      
      tempResults.push({
        ...result,
        coreName,
        searchType: type,
        locationKey
      });
    }

    // Rate limiting
    await new Promise(r => setTimeout(r, 500));
  }
  
  // Second pass: filter out chains (names appearing 2+ times locally or 3+ times globally)
  for (const result of tempResults) {
    const localCount = localNameCount.get(result.coreName) || 0;
    const globalCount = seenBusinessNames.get(result.coreName) || 0;
    
    // Skip if appears multiple times (likely a chain)
    if (localCount >= 2) {
      console.log(`[Maps] ⛔ Skipping local chain: ${result.name} (${localCount} locations in ${location.name})`);
      continue;
    }
    
    if (globalCount >= 3) {
      console.log(`[Maps] ⛔ Skipping regional chain: ${result.name} (${globalCount} locations total)`);
      continue;
    }
    
    // Qualify for franchise
    const qualification = qualifiesForFranchise(result);
    
    if (qualification.qualified) {
      allResults.push({
        ...result,
        franchiseQualified: true,
        franchiseScore: qualification.score,
        franchiseTier: qualification.tier
      });
      qualifiedCount[qualification.tier]++;
    }
    
    // Stop if we have enough
    if (allResults.length >= maxLeadsPerLocation) break;
  }

  console.log(`[Maps] ✅ Found ${allResults.length} INDEPENDENT franchise leads in ${location.name}`);
  console.log(`[Maps] Breakdown: Premium=${qualifiedCount.Premium}, Standard=${qualifiedCount.Standard}, Prospect=${qualifiedCount.Prospect}`);
  
  // Sort by score (best first)
  allResults.sort((a, b) => (b.franchiseScore || 0) - (a.franchiseScore || 0));
  
  return allResults;
}

/**
 * Search for potential PlataPay agents in a location
 */
async function findPotentialAgents(locationKey, businessTypes = null) {
  const location = PHILIPPINE_LOCATIONS[locationKey];
  if (!location) {
    throw new Error(`Unknown location: ${locationKey}. Available: ${Object.keys(PHILIPPINE_LOCATIONS).join(', ')}`);
  }

  const types = businessTypes || TARGET_BUSINESS_TYPES;
  const allResults = [];
  const seen = new Set();

  console.log(`[Maps] Searching for potential agents in ${locationKey}...`);

  for (const type of types) {
    console.log(`[Maps] Searching: ${type}`);
    
    const results = await searchGooglePlaces(type, location);
    
    for (const result of results) {
      // Deduplicate by name + address
      const key = `${result.name}|${result.address}`.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        allResults.push({
          ...result,
          searchType: type,
          locationKey
        });
      }
    }

    // Rate limiting
    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`[Maps] Found ${allResults.length} unique businesses in ${locationKey}`);
  return allResults;
}

/**
 * Convert scraped leads to sheet format (legacy - for original leads tracker)
 */
function formatLeadsForSheet(leads) {
  const now = new Date().toISOString().split('T')[0];
  
  return leads.map(lead => ({
    date: now,
    name: lead.name || '',
    email: '', // To be collected
    phone: lead.phone || '',
    location: lead.address || '',
    source: `Google Maps - ${lead.searchType || 'Search'}`,
    interest: 'Potential Agent',
    status: 'New',
    comments: `Rating: ${lead.rating || 'N/A'}, Reviews: ${lead.totalRatings || 0}`,
    lastUpdated: now,
    contactId: `GML${Date.now().toString(36).toUpperCase()}`
  }));
}

/**
 * Convert scraped leads to regional sheet format
 */
function formatLeadsForRegionalSheet(leads, locationKey) {
  const now = new Date().toISOString().split('T')[0];
  const location = PHILIPPINE_LOCATIONS[locationKey] || {};
  
  return leads.map(lead => {
    // Parse address for city/province
    const addressParts = (lead.address || '').split(',').map(s => s.trim());
    const city = addressParts[0] || location.name || '';
    const province = addressParts[1] || '';
    
    // Parse coordinates
    let lat = '', lng = '';
    if (lead.location) {
      const coords = lead.location.split(',');
      lat = coords[0] || '';
      lng = coords[1] || '';
    }
    
    return {
      businessName: lead.name || '',
      businessType: lead.searchType || 'General Merchandise',
      address: lead.address || '',
      city: city,
      province: province,
      phone: lead.phone || '',
      email: '',
      website: lead.website || '',
      rating: lead.rating || '',
      reviewsCount: lead.totalRatings || '',
      mapsUrl: lead.placeId ? `https://www.google.com/maps/place/?q=place_id:${lead.placeId}` : '',
      plusCode: '',
      latitude: lat,
      longitude: lng,
      operatingHours: Array.isArray(lead.hours) ? lead.hours.join('; ') : (lead.hours || ''),
      scrapeSource: lead.source === 'google_places' ? 'Google Places API' 
                  : lead.source === 'serpapi' ? 'SerpAPI' 
                  : 'Web Scrape',
      status: lead.email ? 'Qualified' : 'Needs Email',
      priority: lead.email ? 'High'
              : lead.rating >= 4 && lead.totalRatings >= 10 ? 'Medium' 
              : 'Low',
      notes: lead.email 
              ? `✅ Email available - Ready for campaign. Scraped from ${locationKey}`
              : `📞 Phone only - Needs manual email collection. Scraped from ${locationKey}`,
      tags: lead.searchType ? lead.searchType.replace(/\s+/g, '-').toLowerCase() : ''
    };
  });
}

/**
 * Save leads to regional Google Sheet
 */
async function saveToRegionalSheet(leads) {
  if (!mapsLeadsIntegration) {
    console.log('[Maps] Regional sheets integration not available');
    return { success: false, error: 'Integration module not loaded' };
  }
  
  try {
    const result = await mapsLeadsIntegration.addLeads(leads);
    console.log(`[Maps] Saved to regional sheets: ${result.success} success, ${result.failed} failed`);
    return result;
  } catch (err) {
    console.error('[Maps] Error saving to regional sheets:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Save leads to JSON file
 */
function saveLeadsToFile(leads, filename) {
  const filePath = path.join(__dirname, 'scraped-leads', filename);
  const dir = path.dirname(filePath);
  
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  fs.writeFileSync(filePath, JSON.stringify(leads, null, 2));
  console.log(`[Maps] Saved ${leads.length} leads to ${filePath}`);
  return filePath;
}

/**
 * Main scraping function
 */
async function scrapeLeads(options = {}) {
  const {
    locations = ['batangas'],
    businessTypes = TARGET_BUSINESS_TYPES.slice(0, 5), // Limit for free tier
    saveToFile = true,
    syncToSheets = false  // Renamed to avoid shadowing the function
  } = options;

  const allLeads = [];
  const leadsByLocation = {};
  
  for (const locationKey of locations) {
    try {
      const leads = await findPotentialAgents(locationKey, businessTypes);
      allLeads.push(...leads);
      leadsByLocation[locationKey] = leads;
    } catch (err) {
      console.error(`[Maps] Error scraping ${locationKey}:`, err.message);
    }
  }

  // Format for legacy sheet
  const formattedLeads = formatLeadsForSheet(allLeads);
  
  // Save to local file
  if (saveToFile && formattedLeads.length > 0) {
    const filename = `leads_${new Date().toISOString().split('T')[0]}.json`;
    saveLeadsToFile(formattedLeads, filename);
  }
  
  // Save to regional Google Sheet
  let sheetResult = null;
  if (syncToSheets && mapsLeadsIntegration) {
    const regionalLeads = [];
    for (const [locationKey, leads] of Object.entries(leadsByLocation)) {
      const formatted = formatLeadsForRegionalSheet(leads, locationKey);
      regionalLeads.push(...formatted);
    }
    
    if (regionalLeads.length > 0) {
      sheetResult = await saveToRegionalSheet(regionalLeads);
    }
  }

  return {
    total: formattedLeads.length,
    leads: formattedLeads,
    locations: locations,
    businessTypes: businessTypes,
    sheetResult: sheetResult
  };
}

/**
 * Scrape franchise leads with barangay-level granularity
 * Filters out chains (businesses appearing in multiple locations)
 */
async function scrapeFranchiseLeads(options = {}) {
  const {
    locations = ['batangas'],
    targetPerBarangay = 2,
    saveToFile = true,
    syncToSheets = true
  } = options;
  
  // Reset chain tracking for fresh scrape
  seenBusinessNames.clear();

  const allLeads = [];
  const leadsByLocation = {};
  const summary = { total: 0, premium: 0, standard: 0, prospect: 0, byLocation: {} };
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🏢 FRANCHISE LEAD SCRAPER - PlataPay`);
  console.log(`Target: ${targetPerBarangay}+ qualified leads per location`);
  console.log(`Locations: ${locations.join(', ')}`);
  console.log(`${'='.repeat(60)}\n`);

  for (const locationKey of locations) {
    try {
      const leads = await findFranchiseLeads(locationKey, {
        minLeadsPerType: targetPerBarangay
      });
      
      allLeads.push(...leads);
      leadsByLocation[locationKey] = leads;
      
      // Track summary
      summary.byLocation[locationKey] = {
        total: leads.length,
        premium: leads.filter(l => l.franchiseTier === 'Premium').length,
        standard: leads.filter(l => l.franchiseTier === 'Standard').length,
        prospect: leads.filter(l => l.franchiseTier === 'Prospect').length
      };
      
      summary.total += leads.length;
      summary.premium += summary.byLocation[locationKey].premium;
      summary.standard += summary.byLocation[locationKey].standard;
      summary.prospect += summary.byLocation[locationKey].prospect;
      
    } catch (err) {
      console.error(`[Maps] Error scraping ${locationKey}:`, err.message);
    }
    
    // Delay between locations
    await new Promise(r => setTimeout(r, 1000));
  }

  // Format for regional sheet with franchise fields
  const regionalLeads = [];
  for (const [locationKey, leads] of Object.entries(leadsByLocation)) {
    // First format the leads
    const formatted = formatLeadsForRegionalSheet(leads, locationKey);
    
    // Then merge back franchise data from original leads
    for (let i = 0; i < formatted.length && i < leads.length; i++) {
      const originalLead = leads[i];
      const formattedLead = formatted[i];
      
      // Set priority based on franchise tier
      formattedLead.priority = originalLead.franchiseTier === 'Premium' ? 'High' 
                             : originalLead.franchiseTier === 'Standard' ? 'Medium' 
                             : 'Low';
      
      formattedLead.tags = `franchise,${formattedLead.tags || ''}`.replace(/,$/, '');
      formattedLead.notes = `🏢 FRANCHISE LEAD (${originalLead.franchiseTier || 'Prospect'}) - Score: ${originalLead.franchiseScore || 'N/A'}. ${formattedLead.notes || ''}`;
    }
    
    regionalLeads.push(...formatted);
  }

  // Save to file
  if (saveToFile && regionalLeads.length > 0) {
    const filename = `franchise_leads_${new Date().toISOString().split('T')[0]}.json`;
    saveLeadsToFile(regionalLeads, filename);
  }
  
  // Save to regional Google Sheet
  let sheetResult = null;
  if (syncToSheets && mapsLeadsIntegration && regionalLeads.length > 0) {
    sheetResult = await saveToRegionalSheet(regionalLeads);
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ FRANCHISE SCRAPE COMPLETE`);
  console.log(`Total: ${summary.total} qualified leads`);
  console.log(`Premium: ${summary.premium} | Standard: ${summary.standard} | Prospect: ${summary.prospect}`);
  console.log(`${'='.repeat(60)}\n`);

  return {
    total: summary.total,
    leads: regionalLeads,
    summary,
    sheetResult
  };
}

// Export
module.exports = {
  scrapeLeads,
  scrapeFranchiseLeads,
  findPotentialAgents,
  findFranchiseLeads,
  qualifiesForFranchise,
  searchGooglePlaces,
  getPlaceDetails,
  formatLeadsForSheet,
  formatLeadsForRegionalSheet,
  saveToRegionalSheet,
  TARGET_BUSINESS_TYPES,
  FRANCHISE_BUSINESS_TYPES,
  FRANCHISE_QUALIFIERS,
  PHILIPPINE_LOCATIONS
};

// Run if called directly
if (require.main === module) {
  const args = process.argv.slice(2);
  const location = args[0] || 'batangas';
  
  console.log(`[Maps] Starting lead scraper for: ${location}`);
  
  scrapeLeads({ locations: [location] })
    .then(result => {
      console.log(`[Maps] Complete! Found ${result.total} leads`);
      console.log('[Maps] Sample:', result.leads.slice(0, 3));
    })
    .catch(err => {
      console.error('[Maps] Error:', err);
      process.exit(1);
    });
}
