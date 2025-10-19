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
- [ ] Create Supabase project
- [ ] Set up storage buckets:
  ```sql
  -- Run in Supabase SQL Editor
  INSERT INTO storage.buckets (id, name, public) VALUES 
    ('memory-songs', 'memory-songs', false),
    ('processed-songs', 'processed-songs', true);
  ```
- [ ] Configure RLS policies for buckets
- [ ] Create database tables:
  ```sql
  CREATE TABLE memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    audio_url TEXT NOT NULL,
    raw_recording_url TEXT,
    window_variant INTEGER DEFAULT floor(random() * 2 + 1),
    prompt_id INTEGER REFERENCES prompts(id),
    location_city TEXT,
    location_country TEXT,
    latitude DECIMAL,
    longitude DECIMAL,
    play_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
  );
  
  CREATE TABLE prompts (
    id SERIAL PRIMARY KEY,
    text TEXT NOT NULL,
    active BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
  );
  
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
- [ ] Create `components/audio/BackgroundAudio.tsx`:
  - [ ] Load `fullsong.mp3` on mount
  - [ ] Auto-play at 30% volume
  - [ ] Add mute/unmute toggle button
  - [ ] Implement fade out when recording starts
  - [ ] Resume playback when returning to explore
- [ ] Add audio context management in `lib/audio-context.ts`
- [ ] Handle autoplay policies across browsers
- [ ] Test on mobile devices (iOS autoplay restrictions)

### Recording Component
- [ ] Create `components/audio/AudioRecorder.tsx`:
  - [ ] Implement RecordRTC for browser recording
  - [ ] Add microphone permission request flow
  - [ ] Create visual recording indicator (pulsing red button)
  - [ ] Add countdown timer (60 seconds max)
  - [ ] Implement waveform visualization during recording
  - [ ] Add re-record option before submission
- [ ] Create `hooks/useRecorder.ts` for recording logic
- [ ] Add error handling for browser compatibility
- [ ] Test across different browsers and devices

### Audio Upload Pipeline
- [ ] Create `/api/memory/record/route.ts`:
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
- [ ] **Option A: FFmpeg WASM** (if staying in-browser):
  - [ ] Install `@ffmpeg/ffmpeg`
  - [ ] Create worker for processing
  - [ ] Handle memory limitations
  - [ ] Test with `instrumental.mp3`
  
- [ ] **Option B: External Processing** (recommended):
  - [ ] Set up processing service:
    - [ ] Cloudinary audio API, OR
    - [ ] AWS Lambda with FFmpeg layer, OR
    - [ ] Dedicated Node.js server on Railway/Render
  - [ ] Create processing endpoint
  - [ ] Implement queue system

### Processing Pipeline Implementation
- [ ] Create `/api/process-audio/route.ts`:
  ```typescript
  // Processing steps:
  1. Download user recording from Supabase
  2. Download instrumental.mp3
  3. Apply FFmpeg filters:
     - High-pass filter (80Hz)
     - Reverb (25% wet)
     - Compression (3:1 ratio)
     - Normalize to -6dB
  4. Mix with instrumental
  5. Export as 320kbps MP3
  6. Upload to 'processed-songs' bucket
  7. Update database with final URL
  ```
- [ ] Test FFmpeg command locally:
  ```bash
  ffmpeg -i voice.wav -i assets/instrumental.mp3 \
    -filter_complex "[0:a]highpass=f=80,acompressor=ratio=3,reverb=50:50:60:0.5:0.5:2,volume=-6dB[voice];[voice][1:a]amix=inputs=2:duration=longest[out]" \
    -map "[out]" -b:a 320k output.mp3
  ```
- [ ] Implement processing status updates
- [ ] Add error handling and retry logic
- [ ] Create processing progress UI

### Playback System
- [ ] Create `components/audio/MemoryPlayer.tsx`:
  - [ ] Load processed audio from Supabase
  - [ ] Custom audio player UI
  - [ ] Progress bar with scrubbing
  - [ ] Volume control
  - [ ] Share functionality
  - [ ] Download button (for creator only)
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
- [ ] Create `/api/memories/map/route.ts`:
  - [ ] Fetch all memories with locations
  - [ ] Implement pagination for large datasets
  - [ ] Add caching strategy
- [ ] Set up Zustand store for memory state:
  ```typescript
  interface MemoryStore {
    memories: Memory[]
    selectedMemory: Memory | null
    isLoading: boolean
    // actions
    fetchMemories: () => Promise<void>
    selectMemory: (id: string) => void
  }
  ```
- [ ] Implement real-time updates with Supabase subscriptions
- [ ] Add optimistic updates for new memories

### API Integration
- [ ] Create all API routes:
  - [ ] `/api/memory/record` - Upload recording
  - [ ] `/api/memory/[id]` - Get single memory
  - [ ] `/api/memories/map` - Get all for visualization
  - [ ] `/api/memory/[id]/download` - Generate download URL
  - [ ] `/api/prompts/current` - Get active prompt
  - [ ] `/api/process-audio` - Trigger processing
- [ ] Add rate limiting
- [ ] Implement error handling
- [ ] Add request validation

---

## 🎯 Phase 5: User Experience

### Complete User Flow
- [ ] Create landing page with:
  - [ ] 3D building scene as hero
  - [ ] Brief explanation text
  - [ ] "Add Your Window" CTA button
  - [ ] Background audio controls
- [ ] Implement recording flow:
  - [ ] Prompt display screen
  - [ ] Recording interface
  - [ ] Processing feedback
  - [ ] Preview playback
  - [ ] Location permission
  - [ ] Success animation (window appearing)
- [ ] Add smooth transitions between states
- [ ] Create error/retry screens
- [ ] Implement abandoned session recovery

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