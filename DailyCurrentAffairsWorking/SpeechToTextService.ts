import { Platform, PermissionsAndroid } from 'react-native';

// Lightweight Speech-to-Text (STT) wrapper.
// - On native Android/iOS, prefers react-native-voice (native module)
// - On web, uses the browser's SpeechRecognition (Web Speech API)
// The API is intentionally small: start, stop, cancel, onResult, onError, isSupported

type ResultCallback = (text: string, isFinal?: boolean) => void;
type ErrorCallback = (err: any) => void;

let Voice: any = null;

function safeRequire(name: string) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require(name);
  } catch (e) {
    return null;
  }
}

if (Platform.OS !== 'web') {
  Voice = safeRequire('react-native-voice');
}

class SpeechToTextService {
  private recognition: any = null;
  private resultCb: ResultCallback | null = null;
  private errorCb: ErrorCallback | null = null;
  private interim: string = '';

  async isSupported(): Promise<boolean> {
    if (Platform.OS === 'web') {
      // @ts-ignore
      return typeof window !== 'undefined' && !!(window as any).webkitSpeechRecognition || !!(window as any).SpeechRecognition;
    }
    return !!Voice;
  }

  async requestAndroidPermissions(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;
    try {
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      ]);
      return granted[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] === PermissionsAndroid.RESULTS.GRANTED;
    } catch (e) {
      return false;
    }
  }

  onResult(cb: ResultCallback) {
    this.resultCb = cb;
  }

  onError(cb: ErrorCallback) {
    this.errorCb = cb;
  }

  async start(locale = 'en-US') {
    if (Platform.OS === 'web') {
      // web implementation
      // @ts-ignore
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        throw new Error('SpeechRecognition API not available in this browser');
      }
      this.recognition = new SpeechRecognition();
      this.recognition.lang = locale;
      this.recognition.interimResults = true;
      this.recognition.continuous = false;

      this.recognition.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
          else interimTranscript += event.results[i][0].transcript;
        }
        this.interim = interimTranscript;
        if (this.resultCb) this.resultCb(finalTranscript || interimTranscript, !!finalTranscript);
      };

      this.recognition.onerror = (e: any) => {
        if (this.errorCb) this.errorCb(e);
      };

      this.recognition.start();
      return;
    }

    // Native implementation via react-native-voice
    if (!Voice) throw new Error('Native voice module not available. Install react-native-voice and rebuild the app.');

    Voice.onSpeechResults = (e: any) => {
      const text = (e.value && e.value.length) ? e.value.join(' ') : '';
      if (this.resultCb) this.resultCb(text, true);
    };
    Voice.onSpeechPartialResults = (e: any) => {
      const text = (e.value && e.value.length) ? e.value.join(' ') : '';
      if (this.resultCb) this.resultCb(text, false);
    };
    Voice.onSpeechError = (e: any) => {
      if (this.errorCb) this.errorCb(e);
    };

    await Voice.start(locale);
  }

  async stop() {
    if (Platform.OS === 'web') {
      if (this.recognition) {
        this.recognition.stop();
        this.recognition = null;
      }
      return;
    }
    if (!Voice) return;
    await Voice.stop();
  }

  async cancel() {
    if (Platform.OS === 'web') {
      if (this.recognition) {
        this.recognition.abort();
        this.recognition = null;
      }
      return;
    }
    if (!Voice) return;
    await Voice.cancel();
  }
}

export const speechToTextService = new SpeechToTextService();
export default speechToTextService;
