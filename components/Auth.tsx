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
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      console.log('UserInfo:', userInfo);

      // Correctly extract idToken from userInfo.data
      const idToken = userInfo.data?.idToken;

      if (!idToken) {
        await GoogleSignin.signOut();
        setErrorMessage('Failed to sign in');
        return;
      }

      const googleCredential = auth.GoogleAuthProvider.credential(idToken);
      await auth().signInWithCredential(googleCredential);

      const response = await fetch(`https://smnc.site/api/Auth/google-login?googleIdToken=${idToken}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      console.log('idtoken', idToken);
      const data = await response.json();
      console.log('Response:', response);
      console.log('API Response:', data);

      if (!response.ok) {
        await GoogleSignin.signOut();
        setErrorMessage(data.errors || 'Failed to sign in');
        return;
      }

      const { access_token: accessToken, status, errors } = data.data;

      if (status === 2) {
        await GoogleSignin.signOut();
        setErrorMessage(errors || 'Failed to sign in');
        return;
      }

      console.log('AccessToken:', accessToken);
      await storeToken(accessToken);
      const decodedToken = await getToken();
      console.log('DecodedToken:', decodedToken);
      await fetchAccountData(decodedToken.id);
      router.push("/MenuScreen");

    } catch (error: any) {
      await GoogleSignin.signOut();
      console.error('Sign-In Error:', error);
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        setErrorMessage("User cancelled the login flow");
      } else if (error.code === statusCodes.IN_PROGRESS) {
        setErrorMessage("Operation (e.g. sign in) is in progress already");
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        setErrorMessage("Play services not available or outdated");
      } else {
        setErrorMessage(error.message || 'An unexpected error occurred during sign-in.');
      }
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
