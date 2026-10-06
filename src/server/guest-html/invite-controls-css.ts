import { RSVP_FIELDS_CSS } from "./rsvp-fields";

/** Shared questions and gifts use the same materials as each invitation. */
const MATERIALS: Record<string, string> = {
  zefir: "--vm-accent:#b96583;--vm-button:#b96583;--vm-font:var(--sb-sans);--vm-radius:2px",
  crayon: "--vm-accent:#ad5578;--vm-button:#ad5578;--vm-font:var(--sb-sans);--vm-radius:6px",
  evergreen: "--vm-accent:#c4a264;--vm-button:#c4a264;--vm-button-text:#18221b;--vm-font:var(--sans);--vm-radius:.7rem",
  silk: "--vm-accent:#8d3e3a;--vm-button:#8d3e3a;--vm-font:var(--sans);--vm-radius:1rem",
  pearl: "--vm-accent:#737b70;--vm-button:#737b70;--vm-font:var(--sans);--vm-radius:.7rem",
  tuscany: "--vm-accent:#89583b;--vm-button:#89583b;--vm-font:var(--sans);--vm-radius:.6rem",
  ruby: "--vm-accent:#8e1018;--vm-button:#8e1018;--vm-font:var(--sans);--vm-radius:.6rem",
  constellation: "--vm-accent:#d5ad6c;--vm-button:#d5ad6c;--vm-button-text:#07101f;--vm-font:var(--sans);--vm-radius:.8rem",
  prism: "--vm-accent:#627f7a;--vm-button:#627f7a;--vm-font:var(--sans);--vm-radius:1rem",
  tili: "--vm-accent:var(--rose-d);--vm-button:var(--rose-d);--vm-font:var(--body);--vm-label-color:var(--taupe);--vm-label-size:1.1rem;--vm-label-spacing:.16em;--vm-label-case:uppercase;--vm-choice-font:var(--serif);--vm-choice-size:1.4rem;--vm-ink:var(--brown);--vm-input-bg:transparent;--vm-input-border:0;--vm-radius:0;--vm-space:2.25rem",
  vinyl: "--vm-accent:var(--vorange);--vm-button:var(--vorange);--vm-button-text:var(--vink);--vm-font:var(--vsans);--vm-radius:.6rem",
  aquarelle: "--vm-accent:var(--agreen);--vm-button:var(--agreen);--vm-font:var(--asans);--vm-radius:.8rem",
  lily: "--vm-accent:var(--lg);--vm-button:var(--lg);--vm-font:var(--lsans);--vm-radius:.6rem",
  bohema: "--vm-accent:var(--bo-gold);--vm-button:var(--bo-gold);--vm-button-text:#292b24;--vm-font:var(--bo-sans);--vm-radius:0;--vm-input-bg:#fffdf7;--vm-choice-bg:transparent",
  kraski: "--vm-accent:#292929;--vm-button:#000;--vm-font:var(--kl-sans);--vm-radius:0;--vm-input-border:0;--vm-input-bg:transparent;--vm-choice-bg:transparent",
  serdce: "--vm-accent:#dfe6d7;--vm-button:var(--sc-green);--vm-font:var(--sc-sans);--vm-radius:0;--vm-input-border:0;--vm-input-bg:transparent;--vm-choice-bg:transparent",
  antic: "--vm-accent:#242321;--vm-button:#242321;--vm-font:var(--ac-sans);--vm-radius:0;--vm-input-border:0;--vm-input-bg:transparent;--vm-choice-bg:transparent",
  "skvoz-vremya": "--vm-accent:#9a6659;--vm-button:#483d36;--vm-font:var(--sv-sans);--vm-radius:0;--vm-input-border:0;--vm-input-bg:transparent;--vm-choice-bg:transparent",
  burgundy: "--vm-accent:var(--bw-wine);--vm-button:var(--bw-wine);--vm-font:'Cormorant Garamond',Georgia,serif;--vm-radius:.8rem",
  roseraie: "--vm-accent:var(--rr-gold);--vm-button:var(--rr-ink);--vm-font:'Cormorant Garamond',Georgia,serif;--vm-radius:.4rem",
  "floral-garden": "--vm-accent:#741c32;--vm-button:#741c32;--vm-font:'Manrope',Arial,sans-serif;--vm-radius:.8rem;--vm-choice-radius:999px;--vm-input-bg:#fff",
  iskra: "--vm-accent:#ad4a55;--vm-button:var(--ik-paper);--vm-button-text:var(--ik-wine);--vm-font:var(--ik-serif);--vm-radius:.15rem",
  odnazhdy: "--vm-button:var(--btn);--vm-font:SMTextsFont,sans-serif;--vm-radius:0;--vm-input-border:0;--vm-input-bg:transparent;--vm-choice-bg:transparent",
  "little-happiness": "--vm-button:var(--border-btn,#000);--vm-font:SMTextsFont,sans-serif;--vm-radius:0;--vm-input-border:0;--vm-input-bg:transparent",
  priznanie: "--vm-button:var(--btn-bg,#D50100);--vm-font:SMTextsFont,sans-serif;--vm-radius:0;--vm-input-border:0;--vm-input-bg:transparent;--vm-choice-bg:transparent",
};

