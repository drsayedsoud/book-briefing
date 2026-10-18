import { CATEGORIES, CURATED_BOOKS, CURATED_AUTHORS, SAMPLE_SUMMARIES, READING_WISDOM } from './data.js';

// حالة التطبيق (State)
const state = {
  currentTab: 'search',
  apiKey: localStorage.getItem('gemini_api_key') || '',
  activeCategory: 'الكل',
  searchQuery: '',
  authorSearchQuery: '',
  isLoading: false,
  currentSummary: null,
  savedSummaries: JSON.parse(localStorage.getItem('saved_book_summaries') || '[]'),
  summaryMode: 'comprehensive', // 'comprehensive' | 'concise' | 'executive'
  tts: {
    synth: window.speechSynthesis,
    utterance: null,
    isPlaying: false,
    isPaused: false,
    rate: 1.0
  }
};

// تهيئة التطبيق عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
  initIcons();
  updateApiKeyBadge();
  renderCategoryPills();
  renderCuratedBooks();
  renderCuratedAuthors();
  renderSavedSummaries();
  setupEventListeners();

  // إذا كان هناك ملخص سابق محفوظ، اعرض نموذج تجريبي افتراضي أو افتح البحث
  const lastViewed = localStorage.getItem('last_viewed_summary');
  if (lastViewed && SAMPLE_SUMMARIES[lastViewed]) {
    displaySummary(SAMPLE_SUMMARIES[lastViewed]);
  } else {
    // عرض ملخص العادات الذرية كنموذج رائع عند الدخول الأول
    displaySummary(SAMPLE_SUMMARIES['atomic-habits']);
  }
});

// تهيئة أيقونات Lucide
function initIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

// تحديث مؤشر مفتاح API
function updateApiKeyBadge() {
  const badge = document.getElementById('api-key-badge');
  const badgeText = document.getElementById('api-key-badge-text');
  const hasKey = !!state.apiKey.trim();

  if (hasKey) {
    badge.className = 'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 transition-all';
    badgeText.textContent = 'مفتاح Gemini متصل ✓';
  } else {
    badge.className = 'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-amber-500/25 transition-all animate-pulse';
    badgeText.textContent = 'إدخال مفتاح Gemini';
  }
  initIcons();
}

// رسم تصنيفات الكتب
function renderCategoryPills() {
  const container = document.getElementById('category-pills');
  if (!container) return;

  container.innerHTML = CATEGORIES.map(category => {
    const isActive = state.activeCategory === category;
    return `
      <button 
        data-category="${category}"
        class="category-pill whitespace-nowrap px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
          isActive 
            ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20' 
            : 'bg-slate-900/90 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800'
        }">
        ${category}
      </button>
    `;
  }).join('');

  container.querySelectorAll('.category-pill').forEach(btn => {
    btn.addEventListener('click', (e) => {
      state.activeCategory = e.currentTarget.getAttribute('data-category');
      renderCategoryPills();
      renderCuratedBooks();
    });
  });
}

