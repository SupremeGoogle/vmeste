/** Keep the long-form invitations comfortable to browse on a phone. */
export const MOBILE_DENSITY_CSS = `
.serdce .sc-story-swipe-hint { display: none; }
@media (max-width: 600px) {
  .venue-map { height: 13rem !important; margin-top: 1rem; margin-bottom: 1rem; }
  .silk [data-silk-block], .pearl [data-pearl-block], .tuscany [data-tuscany-block], .ruby [data-ruby-block] { padding-top: 3.25rem; padding-bottom: 3.25rem; }
  .silk .silk-story { min-height: 0; }
  .silk .silk-couture-scene { height: 17rem; }
  .silk .silk-venue-photo { height: 20rem; }
  .silk .silk-venue-card { padding-top: 1.5rem; padding-bottom: 1.5rem; }
  .silk .silk-venue-card .venue-map { height: 12rem !important; }
  .silk .silk-weekend-grid { gap: .75rem; }
  .lily .lily-sec { padding-top: 3rem; padding-bottom: 3rem; }
  .lily .lily-detail-card { padding-top: 1.35rem; padding-bottom: 1.35rem; }
  .lily .lily-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .65rem; }
  .lily .lily-grid figcaption { padding: .5rem .2rem; font-size: .7rem; letter-spacing: .1em; }
  .lily .lily-slots { grid-template-columns: minmax(0, 1fr); gap: 0; }
  .lily .lily-slots small { line-height: 1.8; }
  .aquarelle [data-aq-block] { padding-top: 3rem; padding-bottom: 3rem; }
  .aquarelle .aq-venue { gap: 1.5rem; }
  .aquarelle .aq-venue>.aq-arch img { height: 19rem; aspect-ratio: auto; object-fit: cover; }
  .aquarelle .aq-slots { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .6rem; margin-top: 1.5rem; }
  .aquarelle .aq-slots li { min-height: 0; padding: 1rem .75rem; }
  .aquarelle .aq-slots li:nth-child(even) { margin-top: 0; }
  .aquarelle .aq-slots time { margin-bottom: .4rem; font-size: 1.45rem; }
  .vinyl .vinyl-timing .vinyl-slots { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .65rem; }
  .vinyl .vinyl-slot { --s: 1.4rem; --half: .7rem; padding: 1.25rem .8rem; }
  .vinyl .vinyl-slot time { font-size: 1.55rem; }
  .vinyl .vinyl-slot strong { margin: .5rem 0; font-size: 1.05rem; }
  .vinyl .vinyl-venue { padding-top: 3rem; padding-bottom: 3rem; }
  .bohema .bo-garland { max-height: 5.5rem; margin-bottom: .75rem; }
  .bohema .bo-venue .bo-heading { margin-bottom: 1.5rem !important; }
  .bohema .bo-venue-photo { margin-bottom: 1.5rem; }
  .bohema .bo-venue .bo-intro { margin-bottom: 1rem; }
  .tili-js .hero { min-height: 0; padding-top: 4.5rem; padding-bottom: 3rem; }
  .tili-js .hero-intro-text { margin: 1.5rem auto; font-size: 1.25rem; line-height: 1.5; }
  .tili-js .intro-ital { font-size: 1.8rem; }
  .tili-js .timing-section { padding: 3.5rem 1.2rem; }
  .tili-js .timing-title { margin-bottom: 2rem; }
  .tili-js .timeline { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1.25rem .75rem; max-width: none; }
  .tili-js .tl-item { gap: .4rem; margin-bottom: 0; }
  .tili-js .tl-img { width: 3.2rem; height: 3.2rem; }
  .tili-js .tl-label { font-size: .85rem; letter-spacing: .08em; }
  .tili-js .tl-note { font-size: .95rem; }
  .tili-js .location-section { padding: 3.5rem 1.2rem; gap: 1.25rem; }
  .tili-js .section-tag { margin-bottom: 1.5rem; }
  /* The three Evergreen photos should read as one collage, not three screens. */
  .evergreen .eg-mosaic { grid-template-columns: 1.08fr .92fr; grid-template-rows: 13rem 13rem; gap: .45rem; }
  .evergreen .eg-mosaic .eg-photo { min-height: 0; }
  .evergreen .eg-mosaic .eg-photo:first-child { grid-row: 1 / 3; min-height: 0; }
  .evergreen .eg-gallery-mosaic { padding-bottom: 2.5rem !important; }

  /* A photo story is easier to explore as a horizontal strip. */
  .serdce .sc-story { padding-bottom: 3.5rem; }
  .serdce .sc-story-heading { padding-top: 6rem; }
  .serdce .sc-music-toggle { position: absolute; top: .75rem; left: .75rem; float: none; margin: 0; }
  .serdce .sc-story-swipe-hint { display: block; margin: 1rem auto 0; color: #63705f; font-size: .75rem; letter-spacing: .12em; text-transform: uppercase; }
  .serdce .sc-story-track { display: flex; gap: 1.25rem; max-width: none; margin: 1.6rem 0 2rem; padding: 1.25rem 8vw 2rem; overflow-x: auto; overscroll-behavior-inline: contain; scroll-snap-type: x mandatory; scrollbar-width: none; }
  .serdce .sc-story-track::-webkit-scrollbar { display: none; }
  .serdce .sc-story-episode, .serdce .sc-story-episode:last-child { flex: 0 0 min(78vw, 330px); max-width: none; margin: 0; scroll-snap-align: center; }
  .serdce .sc-story-photos { min-height: 0; height: 15rem; margin-bottom: 1rem; }
  .serdce .sc-polaroid { flex-basis: min(63vw, 245px); width: min(63vw, 245px); height: 14rem; }
  .serdce .sc-story-photos.paired .sc-polaroid { flex-basis: min(44vw, 170px); width: min(44vw, 170px); height: 12rem; }
  .serdce .sc-story-copy h3 { margin-bottom: .5rem; font-size: 1.7rem; }
  .serdce .sc-story-copy p { line-height: 1.5; }
  .serdce .sc-story-quote { font-size: 1.65rem !important; }
  .serdce .sc-story-arch { height: 5rem; margin-top: 2rem; }
  .serdce .sc-story-invite { padding-top: 2rem; }
  .serdce .sc-story-invite h2 { font-size: 2rem; margin-bottom: 1rem; }
  .serdce .sc-story-invite p { margin-bottom: 1rem; }
  .serdce .sc-program, .serdce .sc-venue, .serdce .sc-dress, .serdce .sc-rsvp, .serdce .sc-countdown { padding-top: 3.5rem; padding-bottom: 3.5rem; }
  .serdce .sc-program-list { margin-top: 2rem; }
  .serdce .sc-program-list article { margin-bottom: 1.6rem; }
  .serdce .sc-rsvp-intro { margin-bottom: 2rem !important; }
  .serdce .sc-form fieldset { margin-bottom: 1.25rem; }
  .serdce .sc-field { margin-bottom: 1.25rem; }
  .serdce .sc-map-section, .serdce .sc-contact, .serdce .sc-farewell { padding-top: 2rem; padding-bottom: 2rem; }
  .serdce .sc-detail { padding-top: 1rem; padding-bottom: 1rem; }
  .serdce .sc-detail h2 { margin-bottom: 1rem; }
  .serdce .sc-detail-quote { margin: 2rem auto 1rem !important; font-size: 1.75rem !important; }
  .serdce .sc-dress-men { padding-bottom: 3rem; }
  .serdce .sc-clock { margin-bottom: 2rem; }

  .kraski .kl-cover-photo { height: min(44svh, 360px); }
  .kraski .kl-cover-copy { min-height: 0; padding: 2rem 1.4rem 3rem; }
  .kraski .kl-program { padding-top: 3.5rem; padding-bottom: 3.5rem; }
  .kraski .kl-program li { min-height: 6rem; }
  .kraski .kl-countdown-section { height: 27rem; }

  .prism [data-prism-block] { padding-top: 3.25rem; padding-bottom: 3.25rem; }
  .prism .prism-manifesto { min-height: 0; }
  .prism .prism-sculpture { height: 18rem; margin-top: 1.8rem; }
  .prism .prism-venue-card { height: 24rem; }
  .prism .prism-gallery { min-height: 0; }
  .prism .prism-card-swap { height: 22rem; }
  .prism .prism-timeline li { min-height: 0; }

  .constellation [data-constellation-block] { padding-top: 3.25rem; padding-bottom: 3.25rem; }
  .constellation .constellation-story { min-height: 0; }
  .constellation .constellation-sculpture { height: 19rem; margin-top: 1.6rem; }
  .constellation .constellation-venue-frame { height: 24rem; }
  .constellation .constellation-gallery { min-height: 0; }
  .constellation .constellation-gallery-track { min-height: 22rem; }

  .bohema .bo-cover { min-height: 0; padding-top: 3.25rem; padding-bottom: 3rem; }
  .bohema .bo-arch { min-height: 0; padding-top: 10rem; padding-bottom: 2.5rem; }
  .bohema .bo-section { padding-top: 3.5rem; padding-bottom: 3.5rem; }
  .bohema .bo-form fieldset { margin-bottom: 1.25rem; }
  .bohema .bo-closing { padding-bottom: 4rem; }
  .bohema .bo-list li { margin-bottom: 1.1rem; }
  .bohema .bo-rsvp { padding-top: 2.5rem; padding-bottom: 3rem; }
  .bohema .bo-rsvp .bo-heading, .bohema .bo-rsvp .bo-intro { margin-bottom: 1.25rem !important; }
  .bohema .bo-form fieldset>label, .bohema .bo-drinks label { margin: .35rem 0; }

  .antic .ac-invite { padding-top: 3.5rem; padding-bottom: 3.5rem; }
  .antic .ac-program { padding-top: 3rem; padding-bottom: 3rem; }
  .antic .ac-program h2 { margin-bottom: 1.5rem; }
  .antic .ac-program li { min-height: 6.5rem; }
  .antic .ac-program-icon { width: 3.2rem; height: 3.2rem; }
  .antic .ac-dress { padding-top: 3rem; padding-bottom: 3rem; }
  .antic .ac-dress-rule { margin-bottom: 2rem; }
  .antic .ac-palette { margin-top: 1.5rem; margin-bottom: 1.5rem; }
  .antic .ac-glass { width: 7rem; height: 7rem; }
  .antic .ac-rsvp { padding-top: 3rem; padding-bottom: 3rem; }
  .antic .ac-form { margin-top: 1.5rem; }
  .antic .ac-form fieldset { gap: .5rem; margin-bottom: 1.4rem; }
  .antic .ac-name { margin-bottom: 1.4rem; }
  .antic .ac-form button { margin-top: 1.5rem; }
  .antic .ac-finale { padding-top: 2.5rem; padding-bottom: 3rem; }
  .antic .ac-cake { width: min(14rem, 80%); margin-bottom: 1.5rem; }
  .skvoz-vremya .sv-venue { padding-top: 3.5rem; padding-bottom: 3.5rem; }
  .skvoz-vremya .sv-timeline { padding-top: 3rem; padding-bottom: 3rem; }
  .skvoz-vremya .sv-timeline h2 { margin-bottom: 1.5rem; }
  .skvoz-vremya .sv-timeline li { min-height: 5.5rem; }
  .skvoz-vremya .sv-venue-photo { margin-bottom: 1.5rem; }
  .skvoz-vremya .sv-venue-note { margin-bottom: 1.5rem !important; }
  .skvoz-vremya .sv-rsvp { padding-top: 3rem; padding-bottom: 3rem; }
  .skvoz-vremya .sv-form { margin-top: 1.5rem; }
  .skvoz-vremya .sv-form fieldset, .skvoz-vremya .sv-name { margin-bottom: 1.5rem !important; }
  .skvoz-vremya .sv-form button { margin-top: 1.5rem; }
  .roseraie .rr-venue { padding-bottom: 3.5rem; }
}
`;

