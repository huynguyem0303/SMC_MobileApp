import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DatePicker from 'react-native-date-picker';
import RNPickerSelect from 'react-native-picker-select';
import getToken from '../../components/Jwt/getToken'; // Adjust the path if necessary
enum TaskStatusEnum {
    NotStarted = 0,
    InProgress,
    Completed,
    Postponed,
    Cancelled,
    NeedRevision
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

interface Task {
    id: string;
    name: string;
    description: string;
    priority: number;
    startTime: string;
    endTime: string;
    reminder: number;
    status: number;
    teamId: string;
    projectId: string;
    milestoneId: string;
    members: { name: string }[];
}

const TaskDetailScreen = () => {
    const [task, setTask] = useState<Task | null>(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [taskStartTime, setTaskStartTime] = useState(new Date());
    const [taskEndTime, setTaskEndTime] = useState(new Date());
    const router = useRouter();
    const { taskId } = useLocalSearchParams();
    const [accID, setAccId] = useState<string | null>(null);
    const [memberMatch, setMemberMatch] = useState<boolean>(false);
    const fetchTaskDetails = async () => {
        try {
            
            
            const token = await AsyncStorage.getItem('@userToken');
            if (!token) {
                Alert.alert('No token found, please login.');
                return;
            }

            const response = await fetch(`https://smnc.site/api/ProjectTasks/${taskId}`, {
                method: 'GET',
                headers: {
                    'accept': 'text/plain',
                    'Authorization': `Bearer ${token}`,
                },
            });

            const data = await response.json();
            if (data.status) {
                setTask(data.data);
                setTaskStartTime(new Date(data.data.startTime));
                setTaskEndTime(new Date(data.data.endTime));
                const decodedToken = await getToken();
            if(decodedToken!=null){
                setAccId(decodedToken.id)
                setMemberMatch(data.data.members.some((member: { userId: string }) => member.userId === decodedToken.id))
            }
            } else {
                console.error('Failed to fetch task details');
            }
        } catch (error) {
            console.error('Error fetching task details:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTaskDetails();
    }, [taskId]);

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
    };

    const handleSave = async () => {
        const confirmSave = () => {
            Alert.alert(
                "Save Changes",
                "Are you sure you want to save the changes?",
                [
                    {
                        text: "Cancel",
                        style: "cancel"
                    },
                    {
                        text: "OK",
                        onPress: async () => {
                            if (!task) {
                                Alert.alert('Error', 'Task data is missing.');
                                return;
                            }

                            try {
                                const token = await AsyncStorage.getItem('@userToken');
                                if (!token) {
                                    Alert.alert('No token found, please login.');
                                    return;
                                }

                                const response = await fetch(`https://smnc.site/api/ProjectTasks/${task.id}`, {
                                    method: 'PUT',
                                    headers: {
                                        'accept': '*/*',
                                        'Authorization': `Bearer ${token}`,
                                        'Content-Type': 'application/json'
                                    },
                                    body: JSON.stringify({
                                        name: task.name,
                                        description: task.description,
                                        startTime: task.startTime,
                                        endTime: task.endTime,
                                        reminder: task.reminder,
                                        priority: task.priority,
                                        id: task.id,
                                        status: task.status
                                    })
                                });

                                if (response.ok) {
                                    Alert.alert('Success', 'Task updated successfully.');
                                    setEditing(false);
                                    fetchTaskDetails(); // Reload the screen by fetching task details
                                } else {
                                    const errorData = await response.json();
                                    Alert.alert('Error', errorData.message || 'Failed to update task.');
                                }
                            } catch (error) {
                                console.error('Error updating task:', error);
                                Alert.alert('Error', 'An error occurred while updating the task.');
                            }
                        }
                    }
                ]
            );
        };

        confirmSave();
    };

    const handleCancel = () => {
        setEditing(false);
    };

    if (loading) {
        return <ActivityIndicator size="large" color="#0000ff" />;
    }

    if (!task) {
        return <Text>Task details not found.</Text>;
    }


    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Text style={styles.backButtonText}>←</Text>
                </TouchableOpacity>
                <Text style={styles.headerText}>Task Details</Text>
            </View>

            {editing ? (
                <>
                    <TextInput
                        style={styles.input}
                        value={task.name}
                        onChangeText={(text) => setTask({ ...task, name: text })}
                    />
                    <TextInput
                        style={styles.input}
                        value={task.description}
                        onChangeText={(text) => setTask({ ...task, description: text })}
                    />
                    <Text style={styles.label}>Start Date</Text>
                    <DatePicker
                        date={taskStartTime}
                        onDateChange={(date) => {
                            if (date.getTime() <= Date.now()) {
                                Alert.alert('Error', 'Start time must be from tomorrow onwards.');
                            } else {
                                setTaskStartTime(date);
                                setTask({ ...task, startTime: date.toISOString() });
                            }
                        }}
                        minimumDate={new Date(Date.now() + 24 * 60 * 60 * 1000)}
                        mode="datetime"
                        style={styles.datePicker}
                    />
                    <Text style={styles.label}>End Date</Text>
                    <DatePicker
                        date={taskEndTime}
                        onDateChange={(date) => {
                            if (date <= taskStartTime) {
                                Alert.alert('Error', 'End time must be greater than start time.');
                            } else {
                                setTaskEndTime(date);
                                setTask({ ...task, endTime: date.toISOString() });
                            }
                        }}
                        minimumDate={taskStartTime}
                        mode="datetime"
                        style={styles.datePicker}
                    />
                    <Text style={styles.label}>Reminder</Text>
                    <View style={styles.pickerContainer}>
                        <RNPickerSelect
                            value={task.reminder}
                            onValueChange={(value) => setTask({ ...task, reminder: value })}
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
                    <Text style={styles.label}>Status</Text>
                    {Object.keys(TaskStatusEnum)
                        .filter((key) => isNaN(Number(key)))
                        .map((key) => (
                            <TouchableOpacity key={key} style={styles.radioContainer} onPress={() => setTask({ ...task, status: TaskStatusEnum[key as keyof typeof TaskStatusEnum] })}>
                                <View style={[styles.radioButton, task.status === TaskStatusEnum[key as keyof typeof TaskStatusEnum] && styles.radioSelected]} />
                                <Text style={styles.radioText}>{key}</Text>
                            </TouchableOpacity>
                        ))}
                    <View style={styles.buttonContainer}>
                        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                            <Text style={styles.saveButtonText}>Save</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </>
            ) : (
                <>
                    <Text style={styles.title}>{task.name}</Text>
                    <Text style={styles.description}>{task.description}</Text>
                    <Text style={styles.label}>Start Date: {formatDate(task.startTime)}</Text>
                    <Text style={styles.label}>End Date: {formatDate(task.endTime)}</Text>
                    <Text style={styles.label}>Reminder: {task.reminder}</Text>
                    <Text style={styles.label}>Status: {TaskStatusEnum[task.status]}</Text>
                    <Text style={styles.label}>Done by: {task.members.map((member) => member.name).join(', ')}</Text>
                    {memberMatch && (
                        <TouchableOpacity style={styles.editButton} onPress={() => setEditing(true)}>
                            <Text style={styles.editButtonText}>Edit</Text>
                        </TouchableOpacity>
                    )}
                
                </>
            )}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    headerContainer: {
        width: '100%',
        backgroundColor: '#003366',
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
    title: {
        fontSize: 24,
        textAlign:"center",
        fontWeight: 'bold',
        margin: 16,
    },
    description: {
        fontSize: 16,
        textAlign:"center",
        marginHorizontal: 16,
        marginBottom: 16,
    },
    label: {
        fontSize: 16,
        marginHorizontal: 16,
        marginBottom: 8,
    },
    input: {
        marginHorizontal: 16,
        marginBottom: 8,
        padding: 8,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 5,
    },
    radioContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 16,
        marginBottom: 8,
    },
    radioButton: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#ccc',
        marginRight: 10,
    },
    radioSelected: {
        backgroundColor: '#007AFF',
    },
    radioText: {
        fontSize: 16,
    },
    pickerContainer: {
        marginHorizontal: 16,
        marginBottom: 8,
    },
    editButton: {
        margin: 16,
        padding: 12,
        backgroundColor: '#007AFF',
        borderRadius: 5,
        alignItems: 'center',
    },
    editButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    saveButton: {
        margin: 16,
        padding: 12,
        backgroundColor: '#28a745',
        borderRadius: 5,
        alignItems: 'center',
    },
    saveButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    cancelButton: {
        margin: 16,
        padding: 12,
        backgroundColor: '#dc3545',
        borderRadius: 5,
        alignItems: 'center',
    },
    cancelButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginHorizontal: 16,
    },
    datePicker: {
        marginHorizontal: 16,
        marginBottom: 8,
    },
});

const pickerSelectStyles = {
    inputIOS: {
        height: 40,
        paddingHorizontal: 10,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 5,
        backgroundColor: '#fff',
        color: 'black',
    },
    inputAndroid: {
        height: 40,
        paddingHorizontal: 10,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 5,
        backgroundColor: '#fff',
        color: 'black',
    },
};

export default TaskDetailScreen;
