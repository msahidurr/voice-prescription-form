# Android API Integration Guide

This document provides complete integration instructions for the voice-to-text and text-to-JSON APIs designed for Android applications.

## Overview

Two complementary REST APIs convert prescription data:
1. **Voice-to-Text API** - Converts audio (file or stream) to text transcript
2. **Text-to-JSON API** - Parses prescription text to structured JSON

Both endpoints require API key authentication and return prescription data in a standardized format.

---

## Authentication

All API endpoints require an `X-API-Key` header with a valid API key.

**Environment Variable:** `PRESCRIPTION_API_KEY`

### Example Header
```
X-API-Key: your-api-key-here
```

**Error Response** (401 Unauthorized):
```json
{
  "error": "API key missing. Please provide X-API-Key header."
}
```

---

## API Endpoints

### 1. Voice-to-Text API

**Endpoint:** `POST /api/voice-to-text`

Converts audio input to text transcript. Supports three input methods:

#### a) File Upload (Multipart Form Data)

Send an audio file using multipart/form-data.

**Request:**
```bash
curl -X POST http://localhost:3000/api/voice-to-text \
  -H "X-API-Key: your-api-key" \
  -F "audio=@audio.mp3"
```

**Android Example (Kotlin):**
```kotlin
import okhttp3.*
import java.io.File

fun uploadAudioFile(apiKey: String, audioFile: File) {
    val client = OkHttpClient()
    
    val requestBody = MultipartBody.Builder()
        .setType(MultipartBody.FORM)
        .addFormDataPart(
            "audio",
            audioFile.name,
            RequestBody.create(MediaType.parse("audio/mpeg"), audioFile)
        )
        .build()
    
    val request = Request.Builder()
        .url("http://your-server.com/api/voice-to-text")
        .header("X-API-Key", apiKey)
        .post(requestBody)
        .build()
    
    client.newCall(request).execute().use { response ->
        if (response.isSuccessful) {
            val json = response.body()?.string()
            // Parse: { "transcript": "patient name is john..." }
            println("Transcript: $json")
        } else {
            println("Error: ${response.code()}")
        }
    }
}
```

**Response** (200 OK):
```json
{
  "transcript": "patient name is john doe age 35 diagnosed with hypertension..."
}
```

#### b) Audio Stream (Chunked Upload)

Send audio data as a continuous stream.

**Request:**
```bash
# Read audio file and send as stream
curl -X POST http://localhost:3000/api/voice-to-text \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/octet-stream" \
  --data-binary "@audio.mp3"
```

**Android Example (Kotlin):**
```kotlin
fun streamAudio(apiKey: String, audioFile: File) {
    val client = OkHttpClient()
    
    val requestBody = RequestBody.create(
        MediaType.parse("application/octet-stream"),
        audioFile
    )
    
    val request = Request.Builder()
        .url("http://your-server.com/api/voice-to-text")
        .header("X-API-Key", apiKey)
        .post(requestBody)
        .build()
    
    client.newCall(request).execute().use { response ->
        if (response.isSuccessful) {
            val json = response.body()?.string()
            println("Transcript: $json")
        }
    }
}
```

#### c) Base64 Encoded Audio (JSON)

Send audio as base64 string in JSON body.

**Request:**
```bash
curl -X POST http://localhost:3000/api/voice-to-text \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"audio":"SUQzBAAAAAAAI1NTVQAAAAAPAAADTGF2ZjU4LjI5LjEwMAAAAAAAAAAAAAAA//NkxAA...=="}'
```

**Android Example (Kotlin):**
```kotlin
import android.util.Base64
import okhttp3.*
import org.json.JSONObject
import java.io.File

fun sendBase64Audio(apiKey: String, audioFile: File) {
    val client = OkHttpClient()
    
    // Read file and convert to base64
    val fileBytes = audioFile.readBytes()
    val base64Audio = Base64.encodeToString(fileBytes, Base64.DEFAULT)
    
    val jsonBody = JSONObject().apply {
        put("audio", base64Audio)
    }
    
    val requestBody = RequestBody.create(
        MediaType.parse("application/json"),
        jsonBody.toString()
    )
    
    val request = Request.Builder()
        .url("http://your-server.com/api/voice-to-text")
        .header("X-API-Key", apiKey)
        .post(requestBody)
        .build()
    
    client.newCall(request).execute().use { response ->
        if (response.isSuccessful) {
            val json = response.body()?.string()
            println("Transcript: $json")
        }
    }
}
```

**Supported Audio Formats:**
- MP3 (audio/mpeg)
- MP4/M4A (audio/mp4)
- WAV (audio/wav)
- WebM (audio/webm)
- OGG (audio/ogg)

