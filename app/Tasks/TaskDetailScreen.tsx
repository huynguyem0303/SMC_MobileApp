import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert, ScrollView, Platform, Modal, Image, PermissionsAndroid } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DatePicker from 'react-native-date-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import RNPickerSelect from 'react-native-picker-select';
import getToken from '../../components/Jwt/getToken'; // Adjust the path if necessary
import DocumentPicker, { DocumentPickerResponse } from 'react-native-document-picker';
import { format } from 'date-fns';
import RNFetchBlob from 'rn-fetch-blob';

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
enum TaskPriorityEnum {
    VeryHigh = 0,
    High = 1,
    Medium = 2,
    Low = 3
}

interface Task {
    id: string;
    name: string;
    description: string;
    priority: number;
    startTime: Date;
    endTime: Date;
    reminder: number;
    status: number;
    teamId: string;
    projectId: string;
    milestoneId: string | null;
    weekPriority: number;
    comments: any[]; // Adjust this type if you have a specific type for comments
    members: Member[];
    documents: Document[];
    isDeleted: boolean;
}

interface Member {
    userId: string;
    name: string;
    avatarUrl: string | null;
    role: string;
}
interface Document {
    uri: string;
    name: string;
    type: string | null;
    size: number | null;
    mimeType?: string;
    [key: string]: any; // Add this to accommodate for any additional properties
}
interface DocumentData {
    documentId: string;
    document: {
        filePath: string;
        fileName: string;
    };
    isDeleted: boolean;
}

