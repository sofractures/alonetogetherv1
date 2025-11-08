# aLone Together - Technical Implementation Checklist

## 🎯 Pre-Development Setup

### Asset Preparation
- [ ] Create `/public/assets/` folder in Next.js project
- [ ] Add `instrumental.mp3` to `/public/assets/`
- [ ] Add `fullsong.mp3` to `/public/assets/`
- [ ] Add `window_square.png` to `/public/assets/`
- [ ] Add `window.jpeg` to `/public/assets/`
- [ ] Add `window2.jpeg` to `/public/assets/`
- [ ] Test all assets load correctly in browser
- [ ] Optimize image files (compress PNGs/JPEGs for web)
- [ ] Verify `instrumental.mp3` duration and structure for voice placement

### Supabase Configuration
- [x] Create Supabase project
- [x] Set up storage buckets:
  ```sql
  -- Run in Supabase SQL Editor
  INSERT INTO storage.buckets (id, name, public) VALUES 
    ('memory-songs', 'memory-songs', false),
    ('processed-songs', 'processed-songs', true);
  ```
- [x] Configure RLS policies for buckets
- [x] Create database tables:
  - [x] **CRITICAL: Create `memories` table** - See `CREATE_TABLE.sql` in project root
    - Table must exist before memory records can be created
    - `audio_url` must be nullable (set after processing)
    - Includes RLS policies and indexes
  ```sql
  -- See CREATE_TABLE.sql for complete script
  -- Key points:
  -- - audio_url TEXT (nullable, not NOT NULL)
  -- - RLS enabled with service_role policy
  -- - Indexes on location and audio_url
  ```
- [ ] Create `prompts` table (if needed):
  ```sql
  CREATE TABLE prompts (
    id SERIAL PRIMARY KEY,
    text TEXT NOT NULL,
    active BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
  );
  ```
- [ ] Create `memory_interactions` table (if needed):
  ```sql
  CREATE TABLE memory_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    memory_id UUID REFERENCES memories(id),
    interaction_type TEXT,
    created_at TIMESTAMP DEFAULT NOW()
  );
  ```
- [ ] Add initial prompts to database
- [ ] Set up Supabase environment variables in `.env.local`:
  ```
  NEXT_PUBLIC_SUPABASE_URL=your_url
  NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
  SUPABASE_SERVICE_ROLE_KEY=your_service_key
  ```

### Next.js Project Setup
- [ ] Initialize Next.js with TypeScript and Tailwind:
  ```bash
  npx create-next-app@latest alone-together --typescript --tailwind --app
  ```
- [ ] Install core dependencies:
  ```bash
  npm install @supabase/supabase-js
  npm install three @react-three/fiber @react-three/drei
  npm install zustand
  npm install framer-motion
  npm install lucide-react
  npm install recordrtc
  npm install wavesurfer.js
  npm install tone
  ```
- [ ] Configure TypeScript for Three.js types
- [ ] Set up Tailwind with dark theme variables
- [ ] Create folder structure:
  ```
  /components/
    /3d/
    /audio/
    /ui/
  /lib/
  /hooks/
  /types/
  ```

---

## 🎵 Phase 1: Audio Foundation

### Landing Page Audio
- [x] Create `components/audio/BackgroundAudio.tsx`:
  - [x] Load `fullsong.mp3` on mount
  - [x] Auto-play at 50% volume (updated from 30%)
  - [x] ~~Add mute/unmute toggle button~~ (removed per requirements)
  - [x] Implement fade out when recording starts
  - [x] Resume playback when returning to explore
- [x] Add audio context management in `lib/audio-context.ts`
- [x] Handle autoplay policies across browsers (user interaction required)
- [x] Test on mobile devices (iOS autoplay restrictions handled)

**Implementation Notes:**
- Used HTML5 Audio API for simplicity and reliability
- Implemented user interaction handler to bypass autoplay policy
- Audio starts on first click/tap/keypress anywhere on page
- Fade functions ready for recording and memory playback integration

