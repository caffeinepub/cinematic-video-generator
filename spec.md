# Cinematic Video Generator

## Current State
New project. No existing code.

## Requested Changes (Diff)

### Add
- Video generation feature: user submits a text prompt and optional aspect ratio (16:9, 9:16, 1:1), backend calls fal.ai LTX Video API via HTTP outcalls, returns a video URL
- Safety guardrail: block prompts containing unsafe terms (violence, nsfw, political figure)
- Video history: store previously generated videos (prompt, video URL, aspect ratio, timestamp) in stable backend memory
- Backend canister stores a FAL_KEY secret for authenticating with fal.ai

### Modify
N/A

### Remove
N/A

## Implementation Plan

### Backend (Motoko)
- Store FAL_KEY as a stable variable (settable by admin/owner)
- `generateVideo(prompt: Text, aspectRatio: Text) -> async Result<VideoResult, Text>`
  - Run safety check on prompt
  - Make HTTP outcall to `https://queue.fal.run/fal-ai/ltx-video` (fal.ai queue endpoint) with JSON body: prompt, aspect_ratio, duration "10", resolution "1080p"
  - Poll the queue result URL until complete, then return video URL
- `getHistory() -> async [VideoRecord]` -- returns all previously generated videos
- `setFalKey(key: Text) -> async ()` -- owner-only, stores the API key
- VideoRecord type: { id: Nat; prompt: Text; aspectRatio: Text; videoUrl: Text; createdAt: Int }

### Frontend (React)
- Main page with:
  - Text prompt textarea
  - Aspect ratio selector (16:9, 9:16, 1:1)
  - Generate button with loading state
  - Result panel showing generated video (HTML5 video player) and metadata
  - History section showing past generations as cards with video thumbnails and prompts
  - Error state for safety guardrail and generation failures
