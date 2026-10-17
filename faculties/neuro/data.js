/*
  PLACEHOLDER (faculty PR 4): a copy of faculties/neuro/data.js so the neuro build has content to render.
  Every fact here is a CS fact; PR 6 replaces this file with the brain sciences content.

  התוכן של מדעי המחשב: מה שנכון רק לסטודנטים של המחלקה. מדריך הקורסים, מרחב הלמידה, חומרי הלימוד,
  קבוצות הוואטסאפ, שורת "הכי שימושי", פרטי החונך (site) והשאלות של המחלקה.
  התוכן המשותף לכל בר-אילן (רישום, תשלומים, קמפוס, בחינות, לוח השנה) נמצא ב-shared/data.js.
  הבנייה מאחדת את שני הקבצים לקובץ אחד, public/data.js, שממנו הדף (index.html) נבנה. איך מוסיפים פריט, קטגוריה או תאריך: ראו README.md.

  כללים קטנים כדי שלא יישבר:
  - כל טקסט נמצא בין גרשיים הפוכים `כך`. בתוכם מותר לכתוב " ו-' בחופשיות.
  - אחרי כל פריט או שדה יש פסיק.
  - קישורים חייבים להתחיל ב-https://
  - תאריכים בפורמט שנה-חודש-יום, למשל `2026-10-11`.
  - מדריך או קטגוריה חדשים צריכים להיכנס גם לרשימה content.order ב-faculty.js, שקובעת את הסדר בדף.
  - מדריך עם id של מדריך משותף (למשל help, campus-map) מחליף את הגרסה המשותפת כולה.
*/
window.SITE_DATA = {
  site: {
    author: `רועי כרמלי`,
    // שנת הלימודים שהמידע באתר מתייחס אליה. מופיעה בתחתית כל עמוד ובנתונים לגוגל. מעדכנים בתחילת כל שנה.
    academicYear: `תשפ"ז`,
    // הקישור ללינקדאין. כל עוד הוא ריק, הקישור לא יופיע בתחתית האתר.
    authorUrl: `https://www.linkedin.com/in/roy-carmelli`,
    // הקישור לפורטפוליו. כל עוד הוא ריק, הקישור לא יופיע בתחתית האתר.
    portfolioUrl: `https://roy-carmelli-portfolio.vercel.app/`,
    // וואטסאפ פרטי לרועי: מספר בפורמט בינלאומי, בלי + ובלי מקפים, למשל `972501234567`.
    // כל עוד הוא ריק, כפתורי "וואטסאפ פרטי לרועי" לא יופיעו באתר.
    whatsapp: `972547287807`,
    // ההודעה שתופיע מוכנה בוואטסאפ כשלוחצים על הכפתור
    whatsappText: `היי רועי, הגעתי מהאתר נחיתה רכה. יש לי שאלה:`,
  },

  // שורת "הכי שימושי": מזהים (id) של פריטים מהקטגוריות למטה
  // `opening-event` למעלה עד המפגש ב-21.10. אחרי זה מוחקים אותו מכאן ומהקטגוריה university.
  featured: [`opening-event`, `inbar`, `lemida`, `cs-drive`, `wa-important`, `gemini`],

  // מדריכים, באותו פורמט כמו ב-shared/data.js (ההסבר על השדות שם).
  guides: [
    {
      id: `courses`,
      title: `כל הקורסים: שעות, חדרים ומרצים`,
      summary: `כל קורסי מדמ"ח בשנת תשפ"ז במקום אחד: קבוצות, ימים, שעות, חדרים, מרצים ומועדי בחינות.`,
      // courses: true מציג כאן את רשימת הקורסים (course-browser.js), מקובץ הסריקה courses/catalog.json ומהידיעון courses/yearbook.json (ההוראות ב-courses/README.md).
      courses: true,
      steps: [
        `בוחרים סמסטר, ומחפשים קורס לפי שם, מספר או מרצה. אפשר לסנן לפי שנה, סמינרים או ימים שנוחים לכם.`,
        `מסמנים ☆ ליד הקורסים שלכם, פותחים כל אחד ולוחצים על העיגול ליד קבוצת הרצאה וקבוצת תרגול.`,
        `ב"המערכת שלי" רואים את השבוע, את השיעור הבא עם החדר ואת המבחנים. קבוצות שחופפות מסומנות באדום. נרשמים לקבוצות באינ-בר בזמן החלון האישי.`,
        `בסוף בודקים באינ-בר, במערכת שעות, שהכול נכון. השעות והחדרים כאן נסרקו מהקטלוג ועשויים להשתנות.`,
      ],
      // קישורים בתוך הצעד (מספר הצעד מתחיל מ-1). at: הביטוי בצעד שהופך לקישור. בלי at הקישור מופיע מתחת לצעד.
      stepLinks: {
        3: [{ id: `inbar`, at: `באינ-בר` }],
        4: [{ id: `inbar`, at: `באינ-בר` }],
      },
      tips: [
        `השנה של כל קורס לקוחה מהידיעון של בינה מלאכותית חישובית לתשפ"ז. במסלולים אחרים השנה יכולה להיות שונה, לכן בודקים בידיעון של המסלול שלכם.`,
        `קורס בלי חדר או בלי שעה: הקטלוג עוד לא פרסם אותם. בודקים שוב באינ-בר לפני תחילת הסמסטר.`,
        `אפשר לשאול גם את ביט ובייט בצ'אט על כל קורס, או להוריד את קובץ הקורסים ולהעלות אותו ל-AI כדי להרכיב מערכת.`,
      ],
      links: [`inbar`, `shoham`, `courses-file`],
      sources: [
        { label: `קטלוג הקורסים של בר-אילן`, url: `https://courses.biu.ac.il/CoursesView.aspx` },
        // הכלי שרועי בנה כדי לאסוף את הנתונים. מוצג כקרדיט שקט, לא ככלי שמזמינים סטודנטים להריץ.
        { label: `biu-courses-crawler: הכלי שאסף את הנתונים (קוד פתוח)`, url: `https://github.com/Royc4515/biu-courses-crawler` },
      ],
      checkedOn: `14.10.2026`,
      keywords: [`קורסים`, `קורס`, `מערכת שעות`, `המערכת שלי`, `חפיפה`, `שעות`, `חדר`, `חדרים`, `מרצה`, `מרצים`, `הרצאה`, `תרגיל`, `סמינריון`, `סדנה`, `מועדי בחינות`, `שנה א`, `קורסי בחירה`, `קטלוג`],
    },
    {
      id: `cs-study-space`,
      title: `מרחב הלמידה של מדמ"ח`,
      summary: `המקום שבו כולם יושבים ללמוד למבחנים, להשלים הרצאות, לעבוד על מטלות, לאכול או סתם לשבת עם חברים. נכנסים עם הטלפון, אחרי אישור חד-פעמי במזכירות.`,
      steps: [
        `מורידים את האפליקציה My BLE-ID (הקישורים למטה).`,
        `הולכים למזכירות המחלקה (בניין 503, קומה 1) ומבקשים שיסדרו לכם אישור כניסה למרחב הלמידה. את זה עושים רק פעם אחת.`,
        `בכל כניסה: פותחים את האפליקציה ולוחצים על Door 1. ה-Bluetooth צריך להיות דלוק, אחרת זה לא עובד.`,
      ],
      // קישורים בתוך הצעד (מספר הצעד מתחיל מ-1). at: הביטוי בצעד שהופך לקישור. בלי at הקישור מופיע מתחת לצעד.
      stepLinks: {
        1: [{ label: `My BLE-ID לאנדרואיד`, url: `https://play.google.com/store/apps/details?id=com.rosslaresecurity.btreader` }, { label: `My BLE-ID לאייפון`, url: `https://apps.apple.com/il/app/my-ble-id/id1311321123` }],
        2: [{ label: `מדריך: מפת הקמפוס והתמצאות`, guide: `campus-map`, at: `בניין 503` }],
      },
      tips: [
        `המרחב בבניין 503, בשתי קומות: קומת הקרקע, שבה הכניסה, וקומת הסטודיו. בכל קומה יש מרחב פתוח וחדרים סגורים.`,
        `במרחב הפתוח יש שולחנות עם שקעים, קירות זכוכית מחיקים ופינה עם ספות.`,
        `בחדרים הסגורים יש מסך, שקעים וקירות מחיקים. רק שימו לב: הקירות מחיקים מבפנים, לא מבחוץ.`,
        `החדרים הם כל הקודם זוכה. לא שומרים חדר עם תיק או מחברת והולכים. האור כבה אחרי כמה זמן בלי תנועה, אז יעלו עליכם.`,
        `יש מטבחון עם מקרר, מגירות, כיורים, מיקרוגלים נפרדים לבשרי ולחלבי ותמי 4.`,
        `מרחב הלמידה פתוח 24/7, אבל החשמל דולק רק עד חצות. אם אתם יודעים מתי הוא נדלק בבוקר, או נשארתם אחרי חצות כדי לבדוק, אולי הגיע הזמן להוסיף גם נקודות זכות על התמדה, וכנראה שתזדקקו לתמיכה נפשית.`,
        `הדלת לא מופיעה באפליקציה או לא נפתחת? גם לה מגיעה הפסקה. לפעמים היא נתקעת לכמה דקות, אז מחכים ומנסים שוב. בינתיים יש לכם תירוץ רשמי להפסקת קפה ארוכה יותר.`,
      ],
      links: [
        { label: `My BLE-ID לאנדרואיד`, url: `https://play.google.com/store/apps/details?id=com.rosslaresecurity.btreader` },
        { label: `My BLE-ID לאייפון`, url: `https://apps.apple.com/il/app/my-ble-id/id1311321123` },
        `cs-contact`,
        { label: `מדריך: מפת הקמפוס והתמצאות`, guide: `campus-map` },
      ],
      // מהניסיון של הסטודנטים, אין דף רשמי
      sources: [],
      checkedOn: `13.10.2026`,
      keywords: [`מרחב למידה`, `מרחב הלמידה`, `חדר לימוד`, `ללמוד`, `בניין מדעי המחשב`, `קומת סטודיו`, `חדרים`, `חדר`, `מסך`, `לוח`, `מחיק`, `שקעים`, `ספות`, `מטבחון`, `מקרר`, `מיקרוגל`, `תמי 4`, `לאכול`, `שעות`, `פתוח`, `חצות`, `לילה`, `דלת`, `door`, `my ble-id`, `ble`, `rosslare`, `bluetooth`, `בלוטוס`, `אפליקציה`, `מדמח`, `503`],
    },
    // מחליף את המדריך המשותף campus-map: אותו תוכן, ועוד הבניינים של המחלקה.
    {
      id: `campus-map`,
      title: `מפת הקמפוס והתמצאות`,
      summary: `איך מוצאים בניין וכיתה, איפה המחלקה והמזכירות, ואיך מנווטים בקמפוס הגדול.`,
      // מערכת הניווט הרשמית של האוניברסיטה: חיפוש לפי מספר בניין, ניווט עם GPS, ספריות, בתי כנסת, חניונים ועוד.
      map: { url: `https://www.mobitti.com/app/nav/index.html?navId=m5YPmWleKD`, embed: `https://www.mobitti.com/app/nav/index.html?navId=m5YPmWleKD`, label: `פתיחה במסך מלא` },
      steps: [
        `באינ-בר, במערכת השעות, ליד כל קורס פרונטלי כתוב מספר בניין וחדר. קורס שנלמד רק בזום מסומן "נלמד בזום".`,
        `פותחים את מפת הקמפוס הרשמית. בה רשומים כל הבניינים לפי מספר, וגם המחלקות, תחנות השאטל, בתי תפילה, מסעדות ובתי קפה.`,
        `מחפשים את מספר הבניין במפה, ובודקים באיזה שער הכי נוח להיכנס אליו. ככה לא מסתובבים בפנים.`,
        `כדי שיוביל אתכם ברגל, פותחים את מערכת הניווט של האוניברסיטה. היא מנווטת עם GPS לכל מקום בקמפוס. אפשר לפתוח אותה גם מהאפליקציה של בר-אילן.`,
        `בשבוע הראשון כדאי לעבור פעם אחת על המסלול מהשער ועד הכיתה הראשונה, כמה דקות לפני השיעור.`,
      ],
      // קישורים בתוך הצעד (מספר הצעד מתחיל מ-1). at: הביטוי בצעד שהופך לקישור. בלי at הקישור מופיע מתחת לצעד.
      stepLinks: {
        1: [{ id: `inbar`, at: `באינ-בר` }],
        2: [{ id: `campus-map`, at: `מפת הקמפוס הרשמית` }],
        4: [{ id: `campus-nav`, at: `מערכת הניווט של האוניברסיטה` }],
      },
      tips: [
        `המחלקה למדעי המחשב ובינה מלאכותית: משרדי ההנהלה והמזכירות בבניין 503, קומה 1.`,
        `מרכז שירות וגיוס (שכר לימוד, מלגות, סטטוס ועוד) נמצא בבניין 606.`,
        `בניינים שסטודנטים במדמ"ח פוגשים הכי הרבה: 216 (מרכז המחשבים והמתמטיקה, בית ספר של מתמטיקה), 304 (אולמות ההרצאות), 401 (הספרייה המרכזית), 604 ו-605 (כיתות), 502, 505, 507 ו-508 (כיתות), 1102 ו-1103 (הנדסה).`,
        `לפעמים יש הרצאות של מדמ"ח גם באזור 300 (משפטים ואולמות ההרצאות: 304, 305 ו-306) וגם באזור 900 (מדעי החברה). בבניין 901 (המרכז לחקר המוח) יש הרצאות גדולות באולם שבקומה מינוס 1. באזור הזה נמצאים גם 902 (פסיכולוגיה) ו-905 (חינוך). בודקים תמיד באינ-בר את מספר הבניין והחדר.`,
        `בניין 509: לשכת דיקן הסטודנטים. בניין 402: מנהלה. בניין 1401: מרכז וואהל.`,
        `במפה מסומנים גם שערים, כניסות להולכי רגל ולרכבים, מסעדות ובתי קפה, כספומטים, בתי תפילה, חניונים ותחנות שאטל. הבניינים מחולקים לאזורים: מדעים מדויקים (200), משפטים (300), יהדות (400), מורשת ישראל (500) והנדסה (1100).`,
        `שירותי הייעוץ הפסיכולוגי נמצאים בבניין 407 (בניין מריה פינקל ורות רקמן).`,
        `שער הולכי רגל 2 פתוח 24 שעות. שער הולכי רגל 10 (ספורט) פתוח בין 6:30 ל-18:00, וביום שישי עד 14:00. כל השערים והשעות במדריך "כרטיס סטודנט, כניסה וחנייה".`,
        `בין שיעורים כדאי להשאיר זמן להליכה, או לעלות על השאטל.`,
        `יש גם מפה של המרחבים המוגנים בקמפוס. כדאי לדעת איפה הקרוב אליכם.`,
      ],
      links: [
        `campus-map`,
        `campus-nav`,
        `shuttle-map`,
        `protected-spaces`,
        { label: `מדריך: השאטל בקמפוס`, guide: `shuttle` },
        { label: `מדריך: כרטיס סטודנט, כניסה וחנייה`, guide: `campus` },
        { label: `מדריך: איפה אוכלים`, guide: `food` },
        `inbar`,
      ],
      sources: [
        { label: `כל מה שצריך לדעת על פתיחת שנת הלימודים`, url: `https://www.biu.ac.il/article/11762` },
        { label: `תחבורה, חנייה ומערך היסעים פנימי`, url: `https://www.biu.ac.il/useful-information/orientation/transport-and-parking` },
        { label: `מיקום ויצירת קשר, המחלקה למדעי המחשב`, url: `https://cs.biu.ac.il/he/node/3` },
        { label: `מפת הקמפוס ורשימת הבניינים (PDF)`, url: `https://www2.biu.ac.il/Tour/campus-map.pdf` },
        { label: `מפת הקמפוס`, url: `https://www.biu.ac.il/campus-map` },
      ],
      checkedOn: `8.10.2026`,
      keywords: [`מפה`, `מפת קמפוס`, `ניווט`, `התמצאות`, `בניין`, `כיתה`, `חדר`, `איפה`, `הגעה`, `אבוד`, `503`, `606`, `216`, `304`, `305`, `901`, `902`, `905`, `401`, `ספרייה`, `אולמות`, `מרכז וואהל`, `מזכירות`, `מדמח`, `בניין מדעי המחשב`, `waze`, `gps`, `building`, `where`, `campus`, `map`],
    },
    // מחליף את המדריך המשותף help: אותו תוכן, ועוד המזכירות של המחלקה.
    {
      id: `help`,
      title: `למי פונים כשמשהו לא מסתדר`,
      summary: `לאן פונים בשאלה אקדמית ולאן בבעיה טכנית.`,
      steps: [
        `שאלה אקדמית (קורס מלא, נקודות זכות, תנאי קדם): אינ-בר > בקשות ואישורים > פניה למחלקה.`,
        `מזכירות תואר ראשון במדעי המחשב: bsc@cs.biu.ac.il, או בטופס הפנייה באתר המחלקה (בוחרים "מזכירות תואר ראשון"). הטלפון של המחלקה: 03-5318866.`,
        `בעיה טכנית או שאלה כללית: מרכז שירות וגיוס. וואטסאפ 052-6171988, טלפון *9392 או 03-5317000, בימים א'–ה' 9:00–17:00.`,
        `אפשר להגיע גם פיזית למרכז שירות וגיוס, בבניין 606.`,
        `בכל דבר אחר: כתבו לרועי כרמלי בקבוצת הוואטסאפ הראשית או בהודעה פרטית.`,
      ],
      // קישורים בתוך הצעד (מספר הצעד מתחיל מ-1). at: הביטוי בצעד שהופך לקישור. בלי at הקישור מופיע מתחת לצעד.
      stepLinks: {
        1: [{ id: `inbar`, at: `אינ-בר` }],
        2: [{ id: `cs-contact`, at: `בטופס הפנייה באתר המחלקה` }],
        5: [{ id: `wa-main`, at: `בקבוצת הוואטסאפ הראשית` }, { id: `mentor`, at: `בהודעה פרטית` }],
      },
      links: [`mentor`, `cs-contact`, `wa-main`, `inbar`],
      sources: [
        { label: `מרכז שירות וגיוס`, url: `https://www.biu.ac.il/registration-and-admission/information/service-and-info-section` },
        { label: `יצירת קשר עם המחלקה למדעי המחשב`, url: `https://cs.biu.ac.il/contact` },
        { label: `הסגל המנהלי של המחלקה`, url: `https://cs.biu.ac.il/he/administrative_staff` },
        { label: `הנחיות הרישום`, url: `https://www.biu.ac.il/page/13336` },
      ],
      checkedOn: `7.10.2026`,
      keywords: [`עזרה`, `מזכירות`, `מחלקה`, `מדמח`, `מדעי המחשב`, `תואר ראשון`, `bsc`, `מייל`, `טלפון`, `וואטסאפ`, `שירות`, `פנייה`, `בעיה`, `contact`, `secretariat`, `department`, `email`, `help`],
    },
  ],

  categories: [
    {
      id: `materials`,
      title: `חומרי לימוד`,
      items: [
        {
          id: `cs-drive`,
          desc: `סיכומים ומבחנים משנים קודמות`,
          name: `דרייב מדמ"ח`,
          url: `https://drive.google.com/drive/folders/1l_-2diAB3BA4_aNopvlufvXc5og8FO8b`,
          keywords: [`מבחנים`, `מבחנים קודמים`, `סיכומים`, `חומרים`, `drive`, `גוגל דרייב`, `מדעי המחשב`],
        },
        {
          id: `judaism-drive`,
          desc: `חומרים לקורסי היסוד ביהדות`,
          name: `דרייב יהדות`,
          url: `https://drive.google.com/drive/folders/1GILYMng8JMRFLoPq2sA5r5LhI6Mvb7P7`,
          keywords: [`יהדות`, `יסודות`, `סיכומים`, `drive`, `גוגל דרייב`],
        },
      ],
    },
    {
      id: `whatsapp`,
      title: `קבוצות וואטסאפ של מדעי המחשב`,
      items: [
        {
          id: `wa-main`,
          desc: `הקבוצה הראשית של שנה א'`,
          name: `קבוצה ראשית שנה א'`,
          url: `https://chat.whatsapp.com/ItqIQ5z7F5e9J5tzmpmgFq`,
          keywords: [`וואטסאפ`, `ווטסאפ`, `whatsapp`, `קבוצה`],
        },
        {
          id: `wa-important`,
          desc: `רק הודעות חשובות, בלי רעש`,
          name: `חשוב בלבד שנה א'`,
          url: `https://chat.whatsapp.com/JW0YoklzYEZDW6jffnhAyb`,
          keywords: [`וואטסאפ`, `ווטסאפ`, `whatsapp`, `הודעות`, `עדכונים`, `הודעות חשובות`],
        },
        {
          id: `wa-all`,
          desc: `קבוצה משותפת לסטודנטים מכל השנים`,
          name: `מדמ"ח בר אילן, כל השנים`,
          url: `https://chat.whatsapp.com/FNYsQd2DQvEJlzb1PmakDP`,
          keywords: [`וואטסאפ`, `ווטסאפ`, `whatsapp`, `כל השנים`],
        },
        {
          id: `wa-reserves`,
          desc: `מילואימניקים במדמ"ח: עדכונים, זכויות ועזרה`,
          name: `קבוצת המילואים של מדמ"ח`,
          url: `https://chat.whatsapp.com/GFlTBrH7G3G6Il2QN96kd5`,
          keywords: [`מילואים`, `מילואימניקים`, `מילואימניק`, `צבא`, `וואטסאפ`, `whatsapp`],
        },
        {
          id: `wa-reserves-mentors`,
          desc: `חונכים וחניכים מילואימניקים במדמ"ח`,
          name: `מילואימניקים חונכים וחניכים מדמ"ח`,
          url: `https://chat.whatsapp.com/L5HuQ23NIEkFLgsieL9mza`,
          keywords: [`מילואים`, `מילואימניקים`, `מילואימניק`, `צבא`, `וואטסאפ`, `whatsapp`],
        },
      ],
    },
    {
      id: `courses-a`,
      title: `קבוצות הקורסים של סמסטר א'`,
      items: [
        {
          id: `wa-intro`,
          desc: `מבוא למדעי המחשב`,
          name: `קבוצת וואטסאפ של הקורס`,
          url: `https://chat.whatsapp.com/Bv5zkl6GyDSEk69VORW339`,
          keywords: [`מבוא`, `תכנות`, `וואטסאפ`, `whatsapp`, `קורס`],
        },
        {
          id: `wa-linear`,
          desc: `אלגברה ליניארית 1`,
          name: `קבוצת וואטסאפ של הקורס`,
          url: `https://chat.whatsapp.com/E9VxITJNa075wFbHFI1fEX`,
          keywords: [`לינארית`, `linear`, `וואטסאפ`, `whatsapp`, `קורס`],
        },
        {
          id: `wa-calculus`,
          desc: `חשבון אינפיניטסימלי 1`,
          name: `קבוצת וואטסאפ של הקורס`,
          url: `https://chat.whatsapp.com/BbEU22JRPvJKZhu9LF7oJR`,
          keywords: [`אינפי`, `חדו"א`, `calculus`, `וואטסאפ`, `whatsapp`, `קורס`],
        },
        {
          id: `wa-discrete`,
          desc: `מתמטיקה בדידה`,
          name: `קבוצת וואטסאפ של הקורס`,
          url: `https://chat.whatsapp.com/DmlsnUHAkRSFhXrPl1OU89`,
          keywords: [`בדידה`, `discrete`, `וואטסאפ`, `whatsapp`, `קורס`],
        },
      ],
    },
    // קבוצות הקורסים של כל השנים, מההודעה של מועצת מדעי המחשב (29.9.2026). כל אחת שורה מכווצת.
    {
      id: `wa-year1-spring`,
      title: `קבוצות שנה א' (מסלול אביב)`,
      collapsed: true,
      items: [
        {
          id: `wa-calculus2`,
          desc: `חשבון אינפיניטסימלי 2`,
          name: `קבוצת וואטסאפ של הקורס`,
          url: `https://chat.whatsapp.com/CMGH8YBo54FLbjQDwd4bS2`,
          keywords: [`אינפי 2`, `חדוא 2`, `calculus`, `וואטסאפ`, `whatsapp`, `קורס`],
        },
        {
          id: `wa-oop`,
          desc: `תכנות מונחה עצמים`,
          name: `קבוצת וואטסאפ של הקורס`,
          url: `https://chat.whatsapp.com/G8EUHhsCLBY92mD0eJdh3v`,
          keywords: [`מונחה עצמים`, `oop`, `java`, `גאווה`, `וואטסאפ`, `whatsapp`, `קורס`],
        },
        {
          id: `wa-linear2`,
          desc: `אלגברה ליניארית 2`,
          name: `קבוצת וואטסאפ של הקורס`,
          url: `https://chat.whatsapp.com/DmjPzMFT2Nj4ewVBHd5XQR`,
          keywords: [`לינארית 2`, `linear`, `וואטסאפ`, `whatsapp`, `קורס`],
        },
        {
          id: `wa-probability`,
          desc: `הסתברות כללית למדעי המחשב`,
          name: `קבוצת וואטסאפ של הקורס`,
          url: `https://chat.whatsapp.com/I7wgRkBuHgC1fJALjxqqAc`,
          keywords: [`הסתברות`, `probability`, `וואטסאפ`, `whatsapp`, `קורס`],
        },
        {
          id: `wa-data-structures`,
          desc: `מבני נתונים`,
          name: `קבוצת וואטסאפ של הקורס`,
          url: `https://chat.whatsapp.com/FnqSNYxvFko37ljwPSuIwo`,
          keywords: [`מבנים`, `data structures`, `וואטסאפ`, `whatsapp`, `קורס`],
        },
      ],
    },
    {
      id: `wa-years23`,
      title: `קבוצות שנה ב' ו-ג'`,
      collapsed: true,
      items: [
        {
          id: `wa-algorithms1`,
          desc: `אלגוריתמים 1`,
          name: `קבוצת וואטסאפ של הקורס`,
          url: `https://chat.whatsapp.com/FxIElVnLBva0O94ldrT0uo`,
          keywords: [`אלגו`, `algorithms`, `וואטסאפ`, `whatsapp`, `קורס`],
        },
        {
          id: `wa-architecture`,
          desc: `מבנה מחשב`,
          name: `קבוצת וואטסאפ של הקורס`,
          url: `https://chat.whatsapp.com/GbEN7RZbZGkBp9JUTonjRw`,
          keywords: [`ארכיטקטורה`, `architecture`, `וואטסאפ`, `whatsapp`, `קורס`],
        },
        {
          id: `wa-statistics`,
          desc: `שיטות סטטיסטיות במדעי המחשב`,
          name: `קבוצת וואטסאפ של הקורס`,
          url: `https://chat.whatsapp.com/J363FpHLUprG37LjV23kWs`,
          keywords: [`סטטיסטיקה`, `statistics`, `וואטסאפ`, `whatsapp`, `קורס`],
        },
        {
          id: `wa-discrete-structures`,
          desc: `מבנים בדידים`,
          name: `קבוצת וואטסאפ של הקורס`,
          url: `https://chat.whatsapp.com/Jq2ddDj7GGy9zGVRlp8a8H`,
          keywords: [`בדידים`, `discrete`, `וואטסאפ`, `whatsapp`, `קורס`],
        },
        {
          id: `wa-computational-models`,
          desc: `מודלים חישוביים`,
          name: `קבוצת וואטסאפ של הקורס`,
          url: `https://chat.whatsapp.com/F2D2dbSxBky6KfFBQ3iA7R`,
          keywords: [`אוטומטים`, `models`, `וואטסאפ`, `whatsapp`, `קורס`],
        },
        {
          id: `wa-os`,
          desc: `מערכות הפעלה`,
          name: `קבוצת וואטסאפ של הקורס`,
          url: `https://chat.whatsapp.com/H4zp4RlJb015sumhtPBl1l`,
          keywords: [`os`, `operating systems`, `וואטסאפ`, `whatsapp`, `קורס`],
        },
        {
          id: `wa-complexity`,
          desc: `חישוביות וסיבוכיות`,
          name: `קבוצת וואטסאפ של הקורס`,
          url: `https://chat.whatsapp.com/HsOQFyI2r625o3ltJPh4kN`,
          keywords: [`סיבוכיות`, `חישוביות`, `complexity`, `וואטסאפ`, `whatsapp`, `קורס`],
        },
        {
          id: `wa-ml`,
          desc: `למידה מכונה`,
          name: `קבוצת וואטסאפ של הקורס`,
          url: `https://chat.whatsapp.com/JoqfpF3vgyO1mbSiybNRHf`,
          keywords: [`למידת מכונה`, `ml`, `machine learning`, `וואטסאפ`, `whatsapp`, `קורס`],
        },
        {
          id: `wa-advanced-algorithms`,
          desc: `אלגוריתמים מתקדמים`,
          name: `קבוצת וואטסאפ של הקורס`,
          url: `https://chat.whatsapp.com/IK7VcOoDNFx66UoS12unrw`,
          keywords: [`אלגו`, `algorithms`, `וואטסאפ`, `whatsapp`, `קורס`],
        },
      ],
    },
    {
      id: `wa-required-electives`,
      title: `קבוצות בחירת חובה ופרויקט`,
      collapsed: true,
      items: [
        {
          id: `wa-final-project`,
          desc: `פרויקט גמר תואר ראשון: סדנה לפרויקטים`,
          name: `קבוצת וואטסאפ של הקורס`,
          url: `https://chat.whatsapp.com/EHPW1T9inZQKmSoFEDQ5be`,
          keywords: [`פרויקט`, `פרויקט גמר`, `project`, `וואטסאפ`, `whatsapp`, `קורס`],
        },
        {
          id: `wa-advanced-systems`,
          desc: `תכנות מערכות מתקדם`,
          name: `קבוצת וואטסאפ של הקורס`,
          url: `https://chat.whatsapp.com/D4iDpgQxQf80UQ07sYzn64`,
          keywords: [`תכנות מערכות`, `systems`, `וואטסאפ`, `whatsapp`, `קורס`],
        },
        {
          id: `wa-databases`,
          desc: `מערכות מסדי נתונים`,
          name: `קבוצת וואטסאפ של הקורס`,
          url: `https://chat.whatsapp.com/LlQDALcMECL2WMwW8uIHbp`,
          keywords: [`מסדי נתונים`, `sql`, `databases`, `וואטסאפ`, `whatsapp`, `קורס`],
        },
        {
          id: `wa-parallel`,
          desc: `תכנות מערכות מקביליות`,
          name: `קבוצת וואטסאפ של הקורס`,
          url: `https://chat.whatsapp.com/LtIVy2uGroOFlS3gEfkn2X`,
          keywords: [`מקביליות`, `parallel`, `וואטסאפ`, `whatsapp`, `קורס`],
        },
        {
          id: `wa-programming-languages`,
          desc: `עקרונות שפות תכנות`,
          name: `קבוצת וואטסאפ של הקורס`,
          url: `https://chat.whatsapp.com/BM8yXZF1NTwGyQpdNzD9VJ`,
          keywords: [`שפות תכנות`, `programming languages`, `וואטסאפ`, `whatsapp`, `קורס`],
        },
        {
          id: `wa-ai`,
          desc: `בינה מלאכותית`,
          name: `קבוצת וואטסאפ של הקורס`,
          url: `https://chat.whatsapp.com/FX0kdfzanY0Ks452ClMsTD`,
          keywords: [`ai`, `בינה`, `וואטסאפ`, `whatsapp`, `קורס`],
        },
        {
          id: `wa-crypto-intro`,
          desc: `מבוא לקריפטוגרפיה`,
          name: `קבוצת וואטסאפ של הקורס`,
          url: `https://chat.whatsapp.com/GGO1DUoqbhc30SUzYTOKKX`,
          keywords: [`קריפטו`, `הצפנה`, `cryptography`, `וואטסאפ`, `whatsapp`, `קורס`],
        },
      ],
    },
    {
      id: `wa-electives`,
      title: `קבוצות בחירה ותואר שני`,
      collapsed: true,
      items: [
        {
          id: `wa-logic`,
          desc: `לוגיקה מתמטית`,
          name: `קבוצת וואטסאפ של הקורס`,
          url: `https://chat.whatsapp.com/H5mMcY3gNoSEZxycGOWcTO`,
          keywords: [`לוגיקה`, `logic`, `וואטסאפ`, `whatsapp`, `קורס`],
        },
        {
          id: `wa-ui`,
          desc: `יסודות בממשק משתמש`,
          name: `קבוצת וואטסאפ של הקורס`,
          url: `https://chat.whatsapp.com/D1cztuBmIPYA1vkLr8tNKc`,
          keywords: [`ממשק`, `ui`, `ux`, `וואטסאפ`, `whatsapp`, `קורס`],
        },
        {
          id: `wa-ai-planning`,
          desc: `בינה מלאכותית ותכנון במערכות אוטונומיות`,
          name: `קבוצת וואטסאפ של הקורס`,
          url: `https://chat.whatsapp.com/FCaPvT8D8M91V1FXAzUoLJ`,
          keywords: [`תכנון`, `אוטונומיות`, `ai`, `וואטסאפ`, `whatsapp`, `קורס`],
        },
        {
          id: `wa-statistical-learning`,
          desc: `תורת הלמידה הסטטיסטית`,
          name: `קבוצת וואטסאפ של הקורס`,
          url: `https://chat.whatsapp.com/ENOzfic0hAOHRo0PBhpuuF`,
          keywords: [`למידה סטטיסטית`, `learning theory`, `וואטסאפ`, `whatsapp`, `קורס`],
        },
        {
          id: `wa-networks`,
          desc: `מבוא לרשתות תקשורת`,
          name: `קבוצת וואטסאפ של הקורס`,
          url: `https://chat.whatsapp.com/Dcbz5uhcIRNFcVIeAPsFN1`,
          keywords: [`רשתות`, `תקשורת`, `networks`, `וואטסאפ`, `whatsapp`, `קורס`],
        },
        {
          id: `wa-image-processing`,
          desc: `עיבוד תמונות`,
          name: `קבוצת וואטסאפ של הקורס`,
          url: `https://chat.whatsapp.com/EcN1wcaDkAM3R8I35pbfWa`,
          keywords: [`תמונות`, `image processing`, `וואטסאפ`, `whatsapp`, `קורס`],
        },
        {
          id: `wa-algo-research`,
          desc: `קורס מחקר מתקדם באלגוריתמיקה 1`,
          name: `קבוצת וואטסאפ של הקורס`,
          url: `https://chat.whatsapp.com/Koax0tjTRhILybwv64KxRw`,
          keywords: [`אלגוריתמיקה`, `מחקר`, `וואטסאפ`, `whatsapp`, `קורס`],
        },
        {
          id: `wa-automata-games`,
          desc: `אוטומטים, משחקים ואימות פורמלי`,
          name: `קבוצת וואטסאפ של הקורס`,
          url: `https://chat.whatsapp.com/CqewHeNihakEp2QJ1dwsZS`,
          keywords: [`אוטומטים`, `אימות פורמלי`, `verification`, `וואטסאפ`, `whatsapp`, `קורס`],
        },
        {
          id: `wa-blockchain`,
          desc: `התאוריה שמאחורי הבלוקצ'יין`,
          name: `קבוצת וואטסאפ של הקורס`,
          url: `https://chat.whatsapp.com/FKfphQSCaIF7yez8IqvgME`,
          keywords: [`בלוקצ'יין`, `blockchain`, `וואטסאפ`, `whatsapp`, `קורס`],
        },
        {
          id: `wa-proof-systems`,
          desc: `מערכות הוכחה קריפטוגרפיות`,
          name: `קבוצת וואטסאפ של הקורס`,
          url: `https://chat.whatsapp.com/IVwB6sxlsrd7Q5MSQJe5oO`,
          keywords: [`קריפטו`, `הוכחה`, `cryptography`, `וואטסאפ`, `whatsapp`, `קורס`],
        },
        {
          id: `wa-nearest-neighbors`,
          desc: `מציאת שכנים קרובים ביותר`,
          name: `קבוצת וואטסאפ של הקורס`,
          url: `https://chat.whatsapp.com/BegAMmcxAVKCWLnCMDLnu7`,
          keywords: [`שכנים קרובים`, `nearest neighbor`, `וואטסאפ`, `whatsapp`, `קורס`],
        },
        {
          id: `wa-human-ai`,
          desc: `סדנה בפיתוח מערכות שיתוף פעולה אדם-AI`,
          name: `קבוצת וואטסאפ של הקורס`,
          url: `https://chat.whatsapp.com/DF0zIZCH1HlCyBE55u1Ipi`,
          keywords: [`סדנה`, `ai`, `וואטסאפ`, `whatsapp`, `קורס`],
        },
        {
          id: `wa-db-workshop`,
          desc: `סדנה במסדי נתונים`,
          name: `קבוצת וואטסאפ של הקורס`,
          url: `https://chat.whatsapp.com/EMpICF0yNlZJ1KSxDIuBdI`,
          keywords: [`סדנה`, `מסדי נתונים`, `databases`, `וואטסאפ`, `whatsapp`, `קורס`],
        },
        {
          id: `wa-nlp`,
          desc: `עיבוד שפות טבעיות`,
          name: `קבוצת וואטסאפ של הקורס`,
          url: `https://chat.whatsapp.com/Ks93qIaTJAIDvynqGDooZh`,
          keywords: [`nlp`, `שפה טבעית`, `וואטסאפ`, `whatsapp`, `קורס`],
        },
        {
          id: `wa-robotics`,
          desc: `מבוא לרובוטיקה`,
          name: `קבוצת וואטסאפ של הקורס`,
          url: `https://chat.whatsapp.com/GePm0ryLdpwLTHO5qQzUjP`,
          keywords: [`רובוטיקה`, `robotics`, `וואטסאפ`, `whatsapp`, `קורס`],
        },
        {
          id: `wa-deep-learning`,
          desc: `למידה עמוקה (דיפ לרנינג)`,
          name: `קבוצת וואטסאפ של הקורס`,
          url: `https://chat.whatsapp.com/IzFonKy7R0T6PK8fAjBHma`,
          keywords: [`למידה עמוקה`, `דיפ לרנינג`, `deep learning`, `וואטסאפ`, `whatsapp`, `קורס`],
        },
      ],
    },
    {
      id: `wa-seminars`,
      title: `קבוצות הסמינריונים`,
      collapsed: true,
      items: [
        {
          id: `wa-sem-theory`,
          desc: `סמינר תאוריה`,
          name: `קבוצת וואטסאפ של הקורס`,
          url: `https://chat.whatsapp.com/KpgaPhPIPAgB4hZM52UmZn`,
          keywords: [`תאוריה`, `theory`, `וואטסאפ`, `whatsapp`, `קורס`],
        },
        {
          id: `wa-sem-representations`,
          desc: `סמינריון בלמידת ייצוגים`,
          name: `קבוצת וואטסאפ של הקורס`,
          url: `https://chat.whatsapp.com/GqPEV8It6JlLIr2PWiWCt8`,
          keywords: [`ייצוגים`, `representation learning`, `וואטסאפ`, `whatsapp`, `קורס`],
        },
        {
          id: `wa-sem-applied-crypto`,
          desc: `סמינריון נושאים מתקדמים בקריפטוגרפיה יישומית`,
          name: `קבוצת וואטסאפ של הקורס`,
          url: `https://chat.whatsapp.com/CQVGeSr74IrK8xsyCAJgaW`,
          keywords: [`קריפטו`, `cryptography`, `וואטסאפ`, `whatsapp`, `קורס`],
        },
        {
          id: `wa-sem-polynomials`,
          desc: `בדיקת תכונות פולינומים בעלת עמידות קוונטית`,
          name: `קבוצת וואטסאפ של הקורס`,
          url: `https://chat.whatsapp.com/JYYPQwJ4h87CKnFqWSUyDX`,
          keywords: [`פולינומים`, `קוונטי`, `quantum`, `וואטסאפ`, `whatsapp`, `קורס`],
        },
        {
          id: `wa-sem-pac`,
          desc: `למידת PAC פרטית`,
          name: `קבוצת וואטסאפ של הקורס`,
          url: `https://chat.whatsapp.com/C9fIeuRcpQ9HkkNawsVaBu`,
          keywords: [`pac`, `פרטיות`, `וואטסאפ`, `whatsapp`, `קורס`],
        },
        {
          id: `wa-sem-community`,
          desc: `מדעי המחשב וקהילה`,
          name: `קבוצת וואטסאפ של הקורס`,
          url: `https://chat.whatsapp.com/LDrgKz5PAgJIeq9RmqXqqx`,
          keywords: [`קהילה`, `community`, `וואטסאפ`, `whatsapp`, `קורס`],
        },
        {
          id: `wa-sem-llm-eval`,
          desc: `סמינריון הערכה של מודלי שפה גדולים`,
          name: `קבוצת וואטסאפ של הקורס`,
          url: `https://chat.whatsapp.com/ISrCacRzp3hIygPXWHuIWx`,
          keywords: [`llm`, `מודלי שפה`, `וואטסאפ`, `whatsapp`, `קורס`],
        },
        {
          id: `wa-sem-advanced-ds`,
          desc: `מבני נתונים מתקדמים`,
          name: `קבוצת וואטסאפ של הקורס`,
          url: `https://chat.whatsapp.com/H3k2nDknNsgGFslfveT85r`,
          keywords: [`מבני נתונים`, `data structures`, `וואטסאפ`, `whatsapp`, `קורס`],
        },
        {
          id: `wa-sem-nlp-research`,
          desc: `סמינר מחקר בעיבוד שפה טבעית`,
          name: `קבוצת וואטסאפ של הקורס`,
          url: `https://chat.whatsapp.com/DZNeNumU9Mv1jxqt4ZwsGI`,
          keywords: [`nlp`, `שפה טבעית`, `וואטסאפ`, `whatsapp`, `קורס`],
        },
        {
          id: `wa-sem-bio`,
          desc: `סמינריון בביולוגיה חישובית`,
          name: `קבוצת וואטסאפ של הקורס`,
          url: `https://chat.whatsapp.com/FLJuj4faQ8jHkBe1AgfmLT`,
          keywords: [`ביולוגיה`, `biology`, `וואטסאפ`, `whatsapp`, `קורס`],
        },
        {
          id: `wa-sem-ethics-ai`,
          desc: `אתיקה ואינטליגנציה מלאכותית`,
          name: `קבוצת וואטסאפ של הקורס`,
          url: `https://chat.whatsapp.com/BgBsO8fpjx1BKSweNgur9u`,
          keywords: [`אתיקה`, `ethics`, `ai`, `וואטסאפ`, `whatsapp`, `קורס`],
        },
        {
          id: `wa-sem-verification`,
          desc: `סמינריון שיטות אימות לתוכנה`,
          name: `קבוצת וואטסאפ של הקורס`,
          url: `https://chat.whatsapp.com/CruVxyFvKj7Bpjpbnp2bEE`,
          keywords: [`אימות`, `verification`, `וואטסאפ`, `whatsapp`, `קורס`],
        },
        {
          id: `wa-sem-geometry`,
          desc: `סמינריון בגיאומטריה חישובית`,
          name: `קבוצת וואטסאפ של הקורס`,
          url: `https://chat.whatsapp.com/El3ziPqkjyj3GPZ6XyxJVq`,
          keywords: [`גיאומטריה`, `geometry`, `וואטסאפ`, `whatsapp`, `קורס`],
        },
        {
          id: `wa-sem-graphs`,
          desc: `סמינר מתקדם באלגוריתמים לגרפים`,
          name: `קבוצת וואטסאפ של הקורס`,
          url: `https://chat.whatsapp.com/EmPl6ay3nH34CBj2U21lsK`,
          keywords: [`גרפים`, `graphs`, `וואטסאפ`, `whatsapp`, `קורס`],
        },
      ],
    },
  ],

  // שאלות של המחלקה, באותו פורמט כמו ב-shared/data.js. after: השאלה המשותפת שאחריה השאלה מופיעה בדף (בלי after: בסוף הרשימה).
  faq: [
    // קמפוס
    {
      // מופיעה אחרי השאלה המשותפת הזאת (ראו README). בלי after היא מופיעה בסוף.
      after: `איך נכנסים לקמפוס כשאין מאבטח בשער?`,
      q: `איך נכנסים למרחב הלמידה של מדמ"ח?`,
      a: `המרחב נמצא בקומת הקרקע של בניין מדעי המחשב (503), ונכנסים אליו עם האפליקציה My BLE-ID. בפעם הראשונה מורידים אותה ומבקשים במזכירות המחלקה (בניין 503, קומה 1) שיסדרו לכם אישור. מאז, בכל כניסה פותחים את האפליקציה ולוחצים על Door 1 (עם Bluetooth דלוק).`,
      more: `המרחב פתוח תמיד, והחשמל דולק עד 00:00. לפעמים הדלת נתקעת לכמה דקות ולא מופיעה באפליקציה. מחכים קצת ומנסים שוב.`,
      guide: `cs-study-space`,
      sources: [],
      keywords: [`מרחב למידה`, `חדר לימוד`, `דלת`, `door`, `my ble-id`, `bluetooth`, `בלוטוס`, `מדמח`],
    },
    {
      // מופיעה אחרי השאלה המשותפת הזאת (ראו README). בלי after היא מופיעה בסוף.
      after: `איך נכנסים לקמפוס כשאין מאבטח בשער?`,
      q: `מה יש במרחב הלמידה של מדמ"ח?`,
      a: `שולחנות עם שקעים, קירות זכוכית מחיקים, ספות, חדרים סגורים עם מסך, ומטבחון עם מקרר, מיקרוגלים נפרדים לבשרי ולחלבי ותמי 4. זה המקום שבו יושבים ללמוד למבחנים, לעבוד על מטלות, לאכול או סתם לשבת עם חברים.`,
      more: `המרחב בבניין 503, בקומת הקרקע ובקומת הסטודיו. החדרים הסגורים הם כל הקודם זוכה, ואסור לשמור חדר עם חפץ וללכת.`,
      guide: `cs-study-space`,
      sources: [],
      keywords: [`מרחב למידה`, `חדרים`, `חדר`, `מסך`, `לוח`, `מחיק`, `שקעים`, `ספות`, `מטבחון`, `מקרר`, `מיקרוגל`, `תמי 4`, `לאכול`, `ללמוד`, `503`],
    },

    // לימודים ועזרה
    {
      // מופיעה אחרי השאלה המשותפת הזאת (ראו README). בלי after היא מופיעה בסוף.
      after: `איך מתחברים לאינטרנט בקמפוס?`,
      q: `איפה יש מבחנים וסיכומים משנים קודמות?`,
      a: `בדרייב מדמ"ח יש סיכומים ומבחנים משנים קודמות. לקורסי היסוד ביהדות יש דרייב נפרד.`,
      links: [`cs-drive`, `judaism-drive`],
      keywords: [`מבחנים`, `מבחנים קודמים`, `סיכומים`, `דרייב`, `יהדות`],
    },
    {
      // מופיעה אחרי השאלה המשותפת הזאת (ראו README). בלי after היא מופיעה בסוף.
      after: `איך מתחברים לאינטרנט בקמפוס?`,
      q: `איך פונים למזכירות של מדעי המחשב?`,
      a: `מזכירות תואר ראשון: bsc@cs.biu.ac.il, או בטופס הפנייה באתר המחלקה (בוחרים "מזכירות תואר ראשון"). הטלפון של המחלקה: 03-5318866.`,
      more: `משרדי ההנהלה והמזכירות של המחלקה למדעי המחשב ובינה מלאכותית נמצאים בבניין 503, קומה 1.`,
      links: [`cs-contact`],
      guide: `help`,
      sources: [{ label: `יצירת קשר עם המחלקה למדעי המחשב`, url: `https://cs.biu.ac.il/contact` }, { label: `הסגל המנהלי של המחלקה`, url: `https://cs.biu.ac.il/he/administrative_staff` }],
      keywords: [`מזכירות`, `מדמח`, `מדעי המחשב`, `מחלקה`, `תואר ראשון`, `bsc`, `מייל`, `טלפון`, `פנייה`],
    },
    {
      // מופיעה אחרי השאלה המשותפת הזאת (ראו README). בלי after היא מופיעה בסוף.
      after: `איך מתחברים לאינטרנט בקמפוס?`,
      q: `אני לא במדעי המחשב. האתר רלוונטי גם לי?`,
      a: `האתר נבנה לשנה א' במדעי המחשב, אבל חלק גדול ממנו משותף לכל בר-אילן: אינ-בר ותקופת השינויים, למדה ו-365, שכר לימוד, כניסה לקמפוס, השאטל, האוכל, הבחינות וזכויות המילואים. מה שספציפי למחלקה (קורסים, מזכירות, קבוצות הוואטסאפ של הקורסים והמחלקה, ידיעונים ומסלולים) נכון רק למדמ"ח. על המחלקה שלכם (מדעי המוח, פסיכולוגיה, ביולוגיה או כל אחת אחרת) שואלים באתר המחלקה ובמזכירות שלה.`,
      sources: [], // התשובה על האתר עצמו, אין לה מקור רשמי
      keywords: [`מדעי המוח`, `מוח`, `פסיכולוגיה`, `ביולוגיה`, `מחלקה אחרת`, `מחלקות אחרות`, `חוג`, `חד חוגי`, `משולב`, `מסלול`, `ידיעון`, `לא מדמח`, `רלוונטי`, `neuro`, `brain`, `psychology`],
    },
    {
      q: `לא מצאתי פה תשובה, למי כותבים?`,
      a: `כתבו לרועי כרמלי בקבוצת הוואטסאפ הראשית או בהודעה פרטית.`,
      links: [`mentor`, `wa-main`],
      guide: `help`,
      sources: [], // התשובה היא פנייה לרועי, אין לה מקור רשמי
      keywords: [`שאלה`, `עזרה`, `רועי`, `חונך`, `וואטסאפ`],
    },
  ],
};
