// Shared bits for every outbound email.
//
// SMTP_REPLY_TO: where replies go. The sender is hello@merik.in, which has no
// mailbox, and every template says "reply to this email".
export const REPLY_TO = Deno.env.get("SMTP_REPLY_TO") || "merik.msk@gmail.com";

// A plain-text alternative derived from the HTML. Mail filters score
// HTML-only mail worse, and some clients show the text part in previews.
export function textOf(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (_m, href, label) => {
      const l = label.replace(/<[^>]+>/g, "").trim();
      return l && l !== href ? `${l} (${href})` : href;
    })
    .replace(/<\/(p|div|tr|li|h[1-6]|table)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&middot;/g, "\u00b7").replace(/&rsaquo;/g, "\u203a")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .split("\n").map((l) => l.trim()).join("\n")
    .replace(/[ \t]{2,}/g, " ").replace(/\n{3,}/g, "\n\n")
    .trim();
}
