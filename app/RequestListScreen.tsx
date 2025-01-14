import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Modal, Alert, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Dialog from 'react-native-dialog';
import { checkToken } from '../components/checkToken';
import { showSessionExpiredAlert } from '../components/alertUtils'; 
// Define the JoinRequest and Student interfaces
interface JoinRequest {
    type: string;
    teamId: string;
    senderId: string;
    createdDate: string;
    status: number;
    comment: string;
    teamRequestId: string;
    senderEmail: string;
    senderName: string;
    senderStudentDepartment: string;
    senderStudentCode: string;
    // Add other fields as necessary
}

interface Student {
    email: string,
    studentName: string;
    studentCode: string;
    studentDepartment: string;
    campus: string;
    phoneNumber: string;
    skills: Skill[];
    studentLecturers: string[];
}

interface Skill {
    skillName: string;
    skillDescription: string;
    skillType: string;
    skillLevel: string;
    isDeleted: boolean;
}

type DetailedJoinRequest = JoinRequest & Student;

const fetchStudentDetails = async (accountId: string, token: string): Promise<Student | null> => {
    try {
        const response = await fetch(`https://smnc.site/api/Student/GetStudentByAccId/${accountId}`, {
            method: 'GET',
            headers: {
                'accept': 'text/plain',
                'Authorization': `Bearer ${token}`,
            },
        });
        const data = await response.json();
        if (data.status && data.data) {
            return data.data;
        } else {
            throw new Error('Failed to fetch student details');
        }
    } catch (error) {
        console.log('Error fetching student details:', error);
        return null;
    }
};

const fetchJoinRequests = async (teamId: string, token: string) => {
    try {
        const response = await fetch(`https://smnc.site/api/TeamRequest/search?PageSize=10&TeamId=${teamId}`, {
            method: 'GET',
            headers: {
                'accept': '*/*',
                'Authorization': `Bearer ${token}`,
            },
        });
        const data = await response.json();
        if (data.status && data.data) {
            const joinRequests = data.data.data.filter((request: JoinRequest) => request.type === "Join" && request.status === 0);
            return joinRequests;
        } else {
            console.log();
            throw new Error(teamId);

        }
    } catch (error) {
        console.log('Error fetching join requests:', error);
        throw error;
    }
};

const declineMember = async (requestId: any, token: any, reason: any) => {
    try {
        const response = await fetch(`https://smnc.site/api/TeamRequest/${requestId}/RejectRequest`, {
            method: 'PUT',
            headers: {
                'accept': '*/*',
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                id: requestId, // Ensure the ID is correctly included in the body
                reason: reason,
                notifyByEmail: true
            }),
        });
        if (response.ok) {
            return true;
        } else {
            const errorData = await response.json();
            console.log('Error response:', errorData);
            return false;
        }
    } catch (error) {
        console.log('Error declining member:', error);
        return false;
    }
};



const approveMember = async (request: any, token: any, role: any) => {
    const jsonValue = await AsyncStorage.getItem('@memberCount');
    const memberCount = jsonValue != null ? Number(JSON.parse(jsonValue)) : null
    if (memberCount === null || memberCount >= 9) {
        Alert.alert('Error', 'Members in one team must be from 4-8 people');
        return false;
    }
    try {
        // Call the new API endpoint to create a team member by request
        const response2 = await fetch('https://smnc.site/api/TeamMembers/createbyrequest', {
            method: 'POST',
            headers: {
                'accept': '*/*',
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                teamRequestId: request.teamRequestId,
                memberRole: role,
                note: role,
                notifyByEmail: true
            }),
        });

        const responseBody = await response2.text(); // Capture the response body as text

        if (!response2.ok) {
            let errorData;
            try {
                errorData = JSON.parse(responseBody); // Try to parse as JSON
            } catch (e) {
                throw new Error('Failed to add team member: ' + responseBody); // If parsing fails, log the raw response
            }

            // Alert the error message and detailed errors
            const errorMessages = errorData.errors ? errorData.errors.join('\n') : 'Unknown error';
            console.log(errorMessages);
            Alert.alert('Error', `${errorMessages}`);
            return false;
        }
        return true;
    } catch (error: any) {
        console.log('Error approving member:', error);
        Alert.alert('Error', error.message);
        return false;
    }
};

// Usage example