// رسم شبكة الكتب المقترحة
function renderCuratedBooks() {
  const container = document.getElementById('books-grid');
  if (!container) return;

  const filtered = CURATED_BOOKS.filter(book => {
    const matchCat = state.activeCategory === 'الكل' || book.category === state.activeCategory;
    const q = state.searchQuery.toLowerCase().trim();
    const matchSearch = !q || 
      book.title.toLowerCase().includes(q) || 
      book.author.toLowerCase().includes(q) || 
      book.tags.some(t => t.toLowerCase().includes(q));
    return matchCat && matchSearch;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="col-span-full py-16 text-center text-slate-400">
        <i data-lucide="book-x" class="w-12 h-12 mx-auto mb-3 opacity-40"></i>
        <p class="text-lg font-semibold">لم نجد كتباً مطابقة لبحثك</p>
        <p class="text-sm text-slate-500 mt-1">جرّب كتابة اسم الكتاب مباشرة في صندوق التلخيص وسيقوم Gemini بتلخيصه لك فوراً!</p>
      </div>
    `;
    initIcons();
    return;
  }

  container.innerHTML = filtered.map(book => {
    return `
      <div class="group relative bg-slate-900/70 border border-slate-800/80 hover:border-emerald-500/50 rounded-2xl p-5 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-950/30">
        <div>
          <!-- Header Banner -->
          <div class="h-2 w-full rounded-full bg-gradient-to-r ${book.coverGradient} mb-4"></div>
          
          <div class="flex items-start justify-between gap-2 mb-2">
            <span class="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-800 text-emerald-400 border border-slate-700">
              ${book.category}
            </span>
            ${book.year ? `<span class="text-xs text-slate-500">${book.year}</span>` : ''}
          </div>

          <h3 class="text-lg font-bold text-white group-hover:text-emerald-400 transition-colors line-clamp-1 mb-1">
            ${book.title}
          </h3>
          
          <p class="text-xs text-slate-400 font-medium mb-3 flex items-center gap-1.5">
            <i data-lucide="feather" class="w-3.5 h-3.5 text-slate-500"></i>
            ${book.author}
          </p>

          <p class="text-xs text-slate-300/90 leading-relaxed line-clamp-3 mb-4">
            ${book.shortDescription}
          </p>
        </div>

        <div>
          <!-- Tags -->
          <div class="flex flex-wrap gap-1.5 mb-4">
            ${book.tags.map(t => `<span class="text-[10px] px-2 py-0.5 rounded-full bg-slate-950 text-slate-400 border border-slate-800">#${t}</span>`).join('')}
          </div>

          <button 
            data-book-title="${book.title}"
            data-book-author="${book.author}"
            data-book-id="${book.id}"
            class="generate-book-btn w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 text-slate-200 transition-all flex items-center justify-center gap-2 group-hover:bg-emerald-500 group-hover:text-slate-950">
            <i data-lucide="sparkles" class="w-4 h-4"></i>
            <span>قراءة الملخص بالذكاء الاصطناعي</span>
          </button>
        </div>
      </div>
    `;
  }).join('');

  // ربط أزرار الكتب
  container.querySelectorAll('.generate-book-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const title = e.currentTarget.getAttribute('data-book-title');
      const author = e.currentTarget.getAttribute('data-book-author');
      const id = e.currentTarget.getAttribute('data-book-id');

      // إذا كان الكتاب من النماذج الجاهزة مسبقاً، اعرضه فوراً وبدون استهلاك للـ API
      if (SAMPLE_SUMMARIES[id]) {
        displaySummary(SAMPLE_SUMMARIES[id]);
        switchTab('summary');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      handleGenerateSummary(title, author);
    });
  });

  initIcons();
}

// رسم قائمة المؤلفين
function renderCuratedAuthors() {
  const container = document.getElementById('authors-grid');
  if (!container) return;

  const q = state.authorSearchQuery.toLowerCase().trim();
  const filtered = CURATED_AUTHORS.filter(author => {
    return !q || 
      author.name.toLowerCase().includes(q) || 
      author.nationality.toLowerCase().includes(q) ||
      author.famousBooks.some(b => b.toLowerCase().includes(q));
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="col-span-full py-16 text-center text-slate-400">
        <i data-lucide="users" class="w-12 h-12 mx-auto mb-3 opacity-40"></i>
        <p class="text-lg font-semibold">لم نجد مؤلفاً بهذا الاسم</p>
      </div>
    `;
    initIcons();
    return;
  }

  container.innerHTML = filtered.map(author => {
    return `
      <div class="bg-slate-900/80 border border-slate-800 hover:border-slate-700 rounded-2xl p-6 transition-all hover:-translate-y-1 hover:shadow-xl">
        <div class="flex items-center gap-4 mb-4">
          <div class="w-14 h-14 rounded-2xl bg-gradient-to-tr ${author.avatarGradient} flex items-center justify-center text-white text-xl font-black shadow-lg">
            ${author.name.slice(0, 1)}
          </div>
          <div>
            <h3 class="text-lg font-bold text-white">${author.name}</h3>
            <div class="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
              <span>${author.nationality}</span>
              <span>•</span>
              <span>${author.era}</span>
            </div>
          </div>
        </div>

        <p class="text-xs text-slate-300 leading-relaxed mb-4 line-clamp-3">
          ${author.bio}
        </p>

        <div class="border-t border-slate-800/80 pt-3">
          <p class="text-[11px] font-semibold text-slate-400 mb-2">أبرز مؤلفاته:</p>
          <div class="flex flex-wrap gap-1.5">
            ${author.famousBooks.map(book => `
              <button 
                data-author-book="${book}"
                data-author-name="${author.name}"
                class="author-book-chip text-[11px] px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-emerald-500 hover:text-slate-950 text-slate-300 border border-slate-800 transition-all flex items-center gap-1">
                <i data-lucide="book" class="w-3 h-3 opacity-70"></i>
                <span>${book}</span>
              </button>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }).join('');

  // ربط نقرات كتب المؤلفين لتلخيصها مباشرة
  container.querySelectorAll('.author-book-chip').forEach(chip => {
    chip.addEventListener('click', (e) => {
      const book = e.currentTarget.getAttribute('data-author-book');
      const author = e.currentTarget.getAttribute('data-author-name');
      handleGenerateSummary(book, author);
    });
  });

  initIcons();
}

// رسم الملخصات المحفوظة
function renderSavedSummaries() {
  const container = document.getElementById('saved-grid');
  const countBadge = document.getElementById('saved-count');
  if (countBadge) countBadge.textContent = state.savedSummaries.length;

  if (!container) return;

  if (state.savedSummaries.length === 0) {
    container.innerHTML = `
      <div class="col-span-full py-16 text-center text-slate-400">
        <i data-lucide="bookmark" class="w-12 h-12 mx-auto mb-3 opacity-30"></i>
        <p class="text-lg font-bold text-white">لا توجد ملخصات محفوظة بعد</p>
        <p class="text-sm text-slate-500 mt-1">عندما تقرأ أي ملخص، اضغط على زر "حفظ في المفضلة" ليبقى محفوظاً هنا دائماً!</p>
      </div>
    `;
    initIcons();
    return;
  }

  container.innerHTML = state.savedSummaries.map((item, index) => {
    return `
      <div class="bg-slate-900/80 border border-slate-800 hover:border-emerald-500/40 rounded-2xl p-5 flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between gap-2 mb-2">
            <span class="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400">
              ${item.genre || 'كتاب'}
            </span>
            <button 
              data-delete-id="${item.id}"
              class="delete-saved-btn text-slate-500 hover:text-rose-400 transition-colors p-1"
              title="حذف من المحفوظات">
              <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
          </div>
          <h3 class="text-base font-bold text-white line-clamp-1 mb-1">${item.title}</h3>
          <p class="text-xs text-slate-400 mb-3">${item.author}</p>
          <p class="text-xs text-slate-300 line-clamp-2 leading-relaxed mb-4">
            ${item.oneSentencePitch || item.executiveSummary?.slice(0, 100) + '...'}
          </p>
        </div>
        
        <button 
          data-open-saved-index="${index}"
          class="open-saved-btn w-full py-2 px-3 rounded-xl text-xs font-bold bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 text-slate-200 transition-all flex items-center justify-center gap-1.5">
          <i data-lucide="book-open" class="w-3.5 h-3.5"></i>
          <span>فتح الملخص</span>
        </button>
      </div>
    `;
  }).join('');

  container.querySelectorAll('.delete-saved-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = e.currentTarget.getAttribute('data-delete-id');
      state.savedSummaries = state.savedSummaries.filter(s => s.id !== id);
      localStorage.setItem('saved_book_summaries', JSON.stringify(state.savedSummaries));
      renderSavedSummaries();
    });
  });

  container.querySelectorAll('.open-saved-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(e.currentTarget.getAttribute('data-open-saved-index'), 10);
      const summary = state.savedSummaries[idx];
      if (summary) {
        displaySummary(summary);
        switchTab('summary');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  });

  initIcons();
}

