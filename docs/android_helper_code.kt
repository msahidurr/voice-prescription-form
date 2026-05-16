/**
 * Android Helper Code for Prescription API Integration
 * Copy and adapt these utilities into your Android project
 */

package com.example.prescription.api

import android.util.Base64
import kotlinx.coroutines.*
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.io.File
import java.io.IOException

/**
 * Prescription API Client
 * Handles all communication with voice-to-text and text-to-json APIs
 */
class PrescriptionApiClient(
    private val baseUrl: String,
    private val apiKey: String,
    private val httpClient: OkHttpClient = OkHttpClient()
) {
    
    // Response data classes
    data class TranscriptResponse(
        val transcript: String
    )
    
    data class PrescriptionResponse(
        val prescription: Map<String, Any?>
    )
    
    /**
     * Upload audio file and get transcript
     * Supports: MP3, WAV, M4A, WebM
     */
    suspend fun voiceToText(audioFile: File): Result<String> = withContext(Dispatchers.IO) {
        try {
            require(audioFile.exists()) { "Audio file not found: ${audioFile.path}" }
            require(audioFile.length() > 0) { "Audio file is empty" }
            require(audioFile.length() <= 25 * 1024 * 1024) { "Audio file exceeds 25MB limit" }
            
            val requestBody = MultipartBody.Builder()
                .setType(MultipartBody.FORM)
                .addFormDataPart(
                    "audio",
                    audioFile.name,
                    audioFile.asRequestBody("audio/mpeg".toMediaType())
                )
                .build()
            
            val request = Request.Builder()
                .url("$baseUrl/api/voice-to-text")
                .header("X-API-Key", apiKey)
                .post(requestBody)
                .build()
            
            httpClient.newCall(request).execute().use { response ->
                when {
                    response.isSuccessful -> {
                        val body = response.body?.string() ?: "{}"
                        val json = JSONObject(body)
                        val transcript = json.getString("transcript")
                        Result.success(transcript)
                    }
                    response.code == 401 -> {
                        Result.failure(Exception("Invalid API key"))
                    }
                    response.code == 413 -> {
                        Result.failure(Exception("Audio file too large (max 25MB)"))
                    }
                    response.code == 400 -> {
                        val error = JSONObject(response.body?.string() ?: "{}").optString("error", "Invalid audio format")
                        Result.failure(Exception(error))
                    }
                    else -> {
                        Result.failure(Exception("Voice-to-text failed: ${response.code}"))
                    }
                }
            }
        } catch (e: IOException) {
            Result.failure(Exception("Network error: ${e.message}"))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    /**
     * Stream audio in chunks (useful for real-time recording)
     */
    suspend fun voiceToTextStream(audioFile: File): Result<String> = withContext(Dispatchers.IO) {
        try {
            val requestBody = audioFile.asRequestBody("application/octet-stream".toMediaType())
            
            val request = Request.Builder()
                .url("$baseUrl/api/voice-to-text")
                .header("X-API-Key", apiKey)
                .header("Content-Type", "application/octet-stream")
                .post(requestBody)
                .build()
            
            httpClient.newCall(request).execute().use { response ->
                if (response.isSuccessful) {
                    val body = response.body?.string() ?: "{}"
                    val json = JSONObject(body)
                    Result.success(json.getString("transcript"))
                } else {
                    val error = JSONObject(response.body?.string() ?: "{}").optString("error", "Stream error")
                    Result.failure(Exception(error))
                }
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    /**
     * Send base64-encoded audio (useful for small audio snippets)
     */
    suspend fun voiceToTextBase64(audioFile: File): Result<String> = withContext(Dispatchers.IO) {
        try {
            val fileBytes = audioFile.readBytes()
            val base64Audio = Base64.encodeToString(fileBytes, Base64.DEFAULT)
            
            val jsonBody = JSONObject().apply {
                put("audio", base64Audio)
            }
            
            val requestBody = jsonBody.toString()
                .toRequestBody("application/json".toMediaType())
            
            val request = Request.Builder()
                .url("$baseUrl/api/voice-to-text")
                .header("X-API-Key", apiKey)
                .post(requestBody)
                .build()
            
            httpClient.newCall(request).execute().use { response ->
                if (response.isSuccessful) {
                    val body = response.body?.string() ?: "{}"
                    val json = JSONObject(body)
                    Result.success(json.getString("transcript"))
                } else {
                    Result.failure(Exception("Base64 upload failed"))
                }
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    /**
     * Parse prescription text to JSON
     */
    suspend fun textToJson(text: String): Result<Map<String, Any?>> = withContext(Dispatchers.IO) {
        try {
            require(text.isNotBlank()) { "Text cannot be empty" }
            require(text.length >= 10) { "Text must be at least 10 characters" }
            require(text.length <= 2000) { "Text exceeds 2000 character limit" }
            
            val jsonBody = JSONObject().apply {
                put("text", text)
            }
            
            val requestBody = jsonBody.toString()
                .toRequestBody("application/json".toMediaType())
            
            val request = Request.Builder()
                .url("$baseUrl/api/text-to-json")
                .header("X-API-Key", apiKey)
                .header("Content-Type", "application/json")
                .post(requestBody)
                .build()
            
            httpClient.newCall(request).execute().use { response ->
                when {
                    response.isSuccessful -> {
                        val body = response.body?.string() ?: "{}"
                        val json = JSONObject(body)
                        val prescription = json.getJSONObject("prescription").toMap()
                        Result.success(prescription)
                    }
                    response.code == 401 -> {
                        Result.failure(Exception("Invalid API key"))
                    }
                    response.code == 422 -> {
                        val error = JSONObject(response.body?.string() ?: "{}").optString("error")
                        Result.failure(Exception(error))
                    }
                    else -> {
                        Result.failure(Exception("Parse failed: ${response.code}"))
                    }
                }
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    /**
     * Complete workflow: Audio file → Transcript → Prescription JSON
     */
    suspend fun processAudioFile(audioFile: File): Result<Map<String, Any?>> {
        return voiceToText(audioFile).flatMap { transcript ->
            textToJson(transcript)
        }
    }
    
    /**
     * With retry logic for network errors
     */
    suspend fun processAudioFileWithRetry(
        audioFile: File,
        maxRetries: Int = 3,
        initialDelayMs: Long = 100
    ): Result<Map<String, Any?>> {
        var lastError: Exception? = null
        
        repeat(maxRetries) { attempt ->
            processAudioFile(audioFile).onSuccess { prescription ->
                return Result.success(prescription)
            }.onFailure { error ->
                lastError = error as? Exception ?: Exception(error.message)
                if (attempt < maxRetries - 1) {
                    delay(initialDelayMs * (1 shl attempt)) // Exponential backoff
                }
            }
        }
        
        return Result.failure(lastError ?: Exception("Max retries exceeded"))
    }
}

// Extension functions
fun File.asRequestBody(mediaType: MediaType): RequestBody {
    return RequestBody.create(mediaType, this)
}

fun JSONObject.toMap(): Map<String, Any?> {
    val map = mutableMapOf<String, Any?>()
    val keys = keys()
    while (keys.hasNext()) {
        val key = keys.next()
        val value = get(key)
        map[key] = when (value) {
            is JSONObject -> value.toMap()
            else -> value
        }
    }
    return map
}

// Usage Example
/*
// In your Activity or ViewModel
class PrescriptionActivity : AppCompatActivity() {
    
    private val apiClient = PrescriptionApiClient(
        baseUrl = "http://your-server.com",
        apiKey = "your-api-key"
    )
    
    private val scope = CoroutineScope(Dispatchers.Main + Job())
    
    fun recordAndProcess() {
        scope.launch {
            // Assume audioFile is recorded
            val audioFile = File(cacheDir, "prescription_audio.mp3")
            
            apiClient.processAudioFileWithRetry(audioFile).onSuccess { prescription ->
                // Update UI with prescription data
                displayPrescription(prescription)
            }.onFailure { error ->
                // Show error to user
                Toast.makeText(
                    this@PrescriptionActivity,
                    "Error: ${error.message}",
                    Toast.LENGTH_SHORT
                ).show()
            }
        }
    }
    
    private fun displayPrescription(prescription: Map<String, Any?>) {
        val patientName = prescription["patientName"] as? String
        val medicines = prescription["medicines"] as? List<*>
        
        // Update UI...
    }
    
    override fun onDestroy() {
        super.onDestroy()
        scope.cancel()
    }
}
*/
