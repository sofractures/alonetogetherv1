import json
import os
import subprocess
import tempfile
import boto3
from supabase import create_client, Client
import requests

# Initialize Supabase client
SUPABASE_URL = os.environ.get('SUPABASE_URL')
SUPABASE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')

def lambda_handler(event, context):
    """
    Process audio: mix voice recording with instrumental using FFmpeg.
    
    Expected event:
    {
        "inputPath": "recordings/uuid.webm",
        "instrumentalPath": "instrumental.mp3",
        "memoryId": "uuid",
        "supabaseUrl": "https://xxx.supabase.co",
        "supabaseKey": "xxx"
    }
    """
    try:
        # Parse input
        body = json.loads(event.get('body', '{}')) if isinstance(event.get('body'), str) else event.get('body', {})
        input_path = body.get('inputPath')
        instrumental_path = body.get('instrumentalPath', 'instrumental.mp3')
        memory_id = body.get('memoryId')
        supabase_url = body.get('supabaseUrl') or SUPABASE_URL
        supabase_key = body.get('supabaseKey') or SUPABASE_KEY
        
        if not input_path:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'Missing inputPath'})
            }
        
        if not supabase_url or not supabase_key:
            return {
                'statusCode': 500,
                'body': json.dumps({'error': 'Supabase credentials not configured'})
            }
        
        supabase: Client = create_client(supabase_url, supabase_key)
        
        # Create temporary directory
        with tempfile.TemporaryDirectory() as tmpdir:
            voice_path = os.path.join(tmpdir, 'voice.webm')
            instrumental_path_local = os.path.join(tmpdir, 'instrumental.mp3')
            output_path = os.path.join(tmpdir, 'output.mp3')
            
            # 1) Download voice recording from Supabase Storage
            try:
                voice_response = supabase.storage.from_('memory-songs').download(input_path)
                if not voice_response:
                    return {
                        'statusCode': 500,
                        'body': json.dumps({'error': 'Failed to download voice recording: empty response'})
                    }
                # Supabase Python client returns bytes directly
                voice_data = voice_response if isinstance(voice_response, bytes) else bytes(voice_response)
                with open(voice_path, 'wb') as f:
                    f.write(voice_data)
            except Exception as e:
                return {
                    'statusCode': 500,
                    'body': json.dumps({'error': f'Failed to download voice recording: {str(e)}'})
                }
            
            # 2) Download instrumental from Supabase Storage (assets bucket)
            try:
                inst_response = supabase.storage.from_('assets').download(instrumental_path)
                if not inst_response:
                    return {
                        'statusCode': 500,
                        'body': json.dumps({'error': 'Failed to download instrumental: empty response'})
                    }
                inst_data = inst_response if isinstance(inst_response, bytes) else bytes(inst_response)
                with open(instrumental_path_local, 'wb') as f:
                    f.write(inst_data)
            except Exception as e:
                return {
                    'statusCode': 500,
                    'body': json.dumps({'error': f'Failed to load instrumental: {str(e)}'})
                }
            
            # 3) Process with FFmpeg (exact spec from IMPLEMENTATION.md)
            # High-pass 80Hz, reverb 25%, compression 3:1, normalize -6dB, mix with instrumental
            ffmpeg_cmd = [
                'ffmpeg',
                '-i', voice_path,  # Voice input
                '-i', instrumental_path_local,  # Instrumental input
                '-filter_complex',
                '[0:a]highpass=f=80,acompressor=ratio=3,reverb=50:50:60:0.5:0.5:2,volume=-6dB[voice];[voice][1:a]amix=inputs=2:duration=longest[out]',
                '-map', '[out]',
                '-b:a', '320k',
                '-ar', '44100',
                '-y',  # Overwrite output
                output_path
            ]
            
            try:
                result = subprocess.run(
                    ffmpeg_cmd,
                    capture_output=True,
                    text=True,
                    check=True,
                    timeout=300  # 5 minute timeout
                )
            except subprocess.TimeoutExpired:
                return {
                    'statusCode': 500,
                    'body': json.dumps({'error': 'FFmpeg processing timed out'})
                }
            except subprocess.CalledProcessError as e:
                return {
                    'statusCode': 500,
                    'body': json.dumps({
                        'error': 'FFmpeg processing failed',
                        'details': e.stderr
                    })
                }
            
            # 4) Read processed output
            with open(output_path, 'rb') as f:
                processed_data = f.read()
            
            # 5) Upload to Supabase Storage (processed-songs bucket)
            import uuid
            processed_path = f"final/{uuid.uuid4()}.mp3"
            
            upload_result = supabase.storage.from_('processed-songs').upload(
                processed_path,
                processed_data,
                file_options={
                    'content-type': 'audio/mpeg',
                    'upsert': 'false'
                }
            )
            
            # Check for upload errors
            if isinstance(upload_result, dict) and upload_result.get('error'):
                return {
                    'statusCode': 500,
                    'body': json.dumps({'error': upload_result['error']})
                }
            
            # 6) Create signed URL
            try:
                signed_url_response = supabase.storage.from_('processed-songs').create_signed_url(
                    processed_path,
                    300  # 5 minutes
                )
                signed_url = signed_url_response.get('signedURL') if isinstance(signed_url_response, dict) else None
            except Exception as e:
                signed_url = None
                print(f"Failed to create signed URL: {e}")
            
            # 7) Update database if memoryId provided
            if memory_id:
                try:
                    supabase.table('memories').update({
                        'audio_url': processed_path
                    }).eq('id', memory_id).execute()
                except Exception as e:
                    # Log but don't fail
                    print(f"Failed to update database: {e}")
            
            # 8) Return success
            return {
                'statusCode': 200,
                'body': json.dumps({
                    'processedPath': processed_path,
                    'signedUrl': signed_url,
                    'success': True
                })
            }
    
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': 'Processing failed',
                'details': str(e)
            })
        }

