# Pulse OS product help

The help library teaches application navigation. It is separate from ministry curriculum and never changes access to operational records.

## Update instructions

1. Verify the current screen and save behavior before changing a guide in `src/lib/help/guides.ts`.
2. Keep steps, button labels, success checks and recovery advice together. Use no member, staff, donor, financial or private submission records in examples.
3. Keep the overview artwork and guide edition consistent with meaningful instruction changes. The poster is an overview; the text guides remain the detailed reference.
4. Regenerate the plain-text video source and printable guide:

```sh
HELP_DATA_OUTPUT=/tmp/pulse-help-data.json node scripts/export-pulse-help.mjs
python3 scripts/export-pulse-help-pdf.py --data /tmp/pulse-help-data.json
```

The PDF exporter requires `reportlab` and `pypdf`; it is an authoring tool, not a website runtime dependency. It checks that the guide stays at one overview page plus one page per workspace. Render and inspect the resulting PDFs before committing updated artifacts.

5. Run `node scripts/test-pulse-help.mjs`, TypeScript, targeted lint and the production build. Verify phone navigation, desktop search, print behavior and downloadable artifacts.
6. Keep the video library labelled as scripts until real reviewed media files are available. Use synthetic screen demonstrations and captions for the final short clips. Do not invent recorded progress or completion tracking for these app guides.

## Access

Help is rendered only after the normal signed-in identity check. A team member awaiting department assignment can still read the guides. Operational views retain their existing workspace checks and database policies. Downloadable generic instruction assets contain no records or credentials and can be shared independently of the signed-in help page.

## Finished short videos (24 November 2026)

The eight MP4 clips under `public/help/videos/` are 1280×720, 24 fps, H.264/AAC.
They use synthetic narration (macOS Samantha), visible captions, optional English WebVTT
tracks and matching transcripts. Posters and `preload="none"` avoid loading all videos
when Help opens. Native controls support pausing, replaying, full screen and download.

The demonstrations render the existing React workspace components against entirely
local fictional fixtures; no Supabase client is created and fixture writes throw.
Highlights and camera framing point to controls; these are guided overviews rather
than recordings of transactions in the live database. Fictional teaching in the
Training example does not claim that any curriculum is published in production.
No member, donor, worker, sign-in or production-service records were captured.

The reproducible Remotion source is retained in Doroto's local tutorial output pack,
separate from the production application and its dependencies. Updating the app does
not silently update these exported videos: review button names and procedures when
workspace behavior changes. Export replacement MP4, poster, VTT and metadata together.
