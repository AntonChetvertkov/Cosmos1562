# Используем официальный Python-образ
FROM python:3.12-slim

# Задаем рабочую папку
WORKDIR /

# Копируем файл с указанием библиотек и их версий
COPY requirements.txt .

# Устанавливаем зависимости
RUN pip install -r requirements.txt

# Копируем код приложения
COPY . .

EXPOSE 5000

# Команда для запуска проекта
CMD ["python", "main.py"]