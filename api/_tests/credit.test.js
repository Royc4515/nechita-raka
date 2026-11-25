import { test } from "node:test";
import assert from "node:assert/strict";
import { FACULTIES } from "../../faculties/index.js";
import { loadData, personNode } from "../../scripts/prerender.mjs";

const LINKEDIN = "https://www.linkedin.com/in/roy-carmelli";
const PORTFOLIO = "https://roy-carmelli-portfolio.vercel.app/";
const GITHUB = "https://github.com/Royc4515";

for (const faculty of Object.values(FACULTIES)) {
  test(`${faculty.id}: the author's links are the same on every faculty site`, () => {
    const { site } = loadData(faculty);
    assert.equal(site.author, "רועי כרמלי");
    assert.equal(site.authorUrl, LINKEDIN);
    assert.equal(site.portfolioUrl, PORTFOLIO);
    assert.equal(site.githubUrl, GITHUB);
  });

  test(`${faculty.id}: the JSON-LD author lists LinkedIn, portfolio and GitHub`, () => {
    const person = personNode(loadData(faculty).site);
    assert.equal(person.url, LINKEDIN);
    assert.deepEqual(person.sameAs, [LINKEDIN, PORTFOLIO, GITHUB]);
  });
}

test("personNode skips a missing or unsafe GitHub URL", () => {
  const person = personNode({ author: "רועי כרמלי", authorUrl: LINKEDIN, githubUrl: "javascript:alert(1)" });
  assert.deepEqual(person.sameAs, [LINKEDIN]);
});
