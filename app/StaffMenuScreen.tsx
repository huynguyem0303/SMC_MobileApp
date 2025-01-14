import React, { useRef, useState, useEffect } from 'react';
import {
    GoogleSignin, GoogleSigninButton, statusCodes
} from '@react-native-google-signin/google-signin';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, Text, TouchableOpacity, StyleSheet, Image, ScrollView, Animated, Dimensions, BackHandler, SafeAreaView, StatusBar, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import getToken from '../components/Jwt/getToken';
const { width } = Dimensions.get('window');
import { checkToken } from '../components/checkToken'; 
import { showSessionExpiredAlert } from '../components/alertUtils'; 
const StaffMenuScreen = () => {
    const router = useRouter();
    const slideAnim = useRef(new Animated.Value(width)).current; // Initial value for slide: off-screen
    const [menuVisible, setMenuVisible] = useState(false);
    const menuAnim = useRef(new Animated.Value(-250)).current; // Initial position for slide menu
    const [email, setEmail] = useState(null);
    const [picture, setPicture] = useState(null);
    const [name, setName] = useState(null);
    useEffect(() => {
        // Slide-in animation
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 500, // Slide in over 0.5 seconds
          useNativeDriver: true,
        }).start();
        // Retrieve token and set email
        const retrieveToken = async () => {
          try {
            const token = await checkToken();
            if (token !== null) {
              const decodedToken = await getToken();
              if (decodedToken) {
                setEmail(decodedToken.email);
              } else {
                console.log('No decoded token found');
              }
            } else {
             
            }
          } catch (error) {
            console.log('Error retrieving token: ', error);
          }
        };
    
        retrieveToken();
      }, [slideAnim, router]);
    
    const toggleMenu = () => {
        setMenuVisible(!menuVisible);
        Animated.timing(menuAnim, {
            toValue: menuVisible ? -250 : 0,
            duration: 300,
            useNativeDriver: true,
        }).start();
    };
    const toggleBackMenu = () => {
        setMenuVisible(menuVisible);
        Animated.timing(menuAnim, {
            toValue: menuVisible ? -250 : 0,
            duration: 300,
            useNativeDriver: true,
        }).start();
    };

    const handleLogout = async () => {
        try {
            await AsyncStorage.removeItem('@userToken');
            console.log('User signed out');
            router.replace('/Authen/LoginScreen'); // Ensure this route exists 
        } catch (error) {
            console.log('Error Log out:', error);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
            <View style={styles.container}>
                <TouchableOpacity onPress={toggleMenu} style={styles.menuToggle}>
                    <Text style={styles.menuToggleText}>☰</Text>
                </TouchableOpacity>
                <Animated.View style={[styles.slideMenu, { transform: [{ translateX: menuAnim }] }]}>
                    <TouchableOpacity onPress={toggleMenu}>
                        <Text style={styles.backButtonText}>←</Text>
                    </TouchableOpacity>
                    <Text style={styles.slideMenuEmail}>{email}</Text>
                    <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
                        <Image source={require('../assets/images/logout-logo.png')} style={styles.iconlogout} />
                        <Text style={styles.slideMenuItem}>Logout</Text>
                    </TouchableOpacity>
                </Animated.View>
                <Animated.View style={{ flex: 1, transform: [{ translateX: slideAnim }] }}>
                    <View style={styles.header}>
                        <Image
                            source={require('../assets/images/Layer-1.png')} // Replace with your image path
                            style={styles.headerImage}
                        />
                    </View>
                    <ScrollView style={styles.scrollView}>
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Checking Event Attendance</Text>
                            <TouchableOpacity style={styles.menuItem} onPress={() => router.push('../Events/QrScanScreen')}>
                                {/* <Image source={require('../assets/images/qr.png')} style={styles.icon} /> */}
                                <Text style={styles.menuText}>Scan QR</Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </Animated.View>
            </View>
        </SafeAreaView>


    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#ffffff', // White background for the safe area
    },
    container: {
        flex: 1,
        backgroundColor: '#f0f0f0',
    },
    backButtonText: {
        color: "#FFFFFF",
        marginTop: 10,
        fontSize: 40,
    },
    menuToggle: {
        position: 'absolute',
        top: 40,
        left: 10,
        zIndex: 1,
    },
    menuToggleText: {
        fontSize: 25,
        color: '#fff',
        marginTop: 12,
        marginLeft: 5
    },
    slideMenu: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 250,
        backgroundColor: '#003366',
        padding: 20,
        zIndex: 2,
    },
    slideMenuEmail: {
        color: '#fff',
        fontSize: 14,
        marginTop: 10,
        marginBottom: 10,
        textAlign: 'center',
    },
    slideMenuName: {
        color: '#fff',
        fontSize: 19,
        marginTop: 20,
        marginBottom: 10,
        textAlign: 'center',
    },
    slideMenuItem: {
        color: '#fff',
        fontSize: 18,
        marginBottom: 20,
        textAlign: 'center',
    },
    header: {
        backgroundColor: '#003366',
        padding: 20,
        paddingTop: 50, // Add padding to make space for mobile time and battery indicators
        alignItems: 'center',
    },
    headerImage: {
        width: 100, // Adjust the width as needed
        height: 50, // Adjust the height as needed
        resizeMode: 'contain',
    },
    scrollView: {
        flex: 1,
    },
    section: {
        marginTop: 20,
        paddingHorizontal: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
        textAlign: 'center',
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center', // Center children horizontally
        padding: 15,
        backgroundColor: '#fff',
        borderRadius: 5,
        marginBottom: 10,

    },
    icon: {
        width: 20,
        height: 20,
        marginRight: 10

    },
    iconlogout: {
        width: 16,
        height: 16,
        marginRight: 10,
        marginTop: -15,

    },
    menuText: {
        fontSize: 16,
        textAlign: 'center',
    },
    logoutButton: {
        flexDirection: 'row', // Arrange children in a row
        alignItems: 'center', // Center children vertically
        padding: 10, // Add padding for better spacing
        marginTop: 20, // Add margin to create space around the button
        paddingRight: 10,
        marginLeft: 40,
        backgroundColor: '#003366', // Match the slide menu background color
        borderRadius: 5, // Slightly round the corners
    },

    footer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        padding: 10,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#ccc',
    },
    footerItem: {
        alignItems: 'center',
    },
    footerIcon: {
        width: 24,
        height: 24,
    },
});


export default StaffMenuScreen;
