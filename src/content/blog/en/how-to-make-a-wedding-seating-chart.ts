import type { Article } from "../../types";
import { cta, h2, h3, ol, p, table, tip, ul } from "../../blocks";

export const seatingChartGuide: Article = {
  lang: "en",
  slug: "how-to-make-a-wedding-seating-chart",
  alternate: "kak-rassadit-gostej-na-svadbe",
  title: "How to make a wedding seating chart: a step-by-step guide",
  short: "How to make a wedding seating chart",
  metaTitle: "How to Make a Wedding Seating Chart, Step by Step — Vmeste",
  description: "How to make a wedding seating chart: when to start, which tables to choose, who sits where, seating etiquette and how guests find their table.",
  excerpt: "A step-by-step method from guest groups to table cards — plus the etiquette that keeps everyone happy.",
  topic: "Seating",
  published: "2026-10-10",
  answer:
    "To make a wedding seating chart, wait until most RSVPs are in, split guests into groups (families, friends, colleagues), choose table shapes that fit your floor plan, seat the couple and parents first, then whole groups, then guests who are coming alone. Print the final chart and make sure every guest can find their table quickly at the entrance.",
  blocks: [
    h2("when-to-start", "When to start the seating chart"),
    p("Seating is one of the last planning tasks, and that’s fine. Until guests have replied, you’re seating people who might not come. The working order is: guest list, then invitations and RSVPs, and only when most guests have confirmed — the seating chart."),
    p("Still, think about seating when you choose the venue. The room decides which tables are possible: round tables, long banquet rows or a mix. Ask the venue which tables they have, how many people fit at each, and where the stage, dance floor and exits are."),
    tip("Your RSVP deadline drives the seating chart", "Give guests a specific reply-by date. A couple of days after it, your list is nearly final and you can sit down with the plan. See [how to collect wedding RSVPs online](/en/blog/how-to-collect-wedding-rsvps-online)."),

    h2("step-by-step", "Step-by-step seating plan"),
    h3("1. Group your guests"),
    p("Don’t try to place a hundred people one by one. Split the list into groups: the bride’s family, the groom’s family, school friends, university friends, each partner’s colleagues. A group almost always fills one table or neighbouring ones, so the job becomes placing a handful of groups. Within each group, mark couples, families with children and guests coming alone. Couples and families stay together — that’s rule number one."),
    h3("2. Choose your tables and draw the room"),
    p("Sketch the room roughly to scale: walls, entrance, stage or MC spot, dance floor, bar, exits. Place tables where they will actually stand — a chart that doesn’t match the room confuses guests and staff alike."),
    table(
      ["Table shape", "Pros", "Cons"],
      [
        ["Round", "Everyone can see each other; easy to seat groups", "Takes more space; some guests face away from the stage"],
        ["Long rows", "Fits more guests; feels like a big family feast", "You only talk to your neighbours; harder to separate groups"],
        ["Oval", "A middle ground between round and rows", "Not every venue has them"],
        ["Head table", "The couple is visible to everyone; classic look", "The couple sits apart from guests"],
      ],
    ),
    h3("3. Seat the couple"),
    p("Put the couple’s table where everyone can see it — usually opposite the entrance or next to the dance floor. Choose between a classic head table with the wedding party, a sweetheart table for two, or a shared table with your closest friends."),
    h3("4. Seat parents and grandparents"),
    p("Parents usually sit close to the couple, often with grandparents. If parents are divorced and things are tense, give each their own equally prominent table with their side of the family. Seat older guests away from speakers and closer to exits and restrooms."),
    h3("5. Place groups, then single guests"),
    p("Close friends go nearer the couple and the dance floor; colleagues and distant relatives further out. Then seat guests coming alone next to people of a similar age or with shared interests — and with at least one person they know."),
    ul(
      "Avoid a “singles table” — it tends to feel awkward.",
      "Seat children next to their parents, or set up a kids’ table close by.",
      "Leave one or two spare seats for last-minute changes.",
    ),
    h3("6. Check for friction"),
    p("Go through the chart asking “who shouldn’t sit together?” Exes, feuding relatives, a boss and an unhappy employee. They don’t need opposite corners — separate tables not facing each other are usually enough."),
    h3("7. Print and label"),
    p("Prepare the floor plan, table numbers or names, place cards if you assign seats, and an alphabetical guest list with table numbers for the coordinator. Print everything in advance and give a copy to the venue."),

    h2("finding-seats", "How guests find their seats"),
    ol(
      "**A seating board at the entrance.** An alphabetical list with table numbers is easier to scan than a list by table.",
      "**Escort cards.** Each guest picks up a card with their table number.",
      "**A QR code at the entrance.** Guests scan it, type their name and see their table on the floor plan — no queue at the board, and last-minute changes don’t require reprinting.",
    ),
    p("The [Vmeste seating chart](/en/wedding-seating-chart) supports the third option: the QR sign prints as a PDF, and the search copes with nicknames and typos. Print a plain guest list too, in case the signal is weak."),

    h2("etiquette", "Seating etiquette"),
    ul(
      "**Never split couples**, even if you only know one of them.",
      "**Treat both families equally** — don’t put one side next to the couple and the other by the back wall.",
      "**Give the best seats to those who helped** — the wedding party, godparents, anyone who pitched in.",
      "**Don’t use seating to make a point.** A wedding is no place to send someone to the table by the kitchen.",
    ),

    h2("tools", "Paper, spreadsheet or online"),
    p("Paper with sticky notes is visual, but every change means redrawing. A spreadsheet is easy to edit but doesn’t show the room. An online seating chart combines both: a floor plan with real table shapes and a list connected to your RSVPs."),
    p("In Vmeste, seating uses the same guest list as your invitations, so you can see who has accepted and who declined. Drag guests into seats with a mouse or tap them in on a phone; the couple’s table is set apart, and the finished plan and table cards print as PDF."),
    cta("Seat your guests on your own floor plan", "Draw the room, drag guests into seats and print the table cards.", "/register?lang=en", "Try the seating chart"),
  ],
  faq: [
    { q: "How far in advance should I do the seating chart?", a: "Start a draft once most guests have replied. The final chart usually goes to the venue a few days before the wedding — ask your venue for their deadline." },
    { q: "How many guests per table?", a: "It depends on the table size and the venue. Ask how many people fit comfortably at their tables, not the absolute maximum." },
    { q: "Do I need assigned seats or just assigned tables?", a: "Assigning tables is usually enough — guests sort out the seats themselves. Assigned seats with place cards suit formal weddings or situations where certain guests need to be kept apart." },
    { q: "Where should the wedding party sit?", a: "At or next to the couple’s table. They support the couple all evening, so they should be able to get to them quickly." },
    { q: "What if an unexpected guest turns up?", a: "That’s what the spare seats are for. In an online seating chart you can type the new guest straight into the plan, and they’re added to your guest list." },
  ],
  related: ["/en/wedding-seating-chart", "how-to-collect-wedding-rsvps-online", "wedding-invitation-wording"],
};
