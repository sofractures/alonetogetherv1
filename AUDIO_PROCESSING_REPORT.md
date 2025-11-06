# Audio Processing Implementation Report

## Executive Summary

We've attempted to implement audio processing for mixing voice recordings with an instrumental track, applying effects (high-pass filter, reverb, compression, normalization), and outputting a 320kbps MP3. Multiple approaches have been tried, each with specific limitations in serverless environments.

---

## Required Processing Pipeline (from IMPLEMENTATION.md)

1. Download user recording from Supabase Storage (`memory-songs` bucket)
2. Download instrumental.mp3 from Supabase Storage (`assets` bucket)
3. Apply FFmpeg filters:
   - High-pass filter (80Hz)
   - Reverb (25% wet)
   - Compression (3:1 ratio)
   - Normalize to -6dB
4. Mix voice with instrumental
5. Export as 320kbps MP3
6. Upload to Supabase Storage (`processed-songs` bucket)
7. Update database with final URL

**FFmpeg Command Reference:**
```bash
ffmpeg -i voice.webm -i instrumental.mp3 \
  -filter_complex "[0:a]highpass=f=80,acompressor=ratio=3,reverb=50:50:60:0.5:0.5:2,volume=-6dB[voice];[voice][1:a]amix=inputs=2:duration=longest[out]" \
  -map "[out]" -b:a 320k output.mp3
```

---

## Approaches Attempted

### 1. FFmpeg WASM (`@ffmpeg/ffmpeg`)

**Status:** ❌ Failed

**What We Tried:**
- Installed `@ffmpeg/ffmpeg` and `@ffmpeg/core`
- Implemented dynamic import for Turbopack compatibility
- Attempted to load FFmpeg WASM in Next.js API route
- Tried multiple import strategies and CDN core paths

**Issues Encountered:**
- `createFFmpeg` factory function not found in serverless environment
- Module exports not available in Node.js runtime
- FFmpeg WASM is designed for browser environments, not Node.js serverless
- Build errors: "Export createFFmpeg doesn't exist in target module"
- Runtime errors: "FFmpeg WASM factory not found"

**Root Cause:**
FFmpeg WASM is built for browser JavaScript execution, relying on WebAssembly APIs that are limited or unavailable in serverless Node.js environments (Vercel Functions). The `@ffmpeg/ffmpeg` package expects browser globals and Web Workers that don't exist in serverless contexts.

**Limitations:**
- ❌ Cannot run in Vercel serverless functions
- ❌ Requires browser environment
- ❌ Large bundle size (~25MB+)
- ❌ Memory-intensive operations

---

### 2. Cloudinary Audio Processing

**Status:** ⚠️ Partial (Currently Implemented)

**What We Tried:**
- Installed `cloudinary` SDK
- Uploaded voice recording and instrumental to Cloudinary
- Attempted to apply audio transformations
- Mix voice with instrumental using overlay/concatenation

