# Prescription API - Quick Reference

## Quick Start

### 1. Get API Key
Set `PRESCRIPTION_API_KEY` environment variable on your server.

### 2. Voice → Text → JSON (Android Example)

```kotlin
// 1. Record audio file
val audioFile: File = recordAudio() // Your recording method

// 2. Convert to transcript
val response1 = httpClient.post("https://your-server/api/voice-to-text") {
    header("X-API-Key", "your-api-key")
    body = MultipartBody.Builder()
        .addFormDataPart("audio", audioFile.name, audioFile)
        .build()
}
val transcript = response1.getJSONObject("transcript")

// 3. Parse to prescription
val response2 = httpClient.post("https://your-server/api/text-to-json") {
    header("X-API-Key", "your-api-key")
    body = JSONObject().apply { put("text", transcript) }.toString()
}
val prescription = response2.getJSONObject("prescription")

// Use prescription data
val patientName = prescription.getString("patientName")
val medicines = prescription.getJSONArray("medicines")
```

---

## API Endpoints

### POST /api/voice-to-text
Converts audio to text transcript.

**Input Methods:**
1. **Multipart Form** (File upload)
   ```
   POST /api/voice-to-text
   Content-Type: multipart/form-data
   X-API-Key: your-key
   
   [audio file in 'audio' field]
   ```

2. **Stream** (Raw audio bytes)
   ```
   POST /api/voice-to-text
   Content-Type: application/octet-stream
   X-API-Key: your-key
   
   [raw audio bytes]
   ```

3. **Base64** (JSON)
   ```
   POST /api/voice-to-text
   Content-Type: application/json
   X-API-Key: your-key
   
   {"audio": "base64_encoded_audio"}
   ```

**Response (200):**
```json
{
  "transcript": "patient name is john doe..."
}
```

**Errors:**
- `400` - Invalid format or missing file
- `401` - Invalid API key
- `413` - Audio too large (>25MB)

---

### POST /api/text-to-json
Parses text to structured prescription JSON.

**Request:**
```json
{
  "text": "Patient name is John, age 35. Prescribed paracetamol 500mg."
}
```

**Response (200):**
```json
{
  "prescription": {
    "patientName": "John",
    "age": "35",
    "date": "16/5/2026",
    "medicines": [
      {
        "name": "paracetamol 500mg",
        "dosage": "500mg",
        "frequency": "1+1+1",
        "duration": "3 days",
        "instructions": null
      }
    ],
    "diagnosis": [],
    "advice": [],
    "allergies": [],
    "vitals": {},
    ...
  }
}
```

**Errors:**
- `400` - Missing 'text' field
- `401` - Invalid API key
- `422` - Text too short, too long, or unparseable

---

## Supported Audio Formats

| Format | MIME Type | Extension |
|--------|-----------|-----------|
| MP3 | audio/mpeg | .mp3 |
| WAV | audio/wav | .wav |
| M4A | audio/mp4 | .m4a |
| WebM | audio/webm | .webm |
| OGG | audio/ogg | .ogg |

**Constraints:**
- Max size: 25 MB
- Max stream duration: 5 minutes
- Stream timeout: 30 seconds

---

## Authentication

All endpoints require this header:
```
X-API-Key: your-api-key-value
```

Set on server: `PRESCRIPTION_API_KEY=your-api-key-value`

---

## Prescription Data Structure

```json
{
  "patientName": "string",
  "age": "string",
  "sex": "string",
  "date": "string",
  "doctorName": "string",
  "doctorQualification": "string",
  "doctorRegNo": "string",
  "vitals": {
    "height": "string",
    "weight": "string",
    "temperature": "string",
    "bloodPressure": "string",
    "pulse": "string",
    "spo2": "string"
  },
  "chiefComplaints": ["string"],
  "chronicDiseases": ["string"],
  "allergies": ["string"],
  "investigations": ["string"],
  "diagnosis": ["string"],
  "medicines": [
    {
      "name": "string",
      "dosage": "string",
      "frequency": "string (e.g., 1+0+1, 1+1+1)",
      "duration": "string",
      "instructions": "string"
    }
  ],
  "advice": ["string"]
}
```

---

## Common Errors & Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| "API key missing" | No X-API-Key header | Add header: `X-API-Key: your-key` |
| "Invalid API key" | Wrong key | Check environment variable |
| "Audio file exceeds max size" | File >25MB | Use smaller audio file |
| "Unsupported audio format" | Invalid MIME type | Use MP3, WAV, M4A, or WebM |
| "Text too short" | <10 characters | Provide longer text |
| "Failed to parse prescription" | Invalid prescription data | Ensure text contains prescription info |

---

## Testing with cURL

### Test Voice-to-Text
```bash
curl -X POST http://localhost:3000/api/voice-to-text \
  -H "X-API-Key: test-key" \
  -F "audio=@sample.mp3"
```

### Test Text-to-JSON
```bash
curl -X POST http://localhost:3000/api/text-to-json \
  -H "X-API-Key: test-key" \
  -H "Content-Type: application/json" \
  -d '{"text":"Patient John age 30. Fever. Paracetamol 500mg 1+1+1"}'
```

---

## Android Setup

### Dependencies
```kotlin
// build.gradle.kts
dependencies {
    implementation("com.squareup.okhttp3:okhttp:4.11.0")
    implementation("org.json:json:20231013")
}
```

### Permissions
```xml
<!-- AndroidManifest.xml -->
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
```

### Basic Usage
```kotlin
val audioFile = File(cacheDir, "prescription.mp3")

// Upload audio
val multipart = MultipartBody.Builder()
    .addFormDataPart("audio", audioFile.name, audioFile)
    .build()

val request = Request.Builder()
    .url("https://your-server/api/voice-to-text")
    .header("X-API-Key", "your-key")
    .post(multipart)
    .build()

OkHttpClient().newCall(request).execute().use { response ->
    if (response.isSuccessful) {
        val json = JSONObject(response.body?.string() ?: "{}")
        val transcript = json.getString("transcript")
    }
}
```

---

## Limits & Best Practices

- **Rate limiting:** Implement client-side throttling
- **Timeouts:** Set 60-second timeout for audio processing
- **Retry logic:** Exponential backoff (100ms, 200ms, 400ms)
- **Batch processing:** Process one audio at a time
- **Error handling:** Catch and log all API errors
- **Validation:** Validate audio file before upload
- **Caching:** Cache transcripts to avoid re-processing

---

## Environment Variables

```bash
# Required
PRESCRIPTION_API_KEY=your-secret-key

# Required for Whisper (voice-to-text)
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_KEY=your-azure-key

# Optional: If using different Azure instance
# AZURE_OPENAI_WHISPER_ENDPOINT=...
# AZURE_OPENAI_WHISPER_KEY=...
```

---

## More Information

- Full documentation: See `ANDROID_API_INTEGRATION.md`
- Kotlin helper code: See `android_helper_code.kt`
