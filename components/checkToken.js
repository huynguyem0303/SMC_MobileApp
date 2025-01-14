import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

// Function to check if the token is expired
const isTokenExpired = (expires) => {
  const expiryTime = new Date(expires).getTime();
  const currentTime = new Date().getTime();
//   const twoHoursLater = currentTime + 2 * 60 * 60 * 1000;
  return currentTime > expiryTime;
};

// Function to check the token expiration and return the token if valid
export const checkToken = async () => {
  const expires = await AsyncStorage.getItem('@expires');
//   console.log('Token Expires:', expires);

  if (expires && isTokenExpired(expires)) {
    await AsyncStorage.removeItem('@userToken');
    await AsyncStorage.removeItem('@accountData');
    await AsyncStorage.removeItem('@isLeader');
    await AsyncStorage.removeItem('@haveTeam');
    await AsyncStorage.removeItem('@memberCount');
    await AsyncStorage.removeItem('@expires');
    await AsyncStorage.removeItem('@memberid');
    await AsyncStorage.removeItem('@id');
    await AsyncStorage.removeItem('@role');
    await AsyncStorage.removeItem('@accountid');
    await GoogleSignin.revokeAccess(); // Optional: Revoke access to Google account
    await GoogleSignin.signOut();
    return null; // Return null if the token is expired
  } else {
    // Return the token if it's still valid
    const token = await AsyncStorage.getItem('@userToken');
    return token;
  }
};
