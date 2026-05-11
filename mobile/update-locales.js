const fs = require('fs');
const path = require('path');

const localesPath = path.join(__dirname, 'src', 'shared', 'i18n', 'locales');
const enFile = path.join(localesPath, 'en.json');
const arFile = path.join(localesPath, 'ar.json');

const en = JSON.parse(fs.readFileSync(enFile, 'utf8').replace(/^\uFEFF/, ''));
const ar = JSON.parse(fs.readFileSync(arFile, 'utf8').replace(/^\uFEFF/, ''));

// We add translations for the new components
en.memoryMatch = {
  title: "Memory Match",
  subtitle: "Practice remembering which item belongs with which place.",
  level: "Level {{level}}",
  grid: "Grid",
  itemsToRemember: "Items to remember",
  studyTime: "Study time",
  shortWait: "Short wait before recall",
  seconds: "{{count}} seconds",
  hint: "Look carefully at where each item is placed. You will be asked to find them afterwards.",
  startPractice: "Start Practice",
  lookCarefully: "Look carefully at each item's position",
  imReady: "I'm ready",
  almostTime: "Almost time…",
  takeBreath: "Take a breath. The recall will begin shortly.",
  goodJob: "✓  Good job!",
  thatsOkay: "That's okay. Let's continue.",
  progress: "{{current}} of {{total}}",
  whereWas: "Where was the",
  sessionComplete: "Session Complete",
  advanceMsg: "Great practice! You're ready for the next level.",
  stayMsg: "Nice effort! Let's practice this level again.",
  regressMsg: "We'll make the next round a little easier.",
  itemsRecalled: "Items recalled",
  recalledValue: "{{correct}} of {{total}}",
  practiceScore: "Practice score",
  accuracy: "Accuracy",
  levelLabel: "Level",
  practiceAgain: "Practice Again",
  done: "Done"
};

ar.memoryMatch = {
  title: "مطابقة الذاكرة",
  subtitle: "تدرب على تذكر مكان كل عنصر.",
  level: "المستوى {{level}}",
  grid: "الشبكة",
  itemsToRemember: "عناصر للتذكر",
  studyTime: "وقت الدراسة",
  shortWait: "انتظار قصير قبل التذكر",
  seconds: "{{count}} ثانية",
  hint: "انظر بعناية إلى مكان كل عنصر. سيُطلب منك العثور عليها بعد ذلك.",
  startPractice: "ابدأ التدريب",
  lookCarefully: "انظر بعناية إلى موقع كل عنصر",
  imReady: "أنا مستعد",
  almostTime: "اقترب الوقت...",
  takeBreath: "خذ نفسا. سيبدأ التذكر قريبا.",
  goodJob: "✓ عمل جيد!",
  thatsOkay: "لا بأس. لنكمل.",
  progress: "{{current}} من {{total}}",
  whereWas: "أين كان",
  sessionComplete: "اكتملت الجلسة",
  advanceMsg: "تدريب رائع! أنت جاهز للمستوى التالي.",
  stayMsg: "مجهود جيد! لنتدرب على هذا المستوى مرة أخرى.",
  regressMsg: "سنجعل الجولة التالية أسهل قليلا.",
  itemsRecalled: "العناصر التي تم تذكرها",
  recalledValue: "{{correct}} من {{total}}",
  practiceScore: "نقاط التدريب",
  accuracy: "الدقة",
  levelLabel: "المستوى",
  practiceAgain: "تدرب مرة أخرى",
  done: "تم"
};

en.orientationPractice = {
  title: "Orientation Practice",
  subtitle: "Practice remembering helpful daily information. Take your time — there's no rush.",
  oneQuestion: "• One question at a time",
  tapAnswer: "• Tap the answer you think is correct",
  helpfulHint: "• A helpful hint is always available",
  sessionsTake: "• Sessions take about 5 minutes",
  beginPractice: "Begin Practice",
  progress: "{{current}} of {{total}}",
  imNotSure: "I'm not sure",
  showHint: "Show hint",
  wellDone: "Well done!",
  noWorries: "No worries.",
  thatsOkay: "That's okay.",
  youRemembered: "You remembered that one.",
  answerIs: "The answer is: {{answer}}",
  seeResults: "See Results",
  nextQuestion: "Next Question",
  practiceComplete: "Practice Complete",
  rememberedSummary: "You remembered {{correct}} of {{total}} items today.",
  withoutHints: " {{count}} without any hints.",
  questionsAnswered: "Questions answered",
  correct: "Correct",
  withHint: "With a hint",
  accuracy: "Accuracy",
  practiceAgain: "Practice Again",
  done: "Done"
};

ar.orientationPractice = {
  title: "التدريب على التوجيه",
  subtitle: "تدرب على تذكر المعلومات اليومية المفيدة. خذ وقتك — لا داعي للعجلة.",
  oneQuestion: "• سؤال واحد في كل مرة",
  tapAnswer: "• اضغط على الإجابة التي تعتقد أنها صحيحة",
  helpfulHint: "• تلميح مفيد متاح دائما",
  sessionsTake: "• تستغرق الجلسات حوالي 5 دقائق",
  beginPractice: "ابدأ التدريب",
  progress: "{{current}} من {{total}}",
  imNotSure: "لست متأكدا",
  showHint: "إظهار التلميح",
  wellDone: "أحسنت!",
  noWorries: "لا تقلق.",
  thatsOkay: "لا بأس.",
  youRemembered: "لقد تذكرت هذا.",
  answerIs: "الإجابة هي: {{answer}}",
  seeResults: "رؤية النتائج",
  nextQuestion: "السؤال التالي",
  practiceComplete: "اكتمل التدريب",
  rememberedSummary: "لقد تذكرت {{correct}} من {{total}} عناصر اليوم.",
  withoutHints: " {{count}} بدون أي تلميحات.",
  questionsAnswered: "الأسئلة المجابة",
  correct: "صحيح",
  withHint: "مع تلميح",
  accuracy: "الدقة",
  practiceAgain: "تدرب مرة أخرى",
  done: "تم"
};

en.manageFacts = {
  title: "Orientation Facts",
  subtitle: "Managing for {{name}}",
  cancel: "Cancel",
  addNew: "+ Add New Fact",
  prompt: "Prompt / Question",
  correctAnswer: "Correct Answer",
  hint: "Hint / Cue (optional)",
  wrongAnswers: "Wrong answers, comma-separated (optional)",
  update: "Update",
  save: "Save",
  hintPrefix: "Hint: ",
  noFacts: "No active facts yet. Add some to help with orientation practice.",
  selectPatient: "Please select a patient first."
};

ar.manageFacts = {
  title: "حقائق التوجيه",
  subtitle: "الإدارة للمريض {{name}}",
  cancel: "إلغاء",
  addNew: "+ إضافة حقيقة جديدة",
  prompt: "الموجه / السؤال",
  correctAnswer: "الإجابة الصحيحة",
  hint: "تلميح / إشارة (اختياري)",
  wrongAnswers: "إجابات خاطئة، مفصولة بفواصل (اختياري)",
  update: "تحديث",
  save: "حفظ",
  hintPrefix: "تلميح: ",
  noFacts: "لا توجد حقائق نشطة بعد. أضف بعضها للمساعدة في ممارسة التوجيه.",
  selectPatient: "الرجاء تحديد مريض أولاً."
};

fs.writeFileSync(enFile, JSON.stringify(en, null, 2));
fs.writeFileSync(arFile, JSON.stringify(ar, null, 2));
console.log('Translation files updated successfully!');
