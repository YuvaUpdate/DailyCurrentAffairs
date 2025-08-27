import React, { useState, useRef } from 'react';
import { View, Text, Modal, StyleSheet, Dimensions, ScrollView } from 'react-native';
import FastTouchable from './FastTouchable';

interface Props {
  visible?: boolean;
  onClose: () => void;
}

const CARDS = [
  {
  id: 'welcome',
  title: 'Welcome to YuvaUpdate',
  description: 'Get clear, trustworthy news in bite-sized summaries — perfect for busy days. Save articles to read later or listen on the go.',
  image: 'https://via.placeholder.com/520x320/2563EB/FFFFFF?text=Welcome+to+YuvaUpdate',
  },
  {
  id: 'bookmarks',
  title: 'Save for Later',
  description: 'Quickly save stories to your device without signing in. Your saved list stays private and available offline.',
  image: 'https://via.placeholder.com/520x320/10B981/FFFFFF?text=Save+for+Later',
  },
  {
  id: 'audio',
  title: 'Listen While You Move',
  description: 'Turn any article into spoken audio. Perfect for commutes, workouts, or when you prefer listening.',
  image: 'https://via.placeholder.com/520x320/F59E0B/FFFFFF?text=Listen+Anywhere',
  },
];

function OnboardingCards({ visible = true, onClose }: Props) {
  const [index, setIndex] = useState(0);
  const [containerWidth, setContainerWidth] = useState(Dimensions.get('window').width);
  const [modalWidth, setModalWidth] = useState(Math.min(Dimensions.get('window').width * 0.92, 680));
  const scrollRef = useRef<ScrollView | null>(null);
  const transitioningRef = useRef(false);


const goNext = () => {
  if (transitioningRef.current) return;
    if (index < CARDS.length - 1) {
      const next = index + 1;
      // update UI immediately so pagination/dots reflect the tap right away
      setIndex(next);
      transitioningRef.current = true;

      // schedule the scroll on the next frame so the state update can paint first
      requestAnimationFrame(() => {
        try {
          scrollRef.current?.scrollTo({ x: next * modalWidth, y: 0, animated: true } as any);
        } catch (e) {
          // ignore - index already updated
        }
      });

      // safety: clear the transitioning flag after a short delay; it's also cleared in onMomentumScrollEnd
      setTimeout(() => { transitioningRef.current = false; }, 450);
    } else {
      // final action: close. Keep this synchronous so UI can respond promptly; let the parent handle async persistence.
      onClose();
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.backdrop} onLayout={(e) => {
        const avail = e.nativeEvent.layout.width || Dimensions.get('window').width;
        const calc = Math.min(avail * 0.92, 680);
        setModalWidth(calc);
        // compute containerWidth used for paging (equal to modal width)
        setContainerWidth(calc);
      }}>
        <View style={[styles.container, { width: modalWidth, maxWidth: '96%' }] }>
          <ScrollView
            ref={(r) => { scrollRef.current = r; }}
            horizontal
            pagingEnabled
            snapToInterval={modalWidth}
            snapToAlignment="start"
            decelerationRate="fast"
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => {
              const i = Math.round(e.nativeEvent.contentOffset.x / modalWidth);
              setIndex(i);
              // user finished the scroll; clear any transitioning guard
              transitioningRef.current = false;
            }}
            contentContainerStyle={{ paddingHorizontal: 0 }}
            style={{ width: modalWidth }}
          >
            {CARDS.map((c) => (
              <View key={c.id} style={[styles.card, { width: modalWidth, minWidth: 280 }]}> 
                <Text style={styles.title}>{c.title}</Text>
                <Text style={styles.desc}>{c.description}</Text>
              </View>
            ))}
          </ScrollView>

          <View style={styles.footer}>
            <View style={styles.pagination}>
              {CARDS.map((_, i) => (
                <View key={i} style={[styles.dot, i === index ? styles.dotActive : undefined]} />
              ))}
            </View>

            <FastTouchable style={styles.button} onPress={goNext}>
              <Text style={styles.buttonText}>{index === CARDS.length - 1 ? 'Get started' : 'Next'}</Text>
            </FastTouchable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  container: {
  // let content size the modal; constrain via maxHeight for small screens
  backgroundColor: '#fff',
  borderRadius: 12,
  overflow: 'hidden',
  maxHeight: '86%',
  paddingVertical: 8,
  paddingHorizontal: 4,
  justifyContent: 'center'
  },
  card: {
    paddingHorizontal: 18,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center'
  },
  // images removed - keep style block intentionally empty to avoid layout regressions
  image: {},
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center'
  },
  desc: {
    fontSize: 15,
    textAlign: 'center',
    color: '#444',
    lineHeight: 20,
    paddingHorizontal: 8
  },
  footer: {
    padding: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: '#eee',
    alignItems: 'center'
  },
  pagination: { flexDirection: 'row', marginBottom: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ddd', margin: 4 },
  dotActive: { backgroundColor: '#333' },
  button: { backgroundColor: '#2563EB', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  buttonText: { color: '#fff', fontWeight: '700' }
});

export default React.memo(OnboardingCards);
