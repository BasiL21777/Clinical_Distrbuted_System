FROM python:3.12-slim

# تحديد مجلد العمل داخل الحاوية
WORKDIR /app

# 1. نسخ ملف المتطلبات أولاً (للاستفادة من الـ Cache)
# بما أننا داخل مجلد auth-service، المسار سيكون مباشرًا
COPY requirements.txt .

# تثبيت المكتبات
RUN pip install --no-cache-dir -r requirements.txt

# 2. نسخ كل محتويات مجلد auth-service إلى مجلد /app في الحاوية
# سيقوم بنسخ مجلد app و alembic و main.py وغيرها
COPY . .

# تشغيل السيرفر
# لاحظ أننا نستخدم "app.main:app" لأن مجلد app أصبح الآن تحت /app مباشرة
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]