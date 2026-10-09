import type { Article } from "../../types";
import { cta, examples, h2, h3, ol, p, table, tip, ul } from "../../blocks";

export const rsvpOnline: Article = {
  lang: "en",
  slug: "how-to-collect-wedding-rsvps-online",
  alternate: "kak-sobrat-otvety-gostej",
  title: "How to collect wedding RSVPs online: questions, deadlines and reminders",
  short: "How to collect wedding RSVPs online",
  metaTitle: "How to Collect Wedding RSVPs Online — Vmeste",
  description: "How to collect wedding RSVPs online: which questions to ask, when to set the deadline, how to remind guests who haven’t replied and where to keep replies.",
  excerpt: "Which questions to ask, when to set the RSVP deadline and how to nudge guests who go quiet.",
  topic: "Guests",
  published: "2026-10-10",
  answer:
    "To collect wedding RSVPs online, add a short RSVP form to your invitation (attending or not, plus-one, meal choice and anything else that affects planning), set a specific reply-by date and keep every answer in one place rather than scattered across messages. A week before the deadline, send a short personal reminder to anyone who hasn’t replied.",
  blocks: [
    h2("why", "Why RSVPs matter"),
    p("An RSVP isn’t a formality. It drives your final headcount for the venue, the number of each meal, how many tables you need and who sits where, plus transport and accommodation. Until replies are in, all of those numbers are guesses."),
    p("RSVP comes from the French “répondez s’il vous plaît” — “please reply.” On an invitation it’s usually a simple line: “Kindly reply by June 15.”"),

    h2("questions", "What to ask on your RSVP form"),
    p("The golden rule: only ask what you’ll actually use. Every extra question is a reason to reply “later.” A good form takes a minute."),
    h3("The essentials"),
    ul(
      "**Will you attend?** Two options: “Joyfully accepts” and “Regretfully declines.”",
      "**Are you bringing a plus-one?** Only if you’ve offered one — and ask for their name for seating and place cards.",
    ),
    h3("Helpful extras"),
    ul(
      "**Meal choice**, if the caterer offers options such as fish, meat or vegetarian.",
      "**Drinks**, to help plan the bar.",
      "**Allergies and dietary needs** — better to know now than at dinner.",
      "**Transport and accommodation**, for out-of-town venues and travelling guests.",
      "**Children**, if they’re invited: ages, high chairs, kids’ meals.",
      "**A song request** — guests enjoy it, and your DJ gets a list of songs people will dance to.",
    ),
    tip("Keep it short", "Save “How did you meet the couple?” and “Your wishes for us” for the day itself. The RSVP form is for logistics."),

    h2("deadline", "When to set the RSVP deadline"),
    p("Work backwards from the date your venue needs final numbers, then add time for seating and printing. Three to four weeks before the wedding usually works; check with your venue and add a week or two of buffer. Always give a specific date — “by July 15,” not “as soon as possible.”"),
    table(
      ["When", "What to do"],
      [
        ["2–3 months before", "Send invitations with the RSVP form and deadline"],
        ["2 weeks after sending", "See who hasn’t opened the invitation and resend the link"],
        ["1 week before the deadline", "Remind guests who opened it but didn’t reply"],
        ["On the deadline", "Call anyone still missing"],
        ["A few days after", "Send numbers to the venue and start seating"],
      ],
      "A sample RSVP timeline",
    ),

    h2("methods", "Ways to collect RSVPs"),
    h3("Texts and calls"),
    p("Familiar, but the most work. Replies arrive across different apps, some as voice notes, some as “yep, we’ll be there” without saying how many. Everything has to be copied into a spreadsheet by hand, and something always gets lost."),
    h3("A separate online form"),
    p("A survey form collects answers into a table. But guests type their own names, so you get duplicates (“Liz” and “Elizabeth Shaw”), typos and replies from people you didn’t invite — and you can’t see who never opened the form."),
    h3("An RSVP built into the invitation"),
    p("With an online invitation and a personal link per guest, the form is part of the invitation. Guests don’t type their name — the system knows whose link it is, and the reply lands in the right row. You can also see who hasn’t opened the invitation yet. That’s how the [Vmeste RSVP](/en/wedding-rsvp) works: ready-made questions for attendance, plus-one, meals and drinks, custom questions of several types, song requests, and a deadline after which the form closes."),

    h2("reminders", "How to remind guests who haven’t replied"),
    p("Silence usually means “forgot,” not “don’t want to come.” Keep reminders short and friendly, and include the link so guests can answer right away."),
    examples(
      ["Gentle nudge", "Hi! Just a reminder about our wedding on August 15. Could you let us know by July 15 if you can make it? It takes a minute: [link]"],
      ["For older relatives", "Dear Aunt Margaret, we’d love to have you at our wedding on August 15. Could you let us know if you can come? We need to give the venue our numbers by July 15."],
      ["Last call", "Today’s the last day we can add you to the list for the venue. Will you be there? Reply here or at the link: [link]"],
    ),

    h2("after", "What to do with the replies"),
    ol(
      "**Send the venue your numbers:** total headcount, meal counts and dietary needs.",
      "**Do the seating chart** with confirmed guests — see [how to make a wedding seating chart](/en/blog/how-to-make-a-wedding-seating-chart).",
      "**Share with your MC and DJ** the song requests and key details.",
      "**Keep the spreadsheet** — it’s handy for thank-you notes.",
    ),
    p("If replies are collected in Vmeste, nothing needs copying: seating uses the same guest list, meal choices are counted for you, and replies export as a CSV that opens in Excel or Google Sheets."),

    h2("mistakes", "Common mistakes"),
    ul(
      "**No deadline** — replies arrive right up to the wedding.",
      "**A long form** — guests save it for later and forget.",
      "**Unclear plus-one or children policy** — guests decide for themselves.",
      "**Replies in five different apps** — some get lost.",
      "**No reminder** — you end up calling everyone on the last day.",
    ),
    cta("Collect every RSVP in one table", "An RSVP form inside your invitation, a personal link per guest, and a clear view of who hasn’t replied.", "/register?lang=en", "Start collecting RSVPs"),
  ],
  faq: [
    { q: "How do I word the RSVP request?", a: "Be specific: “Kindly reply by July 15.” You can add the reason: “so we can give the venue our final numbers.”" },
    { q: "What if a guest says yes and then doesn’t show up?", a: "It happens, and you can’t prevent it entirely. A reminder a few days before the wedding with the schedule helps: guests see the date and time again and are more likely to tell you if plans have changed." },
    { q: "Should guests be able to change their RSVP?", a: "Yes — plans change. With a personal-link RSVP, guests can update their reply through the same link while the form is open. After the deadline, it’s easier to make changes yourself." },
    { q: "Do I need to ask about meals?", a: "Only if the caterer offers a choice. With a set menu, just ask about allergies and dietary needs." },
    { q: "What about guests who never reply?", a: "After a final personal reminder, decide for yourself — usually they’re not included in the final headcount. Let them know kindly to avoid hurt feelings." },
  ],
  related: ["/en/wedding-rsvp", "wedding-invitation-wording", "how-to-make-a-wedding-seating-chart"],
};
