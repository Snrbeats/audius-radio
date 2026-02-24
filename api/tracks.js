// Vercel API route for Audius
// Endpoint: /api/tracks?mood=chill&count=10

const AUDIUS_API = 'https://api.audius.co/v1';

const MOOD_TAGS = {
  chill: ['chill', 'lo-fi', 'ambient'],
  focus: ['study', 'instrumental', 'lo-fi'],
  happy: ['happy', 'feel good', 'uplifting'],
  energetic: ['trap', 'bass', 'hard'],
  party: ['dance', 'edm', 'hip-hop'],
  sad: ['sad', 'melancholy', 'emotional']
};

export default async function handler(req, res) {
  const { mood = 'chill', count = 10 } = req.query;
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  try {
    const tags = MOOD_TAGS[mood.toLowerCase()] || MOOD_TAGS.chill;
    let allTracks = [];
    
    // Fetch from multiple tags
    for (const tag of tags) {
      const response = await fetch(
        `${AUDIUS_API}/tracks?app_name=audius-radio&tag=${tag}&limit=30&api_key=test`
      );
      const data = await response.json();
      
      if (data.data) {
        allTracks = [...allTracks, ...data.data];
      }
    }
    
    // Deduplicate
    const seen = new Set();
    const uniqueTracks = allTracks.filter(track => {
      if (seen.has(track.id)) return false;
      seen.add(track.id);
      return true;
    });
    
    // Get stream URLs for each track
    const tracksWithStreams = [];
    
    for (const track of uniqueTracks.slice(0, 20)) {
      try {
        const resolveRes = await fetch(
          `${AUDIUS_API}/resolve?url=https://audius.co${track.permalink}&api_key=test`
        );
        const resolveData = await resolveRes.json();
        
        if (resolveData.data?.stream?.url) {
          tracksWithStreams.push({
            id: track.id,
            title: track.title,
            artist: track.user?.name || 'Unknown',
            duration: track.duration,
            artwork: track.artwork?.['480x480'] || track.artwork?.['150x150'],
            genre: track.genre,
            mood: track.mood,
            permalink: track.permalink,
            embedUrl: `https://audius.co/embed/track/${track.id}`,
            streamUrl: resolveData.data.stream.url
          });
        }
      } catch (e) {
        // Skip failed tracks
      }
      
      if (tracksWithStreams.length >= count) break;
    }
    
    // Shuffle
    const shuffled = tracksWithStreams.sort(() => Math.random() - 0.5);
    
    res.status(200).json({
      success: true,
      mood,
      count: shuffled.length,
      tracks: shuffled
    });
    
  } catch (error) {
    console.error('Audius API error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