// توليد ملخص جديد ذكي مع قراءة فورية تدريجية (بدون انتظار المستخدم)
async function handleGenerateSummary(bookTitle, author = '') {
  if (!bookTitle || !bookTitle.trim()) {
    alert('يرجى إدخال اسم الكتاب أولاً.');
    return;
  }

  const cleanTitle = bookTitle.trim();
  const cleanAuthor = author ? author.trim() : '';

  // 1. الفحص الفوري: هل الكتاب متاح مسبقاً في النماذج الجاهزة؟ (0ms)
  const matchedKey = Object.keys(SAMPLE_SUMMARIES).find(k => {
    const s = SAMPLE_SUMMARIES[k];
    return s.title.toLowerCase().includes(cleanTitle.toLowerCase()) || 
           cleanTitle.toLowerCase().includes(s.title.toLowerCase()) ||
           k.toLowerCase() === cleanTitle.toLowerCase();
  });

  if (matchedKey && SAMPLE_SUMMARIES[matchedKey]) {
    displaySummary(SAMPLE_SUMMARIES[matchedKey]);
    switchTab('summary');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }

  // 2. التحويل الفوري إلى صفحة الملخص وعرض إضاءة قرائية من الثانية الأولى (0 ثانية انتظار!)
  switchTab('summary');
  stopSpeech();
  startProgressiveReading(cleanTitle, cleanAuthor);

  try {
    // 3. المرحلة الأولى: ملخص فوري وسريع للفكرة الجوهرية (يصل في 1.2 ثانية تقريباً)
    updateProgressiveBanner(30, 'جارٍ استخلاص الفكرة الجوهرية ومقدمة الكتاب...', 'اقرأ الإضاءة التأملية بينما نجهز الفكرة الجوهرية والملخص التمهيدي');

    let quickData = null;
    try {
      const quickRes = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookTitle: cleanTitle,
          author: cleanAuthor,
          mode: state.summaryMode,
          stage: 'quick',
          clientApiKey: state.apiKey
        })
      });
      if (quickRes.ok) {
        const qJson = await quickRes.json();
        if (qJson.success && qJson.summary) {
          quickData = qJson.summary;
        }
      }
    } catch (e) {
      console.warn('Quick serverless call failed, will proceed directly', e);
    }

    if (quickData) {
      // إظهار الفكرة الجوهرية والملخص التنفيذي فوراً ليبدأ القارئ بالقراءة الآن!
      displayQuickStage(quickData);
      updateProgressiveBanner(70, '📖 الفكرة الجوهرية جاهزة للقراءة الآن!', 'جاري استخراج الدروس المستفادة، الفصول، والاقتباسات بالخلفية...');
    }

    // 4. المرحلة الثانية: استكمال التحليل العميق والشامل بالخلفية دون مقاطعة القارئ
    let fullData = null;
    try {
      const fullRes = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookTitle: cleanTitle,
          author: cleanAuthor,
          mode: state.summaryMode,
          stage: 'full',
          clientApiKey: state.apiKey
        })
      });
      if (fullRes.ok) {
        const fJson = await fullRes.json();
        if (fJson.success && fJson.summary) {
          fullData = fJson.summary;
        }
      }
    } catch (e) {
      console.warn('Full serverless call failed, fallback to client', e);
    }

    if (!fullData) {
      fullData = await callGeminiDirectly(cleanTitle, cleanAuthor);
    }

    // عرض الأقسام العميقة المكتملة
    state.currentSummary = fullData;
    displaySummary(fullData);
    finishProgressiveReading();

  } catch (error) {
    console.error('Error generating summary:', error);
    showError(error.message || 'حدث خطأ أثناء الاتصال بالذكاء الاصطناعي. تأكد من صحة مفتاح Gemini API.');
  }
}

