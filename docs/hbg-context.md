# Heartbeat of God Ministry — Public Context

*v9 · November 2026 · public-safe mirror*

> **This repo is public.** This file holds only what is safe for anyone to read: identity, brand, programs, content standards.
> The full private context is kept outside this repo. Edit the private copy first, then mirror public-safe changes here.
> **Never add to this repo:** phone or device numbers, private emails, hosting or database IDs, keys or tokens, counseling or safeguarding procedures, team rosters, legal-entity filings, finance records, or internal admin URLs. `scripts/check-public-safe.sh` blocks most of these automatically.

---

## Identity

- **Founder:** Senior Pastor Amos Unogwu — always the full title. Never "Pastor Amos," never "Founder" alone
- **Signature:** *Senior Pastor Amos Unogwu / Heartbeat of God Ministry*
- **Bases:** Akute, Ogun State, Nigeria · Winnipeg, Manitoba, Canada · global online congregation
- **Venue:** 200 Akute Rd, opp. Royal Prince Supermarket, Akute, Nigeria
- **Contact:** heartbeatofgodf@gmail.com · or use the forms at `heartbeatofgod.ca/connect`
- **Time zones:** Nigeria (WAT, UTC+1) is 6 hours ahead of Winnipeg in Canadian daylight time and 7 hours ahead in standard time (Nov–Mar)

| Element | Value |
|---|---|
| Vision | Bring men to the sense of God's divine presence |
| Tagline | Healing the broken, Reaching the lost |
| Public slogan | A Reason to Live |
| Core mandate | Win Souls. Build Believers. Send Lights. |
| Culture | Win · Build · Send |
| Media law | If it is recorded, it becomes content |
| Founding motto | From this village you will navigate the world |
| Core belief | The Product is Hope |
| Voice | Prophetic, practical, fatherly, faith-filled |

---

## The three mandates

Every program, page and piece of content maps to one.

- **WIN** — evangelism, Salvation Challenge, altar calls, outreach, testimony, digital Gospel visibility, Right Time Test (open to non-members)
- **BUILD** — CLT devotionals, prayer, the Word, Foundation School, service culture, Heartbeat Marriages, Ministry Training Academy
- **SEND** — releasing lights into families, communities, media, business, music, leadership and digital mission fields across nations

---

## Audience

- Ages 7–60, multigenerational
- Nigeria base + Winnipeg diaspora + global online audience
- Broken, searching, hungry people — unchurched and already churched
- Language: clear, powerful, accessible — warm but not weak, prophetic but not performative

---

## Brand

| Element | Value |
|---|---|
| Primary | Deep purple `#1C0A2D` · `#2e1252` |
| Accent | Lavender `#C8A2D0` |
| Gold | `#d4af37` / `#b8962e` and `#C9972A` are both in use — standardising to one is pending |
| Background | Near-black `#0d0518` / `#0f0820` |
| Font | Manrope (web) · Segoe UI (email fallback) |
| Logo | "HBG" in lavender with a red hand-drawn heart |
| Flyer style | Dark purple field, gold typography, cinematic |
| Media | HBG watermark on all media · captions on all video |

---

## Public web properties

| Domain | Purpose |
|---|---|
| `heartbeatofgod.ca` | Main public site (this repo) |
| `events.heartbeatofgod.ca` | Event registration |
| `rtt.heartbeatofgod.ca` | Right Time Test |
| `mta.heartbeatofgod.ca` | Ministry Training Academy 2026 |
| `heartbeatofgod.foundation` | Global / Nigeria-facing ministry and media |

The homepage's headline event is driven by `src/config/currentEvent.ts`. Update it there, and keep `endsAt` accurate so the site never invites people to an event that has already happened.

---

## Programs & events

