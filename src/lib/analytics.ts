import { track } from '@vercel/analytics';

/**
 * Centralized analytics tracking for the Alone Together app.
 * Uses Vercel Analytics for custom event tracking.
 * 
 * User Funnel:
 * Landing → start_clicked → create_opened → recording_started → 
 * recording_completed → processing_completed → memory_pinned → song_downloaded
 */
export const Analytics = {
  // ============================================
  // Landing & Navigation Events
  // ============================================
  
  /** User clicked the "Start" button on landing page */
  startClicked: () => track('start_clicked'),
  
  /** User opened the create/record modal */
  createOpened: () => track('create_opened'),
  
  /** User clicked "Explore" to view the globe */
  exploreOpened: () => track('explore_opened'),
  
  // ============================================
  // Recording Funnel Events
  // ============================================
  
  /** User pressed the record button to start recording */
  recordingStarted: () => track('recording_started'),
  
  /** User completed a recording (includes duration for analysis) */
  recordingCompleted: (durationMs: number) => 
    track('recording_completed', { duration_ms: durationMs }),
  
  /** User abandoned recording (closed modal without completing) */
  recordingAbandoned: () => track('recording_abandoned'),
  
  // ============================================
  // Processing & Pinning Events
  // ============================================
  
  /** Audio processing started */
  processingStarted: () => track('processing_started'),
  
  /** Audio processing completed successfully */
  processingCompleted: () => track('processing_completed'),
  
  /** User pinned their memory to the globe */
  memoryPinned: (location?: string) => 
    track('memory_pinned', { location: location || 'unknown' }),
  
  // ============================================
  // Engagement Events
  // ============================================
  
  /** User played a memory from the globe */
  memoryPlayed: (memoryId: string, location?: string) => 
    track('memory_played', { memory_id: memoryId, location }),
  
  /** User downloaded their song */
  songDownloaded: (memoryId: string) => 
    track('song_downloaded', { memory_id: memoryId }),
  
  // ============================================
  // Globe Interaction Events
  // ============================================
  
  /** User interacted with the 3D globe */
  globeInteraction: (type: 'rotate' | 'zoom' | 'click_window') => 
    track('globe_interaction', { type }),
};

