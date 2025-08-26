import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';

export function LoadingSpinner({ size = 'large', color = '#2563EB', message }: { size?: 'small' | 'large'; color?: string; message?: string }) {
	// Use a numeric size for ActivityIndicator to avoid platform inconsistencies
	const numericSize = size === 'large' ? 48 : 24;

	return (
		<View style={styles.container} pointerEvents="auto">
			<View style={styles.spinnerBox}>
				<ActivityIndicator size={numericSize} color={color} />
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
		width: 64,
		height: 64,
		justifyContent: 'center',
		alignItems: 'center',
	},
	text: {
		marginTop: 10,
		fontSize: 14,
		fontWeight: '600',
	}
});
