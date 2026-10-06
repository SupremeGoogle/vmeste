/** Tablet layouts retain each template's artwork while bounding long sections. */
export const TABLET_DENSITY_CSS = `
@media (min-width: 601px) and (max-width: 1100px) {
  .venue-map { height: 15rem !important; margin-block: 1.25rem; }
  .silk [data-silk-block], .pearl [data-pearl-block], .tuscany [data-tuscany-block], .ruby [data-ruby-block],
  .prism [data-prism-block], .constellation [data-constellation-block] { padding-block: 3.5rem; }
  .silk .silk-story, .prism .prism-manifesto, .prism .prism-gallery,
  .constellation .constellation-story, .constellation .constellation-gallery { min-height: 0; }
  .silk .silk-couture-scene, .prism .prism-sculpture, .constellation .constellation-sculpture { height: 20rem; margin-top: 2rem; }
  .silk .silk-venue-photo { height: 23rem; }
  .prism .prism-venue-card, .constellation .constellation-venue-frame { height: 25rem; }
  .prism .prism-card-swap { height: 28rem; }
  .prism .prism-photo > div, .constellation .constellation-photo > div { height: 14rem; }
  .prism .prism-photo-3, .constellation .constellation-photo-3 { top: 10rem; }
  .constellation .constellation-gallery-track { min-height: 28rem; }
  .prism .prism-timeline li { min-height: 0; }
  .ruby .ruby-open { overflow: hidden; }
  .sheet section:has(> .vm-rsvp) > h2 { font-size: 2.75rem; }
  .sheet section:has(> .vm-rsvp) > p:not([class]) { font-size: 1.1rem; }

  .serdce .sc-story { padding-bottom: 3.5rem; }
  .serdce .sc-story-track { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 3.5rem 2rem; margin-top: 3rem; padding: 0 2.5rem; }
  .serdce .sc-story-episode, .serdce .sc-story-episode:last-child { min-width: 0; margin: 0; }
  .serdce .sc-story-photos { min-height: 0; height: 16rem; margin-bottom: 1.5rem; }
  .serdce .sc-polaroid { flex-basis: 80%; width: 80%; height: 15rem; padding: .6rem .6rem 1.25rem; }
  .serdce .sc-story-photos.paired .sc-polaroid { flex-basis: 55%; width: 55%; height: 12rem; }
  .serdce .sc-story-copy h3 { margin-bottom: .75rem; font-size: 1.9rem; }
  .serdce .sc-story-copy p { font-size: 1rem; line-height: 1.55; }
  .serdce .sc-story-quote { margin-top: 3rem !important; font-size: 2rem !important; }
  .serdce .sc-story-arch { height: 8rem; margin-top: 2.5rem; }
  .serdce .sc-story-invite { padding-top: 3rem; }
  .serdce .sc-program, .serdce .sc-venue, .serdce .sc-dress, .serdce .sc-rsvp, .serdce .sc-countdown { padding-block: 3.5rem; }

  .tili-js .hero { min-height: 0; padding-block: 5rem 3rem; }
  .tili-js .hero-intro-text { margin: 2rem auto; font-size: 1.35rem; line-height: 1.5; }
  .tili-js .calendar-section { padding-block: 3.5rem; gap: 1.5rem; }
  .tili-js .cal-card { max-width: 500px; padding: 2rem; margin-bottom: 1rem; }
  .tili-js .cal-title { font-size: 2.75rem; margin-bottom: 1.5rem; }
  .tili-js .cal-message { margin-top: 1.5rem; }
  .tili-js .timing-section, .tili-js .location-section { padding-block: 3.5rem; }
  .tili-js .timing-title { font-size: 2.75rem; margin-bottom: 2.5rem; }
  .tili-js .timeline { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 2rem; max-width: 600px; }
  .tili-js .tl-item { margin-bottom: 0; gap: .6rem; }
  .tili-js .tl-img { width: 4rem; height: 4rem; }
  .tili-js .location-section { gap: 1.5rem; }
  .tili-js .section-tag { margin-bottom: 1.5rem; color: #786357; font-size: .85rem; }

  .bohema .bo-section { padding-block: 3.5rem; }
  .bohema .bo-garland { max-height: 6rem; margin-bottom: 1rem; }
  .bohema .bo-venue .bo-heading { margin-bottom: 2rem !important; }
  .bohema .bo-looks { padding-block: 1rem 3rem; }
  .bohema .bo-looks figure { margin-bottom: 2rem; }
  .bohema .bo-looks figure img { max-height: 300px; object-fit: contain; }
  .bohema .bo-rsvp .bo-heading { margin-bottom: 1.5rem !important; }
  .lily .lily-sec { padding-block: 3.5rem; }
  .lily .lily-cover-photo { width: min(100%, 420px); margin-inline: auto; }
  .kraski .kl-cover-photo { height: min(48svh, 430px); }
  .kraski .kl-cover-copy { min-height: 0; padding-block: 2.5rem; }
  .antic .ac-invite, .antic .ac-program, .antic .ac-dress, .antic .ac-rsvp { padding-block: 3.5rem; }
  .antic .ac-program h2 { margin-bottom: 2rem; }
  .antic .ac-program li { min-height: 7rem; }
  .burgundy .bw-letter { padding-block: 3.5rem; }
}
`;