const RequestListScreen = () => {
    const router = useRouter();
    const { teamId } = useLocalSearchParams(); // Assuming teamId is passed from the previous page
    const [declineReason, setDeclineReason] = useState("");
    const [detailedRequests, setDetailedRequests] = useState<DetailedJoinRequest[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [refresh, setRefresh] = useState<boolean>(false);
    const [showSkillsModal, setShowSkillsModal] = useState<boolean>(false);
    const [showConfirmDeclineModal, setShowConfirmDeclineModal] = useState<boolean>(false);
    const [showConfirmApproveModal, setShowConfirmApproveModal] = useState<boolean>(false);
    const [selectedSkills, setSelectedSkills] = useState<Skill[]>([]);
    const [visibleOptions, setVisibleOptions] = useState<{ [key: number]: boolean }>({});
    const [selectedRequestIndex, setSelectedRequestIndex] = useState<number | null>(null);
    const [role, setRole] = useState<string>('');

    const loadStudentDetails = async () => {
        try {
            const token = await checkToken();
            if (token) {
                const joinRequests = await fetchJoinRequests(typeof teamId === 'string' ? teamId : teamId[0], token);

                const updatedRequests = joinRequests.map((request: JoinRequest) => ({
                    ...request,
                    email: request.senderEmail,
                    studentName: request.senderName,
                    studentCode: request.senderStudentCode,  // Assuming senderId can be used as studentCode
                    studentDepartment: request.senderStudentDepartment
                }));

                setDetailedRequests(updatedRequests as DetailedJoinRequest[]);
            } else {
                showSessionExpiredAlert(router);
            }
        } catch (error) {
            console.log('Error loading student details:', error);
        } finally {
            setLoading(false);
        }
    };



    const refreshPage = () => {
        setLoading(true);
        loadStudentDetails();
    };

    useEffect(() => {
        loadStudentDetails();
    }, [teamId]);

    const handleShowSkills = async (studentId: string) => {
        try {
            const token = await checkToken();
            if (!token) {
                showSessionExpiredAlert(router);
                return;
            }

            const studentDetails = await fetchStudentDetails(studentId, token);
            if (studentDetails && studentDetails.skills) {
                const filteredSkills = studentDetails.skills.filter(skill => !skill.isDeleted);
                setSelectedSkills(filteredSkills);
                setShowSkillsModal(true);
            } else {
                console.log('No skills found or student details are missing.');
            }
        } catch (error) {
            console.log('Error fetching student details:', error);
        }
    };
    const confirmDeclineMember = (index: number) => {
        setSelectedRequestIndex(index);
        setShowConfirmDeclineModal(true);
    };

    const handleDeclineMember = async () => {
        if (selectedRequestIndex !== null) {
          const request = detailedRequests[selectedRequestIndex];
          const token = await checkToken();
          if (token === null) {
            showSessionExpiredAlert(router);
            return;
          }
          if (!request) {
            Alert.alert('Error', 'Request not found');
            return;
          }
          try {
            const success = await declineMember(request.teamRequestId, token, declineReason);
            if (success) {
              Alert.alert('Success', 'Member declined successfully');
              refreshPage(); // Trigger a refresh without directly calling loadStudentDetails
            } else {
              Alert.alert('Error', 'Failed to decline the member');
            }
          } catch (error) {
            Alert.alert('Error', 'An unexpected error occurred');
            console.log('Decline member error:', error);
          } finally {
            setShowConfirmDeclineModal(false);
          }
        }
      };
      
    const confirmApproveMember = (index: number) => {
        setSelectedRequestIndex(index);
        setShowConfirmApproveModal(true);
    };

    const handleApproveMember = async () => {
        if (selectedRequestIndex === null) {
          Alert.alert('Input Required', 'Please select a request');
          return;
        }
      
        if (!role.trim()) {
          Alert.alert('Validation Error', 'Member role cannot be empty');
          return;
        }
      
        // List of valid roles
        const validRoles = ['FE', 'BE', 'Mobile', 'UI/UX', 'Marketing'];
      
        // Validate that the role is valid
        const roleWords = role.trim().split(/\s*,\s*/); // Allow roles to be separated by commas
        for (const word of roleWords) {
          if (!validRoles.map(role => role.toLowerCase()).includes(word.toLowerCase())) {
            Alert.alert('Validation Error', 'Invalid member role. Please enter one of the following roles: FE, BE, Mobile, UI/UX, Marketing and use commas between multiple roles');
            return;
          }
        }
        const request = detailedRequests[selectedRequestIndex];
        const token = await checkToken();
        if (token === null) {
          showSessionExpiredAlert(router);
          return;
        }
      
        if (!request) {
          Alert.alert('Error', 'Request not found');
          return;
        }
      
        try {
          const success = await approveMember(request, token, role);
          if (success) {
            Alert.alert('Success', 'Member approved and added successfully');
            refreshPage(); // Trigger a refresh without directly calling loadStudentDetails
          } else {
            Alert.alert('Error', 'Failed to approve the member');
          }
        } catch (error) {
          Alert.alert('Error', 'An unexpected error occurred');
          console.log('Approve member error:', error);
        } finally {
          setShowConfirmApproveModal(false);
        }
      };
      

    const toggleOptions = (index: number) => {
        setVisibleOptions((prevVisibleOptions) => ({
            ...prevVisibleOptions,
            [index]: !prevVisibleOptions[index],
        }));
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <Text>Loading...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Text style={styles.backButtonText}>←</Text>
                </TouchableOpacity>
                <Text style={styles.headerText}>Join Requests</Text>
            </View>
            <ScrollView contentContainerStyle={styles.scrollView}>
                {detailedRequests.length > 0 ? (
                    detailedRequests.map((request, index) => (
                        <View key={index} style={styles.requestCard}>
                            <View style={styles.cardHeader}>
                                <Text>Student Name: {request.studentName}</Text>
                                <TouchableOpacity
                                    style={styles.optionsButton}
                                    onPress={() => toggleOptions(index)}>
                                    <Text style={styles.optionsButtonText}>...</Text>
                                </TouchableOpacity>
                                {visibleOptions[index] && (
                                    <View style={styles.optionsContainer}>
                                        <TouchableOpacity onPress={() => confirmApproveMember(index)}>
                                            <Text style={styles.optionText}>Approve Member</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity onPress={() => {
                                            setSelectedRequestIndex(index);
                                            setShowConfirmDeclineModal(true);
                                        }}>
                                            <Text style={styles.optionText}>Decline Member</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                            <Text>Student Email: {request.email}</Text>
                            <Text>Student Code: {request.studentCode}</Text>
                            <Text>Student Department: {request.studentDepartment}</Text>
                            <Text>Created Date: {new Date(request.createdDate).toLocaleString()}</Text>
                            <Text>Comment: {request.comment}</Text>
                            <TouchableOpacity
                                style={styles.skillButton}
                                onPress={() => handleShowSkills(request.senderId)}
                            >
                                <Text style={styles.skillButtonText}>Skill Details</Text>
                            </TouchableOpacity>
                        </View>
                    ))
                ) : (
                    <Text style={styles.noRequestsText}>No join requests found</Text>
                )}
            </ScrollView>

            <Modal visible={showSkillsModal} animationType="slide" transparent={true}>
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <ScrollView>
                            {selectedSkills.length > 0 ? (
                                selectedSkills.map((skill, index) => (
                                    <View key={index} style={styles.skillCard}>
                                        <Text>Skill Name: {skill.skillName}</Text>
                                        <Text>Skill Description: {skill.skillDescription}</Text>
                                        <Text>Skill Type: {skill.skillType}</Text>
                                        <Text>Skill Level: {skill.skillLevel}</Text>
                                    </View>
                                ))
                            ) : (
                                <Text style={styles.noSkillsText}>No skills found</Text>
                            )}
                        </ScrollView>
                        <TouchableOpacity style={styles.closeButton} onPress={() => setShowSkillsModal(false)}>
                            <Text style={styles.closeButtonText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal> 
            <Dialog.Container visible={showConfirmDeclineModal}>
                <Dialog.Title style={{ color: 'black' }}>Decline Member</Dialog.Title>
                <Dialog.Description style={{ color: 'black' }}>
                    Please enter the reason for declining the member.
                </Dialog.Description>
                <Dialog.Input
                    placeholder="Reason"
                    value={declineReason}
                    onChangeText={setDeclineReason}
                    placeholderTextColor="gray"
                    style={{ color: 'black' }} // Set the input text color
                />
                <Dialog.Button label="Cancel" onPress={() => setShowConfirmDeclineModal(false)} />
                <Dialog.Button label="Decline" onPress={handleDeclineMember} />
            </Dialog.Container>
            <Modal visible={showConfirmApproveModal} animationType="slide" transparent={true}>
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <Text>Enter the role for the new member:</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter member role"
                            value={role}
                            onChangeText={setRole}
                        />
                        <View style={styles.modalButtonContainer}>
                            <TouchableOpacity style={styles.confirmButton} onPress={handleApproveMember}>
                                <Text style={styles.confirmButtonText}>Approve</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.cancelButton} onPress={() => setShowConfirmApproveModal(false)}>
                                <Text style={styles.cancelButtonText}>Cancel</Text>
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
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
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
    scrollView: {
        flexGrow: 1,
        padding: 16,
    },
    requestCard: {
        padding: 16,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        marginBottom: 8,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    optionsButton: {
        padding: 5,
        backgroundColor: '#ccc',
        borderRadius: 5,
    },
    optionsButtonText: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    optionsContainer: {
        position: 'absolute',
        top: 40,
        right: 0,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 5,
        padding: 10,
        zIndex: 1,
    },
    optionText: {
        padding: 5,
        fontSize: 16,
    },
    skillButton: {
        backgroundColor: '#00796b',
        padding: 10,
        borderRadius: 5,
        marginTop: 10,
        alignItems: 'center',
    },
    skillButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContent: {
        width: '80%',
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 10,
    },
    skillCard: {
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#ccc',
        marginBottom: 10,
    },
    noSkillsText: {
        textAlign: 'center',
        marginTop: 20,
        fontSize: 16,
    },
    closeButton: {
        backgroundColor: '#003366',
        padding: 10,
        borderRadius: 5,
        marginTop: 20,
        alignItems: 'center',
    },
    closeButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    modalButtonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
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
    input: {
        height: 40,
        borderColor: '#ccc',
        borderWidth: 1,
        marginBottom: 20,
        paddingHorizontal: 10,
        borderRadius: 5,
    },
    noRequestsText: {
        textAlign: 'center',
        marginTop: 20,
        fontSize: 16,
        color: '#666',
    },
});

export default RequestListScreen;