**Status:**
- [x] Confirm next step: Recording Component

### Recording Component
- [x] Create `components/audio/AudioRecorder.tsx`:
  - [x] Use native MediaRecorder for browser recording (WebM/Opus)
  - [x] Add microphone permission request flow
  - [x] Create visual recording indicator (pulsing button)
  - [x] Add countdown timer (30 seconds max)
  - [ ] Implement waveform visualization during recording (currently level meter only)
  - [x] Add re-record option before submission
- [x] Create `hooks/useRecorder.ts` for recording logic
- [x] Add error handling for browser compatibility (basic)
- [ ] Test across different browsers and devices

**Implementation Notes (Recording):**
- Chose native `MediaRecorder` + Web Audio `AnalyserNode` for a lightweight setup (no extra deps).
- Capturing as WebM/Opus; final processed output will be MP3 in Phase 3.
- Implemented a real-time level meter; full waveform visualization can be added later if needed.

### Audio Upload Pipeline
- [x] Create `/api/memory/record/route.ts`:
  ```typescript
  // Key tasks:
  - Validate audio file (format, size, duration)
  - Upload to Supabase Storage bucket 'memory-songs'
  - Create database entry with location data
  - Return memory ID for processing
  ```
- [ ] Implement progress tracking for upload
- [ ] Add retry logic for failed uploads
- [ ] Create upload status UI component

---

## 🎨 Phase 2: 3D Visualization

### Central Building Cube
- [ ] Create `components/3d/BuildingCube.tsx`:
  - [ ] Load `window_square.png` texture
  - [ ] Apply texture to all 6 faces of BoxGeometry
  - [ ] Set size to 2x2x2 units
  - [ ] Add subtle rotation animation (optional)
  - [ ] Implement MeshStandardMaterial with metalness
- [ ] Test texture loading and display
- [ ] Optimize texture size for performance

