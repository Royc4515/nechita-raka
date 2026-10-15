/** The site's own address, for links in answers. Its own module so knowledge.js and courses.js can share it. */
export const SITE_URL = (process.env.SITE_URL || "https://nechita-raka.vercel.app").replace(/\/+$/, "");