const CONTROLS_CSS = `
.vm-rsvp{font-family:var(--vm-font,inherit);color:var(--vm-ink,inherit)}
.vm-rsvp .vm-rsvp-choice{min-height:44px;box-sizing:border-box;border-radius:var(--vm-choice-radius,var(--vm-radius,.9rem));background:var(--vm-choice-bg,color-mix(in srgb,currentColor 3%,transparent))}
.vm-rsvp .vm-rsvp-choice:has(input:checked){border-color:var(--vm-accent,currentColor);background:color-mix(in srgb,var(--vm-accent,currentColor) 10%,transparent)}
.vm-rsvp .vm-rsvp-field input,.vm-rsvp .vm-rsvp-field textarea{border-radius:var(--vm-radius,.9rem);border-width:var(--vm-input-border,1px);border-bottom:1px solid color-mix(in srgb,currentColor 35%,transparent);background:var(--vm-input-bg,color-mix(in srgb,currentColor 3%,transparent));color:inherit}
.vm-rsvp .vm-rsvp-submit,.vm-wl .vm-wl-btn{box-sizing:border-box;max-width:100%;min-height:44px;border:1px solid var(--vm-button,currentColor);background:var(--vm-button,currentColor);color:var(--vm-button-text,#fff);font-family:var(--vm-font,inherit);font-size:1rem;line-height:1.4;white-space:normal;overflow-wrap:anywhere;text-align:center;text-decoration:none;transition:filter .2s,background-color .2s}
.vm-rsvp .vm-rsvp-submit:hover,.vm-wl .vm-wl-btn:hover{background:var(--vm-button,currentColor);filter:brightness(1.1)}
.vm-rsvp :is(input,textarea,select,button):focus-visible,.vm-wl .vm-wl-btn:focus-visible{outline:2px solid var(--vm-accent,currentColor);outline-offset:4px}
.vm-rsvp .vm-rsvp-drinks{grid-template-columns:repeat(auto-fit,minmax(min(100%,9.5rem),1fr))}
.vm-wl{width:100%;box-sizing:border-box;font-family:var(--vm-font,inherit);font-size:1rem}
.vm-wl .vm-wl-card{grid-template-columns:4.75rem minmax(0,1fr);border-radius:var(--vm-radius,1rem)}
.vm-wl .vm-wl-title,.vm-wl .vm-wl-desc,.vm-wl .vm-wl-count,.vm-wl .vm-wl-note{max-width:none;margin:0;font-family:inherit;letter-spacing:normal;text-transform:none;overflow-wrap:anywhere;white-space:normal;color:inherit}
.vm-wl .vm-wl-title{font-size:1.05rem;font-weight:600;line-height:1.35;text-align:left}
.vm-wl .vm-wl-desc{font-size:.9rem;line-height:1.55;text-align:left}
.vm-wl .vm-wl-count,.vm-wl .vm-wl-note{margin-top:1rem;font-size:.85rem;line-height:1.5;text-align:center}
.vm-wl .vm-wl-env{border-radius:var(--vm-radius,1rem)}
.vm-wl .vm-wl-env h3{font:600 1.15rem/1.4 var(--vm-font,inherit);color:inherit;letter-spacing:normal}
.vm-wl .vm-wl-env p{font-size:.95rem;line-height:1.6;white-space:pre-line}
.vm-wl .vm-wl-btn.is-mine{background:transparent;color:inherit;border-color:currentColor}
.vm-wl .vm-wl-btn{border-radius:var(--vm-button-radius,var(--vm-radius,999px))}
.lily-green{--vm-button:#f4f2ea;--vm-button-text:var(--lg);--vm-accent:#f4f2ea}
.floral-garden .fg-form .rsvp-fields .choice{display:flex;padding:.55rem .9rem;border:1px solid #d8c3c3;border-radius:999px;background:#fff;color:#641b2c}
.floral-garden .fg-form .rsvp-fields .choice:has(input:checked){border-color:#741c32;background:#741c32;color:#fff}
.floral-garden .fg-form .rsvp-fields .choice:has(input:checked) input{border-color:#fff;background:#fff;box-shadow:inset 0 0 0 4px #741c32}
.vm-rsvp .rsvp-fields .choice{box-sizing:border-box;padding:.8rem 1rem;border:1px solid color-mix(in srgb,currentColor 20%,transparent);border-radius:var(--vm-choice-radius,var(--vm-radius,.9rem));background:var(--vm-choice-bg,color-mix(in srgb,currentColor 3%,transparent))}
.vm-rsvp .rsvp-fields .choice:has(input:checked){border-color:var(--vm-accent,currentColor);background:color-mix(in srgb,var(--vm-accent,currentColor) 10%,transparent)}
.vm-rsvp .rsvp-fields .rsvp-rating .choice{padding:.5rem .4rem}
.tili-js .vm-wl{--vm-radius:1rem;--vm-font:var(--serif);--vm-button:var(--rose);--vm-button-text:var(--deep);color:var(--gold-l)}
.rsvp-form{--vm-label-color:#927d69}.rsvp-form .fl{color:var(--vm-label-color)}
.wv-template .rsvp-fields{width:100%;max-width:34rem;margin:1.5rem auto;text-align:left}
.wv-template{--vm-label-size:calc(16px / var(--wv-scale,1));--vm-choice-size:calc(16px / var(--wv-scale,1));--vm-space:calc(24px / var(--wv-scale,1))}
.wv-template section#rsvp .vm-rsvp,.wv-template .vm-wl{font-size:calc(16px / var(--wv-scale,1));max-width:calc(544px / var(--wv-scale,1))}
.wv-template .rsvp-fields :is(.choice,input:not([type=hidden]),textarea,select),.wv-template .vm-rsvp .vm-rsvp-choice,.wv-template .vm-rsvp .vm-rsvp-submit,.wv-template .vm-wl .vm-wl-btn{min-height:calc(44px / var(--wv-scale,1))}
.wv-template .rsvp-fields .field :is(input,textarea,select),.wv-template .vm-wl .vm-wl-btn{font-size:calc(16px / var(--wv-scale,1))}
.wv-template .rsvp-fields .choice input{width:calc(20px / var(--wv-scale,1));height:calc(20px / var(--wv-scale,1));min-height:0}
.wv-template .rsvp-fields small,.wv-template .vm-wl .vm-wl-desc,.wv-template .vm-wl .vm-wl-count{font-size:calc(14px / var(--wv-scale,1))}
.wv-template .vm-wl .vm-wl-title{font-size:calc(17px / var(--wv-scale,1))}
@media(max-width:480px){.rsvp-form{--vm-label-size:.75rem;--vm-choice-size:1rem}.rsvp-form .fl{font-size:.75rem}.vm-wl .vm-wl-card{grid-template-columns:3.5rem minmax(0,1fr);gap:.75rem}.vm-wl .vm-wl-pic{width:3.5rem;height:3.5rem}}
`.replace(/\n/g, "");

export function inviteControlsCss(template: string): string {
  // Template variables often live on .sheet rather than :root. Resolve the
  // materials in that same scope before the controls inherit them.
  return `:root,body,.sheet,.wv-sheet{--vm-button:#64533f;--vm-accent:currentColor;${MATERIALS[template] ?? ""}}${RSVP_FIELDS_CSS}${CONTROLS_CSS}`;
}
