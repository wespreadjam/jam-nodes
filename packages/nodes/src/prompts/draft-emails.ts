import type { Contact } from '../schemas/ai';

/**
 * Build the email body generation prompt.
 */
export function buildEmailPrompt(
  contact: Contact,
  productDescription: string,
  senderName: string,
  template?: string
): string {
  const signatureInstruction = `

SIGNATURE: End the email with:
Best,
${senderName}`;

  if (template) {
    return `Use this template to write a personalized cold email.

Template: ${template}

Contact: ${contact.name}, ${contact.title} at ${contact.company}
Product: ${productDescription}

STRICT RULES:
- 3-4 sentences MAX (excluding signature)
- DO NOT include "Subject:" in the body, only output email content
- Replace placeholders and personalize
- No fluff, every word must earn its place
- No em dashes or double hyphens
${signatureInstruction}`;
  }

  return `Write a cold outreach email.

TO: ${contact.name}, ${contact.title} at ${contact.company}
SELLING: ${productDescription}

STRICT FORMAT (3-4 sentences only):
1. HOOK: One line referencing their specific role/company/challenge
2. VALUE: What THEY get (not what you do) - be specific
3. CTA: Tiny ask - "quick call" or "10 min chat" - make it easy to say yes

RULES:
- DO NOT include "Subject:" line - only output the email body
- 3-4 sentences MAX (excluding signature). No more.
- Write like a busy founder texting, not a marketer writing copy
- No fluff words: "just", "actually", "really", "I wanted to", "I'd love to"
- No cliches: "reaching out", "hope this finds you well", "excited to share"
- No buzzwords: "innovative", "cutting-edge", "revolutionary", "game-changing"
- No em dashes or double hyphens. Use periods or commas instead.
- Create subtle urgency without being fake
- Sound like you spent 2 minutes researching them (because you did)

GOOD EXAMPLE:
Hey Sarah,

Running content at a Series A startup is tough. You're probably creating way more than you can actually promote. Built something that finds the exact keywords your buyers search and turns them into content briefs. Takes 10 min to see if it's useful for Acme.

Worth a quick look?
${signatureInstruction}`;
}

/**
 * Build the subject line generation prompt.
 */
export function buildSubjectPrompt(contact: Contact, emailBody: string): string {
  const company = contact.company || 'company';
  const companyShort = (company.split(' ')[0] ?? company).toLowerCase();

  return `Write a subject line for this cold email.

Email: ${emailBody}

Recipient: ${contact.name} at ${contact.company}

RULES:
- 3-6 words, under 35 chars
- lowercase, no punctuation except commas
- NO dashes, hyphens, em dashes, or colons
- Lead with SPECIFIC VALUE they get (keyword found, traffic opportunity, etc.)
- Include company name, not person name
- Sound like a slack message from a colleague, not marketing

BANNED PATTERNS (do not use):
- "Never X again" / "Stop X-ing"
- "Unlock" / "Discover" / "Transform"
- "AI-powered" / "Game-changing"
- Any tagline or slogan style
- Questions

GOOD: "found 3 keywords for ${companyShort}"
GOOD: "${companyShort} seo opportunity"
GOOD: "traffic idea for ${companyShort}"
GOOD: "${companyShort} ranking on page 2"

BAD: "Never launch to crickets again"
BAD: "Quick question about your SEO"
BAD: "Unlock your SEO potential"
BAD: "${contact.name} - quick idea"

Output ONLY the subject line, lowercase, no quotes.`;
}

/**
 * Clean up email body text.
 * Removes subject lines and em dashes.
 */
export function cleanEmailBody(body: string): string {
  return body
    .replace(/^Subject:.*\n\n?/i, '')
    .replace(/\s*[—–]\s*/g, '. ')
    .replace(/\s*--\s*/g, '. ')
    .trim();
}

/**
 * Clean up subject line text.
 */
export function cleanSubjectLine(subject: string): string {
  return subject
    .replace(/^["']|["']$/g, '')
    .replace(/^subject:\s*/i, '')
    .replace(/\s*[—–]\s*/g, ', ')
    .replace(/\s+-\s+/g, ', ')
    .replace(/:/g, '')
    .toLowerCase()
    .trim();
}
