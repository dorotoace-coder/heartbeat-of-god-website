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
