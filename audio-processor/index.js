const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { execFile } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { v4: uuidv4 } = require('uuid');

const execFileAsync = promisify(execFile);

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3001;

// Make sure we listen on 0.0.0.0 (Railway requirement)
const HOST = '0.0.0.0';

// Log env presence (no secrets)
const hasSupabaseUrl = !!process.env.SUPABASE_URL;
const hasSupabaseKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
console.log('Env check: SUPABASE_URL:', hasSupabaseUrl, ' SUPABASE_SERVICE_ROLE_KEY:', hasSupabaseKey);

// Initialize Supabase client (will be set when processing requests)
let supabase = null;

function getSupabaseClient() {
  if (!supabase) {
    const supabaseUrl = (process.env.SUPABASE_URL || '').trim();
    const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    }
    
    // SECURITY: Only log format validation result, not any part of the key
    const isJWT = supabaseKey.startsWith('eyJ');
    const isNewFormat = supabaseKey.startsWith('sb_secret_');
    
    if (!isJWT && !isNewFormat) {
      console.error('[ERROR] Supabase key format unrecognized. Expected JWT or sb_secret_ format.');
    } else {
      console.log('[INFO] Supabase client initialized successfully');
    }
    
    supabase = createClient(supabaseUrl, supabaseKey);
  }
  return supabase;
}

async function toBuffer(data) {
  // Browser Blob-like
  if (data && typeof data.arrayBuffer === 'function') {
    const ab = await data.arrayBuffer();
    return Buffer.from(ab);
  }
  // Node Buffer
  if (Buffer.isBuffer(data)) {
    return data;
  }
  // Node Readable stream
  if (data && typeof data.pipe === 'function') {
    const chunks = [];
    return await new Promise((resolve, reject) => {
      data.on('data', (c) => chunks.push(c));
      data.on('end', () => resolve(Buffer.concat(chunks)));
      data.on('error', reject);
    });
  }
  throw new Error('Unsupported download data type');
}

