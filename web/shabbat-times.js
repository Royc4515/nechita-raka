/*
  When Shabbat starts and ends in Israel, computed offline for any date, with no DOM and no network.
  Used by shabbat.js (the closed page in the browser), by api/_lib/chat/shabbat.js (the chat's answer) and by the
  tests (api/_tests/shabbat.test.js).

  Written so the same file works in both places: a plain script (no import or export, so the page can load it
  synchronously in the <head> and decide before the first paint) that puts its functions on globalThis.NR_SHABBAT;
  Node loads it with a side-effect import and api/_lib/chat/shabbat.js re-exports them.

  The method is the one Hebcal uses (NOAA solar position, sea-level sunset at 90.833 degrees):
  - candle lighting: CITY.candleMinutes before sunset (20 for Ramat Gan / Tel Aviv in Hebcal), the seconds dropped, so never later than Hebcal's;
  - havdalah: nightfall when the sun is CITY.havdalahDegrees below the horizon (Hebcal's default 8.5, "tzeit"), to the nearest minute.
  The computed values equal Hebcal's published times for Ramat Gan (geonameid 293788) to the minute on every Shabbat of
  2026-10 to 2027-12 (127 of 127); a table of them is in the tests.
  Change the city and the offsets here, in CITY, and nowhere else. Holidays (Yom Tov) are not handled.
*/
(function (root) {
  "use strict";

  /** Ramat Gan, the city Bar-Ilan sits in, as Hebcal has it (geonameid 293788, no elevation). */
  const CITY = Object.freeze({
    name: "Ramat Gan",
    geonameid: 293788,
    latitude: 32.08227,
    longitude: 34.81065,
    timeZone: "Asia/Jerusalem",
    candleMinutes: 20,
    havdalahDegrees: 8.5,
  });

  const MIN = 60000;
  const DAY = 24 * 60 * MIN;
  const SUNSET_ZENITH = 90.833; // the sun's centre at 0.833 degrees below the horizon: its edge and the refraction
  const rad = (d) => (d * Math.PI) / 180;
  const deg = (r) => (r * 180) / Math.PI;

  /** The sun's declination (degrees) and the equation of time (minutes) at `t` Julian centuries from J2000 (NOAA). */
  function sunAt(t) {
    const L0 = (280.46646 + t * (36000.76983 + t * 0.0003032)) % 360;
    const M = rad(357.52911 + t * (35999.05029 - 0.0001537 * t));
    const e = 0.016708634 - t * (0.000042037 + 0.0000001267 * t);
    const center = Math.sin(M) * (1.914602 - t * (0.004817 + 0.000014 * t)) + Math.sin(2 * M) * (0.019993 - 0.000101 * t) + Math.sin(3 * M) * 0.000289;
    const omega = rad(125.04 - 1934.136 * t);
    const lambda = L0 + center - 0.00569 - 0.00478 * Math.sin(omega);
    const seconds = 21.448 - t * (46.815 + t * (0.00059 - t * 0.001813));
    const obliquity = 23 + (26 + seconds / 60) / 60 + 0.00256 * Math.cos(omega);
    const declination = Math.asin(Math.sin(rad(obliquity)) * Math.sin(rad(lambda)));
    const y = Math.tan(rad(obliquity) / 2) ** 2;
    const L = rad(L0);
    const equation = 4 * deg(y * Math.sin(2 * L) - 2 * e * Math.sin(M) + 4 * e * y * Math.sin(M) * Math.cos(2 * L) - 0.5 * y * y * Math.sin(4 * L) - 1.25 * e * e * Math.sin(2 * M));
    return { declination, equation };
  }

  /** The evening instant (ms since the epoch) when the sun is at `zenith` degrees from straight up, on the UTC date y-m-d. */
  function eveningInstant(y, m, d, zenith, city) {
    const midnight = Date.UTC(y, m - 1, d);
    let minutes = 1020; // 17:00 UTC to start; two passes converge to well under a second
    for (let pass = 0; pass < 3; pass++) {
      const t = (midnight / DAY + 2440587.5 + minutes / 1440 - 2451545) / 36525;
      const { declination, equation } = sunAt(t);
      const lat = rad(city.latitude);
      const cosH = Math.cos(rad(zenith)) / (Math.cos(lat) * Math.cos(declination)) - Math.tan(lat) * Math.tan(declination);
      if (cosH < -1 || cosH > 1) return null; // no sunset or no such twilight that day (not in Israel)
      minutes = 720 - 4 * (city.longitude - deg(Math.acos(cosH))) - equation;
    }
    return midnight + minutes * MIN;
  }

  const roundToMinute = (ms) => Math.round(ms / MIN) * MIN;

  /** Candle lighting on the evening of the Gregorian date y-m-d (a Friday), as ms since the epoch. */
  function candleLighting(y, m, d, city = CITY) {
    return Math.floor((eveningInstant(y, m, d, SUNSET_ZENITH, city) - city.candleMinutes * MIN) / MIN) * MIN;
  }

  /** Havdalah on the evening of the Gregorian date y-m-d (a Saturday), as ms since the epoch. */
  function havdalah(y, m, d, city = CITY) {
    return roundToMinute(eveningInstant(y, m, d, 90 + city.havdalahDegrees, city));
  }

  const zoneFormats = new Map();
  function zoneFormat(timeZone) {
    if (!zoneFormats.has(timeZone)) {
      zoneFormats.set(timeZone, new Intl.DateTimeFormat("en-US", { timeZone, hourCycle: "h23", weekday: "short", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric" }));
    }
    return zoneFormats.get(timeZone);
  }
  const WEEKDAYS = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

  /** The wall clock of the instant `ms` in the city's time zone: { y, m, d, wd (0 = Sunday), h, min }. */
  function localParts(ms, city = CITY) {
    const p = Object.fromEntries(zoneFormat(city.timeZone).formatToParts(new Date(ms)).map((part) => [part.type, part.value]));
    return { y: Number(p.year), m: Number(p.month), d: Number(p.day), wd: WEEKDAYS[p.weekday], h: Number(p.hour), min: Number(p.minute) };
  }

  /** "18:43" for the instant `ms` on the city's wall clock. */
  function clock(ms, city = CITY) {
    const p = localParts(ms, city);
    return `${String(p.h).padStart(2, "0")}:${String(p.min).padStart(2, "0")}`;
  }

  /** The date y-m-d moved by `days`, as { y, m, d }. */
  function addDays(y, m, d, days) {
    const date = new Date(Date.UTC(y, m - 1, d + days));
    return { y: date.getUTCFullYear(), m: date.getUTCMonth() + 1, d: date.getUTCDate() };
  }

  /**
   * Where `ms` stands against Shabbat: { closed, candle, havdalah, opensAt, closesAt }.
   * `candle` and `havdalah` are the ends of the Shabbat the instant belongs to or comes before (the one on now when closed, else the next);
   * `reopensAt` is the end of the closing (when closed) and `closesAt` the next candle lighting (when open).
   */
  function shabbatState(ms, city = CITY) {
    const now = localParts(ms, city);
    // The Friday that starts the Shabbat this instant could be in: today on Friday, yesterday on Saturday, else the one ahead.
    const back = now.wd === 6 ? 1 : 0;
    const ahead = now.wd === 5 || now.wd === 6 ? 0 : (5 - now.wd + 7) % 7;
    const friday = addDays(now.y, now.m, now.d, ahead - back);
    const saturday = addDays(friday.y, friday.m, friday.d, 1);
    const candle = candleLighting(friday.y, friday.m, friday.d, city);
    const end = havdalah(saturday.y, saturday.m, saturday.d, city);
    return { closed: ms >= candle && ms < end, candle, havdalah: end };
  }

  /**
   * The test override: "YYYY-MM-DDTHH:MM" read on the city's wall clock, as ms since the epoch; null for anything else.
   * (The date alone, which the page's special days use, is not enough to say whether it is Shabbat.)
   */
  function parseClockOverride(text, city = CITY) {
    const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(String(text || ""));
    if (!m) return null;
    const [y, mo, d, h, min] = m.slice(1).map(Number);
    const wall = Date.UTC(y, mo - 1, d, h, min);
    if (Number.isNaN(wall) || new Date(wall).getUTCMonth() !== mo - 1) return null;
    // The zone is +2 or +3 from UTC; the offset whose wall clock reads back the same is the right one.
    for (const hours of [2, 3]) {
      const ms = wall - hours * 60 * MIN;
      const p = localParts(ms, city);
      if (p.y === y && p.m === mo && p.d === d && p.h === h && p.min === min) return ms;
    }
    return null;
  }

  root.NR_SHABBAT = Object.freeze({ CITY, candleLighting, havdalah, localParts, clock, shabbatState, parseClockOverride });
})(globalThis);
