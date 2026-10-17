/**
 * SEO utility — dynamically injects meta tags from database content.
 * Supports title, description, keywords, Open Graph, Twitter Card, canonical.
 */
import { useEffect } from "react";

interface SEOData {
  title: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
}

function setMeta(attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setLink(rel: string, href: string) {
  let el = document.head.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

/** Hook to set SEO meta tags from database-driven content. */
export function useSEO(data: SEOData) {
  useEffect(() => {
    document.title = data.title;

    if (data.description) {
      setMeta("name", "description", data.description);
      setMeta("property", "og:description", data.description);
      setMeta("name", "twitter:description", data.description);
    }

    if (data.keywords) {
      setMeta("name", "keywords", data.keywords);
    }

    setMeta("property", "og:title", data.title);
    setMeta("name", "twitter:title", data.title);
    setMeta("property", "og:type", "website");
    setMeta("name", "twitter:card", "summary_large_image");

    if (data.image) {
      setMeta("property", "og:image", data.image);
      setMeta("name", "twitter:image", data.image);
    }

    const url = data.url ?? window.location.href;
    setLink("canonical", url);
    setMeta("property", "og:url", url);
  }, [data.title, data.description, data.keywords, data.image, data.url]);
}