**Constraints:**
- Maximum file size: 25 MB
- Stream timeout: 30 seconds of inactivity
- Maximum stream duration: 5 minutes

**Error Responses:**
```json
// 400 Bad Request - Invalid format
{
  "error": "Unsupported audio format: application/json. Supported formats: MP3, MP4, WAV, WebM"
}

// 413 Payload Too Large - File exceeds 25MB
{
  "error": "Audio file exceeds maximum size of 25MB"
}

// 500 Internal Server Error
{
  "error": "Failed to process audio file"
}
```

---

### 2. Text-to-JSON API

**Endpoint:** `POST /api/text-to-json`

Parses prescription text into structured JSON.

**Request:**
```bash
curl -X POST http://localhost:3000/api/text-to-json \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Patient name is John Doe, age 35, male. Diagnosed with hypertension. BP 140/90. Prescribed Lisinopril 10mg 1+0+1 for 30 days."
  }'
```

**Android Example (Kotlin):**
```kotlin
import okhttp3.*
import org.json.JSONObject
import kotlinx.coroutines.*

suspend fun parseTextToPrescription(apiKey: String, transcript: String) {
    val client = OkHttpClient()
    
    val jsonBody = JSONObject().apply {
        put("text", transcript)
    }
    
    val requestBody = RequestBody.create(
        MediaType.parse("application/json"),
        jsonBody.toString()
    )
    
    val request = Request.Builder()
        .url("http://your-server.com/api/text-to-json")
        .header("X-API-Key", apiKey)
        .header("Content-Type", "application/json")
        .post(requestBody)
        .build()
    
    withContext(Dispatchers.IO) {
        client.newCall(request).execute().use { response ->
            if (response.isSuccessful) {
                val json = response.body()?.string()
                val result = JSONObject(json)
                val prescription = result.getJSONObject("prescription")
                
                // Handle prescription data
                val patientName = prescription.optString("patientName")
                val medicines = prescription.optJSONArray("medicines")
                println("Patient: $patientName")
                println("Medicines: $medicines")
            } else {
                println("Error: ${response.code()}")
                println("Message: ${response.body()?.string()}")
            }
        }
    }
}
```

**Response** (200 OK):
```json
{
  "prescription": {
    "patientName": "John Doe",
    "age": "35",
    "sex": "male",
    "date": "16/5/2026",
    "doctorName": null,
    "doctorQualification": null,
    "doctorRegNo": null,
    "vitals": {
      "height": null,
      "weight": null,
      "temperature": null,
      "bloodPressure": "140/90",
      "pulse": null,
      "spo2": null
    },
    "chiefComplaints": [],
    "chronicDiseases": [],
    "allergies": [],
    "investigations": [],
    "diagnosis": ["hypertension"],
    "medicines": [
      {
        "name": "Lisinopril 10mg",
        "dosage": "10mg",
        "frequency": "1+0+1",
        "duration": "30 days",
        "instructions": null
      }
    ],
    "advice": []
  }
}
```

**Request Constraints:**
- Text length: 10 - 2000 characters
- Content-Type: `application/json`

**Error Responses:**
```json
// 400 Bad Request - Missing field
{
  "error": "Missing required field: \"text\""
}

// 422 Unprocessable Entity - Invalid format
{
  "error": "Text must be at least 10 characters"
}

// 422 Unprocessable Entity - Parse failure
{
  "error": "Failed to parse prescription. The transcript may not contain valid prescription data."
}

// 401 Unauthorized
{
  "error": "Invalid API key"
}
```

---

## Combined Workflow

### Voice → Text → JSON Pipeline

Process audio and automatically convert to structured prescription:

