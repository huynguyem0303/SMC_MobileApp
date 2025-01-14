import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

const storeToken = async (token) => {
  try {
    await AsyncStorage.setItem('@userToken', token); // No need to stringify the token if it's already a string
    // console.log('Store token Success:');
  } catch (e) {
    Alert.alert('Error', 'Failed to store token');
    console.error('Failed to store token:', e); // Log the actual error (e)
    return null;
  }
};

export default storeToken;
