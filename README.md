# 📚 خُلاصة الكتب (Book Briefing AI)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/drsayedsoud/book-briefing&env=GEMINI_API_KEY&envDescription=Google%20Gemini%20API%20Key%20from%20Google%20AI%20Studio&project-name=book-briefing)

تطبيق ويب حديث وذكي لتلخيص أمهات الكتب العالمية والعربية بدقة وعمق باستخدام نماذج **Google Gemini AI**، مع إمكانية استعراض مكتبة ضخمة من الكتب والمؤلفين والاستماع للملخص صوتياً وحفظه وتصديره.

---

## ✨ المميزات الرئيسية

1. **تلخيص ذكي فوري لأي كتاب في العالم**:
   - الفكرة الجوهرية المكثفة في جملة واحدة.
   - ملخص تنفيذي شامل ومرتب.
   - أهم الدروس المستفادة مع تطبيقات وأمثلة واقعية من الحياة اليومية.
   - تفكيك فصول ومحاور الكتاب الرئيسية.
   - أبرز الاقتباسات الشهيرة والملهمة.
   - نبذة عن المؤلف وسياق تأليف العمل.
   - خطة عمل عملية وتطبيقية للقارئ للبدء اليوم.
   - تحديد الفئات المستهدفة (لمن يصلح الكتاب ولمن لا يصلح).

2. **الاستماع الصوتي للملخص (Text-to-Speech)**:
   - قارئ صوتي مدمج باللغة العربية الفصحى مع إمكانية التشغيل، الإيقاف المؤقت، والتحكم في سرعة القراءة (1.0x / 1.25x / 1.5x).

3. **مكتبة الكتب الشائعة واستعراض المؤلفين**:
   - استعراض مصنف لأهم الكتب (تطوير الذات، المال والأعمال، علم النفس، الفلسفة، الأدب العربي والعالمي، التاريخ).
   - دليل لأعلام الفكر والأدب (نجيب محفوظ، دوستويفسكي، جيمس كلير، عباس العقاد، د. مصطفى محمود، روبرت كيوساكي، مالكوم جلادويل، د. أحمد خالد توفيق).
   - نقرة واحدة على أي كتاب أو مؤلف لاستعراض ملخصه فوراً.

4. **تصدير وطباعة وحفظ محلي**:
   - نسخ الملخص بصيغة Markdown منسقة بالكامل.
   - تصدير وطباعة الملخص كملف PDF أنيق.
   - حفظ الملخصات في المفضلة الشخصية (LocalStorage) بدون الحاجة لقاعدة بيانات خارجية.

5. **طريقتان لتشغيل مفتاح Gemini**:
   - **الواجهة المباشرة**: إدخال المفتاح في إعدادات التطبيق ويُحفظ بأمان في متصفحك.
   - **خادم Vercel Serverless**: عبر الدالة `/api/summarize` التي تقرأ المتغير `GEMINI_API_KEY` تلقائياً في السيرفر.

---

## 🚀 كيفية رفع المشروع على GitHub ونشره على Vercel

### الخطوة الأولى: رفع المشروع على GitHub

1. افتح حسابك على [GitHub](https://github.com) وأنشئ مستودعاً جديداً (New Repository) باسم `book-briefing` واجعله **Public**.
2. افتح موجه الأوامر (Terminal / PowerShell) في هذا المجلد ونفّذ الأوامر التالية:

```bash
git init
git add .
git commit -m "feat: initial commit of Book Briefing Gemini App"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/book-briefing.git
git push -u origin main
```
*(استبدل `YOUR_USERNAME` باسم حسابك على GitHub)*

---

### الخطوة الثانية: النشر على Vercel (الحصول على الرابط المباشر)

1. سجل الدخول إلى [Vercel](https://vercel.com) بحساب GitHub الخاص بك.
2. اضغط على **Add New...** ثم اختر **Project**.
3. ستجد مستودع `book-briefing` في القائمة؛ اضغط على زر **Import**.
4. في خانة **Environment Variables**:
   - **Key**: `GEMINI_API_KEY`
   - **Value**: مفتاح الـ API الخاص بك من [Google AI Studio](https://aistudio.google.com/app/apikey).
5. اضغط على زر **Deploy**.
6. في غضون ثوانٍ معدودة، سيعطيك Vercel الرابط المباشر للموقع جاهزاً للعمل (مثل: `https://book-briefing-xxx.vercel.app`)! 🎉

---

## 💻 التشغيل المحلي (Local Testing)

يمكنك تجربة التطبيق محلياً فوراً بأي خادم ويب بسيط:

```bash
# باستخدام Python:
python -m http.server 3000

# أو باستخدام npx serve:
npx serve .
```

ثم افتح المتصفح على: `http://localhost:3000`

---

## 🔑 الحصول على مفتاح Gemini API المجاني

1. ادخل على [Google AI Studio](https://aistudio.google.com/app/apikey).
2. سجل الدخول بحساب Google.
3. اضغط **Create API Key**.
4. انسخ المفتاح والصقه داخل التطبيق أو في متغيرات Vercel.