/**
 * The smallest text an invitation may show. Templates came from desktop
 * mock-ups with captions, weekdays and countdown units at 7–10px, which
 * on a phone is a squint at best.
 */
const MIN_FONT_PX = 11;

/** A size token: a number with a unit, or a math function around one. */
const SIZE_TOKEN = String.raw`(?:(?:clamp|calc|min|max)\((?:[^()]|\([^()]*\))*\)|\d*\.?\d+(?:px|rem|em|%|vw|vh|vmin|vmax|svh|dvh|ch|ex))`;
const FONT_SIZE = new RegExp(String.raw`(?<![\w-])font-size\s*:\s*(${SIZE_TOKEN})`, "g");
// In the `font` shorthand the size is the first token with a unit; weight
// (600) and style (italic) come before it and carry none.
const FONT_SHORTHAND = new RegExp(String.raw`(?<![\w-])(font\s*:\s*(?:(?:italic|oblique|normal|small-caps|bold|bolder|lighter|\d{3})\s+)*)(${SIZE_TOKEN})(?=[\s/])`, "g");

/**
 * Raises every font size in `css` to at least {@link MIN_FONT_PX}:
 * `font-size:.55rem` becomes `font-size:max(11px,.55rem)`. Zero sizes
 * (used for inline-block gaps) and keywords like `inherit` are left alone,
 * since `max()` accepts neither.
 */
