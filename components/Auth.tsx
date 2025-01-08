import React, { useState } from 'react';
import {
  GoogleSignin, GoogleSigninButton, statusCodes
} from '@react-native-google-signin/google-signin';
import auth from '@react-native-firebase/auth'
import getToken from '../components/Jwt/getToken';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import storeToken from '../components/Jwt/storeToken';
import fetchAccountData from '../components/fetchAccountData';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function () {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false); // Add loading state

  const router = useRouter();

  GoogleSignin.configure({
    scopes: ['profile', 'email'],
    webClientId: "808206442637-2cp9edtms139ck8qltcm6n9oedfk3ocp.apps.googleusercontent.com",
  });

  const storeDecodedToken = async (token: any) => {
    try {
      await AsyncStorage.setItem('@decoded_token', JSON.stringify(token));
      console.log('Decoded token stored successfully');
    } catch (error) {
      console.error('Error storing decoded token: ', error);
    }
  };

  const handleSignIn = async () => {
    if (loading) return; // Prevent multiple sign-ins
    setLoading(true); // Set loading to true at the start
  
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      const idToken = userInfo.data?.idToken;
  
      if (!idToken) {
        await GoogleSignin.signOut();
        setErrorMessage('Failed to sign in');
        return;
      }
  
      const googleCredential = auth.GoogleAuthProvider.credential(idToken);
      // console.log(idToken);
      await auth().signInWithCredential(googleCredential);
  
      const response = await fetch(`https://smnc.site/api/Auth/google-login?googleIdToken=${idToken}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
  
      const responseBody = await response.text();
      // console.log('Response Body:', responseBody);
  
      if (responseBody.trim() === '') {
        throw new Error('Empty response body');
      }
  
      let data;
      try {
        data = JSON.parse(responseBody);
      } catch (e) {
        throw new Error('Failed to parse JSON: ' + responseBody);
      }
  
      if (!response.ok) {
        await GoogleSignin.signOut();
        const errorMessages = data.errors ? data.errors.join('\n') : 'Unknown error';
        setErrorMessage(`${data.message}\n\n${errorMessages}`);
        return;
      }
  
      const { access_token: accessToken, status, errors, user } = data.data;
  
      if (status === 2) {
        await GoogleSignin.signOut();
        setErrorMessage(errors || 'Failed to sign in');
        return;
      }
      await storeToken(accessToken);
      const decodedToken = await getToken();
      await fetchAccountData(decodedToken.id);
     
     
      
      // console.log(data.data);
  
      // Determine role based on mentorId or lecturerId
      let role = '';
      if (user.mentorId != null) {
        role = 'mentor';
        await AsyncStorage.setItem('@id', JSON.stringify(user.mentorId));
        await AsyncStorage.setItem('@role', JSON.stringify(role));
        await AsyncStorage.setItem('@accountid', JSON.stringify(user.id));
      } else if (user.lecturerId != null) {
        role = 'lecturer';
        await AsyncStorage.setItem('@id', JSON.stringify(user.lecturerId));
        await AsyncStorage.setItem('@role', JSON.stringify(role));
        await AsyncStorage.setItem('@accountid', JSON.stringify(user.id));
      } else if (user.studentId != null) {
        role = 'student';
        await AsyncStorage.setItem('@id', JSON.stringify(user.studentId));
      }
  
      // Routing based on role
      if (role === 'mentor' || role === 'lecturer') {
        router.push("/MentorLecturerMenuScreen");
      } else if (role === 'student') {
        router.push("/MenuScreen");
      } else {
        setErrorMessage('User role could not be determined');
        await GoogleSignin.signOut();
      }
  
    } catch (error: any) {
      await GoogleSignin.signOut();
      console.log('Sign-In Error:', error);
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        setErrorMessage("User cancelled the login flow");
      } else if (error.code === statusCodes.IN_PROGRESS) {
        setErrorMessage("Operation (e.g. sign in) is in progress already");
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        setErrorMessage("Play services not available or outdated");
      } else {
        setErrorMessage( error.message || 'An unexpected error occurred during sign-in.');
      }
    } finally {
      setLoading(false); // Reset loading state at the end
    }
  };
  
  


  return (
    <View style={styles.container}>

    
        <GoogleSigninButton
          size={GoogleSigninButton.Size.Wide}
          color={GoogleSigninButton.Color.Dark}
          onPress={handleSignIn}
        />
        {errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}
 

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  errorText: {
    color: 'red',
    marginTop: 20,
    fontSize: 16,
    textAlign: 'center',
  },
});