const specialCharRegex = /[^a-zA-Z0-9\s-]/

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
    const [isLeader, setIsLeader] = useState<boolean>(false);
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);
    const [showStartTimePicker, setShowStartTimePicker] = useState(false);
    const [showEndTimePicker, setShowEndTimePicker] = useState(false);
    const [fileModalVisible, setFileModalVisible] = useState(false);
    const [fileName, setFileName] = useState('');
    const [filePathName, setFilePathName] = useState('');
    const [uploadLoading, setUploadLoading] = useState(false);
    const [fileDescription, setFileDescription] = useState('');
    const [taskPriority, setTaskPriority] = useState(0);
    const [selectedFile, setSelectedFile] = useState<Document | null>(null);
    const [isStartDateTimeChosen, setIsStartDateTimeChosen] = useState(false);
    const [isEndDateTimeChosen, setIsEndDateTimeChosen] = useState(false);
    const [documentModalVisible, setDocumentModalVisible] = useState(false);
    const [documents, setDocuments] = useState<DocumentData[]>([]);
    const requestStoragePermission = async () => {
        try {
            const granted = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
                {
                    title: 'Storage Permission',
                    message: 'App needs access to your storage to download files.',
                    buttonNeutral: 'Ask Me Later',
                    buttonNegative: 'Cancel',
                    buttonPositive: 'OK',
                }
            );
            if (granted === PermissionsAndroid.RESULTS.GRANTED) {
                console.log('You can use the storage');
            } else {
                console.log('Storage permission denied');
            }
        } catch (err) {
            console.warn(err);
        }
    };

    const fetchTaskDetails = async () => {
        try {
            const token = await AsyncStorage.getItem('@userToken');
            setIsStartDateTimeChosen(false);
            setIsEndDateTimeChosen(false);
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
                if (decodedToken != null) {
                    setAccId(decodedToken.id);
                    setMemberMatch(data.data.members.some((member: { userId: string }) => member.userId === decodedToken.id));
                    const storedIsLeader = await AsyncStorage.getItem('@isLeader');
                    setIsLeader(storedIsLeader === 'true');
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

    const stripFileExtension = (fileName: string) => {
        return fileName.replace(/\.[^/.]+$/, "");
    };

    const handleDocumentPick = async () => {
        try {
            const result: DocumentPickerResponse = await DocumentPicker.pickSingle({
                type: DocumentPicker.types.allFiles,
            });
            // const strippedFileName = stripFileExtension(result.name || 'Untitled');
            setSelectedFile({
                uri: result.uri,
                name: result.name || 'Untitled',
                type: result.type,
                size: result.size,
            });
            // setFileName(strippedFileName);
        } catch (err) {
            if (DocumentPicker.isCancel(err)) {
                // console.log('User cancelled the document picker');
            } else {
                console.error('Error: ', err);
            }
        }
    };

    const handleSaveFileDetails = async () => {
        if (!task) {
            Alert.alert('Error', 'Task not found.');
            return;
        }

        if (!fileName || !fileDescription || !selectedFile) {
            Alert.alert('Error', 'Please fill in all the fields and choose a file.');
            return;
        }

        if (specialCharRegex.test(fileName) || specialCharRegex.test(fileDescription)) {
            Alert.alert('Error', 'Inputs cannot contain special characters except hyphens.');
            return;
        }

        setUploadLoading(true); // Set loading state to true

        try {
            const token = await AsyncStorage.getItem('@userToken');
            const formData = new FormData();
            formData.append('DocumentType', '2');
            formData.append('TaskId', task.id);
            formData.append('FileName', fileName);
            formData.append('File', {
                uri: selectedFile.uri,
                name: selectedFile.name || '',
                type: selectedFile.type || 'application/octet-stream',
            } as any);
            formData.append('Description', fileDescription);

            const response = await fetch('https://smnc.site/api/Documents', {
                method: 'POST',
                headers: {
                    'accept': 'text/plain',
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data',
                },
                body: formData,
            });

            const data = await response.json();

            if (response.ok && data.status) {
                Alert.alert('Success', 'Document created successfully.');
                setFilePathName(data.data.document.filePath);
                setFileModalVisible(false);
                setFileName('');
                setFileDescription('');
                setSelectedFile(null);
            } else {
                Alert.alert('Error', data.message || 'Failed to create document.');
            }
        } catch (error: any) {
            // console.log(error);

            if (error.message === 'Network request failed') {
                Alert.alert('Error', 'Your file is too large. Please choose a file under 1 MB.');
            } else {
                Alert.alert('Error', 'An error occurred while creating the document. Please try again.');
            }
        } finally {
            setUploadLoading(false); // Set loading state to false
        }
    };
    const fetchDocuments = async () => {
        try {
            const token = await AsyncStorage.getItem('@userToken');
            if (!token) {
                Alert.alert('No token found, please login.');
                return;
            }

            const response = await fetch(`https://smnc.site/api/Documents?TaskId=${taskId}`, {
                method: 'GET',
                headers: {
                    'accept': 'text/plain',
                    'Authorization': `Bearer ${token}`,
                },
            });

            const data = await response.json();
            if (data.status) {
                const filteredDocuments = data.data.data.filter((doc: Document) => !doc.isDeleted);
                setDocuments(filteredDocuments);
            } else {
                console.error('Failed to fetch documents');
            }
        } catch (error) {
            console.error('Error fetching documents:', error);
        }
    };
    const downloadFile = async (filePath: any, fileName: any) => {
        const requestStoragePermission = async () => {
            try {
                const granted = await PermissionsAndroid.requestMultiple([
                    PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
                    PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE
                ]);
                if (granted['android.permission.WRITE_EXTERNAL_STORAGE'] === PermissionsAndroid.RESULTS.GRANTED &&
                    granted['android.permission.READ_EXTERNAL_STORAGE'] === PermissionsAndroid.RESULTS.GRANTED) {
                    console.log('You can use the storage');
                    return true;
                } else {
                    console.log('Storage permission denied');
                    return false;
                }
            } catch (err) {
                console.warn(err);
                return false;
            }
        };
    
        const permissionGranted = await requestStoragePermission();
        if (!permissionGranted) {
            Alert.alert('Permission Denied', 'You need to grant storage permission to download files.');
            return;
        }
    
        Alert.alert(
            'Download File',
            'Do you want to download this file?',
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
                {
                    text: 'OK',
                    onPress: () => {
                        const { config, fs } = RNFetchBlob;
                        const downloads = fs.dirs.DownloadDir;
    
                        config({
                            fileCache: true,
                            addAndroidDownloads: {
                                useDownloadManager: true,
                                notification: true,
                                path: `${downloads}/${fileName}`,
                                description: 'Downloading file.',
                            },
                        })
                            .fetch('GET', filePath)
                            .then((res) => {
                                console.log('The file saved to ', res.path());
                                Alert.alert('Download Complete', `File ${fileName} downloaded successfully`);
                            })
                            .catch((error) => {
                                console.error('Download failed', error);
                                Alert.alert('Download Failed', 'There was an error downloading the file.');
                            });
                    },
                },
            ],
            { cancelable: false }
        );
    };
    


    const handleDeleteDocument = async (documentId: any) => {
        Alert.alert(
            'Delete Document',
            'Are you sure you want to delete this document?',
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
                {
                    text: 'OK',
                    onPress: async () => {
                        try {
                            const token = await AsyncStorage.getItem('@userToken');
                            const response = await fetch(`https://smnc.site/api/Documents/${documentId}`, {
                                method: 'DELETE',
                                headers: {
                                    'accept': '*/*',
                                    'Authorization': `Bearer ${token}`,
                                },
                            });

                            if (response.ok) {
                                Alert.alert('Success', 'Document deleted successfully.');
                                await fetchDocuments(); // Reload the documents to update the list
                            } else {
                                Alert.alert('Error', 'Failed to delete document.');
                            }
                        } catch (error) {
                            Alert.alert('Error', 'An error occurred while deleting the document.');
                        }
                    },
                },
            ],
            { cancelable: false }
        );
    };

    const adjustToLocalTime = (date: any) => {
        const offset = date.getTimezoneOffset();
        return new Date(date.getTime() - offset * 60 * 1000);
    };
    const handleSave = async () => {
        const confirmSave = () => {
            if (taskEndTime <= taskStartTime) {
                Alert.alert('Error', 'End date must be greater than start date.');
                return;
            }
            if (taskEndTime <= new Date()) {
                Alert.alert('Error', 'End date must be greater than today date.');
                return;
            }

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

                            // Validate that the task name and description do not contain special characters and length <= 200 words
                            const specialCharPattern = /[^a-zA-Z0-9\s-]/; // Updated to allow hyphens
                            if (specialCharPattern.test(task.name) || specialCharPattern.test(task.description)) {
                                Alert.alert('Validation Error', 'Task name and description should not contain special characters except hyphens.');
                                return;
                            }

                            const wordCount = (text: any) => text.trim().split(/\s+/).length;
                            if (wordCount(task.name) > 200 || wordCount(task.description) > 200) {
                                Alert.alert('Validation Error', 'Task name and description should not exceed 200 words.');
                                return;
                            }

                            if (task.name.trim() === '' || task.description.trim() === '') {
                                Alert.alert('Validation Error', 'Task name and description cannot be empty.');
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
                                        startTime: taskStartTime.toISOString(),
                                        endTime: taskEndTime.toISOString(),
                                        reminder: task.reminder,
                                        priority: taskPriority,
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
                                    console.log(errorData.message)
                                    Alert.alert('Error', errorData.message || 'Failed to update task.');
                                    fetchTaskDetails();
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
        fetchTaskDetails();
        setIsStartDateTimeChosen(false);
    };
    const handleCancelFileUpload = () => {
        setFileModalVisible(false)
        setFileName('');
        setFileDescription('');
        setSelectedFile(null);

    }

    const handleUnassign = async () => {
        const confirmUnassign = () => {
            Alert.alert(
                "Unassign Task",
                "Are you sure you want to unassign this task?",
                [
                    {
                        text: "Cancel",
                        style: "cancel"
                    },
                    {
                        text: "OK",
                        onPress: async () => {
                            const memberId = await AsyncStorage.getItem('@memberid');
                            if (!memberId || !task) {
                                Alert.alert('Error', 'Member ID or task data is missing.');
                                return;
                            }

                            try {
                                const token = await AsyncStorage.getItem('@userToken');
                                if (!token) {
                                    Alert.alert('No token found, please login.');
                                    return;
                                }

                                const response = await fetch(`https://smnc.site/api/ProjectTasks/${task.id}/UnAssignTeamMember?teamMemberId=${JSON.parse(memberId)}`, {
                                    method: 'DELETE',
                                    headers: {
                                        'accept': '*/*',
                                        'Authorization': `Bearer ${token}`,
                                        'Content-Type': 'application/json'
                                    }
                                });

                                if (response.ok) {
                                    Alert.alert('Success', 'Team member unassigned successfully.');
                                    fetchTaskDetails(); // Reload the screen by fetching task details
                                } else {
                                    const errorData = await response.json();
                                    Alert.alert('Error', errorData.message || 'Failed to unassign team member.');
                                }
                            } catch (error) {
                                console.error('Error unassigning team member:', error);
                                Alert.alert('Error', 'An error occurred while unassigning the team member.');
                            }
                        }
                    }
                ]
            );
        };

        confirmUnassign();
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
                    <Text style={styles.label}>Name</Text>
                    <TextInput
                        style={styles.input}
                        value={task.name}
                        onChangeText={(text) => setTask({ ...task, name: text })}
                    />
                    <Text style={styles.label}>Description</Text>
                    <TextInput
                        style={styles.input}
                        value={task.description}
                        onChangeText={(text) => setTask({ ...task, description: text })}
                    />
                    <Text style={styles.label}>Start Date and Time</Text>
                    <TouchableOpacity onPress={() => setShowStartPicker(true)} style={styles.dateInput}>
                        <Text>{isStartDateTimeChosen ? new Date(taskStartTime).toLocaleString('en-GB', { timeZone: 'Europe/London', hour12: false }) : format(taskStartTime, 'dd/MM/yyyy HH:mm:ss')}</Text>
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
                        <Text>{isEndDateTimeChosen ? new Date(taskEndTime).toLocaleString('en-GB', { timeZone: 'Europe/London', hour12: false }) : format(taskEndTime, 'dd/MM/yyyy HH:mm:ss')}</Text>
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
                    <Text style={styles.label}>Priority</Text>
                    <View style={styles.pickerContainer}>
                        <RNPickerSelect
                            value={task.priority}
                            onValueChange={(value) => setTask({ ...task, priority: value })}
                            items={[
                                { label: 'Very High', value: 0 },
                                { label: 'High', value: 1 },
                                { label: 'Medium', value: 2 },
                                { label: 'Low', value: 3 },
                            ]}
                            style={pickerSelectStyles}
                        />
                    </View>
                    {/* File Upload Section */}
                    <Text style={styles.label}>Upload File</Text>
                    <TouchableOpacity style={styles.uploadButton} onPress={() => setFileModalVisible(true)}>
                        <Text style={styles.uploadButtonText}>Upload File</Text>
                    </TouchableOpacity>
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

                    <Text style={styles.label}>Start Date: {task && format(new Date(task.startTime), 'dd-MM-yyyy HH:mm')}</Text>
                    <Text style={styles.label}>End Date: {task && format(new Date(task.endTime), 'dd-MM-yyyy HH:mm')}</Text>
                    <Text style={styles.label}>Reminder: {ReminderEnum[task.reminder]}</Text>
                    <Text style={styles.label}>Status: {TaskStatusEnum[task.status]}</Text>
                    <Text style={styles.label}>Priority: {TaskPriorityEnum[task.priority]}</Text>
                    <Text style={styles.label}>Done by: {task.members.map((member) => member.name).join(', ')}</Text>
                    <View style={styles.documentsRow}>
                        <Text style={styles.label}>Documents:</Text>
                        <TouchableOpacity onPress={() => { setDocumentModalVisible(true); fetchDocuments(); }}>
                            <Text style={styles.linkText}>Details</Text>
                        </TouchableOpacity>
                    </View>


                    {!isLeader && memberMatch && task.status !== TaskStatusEnum.Completed && (
                        <>
                            <TouchableOpacity style={styles.editButton} onPress={() => setEditing(true)}>
                                <Text style={styles.editButtonText}>Edit</Text>
                            </TouchableOpacity>
                        </>
                    )}
                    {isLeader && (
                        <TouchableOpacity style={styles.editButton} onPress={() => setEditing(true)}>
                            <Text style={styles.editButtonText}>Edit</Text>
                        </TouchableOpacity>
                    )}
                    {memberMatch && (
                        <TouchableOpacity style={styles.unassignButton} onPress={handleUnassign}>
                            <Text style={styles.unassignButtonText}>Unassign Task</Text>
                        </TouchableOpacity>
                    )}
                </>
            )}

            {/* File Upload Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={fileModalVisible}
                onRequestClose={() => setFileModalVisible(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalView}>
                        {uploadLoading ? (
                            <ActivityIndicator size="large" color="#0000ff" />
                        ) : (
                            <>
                                <Text style={styles.modalText}>Upload File</Text>
                                <TextInput
                                    style={styles.inputpopup}
                                    placeholder="File Name"
                                    value={fileName}
                                    onChangeText={setFileName}
                                />
                                <TextInput
                                    style={styles.inputpopup}
                                    placeholder="Description"
                                    value={fileDescription}
                                    onChangeText={setFileDescription}
                                />
                                <View style={styles.uploadContainer}>
                                    <Text style={styles.fileText}>Choose File</Text>
                                    <TouchableOpacity style={styles.uploadButtonPopup} onPress={handleDocumentPick}>
                                        <Text style={styles.uploadButtonText}>{selectedFile ? selectedFile.name : 'No file chosen'}</Text>
                                    </TouchableOpacity>
                                </View>
                                {selectedFile && (
                                    <>
                                        <Text style={styles.fileName}>File size: {selectedFile.size}</Text>
                                    </>
                                )}
                                <Text>Please choose a file under 10MB</Text>
                                <View style={styles.buttonContainer}>
                                    <TouchableOpacity style={styles.saveButton} onPress={handleSaveFileDetails}>
                                        <Text style={styles.saveButtonText}>Save</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.cancelButton} onPress={() => handleCancelFileUpload()}>
                                        <Text style={styles.cancelButtonText}>Cancel</Text>
                                    </TouchableOpacity>
                                </View>
                            </>
                        )}
                    </View>
                </View>
            </Modal>

            {/* Document Modal */}
            {/* Document Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={documentModalVisible}
                onRequestClose={() => setDocumentModalVisible(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalView}>
                        <Text style={styles.modalText}>Documents</Text>
                        {documents.length > 0 ? (
                            documents.map((doc) => (
                                <View key={doc.documentId} style={styles.documentRow}>
                                    <TouchableOpacity onPress={() => downloadFile(doc.document.filePath, doc.document.fileName)}>
                                        <Text style={styles.linkText}>{doc.document.fileName}</Text>
                                    </TouchableOpacity>
                                    {(isLeader || memberMatch) && (
                                        <TouchableOpacity onPress={() => handleDeleteDocument(doc.documentId)}>
                                            <Image source={require('../../assets/images/trash-icon.png')} style={styles.icon} />
                                        </TouchableOpacity>
                                    )}


                                </View>
                            ))
                        ) : (
                            <Text>No documents found.</Text>
                        )}
                        <TouchableOpacity onPress={() => setDocumentModalVisible(false)} style={styles.cancelButton}>
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },

    uploadContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
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
    title: {
        fontSize: 24,
        textAlign: "center",
        fontWeight: 'bold',
        margin: 16,
    },
    description: {
        fontSize: 16,
        textAlign: "center",
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
        borderColor: '#00000',
        borderRadius: 5,
    },
    inputpopup: {
        width: 300,
        marginHorizontal: 16,
        marginBottom: 8,
        padding: 8,
        borderWidth: 1,
        borderColor: '#00000',
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
        height: 57,
        marginBottom: 8,
        borderColor: '#000000', // Ensure this is applied correctly
        borderWidth: 0.5, // Ensure border width is set to make it visible
        borderRadius: 3.5,
    },
    editButton: {
        margin: 16,
        padding: 12,
        backgroundColor: '#003366',
        borderRadius: 5,
        alignItems: 'center',
    },
    editButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    unassignButton: {
        margin: 16,
        padding: 12,
        backgroundColor: '#dc3545',
        borderRadius: 5,
        alignItems: 'center',
    },
    unassignButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    saveButton: {
        width: 100,
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
        width: 100,
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
    }, dateInput: {
        marginLeft: 20,
        height: 40,
        width: 370,
        paddingHorizontal: 10,
        borderWidth: 1,
        borderColor: '#000', // Black border color
        borderRadius: 5,
        backgroundColor: '#fff',
        justifyContent: 'center',
        marginBottom: 12,
    },
    uploadButton: {
        width: 370,
        height: 40,
        backgroundColor: '#003366',
        padding: 10,
        borderRadius: 5,
        marginBottom: 10,
        marginLeft: 20,
        alignItems: 'center',
    },
    uploadButtonPopup: {
        width: 220,
        height: 40,
        backgroundColor: '#003366',
        padding: 10,
        borderRadius: 5,
        marginLeft: 10,
        alignItems: 'center',
        justifyContent: 'center', // Center the text vertically
    },
    uploadButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    fileText: {
        fontSize: 16,
        color: '#000000',
    },
    fileName: {
        marginLeft: 10,
        fontSize: 16,
        color: '#fff',
        fontStyle: 'italic', // Italic style for the file name

    }, modalContainer: {
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
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    modalText: {
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 15,
    },
    modalinput: {
        width: '100%',
        height: 40,
        borderColor: '#ddd',
        borderWidth: 1,
        marginBottom: 12,
        paddingLeft: 8,
    },
    modalsaveButton: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 20,
        backgroundColor: '#28a745',
        borderRadius: 5,
        alignItems: 'center',
        marginHorizontal: 5,
    },
    modalsaveButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    modalcancelButton: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 20,
        backgroundColor: '#d9534f',
        borderRadius: 5,
        alignItems: 'center',
        marginHorizontal: 5,
    },
    modalcancelButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    linkText: {
        fontSize:16,
        color: 'blue',
        textDecorationLine: 'underline',
        marginBottom: 10,
    },
    documentsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    documentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    icon: {
        width: 20,
        height: 20,
        marginLeft: 10,
    },


});

const pickerSelectStyles = {
    inputIOS: {
        height: 40,
        paddingHorizontal: 10,
        borderWidth: 1,
        borderColor: '#000', // Change this to black
        borderRadius: 5,
        backgroundColor: '#fff',
        color: 'black',
    },
    inputAndroid: {
        height: 40,
        paddingHorizontal: 10,
        borderWidth: 1,
        borderColor: '#000', // Change this to black
        borderRadius: 5,
        backgroundColor: '#fff',
        color: 'black',
    },



};

export default TaskDetailScreen;