**Android Example (Kotlin):**
```kotlin
import kotlinx.coroutines.*
import java.io.File

class PrescriptionProcessor(private val apiKey: String, private val baseUrl: String) {
    
    suspend fun processAudioFile(audioFile: File): Result<JSONObject> = withContext(Dispatchers.IO) {
        try {
            // Step 1: Convert audio to text
            val transcript = uploadAudioFile(audioFile)
            println("Transcript: $transcript")
            
            // Step 2: Parse text to prescription JSON
            val prescription = parseTranscriptToJson(transcript)
            println("Prescription: $prescription")
            
            Result.success(prescription)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    private fun uploadAudioFile(audioFile: File): String {
        val client = OkHttpClient()
        
        val requestBody = MultipartBody.Builder()
            .setType(MultipartBody.FORM)
            .addFormDataPart(
                "audio",
                audioFile.name,
                RequestBody.create(MediaType.parse("audio/mpeg"), audioFile)
            )
            .build()
        
        val request = Request.Builder()
            .url("$baseUrl/api/voice-to-text")
            .header("X-API-Key", apiKey)
            .post(requestBody)
            .build()
        
        return client.newCall(request).execute().use { response ->
            if (response.isSuccessful) {
                val json = JSONObject(response.body()?.string() ?: "{}")
                json.getString("transcript")
            } else {
                throw Exception("Voice-to-text failed: ${response.code()}")
            }
        }
    }
    
    private fun parseTranscriptToJson(transcript: String): JSONObject {
        val client = OkHttpClient()
        
        val jsonBody = JSONObject().apply {
            put("text", transcript)
        }
        
        val requestBody = RequestBody.create(
            MediaType.parse("application/json"),
            jsonBody.toString()
        )
        
        val request = Request.Builder()
            .url("$baseUrl/api/text-to-json")
            .header("X-API-Key", apiKey)
            .header("Content-Type", "application/json")
            .post(requestBody)
            .build()
        
        return client.newCall(request).execute().use { response ->
            if (response.isSuccessful) {
                val json = JSONObject(response.body()?.string() ?: "{}")
                json.getJSONObject("prescription")
            } else {
                throw Exception("Text-to-JSON failed: ${response.code()}")
            }
        }
    }
}

// Usage
val processor = PrescriptionProcessor(
    apiKey = "your-api-key",
    baseUrl = "http://your-server.com"
)

val result = processor.processAudioFile(File("/path/to/audio.mp3"))
result.onSuccess { prescription ->
    println("Success: $prescription")
}.onFailure { error ->
    println("Error: ${error.message}")
}
```

---

## Error Handling

### Common HTTP Status Codes

| Status | Meaning | Cause |
|--------|---------|-------|
| 200 | OK | Request successful |
| 400 | Bad Request | Invalid input (missing field, empty data) |
| 401 | Unauthorized | Missing or invalid API key |
| 413 | Payload Too Large | Audio exceeds 25MB |
| 422 | Unprocessable Entity | Content cannot be parsed |
| 500 | Internal Server Error | Server error during processing |

### Retry Strategy

Implement exponential backoff for transient failures:

```kotlin
suspend fun <T> retryWithBackoff(
    maxAttempts: Int = 3,
    delayMs: Long = 100,
    block: suspend () -> T
): T {
    var lastException: Exception? = null
    
    repeat(maxAttempts) { attempt ->
        try {
            return block()
        } catch (e: Exception) {
            lastException = e
            if (attempt < maxAttempts - 1) {
                delay(delayMs * (2 to the power of attempt))
            }
        }
    }
    
    throw lastException ?: Exception("Max retries exceeded")
}

// Usage
val transcript = retryWithBackoff {
    uploadAudioFile(audioFile)
}
```

---

## Environment Setup

### Server Configuration

Create `.env.local` (or configure via environment variables):

```bash
# Required: API Key for authentication
PRESCRIPTION_API_KEY=your-secret-api-key-here

# Required: Azure OpenAI configuration for Whisper
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_KEY=your-azure-openai-key

# Required: Azure OpenAI configuration for LLM (text-to-json)
# Should be the same as above if using same Azure instance
```

### Android Configuration

Add to `AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
```

Add OkHttp dependency to `build.gradle.kts`:

```kotlin
dependencies {
    implementation("com.squareup.okhttp3:okhttp:4.11.0")
}
```

---

## Testing

### Using cURL

**Test Voice-to-Text with file:**
```bash
curl -X POST http://localhost:3000/api/voice-to-text \
  -H "X-API-Key: test-key-123" \
  -F "audio=@sample.mp3" \
  -v
```

**Test Text-to-JSON:**
```bash
curl -X POST http://localhost:3000/api/text-to-json \
  -H "X-API-Key: test-key-123" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Patient: John, Age: 30, Diagnosed with fever. Prescribed paracetamol 500mg 1+1+1."
  }' \
  -v
```

### Using Postman

1. Import the API endpoints into Postman
2. Set `X-API-Key` header in "Headers" tab
3. For voice-to-text: Use "form-data" and upload audio file to "audio" field
4. For text-to-json: Use "raw" JSON body with "text" field
5. Send requests and inspect responses

---

## Rate Limiting

Currently no rate limiting is implemented. For production, consider:
- Implementing request throttling per API key
- Setting timeouts for long-running transcriptions
- Using job queues for batch processing

---

## Support

For issues or questions:
1. Check this documentation
2. Review error response messages
3. Check server logs for debugging
4. Verify Azure OpenAI credentials are configured

---

## Version History

### v1.0.0 (Current)
- Voice-to-text API with file upload, streaming, and base64 support
- Text-to-JSON API for prescription parsing
- API key authentication
- Full Android integration examples