// بدء القراءة التدريجية الفورية من ثانية الصفر
function startProgressiveReading(title, author) {
  const container = document.getElementById('summary-content');
  const emptyState = document.getElementById('summary-empty');
  const errorState = document.getElementById('summary-error');
  const loadingEl = document.getElementById('summary-loading');
  const banner = document.getElementById('progressive-banner');
  const quoteCard = document.getElementById('instant-reading-card');

  if (emptyState) emptyState.classList.add('hidden');
  if (errorState) errorState.classList.add('hidden');
  if (loadingEl) loadingEl.classList.add('hidden');
  if (container) container.classList.remove('hidden');

  // تعبئة العنوان فوراً
  document.getElementById('sum-title').textContent = title;
  document.getElementById('sum-original-title').textContent = '';
  document.getElementById('sum-author').textContent = author || 'جاري التعرف على المؤلف...';
  document.getElementById('sum-genre').textContent = 'كتاب';
  document.getElementById('sum-year').textContent = '...';
  document.getElementById('sum-reading-time').textContent = '6 دقائق قراءة';
  document.getElementById('sum-rating').textContent = '4.8 / 5 ★';

  document.getElementById('sum-pitch').textContent = 'جارٍ تلخيص الفكرة الجوهرية للكتاب بواسطة Gemini AI...';
  document.getElementById('sum-executive').innerHTML = `
    <div class="space-y-2 py-4 animate-pulse">
      <div class="h-4 bg-slate-800 rounded-full w-full"></div>
      <div class="h-4 bg-slate-800 rounded-full w-5/6"></div>
      <div class="h-4 bg-slate-800 rounded-full w-4/6"></div>
    </div>
  `;

  // إخفاء الأقسام العميقة مؤقتاً لحين وصولها
  document.getElementById('sum-takeaways').innerHTML = `
    <div class="col-span-full py-6 text-center text-xs text-slate-500">
      <i data-lucide="sparkles" class="w-5 h-5 mx-auto mb-2 text-emerald-400 animate-spin"></i>
      <span>جاري استخراج الدروس المستفادة والأمثلة العملية بالخلفية...</span>
    </div>
  `;

  // عرض إضاءة تأملية واقتباس فوري من أول ثانية
  if (READING_WISDOM && READING_WISDOM.length > 0) {
    const randomWisdom = READING_WISDOM[Math.floor(Math.random() * READING_WISDOM.length)];
    const quoteText = document.getElementById('instant-quote-text');
    const quoteAuthor = document.getElementById('instant-quote-author');
    if (quoteText) quoteText.textContent = `"${randomWisdom.quote}"`;
    if (quoteAuthor) quoteAuthor.textContent = `— ${randomWisdom.author}`;
    quoteCard?.classList.remove('hidden');
  }

  // عرض شريط التقدم التفاعلي
  banner?.classList.remove('hidden');
  updateProgressiveBanner(20, 'جارٍ استدعاء نموذج Gemini 2.5 Flash...', 'اقرأ الإضاءة التأملية بينما يتم تحضير الفكرة الجوهرية والملخص التمهيدي');
  initIcons();
}

function updateProgressiveBanner(percent, title, desc) {
  const banner = document.getElementById('progressive-banner');
  const bar = document.getElementById('progressive-banner-bar');
  const percentEl = document.getElementById('progressive-banner-percent');
  const titleEl = document.getElementById('progressive-banner-title');
  const descEl = document.getElementById('progressive-banner-desc');

  if (banner) banner.classList.remove('hidden');
  if (bar) bar.style.width = `${percent}%`;
  if (percentEl) percentEl.textContent = `${percent}%`;
  if (titleEl) titleEl.textContent = title;
  if (descEl) descEl.textContent = desc;
}

// عرض المرحلة الأولى السريعة فور وصولها في ثانية واحدة
function displayQuickStage(quick) {
  if (quick.title) document.getElementById('sum-title').textContent = quick.title;
  if (quick.originalTitle) document.getElementById('sum-original-title').textContent = `(${quick.originalTitle})`;
  if (quick.author) document.getElementById('sum-author').textContent = quick.author;
  if (quick.genre) document.getElementById('sum-genre').textContent = quick.genre;
  if (quick.publishedYear) document.getElementById('sum-year').textContent = quick.publishedYear;
  if (quick.oneSentencePitch) document.getElementById('sum-pitch').textContent = `"${quick.oneSentencePitch}"`;

  if (quick.executiveSummary) {
    const execContainer = document.getElementById('sum-executive');
    execContainer.innerHTML = quick.executiveSummary
      .split('\n\n')
      .filter(p => p.trim())
      .map(p => `<p class="leading-relaxed text-slate-300 text-sm sm:text-base mb-3">${p}</p>`)
      .join('');
  }
}

// اكتمال التلخيص الشامل بنجاح
function finishProgressiveReading() {
  updateProgressiveBanner(100, '✓ اكتمل التلخيص الشامل بنجاح!', 'تم تجهيز كافة الدروس المستفادة والفصول والقارئ الصوتي.');
  setTimeout(() => {
    document.getElementById('progressive-banner')?.classList.add('hidden');
    document.getElementById('instant-reading-card')?.classList.add('hidden');
  }, 3500);
}

