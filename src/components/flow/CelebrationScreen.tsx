"use client";

interface CelebrationScreenProps {
  isOpen: boolean;
  email: string;
  location?: string;
  onDownload: () => void;
  onExploreGlobe: () => void;
  onCreateAnother?: () => void;
}

export default function CelebrationScreen({
  isOpen,
  email,
  location,
  onDownload,
  onExploreGlobe,
  onCreateAnother,
}: CelebrationScreenProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-labelledby="celebration-title">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-md" />
      <div className="relative z-10 w-full max-w-lg mx-4 rounded-xl border border-white/20 bg-black/80 backdrop-blur-xl p-4 sm:p-6 md:p-8 text-center">
        {/* Success Animation */}
        <div className="mb-6">
          <div className="text-6xl mb-4">✨</div>
          <div className="text-4xl mb-2">🎉</div>
        </div>

        {/* Heading */}
        <h2 id="celebration-title" className="text-3xl font-bold mb-3" style={{ color: '#e5ddc7' }}>
          Your Memory is Live!
        </h2>

        {/* Message */}
        <p className="text-lg mb-2" style={{ color: '#e5ddc7' }}>
          {location ? (
            <>Your window is now glowing on the globe in <strong>{location}</strong>.</>
          ) : (
            <>Your window is now glowing on the globe.</>
          )}
        </p>
        <p className="text-sm mb-8" style={{ color: '#e5ddc7' }}>
          Anyone exploring can discover your story.
        </p>

        {/* Download Section */}
        <div className="bg-white/10 border border-white/20 rounded-lg p-6 mb-6">
          <div className="text-3xl mb-3">🎁</div>
          <h3 className="text-xl font-semibold mb-2" style={{ color: '#e5ddc7' }}>
            Here&apos;s Your Copy to Keep
          </h3>
          <p className="text-sm mb-4" style={{ color: '#e5ddc7' }}>
            This is your unique version - your voice woven into the song. It&apos;s yours forever.
          </p>
          
          <button
            onClick={onDownload}
            className="w-full px-6 py-3 rounded bg-white text-black hover:bg-gray-100 transition-colors font-semibold text-lg mb-3"
          >
            ⬇ Download Your Song
          </button>
          
          <p className="text-xs" style={{ color: '#e5ddc7' }}>
            Your song is linked to <strong>{email}</strong> — find your window on the globe anytime to download it again.
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={onExploreGlobe}
            className="w-full px-6 py-3 rounded border border-white/30 hover:bg-white/10 transition-colors font-semibold"
            style={{ color: '#e5ddc7' }}
          >
            Explore the Globe
          </button>
          
          {onCreateAnother && (
            <button
              onClick={onCreateAnother}
              className="w-full px-4 py-2 rounded transition-colors text-sm"
              style={{ color: '#e5ddc7' }}
            >
              Create Another Memory
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

