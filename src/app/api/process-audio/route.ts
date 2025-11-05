import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const inputPath = body?.path as string | undefined;
    const memoryId = (body?.memoryId as string | null) ?? null;
    if (!inputPath) {
      return NextResponse.json({ error: 'Missing path' }, { status: 400 });
    }

    // Check if Lambda function URL is configured
    const lambdaFunctionUrl = process.env.AWS_LAMBDA_FUNCTION_URL;
    if (!lambdaFunctionUrl) {
      return NextResponse.json({
        error: 'AWS Lambda function URL not configured. Please set AWS_LAMBDA_FUNCTION_URL environment variable.',
      }, { status: 500 });
    }

    // Get Supabase credentials for Lambda
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({
        error: 'Supabase credentials not configured',
      }, { status: 500 });
    }

    // Invoke AWS Lambda function
    try {
      const lambdaResponse = await fetch(lambdaFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputPath,
          instrumentalPath: 'instrumental.mp3',
          memoryId,
          supabaseUrl,
          supabaseKey,
        }),
      });

      const lambdaData = await lambdaResponse.json();

      if (!lambdaResponse.ok || lambdaData.statusCode !== 200) {
        const errorMsg = lambdaData.body ? (typeof lambdaData.body === 'string' ? JSON.parse(lambdaData.body) : lambdaData.body) : lambdaData;
        return NextResponse.json({
          error: errorMsg.error || 'Lambda processing failed',
          details: errorMsg.details,
        }, { status: lambdaResponse.status || 500 });
      }

      // Parse Lambda response
      const result = typeof lambdaData.body === 'string' ? JSON.parse(lambdaData.body) : lambdaData.body;

      // Create signed URL from Supabase (Lambda returns path, we create signed URL)
      const { data: signedData } = await supabaseServer
        .storage
        .from('processed-songs')
        .createSignedUrl(result.processedPath, 300);
      const signedUrl = signedData?.signedUrl ?? null;

      // Diagnostics: verify object exists
      const listRes = await supabaseServer
        .storage
        .from('processed-songs')
        .list('final', { limit: 1, sortBy: { column: 'created_at', order: 'desc' } });

      return NextResponse.json({
        processedPath: result.processedPath,
        signedUrl: signedUrl || result.signedUrl,
        diagnostics: { listCount: (listRes.data?.length ?? 0) },
      }, { status: 200 });
    } catch (lambdaError) {
      const errorMsg = lambdaError instanceof Error ? lambdaError.message : 'Lambda invocation failed';
      return NextResponse.json({
        error: 'Failed to invoke Lambda function',
        details: errorMsg,
      }, { status: 500 });
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Processing failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
