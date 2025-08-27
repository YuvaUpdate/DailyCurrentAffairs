package com.nareshkumarbalamurugan.yuvaupdate;

import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.util.Log;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.module.annotations.ReactModule;

import java.util.Locale;

@ReactModule(name = NativeTtsModule.NAME)
public class NativeTtsModule extends ReactContextBaseJavaModule implements TextToSpeech.OnInitListener {
  public static final String NAME = "NativeTts";
  private TextToSpeech tts;
  private boolean initialized = false;

  public NativeTtsModule(ReactApplicationContext reactContext) {
    super(reactContext);
    try {
      tts = new TextToSpeech(reactContext, this);
      tts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
        @Override public void onStart(String utteranceId) {}
        @Override public void onDone(String utteranceId) {}
        @Override public void onError(String utteranceId) {}
      });
    } catch (Exception e) {
      Log.e(NAME, "TTS init error", e);
    }
  }

  @Override
  public String getName() {
    return NAME;
  }

  @Override
  public void onCatalystInstanceDestroy() {
    if (tts != null) {
      try { tts.stop(); } catch (Exception e) {}
      try { tts.shutdown(); } catch (Exception e) {}
      tts = null;
    }
    super.onCatalystInstanceDestroy();
  }

  @Override
  public void onInit(int status) {
    if (status == TextToSpeech.SUCCESS) {
      try {
        tts.setLanguage(Locale.US);
      } catch (Exception e) {
        Log.w(NAME, "Failed setting language", e);
      }
      initialized = true;
    } else {
      Log.w(NAME, "TTS init failed status=" + status);
      initialized = false;
    }
  }

  @ReactMethod
  public void speak(String text, Promise promise) {
    if (tts == null) {
      promise.reject("E_NO_TTS", "TTS not initialized");
      return;
    }
    try {
      if (!initialized) {
        // still try
      }
      tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, "rn_tts");
      promise.resolve(true);
    } catch (Exception e) {
      promise.reject("E_TTS", e.getMessage());
    }
  }

  @ReactMethod
  public void stop(Promise promise) {
    if (tts == null) {
      promise.resolve(false);
      return;
    }
    try {
      tts.stop();
      promise.resolve(true);
    } catch (Exception e) {
      promise.reject("E_TTS_STOP", e.getMessage());
    }
  }

  @ReactMethod
  public void isSpeaking(Promise promise) {
    try {
      boolean speaking = tts != null && tts.isSpeaking();
      promise.resolve(speaking);
    } catch (Exception e) {
      promise.reject("E_TTS_STATUS", e.getMessage());
    }
  }
}
