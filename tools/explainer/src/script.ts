/*
  התסריט של הסרטון. נוי ורון (מהאתר של מדעי המוח) הם המנחים: רון מסביר, נוי שואלת.
  ביט (מהאתר של מדעי המחשב) מתארח בפרקים על האתר הראשון, מספר להם מאיפה הם באו, ומעביר להם את הבמה.

  text: מה שהדמות אומרת. הסימן ^ הוא "רמז": ברגע שהמילה שאחריו נאמרת, הלוח מתקדם צעד אחד.
        תגית בסוגריים מרובעים בתחילת השורה ([excited], [laughs]) היא הנחיית משחק ל-ElevenLabs v3,
        לא נאמרת ולא מופיעה בכתוביות. מילים באנגלית כתובות כפי שהן נשמעות (גיטהאב, ורסל).
  pose: התנוחה של הדמות בזמן השורה (wave, think, celebrate, point, calendar, idea, laptop).
  term: כרטיס "מילון" שקופץ על המסך: המילה, וההסבר בשורה אחת.
  say: (לא חובה) מה הקול אומר, כשההגייה צריכה ניקוד או כתיב אחר מהכתוביות. ה-^ נשארים ב-text.
  stage: מי על הבמה. hosts: נוי מימין ורון משמאל. guest: נוי ורון יחד משמאל, וביט מציג מימין.
         trio ו-duo הם לסרטונים האנכיים: שלושתם, או רק נוי ורון, מתחת ללוח.

  הקובץ נקרא גם מ-scripts/generate-audio.mts, ולכן אין בו ייבוא של React.
*/

export type Who = "bit" | "noi" | "ron";
export type Pose = "wave" | "think" | "celebrate" | "point" | "calendar" | "idea" | "laptop";
export type Stage = "hosts" | "guest" | "trio" | "duo";
export type Line = { who: Who; text: string; pose: Pose; term?: { word: string; def: string }; key?: string; say?: string };
export type Scene = { id: string; board: string; chapter: number; stage: Stage; lines: Line[] };

export const CHAPTERS = [
  { title: "הכירו", sub: "נוי ורון, ממדעי המוח" },
  { title: "האתר הראשון", sub: "ביט מספר מאיפה הכול התחיל" },
  { title: "איך בונים", sub: "רועי ובינה מלאכותית" },
  { title: "מאחורי הקלעים", sub: "מה קורה כששומרים שינוי" },
  { title: "איך נולדנו", sub: "האתר של מדעי המוח" },
  { title: "הצוות", sub: "סוכנים של בינה מלאכותית" },
  { title: "תורך", sub: "איך מתחילים" },
];

