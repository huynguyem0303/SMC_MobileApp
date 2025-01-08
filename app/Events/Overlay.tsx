import React from 'react';
import { View, Dimensions, StyleSheet, TouchableOpacity, Text,StatusBar } from 'react-native';
import { useRouter } from 'expo-router';

const { width, height } = Dimensions.get("window");

const innerDimension = 400;

interface OverlayProps {
  onScanAgain: () => void;
}

const Overlay: React.FC<OverlayProps> = ({ onScanAgain }) => {
  const router = useRouter();

  return (
    
    <View style={styles.container}>

      <View style={styles.header}>
        <TouchableOpacity onPress={router.back} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerText}>QR Scan</Text>
        </View>
      </View>
      <View style={[styles.outer, styles.adjustOuter]}>
        <View style={styles.inner} />
      </View>
      <View style={styles.footer}>
        <Text style={styles.footerText}>Please place the QR code inside the square to scan</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: width,
    height: height,
    backgroundColor: 'rgba(0, 0, 0, 0.7)', // Darker background for the outer part
    justifyContent: 'center',
    alignItems: 'center',
  },
  outer: {
    width: width,
    height: height,
    justifyContent: 'center',
    alignItems: 'center',
  },
  adjustOuter: {
    marginTop: -60, // Adjusting the top position to move the square higher
  },
  inner: {
    width: innerDimension,
    height: innerDimension,
    borderRadius: 50, // Rounded corners for a modern look
    backgroundColor: 'rgba(255, 255, 255, 0.13)', // Clearer background for the inner part
    borderWidth: 3, // Slightly thicker border for better visibility
    borderColor: 'rgba(255, 255, 255, 0.8)', // Brighter and clearer border color
    zIndex: 1,
  },
  buttonContainer: {
    marginTop: 20, // Add space between inner view and button
  },
  header: {
    backgroundColor: '#003366',
    padding: 20,
    paddingTop: 50, // Add padding to make space for mobile time, notification, and battery indicators
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    width: '100%',
    zIndex: 2, // Ensures header appears on top
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    left: 5,
  },
  backButtonText: {
    fontSize: 40,
    color: '#fff',
  },
  headerText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  footer: {
    backgroundColor: '#003366',
    padding: 20,
    position: 'absolute',
    bottom: 0,
    width: '100%',
    alignItems: 'center',
    zIndex: 2,
  },
  footerText: {
    color: '#fff',
    fontSize: 16,
  },
});

export default Overlay;
