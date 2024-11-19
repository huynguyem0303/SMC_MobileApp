import React, { useRef, useState, useEffect } from 'react';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, Text, TouchableOpacity, StyleSheet, Image, ScrollView, Animated, Dimensions, BackHandler, SafeAreaView, StatusBar, ActivityIndicator,Alert } from 'react-native';
import { useRouter } from 'expo-router';
import getToken from '../components/Jwt/getToken'; // Adjust the path if necessary
import fetchAccountData from '../components/fetchAccountData'; //
const { width } = Dimensions.get('window');

// Define types for the parameters and response data
interface CourseInstanceDetails {
    data: {
        courseId: string;
        semesterId: string;
    };
}

interface TeamDetails {
    data: {
        members: { studentCode: string; isLeader: boolean }[];
    };
}

// Function to fetch course instance details
const fetchCourseInstanceDetails = async (courseInstanceId: string, userToken: string): Promise<CourseInstanceDetails | null> => {
    try {
        const response = await fetch(`http://103.185.184.35:6969/api/CourseInstance/${courseInstanceId}`, {
            method: 'GET',
            headers: {
                'accept': '*/*',
                'Authorization': `Bearer ${userToken}`,
            },
        });
        const data = await response.json();
        if (data.status === false) {
            console.error('Error fetching course instance details:', data.message, data.errors);
            return null;
        }
        return data;
    } catch (error) {
        console.error('Error fetching course instance details:', error);
        throw error;
    }
};


// Function to fetch team details
const fetchTeamDetails = async (courseId: string, semesterId: string, userToken: string): Promise<TeamDetails | null> => {
    try {
        const response = await fetch(`http://103.185.184.35:6969/api/Teams/CurrentUserTeam?courseId=${courseId}&semesterId=${semesterId}`, {
            method: 'GET',
            headers: {
                'accept': '*/*',
                'Authorization': `Bearer ${userToken}`,
            },
        });
        const data = await response.json();
        if (data.status === false) {
            console.error('Error fetching team details:', data.message, data.errors);
            return null;
        }
        return data;
    } catch (error) {
        console.error('Error fetching team details:', error);
        throw error;
    }
};


