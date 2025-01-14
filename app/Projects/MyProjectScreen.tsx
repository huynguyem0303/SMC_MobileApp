import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, Alert, StyleSheet, ScrollView, Image, TouchableOpacity, Switch, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { checkToken } from '../../components/checkToken'; 
import { showSessionExpiredAlert } from '../../components/alertUtils'; 
// Define TypeScript interfaces for the project details
interface SemesterAndCourse {
    semesterId: string;
    semester: string;
    courseId: string;
    course: string;
}

interface Mentor {
    accountId: string;
    name: string;
    roleType: string;
    description: string;
}

interface Member {
    id: string;
    studentName: string;
    studentCode: string;
    memberRole: string;
    isLeader: boolean;
    status: number;
    note: string;
    isDeleted: boolean;
}

interface Team {
    teamId: string;
    teamName: string;
    desiredMentorSessions: number;
    members: Member[];
}

interface ProjectDetail {
    id: string;
    projectCode: string;
    projectName: string;
    projectDetail: string;
    projectProgress: number;
    projectStatus: number;
    category: string;
    coverImage: string | null;
    semesterAndCourse: SemesterAndCourse;
    mentorsAndLecturers: Mentor[];
    memberWanted: string;
    memberWantedStatus: boolean;
    team: Team;
    createdDate: string;
    isDeleted: boolean;
    lastUpdateDate: string;
}

