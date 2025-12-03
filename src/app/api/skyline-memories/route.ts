import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export async function GET() {
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawText = typeof body.text === "string" ? body.text : "";
    const prompt =
      typeof body.prompt === "string" && body.prompt.trim().length > 0
        ? body.prompt.trim()
        : null;

    const text = rawText.trim();

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

    const { data, error } = await supabaseServer
      .from("skyline_memories")
      .insert({ text, prompt })
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


