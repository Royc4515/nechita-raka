/*
  התסריט של הסרטון: ביט (מהאתר של מדעי המחשב) מסביר, ונוי (מהאתר של מדעי המוח) שואלת.
  כך כל מושג מקבל הסבר פשוט ברגע שהוא עולה.

  text: מה שהדמות אומרת. הסימן ^ הוא "רמז": ברגע שהמילה שאחריו נאמרת, הלוח מתקדם צעד אחד.
        תגית בסוגריים מרובעים בתחילת השורה ([excited], [laughs]) היא הנחיית משחק ל-ElevenLabs v3,
        לא נאמרת ולא מופיעה בכתוביות. מילים באנגלית כתובות כפי שהן נשמעות (גיטהאב, ורסל).
  pose: התנוחה של הדמות בזמן השורה (wave, think, celebrate, point, calendar, idea, laptop).
  term: כרטיס "מילון" שקופץ על המסך: המילה, וההסבר בשורה אחת.

  הקובץ נקרא גם מ-scripts/generate-audio.mts, ולכן אין בו ייבוא של React.
*/

export type Who = "bit" | "noi";
export type Pose = "wave" | "think" | "celebrate" | "point" | "calendar" | "idea" | "laptop";
export type Line = { who: Who; text: string; pose: Pose; term?: { word: string; def: string } };
export type Scene = { id: string; board: string; chapter: number; lines: Line[] };

export const CHAPTERS = [
  { title: "הכירו", sub: "שני אתרים, שתי דמויות" },
  { title: "הרעיון", sub: "למה צריך אתר כזה" },
  { title: "איך בונים", sub: "רועי ובינה מלאכותית" },
  { title: "מאחורי הקלעים", sub: "מה קורה כששומרים שינוי" },
  { title: "אתר שני", sub: "איך נולד מדעי המוח" },
  { title: "הצוות", sub: "סוכנים של בינה מלאכותית" },
  { title: "תורך", sub: "איך מתחילים" },
];

