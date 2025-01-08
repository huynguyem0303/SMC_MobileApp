import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Modal, TextInput, Button, Alert, Image, Platform } from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useLocalSearchParams } from 'expo-router';
import RNPickerSelect from 'react-native-picker-select';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { useIsFocused } from '@react-navigation/native';
import moment from 'moment';

interface Task {
    id: string;
    name: string;
    description: string;
    priority: number;
    startTime: string;
    endTime: string;
    reminder: number;
    status: TaskStatusEnum;
    isDeleted: boolean;
    members: { userId: string, name: string, avatarUrl: string | null, role: string }[];
}

enum TaskStatusEnum {
    NotStarted,
    InProgress,
    Completed,
    Postponed,
    Cancelled,
    NeedRevision,
}

enum ReminderEnum {
    None = 0,
    OneDayBefore = 1,
    TwoDaysBefore = 2,
    ThreeDaysBefore = 3,
    OneWeekBefore = 7,
    TwoWeeksBefore = 14,
    OneMonthBefore = 30
}

const TaskListScreen = () => {
    const [tasks, setTasks] = useState<{ weekNumber: number, tasks: Task[] }[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [projectId, setProjectId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false); // State for modal visibility
    const [assignModalVisible, setAssignModalVisible] = useState<{ [key: string]: boolean }>({});
    const [taskName, setTaskName] = useState('');
    const [taskDescription, setTaskDescription] = useState('');
    const [taskStartTime, setTaskStartTime] = useState(new Date());
    const [taskEndTime, setTaskEndTime] = useState(new Date(Date.now() + 24 * 60 * 60 * 1000));
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);
    const [taskReminder, setTaskReminder] = useState(ReminderEnum.None);
    const [taskPriority, setTaskPriority] = useState(0);
    const { courseId, semesterId } = useLocalSearchParams();
    const router = useRouter();
    const [isLeader, setIsLeader] = useState(false);
    const isFocused = useIsFocused();
    const [isStartDateTimeChosen, setIsStartDateTimeChosen] = useState(false);
    const [isEndDateTimeChosen, setIsEndDateTimeChosen] = useState(false);
    const [showStartTimePicker, setShowStartTimePicker] = useState(false);
    const [showEndTimePicker, setShowEndTimePicker] = useState(false);
    const today = moment();

    useEffect(() => {
        fetchTasks();
    }, [courseId, semesterId, isFocused]);

    const fetchTasks = async () => {
        try {
            const token = await AsyncStorage.getItem('@userToken');
            const storedIsLeader = await AsyncStorage.getItem('@isLeader');
            setIsStartDateTimeChosen(false);
            setIsEndDateTimeChosen(false);
            setIsLeader(storedIsLeader === 'true');
            if (!token) {
                throw new Error('No token found');
            }
            const projectResponse = await fetch(`https://smnc.site/api/Projects/CurrentUserProject?courseId=${courseId}&semesterId=${semesterId}`, {
                headers: {
                    'accept': 'text/plain',
                    'Authorization': `Bearer ${token}`,
                },
            });

            const projectData = await projectResponse.json();
            if (projectData.status && projectData.data.data && projectData.data.data.length > 0) {
                const projectId = projectData.data.data[0].id;
                setProjectId(projectId);
                const response = await fetch(`https://smnc.site/api/ProjectTasks?projectId=${projectId}&isGroupByWeek=true&orderByStartTime=true`, {
                    headers: {
                        'accept': '*/*',
                        'Authorization': `Bearer ${token}`,
                    },
                });

                const data = await response.json();

                if (data.status && data.data) {
                    // Sort tasks by priority within each week and filter tasks where isDeleted is false
                    const sortedTasks = data.data.map((week: { weekNumber: number, tasks: Task[] }) => {
                        const filteredTasks = week.tasks.filter(task => !task.isDeleted);
                        const sortedWeekTasks = filteredTasks.sort((a, b) => a.priority - b.priority);
                        return {
                            ...week,
                            tasks: sortedWeekTasks,
                        };
                    });
                    setTasks(sortedTasks);
                } else {
                    setError(data.message || 'Failed to fetch tasks.');
                }
            }
        } catch (error) {
            console.error('Error fetching tasks:', error);
            setError('Failed to fetch tasks.');
        } finally {
            setLoading(false);
        }
    };


    const handleAddTask = async () => {
        // Validate that the taskName and taskDescription do not contain special characters and length <= 200 words
        const specialCharPattern = /[^a-zA-Z0-9\s]/;
        if (specialCharPattern.test(taskName) || specialCharPattern.test(taskDescription)) {
            Alert.alert('Validation Error', 'Task name and description should not contain special characters.');
            return;
        }

        const wordCount = (text: any) => text.trim().split(/\s+/).length;
        if (wordCount(taskName) > 200 || wordCount(taskDescription) > 200) {
            Alert.alert('Validation Error', 'Task name and description should not exceed 200 words.');
            return;
        }

        if (taskName.trim() === '' || taskDescription.trim() === '') {
            Alert.alert('Validation Error', 'Task name and description cannot be empty.');
            return;
        }

        if (taskEndTime <= taskStartTime) {
            Alert.alert('Error', 'End time must be greater than start time.');
            return;
        }
        if (taskEndTime <= new Date()) {
            Alert.alert('Error', 'End date must be greater than today date.');
            return;
        }

        try {
            const token = await AsyncStorage.getItem('@userToken');
            const response = await fetch('https://smnc.site/api/ProjectTasks', {
                method: 'POST',
                headers: {
                    'accept': '*/*',
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: taskName,
                    description: taskDescription,
                    startTime: taskStartTime.toISOString(),
                    endTime: taskEndTime.toISOString(),
                    reminder: taskReminder,
                    priority: taskPriority,
                    projectId: projectId
                }),
            });

            const data = await response.json();

            if (response.ok) {
                Alert.alert('Success', 'Task added successfully.');
                setModalVisible(false);
                setTaskName('');
                setTaskDescription('');
                setTaskStartTime(new Date());
                setTaskEndTime(new Date(Date.now() + 24 * 60 * 60 * 1000));
                setTaskReminder(ReminderEnum.None);
                setTaskPriority(0);
                fetchTasks(); // Reload the page to see the new task
            } else {
                const validationErrors = data.errors;
                let errorMessage = data.message;
                if (validationErrors) {
                    errorMessage += '\n' + Object.values(validationErrors).flat().join('\n');
                }
                Alert.alert('Error', errorMessage);
            }
        } catch (error) {
            Alert.alert('Error', 'An error occurred while adding the task.');
        }
    };


    const handleAssignTask = async (taskId: string) => {
        try {
            const token = await AsyncStorage.getItem('@userToken');
            const memberId = await AsyncStorage.getItem('@memberid');
            console.log(memberId);
            if (!token || !memberId) {
                throw new Error('Token or member ID not found');
            }

            const response = await fetch(`https://smnc.site/api/ProjectTasks/${taskId}/AssignTeamMember`, {
                method: 'POST',
                headers: {
                    'accept': '*/*',
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify([JSON.parse(memberId)]),
            });

            if (response.ok) {
                Alert.alert('Success', 'Task assigned successfully.');
                fetchTasks(); // Reload the page to see the updated tasks
            } else {
                const data = await response.json();
                const validationErrors = data.errors;
                let errorMessage = data.message;
                if (validationErrors) {
                    errorMessage += '\n' + Object.values(validationErrors).flat().join('\n');
                }
                Alert.alert('Error', 'You have assigned this task already');
            }
        } catch (error) {
            Alert.alert('Error', 'An error occurred while assigning the task.');
            console.log(error);
        }
    };

    const openAssignModal = (taskId: string) => {
        setAssignModalVisible(prevState => ({ ...prevState, [taskId]: true }));
    };

    const closeAssignModal = (taskId: string) => {
        setAssignModalVisible(prevState => ({ ...prevState, [taskId]: false }));
    };

    const handleDetail = (taskId: string) => {
        router.push({
            pathname: '/Tasks/TaskDetailScreen',
            params: { taskId },
        });
    };
    const handleDeleteTask = (taskId: string) => {
        Alert.alert(
            'Confirm Delete',
            'Are you sure you want to delete this task?',
            [
                {
                    text: 'Cancel',
                    onPress: () => console.log('Cancel Pressed'),
                    style: 'cancel'
                },
                {
                    text: 'Confirm',
                    onPress: () => deleteTask(taskId)
                }
            ],
            { cancelable: false }
        );
    };

    const deleteTask = async (taskId: string) => {
        try {
            const token = await AsyncStorage.getItem('@userToken');
            const response = await fetch(`https://smnc.site/api/ProjectTasks/${taskId}`, {
                method: 'DELETE',
                headers: {
                    'accept': '*/*',
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.ok) {
                Alert.alert('Success', 'Task deleted successfully.');
                fetchTasks(); // Refresh tasks after deletion
            } else {
                const data = await response.json();
                Alert.alert('Error', data.message || 'Failed to delete task.');
            }
        } catch (error) {
            Alert.alert('Error', 'An error occurred while deleting the task.');
        }
    };

    const renderAssignModal = (taskId: string) => (
        <Modal
            animationType="slide"
            transparent={true}
            visible={assignModalVisible[taskId] || false}
            onRequestClose={() => closeAssignModal(taskId)}
        >
            <View style={styles.popupContainer}>
                <View style={styles.popupContent}>
                    <Text style={styles.modalText}>Assign Task</Text>
                    <Text style={styles.modalDescription}>Are you sure you want to assign this task?</Text>
                    <View style={styles.popupButtonContainer}>
                        <TouchableOpacity style={styles.cancelButton} onPress={() => closeAssignModal(taskId)}>
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.confirmButton} onPress={() => { closeAssignModal(taskId); handleAssignTask(taskId); }}>
                            <Text style={styles.confirmButtonText}>OK</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );

    const getStatusColor = (status: TaskStatusEnum) => {
        switch (status) {
            case TaskStatusEnum.NotStarted:
                return '#808080'; // Gray
            case TaskStatusEnum.InProgress:
                return '#FFA500'; // Orange
            case TaskStatusEnum.Completed:
                return '#008000'; // Green
            case TaskStatusEnum.Postponed:
                return '#FFA500'; // Orange
            case TaskStatusEnum.Cancelled:
                return '#FF0000'; // Red
            case TaskStatusEnum.NeedRevision:
                return '#FFFF00'; // Yellow
            default:
                return '#000000'; // Black
        }
    };

    if (loading) {
        return (
            <View style={styles.container}>
                <Text>Loading...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.container}>
                <Text>{error}</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Text style={styles.backButtonText}>←</Text>
                </TouchableOpacity>
                <Text style={styles.headerText}>Task List</Text>
            </View>
            <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.addButton}>
                <Image source={require('../../assets/images/add-icon.png')} style={styles.addIcon} />
            </TouchableOpacity>
            <ScrollView contentContainerStyle={styles.tasksScroll}>
                {tasks.map((week, index) => (
                    <View key={index} style={styles.weekContainer}>
                        <Text style={styles.weekTitle}>Week {week.weekNumber}</Text>
                        {week.tasks.map((task) => {
                            const endTime = moment(task.endTime);
                            const isEndTimePast = endTime < moment();
                            const showAlert = task.reminder !== 0 && task.status !== TaskStatusEnum.Completed && endTime.diff(moment(), 'days') <= task.reminder && endTime >= moment();
                            return (
                                <TouchableOpacity key={`task-${task.id}`} onPress={() => handleDetail(task.id)}>
                                    <View style={styles.task}>
                                        <View style={styles.taskDetails}>
                                            <Text style={styles.taskTitle}>{task.name}</Text>
                                            <Text style={styles.taskDescription}>
                                                Done by:
                                                {task.members.map((member, i) =>
                                                    i === 0 ? member.name : `, ${member.name}`
                                                ).join('')}
                                            </Text>

                                            {isEndTimePast && (
                                                <Text style={styles.alertText}>
                                                    Expired task
                                                </Text>
                                            )}
                                            {showAlert && (
                                                <Text style={styles.alertText}>
                                                    Reminder: Task due soon!
                                                </Text>
                                            )}
                                        </View>
                                        <View style={styles.taskOptionsContainer}>
                                            <TouchableOpacity onPress={() => openAssignModal(task.id)}>
                                                <Text style={styles.moreOptions}>...</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity onPress={() => handleDeleteTask(task.id)}>
                                                <Image source={require('../../assets/images/trash-icon.png')} style={styles.icon} />
                                            </TouchableOpacity>
                                            <View style={[styles.statusDot, { backgroundColor: getStatusColor(task.status) }]} />
                                        </View>
                                        {renderAssignModal(task.id)}
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                ))}
            </ScrollView>

            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <ScrollView contentContainerStyle={styles.modalView}>
                    <Text style={styles.modalText}>Add New Task</Text>
                    <TextInput
                        placeholder="Task Name"
                        value={taskName}
                        onChangeText={setTaskName}
                        style={styles.input}
                    />
                    <TextInput
                        placeholder="Description"
                        value={taskDescription}
                        onChangeText={setTaskDescription}
                        style={styles.input}
                    />
                    <Text style={styles.label}>Start Date and Time</Text>
                    <TouchableOpacity onPress={() => setShowStartPicker(true)} style={styles.dateInput}>
                        <Text>{isStartDateTimeChosen ? new Date(taskStartTime).toLocaleString('en-GB', { timeZone: 'Europe/London', hour12: false }) : 'Choose Date and Time'}</Text>
                    </TouchableOpacity>
                    {showStartPicker && (
                        <DateTimePicker
                            value={taskStartTime}
                            mode="date"
                            display="default"
                            onChange={(event, date) => {
                                if (date && event.type === 'set') {
                                    const adjustedDate = new Date(date.getTime() - date.getTimezoneOffset() * 60 * 1000);
                                    setTaskStartTime(adjustedDate);
                                    setShowStartPicker(false);
                                    setShowStartTimePicker(true);
                                }
                            }}
                        />
                    )}
                    {showStartTimePicker && (
                        <DateTimePicker
                            value={taskStartTime}
                            mode="time"
                            display="default"
                            onChange={(event, time) => {
                                if (time && event.type === 'set') {
                                    // console.log('Time:', time);
                                    const newStartTime = new Date(taskStartTime);
                                    newStartTime.setHours(time.getHours(), time.getMinutes());
                                    const adjustedTime = new Date(newStartTime.getTime() - newStartTime.getTimezoneOffset() * 60 * 1000);
                                    setTaskStartTime(adjustedTime);
                                    // console.log('Selected Time:', adjustedTime);
                                    setIsStartDateTimeChosen(true);
                                    setShowStartTimePicker(false);
                                }
                            }}
                        />
                    )}
                    <Text style={styles.label}>End Date and Time</Text>
                    <TouchableOpacity onPress={() => setShowEndPicker(true)} style={styles.dateInput}>
                        <Text>{isEndDateTimeChosen ? new Date(taskEndTime).toLocaleString('en-GB', { timeZone: 'Europe/London', hour12: false }) : 'Choose Date and Time'}</Text>
                    </TouchableOpacity>
                    {showEndPicker && (
                        <DateTimePicker
                            value={taskEndTime}
                            mode="date"
                            display="default"
                            onChange={(event, date) => {
                                if (date && event.type === 'set') {
                                    const adjustedDate = new Date(date.getTime() - date.getTimezoneOffset() * 60 * 1000);
                                    setTaskEndTime(adjustedDate);
                                    setShowEndPicker(false);
                                    setShowEndTimePicker(true);
                                }
                            }}
                        />
                    )}
                    {showEndTimePicker && (
                        <DateTimePicker
                            value={taskEndTime}
                            mode="time"
                            display="default"
                            onChange={(event, time) => {
                                if (time && event.type === 'set') {
                                    // console.log('Time:', time);
                                    const newEndTime = new Date(taskEndTime);
                                    newEndTime.setHours(time.getHours(), time.getMinutes());
                                    const adjustedTime = new Date(newEndTime.getTime() - newEndTime.getTimezoneOffset() * 60 * 1000);
                                    setTaskEndTime(adjustedTime);
                                    // console.log('Selected Time:', adjustedTime);
                                    setIsEndDateTimeChosen(true);
                                    setShowEndTimePicker(false);
                                }
                            }}
                        />
                    )}
                    <Text style={styles.label}>Reminder</Text>
                    <View style={styles.pickerContainer}>
                        <RNPickerSelect
                            value={taskReminder}
                            onValueChange={(itemValue) => setTaskReminder(itemValue)}
                            items={[
                                { label: 'None', value: ReminderEnum.None },
                                { label: 'One Day Before', value: ReminderEnum.OneDayBefore },
                                { label: 'Two Days Before', value: ReminderEnum.TwoDaysBefore },
                                { label: 'Three Days Before', value: ReminderEnum.ThreeDaysBefore },
                                { label: 'One Week Before', value: ReminderEnum.OneWeekBefore },
                                { label: 'Two Weeks Before', value: ReminderEnum.TwoWeeksBefore },
                                { label: 'One Month Before', value: ReminderEnum.OneMonthBefore },
                            ]}
                            style={pickerSelectStyles}
                        />
                    </View>
                    <Text style={styles.label}>Priority</Text>
                    <View style={styles.pickerContainer}>
                        <RNPickerSelect
                            value={taskPriority}
                            onValueChange={(itemValue) => setTaskPriority(itemValue)}
                            items={[
                                { label: 'Very High', value: 0 },
                                { label: 'High', value: 1 },
                                { label: 'Medium', value: 2 },
                                { label: 'Low', value: 3 },
                            ]}
                            style={pickerSelectStyles}
                        />
                    </View>
                    <View style={styles.buttonContainer}>
                        <TouchableOpacity style={styles.saveButton} onPress={handleAddTask}>
                            <Text style={styles.saveButtonText}>Save</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)}>
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
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
    headerText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        textAlign: 'center',
        flex: 1,
        marginTop: 30,
    },
    tasksScroll: {
        paddingHorizontal: 16,
    },
    weekContainer: {
        marginBottom: 20,
    },
    weekTitle: {
        marginTop: 10,
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
        justifyContent: 'center',
        textAlign: 'center'
    },
    task: {
        padding: 16,
        backgroundColor: '#f2f2f2', // Adjusted to a soft neutral tone
        borderRadius: 8,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    taskDetails: {
        flex: 1,
    },
    taskTitle: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    taskDescription: {
        fontSize: 14,
        color: '#666',
    },
    alertText: {
        fontSize: 14,
        color: 'red',
    },
    taskOptionsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginLeft: 10,
    },
    moreOptions: {
        fontSize: 20,
        paddingRight: 10,
    },
    taskMembers: {
        fontSize: 14,
        color: '#666',
        flex: 3,
    },
    addButton: {
        alignItems: 'flex-end',
        marginTop: 10,
        marginBottom: 10,
    },
    addIcon: {
        width: 30,
        height: 30,
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalView: {
        width: '80%',
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 20,
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
    modalContent: {
        width: '80%',
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 20,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2, },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    input: {
        width: '100%',
        height: 40,
        borderColor: '#ddd',
        borderWidth: 1,
        marginBottom: 12,
        paddingLeft: 8,
    },
    datePicker: {
        marginBottom: 12,
    },
    datePickerLabel: {
        alignSelf: 'flex-start',
        fontSize: 16,
        marginBottom: 8,
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        marginTop: 16,
    },
    label: {
        fontSize: 16,
        fontWeight: 'bold',
        marginTop: 20,
    },
    pickerContainer: {
        marginHorizontal: 16,
        height: 50,
        width: 300,
        marginBottom: 20,
        borderColor: '#000000',
        borderWidth: 0.3,
        borderRadius: 5,
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
    confirmButton: {
        backgroundColor: '#00796b',
        padding: 10,
        borderRadius: 5,
        flex: 1,
        marginRight: 10,
        marginLeft: 10,
        alignItems: 'center',
    },
    confirmButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    saveButton: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 20,
        backgroundColor: '#28a745',
        borderRadius: 5,
        alignItems: 'center',
        marginHorizontal: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
        elevation: 2,
    },
    saveButtonText: {
        color: '#fff',
        fontWeight: 'bold',
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
    cancelButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    modalText: {
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 15,
    },
    modalDescription: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 20,
    },
    dateInput: {
        height: 40,
        width: 290,
        paddingHorizontal: 10,
        borderWidth: 1,
        borderColor: '#000',
        borderRadius: 5,
        backgroundColor: '#fff',
        justifyContent: 'center',
        marginBottom: 12,
    },
    icon: {
        width: 20,
        height: 20,
        marginLeft: 10,
        backgroundColor: '#f2f2f2', // Matching the subcard color
        padding: 4, // Optional padding for better visual
        borderRadius: 4, // Optional rounding for smoother look
    },
});

const pickerSelectStyles = StyleSheet.create({
    inputIOS: {
        fontSize: 16,
        paddingVertical: 12,
        paddingHorizontal: 10,
        borderWidth: 1,
        borderColor: 'gray',
        borderRadius: 4,
        color: 'black',
        paddingRight: 30, // to ensure the text is never behind the icon
    },
    inputAndroid: {
        fontSize: 16,
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderWidth: 0.5,
        borderColor: 'purple',
        borderRadius: 8,
        color: 'black',
        paddingRight: 30, // to ensure the text is never behind the icon
    },
});


export default TaskListScreen;
