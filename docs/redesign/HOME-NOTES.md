# Home, top section: sources and principles (29 Sep 2026)

## The words, and where each comes from (nothing invented)
| On the page | Source |
|---|---|
| "Come back to yourself." | The app's Welcome screen (wehale-app `app/(auth)/welcome.tsx`); the site's line since launch |
| "Calm, clear, connected." | The brand film's end card: "Guided breathwork to help you stay calm, clear & connected." (WH_16x9.mp4, ~55 s) |
| "No hype. No lofty promises. No guilt when you miss a day." | The site's belief line (redesign prototype, DIRECTION.md §2 "keep") |
| "Each session is built on one named breathing technique" | About / Investors ("Technique-first"), DIRECTION.md voice |
| 27 short sessions, 10 longer journeys and courses | The partner deck (Isak, Sep 2026), "Från 5 minuter" slide |
| Guides and roles | About (Edvin, Philip Sigfridsson; sessions per breathe-sessions.json) |
| Voice clips | The sessions' own audio: Edvin, The Wake Up 0:02–0:10; Philip, The Soft Reboot 0:00–0:06 |

Flag for Isak: Philip's clip runs "…designed to cultivate more peace, more calm," (his session's own words; cut
before "manage your stress"). The film's end-card line says "help you stay calm"; on the page it is only the three
brand words.

## Hero variants (?v=)
- `hero-film` (default): the valley at dawn → a woman under a pink sky → eyes closed; 16.3 s, cross-fades, fades in
  and out so the loop breathes. Phones get the film's own 9x16 edit (no tight crop).
- `hero-valley`: the opening valley only, slowed to 60 % (12.5 s). No person.
- `hero-still`: the closed-eyes shot, slowed (6.9 s). The most intimate; on desktop the face sits behind the words.
All: muted, playsinline, poster frame, a pause control, paused off screen, Reduce Motion gets the poster. 0.5–1 MB each.
Cut with `scripts/make-hero-video.sh` from `WeHale/03-Marketing/3. Brandfilm/`.

## Five principles for calm, premium pages (from Apple product pages, Oura, Aesop, Calm, Headspace, Othership)
Drawn from familiarity with these sites' patterns, not a fresh crawl this session.
1. **The film is the atmosphere, not the message.** Full-bleed, slow, muted, no UI inside it; one short line and one
   action sit on a scrim in the calmest part of the frame. The words never compete with a face.
2. **One idea per screen height.** Each section says one thing at a readable size; rhythm comes from equal, generous
   gaps, not from dividers or boxes.
3. **Colour carries the story.** Tone shifts slowly down the page (Oura's dark-to-light, Aesop's warm grounds), so
   scrolling feels like time passing rather than more of the same.
4. **Type does the premium work.** Large, few sizes, generous line height, near-white body text; restraint in weight.
5. **Motion is breath-paced and optional.** Slow reveals once, nothing loops that isn't the hero, and every moving or
   sounding thing can be paused; sound only on a tap.