### Memory Windows Component
- [ ] Adapt existing `components/3d/MemoryPoint.tsx`:
  - [ ] Load both window textures (`window.jpeg`, `window2.jpeg`)
  - [ ] Implement texture selection based on `window_variant`
  - [ ] Set up billboard effect (always face camera)
  - [ ] Add floating animation (sine wave on Y-axis)
  - [ ] Implement hover effects:
    - [ ] Scale to 130%
    - [ ] Opacity change (85% → 100%)
    - [ ] Purple glow (#a78bfa)
    - [ ] Show location label
  - [ ] Add click handler for audio playback
- [ ] Create texture preloading system
- [ ] Test performance with multiple windows

### 3D Scene Assembly
- [ ] Update `components/3d/MemoryGlobe.tsx`:
  - [ ] Set up Three.js scene with proper lighting
  - [ ] Position BuildingCube at center (0,0,0)
  - [ ] Implement lat/lng to 3D position conversion
  - [ ] Add intelligent clustering for overlapping locations
  - [ ] Configure OrbitControls:
    ```javascript
    minDistance: 6
    maxDistance: 20
    enablePan: false
    dampingFactor: 0.05
    ```
  - [ ] Add touch controls for mobile
  - [ ] Implement zoom limits
- [ ] Test with mock data (various location densities)
- [ ] Optimize for 100+ windows

### Performance Optimization
- [ ] Implement LOD (Level of Detail) for distant windows
- [ ] Add frustum culling for off-screen objects
- [ ] Use InstancedMesh for identical geometries
- [ ] Implement texture atlasing if needed
- [ ] Add loading states with Suspense boundaries

---

## 🔧 Phase 3: Audio Processing

### FFmpeg Integration Choice
- [x] **Selected: DigitalOcean Droplet + Dockerized Node.js + FFmpeg** (current approach)
  - [x] Analyzed FFmpeg WASM (doesn't work in serverless Node.js)
  - [x] Evaluated Cloudinary (limited audio processing capabilities)
  - [x] Evaluated AWS Lambda (too complex for setup)
  - [x] Implemented Node.js Express service with FFmpeg
  - [x] Containerized service with Docker
  - [x] Deployed to DigitalOcean Droplet
  - [x] Configured environment variables on container (SUPABASE_URL, legacy JWT service_role key)
  - [x] Health endpoint returns configured:true
  - [x] Test end-to-end processing flow from app - **WORKING** ✅

### Processing Pipeline Implementation
- [x] Create `/api/process-audio/route.ts`:
  ```typescript
  // Processing steps:
  1. Download user recording from Supabase
  2. Download instrumental.mp3
  3. Invoke external audio processor service (Droplet) via `AUDIO_PROCESSOR_URL`
  4. Service processes with FFmpeg:
     - Two-pass loudnorm normalization (-16 LUFS)
     - High-pass filter (80Hz)
     - Compression (3:1 ratio)
     - Echo/reverb effect
     - Volume boost (+6dB for mix balance)
     - Mix with instrumental
  5. Export as 320kbps MP3
  6. Upload to 'processed-songs' bucket
  7. Update database with final URL
  ```
- [x] Create DigitalOcean audio processor service (`audio-processor/index.js`):
  - [x] Node.js Express server
  - [x] Downloads from Supabase Storage (with signed URL fallback)
  - [x] Applies exact FFmpeg filter chain from spec:
    - Two-pass loudnorm normalization (-16 LUFS integrated loudness)
    - High-pass filter (80Hz)
    - Compression (3:1 ratio, attack=10ms, release=50ms)
    - Echo/reverb effect (aecho filter)
    - Volume boost (+6dB for mix balance)
    - Mix with instrumental (amix)
  - [x] Mixes voice + instrumental with effects
  - [x] Uploads processed MP3 to Supabase
  - [x] Creates signed URLs for playback
  - [x] Updates database record (if memoryId provided)
- [x] Configure DigitalOcean deployment:
  - [x] `package.json` with dependencies
  - [x] `Dockerfile` with FFmpeg installation
  - [x] Environment variables structure
  - [x] Port mapping (80:8080)
  - [x] Container restart policy (always)
- [x] Implement processing status UI (modal with "Processing…" message)
- [x] Add error handling in API route
- [x] Deploy to DigitalOcean Droplet - **COMPLETE** ✅
- [x] Test FFmpeg processing with real audio files - **WORKING** ✅
- [x] Add two-pass loudnorm normalization for consistent voice levels
- [x] Adjust voice volume boost from -6dB to +6dB for better mix balance
- [x] Add enhanced error logging for troubleshooting
- [ ] Add retry logic for failed processing (optional enhancement)

### Playback System
- [x] Basic playback UI after processing (integrated in recording overlay):
  - [x] Load processed audio from Supabase signed URL
  - [x] Native HTML5 audio player with controls
  - [x] Download button for processed MP3
- [ ] Create `components/audio/MemoryPlayer.tsx` (for 3D window playback):
  - [ ] Custom audio player UI with progress bar and scrubbing
  - [ ] Volume control
  - [ ] Share functionality
  - [ ] Full memory details display
- [ ] Integrate with 3D window click events
- [ ] Add keyboard controls for playback

---

## 📍 Phase 4: Location & Data Flow

### Geolocation Implementation
- [ ] Create `lib/location.ts`:
  - [ ] Browser geolocation API integration
  - [ ] IP-based fallback (using free service)
  - [ ] City-level precision only (privacy)
  - [ ] Manual location entry option
- [ ] Create location permission UI flow
- [ ] Test across different browsers/devices

### Data Fetching & Management
- [x] Create `/api/memories/map/route.ts`:
  - [x] Fetch all memories with locations
  - [x] Filter in JavaScript (avoids PostgREST syntax issues)
  - [x] Error handling with detailed logging
  - [ ] Implement pagination for large datasets
  - [ ] Add caching strategy
- [x] Set up Zustand store for memory state:
  - [x] Created `src/store/memoryStore.ts`
  - [x] Implements `fetchMemories()`, `selectMemory()`, `addMemory()`
  - [x] Error handling and loading states
- [ ] Implement real-time updates with Supabase subscriptions
- [ ] Add optimistic updates for new memories

### API Integration
- [ ] Create all API routes:
  - [x] `/api/memory/record` - Upload recording
  - [ ] `/api/memory/[id]` - Get single memory
  - [ ] `/api/memories/map` - Get all for visualization
  - [ ] `/api/memory/[id]/download` - Generate download URL
  - [ ] `/api/prompts/current` - Get active prompt
  - [x] `/api/process-audio` - Trigger processing (invokes Droplet service with FFmpeg)
    - [x] Invokes external audio processor via `AUDIO_PROCESSOR_URL`
    - [x] Handles processor responses
    - [x] Creates signed URLs for playback
    - [x] Error handling with diagnostics
  - [ ] Add rate limiting
  - [x] Implement error handling
  - [ ] Add request validation

### Supabase Integration Notes
- [x] Use `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (publishable) on the client
- [x] Use `SUPABASE_SERVICE_ROLE_KEY` (legacy JWT format `eyJ...`) ONLY on server (Droplet + API routes)
- [x] Note: New `sb_secret_...` format keys don't work with signed URL creation; must use legacy JWT format
- [x] Rotate/revoke any previously exposed keys; use legacy JWT service_role key for server-side operations

### Deployment Notes
- [x] Vercel env vars set: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `AUDIO_PROCESSOR_URL`
- [x] Droplet container run with: `-e SUPABASE_URL` and `-e SUPABASE_SERVICE_ROLE_KEY` (legacy JWT format) and correct port mapping
- [x] Health check OK at `http://165.22.122.171/health`
- [x] End-to-end processing tested and verified working ✅
- [x] Processed audio successfully uploaded to `processed-songs` bucket
- [x] Signed URLs generated for playback

### Reference Docs (DigitalOcean path)
- `CREDENTIALS_REFERENCE.md` — central place for env keys and rotation steps
- `DIGITALOCEAN_AUDIO_SETUP.md` — deploy, firewall, health, diagnostics, troubleshooting
- `CURSOR_SETUP_GUIDE.md` — how to reset context and drive Cursor with this approach
- `AUDIO_PROCESSING_ARCHITECTURE.md` — current high-level design

### Autoplay Policy Note
- [x] Ensure background audio only starts after explicit user interaction (Start button)

---

## 🎯 Phase 5: User Experience

### Complete User Flow
- [ ] Home overlays on top of always-on 3D scene
  - [x] Title + Start button (keep 3D explore visible in background)
  - [x] Start button begins background song
- [ ] Recording overlay (full-screen mobile, centered desktop)
  - [x] Static instruction and prompt:
        "Share a time when you felt a part of something bigger than you"
  - [x] Pause/mute background audio on open; resume on close/finish
  - [x] Recording interface (30s cap, level meter)
  - [x] Preview with Accept / Re-record
  - [x] Finish triggers upload (processing next)
- [x] Processing status UI (in recording overlay)
  - [x] Show in-overlay processing status: "Processing… we are creating your song."
  - [x] Prevent closing overlay while uploading/processing
  - [x] After processing completes, show playback UI with processed audio
  - [x] Display audio player with controls and download button
  - [ ] 3D map will display new memory automatically when implemented
- [x] Playback overlay after processing completes (integrated into recording overlay)
- [ ] Pin memory automatically on globe
- [ ] Location permission
- [ ] Smooth transitions between states
- [ ] Error/retry screens
- [ ] Abandoned session recovery

### Mobile Optimization
- [ ] Test touch controls for 3D scene
- [ ] Optimize recording interface for mobile
- [ ] Ensure modals are mobile-friendly
- [ ] Test on various screen sizes
- [ ] Handle orientation changes
- [ ] Implement PWA manifest

### Accessibility
- [ ] Add keyboard navigation for 3D scene
- [ ] Ensure proper ARIA labels
- [ ] Test with screen readers
- [ ] Add focus management
- [ ] Verify color contrast ratios
- [ ] Add alternative text for all images

---

## 🚀 Phase 6: Testing & Deployment

### Testing Checklist
- [ ] Unit tests for critical functions:
  - [ ] Audio processing logic
  - [ ] Location conversion
  - [ ] API endpoints
- [ ] Integration tests:
  - [ ] Recording → Processing → Playback flow
  - [ ] 3D scene with multiple windows
- [ ] Browser testing:
  - [ ] Chrome (desktop/mobile)
  - [ ] Safari (desktop/mobile)
  - [ ] Firefox
  - [ ] Edge
- [ ] Performance testing:
  - [ ] Load test with 100+ windows
  - [ ] Audio processing speed
  - [ ] Upload/download speeds
- [ ] User acceptance testing:
  - [ ] Complete user journey
  - [ ] Edge cases (no location, long recordings)

### Deployment Preparation
- [ ] Optimize build size:
  - [ ] Code splitting for 3D components
  - [ ] Lazy load heavy libraries
  - [ ] Compress assets
- [ ] Set up Vercel deployment:
  - [ ] Configure environment variables
  - [ ] Set up custom domain
  - [ ] Configure caching headers
- [ ] Set up monitoring:
  - [ ] Vercel Analytics
  - [ ] Error tracking (Sentry)
  - [ ] Performance monitoring
- [ ] Create backup strategy:
  - [ ] Database backups
  - [ ] Audio file backups
- [ ] Prepare scaling plan:
  - [ ] Vercel auto-scaling
  - [ ] Supabase tier upgrade path
  - [ ] CDN configuration

### Launch Day Checklist
- [ ] ✅ All assets uploaded and accessible
- [ ] ✅ Database seeded with initial content
- [ ] ✅ Processing pipeline tested end-to-end
- [ ] ✅ 3D scene performs well on target devices
- [ ] ✅ Audio playback works across browsers
- [ ] ✅ Location services functioning
- [ ] ✅ Download functionality verified
- [ ] ✅ Share functionality tested
- [ ] ✅ Analytics tracking confirmed
- [ ] ✅ Team briefed on monitoring
- [ ] ✅ Rollback plan ready
- [ ] ✅ Social media assets prepared

---

## 🐛 Common Issues & Solutions

### Audio Issues
| Issue | Solution |
|-------|----------|
| Autoplay blocked | Show play button, educate user |
| Recording fails | Check permissions, offer retry |
| Processing timeout | Implement queue, show status |
| Playback stutters | Preload audio, use CDN |

### 3D Performance
| Issue | Solution |
|-------|----------|
| Low FPS with many windows | Implement LOD, reduce texture size |
| Textures not loading | Add loading states, fallbacks |
| Mobile touch not working | Verify OrbitControls settings |
| Memory leaks | Dispose geometries/materials |

### Data Issues
| Issue | Solution |
|-------|----------|
| Location denied | Offer manual entry, IP fallback |
| Upload fails | Retry logic, chunked upload |
| Slow API calls | Add caching, optimize queries |
| Real-time updates lag | Batch updates, debounce |

---

## 📊 Success Metrics to Track

- [ ] Recording completion rate
- [ ] Average session duration
- [ ] Number of windows explored per session
- [ ] Share/download rates
- [ ] Geographic distribution
- [ ] Prompt performance (completion rates)
- [ ] Technical metrics (load time, error rate)
- [ ] Device/browser breakdown

---

## 🎉 Post-Launch Iterations

### Quick Wins (Week 1)
- [ ] Add more window variations
- [ ] Implement favorite/like system
- [ ] Add filter by date/location
- [ ] Optimize based on user feedback

### Version 1.1 Features (Month 1)
- [ ] Multiple recordings per user
- [ ] Social media integration
- [ ] Enhanced sharing (Instagram stories)
- [ ] Memory collections/playlists
- [ ] Artist commentary feature

---

*Check off items as completed. Update with findings and blockers as you progress.*