const MenuScreen = () => {
    const router = useRouter();
    const slideAnim = useRef(new Animated.Value(width)).current; // Initial value for slide: off-screen
    const [menuVisible, setMenuVisible] = useState(false);
    const menuAnim = useRef(new Animated.Value(-250)).current; // Initial position for slide menu
    const [email, setEmail] = useState<string | null>(null);
    const [accID, setAccId] = useState<string | null>(null);
    const [studentCode, setStudentCode] = useState<string | null>(null);
    const [courseInstanceId, setCourseInstanceId] = useState<string | null>(null);
    const [userToken, setUserToken] = useState<string | null>(null);
    const [courseDetails, setCourseDetails] = useState<{ courseId: string | null; semesterId: string | null }>({ courseId: null, semesterId: null });
    const [loading, setLoading] = useState<boolean>(true); // Loading state
    useEffect(() => {
        Animated.timing(slideAnim, {
            toValue: 0,
            duration: 500, // Slide in over 0.5 seconds
            useNativeDriver: true,
        }).start();

        const retrieveToken = async () => {
            try {
                const decodedToken = await getToken(); // Use getToken to retrieve and decode the token
                const token = await AsyncStorage.getItem('@userToken');

                if (token) {
                    setUserToken(token);
                    // console.log('User token:', token);
                } else {
                    console.log('No token found');
                }

                if (decodedToken) {
                    setEmail(decodedToken.email);
                    setAccId(decodedToken.id);
                    // console.log('Decoded token:', decodedToken);

                    const storedData = await AsyncStorage.getItem('@accountData');
                    if (storedData) {
                        const parsedData = JSON.parse(storedData);
                        const courseInstanceId = parsedData.accountInCourseInstances[0].courseInstanceId;
                        setCourseInstanceId(courseInstanceId);
                        // console.log('Course Instance ID:', courseInstanceId);

                        if (token && courseInstanceId) {
                            // Fetch additional course instance details
                            const courseDetails = await fetchCourseInstanceDetails(courseInstanceId, token);
                            if (courseDetails) {
                                setCourseDetails({
                                    courseId: courseDetails.data.courseId,
                                    semesterId: courseDetails.data.semesterId,
                                });
                                // console.log('Course Details:', courseDetails);
                                if (courseDetails.data.courseId && courseDetails.data.semesterId) {
                                    // Fetch team details using courseId and semesterId

                                    // console.log("accData",parsedData)
                                    const teamDetails = await fetchTeamDetails(courseDetails.data.courseId, courseDetails.data.semesterId, token);
                                    if (teamDetails) {
                                        console.log("teamDetail", teamDetails.data.members)
                                        const isCurrentUserLeader = teamDetails.data.members.filter(
                                            (member: { studentCode: string; isLeader: boolean }) =>
                                                member.studentCode === parsedData.student.studentCode && member.isLeader
                                        ).length > 0;
                                        // console.log("isLeader:",isCurrentUserLeader);
                                        setStudentCode(parsedData.student.studentCode);
                                        await AsyncStorage.setItem('@isLeader', JSON.stringify(isCurrentUserLeader));
                                        await AsyncStorage.setItem('@haveTeam', JSON.stringify(true));
                                    }else{
                                        await AsyncStorage.setItem('@haveTeam', JSON.stringify(false));
                                    }
                                }
                            }
                        }
                    } else {
                        console.log('No account data found');
                    }
                } else {
                    console.log('No token found');
                }
            } catch (error) {
                console.log('Error retrieving token: ', error);
            } finally {
                setLoading(false); // Stop loading
            }
        };

        retrieveToken();

        const backAction = () => true; // Disable back button
        const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);

        // Clean up the event listener
        return () => backHandler.remove();
    }, [slideAnim]);

    const toggleMenu = () => {
        setMenuVisible(!menuVisible);
        Animated.timing(menuAnim, {
            toValue: menuVisible ? -250 : 0,
            duration: 300,
            useNativeDriver: true,
        }).start();
    };

    const handleLogout = async () => {
        try {
            await AsyncStorage.removeItem('@userToken');
            await AsyncStorage.removeItem('@accountData');
            await AsyncStorage.removeItem('@isLeader');
            await AsyncStorage.removeItem('@haveTeam');
            await AsyncStorage.removeItem('@requestCount');
            await GoogleSignin.revokeAccess(); // Optional: Revoke access to Google account
            await GoogleSignin.signOut();
            console.log('User signed out');
            router.replace('/Authen/LoginScreen'); // Ensure this route exists
        } catch (error) {
            console.error('Error logging out:', error);
        }
    };

    const handleMyTeam = () => {
        if (!studentCode) {
            Alert.alert("You need a team to use this function");
            return;
        }
    
        router.push({
            pathname: './MyTeamScreen',
            params: {
                courseDetails: JSON.stringify(courseDetails), // Serialize courseDetails to a string
                studentCode: studentCode,
            },
        });
    };
    
    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0000ff" />
                <Text>Loading...</Text>
            </View>
        );
    }


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
                            <Text style={styles.sectionTitle}>Event</Text>
                            <TouchableOpacity style={styles.menuItem} onPress={() => router.push('../Events/EvenListScreen')}>
                                <Image source={require('../assets/images/newsfeed-icon.png')} style={styles.icon} />
                                <Text style={styles.menuText}>New Feeds</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.menuItem} >
                                <Image source={require('../assets/images/google-logo.png')} style={styles.icon} />
                                <Text style={styles.menuText}>Application status</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Project</Text>
                            <TouchableOpacity style={styles.menuItem} onPress={() => router.push('../Projects/ProjectListScreen')}>
                                <Image source={require('../assets/images/search-project-icon.png')} style={styles.icon} resizeMode="contain" // or 'cover' / 'stretch' based on your requirement 
                                />
                                <Text style={styles.menuText}>Find Project</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.menuItem} onPress={() => handleMyTeam()}>
                                <Image source={require('../assets/images/team-icon.png')} style={styles.icon} />
                                <Text style={styles.menuText}>My Team</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/TimeLineScreen')}>
                                <Image source={require('../assets/images/google-logo.png')} style={styles.icon} />
                                <Text style={styles.menuText}>Time Line</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Information Access</Text>
                            <TouchableOpacity style={styles.menuItem} >
                                <Image source={require('../assets/images/google-logo.png')} style={styles.icon} />
                                <Text style={styles.menuText}>Weekly timetable</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.menuItem} >
                                <Image source={require('../assets/images/google-logo.png')} style={styles.icon} />
                                <Text style={styles.menuText}>Exam schedule</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.menuItem} >
                                <Image source={require('../assets/images/google-logo.png')} style={styles.icon} />
                                <Text style={styles.menuText}>Semester Schedule</Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                    <View style={styles.footer}>
                        <TouchableOpacity style={styles.footerItem} >
                            <Image source={require('../assets/images/google-logo.png')} style={styles.footerIcon} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.footerItem} >
                            <Image source={require('../assets/images/google-logo.png')} style={styles.footerIcon} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.footerItem} >
                            <Image source={require('../assets/images/google-logo.png')} style={styles.footerIcon} />
                        </TouchableOpacity>
                    </View>
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
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
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
        width: 30,
        height: 30,
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


export default MenuScreen;