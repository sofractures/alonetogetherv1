# User Flow & Email Capture Implementation Plan

## Current Flow vs. Desired Flow

### Current Flow (Issues)
1. Record Audio
2. Preview & Accept
3. Processing: "Creating your song..."
4. Inline audio player with Download button
5. Location selector (if needed)
6. Done button → Globe view

**Problems:**
- No email capture
- Download happens too early (before pinning)
- No celebration moment
- Location happens after processing
- No clear narrative flow

### Desired Flow (New)

```
1. Landing → Explore Globe
2. Click "Start / Create Memory"
3. Choose "Create"
4. Record Audio
5. Preview & Accept
6. Processing: "Creating your song..."
7. 🎵 Playback Modal: Listen to your personalized version
   - "This is YOUR unique version"
   - "Add to Globe" button
   - Hint: "Pin it to the globe and get your copy to download"
8. 🎯 Pin Modal: Email + Location + Name
   - Email (required)
   - Location (auto-detect or manual)
   - Name (optional)
   - "Pin My Memory" button
9. Processing: "Pinning your memory..."
10. 🎉 Celebration Screen: "Your memory is live!"
    - Success animation
    - Globe preview showing their window
    - Download offer: "Here's your copy to keep"
    - Download button
    - "Explore the Globe" button
11. Globe View: See your glowing window
```

## Implementation Steps

### Step 1: Create Playback Modal Component
- Modal that shows after processing completes
- Audio player with controls
- Message about unique version
- "Add to Globe" CTA button
- Hint text about download

### Step 2: Create Pin Modal Component (Enhanced LocationSelector)
- Email input (required)
- Location (auto-detect or manual - reuse LocationSelector)
- Name input (optional)
- "Pin My Memory" button
- Benefits list

### Step 3: Create Celebration Screen Component
- Success animation/confetti
- "Your memory is live!" message
- Mini globe preview (optional)
- Download section with button
- Email confirmation message
- "Explore the Globe" button

### Step 4: Update API to Accept Email
- Modify `/api/memory/record` to accept email
- Store email in database (new column or separate table)
- Send email with download link (future: email service integration)

### Step 5: Update Flow State Management
- Track flow state: 'recording' | 'processing' | 'playback' | 'pinning' | 'celebrating' | 'complete'
- Manage modal visibility
- Handle transitions between states

### Step 6: Update Database Schema
- Add `email` column to `memories` table (optional, nullable)
- Or create separate `user_emails` table for privacy

## Component Structure

```
src/components/
  ├── flow/
  │   ├── PlaybackModal.tsx        # Step 7: Listen to processed audio
  │   ├── PinModal.tsx              # Step 8: Email + Location + Name
  │   └── CelebrationScreen.tsx     # Step 10: Success + Download
  └── location/
      └── LocationSelector.tsx      # Enhanced with email/name (or separate)
```

## State Management

```typescript
type FlowState = 
  | 'idle'
  | 'recording'
  | 'processing'
  | 'playback'      // Show playback modal
  | 'pinning'       // Show pin modal
  | 'pinning-processing' // "Pinning your memory..."
  | 'celebrating'   // Show celebration screen
  | 'complete';     // On globe view

const [flowState, setFlowState] = useState<FlowState>('idle');
const [userEmail, setUserEmail] = useState<string | null>(null);
const [userName, setUserName] = useState<string | null>(null);
```

## API Changes

### POST /api/memory/record
```typescript
// Add to FormData:
- email?: string
- display_name?: string (already exists)
- location: LocationData (already exists)
```

### Database Schema Update
```sql
ALTER TABLE memories 
ADD COLUMN email VARCHAR(255) NULL,
ADD COLUMN user_name VARCHAR(255) NULL;
```

## Email Service (Future)
- Use Resend, SendGrid, or similar
- Send email with:
  - Download link to processed audio
  - Link to view on globe
  - Thank you message

