import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, Image, TouchableOpacity } from 'react-native';
import Auth from '../../components/Auth';
import { useRouter } from 'expo-router';
import { GoogleSigninButton } from '@react-native-google-signin/google-signin';

const { width } = Dimensions.get('window');
const LoginScreen = () => {
  const slideAnim = useRef(new Animated.Value(width)).current;
  const router = useRouter();

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 500, // Slide in over 0.5 seconds
      useNativeDriver: true,
    }).start();
  }, [slideAnim]);

  const navigateToStaffLogin = () => {
    router.push('/Authen/LoginStaffScreen');
  };

  return (
    <Animated.View style={{ flex: 1, transform: [{ translateX: slideAnim }] }}>
      <View style={styles.container}>
        <Image
          source={require('../../assets/images/Layer-1.png')} // Replace with your image path
          style={styles.logo}
        />
        <Text style={styles.welcome}>WELCOME BACK</Text>
        <TouchableOpacity style={styles.button} onPress={navigateToStaffLogin}>
          <View style={styles.iconContainer}>
            <Image
              style={styles.icon}
              source={require('../../assets/images/event-staff.png')} // Use the new imported image
            />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.buttonText}>Event Staff Login</Text>
          </View>
        </TouchableOpacity>



        <Auth />
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#003366',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  logo: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10, // Reduced margin to bring it closer to the button
  },
  welcome: {
    fontSize: 20,
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 30, // Adjusted margin to position it closer to the button
  },
  googleButton: {
    marginVertical: 20,
  },
  googleIcon: {
    width: 24, // Adjust the size as needed
    height: 24,
    resizeMode: 'contain',
  },
  button: {
    width: 302, // Match the width of the Google Sign-In button
    height: 40, // Fixed height of the button
    backgroundColor: '#00cc00',
    marginBottom: 20,
    flexDirection: 'row', // To align icon and text horizontally
    alignItems: 'center', // Center content vertically
    paddingHorizontal: 10, // Add horizontal padding
    position: 'relative',
},
iconContainer: {
    height: '100%', // Full height of the button
    width: 40, // Width of the square
    backgroundColor: '#fff', // White background for the square
    justifyContent: 'center',
    alignItems: 'center',
    borderTopLeftRadius: 5, // Matching the button's border radius
    borderBottomLeftRadius: 5, // Matching the button's border radius
    position: 'absolute', // Position absolutely to the left
    left: 0, // Align to the left of the button
},
icon: {
    width: 24, // Adjust the size as needed
    height: 24,
    resizeMode: 'contain',
},
textContainer: {
    flex: 1, // Take up remaining space
    justifyContent: 'center',
    alignItems: 'center', // Center the text horizontally and vertically
},
buttonText: {
    fontSize: 15,
    color: '#fff',
    marginLeft:50,
    marginTop:7,
    fontWeight: 'bold', // Make text bold
},
});

export default LoginScreen;