export const SCENES: Scene[] = [
  {
    id: "hello",
    board: "sites",
    chapter: 0,
    lines: [
      { who: "noi", pose: "wave", text: "[excited] היי! אני נוי, מהאתר של מדעי המוח." },
      { who: "bit", pose: "wave", text: "ואני ביט, מהאתר של מדעי המחשב. ^שנינו גרים באתר שנקרא נחיתה רכה." },
      { who: "noi", pose: "point", text: "^אתר אחד לכל מה שסטודנט בבר־אילן צריך: קישורים, מדריכים, לוח שנה, קורסים, וגם אותנו, בצ'אט." },
      { who: "noi", pose: "think", text: "ביקשו מאיתנו להסביר איך רועי בנה את כל זה. אז ביט, מאיפה זה התחיל?" },
      { who: "bit", pose: "idea", text: "מבעיה פשוטה. בואי נראה." },
    ],
  },
  {
    id: "problem",
    board: "scatter",
    chapter: 1,
    lines: [
      { who: "bit", pose: "think", text: "כשמתחילים תואר, המידע מפוזר בכל מקום: ^באתר של האוניברסיטה, אצל המזכירות, ^בעשרות קבוצות וואטסאפ, ובדרייבים משנים קודמות." },
      { who: "noi", pose: "think", text: "אני זוכרת את השבוע הראשון. המוח שלי פשוט עשה עומס יתר." },
      { who: "bit", pose: "point", text: "^אז הרעיון היה לאסוף הכול למקום אחד, מסודר, שאפשר לסמוך עליו." },
    ],
  },
  {
    id: "content-code",
    board: "contentCode",
    chapter: 1,
    lines: [
      { who: "noi", pose: "idea", text: "אוקיי, אבל איך בונים אתר? אני לא יודעת לתכנת." },
      {
        who: "bit", pose: "laptop",
        text: "בואי נתחיל ממילה אחת: ^קוד. אלה ההוראות שהמחשב קורא כדי לצייר את האתר, איך הוא נראה ומה קורה כשלוחצים.",
        term: { word: "קוד", def: "ההוראות שהמחשב קורא כדי לבנות את האתר ולהפעיל אותו" },
      },
      { who: "bit", pose: "point", text: "הטריק הראשון של רועי: להפריד בין הקוד לבין ^התוכן. התוכן, כמו תאריכים, קישורים והסברים, יושב בקבצים פשוטים, כמעט כמו מסמך." },
      { who: "noi", pose: "think", text: "כלומר, כדי לעדכן תאריך לא צריך לגעת בקוד?" },
      { who: "bit", pose: "celebrate", text: "בדיוק! ^רועי פותח את הקובץ, אפילו מהטלפון, משנה שורה, ^ותוך דקה או שתיים האתר מתעדכן." },
    ],
  },
  {
    id: "sources",
    board: "sources",
    chapter: 1,
    lines: [
      { who: "noi", pose: "point", text: "ואיך יודעים שהמידע נכון? בקבוצות וואטסאפ יש כל כך הרבה שמועות." },
      { who: "bit", pose: "idea", text: "זה העיקרון השני: ^כל עובדה באתר מגיעה מאתר האוניברסיטה, ^וליד כל מדריך כתוב מאיפה המידע ומתי בדקו אותו." },
      { who: "noi", pose: "celebrate", text: "^אין מקור? לא נכנס. אהבתי. זה כמו מחקר אמיתי, עם מקורות." },
    ],
  },
  {
    id: "ai",
    board: "aiLoop",
    chapter: 2,
    lines: [
      { who: "noi", pose: "think", text: "רגע, אבל מי כותב את כל הקוד? רועי לבד?" },
      {
        who: "bit", pose: "laptop",
        text: "עם עוזר. ^הוא עובד עם קלוד קוד, בינה מלאכותית שכותבת קוד בתוך הפרויקט, לפי מה שמבקשים ממנה במילים.",
        term: { word: "Claude Code", def: "עוזר בינה מלאכותית שכותב קוד לפי בקשה במילים רגילות" },
      },
      { who: "bit", pose: "point", text: "זה הולך ככה: ^רועי מסביר מה הוא רוצה, ולמה. ^קלוד קוד כותב את הקוד ובודק אותו. ^רועי עובר על הכול ומבקש תיקונים, ^ורק כשהוא מבין מה נעשה, השינוי נכנס לאתר." },
      { who: "noi", pose: "idea", text: "אז הבינה המלאכותית היא כמו עוזר מחקר, אבל ההחלטות נשארות אצל החוקר." },
      { who: "bit", pose: "celebrate", text: "^בדיוק. היא חוסכת הקלדה, לא חשיבה. ועד היום נכנסו לאתר ככה יותר ממאה שינויים." },
    ],
  },
  {
    id: "pipeline",
    board: "pipeline",
    chapter: 3,
    lines: [
      { who: "noi", pose: "think", text: "ומה קורה ברגע שרועי שומר שינוי?" },
      {
        who: "bit", pose: "laptop",
        text: "^כל הקבצים של האתר שמורים בגיטהאב, מקום באינטרנט ששומר גם כל גרסה קודמת, כך שתמיד אפשר לחזור אחורה.",
        term: { word: "GitHub", def: "כספת לקבצים של הפרויקט, עם כל הגרסאות הקודמות שלהם" },
      },
      {
        who: "bit", pose: "point",
        text: "^ואז רצה בדיקה אוטומטית: תוכנה קטנה שעוברת על הכול לבד ומחפשת טעויות, כמו פסיק חסר או קישור שבור.",
        term: { word: "בדיקה אוטומטית", def: "תוכנה שבודקת את האתר לבד לפני כל פרסום" },
      },
      { who: "noi", pose: "think", text: "ואם היא מוצאת טעות?" },
      { who: "bit", pose: "think", text: "^אז האתר פשוט לא מתעדכן, עד שמתקנים. עדיף אתר ישן מאתר שבור." },
      {
        who: "bit", pose: "celebrate",
        text: "^ואם הכול תקין, שירות שנקרא ורסל לוקח את הקבצים ומעלה אותם לאוויר, כאתר שכל אחד יכול לפתוח.",
        term: { word: "Vercel", def: "שירות שהופך את הקבצים לאתר חי באינטרנט" },
      },
    ],
  },
  {
    id: "smart",
    board: "smart",
    chapter: 3,
    lines: [
      { who: "noi", pose: "wave", text: "ויש גם אותנו! ^הצ'אט." },
      {
        who: "bit", pose: "point",
        text: "נכון. מאחורי הצ'אט יש מודל שפה, כלומר תוכנה שקוראת שאלה וכותבת תשובה. ^אבל אצלנו הוא עונה רק לפי מה שכתוב באתר, כדי שלא ימציא דברים.",
        term: { word: "מודל שפה", def: "התוכנה שמאחורי צ'אטים: קוראת שאלה וכותבת תשובה" },
      },
      { who: "noi", pose: "idea", text: "^ויש לוח בקרה: רועי רואה מה סטודנטים חיפשו ולא מצאו, וככה הוא יודע מה להוסיף. בלי לזהות אף אחד." },
      { who: "bit", pose: "point", text: "^ועוד פרט קטן: הקישורים לקבוצות הוואטסאפ מוסתרים מרובוטים שסורקים אתרים, אבל סטודנטים רואים אותם כרגיל." },
    ],
  },
  {
    id: "two-sites",
    board: "twoSites",
    chapter: 4,
    lines: [
      { who: "noi", pose: "celebrate", text: "[excited] ועכשיו החלק האהוב עליי: איך נולד האתר שלי, של מדעי המוח." },
      { who: "bit", pose: "think", text: "הדרך הקלה הייתה להעתיק את האתר שלי ולשנות. ^אבל אז כל תיקון היה צריך לעשות פעמיים." },
      { who: "noi", pose: "think", text: "ואחרי סמסטר היו שני אתרים שונים לגמרי. כמו תאומים שגדלו בבתים נפרדים." },
      { who: "bit", pose: "idea", text: "אז רועי עשה משהו חכם יותר: ^קוד אחד, ^ולכל פקולטה קובץ הגדרות משלה: שם, צבעים, דמויות ותוכן." },
      { who: "bit", pose: "point", text: "^כשבונים את האתר בוחרים פקולטה, ^ויוצא אתר בכחול, עם ביט ובייט, ^או בסגול, עם נוי ורון." },
      { who: "noi", pose: "celebrate", text: "^וכל שיפור שרועי עושה מגיע לשני האתרים בבת אחת!" },
    ],
  },
  {
    id: "neuro-build",
    board: "neuroBuild",
    chapter: 4,
    lines: [
      { who: "noi", pose: "idea", text: "ומה עוד היה צריך בשביל האתר שלי, חוץ מהצבע?" },
      { who: "bit", pose: "point", text: "^לאסוף את התוכן של מדעי המוח ממקורות רשמיים, ^לעצב אותך ואת רון בכלי שיוצר תמונות, ^ולהוסיף בדיקה שמוודאת שאף מילה של מדעי המחשב לא נשארה אצלך באתר." },
      { who: "noi", pose: "celebrate", text: "^אז ככה נולדתי. מרגש!" },
    ],
  },
  {
    id: "team",
    board: "team",
    chapter: 5,
    lines: [
      { who: "bit", pose: "laptop", text: "ובשלב מסוים, רועי בנה לעצמו צוות שלם ^של סוכני בינה מלאכותית." },
      { who: "noi", pose: "think", text: "סוכנים? כמו בסרטי ריגול?" },
      {
        who: "bit", pose: "celebrate",
        text: "[laughs] כמעט. סוכן הוא בינה מלאכותית שמקבלת תפקיד קבוע ומבצעת משימות לבד. ^יש מעצב, ^מהנדס, ^בודק איכות, ^אחראי אבטחה, ועוד.",
        term: { word: "סוכן AI", def: "בינה מלאכותית עם תפקיד קבוע, שמבצעת משימות לבד" },
      },
      { who: "noi", pose: "idea", text: "^ויש גם סטודנטים מדומים, שנכנסים לאתר כאילו הם בשנה א' ומספרים איפה הם נתקעו." },
      { who: "bit", pose: "point", text: "^אבל הכלל הכי חשוב: רק רועי מחליט, ורק רועי מפרסם. הסוכנים מציעים, בונים ובודקים." },
    ],
  },
  {
    id: "your-turn",
    board: "tips",
    chapter: 6,
    lines: [
      { who: "noi", pose: "point", text: "אז נניח שאני רוצה לבנות משהו כזה. מאיפה מתחילים?" },
      { who: "bit", pose: "idea", text: "^מבעיה אמיתית וקטנה. גם האתר הזה התחיל כדף פשוט של קישורים." },
      { who: "noi", pose: "think", text: "^ואז מפרידים בין התוכן לקוד, ומוסיפים בדיקה אוטומטית. את זה כבר הבנתי." },
      { who: "bit", pose: "point", text: "^והכי חשוב: לא לאשר שינוי שלא מבינים. הבינה המלאכותית כותבת, אבל השאלות הטובות הן שלך." },
    ],
  },
  {
    id: "outro",
    board: "outro",
    chapter: 6,
    lines: [
      { who: "noi", pose: "celebrate", text: "^זהו! הקישורים לשני האתרים על המסך." },
      { who: "bit", pose: "celebrate", text: "ואם בא לך לבנות משהו ביחד, רועי ישמח לשמוע. ^בהצלחה!" },
    ],
  },
];

/* text helpers, shared by the video and the audio script */
const TAG_RE = /^\s*(\[[a-z ]+\]\s*)+/i;
/** What ElevenLabs reads: the cues removed, the acting tags kept. */
export const ttsText = (t: string) => t.replace(/\^/g, "").replace(/\s+/g, " ").trim();
/** What the captions show: no cues, no tags. */
export const captionText = (t: string) => ttsText(t).replace(TAG_RE, "").trim();
/** Character offsets of each cue in captionText. */
export function cueOffsets(t: string): number[] {
  const body = t.replace(TAG_RE, "").replace(/\s+/g, " ").trim();
  const out: number[] = [];
  let removed = 0;
  for (let i = 0; i < body.length; i++) if (body[i] === "^") { out.push(i - removed); removed++; }
  return out;
}
/** Stable id of a line for its audio file. */
export function lineKey(sceneId: string, index: number) {
  return `${sceneId}-${String(index + 1).padStart(2, "0")}`;
}
