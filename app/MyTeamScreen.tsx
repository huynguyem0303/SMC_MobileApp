import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView, Modal, Alert, TextInput } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from '@react-navigation/native';
import { checkToken } from '../components/checkToken';
import { showSessionExpiredAlert } from '../components/alertUtils';
interface Member {
    studentName: string;
    studentCode: string;
    memberRole: string;
    isLeader: boolean;
    isDeleted: boolean;
    note?: string; // Assuming there's a note property in your member object
    id: string; // Assuming there's an id property in your member object
}
interface JoinRequest {
    type: string;
    status: number;
    id: string
    comment: string
    // Include any other fields that the join request might have
}

const fetchTeamDetails = async (courseId: string, semesterId: string, userToken: string) => {
    try {
        const response = await fetch(`https://smnc.site/api/Teams/CurrentUserTeam?courseId=${courseId}&semesterId=${semesterId}`, {
            method: 'GET',
            headers: {
                'accept': '*/*',
                'Authorization': `Bearer ${userToken}`,
            },
        });
        return response.json();
    } catch (error) {
        // console.log('Error fetching team details:', error);
        throw error;
    }
};

const deleteMember = async (member: Member, userToken: string) => {
    try {
        const response = await fetch(`https://smnc.site/api/TeamMembers/${member.id}`, {
            method: 'PUT',
            headers: {
                'accept': '*/*',
                'Authorization': `Bearer ${userToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                memberRole: member.memberRole,
                note: member.note || "",
                isLeader: false,
                id: member.id,
                status: 0,
                isDeleted: true
            }),
        });

        if (!response.ok) {
            // console.log(member.memberRole);
            // console.log(member.note);
            // console.log(member.id);
            // throw new Error('Failed to delete member');
        }

        Alert.alert('Success', 'Delete member successfully!');
    } catch (error) {
        console.log('Error deleting member:', error);
        Alert.alert('Error', 'Error deleting member!');
        throw error;
    }
};

const assignLeader = async (member: Member, userToken: string) => {
    try {
        const response = await fetch(`https://smnc.site/api/TeamMembers/${member.id}`, {
            method: 'PUT',
            headers: {
                'accept': '*/*',
                'Authorization': `Bearer ${userToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                memberRole: member.memberRole,
                note: member.note || "",
                isLeader: true,
                id: member.id,
                status: 0,
                isDeleted: member.isDeleted,
            }),
        });

        if (!response.ok) {
            throw new Error('Failed to assign leader');
        }

        Alert.alert('Success', 'Assign leader successfully!');
    } catch (error) {
        Alert.alert('Error', 'Error assign leader!');
        // console.log('Error assigning leader:', error);
        throw error;
    }
};
const unAssignLeader = async (member: Member, userToken: string) => {
    try {
        const response = await fetch(`https://smnc.site/api/TeamMembers/${member.id}`, {
            method: 'PUT',
            headers: {
                'accept': '*/*',
                'Authorization': `Bearer ${userToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                memberRole: member.memberRole,
                note: member.note || "",
                isLeader: false,
                id: member.id,
                status: 0,
                isDeleted: member.isDeleted,
            }),
        });

        if (!response.ok) {
            throw new Error('Failed to unassign leader');
        }

        Alert.alert('Success', 'Unassign leader successfully!');
    } catch (error) {
        Alert.alert('Error', 'Error unassign leader!');
        // console.log('Error unassigning leader:', error);
        throw error;
    }
};
// Function to update member role
const updateMemberRole = async (member: Member, userToken: string) => {
    try {
        const response = await fetch(`https://smnc.site/api/TeamMembers/${member.id}`, {
            method: 'PUT',
            headers: {
                'accept': '*/*',
                'Authorization': `Bearer ${userToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                memberRole: member.memberRole,
                note: member.note || "",
                isLeader: member.isLeader,
                id: member.id,
                status: 0,
                isDeleted: member.isDeleted
            }),
        });

        const responseText = await response.text();
        // console.log('Server Response:', responseText);

        if (!response.ok) {
            throw new Error('Failed to update member role');
        }

        if (responseText) {
            return JSON.parse(responseText);
        } else {
            return {}; // Handle empty response
        }
    } catch (error) {
        console.log('Error updating member role:', error);
        throw error;
    }
};




const MyTeamScreen = () => {
    const router = useRouter();
    const isFocused = useIsFocused();
    const [teamDetails, setTeamDetails] = useState<Member[] | null>(null);
    const [isLeader, setIsLeader] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(true);
    const [modalVisible, setModalVisible] = useState<boolean>(false);
    const [selectedMember, setSelectedMember] = useState<Member | null>(null);
    const [currentstudentCode, setStudentCode] = useState<string | null>(null);
    const [editRoleMode, setEditRoleMode] = useState<boolean>(false);
    const { courseDetails, studentCode } = useLocalSearchParams();
    const [newRole, setNewRole] = useState<string>('');
    const [joinRequestsCount, setJoinRequestsCount] = useState<number>(0);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showAssignConfirm, setShowAssignConfirm] = useState(false);
    const [showUnassignConfirm, setShowUnassignConfirm] = useState(false);
    const refreshTeamDetails = async (token: string) => {
        try {
            const parsedCourseDetails = JSON.parse(courseDetails as string);
            const updatedTeamDetails = await fetchTeamDetails(parsedCourseDetails.courseId, parsedCourseDetails.semesterId, token);
            const members = updatedTeamDetails.data.members.filter((member: Member) => !member.isDeleted);
            // Sort members so that the leader is at the top
            members.sort((a: Member, b: Member) => b.isLeader ? 1 : -1);
            setTeamDetails(members);
        } catch (error) {
            console.log('Error refreshing team details:', error);
        }
    };

    useEffect(() => {
        const loadTeamDetails = async () => {
            try {
                const token = await checkToken();
                if (token === null) {
                    showSessionExpiredAlert(router);
                    return;
                }
                if (token && courseDetails && studentCode) {
                    const parsedCourseDetails = JSON.parse(courseDetails as string);
                    const teamDetails = await fetchTeamDetails(parsedCourseDetails.courseId, parsedCourseDetails.semesterId, token);
                    const members: Member[] = teamDetails.data.members.filter((member: Member) => !member.isDeleted);
                    // Sort members so that the leader is at the top
                    members.sort((a: Member, b: Member) => (b.isLeader ? 1 : -1));
                    setTeamDetails(members);

                    const isCurrentUserLeader = members.some((member: Member) =>
                        member.studentCode === studentCode && member.isLeader
                    );
                    // console.log("isCurrentUserLeader:", isCurrentUserLeader);

                    setIsLeader(isCurrentUserLeader);

                    const storedIsLeader = await AsyncStorage.getItem('@isLeader');
                    if (storedIsLeader && JSON.parse(storedIsLeader) !== isCurrentUserLeader) {
                        await AsyncStorage.removeItem('@isLeader');
                    }
                    await AsyncStorage.setItem('@isLeader', JSON.stringify(isCurrentUserLeader));
                    const accountdata = await AsyncStorage.getItem('@accountData');
                    const parsedAccountData = accountdata ? JSON.parse(accountdata) : null;
                    setStudentCode(parsedAccountData?.student?.studentCode)
                    const checkIsLeader = await AsyncStorage.getItem('@isLeader');
                    // console.log("Check stored isLeader:", checkIsLeader);
                    if (isCurrentUserLeader) {
                        const joinRequests = await fetchJoinRequests(teamDetails.data.teamId, token);
                        setJoinRequestsCount(joinRequests.length);
                    }

                } else {
                    console.log('Required data missing');
                }
            } catch (error) {
                console.log('Error loading team details:', error);
            } finally {
                setLoading(false);
            }
        };
        loadTeamDetails();
    }, [courseDetails, studentCode, isFocused]);

    const handleDeleteMember = async () => {
        setShowDeleteConfirm(false);
        if (selectedMember) {
            try {
                const token = await checkToken();
                if (token === null) {
                    showSessionExpiredAlert(router);
                    return;
                }
                if (token) {
                    await deleteMember(selectedMember, token);
                    // Refresh the team details after deleting the member
                    await refreshTeamDetails(token);
                }
            } catch (error) {
                console.log('Error deleting member:', error);
            }
        }
        setModalVisible(false);
    };

    const handleAssignLeader = async () => {
        setShowAssignConfirm(false);
        if (selectedMember) {
            try {
                const token = await checkToken();
                if (token === null) {
                    showSessionExpiredAlert(router);
                    return;
                }
                if (token) {
                    await assignLeader(selectedMember, token);
                    // Refresh the team details after assigning the leader
                    await refreshTeamDetails(token);
                }
            } catch (error) {
                console.log('Error assigning leader:', error);
            }
        }
        setModalVisible(false);
    };
    const handleUnAssignLeader = async () => {
        setShowUnassignConfirm(false);
        if (selectedMember) {
            try {
                const token = await checkToken();
                if (token === null) {
                    showSessionExpiredAlert(router);
                    return;
                }
                if (token) {
                    await unAssignLeader(selectedMember, token);
                    // Refresh the team details after assigning the leader
                    await refreshTeamDetails(token);
                }
            } catch (error) {
                console.log('Error assigning leader:', error);
            }
        }
        setModalVisible(false);
    };
    const handleChangeRole = () => {
        setEditRoleMode(true);
        setNewRole(selectedMember?.memberRole || '');
    };


    const handleSaveRole = async () => {
        if (selectedMember) {
            try {
                const token = await checkToken();
                if (token === null) {
                    showSessionExpiredAlert(router);
                    return;
                }
                // List of valid roles
                const validRoles = ['FE', 'BE', 'Mobile', 'UI/UX', 'Marketing'];

                // Validate that the newRole is not empty
                if (!newRole.trim()) {
                    Alert.alert('Validation Error', 'Member role cannot be empty');
                    return;
                }

                // Split the newRole input into roles separated by commas
                const roleWords = newRole.trim().split(/\s*,\s*/);
                for (const word of roleWords) {
                    // Convert both the input role and valid roles to lowercase for comparison
                    if (!validRoles.map(role => role.toLowerCase()).includes(word.toLowerCase())) {
                        Alert.alert('Validation Error', 'Invalid member role. Please enter one of the following roles: FE, BE, Mobile, UI/UX, Marketing and must use , between 2 roles');
                        return;
                    }
                }

                if (token) {
                    const updatedMember = { ...selectedMember, memberRole: newRole };
                    await updateMemberRole(updatedMember, token);
                    // Refresh the team details after updating the role
                    await refreshTeamDetails(token);
                    Alert.alert('Success', 'Member role updated successfully');
                }
            } catch (error) {
                // console.log('Error updating member role:', error);
                Alert.alert('Error', 'Failed to update member role');
            }
        }
        setEditRoleMode(false);
        setModalVisible(false);
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
                // Filter the requests
                const joinRequests = data.data.data.filter((request: JoinRequest) => request.type === "Join" && request.status === 0);
                return joinRequests;
            } else {
                throw new Error('Failed to fetch join requests');
            }
        } catch (error) {
            console.log('Error fetching join requests:', teamId);
            throw error;
        }
    };

    const handleViewJoinRequests = async () => {
        try {
            const token = await checkToken();
            if (token === null) {
                showSessionExpiredAlert(router);
                return;
            }
            if (token) {
                const parsedCourseDetails = JSON.parse(courseDetails as string);
                const teamDetails = await fetchTeamDetails(parsedCourseDetails.courseId, parsedCourseDetails.semesterId, token);
                if (teamDetails.data.teamId) {
                    const joinRequests = await fetchJoinRequests(teamDetails.data.teamId, token);
                    const filteredJoinRequests = joinRequests.filter((request: JoinRequest) => request.type === "Join" && request.status === 0);

                    router.push({
                        pathname: './RequestListScreen',
                        params: {
                            teamId: teamDetails.data.teamId, // Pass the filtered join requests as a parameter
                        },
                    });
                }
            }
        } catch (error) {
            // console.log('Error viewing join requests:', error);
            Alert.alert('Error', 'Failed to retrieve join requests');
        }
    };



    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0000ff" />
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
                <Text style={styles.headerText}>Team Details</Text>
            </View>
            <ScrollView contentContainerStyle={styles.scrollView}>
                <Text style={styles.title}>Team Members</Text>
                {teamDetails ? (
                    teamDetails.map((member, index) => (
                        <View key={index} style={styles.memberCard}>
                            <Text style={styles.memberName}>{member.studentName}</Text>
                            <Text>Code: {member.studentCode}</Text>
                            <Text>Role: {member.memberRole}</Text>
                            {member.isLeader && <Text style={styles.leaderLabel}>Leader</Text>}
                            {isLeader && member.studentCode !== currentstudentCode && (
                                <TouchableOpacity style={styles.memberOptionsButton} onPress={() => { setSelectedMember(member); setModalVisible(true); }}>
                                    <Text style={styles.memberOptionsButtonText}>...</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    ))
                ) : (
                    <Text>No team members found</Text>
                )}
                {isLeader && (
                    <View style={styles.joinRequestsContainer}>
                        <TouchableOpacity style={styles.joinRequestsButton} onPress={handleViewJoinRequests}>
                            <Text style={styles.joinRequestsButtonText}>
                                View Join Requests
                            </Text>
                            {joinRequestsCount > 0 && (
                                <View style={styles.joinRequestsCountContainer}>
                                    <Text style={styles.joinRequestsCount}>{joinRequestsCount}</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>
            <Modal
                transparent={true}
                visible={modalVisible}
                animationType="slide"
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        {editRoleMode ? (
                            <>
                                <TextInput
                                    style={styles.input}
                                    value={newRole}
                                    onChangeText={setNewRole}
                                    placeholder="Enter new role"
                                />
                                <TouchableOpacity style={styles.modalOption} onPress={handleSaveRole}>
                                    <Text style={styles.modalOptionText}>Save</Text>
                                </TouchableOpacity>
                            </>
                        ) : (
                            <>
                                <TouchableOpacity style={styles.modalOption} onPress={() => { setModalVisible(false); setShowDeleteConfirm(true); }}>
                                    <Text style={styles.modalOptionText}>Delete Member</Text>
                                </TouchableOpacity>
                                {!selectedMember?.isLeader && (
                                    <TouchableOpacity style={[styles.modalOption]} onPress={() => { setModalVisible(false); setShowAssignConfirm(true); }}>
                                        <Text style={styles.modalOptionText}>Assign Leader</Text>
                                    </TouchableOpacity>
                                )}
                                {selectedMember?.isLeader && (
                                    <TouchableOpacity style={[styles.modalOption]} onPress={() => { setModalVisible(false); setShowUnassignConfirm(true); }}>
                                        <Text style={styles.modalOptionText}>Unassign Leader</Text>
                                    </TouchableOpacity>
                                )}
                                <TouchableOpacity style={styles.modalOption} onPress={handleChangeRole}>
                                    <Text style={styles.modalOptionText}>Change Role</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.modalCloseButton} onPress={() => setModalVisible(false)}>
                                    <Text style={styles.modalCloseButtonText}>Cancel</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </View>
            </Modal>

            {/* Delete Confirmation Popup */}
            {showDeleteConfirm && (
                <View style={styles.popupContainer}>
                    <View style={styles.popupContent}>
                        <Text>Do you really want to delete this member?</Text>
                        <View style={styles.modalButtonContainer}>
                            <TouchableOpacity style={styles.confirmButton} onPress={handleDeleteMember}>
                                <Text style={styles.confirmButtonText}>Yes</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.cancelButton} onPress={() => setShowDeleteConfirm(false)}>
                                <Text style={styles.cancelButtonText}>No</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            )}

            {/* Assign Leader Confirmation Popup */}
            {showAssignConfirm && (
                <View style={styles.popupContainer}>
                    <View style={styles.popupContent}>
                        <Text>Do you want to assign this member as the leader?</Text>
                        <View style={styles.modalButtonContainer}>
                            <TouchableOpacity style={styles.confirmButton} onPress={handleAssignLeader}>
                                <Text style={styles.confirmButtonText}>Yes</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.cancelButton} onPress={() => setShowAssignConfirm(false)}>
                                <Text style={styles.cancelButtonText}>No</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            )}

            {/* Unassign Leader Confirmation Popup */}
            {showUnassignConfirm && (
                <View style={styles.popupContainer}>
                    <View style={styles.popupContent}>
                        <Text>Do you want to unassign this member as the leader?</Text>
                        <View style={styles.modalButtonContainer}>
                            <TouchableOpacity style={styles.confirmButton} onPress={handleUnAssignLeader}>
                                <Text style={styles.confirmButtonText}>Yes</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.cancelButton} onPress={() => setShowUnassignConfirm(false)}>
                                <Text style={styles.cancelButtonText}>No</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            )}
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
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    memberCard: {
        padding: 16,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        marginBottom: 8,
        position: 'relative',
    },
    memberName: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    leaderLabel: {
        marginTop: 8,
        color: 'blue',
        fontWeight: 'bold',
    },
    memberOptionsButton: {
        position: 'absolute',
        right: 10,
        top: 10,
    },
    memberOptionsButtonText: {
        fontSize: 24,
        color: '#000',
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContent: {
        width: 300,
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 20,
        alignItems: 'center',
    },
    modalOption: {
        padding: 15,
        width: '100%',
        alignItems: 'center',
        marginBottom: 15,
        backgroundColor: '#f5f5f5',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#ddd',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 3,
    },
    deleteButton: {
        backgroundColor: '#ff4d4d',
    },
    assignButton: {
        backgroundColor: '#4da6ff',
    },
    unassignButton: {
        backgroundColor: '#ffd11a',
    },
    changeRoleButton: {
        backgroundColor: '#4dff4d',
    },
    saveButton: {
        backgroundColor: '#4da6ff',
    },
    modalOptionText: {
        fontSize: 18,
        color: '#000000',
    },
    modalCloseButton: {
        padding: 10,
        width: '100%',
        alignItems: 'center',
        marginVertical: 5,
        borderRadius: 5,
        borderWidth: 1,
        borderColor: '#000',
    },
    modalCloseButtonText: {
        fontSize: 18,
        color: '#FF0000',
    },
    input: {
        height: 40,
        borderColor: 'gray',
        borderWidth: 1,
        marginBottom: 10,
        paddingHorizontal: 10,
        width: '100%',
    },
    joinRequestsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 20,
    },
    joinRequestsButton: {
        backgroundColor: '#003366',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 5,
        flexDirection: 'row',
        alignItems: 'center',
        position: 'relative',
    },
    joinRequestsButtonText: {
        fontSize: 16,
        color: '#fff',
        fontWeight: 'bold',
    },
    joinRequestsCountContainer: {
        position: 'absolute',
        top: -5,
        right: -10,
        backgroundColor: '#ff3b30',
        borderRadius: 12,
        paddingHorizontal: 6,
        paddingVertical: 2,
    },
    joinRequestsCount: {
        fontSize: 14,
        color: '#fff',
        fontWeight: 'bold',
    }, modalButtonContainer: {
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
    // Added popup styles
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
});
export default MyTeamScreen;