// طلب مباشر لـ Gemini REST API من المتصفح في حال العمل دون خادم
async function callGeminiDirectly(bookTitle, author) {
  const apiKey = state.apiKey.trim();
  if (!apiKey) {
    throw new Error('يرجى إدخال مفتاح Gemini API في إعدادات التطبيق للمتابعة، أو نشره على Vercel وضبط متغير GEMINI_API_KEY.');
  }

  const query = author ? `كتاب "${bookTitle}" للمؤلف "${author}"` : `كتاب "${bookTitle}"`;
  const systemPrompt = `أنت ناقد ومفكر أدبي وباحث خبير في تلخيص أمهات الكتب العالمية والعربية.
لخص المطلوب بدقة وأناقة باللغة العربية الفصحى على هيئة كائن JSON فقط:
{
  "id": "book-${Date.now()}",
  "title": "اسم الكتاب بالعربية",
  "originalTitle": "الاسم الأصلي إن وجد",
  "author": "اسم المؤلف",
  "genre": "التصنيف",
  "publishedYear": 2020,
  "rating": 4.8,
  "readingTimeMinutes": 6,
  "oneSentencePitch": "فكرة الكتاب في جملة واحدة مكثفة وبليغة",
  "executiveSummary": "ملخص تنفيذي عميق من 3 إلى 5 فقرات يشرح أطروحة الكتاب وفلسفته وأهميته",
  "keyTakeaways": [
    {
      "title": "عنوان الدرس المستفاد",
      "description": "شرح الدرس بعمق",
      "practicalExample": "تطبيق واقعي أو مثال من الحياة"
    }
  ],
  "coreChapters": [
    {
      "chapterTitle": "عنوان الفصل أو المحور",
      "summary": "تلخيص ما جاء فيه"
    }
  ],
  "authorBio": "نبذة ثرية عن المؤلف",
  "notableQuotes": [
    "اقتباس شهير 1",
    "اقتباس شهير 2"
  ],
  "targetAudience": {
    "recommendedFor": ["الفئة المستفيدة 1", "الفئة 2"],
    "notRecommendedFor": ["الفئة التي قد لا يناسبها"]
  },
  "actionableSteps": [
    "خطوة عملية 1",
    "خطوة عملية 2",
    "خطوة عملية 3"
  ]
}`;

  const userPrompt = `لخص: ${query}`;
  const models = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-flash-latest'];
  let lastErr = null;

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 4096,
            responseMimeType: 'application/json'
          }
        })
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson?.error?.message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) throw new Error('استجابة فارغة');

      let clean = rawText.trim();
      if (clean.startsWith('```json')) clean = clean.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      if (clean.startsWith('```')) clean = clean.replace(/^```\s*/, '').replace(/\s*```$/, '');

      return JSON.parse(clean);
    } catch (e) {
      lastErr = e;
    }
  }

  throw lastErr || new Error('فشلت جميع نماذج Gemini في الرد.');
}

// عرض بيانات الملخص في الواجهة
function displaySummary(summary) {
  state.currentSummary = summary;
  const container = document.getElementById('summary-content');
  const emptyState = document.getElementById('summary-empty');
  const errorState = document.getElementById('summary-error');

  if (emptyState) emptyState.classList.add('hidden');
  if (errorState) errorState.classList.add('hidden');
  if (container) container.classList.remove('hidden');

  // تعبئة البيانات الأساسية
  document.getElementById('sum-title').textContent = summary.title;
  document.getElementById('sum-original-title').textContent = summary.originalTitle ? `(${summary.originalTitle})` : '';
  document.getElementById('sum-author').textContent = summary.author;
  document.getElementById('sum-genre').textContent = summary.genre || 'عام';
  document.getElementById('sum-year').textContent = summary.publishedYear || 'غير محدد';
  document.getElementById('sum-reading-time').textContent = `${summary.readingTimeMinutes || 6} دقائق قراءة`;
  document.getElementById('sum-rating').textContent = `${summary.rating || 4.8} / 5 ★`;

  // الفكرة الجوهرية (One-Sentence Pitch)
  document.getElementById('sum-pitch').textContent = `"${summary.oneSentencePitch || ''}"`;

  // الملخص التنفيذي
  const execContainer = document.getElementById('sum-executive');
  execContainer.innerHTML = (summary.executiveSummary || '')
    .split('\n\n')
    .filter(p => p.trim())
    .map(p => `<p class="leading-relaxed text-slate-300 text-sm sm:text-base">${p}</p>`)
    .join('');

  // الدروس المستفادة (Key Takeaways)
  const takeawaysContainer = document.getElementById('sum-takeaways');
  takeawaysContainer.innerHTML = (summary.keyTakeaways || []).map((t, idx) => `
    <div class="bg-slate-950/60 border border-slate-800/90 hover:border-emerald-500/40 rounded-2xl p-5 transition-all">
      <div class="flex items-start gap-3">
        <span class="flex-shrink-0 w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-bold text-sm">
          ${idx + 1}
        </span>
        <div class="flex-1">
          <h4 class="text-base font-bold text-white mb-1.5">${t.title}</h4>
          <p class="text-xs sm:text-sm text-slate-300 leading-relaxed mb-3">${t.description}</p>
          ${t.practicalExample ? `
            <div class="bg-slate-900/90 rounded-xl p-3 border-r-2 border-emerald-500 text-xs text-slate-300">
              <span class="font-bold text-emerald-400">تطبيق عملي: </span>
              ${t.practicalExample}
            </div>
          ` : ''}
        </div>
      </div>
    </div>
  `).join('');

  // فصول ومحاور الكتاب
  const chaptersContainer = document.getElementById('sum-chapters');
  if (summary.coreChapters && summary.coreChapters.length > 0) {
    chaptersContainer.parentElement.classList.remove('hidden');
    chaptersContainer.innerHTML = summary.coreChapters.map((ch, idx) => `
      <div class="p-4 rounded-xl bg-slate-950/40 border border-slate-800/60">
        <h5 class="text-sm font-bold text-emerald-400 mb-1">${ch.chapterTitle}</h5>
        <p class="text-xs text-slate-300 leading-relaxed">${ch.summary}</p>
      </div>
    `).join('');
  } else {
    chaptersContainer.parentElement.classList.add('hidden');
  }

  // الاقتباسات الشهيرة
  const quotesContainer = document.getElementById('sum-quotes');
  quotesContainer.innerHTML = (summary.notableQuotes || []).map(q => `
    <blockquote class="relative p-4 rounded-2xl bg-slate-950/50 border-r-4 border-amber-500/80 text-xs sm:text-sm text-slate-200 italic font-serif">
      <i data-lucide="quote" class="w-4 h-4 text-amber-500/40 absolute top-3 left-3"></i>
      "${q}"
    </blockquote>
  `).join('');

  // نبذة المؤلف
  document.getElementById('sum-author-bio').textContent = summary.authorBio || 'لا توجد نبذة إضافية.';

  // خطوات قابلة للتطبيق (Actionable Steps)
  const stepsContainer = document.getElementById('sum-steps');
  stepsContainer.innerHTML = (summary.actionableSteps || []).map((step, idx) => `
    <li class="flex items-start gap-2.5 text-xs sm:text-sm text-slate-300">
      <i data-lucide="check-circle-2" class="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5"></i>
      <span>${step}</span>
    </li>
  `).join('');

  // الجمهور المستهدف
  const targetFor = document.getElementById('sum-target-for');
  const targetNot = document.getElementById('sum-target-not');

  targetFor.innerHTML = (summary.targetAudience?.recommendedFor || []).map(item => `
    <li class="flex items-center gap-2 text-xs text-slate-300">
      <i data-lucide="check" class="w-3.5 h-3.5 text-emerald-400 flex-shrink-0"></i>
      <span>${item}</span>
    </li>
  `).join('');

  if (summary.targetAudience?.notRecommendedFor && summary.targetAudience.notRecommendedFor.length > 0) {
    targetNot.parentElement.classList.remove('hidden');
    targetNot.innerHTML = summary.targetAudience.notRecommendedFor.map(item => `
      <li class="flex items-center gap-2 text-xs text-slate-400">
        <i data-lucide="x" class="w-3.5 h-3.5 text-rose-400 flex-shrink-0"></i>
        <span>${item}</span>
      </li>
    `).join('');
  } else {
    targetNot.parentElement.classList.add('hidden');
  }

  // تحديث حالة زر الحفظ في المفضلة
  updateBookmarkButton();

  initIcons();
}

