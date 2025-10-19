# Product Requirements Document: aLone Together

## 1. Executive Summary

### Product Overview
**aLone Together** is an interactive web application that creates personalized versions of a song from the EP of the same name. Users record personal memories in response to prompts, which are then processed and layered over the instrumental track to create unique, downloadable versions of the song. These memories are visualized as floating "windows" orbiting around a 3D building (the EP's block of flats artwork), creating a powerful metaphor where each window represents someone alone in their space yet connected to others through shared experiences.

### Vision Statement
Transform a static music release into a living, breathing architectural space of human stories - a building where every window holds a memory, embodying the paradox of being "alone together" in our interconnected yet isolated modern world.

### Success Metrics
- Number of unique memory songs created (windows added to the building)
- Geographic diversity of submissions
- User engagement time (exploring others' windows/memories)
- Social media shares of personalized songs
- Return visitor rate to explore new memories

## 2. User Journey

### User Flow
1. **Landing** → User sees 3D building with floating windows, slowly rotating to reveal existing memories
2. **Introduction** → Brief explanation: "Each window holds a memory. Add yours to the building."
3. **Prompt Selection** → User presented with memory prompt
4. **Recording** → User records 30-60 second voice memory
5. **Processing** → Real-time audio processing with visual feedback
6. **Playback** → User listens to their personalized song version
7. **Save & Share** → Download option and location permission request
8. **Window Creation** → Watch as their memory becomes a new window floating around the building
9. **Explore** → Click other windows to hear stories from around the world

### User Personas

**Primary: The Music Fan**
- Age: 18-35
- Deeply connects with music emotionally
- Values unique/exclusive content
- Fascinated by the visual metaphor of windows/building
- Wants to be part of artist's creative process

**Secondary: The Story Sharer**
- Age: 25-45
- Enjoys personal reflection
- Drawn to the concept of "alone together"
- Values human connection through shared isolation
- May discover the artist through the experience

## 3. Core Features

### 3.1 Memory Recording System

**Functionality:**
- Browser-based audio recording (no app download required)
- Visual waveform display during recording
- 30-60 second recording limit
- Re-record option before submission
- Voice level indicator for optimal recording

**Technical Requirements:**
- MediaRecorder API / RecordRTC.js implementation
- Real-time waveform visualization
- Audio format: WebM or WAV
- Automatic gain control
- Noise gate implementation

### 3.2 Audio Processing Pipeline

**Processing Chain:**
1. **Input Normalization** - Level matching to ensure consistent volume
2. **EQ Processing** - High-pass filter at 80-100Hz to remove low-end rumble
3. **Spatial Effects** - Reverb (hall/plate) with 20-30% wet signal
4. **Compression** - Gentle compression (3:1 ratio) for consistency
5. **Timing Alignment** - Auto-sync to specific section of instrumental
6. **Final Mix** - Layer voice with `instrumental.mp3` at -6dB relative to instrumental

**FFmpeg Processing Command Example:**
```bash
ffmpeg -i user_voice.wav -i assets/instrumental.mp3 \
  -filter_complex "\
    [0:a]highpass=f=80,\
    acompressor=ratio=3:threshold=-10dB,\
    reverb=50:50:60:0.5:0.5:2,\
    volume=-6dB[voice];\
    [voice][1:a]amix=inputs=2:duration=longest[out]" \
  -map "[out]" -b:a 320k output.mp3
```

**Output Specifications:**
- Format: MP3 320kbps
- Length: Full instrumental duration (matching `instrumental.mp3`)
- Metadata: Embedded with creation date, location (if permitted)
- Voice placement: Looped or single placement based on instrumental structure

### 3.3 3D Audio Memory Globe - "Windows of Memory"

**Visualization Concept:**
- Central 3D cube displays the EP's "block of flats" artwork on all faces
- User memories appear as floating "windows" orbiting around the building
- Each window represents a person's recorded memory - alone in their space yet connected to others
- Windows gently float and bob in 3D space with subtle animation
- Billboard effect ensures windows always face the viewer for visibility

**Technical Features:**
- Interactive 3D sphere with floating window images around central building cube
- Memories positioned in 3D space based on geographic coordinates (converted to spherical positions)
- Intelligent clustering prevents overlap while maintaining geographic relationships
- Smooth orbit controls with zoom and rotation (touch-enabled for mobile)
- No upper limit on memories - spacing algorithm handles density
- Performance optimization through Three.js instancing for large numbers

**Memory Window Display:**
- Window images (provided assets) represent individual memories
- Hover effect: Window glows and scales up slightly (1.3x)
- Location label appears on hover below each window
- Click to open full memory player with audio
- Opacity: 85% default, 100% on hover
- Gentle floating animation (sine wave on Y-axis)

### 3.4 Memory Exploration Experience

**3D Building Navigation:**
- **Orbit Controls:** Drag to rotate around the building, seeing different faces and windows
- **Zoom:** Scroll/pinch to move closer to individual windows or pull back for full view
- **Window Interaction:** 
  - Hover: Window glows with purple light (#a78bfa), scales to 130%, shows location label
  - Click: Opens memory player modal with full audio playback
- **Floating Animation:** Each window gently bobs up and down independently
- **Density Management:** Automatic spiral clustering when windows from same city would overlap

**Individual Memory Player Modal:**
- Clean card overlay with backdrop blur
- Window image displayed alongside memory details
- Location, artist, and song information
- Personal story/memory text
- Custom audio player with:
  - Play/pause controls
  - Progress bar with scrubbing
  - Time display (current/total)
  - Volume control
- Share buttons (Twitter, Instagram, TikTok, copy link)
- Download button for creator's own song
- Close button to return to 3D exploration

**Exploration Modes:**
- **Free Explore:** Navigate the 3D space freely, discovering windows at your own pace
- **Auto-Rotate:** Building slowly rotates to reveal all windows over time
- **Newest First:** Highlight recently added windows with brighter glow
- **Location Filter:** Show only windows from specific regions/cities
- **Random Journey:** Auto-play random memories while viewing the building

## 4. Technical Architecture

### Frontend Stack
- **Framework:** React.js (with Next.js for Vercel optimization)
- **3D Rendering:** Three.js with @react-three/fiber and @react-three/drei
- **Audio Libraries:** 
  - Tone.js for real-time audio preview
  - WaveSurfer.js for waveform visualization
  - RecordRTC.js for cross-browser recording
- **Styling:** Tailwind CSS with custom design system
- **State Management:** Zustand or React Context API

### Backend Stack
- **Server:** Vercel Edge Functions / Serverless Functions
- **Audio Processing:** FFmpeg (via WASM, external service, or Supabase Edge Functions)
- **Database:** Supabase (PostgreSQL)
- **Storage:** Supabase Storage for all audio files
- **CDN:** Supabase's built-in CDN + Vercel's edge network
- **Queue System:** Supabase Edge Functions or external service for async processing

### Infrastructure
- **Hosting:** Vercel (frontend + API routes)
- **Storage:** Supabase Storage for audio files (raw recordings + processed songs)
- **Database:** Supabase PostgreSQL for metadata
- **Processing:** Options:
  - FFmpeg WASM in Vercel Edge Functions
  - External processing service (Cloudinary, AWS Lambda)
  - Supabase Edge Functions with FFmpeg
- **Analytics:** Vercel Analytics + Google Analytics + custom event tracking

## 5. Design Requirements

### Visual Identity
- **Core Concept:** Windows on a building - each memory is a lit window in the shared space of human experience
- **Color Palette:** Dark atmospheric background with purple glow (#a78bfa) for active elements
- **Typography:** Modern, minimal - matching EP aesthetic
- **3D Aesthetics:** Floating windows around central building, depth through lighting and shadow
- **Animation:** Gentle floating motion, smooth transitions, glowing hover states
- **Mood:** Urban isolation meets connection - alone in our rooms yet part of something bigger

### Component Specifications

**Central Building Cube:**
- EP "block of flats" artwork: `window_square.png` texture
- Applied to all 6 faces of the cube for consistency
- Subtle rotation available in auto-explore mode
- Acts as anchor point for orbiting memories
- Size: 2x2x2 units in 3D space
- Material: MeshStandardMaterial with slight metalness for depth

**Memory Windows:**
- Window assets: `window.jpeg` and `window2.jpeg` (randomly assigned for variety)
- Default opacity: 85%
- Hover opacity: 100%
- Hover scale: 130%
- Glow effect: Purple point light (#a78bfa) on hover
- Floating animation: Sine wave on Y-axis (0.1 unit amplitude)
- Billboard rendering: Always faces camera
- Asset loading: Preloaded with Three.js TextureLoader for performance

**Landing Page Audio:**
- `fullsong.mp3` plays on site load at 30% volume
- Mute/unmute toggle in corner
- Fades out when user begins recording
- Resumes when returning to exploration

**Audio Player Modal:**
- Glassmorphism effect with backdrop blur
- Clean card design with rounded corners
- Window image at 1:1 aspect ratio
- Responsive layout (stacked on mobile, side-by-side on desktop)
- Smooth slide-in animation from bottom

### 3D Spatial Parameters
- **Globe Radius:** 4-6 units from center for optimal viewing
- **Window Size:** 1x1 units (adjustable based on total count)
- **Minimum Angular Distance:** 0.3 radians between windows
- **Spiral Offset:** 0.15 units for clustering resolution
- **Camera Distance:** 
  - Minimum: 6 units (closest zoom)
  - Maximum: 20 units (full building view)
- **Orbit Damping:** 0.05 for smooth rotation
- **Performance:** No hard limit on windows (spacing algorithm handles density)

### Responsive Design
- Mobile-first 3D interaction with touch controls
- Automatic quality adjustment based on device capability
- Modal player optimized for small screens
- Progressive Web App for offline capability
- Fallback to grid view for WebGL-unsupported browsers

## 6. Privacy & Safety

### Data Collection
- **Required:** Audio recording, general location (city level)
- **Optional:** Email (for download link), social handle
- **Anonymous:** No mandatory personal information

### Content Moderation
- Automated screening for explicit content
- Community reporting system
- Manual review queue for flagged content
- Clear content guidelines

### Privacy Controls
- Option to delete submission
- Location precision controls
- Anonymous vs. attributed submissions
- GDPR/CCPA compliance

## 7. Launch Strategy

### Phase 1: Beta (Week 1-2)
- Limited access with invite codes
- 100-500 users
- Test core functionality
- Gather feedback on prompts and UX

### Phase 2: Soft Launch (Week 3-4)
- Open access
- PR to music blogs
- Artist's social media announcement
- Goal: 1,000 memory songs

### Phase 3: Full Campaign (Week 5+)
- Influencer partnerships
- Paid social media campaign
- Press release to major outlets
- Cross-promotion with EP release

## 8. Prompt Strategy

### Initial Prompts (Rotate Daily/Weekly)
1. "Share a moment when you felt truly understood"
2. "Describe a time you felt alone in a crowd"
3. "What does home mean to you?"
4. "Tell us about a stranger who changed your day"
5. "When did music save you?"
6. "Describe your safe space"
7. "What would you tell your younger self?"

### Prompt Selection Logic
- A/B test different prompts
- Track completion rates
- Seasonal/event-based special prompts
- Artist-curated special editions

## 9. Analytics & KPIs

### Key Metrics
- **Engagement:** Average session duration, memories played per session
- **Creation:** Conversion rate (visitor to creator), recording completion rate
- **Quality:** Average listen completion rate, share rate
- **Growth:** Daily active users, geographic spread, viral coefficient
- **Technical:** Page load time, processing time, error rate

### Tracking Implementation
- Custom event tracking for all user actions
- Heatmap analysis for UI optimization
- A/B testing framework for prompts and UI elements
- Real-time dashboard for launch monitoring

## 10. Future Enhancements

### Version 1.1
- Multiple prompt responses per user
- Memory playlists/collections
- Artist commentary on selected memories
- Email notification when someone plays your memory

### Version 2.0
- Collaborate mode - dual memories on one track
- Video message option
- AI-powered similar memory recommendations
- NFT minting for special memories
- Live streaming events with collective memory creation

## 11. Risk Mitigation

### Technical Risks
- **Server overload:** Auto-scaling, queue management
- **Audio sync issues:** Multiple fallback processing methods
- **Browser compatibility:** Progressive enhancement approach

### Content Risks
- **Inappropriate content:** Multi-layer moderation system
- **Copyright concerns:** Clear terms of service
- **Privacy breaches:** Minimal data collection, encryption

### Brand Risks
- **Low participation:** Seed with artist team content
- **Technical failures:** Robust testing, gradual rollout
- **Negative memories:** Frame prompts positively

## 12. Budget Considerations

### Development Costs
- Frontend development: 200-300 hours
- Backend development: 150-200 hours
- Design & UX: 80-100 hours
- Testing & QA: 50-80 hours

### Operational Costs (Monthly)
- **Vercel:** Pro plan ($20) or pay-as-you-go for high traffic
- **Supabase:** Pro plan ($25) includes:
  - 100GB storage (≈30,000 songs)
  - 200GB bandwidth (≈65,000 downloads)
  - Unlimited API requests
- **Audio Processing:** 
  - FFmpeg WASM: Included in Vercel
  - External service: $100-500 depending on volume
- **Additional CDN (if needed):** $50-200
- **Domain & SSL:** $15-30

**Estimated Total Monthly:** $125-500 (scaling with usage)

### Marketing Costs
- Social media ads: $2,000-5,000
- Influencer partnerships: $1,000-3,000
- PR campaign: $2,000-5,000

## 13. Success Criteria

### Minimum Success
- 5,000 unique memory songs created
- 20+ countries represented
- 50,000 total plays
- 10% share rate

### Target Success
- 25,000 unique memory songs
- 50+ countries represented
- 500,000 total plays
- 25% share rate
- Press coverage in major music publications

### Exceptional Success
- 100,000+ unique memory songs
- 100+ countries represented
- 2M+ total plays
- Viral social media moment
- Template for future music releases

## 14. Timeline

### Pre-Development (2 weeks)
- Finalize PRD and technical specifications
- Complete design mockups
- Set up development environment
- Procure necessary services and APIs

### Development Sprint (6-8 weeks)
- Week 1-2: Core recording and processing functionality
- Week 3-4: Map interface and exploration features
- Week 5-6: Polish, testing, and optimization
- Week 7-8: Beta testing and iterations

### Launch Preparation (1 week)
- Load testing and optimization
- Content moderation setup
- Marketing materials preparation
- Press kit distribution

### Launch & Iteration (Ongoing)
- Monitor analytics and user feedback
- Daily prompt updates
- Community management
- Feature additions based on user behavior

---

## Appendix A: Technical Specifications

### Audio Processing Parameters
```
Input: 48kHz, 16-bit minimum
Processing:
- HPF: 80Hz, 12dB/octave
- Reverb: Hall, 2.5s decay, 25% wet
- Compression: 3:1, -10dB threshold, 5ms attack
- Output gain: -6dB relative to instrumental
Output: 320kbps MP3, 44.1kHz
```

### API Endpoints
```
# Vercel API Routes
POST /api/memory/record - Submit new recording to Supabase Storage
GET /api/memory/[id] - Retrieve specific memory from Supabase
GET /api/memories/map - Get all memories for 3D visualization
POST /api/memory/[id]/download - Generate signed URL from Supabase Storage
GET /api/prompts/current - Get active prompt from Supabase DB
POST /api/process-audio - Trigger FFmpeg processing with instrumental.mp3
GET /api/assets/[filename] - Serve static assets (windows, audio files)
```

### File Structure
```
/public/assets/
├── instrumental.mp3      # Backing track for mixing
├── fullsong.mp3         # Landing page ambient audio
├── window_square.png    # Building cube texture
├── window.jpeg         # Memory window variant 1
└── window2.jpeg        # Memory window variant 2

/components/
├── memory-globe.tsx     # 3D scene with building and windows
├── memory-point.tsx     # Individual window component
├── audio-recorder.tsx   # Recording interface
├── audio-player.tsx     # Memory playback modal
└── landing-audio.tsx    # Background music controller
```

### Storage Structure (Supabase Storage)
```
Buckets:
├── memory-songs/          # Raw recordings (private)
│   └── recordings/
│       └── {userId}-{timestamp}.wav
├── processed-songs/       # Final mixed songs (public with signed URLs)
│   └── final/
│       └── {songId}.mp3
└── assets/                # Static assets (public)
    ├── instrumental.mp3   # Instrumental track for layering with voice recordings
    ├── fullsong.mp3      # Complete song that plays on site load
    ├── window_square.png  # Texture for building the central cube (EP artwork)
    ├── window.jpeg       # Window asset for memory visualization
    └── window2.jpeg      # Alternative window asset for variety
```

### Asset Implementation Details

**Audio Assets:**
- `instrumental.mp3` - The backing track mixed with user recordings at -6dB relative volume
- `fullsong.mp3` - Plays softly on landing page (with mute option) to set atmosphere

**Visual Assets:**
- `window_square.png` - Applied to all 6 faces of the central building cube
- `window.jpeg` & `window2.jpeg` - Randomly assigned to memories for visual variety
- Window opacity: 85% default, 100% on hover for "lights turning on" effect

### Database Schema (Supabase)
```sql
-- Memories table
CREATE TABLE memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audio_url TEXT NOT NULL,
  raw_recording_url TEXT,
  window_variant INTEGER DEFAULT 1, -- 1 for window.jpeg, 2 for window2.jpeg
  prompt_id INTEGER REFERENCES prompts(id),
  location_city TEXT,
  location_country TEXT,
  latitude DECIMAL,
  longitude DECIMAL,
  play_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Note: Window images are consistent assets, not stored per-memory
-- The 3D position is calculated from lat/lng coordinates

-- Prompts table
CREATE TABLE prompts (
  id SERIAL PRIMARY KEY,
  text TEXT NOT NULL,
  active BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Analytics table for tracking interactions
CREATE TABLE memory_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_id UUID REFERENCES memories(id),
  interaction_type TEXT, -- 'play', 'share', 'download', 'hover'
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Appendix B: Legal Considerations

- Terms of Service required before recording
- Rights to use submissions for promotional purposes
- Age restriction (13+) for participation
- Clear data retention and deletion policy
- Music licensing for instrumental track usage