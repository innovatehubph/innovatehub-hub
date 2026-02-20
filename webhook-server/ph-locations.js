/**
 * Philippine Geographic Locations Module
 * Uses PSGC (Philippine Standard Geographic Code) API
 * Provides hierarchical location data: Region > Province > City/Municipality > Barangay
 * 
 * API Source: https://psgc.gitlab.io/api/
 */

const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const PSGC_BASE_URL = 'https://psgc.gitlab.io/api';
const CACHE_DIR = path.join(__dirname, 'ph-locations-cache');
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

// Ensure cache directory exists
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

/**
 * Load from cache or fetch from API
 */
async function cachedFetch(endpoint, cacheKey) {
  const cachePath = path.join(CACHE_DIR, `${cacheKey}.json`);
  
  // Check cache
  if (fs.existsSync(cachePath)) {
    const stat = fs.statSync(cachePath);
    if (Date.now() - stat.mtimeMs < CACHE_TTL) {
      return JSON.parse(fs.readFileSync(cachePath, 'utf8'));
    }
  }
  
  // Fetch from API
  try {
    const res = await fetch(`${PSGC_BASE_URL}${endpoint}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    
    const data = await res.json();
    
    // Save to cache
    fs.writeFileSync(cachePath, JSON.stringify(data, null, 2));
    console.log(`[PH-Locations] Cached: ${cacheKey}`);
    
    return data;
  } catch (err) {
    console.error(`[PH-Locations] Fetch error for ${endpoint}:`, err.message);
    
    // Return cached data if available (even if stale)
    if (fs.existsSync(cachePath)) {
      return JSON.parse(fs.readFileSync(cachePath, 'utf8'));
    }
    
    return [];
  }
}

/**
 * Get all regions
 */
async function getRegions() {
  return cachedFetch('/regions/', 'regions');
}

/**
 * Get provinces by region code
 */
async function getProvinces(regionCode) {
  return cachedFetch(`/regions/${regionCode}/provinces/`, `provinces_${regionCode}`);
}

/**
 * Get all provinces (all regions)
 */
async function getAllProvinces() {
  const regions = await getRegions();
  const allProvinces = [];
  
  for (const region of regions) {
    const provinces = await getProvinces(region.code);
    allProvinces.push(...provinces.map(p => ({
      ...p,
      regionCode: region.code,
      regionName: region.name
    })));
  }
  
  return allProvinces;
}

/**
 * Get cities/municipalities by province code
 */
async function getCitiesMunicipalities(provinceCode) {
  return cachedFetch(`/provinces/${provinceCode}/cities-municipalities/`, `cities_${provinceCode}`);
}

/**
 * Get barangays by city/municipality code
 */
async function getBarangays(cityMunCode) {
  return cachedFetch(`/cities-municipalities/${cityMunCode}/barangays/`, `barangays_${cityMunCode}`);
}

/**
 * Search locations by name
 */
async function searchLocations(query) {
  const queryLower = query.toLowerCase();
  const results = {
    regions: [],
    provinces: [],
    cities: [],
    barangays: []
  };
  
  // Search regions
  const regions = await getRegions();
  results.regions = regions.filter(r => r.name.toLowerCase().includes(queryLower));
  
  // Search provinces
  const provinces = await getAllProvinces();
  results.provinces = provinces.filter(p => p.name.toLowerCase().includes(queryLower));
  
  // If specific province found, search its cities
  if (results.provinces.length > 0) {
    for (const prov of results.provinces.slice(0, 3)) {
      const cities = await getCitiesMunicipalities(prov.code);
      results.cities.push(...cities.filter(c => 
        c.name.toLowerCase().includes(queryLower)
      ).map(c => ({ ...c, provinceName: prov.name })));
    }
  }
  
  return results;
}

/**
 * Get location hierarchy for a specific code
 */
async function getLocationHierarchy(code) {
  const hierarchy = {};
  
  // Determine level from code pattern
  const codeStr = code.toString().padStart(9, '0');
  
  // Region level: XX0000000
  if (codeStr.endsWith('0000000')) {
    const regions = await getRegions();
    const region = regions.find(r => r.code === code);
    if (region) hierarchy.region = region;
  }
  // Province level: XXXY00000
  else if (codeStr.endsWith('00000')) {
    const regions = await getRegions();
    for (const region of regions) {
      const provinces = await getProvinces(region.code);
      const province = provinces.find(p => p.code === code);
      if (province) {
        hierarchy.region = region;
        hierarchy.province = province;
        break;
      }
    }
  }
  // City/Municipality level: XXXYYZZ000
  else if (codeStr.endsWith('000')) {
    // Find the province and city
    const provinces = await getAllProvinces();
    for (const province of provinces) {
      const cities = await getCitiesMunicipalities(province.code);
      const city = cities.find(c => c.code === code);
      if (city) {
        hierarchy.region = { code: province.regionCode, name: province.regionName };
        hierarchy.province = province;
        hierarchy.cityMunicipality = city;
        break;
      }
    }
  }
  
  return hierarchy;
}

/**
 * Get coordinates for a location (approximate center)
 * Uses a mapping of known coordinates for major locations
 */
const LOCATION_COORDINATES = {
  // Regions
  '010000000': { lat: 16.0194, lng: 120.2298, name: 'Ilocos Region' },
  '020000000': { lat: 17.6132, lng: 121.7270, name: 'Cagayan Valley' },
  '030000000': { lat: 15.4755, lng: 120.5963, name: 'Central Luzon' },
  '040000000': { lat: 14.1008, lng: 121.0794, name: 'CALABARZON' },
  '050000000': { lat: 13.4210, lng: 123.4137, name: 'Bicol Region' },
  '060000000': { lat: 11.0050, lng: 122.5373, name: 'Western Visayas' },
  '070000000': { lat: 9.8500, lng: 123.8907, name: 'Central Visayas' },
  '080000000': { lat: 11.2543, lng: 125.0000, name: 'Eastern Visayas' },
  '090000000': { lat: 7.8323, lng: 123.4370, name: 'Zamboanga Peninsula' },
  '100000000': { lat: 8.0202, lng: 124.6857, name: 'Northern Mindanao' },
  '110000000': { lat: 7.0707, lng: 125.6087, name: 'Davao Region' },
  '120000000': { lat: 6.2700, lng: 124.6857, name: 'SOCCSKSARGEN' },
  '130000000': { lat: 14.5995, lng: 120.9842, name: 'NCR' },
  '140000000': { lat: 17.3513, lng: 121.1719, name: 'CAR' },
  '150000000': { lat: 5.9750, lng: 121.0437, name: 'BARMM' },
  '160000000': { lat: 8.9475, lng: 125.5406, name: 'Caraga' },
  '170000000': { lat: 12.8797, lng: 121.7740, name: 'MIMAROPA' },
  
  // Major Provinces
  '041000000': { lat: 13.7565, lng: 121.0583, name: 'Batangas' },
  '042100000': { lat: 14.2456, lng: 120.8786, name: 'Cavite' },
  '043400000': { lat: 14.2691, lng: 121.4113, name: 'Laguna' },
  '045600000': { lat: 14.0313, lng: 122.1108, name: 'Quezon' },
  '045800000': { lat: 14.5764, lng: 121.1761, name: 'Rizal' },
  '031400000': { lat: 14.7942, lng: 120.8800, name: 'Bulacan' },
  '035400000': { lat: 15.0794, lng: 120.6200, name: 'Pampanga' },
  '072200000': { lat: 10.3157, lng: 123.8854, name: 'Cebu' },
  '112400000': { lat: 7.1907, lng: 125.4553, name: 'Davao del Sur' },
  '137400000': { lat: 14.5995, lng: 120.9842, name: 'Metro Manila' },
  
  // Major Cities
  '137404000': { lat: 14.5547, lng: 121.0244, name: 'Makati' },
  '137404001': { lat: 14.6760, lng: 121.0437, name: 'Quezon City' },
  '137601000': { lat: 14.5995, lng: 120.9842, name: 'Manila' },
  '041005000': { lat: 13.7565, lng: 121.0583, name: 'Batangas City' },
  '072217000': { lat: 10.3157, lng: 123.8854, name: 'Cebu City' },
  '112402000': { lat: 7.0707, lng: 125.6087, name: 'Davao City' },
  
  // San Pascual municipalities
  '041027000': { lat: 13.8183, lng: 121.0255, name: 'San Pascual' }
};

function getCoordinates(code) {
  return LOCATION_COORDINATES[code] || null;
}

/**
 * Get all locations formatted for Google Maps scraping
 */
async function getScrapingLocations() {
  const locations = [];
  
  // Get all provinces
  const provinces = await getAllProvinces();
  
  for (const province of provinces) {
    const coords = getCoordinates(province.code);
    
    // Get cities in this province
    const cities = await getCitiesMunicipalities(province.code);
    
    for (const city of cities) {
      const cityCoords = getCoordinates(city.code);
      
      locations.push({
        code: city.code,
        name: city.name,
        province: province.name,
        region: province.regionName,
        fullName: `${city.name}, ${province.name}`,
        coordinates: cityCoords || coords || null
      });
    }
  }
  
  return locations;
}

/**
 * Setup Express routes
 */
function setupRoutes(app) {
  // Get all regions
  app.get('/api/locations/regions', async (req, res) => {
    try {
      const regions = await getRegions();
      res.json({ success: true, count: regions.length, data: regions });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  
  // Get provinces by region
  app.get('/api/locations/regions/:regionCode/provinces', async (req, res) => {
    try {
      const provinces = await getProvinces(req.params.regionCode);
      res.json({ success: true, count: provinces.length, data: provinces });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  
  // Get all provinces
  app.get('/api/locations/provinces', async (req, res) => {
    try {
      const provinces = await getAllProvinces();
      res.json({ success: true, count: provinces.length, data: provinces });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  
  // Get cities/municipalities by province
  app.get('/api/locations/provinces/:provinceCode/cities', async (req, res) => {
    try {
      const cities = await getCitiesMunicipalities(req.params.provinceCode);
      res.json({ success: true, count: cities.length, data: cities });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  
  // Get barangays by city/municipality
  app.get('/api/locations/cities/:cityCode/barangays', async (req, res) => {
    try {
      const barangays = await getBarangays(req.params.cityCode);
      res.json({ success: true, count: barangays.length, data: barangays });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  
  // Search locations
  app.get('/api/locations/search', async (req, res) => {
    try {
      const { q } = req.query;
      if (!q) {
        return res.status(400).json({ error: 'Query parameter q is required' });
      }
      
      const results = await searchLocations(q);
      res.json({ 
        success: true, 
        query: q,
        results: {
          regions: results.regions.length,
          provinces: results.provinces.length,
          cities: results.cities.length
        },
        data: results
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  
  // Get all locations for scraping (cities with coordinates) - MUST BE BEFORE :code route
  app.get('/api/locations/scraping/all', async (req, res) => {
    try {
      const { region, province } = req.query;
      let locations = await getScrapingLocations();
      
      // Filter by region or province if specified
      if (region) {
        locations = locations.filter(l => 
          l.region.toLowerCase().includes(region.toLowerCase())
        );
      }
      if (province) {
        locations = locations.filter(l => 
          l.province.toLowerCase().includes(province.toLowerCase())
        );
      }
      
      res.json({ 
        success: true, 
        count: locations.length,
        data: locations.slice(0, 100) // Limit response
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  
  // Cascade dropdown data (for frontend)
  app.get('/api/locations/dropdown', async (req, res) => {
    try {
      const { region, province, city } = req.query;
      
      // If no params, return regions
      if (!region) {
        const regions = await getRegions();
        return res.json({ 
          level: 'region',
          data: regions.map(r => ({ value: r.code, label: r.name }))
        });
      }
      
      // If region provided, return provinces
      if (region && !province) {
        const provinces = await getProvinces(region);
        return res.json({ 
          level: 'province',
          data: provinces.map(p => ({ value: p.code, label: p.name }))
        });
      }
      
      // If province provided, return cities
      if (province && !city) {
        const cities = await getCitiesMunicipalities(province);
        return res.json({ 
          level: 'city',
          data: cities.map(c => ({ value: c.code, label: c.name }))
        });
      }
      
      // If city provided, return barangays
      if (city) {
        const barangays = await getBarangays(city);
        return res.json({ 
          level: 'barangay',
          data: barangays.map(b => ({ value: b.code, label: b.name }))
        });
      }
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  
  // Get location hierarchy by code - MUST BE LAST (catches :code param)
  app.get('/api/locations/code/:code', async (req, res) => {
    try {
      const hierarchy = await getLocationHierarchy(req.params.code);
      const coordinates = getCoordinates(req.params.code);
      
      res.json({ 
        success: true, 
        code: req.params.code,
        hierarchy,
        coordinates
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  
  console.log('[PH-Locations] Routes setup complete');
}

module.exports = {
  getRegions,
  getProvinces,
  getAllProvinces,
  getCitiesMunicipalities,
  getBarangays,
  searchLocations,
  getLocationHierarchy,
  getCoordinates,
  getScrapingLocations,
  setupRoutes,
  LOCATION_COORDINATES
};
