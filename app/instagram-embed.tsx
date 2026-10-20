"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    instgrm?: { Embeds?: { process: () => void } };
  }
}

const scriptId = "instagram-embed-script";

export default function InstagramEmbed({ url, title }: { url: string; title: string }) {
  useEffect(() => {
    const render = () => window.instgrm?.Embeds?.process();
    const existingScript = document.getElementById(scriptId) as HTMLScriptElement | null;

    if (existingScript) {
      existingScript.addEventListener("load", render);
      render();
      return () => existingScript.removeEventListener("load", render);
    }

    const script = document.createElement("script");
    script.id = scriptId;
    script.async = true;
    script.src = "https://www.instagram.com/embed.js";
    script.addEventListener("load", render);
    document.body.appendChild(script);
    return () => script.removeEventListener("load", render);
  }, [url]);

  return <div className="instagram-embed"><blockquote className="instagram-media" data-instgrm-permalink={url} data-instgrm-version="14"><a href={url} target="_blank" rel="noreferrer">{title}</a></blockquote></div>;
}
