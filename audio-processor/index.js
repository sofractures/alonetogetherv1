const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { v4: uuidv4 } = require('uuid');

const execAsync = promisify(exec);

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
    
    // Diagnostic: log key format (first 20 chars only for security)
    const keyPrefix = supabaseKey.substring(0, 20);
    const isJWT = supabaseKey.startsWith('eyJ');
    const isNewFormat = supabaseKey.startsWith('sb_secret_');
    console.log(`[DIAG] Key format check: prefix="${keyPrefix}...", isJWT=${isJWT}, isNewFormat=${isNewFormat}, length=${supabaseKey.length}`);
    
    if (!isJWT && !isNewFormat) {
      console.error(`[ERROR] Key format unrecognized! Expected JWT (eyJ...) or new format (sb_secret_...), got: ${keyPrefix}...`);
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
      console.log('Creating signed URL for voice recording...');
      const { data: signed, error: signErr } = await supabase.storage
        .from('memory-songs')
        .createSignedUrl(normalizedInputPath, 300);
      
      if (signErr || !signed?.signedUrl) {
        console.error('Signed URL creation failed:', signErr);
        // Fallback to direct download
        const { data: voiceData, error: voiceError } = await supabase.storage
          .from('memory-songs')
          .download(normalizedInputPath);
        
        if (voiceError || !voiceData) {
          // Try to read error body if available
          let errorDetails = voiceError?.message || signErr?.message || 'Unknown error';
          if (voiceError?.originalError?.body) {
            try {
              const errorBody = await voiceError.originalError.body.text();
              errorDetails = errorBody || errorDetails;
            } catch {}
          }
          return res.status(500).json({
            error: 'Failed to download voice recording',
            details: errorDetails
          });
        }
        voiceBuf = await toBuffer(voiceData);
      } else {
        console.log('Fetching from signed URL:', signed.signedUrl.substring(0, 100) + '...');
        const resp = await fetch(signed.signedUrl);
        if (!resp.ok) {
          const errorText = await resp.text().catch(() => '');
          return res.status(500).json({
            error: 'Failed to download voice recording',
            details: `HTTP ${resp.status}: ${errorText || resp.statusText}`
          });
        }
        voiceBuf = Buffer.from(await resp.arrayBuffer());
      }
      await fs.writeFile(voicePath, voiceBuf);
      console.log('Voice recording downloaded successfully');
    } catch (error) {
      console.error('Voice download exception:', error);
      return res.status(500).json({ 
        error: 'Failed to download voice recording',
        details: error.message || String(error) 
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

    // 3) Process with FFmpeg (validated parameters)
    // High-pass 80Hz, compression 3:1 (attack/release in ms), gentle reverb, normalize -6dB, mix with instrumental
    // areverb syntax: areverb=level_in:level_out:reverberance:hf_damping:room_scale:stereo_depth:pre_delay:wet_gain
    const ffmpegCmd = [
      'ffmpeg',
      '-i', voicePath,
      '-i', instrumentalPathLocal,
      '-filter_complex',
      '[0:a]highpass=f=80,acompressor=ratio=3:attack=10:release=50:threshold=-10dB,areverb=1.0:1.0:25:50:100:100:20:0.25,volume=-6dB[voice];' +
      '[voice][1:a]amix=inputs=2:duration=longest[out]',
      '-map', '[out]',
      '-b:a', '320k',
      '-ac', '2',
      '-ar', '44100',
      '-y',
      outputPath
    ].join(' ');

    try {
      await execAsync(ffmpegCmd, { timeout: 300000 }); // 5 minute timeout
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
        await supabase
          .from('memories')
          .update({ audio_url: processedPath })
          .eq('id', memoryId);
      } catch (error) {
        console.error('Failed to update database:', error);
        // Don't fail the request if DB update fails
      }
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

app.get('/diag', (req, res) => {
  // Diagnostic endpoint to check environment variables (without exposing secrets)
  const envVars = Object.keys(process.env).filter(key => 
    key.includes('SUPABASE') || key.includes('RAILWAY')
  );
  const envInfo = {};
  envVars.forEach(key => {
    envInfo[key] = process.env[key] ? 
      (key.includes('KEY') ? '***SET***' : process.env[key]) : 
      'NOT SET';
  });
  
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const keyPrefix = key.substring(0, 20);
  const isJWT = key.startsWith('eyJ');
  const isNewFormat = key.startsWith('sb_secret_');
  
  res.json({
    hasSupabaseUrl: !!process.env.SUPABASE_URL,
    hasSupabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    supabaseUrlValue: process.env.SUPABASE_URL ? 'SET' : 'NOT SET',
    supabaseKeyValue: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'NOT SET',
    keyFormat: {
      prefix: keyPrefix + '...',
      isJWT: isJWT,
      isNewFormat: isNewFormat,
      length: key.length
    },
    allEnvVars: envInfo,
    port: process.env.PORT,
    nodeEnv: process.env.NODE_ENV
  });
});

app.listen(PORT, HOST, () => {
  console.log(`Audio processor server running on ${HOST}:${PORT}`);
  console.log(`Health check available at http://${HOST}:${PORT}/health`);
});

