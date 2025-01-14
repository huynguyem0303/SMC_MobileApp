import { Alert } from 'react-native';
import { useRouter } from 'expo-router';

let hasShownAlert = false;

// Function to show session expired alert
export const showSessionExpiredAlert = (router) => {
  if (!hasShownAlert) {
    hasShownAlert = true;
    Alert.alert(
      "Session Expired",
      "Your session has expired. Please log in again.",
      [
        {
          text: "OK",
          onPress: () => {
            hasShownAlert = false; // Reset the flag after navigation
            router.push('/Authen/LoginScreen');
          }
        }
      ],
      { cancelable: false }
    );
  }
};

export const resetAlertFlag = () => {
  hasShownAlert = false;
};
