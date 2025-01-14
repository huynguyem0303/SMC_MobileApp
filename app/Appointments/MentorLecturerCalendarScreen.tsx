import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert, Modal, Linking, ActivityIndicator, TextInput, Switch } from 'react-native';
import moment from 'moment';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { checkToken } from '../../components/checkToken'; 
import { showSessionExpiredAlert } from '../../components/alertUtils'; 
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
    isDeleted: boolean;
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
interface Member {

    studentId: string;
    studentName: string;
    studentCode: string;
}

interface Attendance {
    id: string;
    studentId: string;
    status: number;
}

interface ApiResponse {
    status: boolean;
    message: string;
    data: {
        studentAttendances: Attendance[];
        team: {
            members: Member[];
        };
    };
}
interface SwitchValues {
    [key: string]: boolean;
}

interface AttendanceData {
    attendanceId: string;
    studentName: string | undefined;
    studentCode: string | undefined;
    status: number;
    studentId: string;
}





const MentorLecturerCalendarScreen = () => {
    const router = useRouter();
    const [selectedDate, setSelectedDate] = useState(moment().format('YYYY-MM-DD'));
    const [emptySlotModalVisible, setEmptySlotModalVisible] = useState(false);
    const [selectedSlotKey, setSelectedSlotKey] = useState<string | null>(null);
    const [currentWeek, setCurrentWeek] = useState(moment().startOf('isoWeek'));
    const [today, setToday] = useState<number>(moment().isoWeekday());
    const [selectedDay, setSelectedDay] = useState<number>(moment().isoWeekday());
    const [events, setEvents] = useState<EventsMap>({});
    const [isLeader, setIsLeader] = useState<boolean>(false);
    const [modalVisible, setModalVisible] = useState<boolean>(false);
    const [confirmVisible, setConfirmVisible] = useState<boolean>(false);
    const [cancelVisible, setCancelVisible] = useState<boolean>(false);
    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
    const [note, setNote] = useState('');
    const [meetingAddress, setMeetingAddress] = useState('');
    const [loading, setLoading] = useState(true);
    const [attendanceData, setAttendanceData] = useState<AttendanceData[]>([]);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [switchValues, setSwitchValues] = useState<{ [key: string]: boolean }>({});


    const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];


    const fetchEvents = async (startTime: string, endTime: string) => {
        try {
            const token = await checkToken();
            if (token === null) {
                showSessionExpiredAlert(router);
                return;
            }

            setEvents({});
            if (!token) {
                Alert.alert('No token found, please login.');
                return;
            }

            const storedId = await AsyncStorage.getItem('@accountid');
            const creatorId = storedId ? JSON.parse(storedId) : null;

            if (!creatorId) {
                console.log('Mentor ID or Lecturer ID is missing');
                return;
            }

            const response = await fetch('https://smnc.site/api/AppointmentSlots/Search', {
                method: 'POST',
                headers: {
                    'accept': '*/*',
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    startTime,
                    endTime,
                    creatorId: creatorId,
                }),
            });

            const data = await response.json();

            if (data && data.data) {
                // Filter the appointment slots that have "isDeleted": false
                const filteredData: EventsMap = {};
                Object.keys(data.data).forEach((key) => {
                    filteredData[key] = data.data[key].filter((slot: Event) => !slot.isDeleted);
                });
                setEvents(filteredData);

            } else {
                console.log('Unexpected data format:', data);
            }
        } catch (error) {
            console.log('Error fetching appointments:', error);
        } finally {
            setLoading(false);
        }
    };
    const handleCreateAppointmentSlot = async () => {
        // Start loading
        setLoading(true);

        // Validate note
        if (note.length > 200) {
            setLoading(false);
            setNote('');
            Alert.alert('Error', 'Note must not exceed 200 words.');
            return;
        }

        // Validate meeting address
        const urlRegex = /^(https?:\/\/)([A-Za-z0-9.-]+)\.([A-Za-z.]{2,6})([/\w .-]*)*\/?$/i;
        if (!urlRegex.test(meetingAddress)) {
            setLoading(false);
            setMeetingAddress('');
            Alert.alert('Error', 'Meeting address must be a valid URL.');
            return;
        }

        // Validate selected date
        if (!selectedDate) {
            setLoading(false);
            Alert.alert('Error', 'Please select a date for the appointment.');
            return;
        }

        const today = moment().startOf('day');
        const selected = moment(selectedDate, 'YYYY-MM-DD').startOf('day');

        if (selected.isBefore(today)) {
            setLoading(false);
            Alert.alert('Error', 'The selected date is in the past. Please select a future date.');
            return;
        }

        if (selectedSlotKey) {
            const [slotStart, slotEnd] = selectedSlotKey.split(' - ');
            if (selected.isSame(today, 'day')) {
                const currentTime = moment();
                const slotStartTime = moment(`${selectedDate} ${slotStart}`, 'YYYY-MM-DD HH:mm');

                if (slotStartTime.isBefore(currentTime.add(2, 'hours'))) {
                    setLoading(false);
                    Alert.alert('Error', 'The selected time slot is too soon. Please select a time slot at least 2 hours from now.');
                    return;
                }
            }

            const startTime = moment(`${selectedDate} ${slotStart}`, 'YYYY-MM-DD HH:mm').format('YYYY-MM-DDTHH:mm:ss');
            const endTime = moment(`${selectedDate} ${slotEnd}`, 'YYYY-MM-DD HH:mm').format('YYYY-MM-DDTHH:mm:ss');

            try {
                const token = await checkToken();
                if (token === null) {
                    showSessionExpiredAlert(router);
                    return;
                }

                const response = await fetch('https://smnc.site/api/AppointmentSlots', {
                    method: 'POST',
                    headers: {
                        'accept': '*/*',
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        startTime: startTime,
                        endTime: endTime,
                        note,
                        meetingAddress,
                    }),
                });

                if (response.ok) {
                    Alert.alert('Appointment slot created successfully!');
                    setEmptySlotModalVisible(false);
                    setNote('');
                    setMeetingAddress('');
                    setSelectedDate('');
                    await fetchEvents(currentWeek.startOf('isoWeek').format(), currentWeek.endOf('isoWeek').format());
                } else {
                    Alert.alert('Failed to create appointment slot.');
                }
            } catch (error) {
                // console.log('Error creating appointment slot:', error);
                Alert.alert('An error occurred while creating the appointment slot.');
            }
        } else {
            Alert.alert('No slot selected.');
        }

        // Stop loading
        setLoading(false);
    };

    const handleUpdateAppointmentSlot = async (id: any) => {
        setLoading(true);
        if (selectedEvent?.note != null) {
            setNote(selectedEvent?.note);

        }
        if (selectedEvent?.meetingAddress != null) {
            setMeetingAddress(selectedEvent?.meetingAddress);

        }
        // Validate note
        if (note.length > 200) {
            setLoading(false);
            setNote('');
            Alert.alert('Error', 'Note must not exceed 200 words.');
            return;
        }
        // Validate meeting address
        const urlRegex = /^(https?:\/\/)([A-Za-z0-9.-]+)\.([A-Za-z.]{2,6})([/\w .-]*)*\/?$/i;

        if (!urlRegex.test(meetingAddress)) {
            setLoading(false);
            setMeetingAddress('');
            Alert.alert('Error', 'Meeting address must be a valid URL.');
            return;
        }
        if (selectedSlotKey) {
            const [slotStart, slotEnd] = selectedSlotKey.split(' - ');
            // console.log(slotStart);
            const now = moment();
            // console.log(now);
            // Construct date-time in ISO 8601 format
            const startTime = moment(`${selectedDate} ${slotStart}`, 'YYYY-MM-DD HH:mm').format('YYYY-MM-DDTHH:mm:ss');
            const endTime = moment(`${selectedDate} ${slotEnd}`, 'YYYY-MM-DD HH:mm').format('YYYY-MM-DDTHH:mm:ss');

            try {
                const token = await checkToken();
                if (token === null) {
                    showSessionExpiredAlert(router);
                    return;
                }

                const response = await fetch(`https://smnc.site/api/AppointmentSlots/${id}`, {
                    method: 'PUT',
                    headers: {
                        'accept': '*/*',
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        startTime,
                        endTime,
                        note,
                        meetingAddress,
                        id: id,
                        isDeleted: false,
                    }),
                });

                if (response.status === 204) {
                    Alert.alert('Update Successful', 'The appointment slot has been updated successfully.');
                    setNote('');
                    setMeetingAddress('');
                    setModalVisible(false);
                    await fetchEvents(currentWeek.startOf('isoWeek').format(), currentWeek.endOf('isoWeek').format());
                } else {
                    Alert.alert('Update Failed', 'Failed to update the appointment slot.');
                }
            } catch (error) {
                // console.log('Error updating appointment slot:', error);
                Alert.alert('An error occurred while updating the appointment slot.');
            }
        } else {
            Alert.alert('No slot selected.');
        }
        setLoading(false);
    };

    const handleDeleteAppointmentSlot = async (id: any) => {
        setLoading(true);
        try {
            const token = await checkToken();
            if (token === null) {
                showSessionExpiredAlert(router);
                return;
            }

            const response = await fetch(`https://smnc.site/api/AppointmentSlots/${id}`, {
                method: 'DELETE',
                headers: {
                    'accept': '*/*',
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.status === 204) {
                Alert.alert('Delete Successful', 'The appointment slot has been deleted successfully.');
                setModalVisible(false);
                // Refresh or update the data
                await fetchEvents(currentWeek.startOf('isoWeek').format(), currentWeek.endOf('isoWeek').format());
            } else {
                Alert.alert('Delete Failed', 'Failed to delete the appointment slot.');

            }
        } catch (error) {
            // console.log('Error deleting appointment slot:', error);
            Alert.alert('An error occurred while deleting the appointment slot.');
        }
        setLoading(false);
    };

    const confirmDelete = (id: any) => {
        Alert.alert(
            'Confirm Delete',
            'Are you sure you want to delete this appointment slot?',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Confirm', onPress: () => handleDeleteAppointmentSlot(id) },
            ],
            { cancelable: false }
        );
    };
    const handleJoinMeeting = async (id: any) => {
        try {
            if (selectedSlotKey) {
                const [slotStart, slotEnd] = selectedSlotKey.split(' - ');
                const now = moment().format('YYYY-MM-DDTHH:mm:ss');
                // Format startTime and endTime
                const startTime = moment(`${selectedDate} ${slotStart}`, 'YYYY-MM-DD HH:mm')
                    .subtract(15, 'minutes')
                    .format('YYYY-MM-DDTHH:mm:ss');
                const endTime = moment(`${selectedDate} ${slotEnd}`, 'YYYY-MM-DD HH:mm')
                    .format('DD-MM-YYYYTHH:mm:ss');
                // console.log(`end time: ${endTime}`);
                // Convert formatted strings back to moment objects for comparison
                const nowMoment = moment(now, 'YYYY-MM-DDTHH:mm:ss');
                const startTimeMoment = moment(startTime, 'YYYY-MM-DDTHH:mm:ss');
                const endTimeMoment = moment(endTime, 'DD-MM-YYYYTHH:mm:ss');
                // console.log(`Current time format: ${nowMoment}`);
                // console.log(`start time: ${startTimeMoment}`);
                // console.log(`end time: ${endTimeMoment}`);
                // Check if now is between startTime and endTime
                if (!nowMoment.isBetween(startTimeMoment, endTimeMoment)) {
                    Alert.alert('Error', `Current time ${nowMoment.format('DD-MM-YYYY HH:mm')} is not within the slot time range ${startTimeMoment.format('DD-MM-YYYY HH:mm')} - ${endTimeMoment.format('DD-MM-YYYY HH:mm')}`);
                    setLoading(false);
                    return;
                }

            }
            setLoading(true);
            const token = await checkToken();
            if (token === null) {
                showSessionExpiredAlert(router);
                return;
            }

            const response = await fetch(`https://smnc.site/api/AppointmentSlots/${id}/JoinMeeting`, {
                method: 'POST',
                headers: {
                    'accept': '*/*',
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: '',
            });

            if (response.status === 200) {
                setModalVisible(false);
                if (meetingAddress) {
                    Linking.openURL(meetingAddress);
                    await fetchEvents(currentWeek.startOf('isoWeek').format(), currentWeek.endOf('isoWeek').format());
                } else {
                    Alert.alert('Error', 'Meeting address is missing');
                }
            } else {
                Alert.alert('Join Meeting Failed', 'Failed to join the meeting.');
            }
        } catch (error) {
            // console.log('Error joining meeting:', error);
            Alert.alert('An error occurred while joining the meeting.');
        } finally {
            setLoading(false);
        }
    };


    const confirmJoinMeeting = (id: any) => {
        Alert.alert(
            'Join Meeting',
            'Are you sure you want to join this meeting?',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Confirm', onPress: () => handleJoinMeeting(id) },
            ],
            { cancelable: false }
        );
    };

    const getAttendance = async (eventId: string) => {
        try {
            const token = await checkToken();
            if (token === null) {
                showSessionExpiredAlert(router);
                return;
            }

            const response = await fetch(`https://smnc.site/api/AppointmentSlots/${eventId}`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
            });
    
            const data: ApiResponse = await response.json();
            // console.log(eventId);
            
            if (data.status) {
                const studentAttendances = data.data.studentAttendances
                    .map((attendance: Attendance) => {
                        const member = data.data.team.members.find((member: Member) => member.studentId === attendance.studentId);
                        return {
                            attendanceId: attendance.id,
                            studentName: member?.studentName || 'Unknown',
                            studentCode: member?.studentCode || 'N/A',
                            status: attendance.status,
                            studentId: attendance.studentId,
                        };
                    })
                    .filter(attendance => attendance.studentName !== 'Unknown'); // Exclude unknown students
    
                const initialSwitchValues = studentAttendances.reduce((acc, curr) => {
                    acc[curr.studentId] = curr.status === 1;
                    return acc;
                }, {} as SwitchValues);
    
                setAttendanceData(studentAttendances);
                setSwitchValues(initialSwitchValues);
                setIsModalVisible(true);
            } else {
                console.log(data.message);
            }
        } catch (error) {
            console.log('Error fetching attendance:', error);
        }
    };
    
    
    
    
    

    const updateStatus = async (id: string, newStatus: number): Promise<boolean> => {
        try {
            const token = await checkToken();
            if (token === null) {
                showSessionExpiredAlert(router);
          
            }
            const url = `https://smnc.site/api/StudentAttendance/${id}`;

            const response = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Accept': '*/*',
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ status: newStatus }),
            });

            const data = await response.json();

            if (response.ok) {
                Alert.alert('Success', 'Attendance status updated successfully!');
                return true;
            } else {
                const errorMessage = data.errors?.[0] || data.message || 'Failed to update attendance status.';
                Alert.alert('Error', 'Slot not in progress, or slot time has passed more than 1 hours ago.');
                return false;
            }
        } catch (error) {
            // console.log('Error updating status:', error);
            Alert.alert('Error', 'An unexpected error occurred.');
            return false;
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
    const handleDayPress = (index: any) => {
        const date = currentWeek.clone().startOf('isoWeek').add(index, 'days').format('YYYY-MM-DD');
        setSelectedDate(date);
        setSelectedDay(index + 1); // Keep this line if you need to update the selected day as well

        // console.log('Selected Date:', date); // This will log the selected date in YYYY-MM-DD format
    };


    const handleEventPress = (event: Event, slotKey: string) => {
        setSelectedEvent(event);
        if (event.note) {
            setNote(event.note ?? "");
        }

        if (event.meetingAddress) {
            setMeetingAddress(event.meetingAddress);
        }
        setSelectedSlotKey(slotKey);
        setModalVisible(true);
    };

    const handleEmptySlotPress = (slotKey: string) => {
        setNote('');
        setMeetingAddress('');
        setSelectedSlotKey(slotKey);
        setEmptySlotModalVisible(true);
    };


    const handlePrevWeek = () => {
        const newWeek = currentWeek.clone().subtract(1, 'week');
        setCurrentWeek(newWeek);
        const startTime = newWeek.startOf('isoWeek').format();
        const endTime = newWeek.endOf('isoWeek').format();
        fetchEvents(startTime, endTime);
    };

    const handleNextWeek = () => {
        const newWeek = currentWeek.clone().add(1, 'week');
        setCurrentWeek(newWeek);
        const startTime = newWeek.startOf('isoWeek').format();
        const endTime = newWeek.endOf('isoWeek').format();
        fetchEvents(startTime, endTime);
    };
    useEffect(() => {
        moment.updateLocale('en', {
            week: {
                dow: 1, // Monday is the first day of the week.
                doy: 4  // The week that contains Jan 4th is the first week of the year.
            }
        });

        const fetchInitialEvents = async () => {
            const startTime = currentWeek.startOf('isoWeek').format();
            const endTime = currentWeek.endOf('isoWeek').format();
            await fetchEvents(startTime, endTime);
        };

        fetchInitialEvents();
    }, [currentWeek]);

    useEffect(() => {
        const updateDate = async () => {
            const newToday = moment().isoWeekday();
            setToday(newToday);
            const newCurrentWeek = moment().startOf('isoWeek');
            setCurrentWeek(newCurrentWeek);
            const startTime = newCurrentWeek.startOf('isoWeek').format();
            const endTime = newCurrentWeek.endOf('isoWeek').format();
            await fetchEvents(startTime, endTime);
        };

        updateDate();

        const now = moment();
        const nextMidnight = moment().startOf('day').add(1, 'day');
        const timeUntilMidnight = nextMidnight.diff(now);

        const timeout = setTimeout(() => {
            updateDate();
            setInterval(updateDate, 24 * 60 * 60 * 1000); // Every 24 hours
        }, timeUntilMidnight);

        return () => {
            clearTimeout(timeout);
        };
    }, []);



    useEffect(() => {
        // console.log("Selected Date: ", selectedDate);
        // console.log("Selected Day: ", selectedDay);
    }, [selectedDay, selectedDate]);
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
                renderItem={({ item }) => {
                    let hasEvent = false;
                    const eventElements: JSX.Element[] = [];

                    Object.keys(events).forEach(day => {
                        const eventDate = moment(day, "dddd YYYY-MM-DD").isoWeekday();
                        if (eventDate === selectedDay) {
                            events[day].forEach((event: Event) => {
                                const eventStart = moment(event.startTime).format('HH:mm');
                                const eventEnd = moment(event.endTime).format('HH:mm');
                                const timeSlotStart = moment(item.key.split(' - ')[0], 'HH:mm').format('HH:mm');
                                const timeSlotEnd = moment(item.key.split(' - ')[1], 'HH:mm').format('HH:mm');

                                if (eventStart === timeSlotStart && eventEnd === timeSlotEnd) {
                                    hasEvent = true;
                                    eventElements.push(
                                        <TouchableOpacity key={event.id} style={[styles.sampleEvent, { backgroundColor: getEventColor(event.status) }]} onPress={() => handleEventPress(event, item.key)}>
                                            <Text style={styles.eventText}>{event.note}</Text>
                                        </TouchableOpacity>
                                    );
                                }
                            });
                        }
                    });

                    if (!hasEvent) {
                        eventElements.push(
                            <TouchableOpacity key={`empty-${item.key}`} style={styles.sampleEvent} onPress={() => handleEmptySlotPress(item.key)}>
                                <Text style={styles.eventTextEmtpy}>empty slot</Text>
                            </TouchableOpacity>
                        );
                    }

                    return (
                        <View style={styles.timeSlotRow}>
                            <View style={styles.timeSlot}>
                                <Text style={styles.timeText}>{item.key}</Text>
                            </View>
                            <View style={styles.eventSlot}>
                                {eventElements}
                            </View>
                        </View>
                    );
                }}
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
                            {loading ? (
                                <ActivityIndicator size="large" color="#003366" />
                            ) : (
                                <>
                                    <Text style={styles.modalText}>Meeting Address:</Text>
                                    <TextInput
                                        style={styles.input}
                                        onChangeText={setMeetingAddress}
                                        value={meetingAddress}
                                        placeholder="Meeting Address"
                                    />

                                    <Text style={styles.modalText}>Note:</Text>
                                    <TextInput
                                        style={styles.input}
                                        onChangeText={setNote}
                                        value={note}
                                        placeholder="Note"
                                    />
                                    <Text style={styles.modalText}>
                                        Status: {AppointmentSlotStatus[selectedEvent.status]}
                                    </Text>
                                    <TouchableOpacity
                                        style={[styles.button, styles.saveButton]}
                                        onPress={() => handleUpdateAppointmentSlot(selectedEvent.id)}
                                    >
                                        <Text style={styles.textStyle}>Update</Text>
                                    </TouchableOpacity>
                                    {selectedEvent.status === AppointmentSlotStatus.Available && (
                                        <TouchableOpacity
                                            style={[styles.button, styles.deleteButton]}
                                            onPress={() => confirmDelete(selectedEvent.id)}
                                        >
                                            <Text style={styles.textStyle}>Delete</Text>
                                        </TouchableOpacity>
                                    )}
                                    {selectedEvent.status === AppointmentSlotStatus.Scheduled && (
                                        <TouchableOpacity
                                            style={[styles.button, styles.joinButton]}
                                            onPress={() => confirmJoinMeeting(selectedEvent.id)}
                                        >
                                            <Text style={styles.textStyle}>Start Meeting</Text>
                                        </TouchableOpacity>
                                    )}
                                    {selectedEvent.status === AppointmentSlotStatus.Completed || selectedEvent.status === AppointmentSlotStatus.InProgress && (
                                    <TouchableOpacity
                                        style={[styles.button, styles.joinButton]}
                                        onPress={() => getAttendance(selectedEvent.id)}
                                    >
                                        <Text style={styles.textStyle}>Get Attendances</Text>
                                    </TouchableOpacity>
                                     )}
                                    <TouchableOpacity
                                        style={[styles.button, styles.buttonClose]}
                                        onPress={() => setModalVisible(!modalVisible)}
                                    >
                                        <Text style={styles.textStyle}>Close</Text>
                                    </TouchableOpacity>
                                </>
                            )}
                        </View>
                    </View>
                </Modal>


            )}

            <Modal
                animationType="slide"
                transparent={true}
                visible={emptySlotModalVisible}
                onRequestClose={() => {
                    setEmptySlotModalVisible(!emptySlotModalVisible);
                }}
            >
                <View style={styles.centeredView}>
                    <View style={styles.modalView}>
                        {loading ? (
                            <ActivityIndicator size="large" color="#003366" />
                        ) : (
                            <>
                                <Text style={styles.modalText}>Create Appointment Slot</Text>
                                <TextInput
                                    style={styles.input}
                                    onChangeText={setNote}
                                    value={note}
                                    placeholder="Note"
                                />
                                <TextInput
                                    style={styles.input}
                                    onChangeText={setMeetingAddress}
                                    value={meetingAddress}
                                    placeholder="Meeting Address"
                                />
                                <TouchableOpacity
                                    style={[styles.button, styles.saveButton]}
                                    onPress={handleCreateAppointmentSlot}
                                >
                                    <Text style={styles.textStyle}>Create</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.button, styles.buttonClose]}
                                    onPress={() => setEmptySlotModalVisible(!emptySlotModalVisible)}
                                >
                                    <Text style={styles.textStyle}>Close</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </View>
            </Modal>
            <Modal
                visible={isModalVisible}
                animationType="slide"
                onRequestClose={() => setIsModalVisible(false)}
            >
                <View style={{ padding: 20 }}>
                    {attendanceData.map((attendance, index) => (
                        <View key={index} style={{ marginBottom: 10 }}>
                            <Text>Student Name: {attendance.studentName}</Text>
                            <Text>Student Code: {attendance.studentCode}</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Text>Student Attendance: </Text>
                                <Switch
                                    value={switchValues[attendance.studentId]}
                                    onValueChange={async (value) => {
                                        const oldStatus = switchValues[attendance.studentId];
                                        setSwitchValues({
                                            ...switchValues,
                                            [attendance.studentId]: value,
                                        });

                                        const success = await updateStatus(attendance.attendanceId, value ? 1 : 0);

                                        if (!success) {
                                            setSwitchValues({
                                                ...switchValues,
                                                [attendance.studentId]: oldStatus,
                                            });
                                        }
                                    }}
                                />
                            </View>
                        </View>
                    ))}
                    <TouchableOpacity
                        style={[styles.button, styles.buttonClose]}
                        onPress={() => setIsModalVisible(!isModalVisible)}
                    >
                        <Text style={styles.textStyle}>Close</Text>
                    </TouchableOpacity>
                </View>
            </Modal>
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
        backgroundColor: '#003366',
        borderRadius: 5,
        padding: 5,
        marginVertical: 2,
    },
    eventTextEmtpy: {
        color: '#ffff',
        fontWeight: 'bold',
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
        borderRadius: 10,
        padding: 10,
        elevation: 2,
        width: "100%",
        alignItems: "center",
    },
    saveButton: {
        marginTop: 15,
        backgroundColor: '#28a745',
    },
    deleteButton: {
        marginTop: 15,
        backgroundColor: '#dc3545',
    },
    buttonClose: {
        marginTop: 15,
        backgroundColor: '#6c757d',
    },

    textStyle: {
        color: 'white',
        fontWeight: 'bold',
        textAlign: 'center',
    },
    modalText: {
        marginTop: 10,
        marginBottom: 15,
        textAlign: 'center',
    },
    creatorText: {
        marginTop: 10,
        fontSize: 14,
        color: '#666',
        fontStyle: 'italic',
    },
    cancelButton: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 20,
        backgroundColor: '#d9534f',
        borderRadius: 5,
        alignItems: 'center',
        marginHorizontal: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
        elevation: 2,
    },
    input: {
        marginBottom:15,
        height: 40,
        borderColor: 'gray',
        borderWidth: 1,
        paddingHorizontal: 10,
        borderRadius: 5,           // Rounded corners
        backgroundColor: '#f9f9f9', // Light background color
        fontSize: 16,              // Increased font size
        color: '#333',             // Darker text color
        shadowColor: '#000',       // Shadow for iOS
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 2,              // Shadow for Android
    },
    joinButton: {
        marginTop: 15,
        backgroundColor: '#007bff',
    },
    statusAbsent: {
        color: 'red',
    },
    statusPresent: {
        color: 'green',
    },
});

export default MentorLecturerCalendarScreen;
