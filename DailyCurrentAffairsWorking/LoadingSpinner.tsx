import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';

export function LoadingSpinner({ size = 'large', color = '#2563EB', message }: { size?: 'small' | 'large'; color?: string; message?: string }) {
	// Prefer using the platform-accepted size value ('small'|'large') so the
	// ActivityIndicator renders consistently across platforms.
	return (
		<View style={styles.container} pointerEvents="auto">
			<View style={styles.spinnerBox}>
				<ActivityIndicator size={size} color={color} />
			</View>
			{message ? <Text style={[styles.text, { color }]}>{message}</Text> : null}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		justifyContent: 'center',
		alignItems: 'center',
	},
	spinnerBox: {
	width: 80,
	height: 80,
		justifyContent: 'center',
		alignItems: 'center',
	},
	text: {
		marginTop: 10,
		fontSize: 14,
		fontWeight: '600',
	}
});
