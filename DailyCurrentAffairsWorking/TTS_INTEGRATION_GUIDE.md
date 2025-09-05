# TTS Integration Guide

## Quick Start

To use the TTS feature in your news feed components:

### 1. Import the TTS Service
```typescript
import TextToSpeechService from './TextToSpeechService';
```

### 2. Add TTS State (in your component)
```typescript
const [readingArticleId, setReadingArticleId] = useState<string | null>(null);
const [isPaused, setIsPaused] = useState(false);
const ttsService = TextToSpeechService.getInstance();
```

### 3. Implement Read Aloud Handler
```typescript
const handleReadAloud = async (article: NewsArticle) => {
  const articleId = String(article.id);
  
  if (readingArticleId === articleId) {
    if (isPaused) {
      ttsService.resume();
      setIsPaused(false);
    } else {
      ttsService.pause();
      setIsPaused(true);
    }
  } else {
    try {
      ttsService.stop();
      setReadingArticleId(articleId);
      setIsPaused(false);
      
      await ttsService.readArticle(article.headline, article.description);
    } catch (error) {
      console.log('TTS Error:', error);
      setReadingArticleId(null);
    }
  }
};
```

### 4. Add TTS Button
```typescript
<TouchableOpacity 
  onPress={() => handleReadAloud(article)} 
  style={[styles.ttsButton, { 
    backgroundColor: readingArticleId === String(article.id) ? (colors.accent + '20') : colors.surface 
  }]}
>
  <Text style={{ 
    color: readingArticleId === String(article.id) ? colors.accent : colors.text 
  }}>
    {readingArticleId === String(article.id) ? (isPaused ? 'Resume' : 'Pause') : 'Listen'}
  </Text>
</TouchableOpacity>
```

### 5. Add Cleanup (optional but recommended)
```typescript
useEffect(() => {
  return () => {
    ttsService.stop();
    setReadingArticleId(null);
    setIsPaused(false);
  };
}, [currentIndex]); // or when switching articles
```

## Integrated Components

### ✅ InshortsCard.tsx
Complete TTS integration with floating action buttons

### ✅ NewsFeed_Inshorts.tsx  
Complete TTS integration with icon column buttons and modal support

Both components are ready to use with TTS functionality!
