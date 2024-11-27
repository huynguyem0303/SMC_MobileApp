import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert, Modal, Linking } from 'react-native';
import moment from 'moment';
import { useRouter, useLocalSearchParams } from 'expo-router'; // Adjust this import if you are not using expo-router
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Event {
    startTime: string;
    endTime: string;
    note: string;
    meetingAddress: string;
    status: number;
    id: string;
    creatorId: string;
    creatorName: string; // Ensured this is always a string
    teamId:string
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

const CalendarScreen = () => {
    const router = useRouter();
    const { myTeamId, courseId, semesterId } = useLocalSearchParams();
    const [currentWeek, setCurrentWeek] = useState(moment().startOf('week').add(1, 'day'));
    const [today, setToday] = useState<number>(moment().day()); // Use moment().day() to get day of the week as a number (0 for Sunday, 6 for Saturday)
    const [selectedDay, setSelectedDay] = useState<number>(today === 0 ? 7 : today + 1); // Initialize with today (Monday is 1 and Saturday is 7)
    const [events, setEvents] = useState<EventsMap>({}); // State to store API events
    const [isLeader, setIsLeader] = useState<boolean>(false); // State to store if the user is a leader
    const [modalVisible, setModalVisible] = useState<boolean>(false); // State to control modal visibility
    const [confirmVisible, setConfirmVisible] = useState<boolean>(false); // State to control confirm modal visibility
    const [cancelVisible, setCancelVisible] = useState<boolean>(false); // State to control confirm modal visibility
    const [selectedEvent, setSelectedEvent] = useState<{ note: string, meetingAddress: string, id: string, status: number, creatorName: string } | null>(null); // State to store selected event details
    const [mentorId, setMentorId] = useState<string | null>(null); // State to store mentor ID
    const [lecturerId, setLecturerId] = useState<string | null>(null); // State to store lecturer ID
    const [project, setProject] = useState<any>(null); // State to store project details

    const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    const getEventDays = (data: EventsMap): number[] => {
        return Object.keys(data).map(day => {
            const parsedDay = moment(day, "dddd YYYY-MM-DD");
            return parsedDay.isoWeekday(); // Use isoWeekday to get Monday as 1 and Sunday as 7
        });
    };

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

            if (data.status && data.data.length > 0) {
                const projectData = data.data[0]; // Assuming we're interested in the first project
                setProject(projectData); // Set the project state

                // Extract mentorId and lecturerId
                projectData.mentorsAndLecturers.forEach((mentor: MentorOrLecturer) => {
                    if (mentor.roleType === 'Mentor') {
                        setMentorId(mentor.accountId);
                    } else if (mentor.roleType === 'Lecturer') {
                        setLecturerId(mentor.accountId);
                    }
                });
            } else {
                console.error('Failed to fetch project details');
            }
        } catch (error) {
            console.error('Error fetching project details:', error);
        }
    };

    const fetchEvents = async (project: any) => {
        try {
            const token = await AsyncStorage.getItem('@userToken');
            const leaderStatus = await AsyncStorage.getItem('@isLeader');
            setIsLeader(leaderStatus === 'true');
    
            if (!token) {
                Alert.alert('No token found, please login.');
                return;
            }
    
            if (!mentorId || !lecturerId) {
                console.error('Mentor ID or Lecturer ID is missing');
                return;
            }
    
            // Fetch events with mentorId
            let response = await fetch('https://smnc.site/api/AppointmentSlots/Search', {
                method: 'POST',
                headers: {
                    'accept': '*/*',
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    startTime: moment().startOf('week').format(),
                    endTime: moment().endOf('week').format(),
                    creatorId: mentorId, // Use creatorId for mentor
                }),
            });
    
            let data = await response.json();
            // console.log('Mentor Response Data:', data); // Log the response for debugging
    
            if (data && data.data) {
                const eventsWithNames = Object.keys(data.data).reduce<EventsMap>((acc, key) => {
                    
                    acc[key] = data.data[key].filter((event: Event) => event.teamId === myTeamId || event.teamId === null)
                    .map((event: Event) => {
                        const mentorOrLecturer = project.mentorsAndLecturers.find((mentor: MentorOrLecturer) => mentor.accountId === event.creatorId);
                        return {
                            ...event,
                            creatorName: mentorOrLecturer ? mentorOrLecturer.name : 'Unknown'
                        };
                    });
                    return acc;
                }, {});
    
                setEvents(prevEvents => ({ ...prevEvents, ...eventsWithNames })); // Merge events without filtering
            } else {
                console.error('Unexpected data format for mentor events:', data);
            }
    
            // Fetch events with lecturerId
            response = await fetch('https://smnc.site/api/AppointmentSlots/Search', {
                method: 'POST',
                headers: {
                    'accept': '*/*',
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    startTime: moment().startOf('week').format(),
                    endTime: moment().endOf('week').format(),
                    creatorId: lecturerId, // Use creatorId for lecturer
                }),
            });
    
            data = await response.json();
            // console.log('Lecturer Response Data:', data); // Log the response for debugging
            if (data && data.data) {
                const eventsWithNames = Object.keys(data.data).reduce<EventsMap>((acc, key) => {
                    acc[key] = data.data[key].filter((event: Event) => event.teamId === myTeamId || event.teamId === null)
                    .map((event: Event) => {
                        const mentorOrLecturer = project.mentorsAndLecturers.find((mentor: MentorOrLecturer) => mentor.accountId === event.creatorId);
                        return {
                            ...event,
                            creatorName: mentorOrLecturer ? mentorOrLecturer.name : 'Unknown'
                        };
                    });
                    return acc;
                }, {});
    
                setEvents(prevEvents => ({ ...prevEvents, ...eventsWithNames })); // Merge events without filtering
                console.log(events)
                console.log(myTeamId)
            } else {
                console.error('Unexpected data format for lecturer events:', data);
            }
    
            // Determine the earliest event day and set the selected day accordingly
            if (data && data.data) {
                const eventDays = getEventDays(data.data);
                const earliestDay = Math.min(...eventDays);
                setSelectedDay(today); // Adjust to match Monday (1) to Sunday (7)
            }
        } catch (error) {
            console.error('Error fetching appointments:', error);
        }
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
        if (mentorId && lecturerId && project) {
            fetchEvents(project); // Pass the project to fetchEvents
        }
    }, [mentorId, lecturerId, project]);

    const getDates = () => {
        const dates: string[] = [];
        for (let i = 0; i < 7; i++) {
            dates.push(currentWeek.clone().add(i, 'days').format('DD'));
        }
        return dates;
    };

    const generateTimeSlots = () => {
        const times: { key: string }[] = [];
        for (let i = 7; i <= 21; i++) {
            times.push({ key: `${i}:00 - ${i + 1}:00` });
        }
        return times;
    };

    const handleDayPress = (dayIndex: number) => {
        setSelectedDay(dayIndex + 1); // Update selected day (Monday to Sunday is 1 to 7)
    };

    const handleEventPress = (event: { note: string, meetingAddress: string, id: string, status: number, creatorName: string }) => {
        setSelectedEvent(event);
        setModalVisible(true);
    };

    const handleAttendCancel = async (scheduleAppointment: boolean) => {
        if (selectedEvent) {
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
                setModalVisible(false);
                setConfirmVisible(false);
                setCancelVisible(false);
                Alert.alert('Success', 'The appointment has been updated successfully.');
                // Refresh events after updating
                fetchEvents(project); // Pass the project to fetchEvents
            } catch (error) {
                console.error('Error updating event:', error);
                Alert.alert('Error', 'There was an error updating the appointment.');
            }
        }
    };

    const getEventColor = (status: number) => {
        switch (status) {
            case 0: return '#FFA500'; // Available
            case 1: return '#00FF00'; // Scheduled
            case 2: return '#0000FF'; // InProgress
            case 3: return '#800080'; // Completed
            case 4: return '#FF0000'; // Cancelled
            case 5: return '#808080'; // Absent
            default: return '#000000'; // Default color
        }
    };

    useEffect(() => {
        // Function to update the date and week state
        const updateDate = () => {
            const newToday = moment().isoWeekday();
            setToday(newToday);
            setCurrentWeek(moment().startOf('week').add(1, 'day'));
        };

        // Initial update
        updateDate();

        // Calculate the time remaining until midnight
        const now = moment();
        const nextMidnight = moment().startOf('day').add(1, 'day');
        const timeUntilMidnight = nextMidnight.diff(now);

        // Set timeout to update at midnight, then set an interval for subsequent days
        const timeout = setTimeout(() => {
            updateDate();
            setInterval(updateDate, 24 * 60 * 60 * 1000); // Every 24 hours
        }, timeUntilMidnight);

        return () => clearTimeout(timeout);
    }, []);

    useEffect(() => {
        console.log("Selected Day: ", selectedDay); // Debugging purpose to check selectedDay state
    }, [selectedDay]);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={router.back} style={styles.backButton}>
                    <Text style={styles.backButtonText}>←</Text>
                </TouchableOpacity>
                <Text style={styles.headerText}>Calendar</Text>
            </View>
            <Text style={styles.currentWeekText}>
                Current week: {currentWeek.startOf('isoWeek').format('DD/MM/YYYY')} - {currentWeek.endOf('isoWeek').format('DD/MM/YYYY')}
            </Text>

            <View style={styles.calendarHeader}>
                {daysOfWeek.map((day, index) => {
                    const date = currentWeek.clone().startOf('isoWeek').add(index, 'days').format('DD');
                    return (
                        <TouchableOpacity key={index} onPress={() => handleDayPress(index)} style={styles.dayContainer}>
                            <Text style={styles.dayText}>
                                {day}
                            </Text>
                            <Text style={[styles.dateText, currentWeek.clone().startOf('isoWeek').day(index + 1).isSame(moment(), 'day') && styles.todayHighlight]}>
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
                                    const eventStartHour = parseInt(moment(event.startTime).format('HH'), 10);
                                    const timeSlotStartHour = parseInt(item.key.split(':')[0], 10);

                                    // Condition to check if user is leader or show appointment slot if event.creatorId matches mentorId or lecturerId
                                    const shouldShowEvent = isLeader || (event.creatorId === mentorId || event.creatorId === lecturerId);

                                    if (eventStartHour === timeSlotStartHour && (shouldShowEvent)) {
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
                            <Text style={styles.modalText}>Meeting Address:</Text>
                            <TouchableOpacity onPress={() => Linking.openURL(selectedEvent.meetingAddress)}>
                                <Text style={[styles.modalText, { color: 'blue', textDecorationLine: 'underline' }]}>
                                    {selectedEvent.meetingAddress}
                                </Text>
                            </TouchableOpacity>
                            <Text style={styles.modalText}>
                                Created by: {selectedEvent.creatorName}
                            </Text>
                            {isLeader && selectedEvent.status === 0 && (
                                <View style={styles.buttonContainer}>
                                    <TouchableOpacity
                                        style={[styles.button, styles.buttonAttend]}
                                        onPress={() => setConfirmVisible(true)}
                                    >
                                        <Text style={styles.textStyle}>Attend</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.button, styles.buttonCancel]}
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
                            <Text style={styles.modalText}>Are you sure you want to attend this appointment?</Text>
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
        fontSize: 33,
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
        width: '80%',
    },
    button: {
        borderRadius: 20,
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
});

export default CalendarScreen;
