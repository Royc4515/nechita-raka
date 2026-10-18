// The server's view of Shabbat: the same times the page uses (shabbat-times.js at the repo root, a plain script
// that puts its functions on globalThis.NR_SHABBAT so the browser can load it synchronously), plus the chat's answer.
import "../../../shabbat-times.js";
import { FACULTY } from "../../../faculties/index.js";

export const { CITY, candleLighting, havdalah, clock, shabbatState, parseClockOverride } = globalThis.NR_SHABBAT;

/** The chat's answer on Shabbat, in the voice of the mascot the student is talking to (a mascot id of the faculty), Hebrew or English. */
export function shabbatReply(personaId, hebrew, reopensAt, faculty = FACULTY) {
  const mascot = faculty.mascots.find((m) => m.id === personaId) || faculty.mascots.find((m) => m.id === faculty.defaultMascot);
  const time = clock(reopensAt);
  if (!hebrew) return `Shabbat shalom! ${mascot.nameEn} is resting, so we'll talk when Shabbat ends (after ${time}, Israel time).`;
  const rested = mascot.gender === "f" ? "נחה" : "נח";
  return `שבת שלום! ${mascot.name} ${rested} היום, נדבר במוצאי שבת (אחרי ${time}).`;
}