| Program | Mandate | Description | Status |
|---|---|---|---|
| **TRIBE X · Throne Room** | BUILD | Prophetic worship and the Word · Psalm 46:10 · Nov 27, 2026 · Akute & Online · free | Next gathering |
| **Right Time Test (RTT)** | WIN → BUILD | Relationship-readiness platform — *Before the vow, find the truth* | Live |
| **Heartbeat Marriages** | BUILD | Covenant counseling — *Healing the broken, building one flesh* | Live |
| **Foundation School** | BUILD | Four-Sunday discipleship course: Grounded · Formed · Commanding · Sent | Active |
| **CLT / The Walkers** | BUILD | Daily discipleship — Virtue, Discipline, Commitment | Active |
| **Salvation Challenge** | WIN | Quarterly evangelism — Courts of Heaven: "Approach the bench, not the battlefield" | Quarterly |
| **KCES** | WIN | Community program | Active |
| **Fasting cycles** | BUILD | 21-day · 40-day (April) · 32-day (August) · November | Recurring |
| **MTA 2026 — "EXPLOITS"** | BUILD | Ministry Training Academy · Daniel 11:32 · Sep 4–6, 2026 | Completed |
| **ILPC 2026** | BUILD | International Leaders & Pastors Conference · Jun 5–7, 2026 | Completed |

**Naming rules:** MTA 2026 is "EXPLOITS" ("Arise and Shine" was MTA 2025). "HCLI" is retired — use **Foundation School**.

### Right Time Test — public description

- The front door before the vow, open to members and non-members worldwide
- Each person has a private account and completes staged questionnaires before the couple links accounts
- **Two tracks:** Discernment ("Should we?") and Preparation ("Get us ready")
- **10 pillars:** Meaning of marriage · Family & tribe · Money & work · Financing the home · Healthy balance · The true decision · Foundation & planning · Forgiveness · Career & calling · Health & wholeness
- **Sealed** answers are seen only by the author and the counselor. **Shared** answers are compared together. Privacy is enforced in the database, not just the screen
- Couples who finish RTT are welcomed into Heartbeat Marriages

### Heartbeat Marriages — public description

- Three lanes: Premarital / Intending · Married — enrichment · Married — crisis and conflict (safety first)
- Sessions by WhatsApp video, Zoom, or in person in Akute, in the 7–9 pm Lagos evening window
- Curriculum (Genesis 2 + Ephesians 5): communication & conflict · finances & stewardship · intimacy · in-laws & extended family · roles & expectations · spiritual life & prayer · children & parenting
- Every request is triaged within 48 hours

---

## The media engine

**Law:** *The Word must not end on Sunday. The message must travel.*

| Day | Action |
|---|---|
| Sunday | Record sermon, worship, testimonies, altar call, first-timers, photos |
| Monday | Transcribe, extract scriptures and quotes, select clips, draft CLT |
| Tuesday | Export CLT devotional video, sermon quote reel, prayer declaration |
| Wednesday | Post teaching clip, midweek encouragement, update archive |
| Thursday | Sunday invitation, captions, WhatsApp copy, outreach reminder |
| Friday | Publish invitation video, schedule posts, confirm workers |
| Saturday | Evangelism content, prepare service media, support outreach |

**Six content types:** CLT devotionals · sermon clips · prayer moments · worship reels · testimony videos · Salvation Challenge media.

---

## Content standards

- **Sermon outlines:** 3 points — opening hook → scripture anchor → life application → altar call or closing declaration
- **CLT devotionals:** 150–300 words — Scripture → Reflection → Prayer → Declaration
- **Event emails:** warm open, visual event-detail strip, one clear CTA, spam-folder tip for Nigerian audiences
- **Appeals:** urgent, vision-driven, specific ask. No guilt — only hope and possibility
- **Announcements:** short, punchy, one CTA
- **WhatsApp copy:** under 200 words, plain text, one link max
- **Social captions:** Nigeria voice on foundation channels, adapted per platform
- **HTML emails:** table-based layout with inline styles — never flexbox. Dark purple header, white body, lavender/gold accents, Manrope/Segoe UI, mobile breakpoints

---

## Operating rules for anyone building on this repo

1. **Senior Pastor Amos Unogwu** — exact title, every time
2. **The Product is Hope** — hope is the core of every output
3. **The Word must not end on Sunday** — every page and post keeps the message traveling
4. **Nigeria context always** — design for power cuts, mobile data costs and WhatsApp as the main channel
5. **Map to Win · Build · Send**
6. **Prayer requests and first-timer cards are people in real need** — they reach pastoral care within 48 hours
7. **Public repo = public-safe only.** Secrets live in Vercel environment variables or git-ignored `.env` files, never in code or docs

---

*Heartbeat of God Ministry · Senior Pastor Amos Unogwu · A Reason to Live.*
