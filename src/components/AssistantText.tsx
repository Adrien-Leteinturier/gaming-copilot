export default function AssistantText({ text }: { text: string }) {
  const parts = text.split(/(https:\/\/[^\s<>]+)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (!part.startsWith("https://")) return <span key={i}>{part}</span>;
        const href = part.replace(/[),.;]+$/, "");
        const suffix = part.slice(href.length);
        try {
          const url = new URL(href);
          return (
            <span key={i}>
              <a href={url.href} target="_blank" rel="noopener noreferrer">
                {url.hostname.replace(/^www\./, "")} · source
              </a>
              {suffix}
            </span>
          );
        } catch {
          return <span key={i}>{part}</span>;
        }
      })}
    </>
  );
}