// شاشة التحميل (Skeleton/Loader)
function showLoading(bookTitle) {
  const loadingEl = document.getElementById('summary-loading');
  const contentEl = document.getElementById('summary-content');
  const emptyEl = document.getElementById('summary-empty');
  const errorEl = document.getElementById('summary-error');
  const titleDisplay = document.getElementById('loading-book-name');

  if (titleDisplay) titleDisplay.textContent = `"${bookTitle}"`;
  if (loadingEl) loadingEl.classList.remove('hidden');
  if (contentEl) contentEl.classList.add('hidden');
  if (emptyEl) emptyEl.classList.add('hidden');
  if (errorEl) errorEl.classList.add('hidden');
}

function hideLoading() {
  const loadingEl = document.getElementById('summary-loading');
  if (loadingEl) loadingEl.classList.add('hidden');
}

function showError(msg) {
  const errorEl = document.getElementById('summary-error');
  const msgEl = document.getElementById('error-message-text');
  const contentEl = document.getElementById('summary-content');
  const loadingEl = document.getElementById('summary-loading');

  if (msgEl) msgEl.textContent = msg;
  if (errorEl) errorEl.classList.remove('hidden');
  if (contentEl) contentEl.classList.add('hidden');
  if (loadingEl) loadingEl.classList.add('hidden');
}

// القارئ الصوتي (Text-to-Speech)
function setupAudioPlayer() {
  const playBtn = document.getElementById('audio-play-btn');
  const pauseBtn = document.getElementById('audio-pause-btn');
  const stopBtn = document.getElementById('audio-stop-btn');
  const speedBtn = document.getElementById('audio-speed-btn');

  if (!window.speechSynthesis) {
    const audioBar = document.getElementById('audio-player-bar');
    if (audioBar) audioBar.classList.add('hidden');
    return;
  }

  playBtn?.addEventListener('click', () => {
    if (state.tts.isPaused) {
      window.speechSynthesis.resume();
      state.tts.isPaused = false;
      state.tts.isPlaying = true;
      toggleAudioButtons();
      return;
    }

    if (!state.currentSummary) return;

    // تجميع نص القراءة
    const textToRead = `
      تلخيص كتاب ${state.currentSummary.title}.
      للمؤلف ${state.currentSummary.author}.
      الفكرة الجوهرية: ${state.currentSummary.oneSentencePitch}.
      الملخص التنفيذي: ${state.currentSummary.executiveSummary}.
      أهم الدروس المستفادة:
      ${state.currentSummary.keyTakeaways?.map((t, i) => `الدرس ${i + 1}: ${t.title}. ${t.description}`).join('. ')}
    `;

    stopSpeech();

    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.lang = 'ar-SA';
    utterance.rate = state.tts.rate;

    // محاولة انتقاء صوت عربي لو توفر
    const voices = window.speechSynthesis.getVoices();
    const arabicVoice = voices.find(v => v.lang.startsWith('ar'));
    if (arabicVoice) utterance.voice = arabicVoice;

    utterance.onend = () => {
      state.tts.isPlaying = false;
      state.tts.isPaused = false;
      toggleAudioButtons();
    };

    utterance.onerror = () => {
      state.tts.isPlaying = false;
      state.tts.isPaused = false;
      toggleAudioButtons();
    };

    state.tts.utterance = utterance;
    window.speechSynthesis.speak(utterance);
    state.tts.isPlaying = true;
    state.tts.isPaused = false;
    toggleAudioButtons();
  });

  pauseBtn?.addEventListener('click', () => {
    if (state.tts.isPlaying) {
      window.speechSynthesis.pause();
      state.tts.isPlaying = false;
      state.tts.isPaused = true;
      toggleAudioButtons();
    }
  });

  stopBtn?.addEventListener('click', () => {
    stopSpeech();
    toggleAudioButtons();
  });

  speedBtn?.addEventListener('click', () => {
    const speeds = [1.0, 1.25, 1.5];
    const currentIdx = speeds.indexOf(state.tts.rate);
    const nextIdx = (currentIdx + 1) % speeds.length;
    state.tts.rate = speeds[nextIdx];
    speedBtn.textContent = `${state.tts.rate}x`;
    if (state.tts.isPlaying && state.tts.utterance) {
      // إعادة التشغيل بالسرعة الجديدة
      playBtn?.click();
    }
  });
}

