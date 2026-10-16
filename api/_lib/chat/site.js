import { FACULTY } from "../../../faculties/index.js";

/** The site's own address, for links in answers: SITE_URL from the environment, or the faculty's canonical one. Its own module so knowledge.js and courses.js can share it. */
export const SITE_URL = (process.env.SITE_URL || FACULTY.site.url).replace(/\/+$/, "");
