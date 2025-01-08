import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Modal, TextInput, Button, Alert, Image, Platform } from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';

interface Milestone {
    id: string;
    name: string;
    description: string;
    startDate: string;
    endDate: string;
    tasks: Task[];
    projectId: string;
    isDeleted: boolean;
}

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
}

enum TaskStatusEnum {
    NotStarted,
    InProgress,
    Completed,
    Postponed,
    Cancelled,
    NeedRevision,
}

const MilestoneScreen = () => {
    const [milestones, setMilestones] = useState<Milestone[]>([]);
    const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [isLeader, setIsLeader] = useState(false);
    const [modalVisible, setModalVisible] = useState(false); // State for modal visibility
    const [editModalVisible, setEditModalVisible] = useState(false); // State for edit modal visibility
    const [detailModalVisible, setDetailModalVisible] = useState(false); // State for detail modal visibility
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [startDate, setStartDate] = useState(new Date(Date.now() + 24 * 60 * 60 * 1000)); // Default to tomorrow
    const [endDate, setEndDate] = useState(new Date(Date.now() + 24 * 60 * 60 * 1000 * 2)); // Default to day after tomorrow
    const { courseId, semesterId } = useLocalSearchParams();
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);
    const [isStartDateTimeChosen, setIsStartDateTimeChosen] = useState(false);
    const [isEndDateTimeChosen, setIsEndDateTimeChosen] = useState(false);
    const router = useRouter();

    useEffect(() => {
        fetchMilestones();
    }, [courseId, semesterId]);

    const fetchMilestones = async () => {
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

                const milestoneResponse = await fetch(`https://smnc.site/api/Milestones?projectId=${projectId}&orderByStartDate=true`, {
                    headers: {
                        'accept': 'text/plain',
                        'Authorization': `Bearer ${token}`,
                    },
                });

                const milestoneData = await milestoneResponse.json();

                if (milestoneData.status && milestoneData.data) {
                    const filteredMilestones = milestoneData.data.filter((milestone: Milestone) => !milestone.isDeleted);

                    const milestonesWithTasks = filteredMilestones.map((milestone: Milestone) => {
                        return { ...milestone, projectId };
                    });
                    setMilestones(milestonesWithTasks);
                } else {
                    setError(milestoneData.message || 'Failed to fetch milestones.');
                }
            } else {
                setError(projectData.message || 'Unexpected response structure');
            }
        } catch (error) {
            console.error('Error fetching milestones:', error);
            setError('Failed to fetch milestones.');
        } finally {
            setLoading(false);
        }
    };

    const fetchMilestoneDetails = async (milestoneId: string) => {
        try {
            const token = await AsyncStorage.getItem('@userToken');
            if (!token) {
                throw new Error('No token found');
            }

            const response = await fetch(`https://smnc.site/api/Milestones/${milestoneId}`, {
                headers: {
                    'accept': 'text/plain',
                    'Authorization': `Bearer ${token}`,
                },
            });

            const data = await response.json();

            if (data.status && data.data && !data.data.isDeleted) {
                setSelectedMilestone(data.data);
                setDetailModalVisible(true); // Show the detail modal
            } else {
                setError(data.message || 'Failed to fetch milestone details.');
            }
        } catch (error) {
            console.error('Error fetching milestone details:', error);
            setError('Failed to fetch milestone details.');
        }
    };

    const handleAddMilestone = async () => {
        // Validate that the name and description do not contain special characters and length <= 200 words
        const specialCharPattern = /[^a-zA-Z0-9\s]/;
        if (specialCharPattern.test(name) || specialCharPattern.test(description)) {
            Alert.alert('Validation Error', 'Name and description should not contain special characters.');
            return;
        }

        const wordCount = (text: string) => text.trim().split(/\s+/).length;
        if (wordCount(name) > 200 || wordCount(description) > 200) {
            Alert.alert('Validation Error', 'Name and description should not exceed 200 words.');
            return;
        }

        if (name.trim() === '' || description.trim() === '') {
            Alert.alert('Validation Error', 'Name and description cannot be empty.');
            return;
        }

        if (endDate <= startDate) {
            Alert.alert('Error', 'End date must be greater than start date.');
            return;
        }

        try {
            const token = await AsyncStorage.getItem('@userToken');
            const projectId = milestones[0]?.projectId;
            const response = await fetch('https://smnc.site/api/Milestones', {
                method: 'POST',
                headers: {
                    'accept': '*/*',
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name,
                    description,
                    startDate: startDate.toISOString(),
                    endDate: endDate.toISOString(),
                    projectId,
                }),
            });

            if (response.ok) {
                Alert.alert('Success', 'Milestone added successfully.');
                setModalVisible(false);
                setName('');
                setDescription('');
                setStartDate(new Date(Date.now() + 24 * 60 * 60 * 1000));
                setEndDate(new Date(Date.now() + 24 * 60 * 60 * 1000 * 2));
                await fetchMilestones(); // Reload the page to see the new milestone
            } else {
                Alert.alert('Error', 'Failed to add milestone.');
            }
        } catch (error) {
            Alert.alert('Error', 'An error occurred while adding the milestone.');
        }
    };


    const handleEditMilestone = async (milestoneId: string) => {
        if (!selectedMilestone) return;

        // Validate that the name and description do not contain special characters and length <= 200 words
        const specialCharPattern = /[^a-zA-Z0-9\s]/;
        if (specialCharPattern.test(name) || specialCharPattern.test(description)) {
            Alert.alert('Validation Error', 'Name and description should not contain special characters.');
            return;
        }
        const wordCount = (text: string) => text.trim().split(/\s+/).length;
        if (wordCount(name) > 200 || wordCount(description) > 200) {
            Alert.alert('Validation Error', 'Name and description should not exceed 200 words.');
            return;
        }

        if (endDate <= startDate) {
            Alert.alert('Error', 'End date must be greater than start date.');
            return;
        }

        try {
            const token = await AsyncStorage.getItem('@userToken');
            const response = await fetch(`https://smnc.site/api/Milestones/${milestoneId}`, {
                method: 'PUT',
                headers: {
                    'accept': '*/*',
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name,
                    description,
                    startDate: startDate.toISOString(),
                    endDate: endDate.toISOString(),
                    id: milestoneId,
                    status: 0,
                    isDeleted: false,
                }),
            });

            if (response.ok) {
                Alert.alert('Success', 'Milestone updated successfully.');
                setEditModalVisible(false);
                setSelectedMilestone(null);
                await fetchMilestones(); // Reload the page to see the updated milestone
            } else {
                Alert.alert('Error', 'Failed to update milestone.');
            }
        } catch (error) {
            Alert.alert('Error', 'An error occurred while updating the milestone.');
        }
    };


    const handleDeleteMilestone = async (milestoneId: string) => {
        Alert.alert(
            'Delete Milestone',
            'Are you sure you want to delete this milestone?',
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
                {
                    text: 'Confirm',
                    onPress: async () => {
                        try {
                            const token = await AsyncStorage.getItem('@userToken');
                            const response = await fetch(`https://smnc.site/api/Milestones/${milestoneId}`, {
                                method: 'DELETE',
                                headers: {
                                    'accept': '*/*',
                                    'Authorization': `Bearer ${token}`,
                                },
                            });

                            if (response.ok) {
                                Alert.alert('Success', 'Milestone deleted successfully.');
                                await fetchMilestones(); // Reload the page to see the updated milestones
                            } else {
                                Alert.alert('Error', 'Failed to delete milestone.');
                            }
                        } catch (error) {
                            Alert.alert('Error', 'An error occurred while deleting the milestone.');
                        }
                    },
                },
            ],
            { cancelable: false }
        );
    };
    const formattedStartDate = new Date(startDate).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });

    const formattedEndDate = new Date(endDate).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });

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

    if (milestones.length === 0) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Text style={styles.backButtonText}>←</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerText}>Milestones</Text>
                </View>
                {isLeader && (
                    <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.addButton}>
                        <Image source={require('../../assets/images/add-icon.png')} style={styles.addIcon} />
                    </TouchableOpacity>
                )}
                <Text style={styles.message}>No milestones found</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Text style={styles.backButtonText}>←</Text>
                </TouchableOpacity>
                <Text style={styles.headerText}>Milestones</Text>
            </View>
            {isLeader && (
                <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.addButton}>
                    <Image source={require('../../assets/images/add-icon.png')} style={styles.addIcon} />
                </TouchableOpacity>
            )}
            <ScrollView contentContainerStyle={styles.milestonesScroll}>
                {milestones.map(milestone => (
                    <View key={milestone.id} style={styles.milestoneContainer}>
                        <TouchableOpacity style={styles.milestoneButton}>
                            <Text style={styles.milestoneButtonText}>{milestone.name}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => fetchMilestoneDetails(milestone.id)} style={styles.detailButton}>
                            <Text style={styles.detailButtonText}>Detail</Text>
                        </TouchableOpacity>
                        {isLeader && (
                            <TouchableOpacity onPress={() => {
                                setSelectedMilestone(milestone);
                                setName(milestone.name);
                                setDescription(milestone.description);
                                setStartDate(new Date(milestone.startDate));
                                setEndDate(new Date(milestone.endDate));
                                setEditModalVisible(true);
                            }} style={styles.editButton}>
                                <Text style={styles.editButtonText}>Edit</Text>
                            </TouchableOpacity>
                        )}
                        {isLeader && (
                            <TouchableOpacity onPress={() => handleDeleteMilestone(milestone.id)} style={styles.deleteButton}>
                                <Text style={styles.deleteButtonText}>Delete</Text>
                            </TouchableOpacity>
                        )}
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
                    <Text style={styles.modalText}>Add New Milestone</Text>
                    <TextInput placeholder="Milestone Name"
                        value={name}
                        onChangeText={setName}
                        style={styles.input}
                    />
                    <TextInput
                        placeholder="Description"
                        value={description}
                        onChangeText={setDescription}
                        style={styles.input}
                    />
                    <Text style={styles.label}>Start Date</Text>
                    <TouchableOpacity onPress={() => setShowStartPicker(true)} style={styles.dateInput}>
                        <Text>{isStartDateTimeChosen ? formattedStartDate : 'Choose start date'}</Text>
                    </TouchableOpacity>
                    {showStartPicker && (
                        <DateTimePicker
                            value={startDate}
                            mode="date"
                            display="default"
                            onChange={(event, date) => {
                                setShowStartPicker(Platform.OS === 'ios');
                                if (date) 
                                setStartDate(date);
                                setIsStartDateTimeChosen(true);
                            }}
                        />
                    )}
                    <Text style={styles.label}>End Date</Text>
                    <TouchableOpacity onPress={() => setShowEndPicker(true)} style={styles.dateInput}>
                        <Text>{isEndDateTimeChosen ? formattedEndDate : 'Choose end date'}</Text>
                    </TouchableOpacity>
                    {showEndPicker && (
                        <DateTimePicker
                            value={endDate}
                            mode="date"
                            display="default"
                            onChange={(event, date) => {
                                setShowEndPicker(Platform.OS === 'ios');
                                if (date) 
                                setEndDate(date);
                                setIsEndDateTimeChosen(true)
                            }}
                        />
                    )}
                    <View style={styles.buttonContainer}>
                        <Button title="Add Milestone" onPress={handleAddMilestone} />
                        <Button title="Cancel" onPress={() => setModalVisible(false)} />
                    </View>
                </ScrollView>
            </Modal>

            {selectedMilestone && (
                <Modal
                    animationType="slide"
                    transparent={true}
                    visible={detailModalVisible}
                    onRequestClose={() => setDetailModalVisible(false)}
                >
                    <View style={styles.detailModalView}>
                        <Text style={styles.detailModalText}>Milestone Details</Text>
                        <Text style={styles.detailText}>Name: {selectedMilestone.name}</Text>
                        <Text style={styles.detailText}>Description: {selectedMilestone.description}</Text>
                        <Text style={styles.detailText}>
                            Start Date: {new Date(selectedMilestone.startDate).toLocaleDateString('en-GB', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric'
                            })}
                        </Text>
                        <Text style={styles.detailText}>
                            End Date: {new Date(selectedMilestone.endDate).toLocaleDateString('en-GB', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric'
                            })}
                        </Text>
                        <Button title="Close" onPress={() => setDetailModalVisible(false)} />
                    </View>
                </Modal>
            )}

            {selectedMilestone && (
                <Modal
                    animationType="slide"
                    transparent={true}
                    visible={editModalVisible}
                    onRequestClose={() => setEditModalVisible(false)}
                >
                    <ScrollView contentContainerStyle={styles.modalView}>
                        <Text style={styles.modalText}>Edit Milestone</Text>
                        <TextInput placeholder="Milestone Name"
                            value={name}
                            onChangeText={setName}
                            style={styles.input}
                        />
                        <TextInput
                            placeholder="Description"
                            value={description}
                            onChangeText={setDescription}
                            style={styles.input}
                        />
                        <Text style={styles.label}>Start Date</Text>
                        <TouchableOpacity onPress={() => setShowStartPicker(true)} style={styles.dateInput}>
                            <Text>{startDate.toDateString()}</Text>
                        </TouchableOpacity>
                        {showStartPicker && (
                            <DateTimePicker
                                value={startDate}
                                mode="date"
                                display="default"
                                onChange={(event, date) => {
                                    setShowStartPicker(Platform.OS === 'ios');
                                    if (date) setStartDate(date);
                                }}
                            />
                        )}
                        <Text style={styles.label}>End Date</Text>
                        <TouchableOpacity onPress={() => setShowEndPicker(true)} style={styles.dateInput}>
                            <Text>{endDate.toDateString()}</Text>
                        </TouchableOpacity>
                        {showEndPicker && (
                            <DateTimePicker
                                value={endDate}
                                mode="date"
                                display="default"
                                onChange={(event, date) => {
                                    setShowEndPicker(Platform.OS === 'ios');
                                    if (date) setEndDate(date);
                                }}
                            />
                        )}
                        <View style={styles.buttonContainer}>
                            <Button title="Save Changes" onPress={() => handleEditMilestone(selectedMilestone.id)} />
                            <Button title="Cancel" onPress={() => setEditModalVisible(false)} />
                        </View>
                    </ScrollView>
                </Modal>
            )}
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
    addButton: {
        alignItems: 'flex-end',
        marginTop: 10,
        marginBottom: 10,
    },
    addIcon: {
        width: 30,
        height: 30,
    },
    milestonesScroll: {
        paddingHorizontal: 16,
        marginTop: 10
    },
    milestoneContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    milestoneButton: {
        flex: 1,
        backgroundColor: '#e9e9e9',
        padding: 16,
        borderRadius: 8,
        marginRight: 10,
    },
    milestoneButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    detailButton: {
        backgroundColor: '#007bff',
        padding: 10,
        borderRadius: 8,
    },
    detailButtonText: {
        fontSize: 14,
        color: '#fff',
    },
    addButtonText: {
        fontSize: 16,
        color: '#fff',
        fontWeight: 'bold',
    },
    message: {
        fontSize: 18,
        textAlign: 'center',
        marginTop: 20,
    },
    modalView: {
        margin: 20,
        backgroundColor: "white",
        borderRadius: 20,
        padding: 35,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    modalText: {
        marginBottom: 15,
        textAlign: "center",
        fontSize: 18,
        fontWeight: 'bold',
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
    },
    detailModalView: {
        margin: 20,
        backgroundColor: "white",
        borderRadius: 20,
        padding: 35,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    detailModalText: {
        marginBottom: 15,
        textAlign: "center",
        fontSize: 18,
        fontWeight: 'bold',
    },
    detailText: {
        fontSize: 16,
        marginBottom: 10,
    },
    dateInput: {
        height: 40,
        width: 300,
        paddingHorizontal: 10,
        borderWidth: 1,
        borderColor: '#000', // Black border color
        borderRadius: 5,
        backgroundColor: '#fff',
        justifyContent: 'center',
        marginBottom: 12,
    },
    label: {
        fontSize: 16,
        fontWeight: 'bold',
        marginTop: 20,
    }, editButton: {
        backgroundColor: '#28a745', // Green color
        padding: 10,
        borderRadius: 8,
        marginLeft: 10,
    },
    editButtonText: {
        fontSize: 14,
        color: '#fff',
        fontWeight: 'bold',
    },
    deleteButton: {
        backgroundColor: '#dc3545', // Red color
        padding: 10,
        borderRadius: 8,
        marginLeft: 10,
    },
    deleteButtonText: {
        fontSize: 14,
        color: '#fff',
        fontWeight: 'bold',
    },

});

export default MilestoneScreen;