app.post('/process-audio', async (req, res) => {
  let tmpdir;
  
  try {
    const { inputPath, instrumentalPath = 'instrumental.mp3', memoryId } = req.body;
    const normalizedInputPath = String(inputPath || '').trim().replace(/^\/+/, '');
    const normalizedInstPath = String(instrumentalPath || 'instrumental.mp3').trim().replace(/^\/+/, '');

    if (!normalizedInputPath) {
      return res.status(400).json({ error: 'Missing inputPath' });
    }

    // Get Supabase client (validates env vars)
    const supabase = getSupabaseClient();

    // Create temporary directory
    tmpdir = await fs.mkdtemp(path.join(os.tmpdir(), 'audio-processor-'));
    const voicePath = path.join(tmpdir, 'voice.webm');
    const instrumentalPathLocal = path.join(tmpdir, 'instrumental.mp3');
    const outputPath = path.join(tmpdir, 'output.mp3');

    // 1) Download voice recording from Supabase Storage
    console.log('Processing request', { inputPath: normalizedInputPath, instrumentalPath: normalizedInstPath });
    
    // Try signed URL method first (more reliable with new Supabase API)
    let voiceBuf = null;
    try {
      console.log('Creating signed URL for voice recording...', { path: normalizedInputPath, bucket: 'memory-songs' });
      const { data: signed, error: signErr } = await supabase.storage
        .from('memory-songs')
        .createSignedUrl(normalizedInputPath, 300);
      
      if (signErr || !signed?.signedUrl) {
        console.error('Signed URL creation failed:', { error: signErr, path: normalizedInputPath });
        // Fallback to direct download
        console.log('Attempting direct download fallback...');
        const { data: voiceData, error: voiceError } = await supabase.storage
          .from('memory-songs')
          .download(normalizedInputPath);
        
        if (voiceError || !voiceData) {
          // Try to read error body if available
          let errorDetails = voiceError?.message || signErr?.message || 'Unknown error';
          console.error('Direct download also failed:', { 
            voiceError: voiceError?.message, 
            signErr: signErr?.message,
            path: normalizedInputPath 
          });
          if (voiceError?.originalError?.body) {
            try {
              const errorBody = await voiceError.originalError.body.text();
              errorDetails = errorBody || errorDetails;
            } catch {}
          }
          return res.status(500).json({
            error: 'Failed to download voice recording',
            details: errorDetails,
            path: normalizedInputPath
          });
        }
        voiceBuf = await toBuffer(voiceData);
        console.log('Direct download succeeded, buffer size:', voiceBuf.length);
      } else {
        console.log('Fetching from signed URL:', signed.signedUrl.substring(0, 100) + '...');
        const resp = await fetch(signed.signedUrl);
        if (!resp.ok) {
          const errorText = await resp.text().catch(() => '');
          console.error('Signed URL fetch failed:', { status: resp.status, statusText: resp.statusText, errorText });
          return res.status(500).json({
            error: 'Failed to download voice recording',
            details: `HTTP ${resp.status}: ${errorText || resp.statusText}`,
            path: normalizedInputPath
          });
        }
        voiceBuf = Buffer.from(await resp.arrayBuffer());
        console.log('Signed URL download succeeded, buffer size:', voiceBuf.length);
      }
      await fs.writeFile(voicePath, voiceBuf);
      console.log('Voice recording downloaded successfully, file size:', voiceBuf.length, 'bytes');
    } catch (error) {
      console.error('Voice download exception:', { error: error.message, stack: error.stack, path: normalizedInputPath });
      return res.status(500).json({ 
        error: 'Failed to download voice recording',
        details: error.message || String(error),
        path: normalizedInputPath
      });
    }

    // 2) Download instrumental from Supabase Storage (assets bucket)
    let instBuf = null;
    try {
      console.log('Downloading instrumental...');
      // Try signed URL first
      const { data: instSigned, error: instSignErr } = await supabase.storage
        .from('assets')
        .createSignedUrl(normalizedInstPath, 300);
      
      if (instSignErr || !instSigned?.signedUrl) {
        console.log('Signed URL failed, trying direct download...');
        const { data: instData, error: instError } = await supabase.storage
          .from('assets')
          .download(normalizedInstPath);
        
        if (instError || !instData) {
          // Fallback to public URL (if assets bucket is public)
          console.log('Trying public URL fallback...');
          const publicUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/assets/${encodeURIComponent(normalizedInstPath)}`;
          const resp = await fetch(publicUrl);
          if (!resp.ok) {
            return res.status(500).json({
              error: 'Failed to load instrumental',
              details: instError?.message || instSignErr?.message || `HTTP ${resp.status}`
            });
          }
          instBuf = Buffer.from(await resp.arrayBuffer());
        } else {
          instBuf = await toBuffer(instData);
        }
      } else {
        console.log('Fetching instrumental from signed URL...');
        const resp = await fetch(instSigned.signedUrl);
        if (!resp.ok) {
          return res.status(500).json({
            error: 'Failed to load instrumental',
            details: `HTTP ${resp.status}: ${resp.statusText}`
          });
        }
        instBuf = Buffer.from(await resp.arrayBuffer());
      }
      await fs.writeFile(instrumentalPathLocal, instBuf);
      console.log('Instrumental downloaded successfully');
    } catch (error) {
      console.error('Instrumental download exception:', error);
      return res.status(500).json({ 
        error: 'Failed to load instrumental',
        details: error.message || String(error) 
      });
    }

    // 3) Two-pass loudnorm normalization for consistent input levels
    // Pass 1: Analyze audio to measure current loudness characteristics
    const pass1Args = [
      '-i', voicePath,
      '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json',
      '-f', 'null',
      '-'
    ];

    console.log('Running loudnorm analysis pass...');
    let loudnormStats = null;
    try {
      const { stdout, stderr } = await execFileAsync('ffmpeg', pass1Args, { 
        timeout: 300000,
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer for JSON output
      });
      
      // FFmpeg outputs loudnorm stats to stderr in JSON format
      // Extract JSON from stderr (it's mixed with other output)
      const stderrStr = stderr || '';
      const jsonMatch = stderrStr.match(/\{[\s\S]*"input_i"[\s\S]*\}/);
      
      if (jsonMatch) {
        try {
          loudnormStats = JSON.parse(jsonMatch[0]);
          console.log('Loudnorm analysis complete:', {
            input_i: loudnormStats.input_i,
            input_tp: loudnormStats.input_tp,
            input_lra: loudnormStats.input_lra
          });
        } catch (parseError) {
          console.error('Failed to parse loudnorm stats JSON:', parseError);
          // Fall back to single-pass if JSON parsing fails
          loudnormStats = null;
        }
      } else {
        console.warn('Could not extract loudnorm stats from FFmpeg output, falling back to single-pass');
        loudnormStats = null;
      }
    } catch (error) {
      console.error('Loudnorm analysis pass error:', error.stderr || error.message);
      // Continue with single-pass normalization if analysis fails
      loudnormStats = null;
    }

    // Pass 2: Apply normalization using measured stats, then process with effects
    // If we have stats from pass 1, use them for accurate normalization
    // Otherwise, use single-pass loudnorm as fallback
    let normalizationFilter;
    if (loudnormStats && loudnormStats.input_i !== undefined) {
      // Two-pass: Use measured values for precise normalization
      normalizationFilter = `loudnorm=I=-16:TP=-1.5:LRA=11:` +
        `measured_I=${loudnormStats.input_i}:` +
        `measured_TP=${loudnormStats.input_tp}:` +
        `measured_LRA=${loudnormStats.input_lra}:` +
        `measured_thresh=${loudnormStats.input_thresh}:` +
        `offset=${loudnormStats.target_offset}`;
      console.log('Using two-pass loudnorm normalization');
    } else {
      // Single-pass fallback: Still normalize, but less precise
      normalizationFilter = 'loudnorm=I=-16:TP=-1.5:LRA=11:linear=true';
      console.log('Using single-pass loudnorm normalization (fallback)');
    }

    // Processing chain: Normalize → High-pass → Compression → Echo/Reverb → Volume Boost → Mix
    // Normalization makes all voices uniform, then we boost voice volume after effects for better mix balance
    // High-pass 80Hz, compression 3:1 (attack/release in ms), echo/reverb effect, boost +6dB for mix balance
    // aecho syntax: aecho=in_gain:out_gain:delays:decays (delays/decays are pipe-separated for multiple echoes)
    const filterComplex = `[0:a]${normalizationFilter},highpass=f=80,acompressor=ratio=3:attack=10:release=50:threshold=-10dB,aecho=0.8:0.9:1000|1800:0.3|0.25,volume=+6dB[voice];` +
      `[voice][1:a]amix=inputs=2:duration=longest[out]`;
    
    const ffmpegArgs = [
      '-i', voicePath,
      '-i', instrumentalPathLocal,
      '-filter_complex', filterComplex,
      '-map', '[out]',
      '-b:a', '320k',
      '-ac', '2',
      '-ar', '44100',
      '-y',
      outputPath
    ];

    console.log('Running FFmpeg processing pass with normalization and effects...');
    try {
      await execFileAsync('ffmpeg', ffmpegArgs, { timeout: 300000 }); // 5 minute timeout
      console.log('FFmpeg processing complete');
    } catch (error) {
      console.error('FFmpeg error:', error.stderr);
      return res.status(500).json({ 
        error: 'FFmpeg processing failed',
        details: error.stderr || error.message 
      });
    }

    // 4) Read processed output
    const processedData = await fs.readFile(outputPath);

    // 5) Upload to Supabase Storage (processed-songs bucket)
    const processedPath = `final/${uuidv4()}.mp3`;

    const { error: uploadError } = await supabase.storage
      .from('processed-songs')
      .upload(processedPath, processedData, {
        contentType: 'audio/mpeg',
        upsert: false
      });

    if (uploadError) {
      return res.status(500).json({ 
        error: 'Failed to upload processed audio',
        details: uploadError.message 
      });
    }

    // 6) Create signed URL
    let signedUrl = null;
    try {
      const { data: signedData, error: signedError } = await supabase.storage
        .from('processed-songs')
        .createSignedUrl(processedPath, 300); // 5 minutes

      if (!signedError && signedData) {
        signedUrl = signedData.signedUrl;
      }
    } catch (error) {
      console.error('Failed to create signed URL:', error);
    }

    // 7) Update database if memoryId provided
    if (memoryId) {
      try {
        console.log('[v0] Processor: Updating memory record', memoryId, 'with audio_url:', processedPath);
        const { data: updateData, error: updateError } = await supabase
          .from('memories')
          .update({ audio_url: processedPath })
          .eq('id', memoryId)
          .select('id, audio_url, latitude, longitude');
        
        if (updateError) {
          console.error('[v0] Processor: Failed to update database:', updateError);
          console.error('[v0] Processor: Error code:', updateError.code);
          console.error('[v0] Processor: Error message:', updateError.message);
          console.error('[v0] Processor: Error details:', updateError.details);
        } else if (updateData && updateData.length > 0) {
          console.log('[v0] Processor: Successfully updated memory record:', {
            id: updateData[0].id,
            audio_url: updateData[0].audio_url,
            hasLocation: !!(updateData[0].latitude && updateData[0].longitude)
          });
        } else {
          console.warn('[v0] Processor: Update succeeded but no rows were updated. Memory ID might not exist:', memoryId);
        }
      } catch (error) {
        console.error('[v0] Processor: Exception updating database:', error);
        // Don't fail the request if DB update fails
      }
    } else {
      console.warn('[v0] Processor: No memoryId provided, skipping database update');
    }

    // 8) Return success
    return res.status(200).json({
      processedPath,
      signedUrl,
      success: true
    });

  } catch (error) {
    console.error('Processing error:', error);
    return res.status(500).json({ 
      error: 'Processing failed',
      details: error.message 
    });
  } finally {
    // Clean up temporary directory
    if (tmpdir) {
      try {
        await fs.rm(tmpdir, { recursive: true, force: true });
      } catch (error) {
        console.error('Failed to clean up temp directory:', error);
      }
    }
  }
});

app.get('/health', (req, res) => {
  // Check if environment variables are set (but don't fail if not - just warn)
  const hasConfig = !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
  res.json({ 
    status: 'ok', 
    service: 'audio-processor',
    configured: hasConfig
  });
});

// SECURITY: Diagnostic endpoint - only available in development or with secret token
app.get('/diag', (req, res) => {
  // SECURITY: Require a secret token in production to prevent information disclosure
  const diagToken = process.env.DIAG_SECRET_TOKEN;
  const providedToken = req.headers['x-diag-token'] || req.query.token;
  
  // In production, require token. In development, allow without token
  if (process.env.NODE_ENV === 'production') {
    if (!diagToken) {
      return res.status(503).json({ error: 'Diagnostic endpoint disabled in production' });
    }
    if (providedToken !== diagToken) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }
  
  // SECURITY: Only return minimal, non-sensitive information
  res.json({
    status: 'ok',
    configured: !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
    nodeEnv: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, HOST, () => {
  console.log(`Audio processor server running on ${HOST}:${PORT}`);
  console.log(`Health check available at http://${HOST}:${PORT}/health`);
});