**Current Implementation:**
- ✅ Downloads recordings from Supabase
- ✅ Uploads to Cloudinary
- ✅ Basic audio normalization
- ✅ Converts to MP3 320kbps
- ✅ Uploads processed result back to Supabase
- ❌ **Cannot apply exact FFmpeg filter chain**
- ❌ **Cannot properly mix audio tracks** (overlay doesn't work for audio mixing)

**Limitations:**
- ❌ No high-pass filter support (80Hz)
- ❌ Limited reverb control (can't set exact 25% wet mix)
- ❌ No compression ratio control (can't set 3:1 ratio)
- ❌ No precise volume normalization (-6dB)
- ❌ Cannot mix two audio tracks simultaneously (overlay is for video, concatenation joins sequentially)
- ⚠️ Requires Cloudinary account and API credentials
- ⚠️ Temporary files stored in Cloudinary (cleanup needed)

**What Works:**
- Basic audio format conversion (WebM → MP3)
- Bitrate adjustment (320kbps)
- Sample rate conversion (44.1kHz)
- Basic normalization

**What Doesn't Work:**
- Exact filter chain matching the spec
- Proper audio mixing (voice + instrumental simultaneously)
- Precise effect parameters

---

## Current State

**What's Working:**
1. ✅ Recording upload to Supabase Storage
2. ✅ Processing API endpoint structure
3. ✅ Basic Cloudinary integration (format conversion)
4. ✅ Upload processed file to Supabase Storage
5. ✅ Database updates
6. ✅ UI flow (processing modal, playback modal)
7. ✅ Download functionality

**What's Not Working:**
1. ❌ Exact audio processing per spec
2. ❌ Voice + instrumental mixing
3. ❌ Precise audio effects (high-pass, reverb, compression, normalization)

**Current Output:**
- Voice recording converted to MP3 320kbps (normalized)
- **No instrumental mixing**
- **No effects applied**

---

## Recommended Solution: AWS Lambda with FFmpeg Layer

### Why This is the Best Option

**Pros:**
- ✅ Full FFmpeg support (exact filter chain possible)
- ✅ Serverless (scales automatically)
- ✅ Can run exact FFmpeg commands from spec
- ✅ No infrastructure management (Lambda handles scaling)
- ✅ Pay-per-use pricing
- ✅ Integrates easily with Next.js API routes
- ✅ Can process files up to 512MB (Lambda temp storage)

**Cons:**
- ⚠️ Requires AWS account setup
- ⚠️ Requires Lambda deployment (separate from Vercel)
- ⚠️ Slight complexity in architecture (Vercel → Lambda → Supabase)

**Implementation Approach:**
1. Create AWS Lambda function with FFmpeg layer
2. Lambda downloads from Supabase Storage
3. Processes with exact FFmpeg command
4. Uploads result back to Supabase Storage
5. Returns processed path to Next.js API route

**Estimated Cost:**
- Lambda free tier: 1M requests/month
- After free tier: ~$0.20 per 1M requests
- Processing time: ~$0.0000166667 per GB-second
- For 10,000 processes/month: ~$0-5 (mostly free tier)

---

## Alternative Solutions Considered

### Option 2: Dedicated Node.js Server (Railway/Render)

**Pros:**
- ✅ Full FFmpeg binary support
- ✅ Simple implementation
- ✅ Complete control

**Cons:**
- ❌ Requires separate server management
- ❌ Scaling requires manual configuration
- ❌ Higher base cost (~$5-20/month minimum)
- ❌ More infrastructure to maintain

**Verdict:** Good for high-volume, but overkill for MVP.

---

### Option 3: Bannerbear (FFmpeg API Service)

**Pros:**
- ✅ API-based (no infrastructure)
- ✅ Supports FFmpeg transformations
- ✅ Simple REST API

**Cons:**
- ⚠️ Requires third-party service dependency
- ⚠️ Pricing may be higher than Lambda
- ⚠️ Limited customization compared to direct FFmpeg

**Verdict:** Good alternative, but Lambda is more cost-effective.

---

### Option 4: Browser-Based FFmpeg (Client-Side)

**Pros:**
- ✅ No server processing needed
- ✅ Uses FFmpeg WASM (which we already tried)

**Cons:**
- ❌ Heavy client-side processing (battery drain)
- ❌ Slower on mobile devices
- ❌ User must wait during processing
- ❌ Large bundle size
- ❌ Memory limitations on low-end devices

**Verdict:** Not suitable for production quality requirements.

---

## Recommendation: AWS Lambda with FFmpeg Layer

### Implementation Plan

**Phase 1: Setup (1-2 hours)**
1. Create AWS account
2. Set up Lambda function with FFmpeg layer
3. Configure IAM permissions for Supabase access
4. Deploy Lambda function

**Phase 2: Integration (2-3 hours)**
1. Update Next.js API route to invoke Lambda
2. Lambda downloads from Supabase Storage
3. Lambda processes with FFmpeg
4. Lambda uploads to Supabase Storage
5. Return processed path to Next.js

**Phase 3: Testing (1 hour)**
1. Test with sample recordings
2. Verify exact filter chain output
3. Test error handling
4. Verify cleanup

**Total Estimated Time:** 4-6 hours

### Code Structure

**Next.js API Route (`/api/process-audio`):**
```typescript
// Invoke Lambda function
const response = await fetch(LAMBDA_FUNCTION_URL, {
  method: 'POST',
  body: JSON.stringify({
    inputPath: 'recordings/xxx.webm',
    instrumentalPath: 'instrumental.mp3',
    memoryId: 'xxx'
  })
});
```

**Lambda Function:**
```python
# Downloads from Supabase
# Runs FFmpeg command
# Uploads to Supabase
# Returns processed path
```

---

## Decision Matrix

| Solution | Exact Spec Match | Cost | Complexity | Scalability | Maintenance |
|----------|-----------------|------|------------|-------------|-------------|
| **AWS Lambda** | ✅ Yes | 💰 Low | 🟡 Medium | ✅ Excellent | ✅ Low |
| Dedicated Server | ✅ Yes | 💰 Medium | 🟡 Medium | 🟡 Good | 🟡 Medium |
| Bannerbear | ✅ Yes | 💰 Medium | 🟢 Low | ✅ Excellent | ✅ Low |
| Cloudinary | ❌ No | 💰 Low | 🟢 Low | ✅ Excellent | ✅ Low |
| FFmpeg WASM | ✅ Yes | 💰 Free | 🔴 High | ❌ Poor | 🟡 Medium |

---

## Next Steps

1. **Immediate:** Review this report and decide on approach
2. **If AWS Lambda chosen:**
   - I'll implement Lambda function with FFmpeg
   - Update Next.js API route to invoke Lambda
   - Test end-to-end processing
3. **If alternative chosen:**
   - Specify preferred solution
   - I'll implement accordingly

---

## Current Code Status

**Working:**
- `/api/process-audio/route.ts` - Cloudinary implementation (basic processing)
- Upload/download flow
- UI processing modal
- Playback functionality

**Needs Upgrade:**
- Audio processing to match exact spec
- Voice + instrumental mixing
- Precise effect application

---

## Summary

**Current State:** Basic processing works, but doesn't match spec requirements.

**Best Path Forward:** AWS Lambda with FFmpeg layer for exact spec matching with serverless scalability.

**Timeline:** 4-6 hours to implement full FFmpeg processing via Lambda.

**Cost:** Minimal (mostly AWS free tier).

---

*Report generated: Current session*
*Status: Awaiting decision on implementation approach*

