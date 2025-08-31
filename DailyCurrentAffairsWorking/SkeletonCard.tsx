import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

export default function SkeletonCard() {
  return (
    <View style={styles.card}>
      <View style={styles.imagePlaceholder} />
      <View style={styles.body}>
        <View style={styles.lineShort} />
        <View style={styles.lineMedium} />
        <View style={styles.lineLong} />
        <View style={styles.lineLong} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    backgroundColor: '#111',
    borderRadius: 12,
    overflow: 'hidden',
    marginVertical: 8,
  },
  imagePlaceholder: {
    width: '100%',
    height: Math.round(height * 0.35),
    backgroundColor: '#222',
  },
  body: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  lineShort: {
    height: 14,
    width: '40%',
    backgroundColor: '#222',
    borderRadius: 6,
    marginBottom: 8,
  },
  lineMedium: {
    height: 14,
    width: '60%',
    backgroundColor: '#222',
    borderRadius: 6,
    marginBottom: 8,
  },
  lineLong: {
    height: 12,
    width: '90%',
    backgroundColor: '#222',
    borderRadius: 6,
    marginBottom: 6,
  },
});
