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
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-lg mx-4 rounded-xl border border-purple-400/30 bg-gray-900/95 backdrop-blur p-8 text-center">
        {/* Success Animation */}
        <div className="mb-6">
          <div className="text-6xl mb-4">✨</div>
          <div className="text-4xl mb-2">🎉</div>
        </div>

        {/* Heading */}
        <h2 id="celebration-title" className="text-3xl font-bold text-white mb-3">
          Your Memory is Live!
        </h2>

        {/* Message */}
        <p className="text-gray-300 text-lg mb-2">
          {location ? (
            <>Your window is now glowing on the globe in <strong>{location}</strong>.</>
          ) : (
            <>Your window is now glowing on the globe.</>
          )}
        </p>
        <p className="text-gray-400 text-sm mb-8">
          Anyone exploring can discover your story.
        </p>

        {/* Download Section */}
        <div className="bg-purple-900/30 border border-purple-400/30 rounded-lg p-6 mb-6">
          <div className="text-3xl mb-3">🎁</div>
          <h3 className="text-xl font-semibold text-white mb-2">
            Here&apos;s Your Copy to Keep
          </h3>
          <p className="text-gray-300 text-sm mb-4">
            This is your unique version - your voice woven into the song. It&apos;s yours forever.
          </p>
          
          <button
            onClick={onDownload}
            className="w-full px-6 py-3 rounded bg-purple-600 text-white hover:bg-purple-700 transition-colors font-semibold text-lg mb-3"
          >
            ⬇ Download Your Song
          </button>
          
          <p className="text-gray-400 text-xs">
            We&apos;ve also sent it to <strong className="text-gray-300">{email}</strong>
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={onExploreGlobe}
            className="w-full px-6 py-3 rounded border border-purple-400/40 text-purple-200 hover:bg-purple-800/30 transition-colors font-semibold"
          >
            Explore the Globe
          </button>
          
          {onCreateAnother && (
            <button
              onClick={onCreateAnother}
              className="w-full px-4 py-2 rounded text-gray-400 hover:text-gray-200 transition-colors text-sm"
            >
              Create Another Memory
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

