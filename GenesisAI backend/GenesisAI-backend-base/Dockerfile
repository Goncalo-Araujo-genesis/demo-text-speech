FROM python:3.12-slim

# Install system dependencies including ffmpeg
#RUN apk add --no-cache ffmpeg
RUN apt-get update && apt-get install -y ffmpeg

RUN pip install --no-cache-dir --upgrade pip

WORKDIR /app

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

RUN pip install gunicorn

COPY . .

EXPOSE 8000

# CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:8000", "app:app"]
CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:8000", "--timeout", "120", "app:app"]