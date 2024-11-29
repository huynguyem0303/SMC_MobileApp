import React, { useEffect, useRef, useState } from 'react';
import { CameraView, Camera } from 'expo-camera';
import { Stack } from 'expo-router';
import { AppState, Alert, Platform, SafeAreaView, StatusBar, StyleSheet, View, Text, Button } from 'react-native';
import Overlay from './Overlay';

export default function QrScanScreen() {
  const qrLock = useRef(false);
  const appState = useRef(AppState.currentState);
  const [isScanning, setIsScanning] = useState(true);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  // Request camera permissions
  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  // Handle app state changes
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        qrLock.current = false;
        setIsScanning(true); // Reset scanning state when app comes back to active
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const handleScanAgain = () => {
    qrLock.current = false;
    setIsScanning(true);
  };

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (data && !qrLock.current) {
      qrLock.current = true;
      setIsScanning(false);

      // Extract id and studentId from the scanned data
      const [id, studentId] = data.split('/');

      if (id && studentId) {
        try {
          const response = await fetch(`https://smnc.site/api/Events/UpdateAttendance?id=${id}&studentId=${studentId}`, {
            method: 'GET',
            headers: {
              'Accept': '*/*',
            },
          });

          if (response.ok) {
            Alert.alert('Success', 'Attendance updated successfully.', [{ text: 'OK', onPress: () => handleScanAgain() }]);
          } else {
            Alert.alert('Failure', 'Failed to check attendance.Please use the right Qr code to scran', [{ text: 'OK', onPress: () => handleScanAgain() }]);
          }
        } catch (error) {
          Alert.alert('Error', 'An error occurred while updating attendance.', [{ text: 'OK', onPress: () => handleScanAgain() }]);
        }
      } else {
        Alert.alert('Invalid QR Code', 'The scanned QR code does not contain valid content for checking', [{ text: 'OK', onPress: () => handleScanAgain() }]);
      }
    }
  };

  if (hasPermission === null) {
    return <View />;
  }
  if (hasPermission === false) {
    return <Text>No access to camera</Text>;
  }

  return (
    <SafeAreaView style={StyleSheet.absoluteFillObject}>
      <Stack.Screen
        options={{
          title: 'Overview',
          headerShown: false,
        }}
      />
      {Platform.OS === 'android' ? <StatusBar hidden /> : null}
      {isScanning && (
        <CameraView
          style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}
          facing="back"
          onBarcodeScanned={handleBarCodeScanned}
        />
      )}
      <Overlay onScanAgain={handleScanAgain} />
    </SafeAreaView>
  );
}
