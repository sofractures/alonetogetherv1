import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { rateLimit, getClientIP, RATE_LIMITS } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  // SECURITY: Rate limit read requests
  const clientIP = getClientIP(req.headers);
  const rateLimitResult = rateLimit(`skyline-read:${clientIP}`, RATE_LIMITS.READ);
  
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429 }
    );
  }
  const { data, error } = await supabaseServer
    .from("skyline_memories")
    .select("id, text, prompt, created_at")
    .order("created_at", { ascending: true })
    .limit(500);

  if (error) {
    console.error("Error fetching skyline memories:", error);
    return NextResponse.json(
      { error: "Failed to load skyline memories" },
      { status: 500 }
    );
  }

  return NextResponse.json({ memories: data ?? [] });
}

// SECURITY: Sanitize text input
function sanitizeText(input: string): string {
  return input.replace(/[<>]/g, '').trim(); // Remove potential XSS chars
}

export async function POST(req: NextRequest) {
  try {
    // SECURITY: Rate limit write requests more strictly
    const clientIP = getClientIP(req.headers);
    const rateLimitResult = rateLimit(`skyline-write:${clientIP}`, RATE_LIMITS.WRITE);
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Too many submissions. Please wait a moment." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const rawText = typeof body.text === "string" ? body.text : "";
    const prompt =
      typeof body.prompt === "string" && body.prompt.trim().length > 0
        ? body.prompt.trim()
        : null;

    // SECURITY: Sanitize user input
    const text = sanitizeText(rawText);

    if (text.length < 5) {
      return NextResponse.json(
        { error: "Memory is too short. Please share a bit more." },
        { status: 400 }
      );
    }

    if (text.length > 1000) {
      return NextResponse.json(
        { error: "Memory is too long. Please keep it under 1000 characters." },
        { status: 400 }
      );
    }

    // SECURITY: Also sanitize prompt if present
    const sanitizedPrompt = prompt ? sanitizeText(prompt).slice(0, 200) : null;

    const { data, error } = await supabaseServer
      .from("skyline_memories")
      .insert({ text, prompt: sanitizedPrompt })
      .select("id, text, prompt, created_at")
      .single();

    if (error) {
      console.error("Error inserting skyline memory:", error);
      return NextResponse.json(
        { error: "Failed to save memory" },
        { status: 500 }
      );
    }

    return NextResponse.json({ memory: data }, { status: 201 });
  } catch (err) {
    console.error("Unexpected error in POST /skyline-memories:", err);
    return NextResponse.json(
      { error: "Unexpected error while saving memory" },
      { status: 500 }
    );
  }
}


