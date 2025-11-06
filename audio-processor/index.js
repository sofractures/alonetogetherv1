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
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    }
    
    supabase = createClient(supabaseUrl, supabaseKey);
  }
  return supabase;
}

app.post('/process-audio', async (req, res) => {
  let tmpdir;
  
  try {
    const { inputPath, instrumentalPath = 'instrumental.mp3', memoryId } = req.body;

    if (!inputPath) {
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
    try {
      const { data: voiceData, error: voiceError } = await supabase.storage
        .from('memory-songs')
        .download(inputPath);

      if (voiceError || !voiceData) {
        return res.status(500).json({ 
          error: 'Failed to download voice recording',
          details: voiceError?.message 
        });
      }

      // Convert blob to buffer and save
      const arrayBuffer = await voiceData.arrayBuffer();
      await fs.writeFile(voicePath, Buffer.from(arrayBuffer));
    } catch (error) {
      return res.status(500).json({ 
        error: 'Failed to download voice recording',
        details: error.message 
      });
    }

    // 2) Download instrumental from Supabase Storage (assets bucket)
    try {
      const { data: instData, error: instError } = await supabase.storage
        .from('assets')
        .download(instrumentalPath);

      if (instError || !instData) {
        return res.status(500).json({ 
          error: 'Failed to download instrumental',
          details: instError?.message 
        });
      }

      const arrayBuffer = await instData.arrayBuffer();
      await fs.writeFile(instrumentalPathLocal, Buffer.from(arrayBuffer));
    } catch (error) {
      return res.status(500).json({ 
        error: 'Failed to load instrumental',
        details: error.message 
      });
    }

    // 3) Process with FFmpeg (exact spec from IMPLEMENTATION.md)
    // High-pass 80Hz, reverb 25%, compression 3:1, normalize -6dB, mix with instrumental
    const ffmpegCmd = [
      'ffmpeg',
      '-i', voicePath,
      '-i', instrumentalPathLocal,
      '-filter_complex',
      '[0:a]highpass=f=80,acompressor=ratio=3:attack=0.005:release=0.05:threshold=-10dB,volume=-6dB[voice];' +
      '[voice]areverb=reverbance=25:room_scale=100:stereo_width=100:predelay=20:decay_time=2.5:wet_gain=0.25[reverb_voice];' +
      '[reverb_voice][1:a]amix=inputs=2:duration=longest[out]',
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

app.listen(PORT, HOST, () => {
  console.log(`Audio processor server running on ${HOST}:${PORT}`);
  console.log(`Health check available at http://${HOST}:${PORT}/health`);
});