export function floorFontSizes(css: string): string {
  const floor = (size: string) =>
    /^[0.]+[a-z%]*$/i.test(size) ? size : `max(${MIN_FONT_PX}px,${size})`;
  return css
    .replace(FONT_SIZE, (_match, size: string) => `font-size:${floor(size)}`)
    .replace(FONT_SHORTHAND, (_match, head: string, size: string) => `${head}${floor(size)}`);
}

/**
 * Map links were drawn as 8–9px caps, 11–30px tall: too small a target
 * for a thumb. On touch screens their hit area grows to ~44px without
 * moving anything: plain links get vertical padding offset by a negative
 * margin (inline links need no offset at all), buttons with a margin of
 * their own get an invisible ::after around them instead.
 */
export const MAP_LINK_TAP_CSS = `
@media (pointer: coarse) {
  .constellation-map-link { padding-block: 1rem; margin-block: -.1rem -1rem; }
  .prism-link { padding-block: 1rem; margin-block: 0 -1rem; }
  .evergreen .eg-venue > a[target="_blank"], .sheet p.center > a[target="_blank"] { padding-block: .75rem; }
  .ruby-map, .tuscany-map, .sv-route, .rr-venue-card > a[target="_blank"], .map-btn { position: relative; }
  .ruby-map::after, .tuscany-map::after, .sv-route::after, .rr-venue-card > a[target="_blank"]::after, .map-btn::after { content: ""; position: absolute; inset: min(0px, (100% - 46px) / 2) -.25rem; }
}
`;