export const SCENES: Scene[] = [
  {
    id: "hello", board: "sites", chapter: 0, stage: "hosts",
    lines: [
      { who: "noi", pose: "wave", text: "[excited] היי! אני נוי, ואני גרה באתר של מדעי המוח." },
      { who: "ron", pose: "wave", text: "ואני רון, מאותו אתר. ^האתר שלנו הוא חלק מנחיתה רכה." },
      { who: "noi", pose: "point", text: "^מקום אחד לכל מה שסטודנט בבר־אילן צריך: קישורים, מדריכים, לוח שנה, קורסים, וגם אותנו, בצ'אט." },
      { who: "noi", pose: "think", text: "ביקשו מאיתנו להסביר איך רועי בנה את כל זה. רון, אתה יודע?" },
      { who: "ron", pose: "think", text: "חלקית. כדי להבין באמת, צריך לחזור לאתר הראשון, של מדעי המחשב. ויש מישהו שהיה שם מההתחלה." },
    ],
  },
  {
    id: "problem", board: "scatter", chapter: 1, stage: "guest",
    lines: [
      { who: "bit", pose: "wave", text: "[excited] קראתם לי? אני ביט, מהאתר של מדעי המחשב. בואו, אני אראה לכם מאיפה הכול התחיל." },
      { who: "bit", pose: "think", text: "כשמתחילים תואר, המידע מפוזר בכל מקום: ^באתר של האוניברסיטה, אצל המזכירות, ^בעשרות קבוצות וואטסאפ, ובדרייבים משנים קודמות." },
      { who: "noi", pose: "think", text: "אני זוכרת את השבוע הראשון. המוח שלי פשוט עשה עומס יתר." },
      { who: "bit", pose: "point", text: "^אז רועי החליט לאסוף הכול למקום אחד, מסודר, שאפשר לסמוך עליו. ככה נולד האתר הראשון." },
    ],
  },
  {
    id: "content-code", board: "contentCode", chapter: 1, stage: "guest",
    lines: [
      { who: "noi", pose: "idea", text: "אוקיי, אבל איך בונים אתר? אני לא יודעת לתכנת." },
      {
        who: "bit", pose: "laptop",
        text: "בואי נתחיל ממילה אחת: ^קוד. אלה ההוראות שהמחשב קורא כדי לצייר את האתר, איך הוא נראה ומה קורה כשלוחצים.",
        term: { word: "קוד", def: "ההוראות שהמחשב קורא כדי לבנות את האתר ולהפעיל אותו" },
      },
      { who: "bit", pose: "point", text: "הטריק הראשון של רועי: להפריד בין הקוד לבין ^התוכן. התוכן, כמו תאריכים, קישורים והסברים, יושב בקבצים פשוטים, כמעט כמו מסמך." },
      { who: "ron", pose: "think", text: "כלומר, כדי לעדכן תאריך לא צריך לגעת בקוד." },
      { who: "bit", pose: "celebrate", text: "בדיוק! ^רועי פותח את הקובץ, אפילו מהטלפון, משנה שורה, ^ותוך דקה או שתיים האתר מתעדכן." },
    ],
  },
  {
    id: "sources", board: "sources", chapter: 1, stage: "guest",
    lines: [
      { who: "noi", pose: "point", text: "ואיך יודעים שהמידע נכון? בקבוצות וואטסאפ יש כל כך הרבה שמועות." },
      { who: "bit", pose: "idea", text: "זה העיקרון השני: ^כל עובדה באתר מגיעה מאתר האוניברסיטה, ^וליד כל מדריך כתוב מאיפה המידע ומתי בדקו אותו." },
      { who: "ron", pose: "point", text: "^אין מקור? לא נכנס. סוף סוף מישהו שעובד כמו במחקר." },
    ],
  },
  {
    id: "ai", board: "aiLoop", chapter: 2, stage: "guest",
    lines: [
      { who: "noi", pose: "think", text: "רגע, אבל מי כותב את כל הקוד? רועי לבד?" },
      {
        who: "bit", pose: "laptop",
        text: "עם עוזר. ^הוא עובד עם קלוד קוד, בינה מלאכותית שכותבת קוד בתוך הפרויקט, לפי מה שמבקשים ממנה במילים.",
        term: { word: "Claude Code", def: "עוזר בינה מלאכותית שכותב קוד לפי בקשה במילים רגילות" },
      },
      { who: "bit", pose: "point", text: "זה הולך ככה: ^רועי מסביר מה הוא רוצה, ולמה. ^קלוד קוד כותב את הקוד ובודק אותו. ^רועי עובר על הכול ומבקש תיקונים, ^ורק כשהוא מבין מה נעשה, השינוי נכנס לאתר." },
      { who: "ron", pose: "idea", text: "אז הבינה המלאכותית היא כמו עוזר מחקר, אבל ההחלטות נשארות אצל החוקר." },
      { who: "bit", pose: "celebrate", text: "^בדיוק. היא חוסכת הקלדה, לא חשיבה. ועד היום נכנסו לאתר ככה יותר ממאה שינויים." },
    ],
  },
  {
    id: "pipeline", board: "pipeline", chapter: 3, stage: "guest",
    lines: [
      { who: "ron", pose: "think", text: "ומה קורה ברגע שרועי שומר שינוי?" },
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
    id: "smart", board: "smart", chapter: 3, stage: "guest",
    lines: [
      { who: "noi", pose: "wave", text: "ויש גם אותנו! ^הצ'אט." },
      {
        who: "bit", pose: "point",
        text: "נכון. מאחורי הצ'אט יש מודל שפה, כלומר תוכנה שקוראת שאלה וכותבת תשובה. ^אבל אצלנו הוא עונה רק לפי מה שכתוב באתר, כדי שלא ימציא דברים.",
        term: { word: "מודל שפה", def: "התוכנה שמאחורי צ'אטים: קוראת שאלה וכותבת תשובה" },
      },
      { who: "ron", pose: "idea", text: "^ויש לוח בקרה: רועי רואה מה סטודנטים חיפשו ולא מצאו, וככה הוא יודע מה להוסיף. בלי לזהות אף אחד." },
      { who: "bit", pose: "point", text: "^ועוד פרט קטן: הקישורים לקבוצות הוואטסאפ מוסתרים מרובוטים שסורקים אתרים, אבל סטודנטים רואים אותם כרגיל." },
    ],
  },
  {
    id: "two-sites", board: "twoSites", chapter: 4, stage: "guest",
    lines: [
      { who: "noi", pose: "celebrate", text: "[excited] ועכשיו החלק האהוב עליי: איך נולדנו אנחנו, והאתר של מדעי המוח." },
      { who: "bit", pose: "think", text: "הדרך הקלה הייתה להעתיק את האתר שלי ולשנות. ^אבל אז כל תיקון היה צריך לעשות פעמיים. צריך לעשות פעמיים." },
      { who: "ron", pose: "think", text: "ואחרי סמסטר היו שני אתרים שונים לגמרי. כמו תאומים שגדלו בבתים נפרדים." },
      { who: "bit", pose: "idea", text: "אז רועי עשה משהו חכם יותר: ^קוד אחד, ^ולכל פקולטה קובץ הגדרות משלה: שם, צבעים, דמויות ותוכן." },
      { who: "ron", pose: "point", text: "^כשבונים את האתר בוחרים פקולטה, ^ויוצא אתר בכחול, עם ביט ובייט, ^או בסגול, איתנו." },
      { who: "noi", pose: "celebrate", text: "^וכל שיפור שרועי עושה מגיע לשני האתרים בבת אחת!" },
      { who: "bit", pose: "wave", text: "ומכאן אתם כבר מכירים את ההמשך. אני חוזר לאתר שלי, נתראה בסוף!" },
    ],
  },
  {
    id: "neuro-build", board: "neuroBuild", chapter: 4, stage: "hosts",
    lines: [
      { who: "noi", pose: "idea", text: "רון, ומה עוד היה צריך בשביל האתר שלנו, חוץ מהצבע?" },
      { who: "ron", pose: "point", text: "^לאסוף את התוכן של מדעי המוח ממקורות רשמיים, ^לעצב אותנו בכלי שיוצר תמונות, ^ולהוסיף בדיקה שמוודאת שאף מילה של מדעי המחשב לא נשארה אצלנו באתר." },
      { who: "noi", pose: "celebrate", text: "^אז ככה נולדנו. מרגש!" },
    ],
  },
  {
    id: "team", board: "team", chapter: 5, stage: "hosts",
    lines: [
      { who: "ron", pose: "laptop", text: "ובשלב מסוים, רועי בנה לעצמו צוות שלם ^של סוכני בינה מלאכותית." },
      { who: "noi", pose: "think", text: "סוכנים? כמו בסרטי ריגול?" },
      {
        who: "ron", pose: "point",
        text: "[laughs] כמעט. סוכן הוא בינה מלאכותית שמקבלת תפקיד קבוע ומבצעת משימות לבד. ^יש מעצב, ^מהנדס, ^בודק איכות, ^אחראי אבטחה, ועוד.",
        term: { word: "סוכן AI", def: "בינה מלאכותית עם תפקיד קבוע, שמבצעת משימות לבד" },
      },
      { who: "noi", pose: "idea", text: "^ויש גם סטודנטים מדומים, שנכנסים לאתר כאילו הם בשנה א' ומספרים איפה הם נתקעו." },
      { who: "ron", pose: "point", text: "^אבל הכלל הכי חשוב: רק רועי מחליט, ורק רועי מפרסם. הסוכנים מציעים, בונים ובודקים." },
    ],
  },
  {
    id: "your-turn", board: "tips", chapter: 6, stage: "hosts",
    lines: [
      { who: "noi", pose: "point", text: "אז נניח שאני רוצה לבנות משהו כזה. מאיפה מתחילים?" },
      { who: "ron", pose: "idea", text: "^מבעיה אמיתית וקטנה. גם האתר הראשון התחיל כדף פשוט של קישורים." },
      { who: "noi", pose: "think", text: "^ואז מפרידים בין התוכן לקוד, ומוסיפים בדיקה אוטומטית. את זה כבר הבנתי." },
      { who: "ron", pose: "point", text: "^והכי חשוב: לא לאשר שינוי שלא מבינים. הבינה המלאכותית כותבת, אבל השאלות הטובות הן שלך." },
    ],
  },
  {
    id: "outro", board: "outro", chapter: 6, stage: "guest",
    lines: [
      { who: "noi", pose: "celebrate", text: "^זהו! הקישורים לשני האתרים על המסך." },
      { who: "bit", pose: "celebrate", text: "ואם בא לך לבנות משהו ביחד, רועי ישמח לשמוע." },
      { who: "ron", pose: "celebrate", text: "^בהצלחה!" },
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

/** Look up a line of the full video by its audio key ("ai-02"), keeping that key so the short reuses its audio. */
function take(key: string): Line {
  const m = /^(.*)-(\d\d)$/.exec(key);
  const line = m && SCENES.find((s) => s.id === m[1])?.lines[Number(m[2]) - 1];
  if (!line) throw new Error(`no line ${key}`);
  return { ...line, key };
}

/**
  The vertical short (about a minute): a hook, three ideas, the links. It reuses lines of the full video, so it
  needs no new audio. All three characters stay on stage ("trio"), Bit tells and the hosts react.
*/
export const SHORT_SCENES: Scene[] = [
  { id: "short-problem", board: "scatter", chapter: 1, stage: "trio", lines: [take("problem-02"), take("problem-04")] },
  { id: "short-content", board: "contentCode", chapter: 1, stage: "trio", lines: [take("content-code-03")] },
  { id: "short-ai", board: "aiLoop", chapter: 2, stage: "trio", lines: [take("ai-01"), take("ai-02"), take("ai-04")] },
  { id: "short-sites", board: "twoSites", chapter: 4, stage: "trio", lines: [take("two-sites-02"), take("two-sites-04"), take("two-sites-06")] },
  { id: "short-outro", board: "outro", chapter: 6, stage: "trio", lines: [take("outro-01"), take("outro-03")] },
];

/**
  The site tour (vertical, about a minute): Noi and Ron walk a new student through what is on the brain sciences site,
  one tab at a time. Its lines are new (their own audio files, keys tour-hello-01...), and Bit stays home.
*/
export const TOUR_SCENES: Scene[] = [
  {
    id: "tour-hello", board: "tourHello", chapter: 4, stage: "duo",
    lines: [
      { who: "noi", pose: "wave", text: "[excited] היי! אני נוי, וזה רון. אנחנו גרים באתר של מדעי המוח." },
      { who: "ron", pose: "point", text: "^נחיתה רכה: כל מה שסטודנט במדעי המוח בבר־אילן צריך, במקום אחד, בלי לחפש בעשרות אתרים וקבוצות. ^בואו נראה מה יש שם." },
    ],
  },
  {
    id: "tour-search", board: "tourSearch", chapter: 4, stage: "duo",
    lines: [
      { who: "noi", pose: "point", text: "^מחפשים משהו? כותבים, למשל, ^מבחנים, ^וכל מה שקשור קופץ: מדריכים וקישורים." },
      { who: "ron", pose: "idea", text: "^ואם אתם יודעים מה אתם מחפשים, הכול מסודר בלשוניות שבתחתית המסך." },
    ],
  },
  {
    id: "tour-links", board: "tourLinks", chapter: 4, stage: "duo",
    lines: [
      { who: "noi", pose: "point", text: "^בקישורים: אינ־בר, למדה, אתרי התוכנית, ^וקבוצות הוואטסאפ.", say: "בקישורים: אִינְבָּר, למדה, אתרי התוכנית, וקבוצות הוואטסאפ." },
      { who: "ron", pose: "think", text: "^במדריכים: צעד אחר צעד, מרישום לקורסים ועד מילואים. ^וכל מדריך בנוי מהאתרים הרשמיים." },
    ],
  },
  {
    id: "tour-courses", board: "tourCourses", chapter: 4, stage: "duo",
    lines: [
      { who: "noi", pose: "laptop", text: "^במערכת: כל הקורסים, עם שעות, חדרים ומרצים, ^לפי המסלול שלכם." },
      { who: "ron", pose: "calendar", text: "^בוחרים קורסים וקבוצות, ^ונבנית לכם מערכת שבועית עם המבחנים. ^ואת לוח השנה אפשר להוסיף ליומן בטלפון." },
    ],
  },
  {
    id: "tour-chat", board: "tourChat", chapter: 4, stage: "duo",
    lines: [
      { who: "noi", pose: "wave", text: "ואם משהו לא ברור? ^שואלים אותנו בצ'אט." },
      { who: "ron", pose: "think", text: "^אנחנו עונים רק לפי מה שכתוב באתר. ^ובדברים חשובים, תמיד כדאי לבדוק גם במקור הרשמי." },
    ],
  },
  {
    id: "tour-outro", board: "tourOutro", chapter: 4, stage: "duo",
    lines: [
      { who: "noi", pose: "celebrate", text: "^הכתובת על המסך. ^שמרו את האתר במסך הבית, כמו אפליקציה, והכול תמיד בהישג יד." },
      { who: "ron", pose: "celebrate", text: "נתראה שם. ^בהצלחה!" },
    ],
  },
];