const MyProjectScreen = () => {
    const { courseId, semesterId } = useLocalSearchParams();
    const router = useRouter();

    const [projectDetail, setProjectDetail] = useState<ProjectDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [memberWantedStatus, setMemberWantedStatus] = useState(false);
    const [memberWantedInput, setMemberWantedInput] = useState('');
    const [isLeader, setIsLeader] = useState(false);

    useEffect(() => {
        const fetchProjectDetail = async () => {
            try {
                const token = await checkToken();
                const storedIsLeader = await AsyncStorage.getItem('@isLeader');
                setIsLeader(storedIsLeader === 'true');
                if (token === null) {
                    showSessionExpiredAlert(router);
                    return;
                }


                const response = await fetch(`https://smnc.site/api/Projects/CurrentUserProject?courseId=${courseId}&semesterId=${semesterId}`, {
                    headers: {
                        'accept': 'text/plain',
                        'Authorization': `Bearer ${token}`,
                    },
                });

                const data = await response.json();

                if (data.status && data.data.data && data.data.data.length > 0) {
                    setProjectDetail(data.data.data[0]);
                    setMemberWantedStatus(data.data.data[0].memberWantedStatus);
                    setMemberWantedInput(data.data.data[0].memberWanted);
                } else {
                    // console.log(data.data.length);
                    setError(data.message || 'Unexpected response structure');
                }
            } catch (error) {
                // console.log('Error fetching project detail:', error);
                setError('Failed to fetch project details.');
            } finally {
                setLoading(false);
            }
        };

        fetchProjectDetail();
    }, [courseId, semesterId]);

    const toggleSwitch = async (value: boolean) => {
        setMemberWantedStatus(value);
        await updateMemberWantedStatus(value);
    };

    const updateMemberWantedStatus = async (status: boolean) => {
        try {
            const token = await checkToken();
            if (token === null) {
                showSessionExpiredAlert(router);
                return;
            }
            const formData = new FormData();
            formData.append('isDeleted', 'false');
            formData.append('memberWanted', '');
            formData.append('projectDetail', '');
            formData.append('projectCode', '');
            formData.append('projectName', '');
            formData.append('memberWantedStatus', status.toString());

            const response = await fetch(`https://smnc.site/api/Projects/${projectDetail?.id}`, {
                method: 'PUT',
                headers: {
                    'accept': '*/*',
                    'Authorization': `Bearer ${token}`,
                },
                body: formData,
            });

            if (response.ok) {
                try {
                    const data = await response.json();
                    // console.log('API response:', data);
                    // Alert.alert('Success', 'Member wanted status updated');
                } catch (error) {
                    console.log('No JSON response body');
                    // Alert.alert('Success', 'Member wanted status updated');
                }
            } else {
                const errorData = await response.json();
                // console.log('Error updating member wanted status:', errorData);
                Alert.alert('Update Failed', 'Failed to update member wanted status.');
            }
        } catch (error) {
            // console.log('Error updating member wanted status:', error);
            Alert.alert('Update Failed', 'Failed to update member wanted status.');
        }
    };
    const handleConfirm = async () => {
        // List of valid roles
        const validRoles = ['FE', 'BE', 'Mobile', 'UI/UX', 'Marketing'];

        // Validate that the memberWantedInput is not empty
        if (!memberWantedInput.trim()) {
            Alert.alert('Validation Error', 'Member wanted input cannot be empty');
            return;
        }
        // Split the memberWantedInput into roles separated by commas
        const roleWords = memberWantedInput.trim().split(/\s*,\s*/);
        for (const word of roleWords) {
            if (!validRoles.includes(word)) {
                Alert.alert('Validation Error', 'Invalid member role. Please enter one of the following roles: FE, BE, Mobile, UI/UX, Marketing and must use , between 2 roles');
                return;
            }
        }
        try {
            const token = await checkToken();
            if (token === null) {
                showSessionExpiredAlert(router);
                return;
            }


            const formData = new FormData();
            formData.append('isDeleted', 'false');
            formData.append('memberWanted', memberWantedInput);
            formData.append('projectDetail', '');
            formData.append('projectCode', '');
            formData.append('projectName', '');
            formData.append('memberWantedStatus', true.toString());

            const response = await fetch(`https://smnc.site/api/Projects/${projectDetail?.id}`, {
                method: 'PUT',
                headers: {
                    'accept': '*/*',
                    'Authorization': `Bearer ${token}`,
                },
                body: formData,
            });

            if (response.ok) {
                try {
                    const data = await response.json();
                    // console.log('API response:', data);
                    Alert.alert('Success', 'Member wanted updated');
                } catch (error) {
                    // console.log('No JSON response body');
                    Alert.alert('Success', 'Member wanted updated');
                }
            } else {
                const errorData = await response.json();
                // console.log('Error updating member wanted status:', errorData);
                Alert.alert('Update Failed', 'Failed to update member wanted status.');
            }
        } catch (error) {
            // console.log('Error updating member wanted status:', error);
            Alert.alert('Update Failed', 'Failed to update member wanted status.');
        }
    };

    const handleMilestone = () => {
        router.push({
            pathname: '/Tasks/MilestoneScreen',
            params: {
                semesterId: semesterId,
                courseId: courseId
            },
        });
    };
    const handleFinance = () => {
        router.push({
            pathname: './FinanceScreen',
            params: {
                projectId: projectDetail?.id,

            },
        });
    };
    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0000ff" />
                <Text>Loading...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={router.back} style={styles.backButton}>
                    <Text style={styles.backButtonText}>←</Text>
                </TouchableOpacity>
                <Text style={styles.headerText}>Project Details</Text>
            </View>
            <ScrollView contentContainerStyle={styles.scrollViewContent}>
                <View style={styles.contentContainer}>
                    {projectDetail?.coverImage && (
                        <Image source={{ uri: projectDetail.coverImage }} style={styles.projectImage} />
                    )}
                    <View style={styles.detailsContainer}>
                        <Text style={styles.projectTitle}>{projectDetail?.projectName}</Text>
                        <Text style={styles.projectDetail}>{projectDetail?.projectDetail}</Text>
                        <View style={styles.inlineContainer}>
                            <Text style={styles.time}>Semester :</Text>
                            <Text style={styles.detailText}>{projectDetail?.semesterAndCourse.semester}</Text>
                        </View>
                        <View style={styles.inlineContainer}>
                            <Text style={styles.time}>Course:</Text>
                            <Text style={styles.detailText}>{projectDetail?.semesterAndCourse.course}</Text>
                        </View>
                        <View style={styles.inlineContainer}>
                            <Text style={styles.time}>Project Code:</Text>
                            <Text style={styles.detailText}>{projectDetail?.projectCode}</Text>
                        </View>
                        <View style={styles.inlineContainer}>
                            <Text style={styles.time}>Category:</Text>
                            <Text style={styles.detailText}>{projectDetail?.category}</Text>
                        </View>
                        <Text style={styles.sectionTitle}>Mentors and Lecturers:</Text>
                        {projectDetail?.mentorsAndLecturers.map((mentor: Mentor, index: number) => (
                            <View key={index} style={styles.mentorContainer}>
                                <Text style={styles.personName}>
                                    {mentor.name} ({mentor.roleType})
                                </Text>
                                {/* <Text style={styles.personDescription}>
                                    {mentor.description}
                                </Text> */}
                            </View>
                        ))}
                        <View style={styles.inlineContainer}>
                            <Text style={styles.time}>Milestones:</Text>
                            <TouchableOpacity onPress={handleMilestone}>
                                <Text style={styles.detailMilestoneText}>Details</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.inlineContainer}>
                            <Text style={styles.time}>Finances:</Text>
                            <TouchableOpacity onPress={handleFinance}>
                                <Text style={styles.detailMilestoneText}>Details</Text>
                            </TouchableOpacity>
                        </View>
                        {isLeader ? (
                            <View style={styles.switchContainer}>
                                <Text style={styles.switchLabel}>Member Wanted:</Text>
                                <Switch
                                    value={memberWantedStatus}
                                    onValueChange={toggleSwitch}
                                />
                            </View>
                        ) : (
                            <View style={styles.inlineContainer}>
                                <Text style={styles.time}>Member Wanted:</Text>
                                {memberWantedStatus ? (
                                    <Text style={styles.detailText}>{projectDetail?.memberWanted}</Text>
                                ) : (
                                    <Text style={styles.detailText}>None</Text>
                                )}
                            </View>

                        )}

                        {isLeader && memberWantedStatus && (
                            <View>
                                <TextInput
                                    style={styles.input}
                                    value={memberWantedInput}
                                    onChangeText={setMemberWantedInput}
                                    placeholder="Enter member wanted details"
                                />
                                <TouchableOpacity style={styles.registrationButton} onPress={handleConfirm}>
                                    <Text style={styles.registrationButtonText}>Confirm</Text>
                                </TouchableOpacity>
                            </View>
                        )}


                        {/* <Text style={styles.sectionTitle}>Team Members:</Text>
                        {projectDetail?.team.members
                            .filter((member: Member) => !member.isDeleted)
                            .sort((a: Member, b: Member) => (b.isLeader ? 1 : -1) - (a.isLeader ? 1 : -1))
                            .map((member: Member, index: number) => (
                                <Text key={index} style={styles.personName}>
                                    {member.studentName} - {member.studentCode} - {member.memberRole} {member.isLeader ? '(Leader)' : ''}
                                </Text>
                            ))} */}
                    </View>
                </View>
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
        position: 'absolute',
        left: 5,
    },
    backButtonText: {
        fontSize: 40,
        color: '#fff',
    },
    inlineContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        textAlign: 'center',
        flex: 1,
        marginTop: 30,
    },
    scrollViewContent: {
        padding: 10,
    },
    contentContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    detailsContainer: {
        flex: 1,
        marginLeft: 10,
    },
    projectImage: {
        width: 150,
        height: 200,
        borderRadius: 10,
    },
    projectTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 10,
        textAlign: 'center',
    },
    projectDetail: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 20,
    },
    detailText: {
        fontSize: 16,
        marginBottom: 10,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginTop: 10,
    },
    time: {
        fontSize: 16,
        marginBottom: 10,
        fontWeight: 'bold',
    },
    personName: {
        fontSize: 16,
        marginBottom: 5,
    },
    personDescription: {
        fontSize: 16,
        marginBottom: 10,
        color: 'grey',
    },
    mentorContainer: {
        marginBottom: 10,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
    },
    errorText: {
        color: 'red',
        fontSize: 16,
        textAlign: 'center',
    },
    registrationButton: {
        backgroundColor: '#003366',
        padding: 10,
        borderRadius: 5,
        marginTop: 20,
        alignItems: 'center',
    },
    registrationButtonText: {
        color: '#fff',
        fontWeight: 'bold',
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
    switchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 10,
    },
    switchLabel: {
        fontSize: 16,
        fontWeight: 'bold',
        marginRight: 10,
    },
    input: {
        height: 40,
        borderColor: '#ccc',
        borderWidth: 1,
        borderRadius: 5,
        paddingHorizontal: 10,
        marginBottom: 10,
    },
    detailMilestoneText: {
        fontSize: 16,
        color: 'blue',
        textDecorationLine: 'underline',
        cursor: 'pointer', // Makes it look like a link on web
        marginBottom: 10,
    },

});

export default MyProjectScreen;    