function stopSpeech() {
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  state.tts.isPlaying = false;
  state.tts.isPaused = false;
  toggleAudioButtons();
}

function toggleAudioButtons() {
  const playBtn = document.getElementById('audio-play-btn');
  const pauseBtn = document.getElementById('audio-pause-btn');

  if (state.tts.isPlaying) {
    playBtn?.classList.add('hidden');
    pauseBtn?.classList.remove('hidden');
  } else {
    playBtn?.classList.remove('hidden');
    pauseBtn?.classList.add('hidden');
  }
}

// حفظ أو إزالة الكتاب من المفضلة
function toggleBookmarkCurrent() {
  if (!state.currentSummary) return;

  const id = state.currentSummary.id;
  const isAlreadySaved = state.savedSummaries.some(s => s.id === id);

  if (isAlreadySaved) {
    state.savedSummaries = state.savedSummaries.filter(s => s.id !== id);
  } else {
    state.savedSummaries.unshift(state.currentSummary);
  }

  localStorage.setItem('saved_book_summaries', JSON.stringify(state.savedSummaries));
  renderSavedSummaries();
  updateBookmarkButton();
}

function updateBookmarkButton() {
  const btn = document.getElementById('action-save-btn');
  if (!btn || !state.currentSummary) return;

  const isSaved = state.savedSummaries.some(s => s.id === state.currentSummary.id);
  const textSpan = btn.querySelector('span');
  const icon = btn.querySelector('i');

  if (isSaved) {
    btn.className = 'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20';
    if (textSpan) textSpan.textContent = 'محفوظ بالمفضلة ✓';
  } else {
    btn.className = 'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700';
    if (textSpan) textSpan.textContent = 'حفظ في المفضلة';
  }
  initIcons();
}

