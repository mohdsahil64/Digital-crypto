import { useEffect } from "react";

/**
 * Per-page SEO. Sets the document <title> plus description / Open Graph / Twitter
 * meta tags for the current route. This is a client-rendered SPA, so we update the
 * <head> imperatively on mount and restore nothing (each page sets its own values).
 *
 * Usage:
 *   <Seo title="Dashboard" description="Your rewards and team at a glance." />
 *
 * `title` is suffixed with the brand automatically unless `rawTitle` is passed.
 */
const BRAND = "Decentralized World";
const SITE_URL = "https://decentralizeed.site";
const DEFAULT_IMAGE = `${SITE_URL}/og-image.png`;

function setMeta(attr, key, content) {
  if (!content) return;
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setCanonical(href) {
  let el = document.head.querySelector('link[rel="canonical"]');
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

export default function Seo({
  title,
  description,
  image = DEFAULT_IMAGE,
  rawTitle = false,
  noindex = false,
}) {
  const fullTitle = !title ? BRAND : rawTitle ? title : `${title} · ${BRAND}`;

  useEffect(() => {
    document.title = fullTitle;

    const url = typeof window !== "undefined" ? window.location.href : SITE_URL;
    const absImage = image?.startsWith("http") ? image : `${SITE_URL}${image}`;

    setMeta("name", "description", description);
    setMeta("name", "robots", noindex ? "noindex, nofollow" : "index, follow");
    setCanonical(url);

    // Open Graph
    setMeta("property", "og:title", fullTitle);
    setMeta("property", "og:description", description);
    setMeta("property", "og:url", url);
    setMeta("property", "og:image", absImage);
    setMeta("property", "og:type", "website");
    setMeta("property", "og:site_name", BRAND);

    // Twitter
    setMeta("name", "twitter:card", "summary_large_image");
    setMeta("name", "twitter:title", fullTitle);
    setMeta("name", "twitter:description", description);
    setMeta("name", "twitter:image", absImage);
  }, [fullTitle, description, image, noindex]);

  return null;
}
