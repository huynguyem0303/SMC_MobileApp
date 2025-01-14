import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView} from "react-native";
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import moment from 'moment';
import { checkToken } from '../../components/checkToken'; 
import { showSessionExpiredAlert } from '../../components/alertUtils'; 
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


const MentorLectuerProjectTaskListScreen = () => {
    const [tasks, setTasks] = useState<{ weekNumber: number, tasks: Task[] }[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const { projectId } = useLocalSearchParams();
    const router = useRouter();
    const isFocused = useIsFocused();
    useEffect(() => {
        fetchTasks();
    }, [projectId, isFocused]);

    const fetchTasks = async () => {
        try {
            const token = await checkToken();
            if (token === null) {
                showSessionExpiredAlert(router);
                return;
            }

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

        } catch (error) {
            // console.log('Error fetching tasks:', error);
            setError('Failed to fetch tasks.');
        } finally {
            setLoading(false);
        }
    };


    const handleDetail = (taskId: string) => {
        router.push({
            pathname: '/Tasks/TaskDetailScreen',
            params: { taskId },
        });
    };
   
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
                                            <View style={[styles.statusDot, { backgroundColor: getStatusColor(task.status) }]} />
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                ))}
            </ScrollView>
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


export default MentorLectuerProjectTaskListScreen;
