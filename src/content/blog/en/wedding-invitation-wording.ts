import type { Article } from "../../types";
import { cta, examples, h2, p, tip, ul } from "../../blocks";

export const invitationWording: Article = {
  lang: "en",
  slug: "wedding-invitation-wording",
  alternate: "tekst-priglasheniya-na-svadbu",
  title: "Wedding invitation wording: 30 examples for every style",
  short: "Wedding invitation wording: 30 examples",
  metaTitle: "Wedding Invitation Wording: 30 Examples — Vmeste",
  description: "30 wedding invitation wording examples — formal, from the parents, casual, funny and short for a text — plus what every invitation must include.",
  excerpt: "30 ready-to-use examples in every tone, and the details every invitation needs so guests don’t have to ask.",
  topic: "Invitations",
  published: "2026-10-10",
  answer:
    "Good wedding invitation wording answers five questions: who is hosting, who is invited, when (date, day and time), where (venue and address) and by when to reply. Everything else is tone — formal, warm or playful. Below are 30 examples you can use as they are or mix and match, plus the mistakes that leave guests texting you with questions.",
  blocks: [
    h2("what-to-include", "What every wedding invitation should include"),
    p("Pretty words come second. An invitation is a practical document: guests use it to plan their day, book travel and arrange childcare. Check that yours covers:"),
    ul(
      "**Who is hosting.** Usually the couple; sometimes one or both sets of parents.",
      "**Who is invited.** Address guests by name, and name both people if you’re inviting a couple.",
      "**Date, day and time.** The day of the week prevents mix-ups. Give the time guests should arrive, not just when the ceremony starts.",
      "**Venue and address.** Add parking, transport or directions if the venue is hard to find.",
      "**RSVP deadline and how to reply.** “Kindly reply by June 15” — without a date, replies trickle in until the week of the wedding.",
      "**Extras, if relevant:** dress code, adults-only, plus-ones, gift wishes, accommodation.",
    ),
    tip("Arrival time is not ceremony time", "If the ceremony starts at 4:00 pm, invite guests for 3:30. People need time to park, find their seats and say hello — and the ceremony shouldn’t wait for latecomers."),

    h2("formal", "Formal wedding invitation wording"),
    examples(
      ["1. Classic, hosted by the couple", "Together with their families\nEmily Carter and James Walker\nrequest the pleasure of your company\nat the celebration of their marriage\nSaturday, the twelfth of September\nat four o’clock in the afternoon\nThe Old Mill, Riverside Lane"],
      ["2. Hosted by the bride’s parents", "Mr. and Mrs. Robert Hayes\nrequest the honour of your presence\nat the marriage of their daughter\nSophie Anne\nto\nDaniel Brooks\nSaturday, the fifth of June\nat three o’clock\nSt. Mary’s Church, Oxford"],
      ["3. Hosted by both families", "Together with their parents\nAnna Petrova and Michael Green\ninvite you to share in their joy\nas they exchange vows\nFriday, August 21, at 5 pm\nLakeview Gardens"],
      ["4. Religious ceremony", "With joy and thanks to God\nwe invite you to the marriage of\nGrace Miller and Thomas Reed\nSaturday, May 16, at 2 pm\nHoly Trinity Church\nReception to follow"],
      ["5. Two venues", "Olivia and Ethan invite you to their wedding.\nCeremony at 2 pm at the Town Hall,\nfollowed by dinner and dancing at 5 pm\nat The Orchard House.\nKindly reply by July 1."],
      ["6. Minimalist", "Laura & Ben\nare getting married\n09.19.2026\nThe Glasshouse, London\nPlease reply by August 1"],
      ["7. For colleagues", "Dear Mr. Johnson,\nWe would be delighted if you could join us\nfor our wedding on Saturday, October 10, at 4 pm\nat Hillside Manor.\nPlease let us know by September 1 whether you can attend."],
    ),

    h2("warm", "Warm and personal wording"),
    examples(
      ["8. For close friends", "You’ve been with us from the very first date — so of course we want you there when we say “I do.” Saturday, June 20, 4 pm, at The Barn. Please reply by May 20."],
      ["9. Our story", "Five years ago we met at a friend’s birthday party. On September 5 we’re getting married, and we’d love you to celebrate with us at Rosewood Farm at 3 pm."],
      ["10. Small wedding", "We’re keeping it small — just the people we love most. Join us for dinner and our vows on Friday, April 24, at 6 pm at Luca’s Restaurant."],
      ["11. Summer garden", "A long summer evening, fairy lights and good friends. Join us on Saturday, July 11, at 5 pm in the garden at Maple Cottage."],
      ["12. Winter wedding", "Cold outside, warm inside. Join us for our winter wedding on Saturday, December 12, at 3 pm at The Lodge. Hot chocolate guaranteed."],
      ["13. For grandparents", "Dear Grandma, this day wouldn’t be complete without you. We’re getting married on Saturday, August 15, at 2 pm, and we’ve saved you the best seat."],
      ["14. Together for years", "Nine years, two kids and one dog later, we’re making it official. Come celebrate with us on Saturday, June 6, at 4 pm at The Boathouse."],
      ["15. Destination wedding", "We’re getting married by the sea! Saturday, September 12, in Kotor, Montenegro. Details on travel and hotels are in the invitation. Please reply by June 1 so we can plan together."],
    ),

    h2("funny", "Funny wedding invitation wording"),
    examples(
      ["16. Official announcement", "Breaking news: Kate and Sam are officially retiring from single life. Farewell party on Saturday, August 22, at 5 pm at The Yard. Dress code: ready to dance."],
      ["17. The dog’s invitation", "Woof! My humans, Lucy and Mark, are finally getting married. I’ll be the ring bearer. Saturday, June 13, 3 pm, Willow Park. Please RSVP — I need to count the treats."],
      ["18. Weather forecast", "Forecast for Saturday, July 25: from 4 pm at The Terrace, a 100% chance of love, scattered tears and heavy dancing until midnight."],
      ["19. For tech friends", "Release date: September 26, 4 pm. Two years of beta testing completed successfully. Launch party at The Loft — RSVP by August 26 to get on the list."],
      ["20. Eat, drink, be married", "We’re getting married! There will be food, drinks and questionable dancing. Saturday, May 30, 5 pm, at Brick Lane Hall."],
      ["21. Short and sweet", "We decided being together is more fun — now it’s official. Saturday, October 3, 4 pm. Be there!"],
    ),

    h2("short", "Short wording for a text or messenger"),
    examples(
      ["22. Universal", "Anna and Mike are getting married! Saturday, August 15, 4 pm, at The Willows. All the details and the RSVP are at the link — please reply by July 15."],
      ["23. For a friend", "Hi Mia! Josh and I are getting married on October 3 and we really want you there. Here’s your invitation — RSVP takes one minute."],
      ["24. Save the date", "Save the date: September 12, 2026. Nastya and Ilya are getting married! The full invitation will follow."],
      ["25. Family group chat", "Hi everyone! We’re sending out invitations — each of you will get a personal link from us. You can RSVP right in the invitation."],
    ),

    h2("special-cases", "Wording for tricky situations"),
    examples(
      ["26. Adults-only", "We love your little ones, but we’ve planned this celebration as an adults-only evening. We hope you can enjoy a night off with us!"],
      ["27. Cash gifts", "Your presence is the greatest gift. If you’d like to give something more, a contribution to our honeymoon fund would mean the world to us."],
      ["28. Plus-ones", "This invitation is for you and a guest. Please add their name when you RSVP so we can seat you together."],
      ["29. No plus-one", "Our venue has limited space, so we’re only able to invite the guests named on this invitation. Thank you for understanding."],
      ["30. Date change", "Please note: our wedding has moved from August 15 to August 22. The time and venue stay the same. Kindly update your RSVP using the same link."],
    ),

    h2("make-it-personal", "How to make the invitation feel personal"),
    p("The most powerful word in any invitation is the guest’s name. “Dear Rachel” reads very differently from “Dear guests.” With paper, that means writing every card by hand; with an online invitation, the name can be filled in for each guest automatically."),
    p("In Vmeste every guest gets their own link to the [online invitation](/en/wedding-invitations). Their name is already on it, and your dashboard shows who has opened the invitation and what they replied. Need a quick way to collect replies? Read [how to collect wedding RSVPs online](/en/blog/how-to-collect-wedding-rsvps-online)."),

    h2("mistakes", "Common wording mistakes"),
    ul(
      "**No RSVP deadline.** Without a date, guests put off replying.",
      "**A date without the day of the week.** “Saturday, August 15” is harder to misread than “8/15.”",
      "**A joke instead of information.** The date and venue must be readable at a glance.",
      "**Unclear who is invited.** If you’re inviting a family with children or a guest with a plus-one, say so.",
      "**Too much text.** Anything beyond five or six lines belongs in separate sections: schedule, map, dress code.",
      "**Misspelled names.** Double-check them — people remember.",
    ),
    cta("Put a name on every invitation", "Pick a design, add your wording, and each guest gets their own link with an RSVP form.", "/register?lang=en", "Create your invitation"),
  ],
  faq: [
    { q: "Is it “honour of your presence” or “pleasure of your company”?", a: "Traditionally, “the honour of your presence” is used for ceremonies in a place of worship, and “the pleasure of your company” for other venues. Today either is fine — just pick one and stay consistent." },
    { q: "When should wedding invitations go out?", a: "Commonly two to three months before the wedding. For destination weddings or guests who need to travel, send a save-the-date earlier and the full invitation later." },
    { q: "Who is named first on a wedding invitation?", a: "Traditionally the bride is named first, but there’s no strict rule today. Couples can simply list names in whatever order sounds best." },
    { q: "How do I politely ask for cash gifts?", a: "Keep it short and gracious: say their presence matters most, then mention what a contribution would go toward, such as a honeymoon. An online invitation can include an envelope with payment details, so the wording only needs one sentence." },
  ],
  related: ["/en/wedding-invitations", "how-to-collect-wedding-rsvps-online", "how-to-make-a-wedding-seating-chart"],
};
