import React from "react";

interface FormattedChatMessageProps {
  text: string;
  isUser?: boolean;
}

// Target verified emergency and helpline numbers in Malaysia
// 999 (Emergency), 15555 (Talian HEAL), 15999 (Talian Kasih),
// 03-xxxx xxxx landlines (Befrienders 03-7627 2929, etc.),
// 01x-xxxxxxx mobile numbers
const PHONE_PATTERN =
  /(?:\b(?:999|15555|15999)\b)|(?:03[- ]\d{4}[- ]?\d{4})|(?:01\d[- ]?\d{7,8})/;

function cleanPhoneNumber(phone: string): string {
  return phone.replace(/[- ]/g, "");
}

function renderFormattedLine(line: string, lineKey: string | number): React.ReactNode {
  // First, parse bold blocks: **bold text**
  const boldRegex = /\*\*([^*]+)\*\*/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = boldRegex.exec(line)) !== null) {
    if (match.index > lastIndex) {
      const beforeText = line.substring(lastIndex, match.index);
      parts.push(...renderTextWithPhoneLinks(beforeText, `${lineKey}-pre-${lastIndex}`));
    }
    const boldText = match[1];
    parts.push(
      <strong key={`${lineKey}-bold-${match.index}`}>
        {renderTextWithPhoneLinks(boldText, `${lineKey}-binner-${match.index}`)}
      </strong>,
    );
    lastIndex = boldRegex.lastIndex;
  }

  if (lastIndex < line.length) {
    const remainingText = line.substring(lastIndex);
    parts.push(...renderTextWithPhoneLinks(remainingText, `${lineKey}-post-${lastIndex}`));
  }

  return parts;
}

function renderTextWithPhoneLinks(text: string, keyPrefix: string): React.ReactNode[] {
  const elements: React.ReactNode[] = [];
  let remaining = text;
  let subIndex = 0;

  while (remaining.length > 0) {
    const match = PHONE_PATTERN.exec(remaining);
    if (!match) {
      elements.push(remaining);
      break;
    }

    const matchStart = match.index;
    const matchStr = match[0];

    if (matchStart > 0) {
      elements.push(remaining.substring(0, matchStart));
    }

    const cleanDigits = cleanPhoneNumber(matchStr);
    elements.push(
      <a
        key={`${keyPrefix}-tel-${subIndex++}`}
        href={`tel:${cleanDigits}`}
        className="chat-phone-link"
        title={`Call ${matchStr}`}
        aria-label={`Call ${matchStr}`}
      >
        <svg
          className="w-3 h-3 inline-block shrink-0 opacity-80"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.5}
            d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
          />
        </svg>
        <span>{matchStr}</span>
      </a>,
    );

    remaining = remaining.substring(matchStart + matchStr.length);
  }

  return elements;
}

export function FormattedChatMessage({ text, isUser }: FormattedChatMessageProps) {
  if (isUser) {
    return <div className="message-content">{text}</div>;
  }

  // Normalize line endings
  const normalizedText = text.replace(/\r\n/g, "\n");
  // Split into distinct paragraphs on double newlines
  const rawParagraphs = normalizedText
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (rawParagraphs.length === 0) {
    return <div className="message-content">{text}</div>;
  }

  return (
    <div className="message-content">
      {rawParagraphs.map((paragraph, pIdx) => {
        // Handle single newlines inside paragraph (e.g. hotline lists)
        const lines = paragraph.split("\n");
        return (
          <p key={`p-${pIdx}`} className="message-paragraph">
            {lines.map((line, lIdx) => (
              <React.Fragment key={`p-${pIdx}-l-${lIdx}`}>
                {renderFormattedLine(line, `p-${pIdx}-l-${lIdx}`)}
                {lIdx < lines.length - 1 && <br />}
              </React.Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}

export default FormattedChatMessage;
