"use client";

import { ExploreMenu } from "@/components/ui/ExploreMenu";

export default function AboutPage() {

  return (
    <main className="relative min-h-[100dvh] bg-black text-left flex flex-col items-center justify-center px-4 py-10 sm:py-16">
      {/* Video background (same as skyline) */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="fixed inset-0 w-full h-full object-cover z-0"
        style={{
          opacity: 0.6,
          pointerEvents: "none",
        }}
      >
        <source src="/assets/video_clip_skyline.mp4" type="video/mp4" />
      </video>

      {/* Dark overlay for better text contrast */}
      <div
        className="fixed inset-0 bg-black/30 z-[1]"
        style={{ pointerEvents: "none" }}
      />
      {/* Top-right shared menu */}
      <ExploreMenu currentPage="about" />

      <div className="relative z-[2] w-full max-w-3xl space-y-8">
        <header className="space-y-2">
          <p className="text-xs sm:text-sm uppercase tracking-[0.2em]" style={{ color: '#e5ddc7' }}>
            About
          </p>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold" style={{ color: '#e5ddc7' }}>
            Alone Together
          </h1>
        </header>

        <section className="space-y-4" style={{ color: '#e5ddc7' }}>
          <p>
            Alone Together is an interactive music platform where your memories become music.
          </p>
          <p>
            Listen to the lead single from Sound of Fractures&apos; Alone Together EP, then record a voice
            note sharing a personal memory about connection, distance, or a moment you didn&apos;t want to
            forget. The platform blends your voice with the instrumental to create your own unique version of
            the track—a &quot;memory song&quot; that belongs to you.
          </p>
          <p>
            Your memory gets pinned to a global map, creating a living emotional landscape where anyone can
            explore memories from around the world. Listen to how others have responded to the same song,
            discover shared experiences across continents, and feel part of a global community connected
            through music and memory.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl sm:text-2xl font-semibold" style={{ color: '#e5ddc7' }}>
            About Sound of Fractures
          </h2>
          <div className="space-y-3 text-sm sm:text-base" style={{ color: '#e5ddc7' }}>
            <p>
              Jamie Reddington, known artistically as Sound of Fractures, is a UK-based electronic artist,
              producer, and educator experimenting with how we connect through music. With 20 years of
              experience across the music industry and as Deputy Course Leader of MA Music Management at
              Westminster University, Jamie combines practical innovation with academic research to explore
              new creative career models.
            </p>
            <p>
              Drawing from UK dance music, hip-hop, and soul—with influences from Jamie xx, Burial, and
              Bicep—Jamie creates what he calls &quot;emotional electronic music,&quot; blending found sounds
              (including his daughter&apos;s heartbeat) with personal storytelling. His work has been featured
              on BBC Radio 1 and covered by Mixmag, Music Ally, and Magnetic Magazine.
            </p>
            <p>
              Jamie&apos;s previous project, SCENES, engaged 350+ fans who contributed memories and photos that
              became integral to the album artwork and experience, achieving over 1 million streams while
              maintaining its collaborative core. His approach champions world-building over algorithms,
              asking audiences to participate rather than just consume.
            </p>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl sm:text-2xl font-semibold" style={{ color: '#e5ddc7' }}>
            How This Project is Funded
          </h2>
          <div className="space-y-3 text-sm sm:text-base" style={{ color: '#e5ddc7' }}>
            <p>
              Alone Together is made possible through direct patron support—an alternative funding model that
              prioritizes creative independence and meaningful community relationships over traditional
              industry structures. By supporting projects through patronage rather than relying solely on
              streaming revenue or corporate backing, this work remains artist-owned and audience-driven.
            </p>
            <p>
              The project is executive produced by CY Lee, whose support enables the platform development,
              interactive installations, and broader creative vision to come to life.
            </p>
            <p>
              This isn&apos;t just streaming—it&apos;s participation.
            </p>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl sm:text-2xl font-semibold" style={{ color: '#e5ddc7' }}>
            Why Alone Together
          </h2>
          <p className="text-sm sm:text-base" style={{ color: '#e5ddc7' }}>
            In an age of digital isolation, algorithmic feeds, and endless scrolling, Alone Together offers a
            different kind of connection—one built on shared vulnerability, personal storytelling, and the
            recognition that we&apos;re all living parallel lives, alone but emotionally together.
          </p>
        </section>
      </div>
    </main>
  );
}


