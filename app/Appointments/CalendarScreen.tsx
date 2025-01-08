import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert, Modal, Linking, ActivityIndicator } from 'react-native';
import moment from 'moment';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Event {
    startTime: string;
    endTime: string;
    note: string;
    meetingAddress: string;
    status: number;
    id: string;
    creatorId: string;
    creatorName: string;
    teamId: string;
    isDeleted: boolean
}

interface EventsMap {
    [key: string]: Event[];
}

interface MentorOrLecturer {
    accountId: string;
    name: string;
    roleType: string;
    description: string;
}

enum AppointmentSlotStatus {
    Available = 0,
    Scheduled,
    InProgress,
    Completed,
    Cancelled,
    Absent
}

const CalendarScreen = () => {
    const router = useRouter();
    const { myTeamId, courseId, semesterId } = useLocalSearchParams();
    const [currentWeek, setCurrentWeek] = useState(moment().startOf('isoWeek'));
    const [today, setToday] = useState<number>(moment().isoWeekday());
    const [selectedDay, setSelectedDay] = useState<number>(moment().isoWeekday());
    const [events, setEvents] = useState<EventsMap>({});
    const [isLeader, setIsLeader] = useState<boolean>(false);
    const [modalVisible, setModalVisible] = useState<boolean>(false);
    const [confirmVisible, setConfirmVisible] = useState<boolean>(false);
    const [cancelVisible, setCancelVisible] = useState<boolean>(false);
    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
    const [mentorIds, setMentorIds] = useState<string[]>([]); 
    const [lecturerIds, setLecturerIds] = useState<string[]>([]);
    const [project, setProject] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [attendanceStatus, setAttendanceStatus] = useState<number | null>(null);

    const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    const fetchProjectDetails = async () => {
        try {
            const token = await AsyncStorage.getItem('@userToken');
    
            if (!token) {
                Alert.alert('No token found, please login.');
                return;
            }
    
            const response = await fetch(`https://smnc.site/api/Projects/CurrentUserProject?courseId=${courseId}&semesterId=${semesterId}`, {
                method: 'GET',
                headers: {
                    'accept': '*/*',
                    'Authorization': `Bearer ${token}`,
                },
            });
    
            const data = await response.json();
    
            if (data.status && data.data.data.length > 0) {
                const projectData = data.data.data[0];
                setProject(projectData);
    
                const mentors: string[] = [];
                const lecturers: string[] = [];
    
                projectData.mentorsAndLecturers.forEach((mentor: MentorOrLecturer) => {
                    if (mentor.roleType === 'Mentor') {
                        mentors.push(mentor.accountId);
                    } else if (mentor.roleType === 'Lecturer') {
                        lecturers.push(mentor.accountId);
                    }
                });
    
                setMentorIds(mentors);
                setLecturerIds(lecturers);
                // console.log(mentorIds);
                // console.log(lecturerIds);
            } else {
                console.error('Failed to fetch project details');
            }
        } catch (error) {
            console.error('Error fetching project details:', error);
        }
    };


    const fetchEvents = async (project: any, startTime: string, endTime: string) => {
        try {
            const token = await AsyncStorage.getItem('@userToken');
            const leaderStatus = await AsyncStorage.getItem('@isLeader');
            setIsLeader(leaderStatus === 'true');
            setEvents({});
    
            if (!token) {
                Alert.alert('No token found, please login.');
                return;
            }
    
            if (mentorIds.length === 0 || lecturerIds.length === 0) {
                console.error('Mentor IDs or Lecturer IDs are missing');
                return;
            }
    
            const fetchEventsForId = (id: string) => {
                return fetch('https://smnc.site/api/AppointmentSlots/Search', {
                    method: 'POST',
                    headers: {
                        'accept': '*/*',
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        startTime,
                        endTime,
                        creatorId: id,
                    }),
                });
            };
    
            const mentorPromises = mentorIds.map(fetchEventsForId);
            const lecturerPromises = lecturerIds.map(fetchEventsForId);
    
            const responses = await Promise.all([...mentorPromises, ...lecturerPromises]);
            const data = await Promise.all(responses.map(response => response.json()));
    
            const mergeEvents = (dataArray: any[]) => {
                dataArray.forEach(data => {
                    if (data && data.data) {
                        const eventsWithNames = Object.keys(data.data).reduce<EventsMap>((acc, key) => {
                            acc[key] = data.data[key].filter((event: Event) => !event.isDeleted && (event.teamId === myTeamId || event.teamId === null))
                                .map((event: Event) => {
                                    const mentorOrLecturer = project.mentorsAndLecturers.find((mentor: MentorOrLecturer) => mentor.accountId === event.creatorId);
                                    return {
                                        ...event,
                                        creatorName: mentorOrLecturer ? mentorOrLecturer.name : 'Unknown',
                                    };
                                });
                            return acc;
                        }, {});
    
                        setEvents(prevEvents => ({ ...prevEvents, ...eventsWithNames }));
                        
                    } else {
                        console.error('Unexpected data format:', data);
                    }
                });
            };
    
            mergeEvents(data);
            // console.log('Events after merging:', events);
        } catch (error) {
            console.error('Error fetching appointments:', error);
        } finally {
            setLoading(false);
            // console.log('Final events state:', events);
        }
    };
    
  


    const handleAttendCancel = async (scheduleAppointment: boolean) => {
        if (selectedEvent) {
            const startDate = new Date(selectedEvent.startTime);

            if (startDate < new Date()) {
                Alert.alert('Error', "The appointment slot can't be scheduled when it's in the past or not available.");
                return;
            }

            try {
                const token = await AsyncStorage.getItem('@userToken');
                const response = await fetch(`https://smnc.site/api/AppointmentSlots/${selectedEvent.id}/ScheduleAppointment?teamId=${myTeamId}&scheduleAppointment=${scheduleAppointment}`, {
                    method: 'PATCH',
                    headers: {
                        'accept': '*/*',
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                });

                const data = await response.json();

                if (!data.status && data.errors && data.errors.includes("The appointment slot can't be scheduled when it's in the past or not available.")) {
                    Alert.alert('Error', "The appointment slot can't be scheduled when it's in the past or not available.");
                } else if (data.status) {
                    Alert.alert('Success', 'The appointment has been updated successfully.');
                } else {
                    Alert.alert('Error', data.message );
                }

                setModalVisible(false);
                setConfirmVisible(false);
                setCancelVisible(false);

                const startTime = currentWeek.startOf('isoWeek').format();
                const endTime = currentWeek.endOf('isoWeek').format();
                fetchEvents(project, startTime, endTime);

            } catch (error) {
                console.error('Error updating event:', error);
                Alert.alert('Error', 'There was an error updating the appointment.');
            }
        }
    };
    const handlePress = async (id: any) => {
        try {
            // Retrieve studentId from AsyncStorage
            const storedId = await AsyncStorage.getItem('@id');
            const studentId = storedId ? JSON.parse(storedId) : null;
            console.log(studentId);
            if (!studentId) {
                Alert.alert('Error', 'Student ID not found');
                return;
            }

            // Perform the API call
            const token = await AsyncStorage.getItem('@userToken');
            const response = await fetch(`https://smnc.site/api/AppointmentSlots/${id}/StudentAttendance?studentId=${studentId}`, {
                method: 'PUT',
                headers: {
                    'accept': '*/*',
                    'Authorization': `Bearer ${token}`, // Add your token here
                }
            });

            if (response.ok) {
                if (selectedEvent?.meetingAddress) {
                    Linking.openURL(selectedEvent?.meetingAddress);
                } else {
                    Alert.alert('Error', 'Open URL failed');
                }
            } else {
                Alert.alert('Error', 'Join meeting failed');
            }
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'An unexpected error occurred');
        }
    };
    const getAttendanceStatus = async (studentId: string, slotId: string) => {
        try {
          const token = await AsyncStorage.getItem('@userToken');
          const response = await fetch(`https://smnc.site/api/StudentAttendance?StudentId=${studentId}&SlotId=${slotId}`, {
            method: 'GET',
            headers: {
              'Accept': 'text/plain',
              'Authorization': `Bearer ${token}`,
            },
          });
      
          const data = await response.json();
          
          // Logging the response data for debugging
          console.log('API Response:', data);
      
          if (data && data.status) {
            const attendance = data.data.data[0]; // Adjusted to navigate nested data structure
            setAttendanceStatus(attendance.status);
          } else {
            console.error('Error:', data ? data.message : 'No data received');
          }
        } catch (error) {
          console.error('Error fetching attendance status:', error);
        }
      };
    const getEventColor = (status: number) => {
        switch (status) {
            case 0: return '#6699FF'; // Available
            case 1: return '#F4A261'; // Scheduled #FFA500
            case 2: return '#FFD700'; // InProgress
            case 3: return '#66CC66'; // Completed
            case 4: return '#FF4500'; // Cancelled
            case 5: return '#808080'; // Absent
            default: return '#000000'; // Default color
        }
    };

    const generateTimeSlots = () => {
        const times: { key: string }[] = [];
        const startHour = 7;
        const endHour = 17;
        const incrementMinutes = 30;

        for (let i = startHour * 60; i < endHour * 60 + incrementMinutes; i += incrementMinutes) {
            const startHour = Math.floor(i / 60);
            const startMinutes = i % 60;
            const endHour = Math.floor((i + incrementMinutes) / 60);
            const endMinutes = (i + incrementMinutes) % 60;
            const start = `${String(startHour).padStart(2, '0')}:${String(startMinutes).padStart(2, '0')}`;
            const end = `${String(endHour).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
            times.push({ key: `${start} - ${end}` });
        }

        return times;
    };

    const handleDayPress = (dayIndex: number) => {
        setSelectedDay(dayIndex + 1); // Update selected day (Monday to Sunday is 1 to 7)
    };

    const handleEventPress = async (event: Event) => {
        setSelectedEvent(event);
      
        try {
          const storedId = await AsyncStorage.getItem('@id');
          if (!storedId) {
            console.error('Stored ID is null');
            return;
          }
      
          const studentId = JSON.parse(storedId);
          if (!studentId) {
            console.error('Student ID is null');
            return;
          }
      
          if (event && event.id && event.status === AppointmentSlotStatus.Completed) {
            await getAttendanceStatus(studentId, event.id);
          } 
          setModalVisible(true);
        } catch (error) {
          console.error('Error processing student ID:', error);
        }
      };
      


    const handlePrevWeek = () => {
        const newWeek = currentWeek.clone().subtract(1, 'week');
        setCurrentWeek(newWeek);
        const startTime = newWeek.startOf('isoWeek').format();
        const endTime = newWeek.endOf('isoWeek').format();
        fetchEvents(project, startTime, endTime);
    };

    const handleNextWeek = () => {
        const newWeek = currentWeek.clone().add(1, 'week');
        setCurrentWeek(newWeek);
        const startTime = newWeek.startOf('isoWeek').format();
        const endTime = newWeek.endOf('isoWeek').format();
        fetchEvents(project, startTime, endTime);
    };

    useEffect(() => {
        moment.updateLocale('en', {
            week: {
                dow: 1, // Monday is the first day of the week.
                doy: 4  // The week that contains Jan 4th is the first week of the year.
            }
        });

        fetchProjectDetails();
    }, [courseId, semesterId]);

    useEffect(() => {
        if (mentorIds.length > 0 && lecturerIds.length > 0 && project) {
            const startTime = currentWeek.startOf('isoWeek').format();
            const endTime = currentWeek.endOf('isoWeek').format();
            fetchEvents(project, startTime, endTime);
        }
    }, [mentorIds, lecturerIds, project, currentWeek]);
    

    useEffect(() => {
        const updateDate = () => {
            const newToday = moment().isoWeekday();
            setToday(newToday);
            const newCurrentWeek = moment().startOf('week').add(1, 'day');
            setCurrentWeek(newCurrentWeek);
    
            if (mentorIds.length > 0 && lecturerIds.length > 0 && project) {
                const startTime = newCurrentWeek.startOf('isoWeek').format();
                const endTime = newCurrentWeek.endOf('isoWeek').format();
                fetchEvents(project, startTime, endTime);
            }
        };
    
        updateDate();
    
        const now = moment();
        const nextMidnight = moment().startOf('day').add(1, 'day');
        const timeUntilMidnight = nextMidnight.diff(now);
    
        const timeout = setTimeout(() => {
            updateDate();
            setInterval(updateDate, 24 * 60 * 60 * 1000); // Every 24 hours
        }, timeUntilMidnight);
    
        return () => clearTimeout(timeout);
    }, [mentorIds, lecturerIds, project]);

    useEffect(() => {
        console.log("Selected Day: ", selectedDay);
    }, [selectedDay]);

    if (loading) {
        return <ActivityIndicator size="large" color="#0000ff" />;
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={router.back} style={styles.backButton}>
                    <Text style={styles.backButtonText}>←</Text>
                </TouchableOpacity>
                <Text style={styles.headerText}>Calendar</Text>
            </View>
            <View style={styles.weekNavigation}>
                <TouchableOpacity onPress={handlePrevWeek}>
                    <Text style={styles.arrow}>←</Text>
                </TouchableOpacity>
                <Text style={styles.currentWeekText}>
                    {currentWeek.startOf('isoWeek').format('DD/MM/YYYY')} - {currentWeek.endOf('isoWeek').format('DD/MM/YYYY')}
                </Text>
                <TouchableOpacity onPress={handleNextWeek}>
                    <Text style={styles.arrow}>→</Text>
                </TouchableOpacity>
            </View>


            <View style={styles.calendarHeader}>
                {daysOfWeek.map((day, index) => {
                    const date = currentWeek.clone().startOf('isoWeek').add(index, 'days').format('DD');
                    return (
                        <TouchableOpacity key={index} onPress={() => handleDayPress(index)} style={styles.dayContainer}>
                            <Text style={styles.dayText}>
                                {day}
                            </Text>
                            <Text style={[styles.dateText, (selectedDay === index + 1) && styles.todayHighlight]}>
                                {date}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            <FlatList
                data={generateTimeSlots()}
                renderItem={({ item }) => (
                    <View style={styles.timeSlotRow}>
                        <View style={styles.timeSlot}>
                            <Text style={styles.timeText}>{item.key}</Text>
                        </View>
                        <View style={styles.eventSlot}>
                            {Object.keys(events).map(day => (
                                moment(day, "dddd YYYY-MM-DD").isoWeekday() === selectedDay &&
                                events[day].map((event: Event, idx: number) => {
                                    const eventStart = moment(event.startTime).format('HH:mm');
                                    const eventEnd = moment(event.endTime).format('HH:mm');
                                    const timeSlotStart = moment(item.key.split(' - ')[0], 'HH:mm').format('HH:mm');
                                    const timeSlotEnd = moment(item.key.split(' - ')[1], 'HH:mm').format('HH:mm');
                                    // Condition to check if user is leader or show appointment slot if event.creatorId matches mentorId or lecturerId
                                    const shouldShowEvent = isLeader ;
                                    // Check if the event start time and end time match the time slot start time and end time
                                    const isEventInTimeSlot = eventStart === timeSlotStart && eventEnd === timeSlotEnd;
                                    if (isEventInTimeSlot) {
                                        return (
                                            <TouchableOpacity key={idx} style={[styles.sampleEvent, { backgroundColor: getEventColor(event.status) }]} onPress={() => handleEventPress(event)}>
                                                <Text style={styles.eventText}>{event.note}</Text>
                                            </TouchableOpacity>
                                        );
                                    }
                                    return null;
                                })
                            ))}
                        </View>

                    </View>
                )}
                keyExtractor={(item) => item.key}
                showsVerticalScrollIndicator={false}
            />
            {selectedEvent && (
                <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => {
                  setModalVisible(!modalVisible);
                }}
              >
                <View style={styles.centeredView}>
                  <View style={styles.modalView}>
                    {selectedEvent.status === AppointmentSlotStatus.InProgress && (
                      <View>
                        <Text style={styles.modalText}>Meeting Address:</Text>
                        <TouchableOpacity onPress={() => handlePress(selectedEvent.id)}>
                          <Text style={{ color: 'blue', textDecorationLine: 'underline' }}>
                            {selectedEvent.meetingAddress}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                    <Text style={styles.modalText}>
                      Created by: {selectedEvent.creatorName}
                    </Text>
                    <Text style={styles.modalText}>
                      Status: {AppointmentSlotStatus[selectedEvent.status]}
                    </Text>
                    {selectedEvent.status === AppointmentSlotStatus.Completed && (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={styles.modalText}>Attendance: </Text>
                      <Text
                        style={
                          attendanceStatus === 0
                            ? styles.statusAbsent
                            : attendanceStatus === 1
                            ? styles.statusPresent
                            : styles.modalText
                        }
                      >
                        {attendanceStatus === 0 ? 'Absent' : attendanceStatus === 1 ? 'Present' : 'Loading...'}
                      </Text>
                    </View>
                    )}
                    {isLeader && selectedEvent.status === AppointmentSlotStatus.Available && (
                      <View style={styles.buttonContainer}>
                        <TouchableOpacity
                          style={[styles.button, styles.saveButton]}
                          onPress={() => setConfirmVisible(true)}
                        >
                          <Text style={styles.textStyle}>Book</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                     {isLeader && selectedEvent.status === AppointmentSlotStatus.Scheduled && (
                      <View style={styles.buttonContainer}>
                        <TouchableOpacity
                          style={[styles.button, styles.cancelButton]}
                          onPress={() => setCancelVisible(true)}
                        >
                          <Text style={styles.textStyle}>Cancel</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                    <TouchableOpacity
                      style={[styles.button, styles.buttonClose]}
                      onPress={() => setModalVisible(!modalVisible)}
                    >
                      <Text style={styles.textStyle}>Close</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Modal>              
            )}

            {confirmVisible && (
                <Modal
                    animationType="slide"
                    transparent={true}
                    visible={confirmVisible}
                    onRequestClose={() => {
                        setConfirmVisible(!confirmVisible);
                    }}
                >
                    <View style={styles.centeredView}>
                        <View style={styles.modalView}>
                            <Text style={styles.modalText}>Are you sure you want to book this appointment?</Text>
                            <View style={styles.buttonContainer}>
                                <TouchableOpacity
                                    style={[styles.button, styles.buttonAttend]}
                                    onPress={() => handleAttendCancel(true)}
                                >
                                    <Text style={styles.textStyle}>Yes</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.button, styles.buttonCancel]}
                                    onPress={() => setConfirmVisible(false)}
                                >
                                    <Text style={styles.textStyle}>No</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
            )}
            {cancelVisible && (
                <Modal
                    animationType="slide"
                    transparent={true}
                    visible={cancelVisible}
                    onRequestClose={() => {
                        setCancelVisible(!cancelVisible);
                    }}
                >
                    <View style={styles.centeredView}>
                        <View style={styles.modalView}>
                            <Text style={styles.modalText}>Are you sure you want to cancel this appointment?</Text>
                            <View style={styles.buttonContainer}>
                                <TouchableOpacity
                                    style={[styles.button, styles.buttonAttend]}
                                    onPress={() => handleAttendCancel(false)}
                                >
                                    <Text style={styles.textStyle}>Yes</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.button, styles.buttonCancel]}
                                    onPress={() => setCancelVisible(false)}
                                >
                                    <Text style={styles.textStyle}>No</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
            )}
        </View>
    );

};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        paddingTop: 10,
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
    headerText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        textAlign: 'center',
        flex: 1,
        marginTop: 30,
    },
    weekNavigation: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 10,
    },
    arrow: {
        fontSize: 30,
        color: '#003366',
        marginHorizontal: 60,
        marginBottom: 10
    },
    currentWeekText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#003366',
        textAlign: 'center',
        marginVertical: 10,
    },
    calendarHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 10,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
    },
    dayContainer: {
        alignItems: 'center',
        flex: 1,
    },
    dayText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#003366',
        marginBottom: 5,
    },
    dateText: {
        fontSize: 14,
        color: '#666',
    },
    todayHighlight: {
        color: '#fff',
        backgroundColor: '#003366',
        borderRadius: 50,
        padding: 5,
    },
    timeSlotRow: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
    },
    timeSlot: {
        width: 120, // Adjust width as needed
        paddingVertical: 10, // Ensure padding is consistent with content slot
        paddingHorizontal: 10,
        borderRightWidth: 1,
        borderRightColor: '#ddd',
    },
    timeText: {
        fontSize: 14,
        color: '#666',
    },
    eventSlot: {
        flex: 1,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 50, // Set a minimum height to match time slot
    },
    sampleEvent: {
        backgroundColor: '#ffcc00',
        borderRadius: 5,
        padding: 5,
        marginVertical: 2,
    },
    eventText: {
        color: '#003366',
        fontWeight: 'bold',
    },
    centeredView: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 22,
    },
    modalView: {
        margin: 20,
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 35,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
    },
    button: {
        borderRadius: 5,
        padding: 10,
        elevation: 2,
    },
    buttonAttend: {
        backgroundColor: '#2196F3',
    },
    buttonCancel: {
        backgroundColor: '#FF6347',
    },
    buttonClose: {
        backgroundColor: '#2196F3',
        marginTop: 15,
    },
    textStyle: {
        color: 'white',
        fontWeight: 'bold',
        textAlign: 'center',
    },
    modalText: {
        marginBottom: 15,
        textAlign: 'center',
    },
    creatorText: {
        marginTop: 10,
        fontSize: 14,
        color: '#666',
        fontStyle: 'italic',
    },
    saveButton: {
        marginTop: 15,
        backgroundColor: '#28a745',
    },
    cancelButton: {
        marginTop: 15,
        backgroundColor: '#d9534f',
    },
    statusAbsent: {
        marginBottom: 15,
        color: 'red',
      },
      statusPresent: {
        marginBottom: 15,
        color: 'green',
      },    
});

export default CalendarScreen;
