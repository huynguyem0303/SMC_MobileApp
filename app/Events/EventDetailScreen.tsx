import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert,Modal } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import getToken from '../../components/Jwt/getToken';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { checkToken } from '../../components/checkToken'; 
import { showSessionExpiredAlert } from '../../components/alertUtils';
type Event = {
    title: string;
    description: string;
    type: number;
    coverImageFile: string | null;
    coverImageUrl: string | null;
    startDate: string;
    endDate: string;
    location: string;
    registrationLink: string;
    tag: string;
    registeredAmount: number;
    attendances: any;
    courseInstances: any;
    documentLinks: any;
    milestoneEvents: any;
    id: string;
    status: number;
    isDeleted: boolean;
    lastUpdateDate: string | null;
    isMandatory: boolean;
};

const EventDetailScreen = () => {
    const router = useRouter();
    const { id } = useLocalSearchParams();
    const [event, setEvent] = useState<Event | null>(null);
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);
    const [studentId, setStudentId] = useState<string | null>(null);
    const [confirmVisible, setConfirmVisible] = useState(false);
    const [attendanceStatus, setAttendanceStatus] = useState<number | null>(null);
    useEffect(() => {
        if (id) {
            fetchEventDetails(id.toString());
            retrieveToken();
        }
    }, [id]);

    useEffect(() => {
        if (userId) {
            fetchStudentId(userId);
        }
    }, [userId]);
    const retrieveToken = async () => {
        try {
            const decodedToken = await getToken();
            if (decodedToken) {
                setUserId(decodedToken.id);
            } else {
                // console.log('No token found');
            }
        } catch (error) {
            console.log('Error retrieving token: ', error);
        }
    };
    useEffect(() => {
        if (id && studentId) {
            fetchAttendanceStatus();
        }
    }, [id, studentId]);
    const fetchStudentId = async (userId: string) => {
        try {
            const token = await checkToken();
            if (token === null) {
                showSessionExpiredAlert(router);
                return;
            }

            const response = await fetch(`https://smnc.site/api/Account/${userId}`, {
                method: 'GET',
                headers: {
                    'accept': '*/*',
                    'Authorization': `Bearer ${token}`,
                },
            });
            const data = await response.json();
            setStudentId(data.data.student.id);
        } catch (error) {
            console.log('Error fetching student ID:', error);
        }
    };
    const fetchAttendanceStatus = async () => {
        try {
            const storedId = await AsyncStorage.getItem('@id');
            if (!storedId) {
                console.log('Stored ID is null');
                return;
            }
            const studentId = JSON.parse(storedId);
            const token = await checkToken();
            if (token === null) {
                showSessionExpiredAlert(router);
                return;
            }

            const response = await fetch(`https://smnc.site/api/StudentAttendance?StudentId=${studentId}&EventId=${id}`, {
                method: 'GET',
                headers: {
                    'Accept': 'text/plain',
                    'Authorization': `Bearer ${token}`,
                },
            });
            // console.log("stuid", studentId);
            // console.log("eventid", id);
            const data = await response.json();
    
            if (data.status) {
                const attendance = data.data.data[0]; // Assuming you want the first entry
                if (attendance) {
                    setAttendanceStatus(attendance.status);
                } else {
                    setAttendanceStatus(null); // No attendance data available
                }
            } else {
                // console.log(data.message);
            }
        } catch (error) {
            console.log('Error fetching attendance status:', error);
        }
    };
    
    const fetchEventDetails = async (eventId: string) => {
        try {
            const response = await fetch(`https://smnc.site/api/Events/${eventId}`);
            const data = await response.json();
            setEvent(data.data);
            setLoading(false);
        } catch (error) {
            console.log('Error fetching event details:', error);
            setLoading(false);
        }
    };

    const handleRegister = async () => {
         setConfirmVisible(false);
        if (!id || !studentId || !userId) return;
        // console.log(id);

        try {
            const attendanceResponse =await registerAttendance(id.toString(), studentId);
            if (!attendanceResponse.ok) {
                // If there is an error in registering attendance, stop further execution
                return;
            }
            if (event?.isMandatory) {
                const qrCodeResponse=await generateQrCode(id.toString(), userId,studentId);
                if (!qrCodeResponse.ok) {
                    // If there is an error in registering attendance, stop further execution
                    return;
                }
            }
            const token = await checkToken();
            if (token === null) {
                showSessionExpiredAlert(router);
                return;
            }

            const response = await fetch(`https://smnc.site/api/Events/${id}/Register`, {
                method: 'PATCH',
                headers: {
                    'accept': '*/*',
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.ok) {

                Alert.alert('Registered Complete', 'You have successfully registered for this event.');
                fetchEventDetails(id.toString()); // Refresh the page to update registered amount
            } else {
                Alert.alert('Registration Failed', 'There was an issue registering for the event. Please try again later.');
            }
        } catch (error) {
            // console.log('Error during registration:', error);
            Alert.alert('Registration Failed', 'There was an issue registering for the event. Please try again later.');
        }
    };

    const registerAttendance = async (eventId: string, studentId: string): Promise<{ ok: boolean }> => {
        try {
            const token = await checkToken();
            if (token === null) {
                showSessionExpiredAlert(router);
            }
            const response = await fetch('https://smnc.site/api/StudentAttendance', {
                method: 'POST',
                headers: {
                    'accept': '*/*',
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    studentId,
                    eventId,
                    attendanceType: 2,
                    note: 'Event register',
                }),
            });
    
            if (response.ok) {
            } else {
                const errorResponse = await response.json();
                if (errorResponse.errors && errorResponse.errors.includes('This attendance has already existed.')) {
                    Alert.alert('Error', 'Attendance is already registered.');
                } else {
                    // console.log('Error registering attendance:', errorResponse);
                    Alert.alert('Error', 'Failed to register attendance. Please try again later.');
                }
            }
            return response;  // Return the original response object
        } catch (error) {
            // console.log('Error registering attendance:', error);
            Alert.alert('Error', 'Failed to register attendance. Please try again later.');
            return { ok: false };  // Ensure an object with 'ok' property is always returned
        }
    };
    
    

    const generateQrCode = async (eventId: string, userId: string,studentId: string): Promise<{ ok: boolean }> => {
        try {
            const token = await checkToken();
            if (token === null) {
                showSessionExpiredAlert(router);
            }
            const response = await fetch(`https://smnc.site/api/Events/${eventId}/GenerateQrCode?studentId=${studentId}&accountId=${userId}`, {
                method: 'GET',
                headers: {
                    'accept': '*/*',
                    'Authorization': `Bearer ${token}`,
                },
            });
    
            if (!response.ok) {
                const errorResponse = await response.json();
                console.log('Error generating QR code:', errorResponse);
            }
    
            return response;
        } catch (error) {
            console.log('Error generating QR code:', error);
            return { ok: false }; // Ensure an object with 'ok' property is always returned
        }
    };
    

    if (loading) {
        return <ActivityIndicator size="large" color="#0000ff" />;
    }

    if (!event) {
        return <Text style={styles.errorText}>Error loading event details</Text>;
    }

    const getEventType = (type: number) => {
        switch (type) {
            case 0:
                return 'Seminar';
            case 1:
                return 'Workshop';
            case 2:
                return 'Meeting';
            default:
                return 'Unknown';
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={router.back} style={styles.backButton}>
                    <Text style={styles.backButtonText}>←</Text>
                </TouchableOpacity>
                <Text style={styles.headerText}>Event Details</Text>
            </View>
            <ScrollView contentContainerStyle={styles.scrollViewContent}>
                <View style={styles.contentContainer}>
                    {event.coverImageUrl && (
                        <Image source={{ uri: event.coverImageUrl }} style={styles.eventImage} />
                    )}
                    <View style={styles.detailsContainer}>
                        <Text style={styles.eventTitle}>{event.title}</Text>
                        <View style={styles.inlineContainer}>
                            <Text style={styles.time}>Type: </Text>
                            <Text style={styles.eventLocation}>{getEventType(event.type)}</Text>
                        </View>
                        <View style={styles.inlineContainer}>
                            <Text style={styles.time}>Time: </Text>
                            <Text style={styles.eventDateTime}>{formatTime(event.startDate)} - {formatTime(event.endDate)}</Text>
                        </View>
                        <View style={styles.inlineContainer}>
                            <Text style={styles.time}>On: </Text>
                            <Text style={styles.eventDateTime}>{formatDate(event.startDate)}</Text>
                        </View>
                        <View style={styles.inlineContainer}>
                            <Text style={styles.time}>Location: </Text>
                            <Text style={styles.eventLocation}>{event.location}</Text>
                        </View>
                       
                    </View>
                </View>
                <Text style={styles.eventFullDescription}>{event.description}</Text>
                        <Text style={styles.eventTag}>{event.tag}</Text>
                        <Text style={styles.eventRegistered}>Registered: {event.registeredAmount}</Text>
                        {attendanceStatus !== null && (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={styles.eventLocation}>Attendance: </Text>
                        <Text
                            style={
                                attendanceStatus === 0
                                    ? styles.statusAbsent
                                    : attendanceStatus === 1
                                    ? styles.statusPresent
                                    : styles.eventLocation
                            }
                        >
                            {attendanceStatus === 0 ? 'Absent' : attendanceStatus === 1 ? 'Present' : 'Loading...'}
                        </Text>
                    </View>
                )}
                        <TouchableOpacity style={styles.registrationButton} onPress={() => setConfirmVisible(true)}>
                            <Text style={styles.registrationButtonText}>Register Now</Text>
                        </TouchableOpacity>
            </ScrollView>

            {/* Confirmation Popup */}
            <Modal
                transparent={true}
                visible={confirmVisible}
                animationType="slide"
                onRequestClose={() => setConfirmVisible(false)}
            >
                <View style={styles.popupContainer}>
                    <View style={styles.popupContent}>
                        <Text>Are you sure you want to register for this event?</Text>
                        <View style={styles.popupButtonContainer}>
                            <TouchableOpacity style={styles.confirmButton} onPress={handleRegister}>
                                <Text style={styles.confirmButtonText}>Yes</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.cancelButton} onPress={() => setConfirmVisible(false)}>
                                <Text style={styles.cancelButtonText}>No</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};


const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        backgroundColor: '#003366',
        padding: 20,
        alignItems: 'center',
        flexDirection: 'row',
    },
    backButton: {
        position: 'absolute',
        left: 5,
    },
    backButtonText: {
        fontSize: 40,
        color: '#fff',
    },
    inlineContainer: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    headerText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        textAlign: 'center',
        flex: 1,
        marginTop: 30,
    },
    scrollViewContent: {
        padding: 10,
    },
    contentContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    detailsContainer: {
        flex: 1,
        marginLeft: 10,
    },
    eventImage: {
        width: 150,
        height: 200,
        borderRadius: 10,
    },
    eventTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    eventDateTime: {
        fontSize: 15,
        marginBottom: 10,
    },
    eventLocation: {
        fontSize: 15,
        marginBottom: 10,
    },
    eventTag: {
        fontSize: 16,
        marginBottom: 10,
        fontWeight: 'bold',
    },
    time: {
        fontSize: 16,
        marginBottom: 10,
        fontWeight: 'bold',
    },
    eventFullDescription: {
        fontSize: 20,
        marginBottom: 10,
    },
    eventRegistered: {
        fontSize: 16,
        marginBottom: 10,
        color: '#555', // Grey color for registered amount
    },
    registrationButton: {
        backgroundColor: '#003366',
        padding: 10,
        borderRadius: 5,
        marginTop: 20,
        alignItems: 'center',
    },
    registrationButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    errorText: {
        color: 'red',
        textAlign: 'center',
        marginTop: 20,
    },
    confirmButton: {
        backgroundColor: '#00796b',
        padding: 10,
        borderRadius: 5,
        flex: 1,
        marginRight: 10,
        alignItems: 'center',
    },
    confirmButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    cancelButton: {
        backgroundColor: '#d9534f',
        padding: 10,
        borderRadius: 5,
        flex: 1,
        marginLeft: 10,
        alignItems: 'center',
    },
    cancelButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    popupContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    popupContent: {
        width: '80%',
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 10,
        alignItems: 'center',
    },
    popupButtonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 20,
        width: '100%',
    },
    statusAbsent: {
        marginBottom: 10,
        color: 'red',
    },
    statusPresent: {
        marginBottom: 10,
        color: 'green',
    }

});

export default EventDetailScreen;