// نسخ الملخص كـ Markdown
function copySummaryMarkdown() {
  if (!state.currentSummary) return;
  const s = state.currentSummary;

  const md = `
# ملخص كتاب: ${s.title}
**المؤلف:** ${s.author} | **التصنيف:** ${s.genre} | **سنة النشر:** ${s.publishedYear || 'غير محدد'}

> "${s.oneSentencePitch}"

## الملخص التنفيذي
${s.executiveSummary}

## أهم الدروس المستفادة:
${(s.keyTakeaways || []).map((t, i) => `### ${i + 1}. ${t.title}\n${t.description}\n*تطبيق عملي:* ${t.practicalExample || 'تطبيق في الحياة اليومية'}\n`).join('\n')}

## اقتباسات بارزة:
${(s.notableQuotes || []).map(q => `> "${q}"`).join('\n\n')}

## خطوات تطبيقية للبدء:
${(s.actionableSteps || []).map((st, i) => `${i + 1}. ${st}`).join('\n')}

---
*تم توليد هذا الملخص بواسطة تطبيق خُلاصة الكتب (Gemini AI)*
  `.trim();

  navigator.clipboard.writeText(md).then(() => {
    const copyBtn = document.getElementById('action-copy-btn');
    const oldText = copyBtn.innerHTML;
    copyBtn.innerHTML = '<i data-lucide="check" class="w-4 h-4 text-emerald-400"></i><span>تم النسخ بنجاح!</span>';
    initIcons();
    setTimeout(() => {
      copyBtn.innerHTML = oldText;
      initIcons();
    }, 2000);
  });
}

// التبديل بين التبويبات
function switchTab(tabName) {
  state.currentTab = tabName;

  const tabs = ['search', 'summary', 'explore-books', 'explore-authors', 'saved'];
  tabs.forEach(t => {
    const section = document.getElementById(`tab-${t}`);
    if (section) {
      if (t === tabName) {
        section.classList.remove('hidden');
      } else {
        section.classList.add('hidden');
      }
    }
  });

  // تحديث أزرار النافبار
  document.querySelectorAll('[data-nav-tab]').forEach(btn => {
    const target = btn.getAttribute('data-nav-tab');
    if (target === tabName || (target === 'search' && tabName === 'summary')) {
      btn.classList.add('bg-emerald-500', 'text-slate-950');
      btn.classList.remove('text-slate-300', 'hover:bg-slate-800/50');
    } else {
      btn.classList.remove('bg-emerald-500', 'text-slate-950');
      btn.classList.add('text-slate-300');
    }
  });

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ضبط جميع مستمعي الأحداث
function setupEventListeners() {
  // أزرار التنقل (Navbar)
  document.querySelectorAll('[data-nav-tab]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const tab = e.currentTarget.getAttribute('data-nav-tab');
      switchTab(tab);
    });
  });

  // نموذج البحث والتوليد الرئيسي
  const mainSearchForm = document.getElementById('main-search-form');
  const mainSearchInput = document.getElementById('main-search-input');

  mainSearchForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const val = mainSearchInput?.value?.trim();
    if (val) {
      handleGenerateSummary(val);
    }
  });

  // أزرار الاقتراحات السريعة (Quick chips)
  document.querySelectorAll('.quick-book-chip').forEach(chip => {
    chip.addEventListener('click', (e) => {
      const title = e.currentTarget.getAttribute('data-title');
      const author = e.currentTarget.getAttribute('data-author');
      if (mainSearchInput) mainSearchInput.value = title;
      handleGenerateSummary(title, author);
    });
  });

  // بحث قائمة الكتب
  const bookSearchInput = document.getElementById('books-search-input');
  bookSearchInput?.addEventListener('input', (e) => {
    state.searchQuery = e.target.value;
    renderCuratedBooks();
  });

  // بحث قائمة المؤلفين
  const authorSearchInput = document.getElementById('authors-search-input');
  authorSearchInput?.addEventListener('input', (e) => {
    state.authorSearchQuery = e.target.value;
    renderCuratedAuthors();
  });

  // تبديل عمق التلخيص (Comprehensive / Concise / Executive)
  document.querySelectorAll('.mode-selector-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.mode-selector-btn').forEach(b => {
        b.classList.remove('bg-emerald-500', 'text-slate-950');
        b.classList.add('text-slate-400');
      });
      e.currentTarget.classList.add('bg-emerald-500', 'text-slate-950');
      e.currentTarget.classList.remove('text-slate-400');
      state.summaryMode = e.currentTarget.getAttribute('data-mode');
    });
  });

  // أزرار الإجراءات داخل صفحة الملخص
  document.getElementById('action-save-btn')?.addEventListener('click', toggleBookmarkCurrent);
  document.getElementById('action-copy-btn')?.addEventListener('click', copySummaryMarkdown);
  document.getElementById('action-print-btn')?.addEventListener('click', () => window.print());

  // مودال مفتاح Gemini API
  const apiKeyModal = document.getElementById('api-key-modal');
  const openApiKeyBtns = document.querySelectorAll('.open-api-key-modal-btn');
  const closeApiKeyBtn = document.getElementById('close-api-key-modal');
  const saveApiKeyBtn = document.getElementById('save-api-key-btn');
  const testApiKeyBtn = document.getElementById('test-api-key-btn');
  const apiKeyInput = document.getElementById('api-key-input');
  const apiKeyTestStatus = document.getElementById('api-key-test-status');

  openApiKeyBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (apiKeyInput) apiKeyInput.value = state.apiKey;
      if (apiKeyTestStatus) apiKeyTestStatus.classList.add('hidden');
      apiKeyModal?.classList.remove('hidden');
    });
  });

  closeApiKeyBtn?.addEventListener('click', () => {
    apiKeyModal?.classList.add('hidden');
  });

  apiKeyModal?.addEventListener('click', (e) => {
    if (e.target === apiKeyModal) {
      apiKeyModal.classList.add('hidden');
    }
  });

  saveApiKeyBtn?.addEventListener('click', () => {
    const key = apiKeyInput?.value?.trim() || '';
    state.apiKey = key;
    localStorage.setItem('gemini_api_key', key);
    updateApiKeyBadge();
    apiKeyModal?.classList.add('hidden');
  });

  testApiKeyBtn?.addEventListener('click', async () => {
    const key = apiKeyInput?.value?.trim();
    if (!key) {
      alert('يرجى كتابة المفتاح أولاً للاختبار.');
      return;
    }
    testApiKeyBtn.disabled = true;
    testApiKeyBtn.textContent = 'جارٍ الفحص...';

    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'ping' }] }],
          generationConfig: { maxOutputTokens: 5 }
        })
      });

      if (res.ok) {
        apiKeyTestStatus.className = 'mt-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold';
        apiKeyTestStatus.textContent = '✓ المفتاح يعمل بنجاح وجاهز للاستخدام!';
        apiKeyTestStatus.classList.remove('hidden');
      } else {
        apiKeyTestStatus.className = 'mt-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold';
        apiKeyTestStatus.textContent = '✕ المفتاح غير صالح أو انتهت صلاحيته.';
        apiKeyTestStatus.classList.remove('hidden');
      }
    } catch (err) {
      apiKeyTestStatus.className = 'mt-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold';
      apiKeyTestStatus.textContent = '✕ تعذر الاتصال بـ Google Gemini. تحقق من الشبكة.';
      apiKeyTestStatus.classList.remove('hidden');
    } finally {
      testApiKeyBtn.disabled = false;
      testApiKeyBtn.textContent = 'فحص المفتاح';
    }
  });

  // مودال النشر على GitHub و Vercel
  const deployModal = document.getElementById('deploy-modal');
  const openDeployBtns = document.querySelectorAll('.open-deploy-modal-btn');
  const closeDeployBtn = document.getElementById('close-deploy-modal');

  openDeployBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      deployModal?.classList.remove('hidden');
    });
  });

  closeDeployBtn?.addEventListener('click', () => {
    deployModal?.classList.add('hidden');
  });

  deployModal?.addEventListener('click', (e) => {
    if (e.target === deployModal) {
      deployModal.classList.add('hidden');
    }
  });

  // تهيئة مشغل الصوت
  setupAudioPlayer();
}

// جعل بعض الدوال متاحة عامة
window.app = {
  switchTab,
  handleGenerateSummary
};
