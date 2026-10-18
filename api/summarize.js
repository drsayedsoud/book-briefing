// api/summarize.js - Vercel Serverless Function
// تلخيص الكتب باستخدام نماذج Google Gemini

const MODELS = [
  'gemini-2.5-flash',
  'gemini-1.5-flash',
  'gemini-flash-latest',
  'gemini-pro'
];

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'الطريقة غير مدعومة. استخدم POST.' });
  }

  try {
    const { bookTitle, author, mode = 'comprehensive', clientApiKey } = req.body || {};

    if (!bookTitle || !bookTitle.trim()) {
      return res.status(400).json({ error: 'يرجى تقديم اسم الكتاب المطلوب تلخيصه.' });
    }

    // Determine API Key: Client Key OR Server Environment Variable
    const apiKey = (clientApiKey || process.env.GEMINI_API_KEY || '').trim();

    if (!apiKey) {
      return res.status(400).json({
        error: 'لم يتم العثور على مفتاح Gemini API. يرجى إدخال مفتاحك في واجهة التطبيق أو ضبط GEMINI_API_KEY في إعدادات Vercel.'
      });
    }

    const searchQuery = author ? `كتاب "${bookTitle.trim()}" للمؤلف "${author.trim()}"` : `كتاب "${bookTitle.trim()}"`;

    const systemPrompt = `أنت ناقد ومفكر أدبي واستشاري قراءة وخبير تلخيص كتب عالمي ومخضرم.
مهمتك إعداد ملخص احترافي، بليغ، عميق وشامل باللغة العربية الفصحى الراقية.

أعد الرد على شكل JSON صالح فقط دون أي نص قبله أو بعده:
{
  "id": "معرف قصير باللاتينية",
  "title": "الاسم الرسمي والدقيق للكتاب بالعربية",
  "originalTitle": "الاسم الأصلي بلغة النشر الأولى إذا كان مترجماً",
  "author": "اسم المؤلف كاملاً بالعربية والمعروف به",
  "genre": "تصنيف الكتاب (مثل: تطوير ذات، علم نفس، مال وأعمال، فلسفة، أدب، تاريخ...)",
  "publishedYear": "سنة النشر الأصلية (مثال: 2018)",
  "rating": 4.8,
  "readingTimeMinutes": 6,
  "oneSentencePitch": "فكرة الكتاب الجوهرية المكثفة في جملة واحدة عميقة وبليغة تترك أثراً في النفس",
  "executiveSummary": "ملخص تنفيذي متكامل ومكتوب بلغة راقية من 3 إلى 5 فقرات يشرح أطروحة الكتاب، السياق التاريخي أو المعرفي، وكيف بنى الكاتب حججه وأفكاره",
  "keyTakeaways": [
    {
      "title": "عنوان الفكرة أو الدرس المستفاد الجوهري",
      "description": "شرح تفصيلي عميق للفكرة ومنطقها",
      "practicalExample": "تطبيق واقعي أو مثال من الحياة اليومية والعملية"
    }
  ],
  "coreChapters": [
    {
      "chapterTitle": "عنوان الفصل أو المحور الرئيسي",
      "summary": "تلخيص ما جاء في هذا الجزء من الكتاب بوضوح"
    }
  ],
  "authorBio": "نبذة موجزة وثرية عن الكاتب، خلفيته العلمية والفكرية، وما ألهمه لتأليف هذا العمل",
  "notableQuotes": [
    "اقتباس شهير ومؤثر 1 من الكتاب",
    "اقتباس شهير ومؤثر 2",
    "اقتباس شهير ومؤثر 3"
  ],
  "targetAudience": {
    "recommendedFor": [
      "الفئة الأولى المستفيدة من قراءة الكتاب",
      "الفئة الثانية",
      "الفئة الثالثة"
    ],
    "notRecommendedFor": [
      "الفئة التي قد لا يناسبها هذا الكتاب أو تجده غير مفيد لها"
    ]
  },
  "actionableSteps": [
    "خطوة تطبيقية عملية رقم 1 يمكن للقارئ البدء بها اليوم في حياته",
    "خطوة عملية رقم 2",
    "خطوة عملية رقم 3"
  ]
}

مستوى الشمول:
${mode === 'comprehensive' ? 'شامل ومفصل جداً مع 4-6 دروس مستفادة و3-4 فصول رئيسية.' : mode === 'concise' ? 'مركز وموجز في نقاط سريعة.' : 'ملخص تنفيذي موجه للمدراء ورواد الأعمال مع التركيز على النتائج العملية.'}`;

    const userPrompt = `المطلوب تلخيص: ${searchQuery}. أخرج فقط كائن JSON الصالح باللغة العربية.`;

    const requestBody = {
      contents: [
        {
          role: 'user',
          parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }]
        }
      ],
      generationConfig: {
        temperature: 0.3,
        topP: 0.9,
        maxOutputTokens: 4096,
        responseMimeType: 'application/json'
      }
    };

    let rawText = '';
    let usedModel = '';
    let lastError = null;

    for (const model of MODELS) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData?.error?.message || `HTTP ${response.status}`);
        }

        const data = await response.json();
        const candidate = data.candidates?.[0];
        const text = candidate?.content?.parts?.[0]?.text;
        if (text) {
          rawText = text;
          usedModel = model;
          break;
        }
      } catch (err) {
        lastError = err;
      }
    }

    if (!rawText) {
      return res.status(502).json({
        error: lastError ? lastError.message : 'فشل الحصول على رد من نموذج Gemini الذكي.'
      });
    }

    // Clean JSON
    let cleanJson = rawText.trim();
    if (cleanJson.startsWith('```json')) {
      cleanJson = cleanJson.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const parsed = JSON.parse(cleanJson);
    parsed.id = parsed.id || `book-${Date.now()}`;
    parsed.createdAt = Date.now();

    return res.status(200).json({
      success: true,
      summary: parsed,
      model: usedModel
    });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({
      error: error.message || 'حدث خطأ داخلي أثناء معالجة الملخص.'
    });
  }
}
