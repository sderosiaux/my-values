// Copy validated by Stéphane on 2026-10-11. Do not reword without asking him.
export type AccentKey = 'ember' | 'amber' | 'blue' | 'violet' | 'green' | 'pink';

export type Value = {
  readonly word: string;
  readonly line: string;
  readonly paragraph: string;
  readonly accent: AccentKey;
  readonly objective: string;
};

export const VALUES: readonly Value[] = [
  {
    word: 'END TO END',
    line: 'I take ideas all the way to prod.',
    paragraph:
      'We think end to end, from the idea to production, with no handoff. AI makes that possible now: build something quick to back your idea, then carry it through and fix the root cause, not the symptom. How far you go depends on how critical it is. Internal tools are the perfect place to start.',
    accent: 'ember',
    objective: 'Reach prod',
  },
  {
    word: 'SPEED',
    line: 'Fast if I can undo it. Careful if not.',
    paragraph:
      "If it takes less than 5 minutes, we do it now. If it can be undone, we move fast. If it can't, we slow down and get it right.",
    accent: 'amber',
    objective: 'Cross the street',
  },
  {
    word: 'SHOW IT',
    line: "I'd rather demo than pitch.",
    paragraph:
      'We ask questions, try things, then show. Talk less, do more. Demos beat presentations. Working code beats wireframes.',
    accent: 'blue',
    objective: 'Get past the pitch',
  },
  {
    word: 'LIMITS',
    line: 'Push the tools. Admit my limits.',
    paragraph:
      "Don't follow others, make them follow you: lead by testing things and pushing them to the max. Know the limits of your tools, and know your own. Being honest about your strengths and weaknesses is how a team moves faster. Me: I move terribly fast alone and want to do everything myself. But I lack expertise in many domains, and I can't judge what AI tells me there. That's why I need people with real expert judgment around me.",
    accent: 'violet',
    objective: 'Cross the gap',
  },
  {
    word: 'JUDGMENT',
    line: 'AI does the work. I make the call.',
    paragraph:
      "You're still human, and your judgment is what makes you great. Decide, and name the tradeoff. Say what you don't know. No judgment? I don't need you.",
    accent: 'green',
    objective: 'Pick a route',
  },
  {
    word: 'SHARE',
    line: 'I share everything I learn.',
    paragraph: 'Sharing is caring, massively. Communicating is a skill you build. Not communicating is an anti-skill.',
    accent: 'pink',
    objective: 'Pass it on',
  },
];

export const PROMISE =
  "Own your direction. It's possible now, but it takes curiosity and a lot of energy. I will let you spread your wings, and push you to. I can guide, but you're the hero: I'll feed you context and ideas, and you take what you want.";

export const JUDGMENT_FAIL = "No judgment? I don't need you.";
