@echo off
chcp 65001 >nul
echo ===================================================
echo 🚀 رفع مشروع خلاصة الكتب إلى GitHub
echo ===================================================
echo.

git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [خطأ] لم يتم العثور على Git مثبت في جهازك.
    pause
    exit /b
)

if not exist .git (
    echo [*] تهيئة مستودع Git محلي...
    git init
    git branch -M main
)

echo [*] إضافة الملفات...
git add .

echo [*] حفظ التعديلات (Commit)...
git commit -m "feat: complete book briefing app with Gemini AI and Vercel support"

echo.
echo يرجى نسخ ولصق رابط مستودع GitHub الخاص بك (مثال: https://github.com/username/book-briefing.git):
set /p REPO_URL="رابط المستودع: "

if "%REPO_URL%"=="" (
    echo لم يتم إدخال رابط، تم إلغاء عملية الرفع.
    pause
    exit /b
)

git remote remove origin >nul 2>&1
git remote add origin %REPO_URL%

echo [*] جارٍ الرفع إلى GitHub...
git push -u origin main

if %errorlevel% equ 0 (
    echo.
    echo ===================================================
    echo ✅ تم رفع المشروع بنجاح إلى GitHub!
    echo الآن توجه إلى https://vercel.com واضغط Import لنشره والحصول على الرابط.
    echo ===================================================
) else (
    echo.
    echo [!] حدث خطأ أثناء الرفع، تأكد من صحة الرابط وصلاحيات الحساب.
)

pause
