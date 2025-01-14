import React, { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image, Modal } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { checkToken } from '../../components/checkToken'; 
import { showSessionExpiredAlert } from '../../components/alertUtils'; 
interface ProjectDetail {
    id: string;
    projectCode: string;
    projectName: string;
    projectDetail: string;
    projectProgress: number;
    projectStatus: number;
    category: string;
    coverImage: string | null;
    semesterAndCourse: {
        semesterId: string;
        semester: string;
        courseId: string;
        course: string;
    };
    mentorsAndLecturers: {
        accountId: string;
        name: string;
        roleType: string;
        description: string;
    }[];
    memberWanted: string;
    memberWantedStatus: boolean;
    team: {
        teamId: string;
        teamName: string;
        desiredMentorSessions: number;
        startupIdea: {
            id: string;
            title: string;
            description: string;
            category: number;
            coverImage: string | null;
        };
        members: {
            id: string;
            studentId: string;
            email: string;
            studentName: string;
            studentCode: string;
            memberRole: string;
            isLeader: boolean;
            status: number;
            note: string;
            isDeleted: boolean;
        }[];
        status: number;
        isDeleted: boolean;
    };
    milestones: {
        id: string;
        status: number;
        isDeleted: boolean;
        name: string;
        description: string;
        startDate: string;
        endDate: string;
    }[];
    createdDate: string;
    isDeleted: boolean;
    lastUpdateDate: string;
}


const MentorLecturerProjectDetailScreen = () => {
    const { projectId } = useLocalSearchParams<{ projectId: string }>();
    const router = useRouter();

    const [projectDetail, setProjectDetail] = useState<ProjectDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [modalVisible, setModalVisible] = useState(false);

    const fetchProjectDetail = async () => {
        try {
            const token = await checkToken();
            if (token === null) {
                showSessionExpiredAlert(router);
                return;
            }

            const response = await fetch(`https://smnc.site/api/Projects/${projectId}?orderMilestoneByStartDate=true`, {
                method: 'GET',
                headers: {
                    'accept': 'text/plain',
                    'Authorization': `Bearer ${token}`,
                },
            });
            const data = await response.json();
            if (data.status) {
                setProjectDetail(data.data);
            } else {
                setError(data.message);
            }
        } catch (err) {
            const error = err as Error;  // Assert the type of error to Error
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProjectDetail();
    }, []);
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
                <Text>Loading...</Text>
            </View>
        );
    }
    const handleProjectTask = () => {
        router.push({
            pathname: '../Tasks/MentorLecturerProjectTaskListScreen',
            params: {
                projectId: projectDetail?.id,
            },
        });
    };
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
                        <Text style={styles.sectionTitle}>Team Members:</Text>
                        {projectDetail?.team?.members
                            .filter(member => !member.isDeleted)
                            .sort((a, b) => (b.isLeader ? 1 : -1) - (a.isLeader ? 1 : -1))
                            .map((member, index) => (
                                <Text key={index} style={styles.personName}>
                                    {member.studentName} - {member.studentCode} - {member.memberRole} {member.isLeader ? '(Leader)' : ''}
                                </Text>
                            ))
                        }
                        <Text style={styles.sectionTitle}>Mentors and Lecturers:</Text>
                        {projectDetail?.mentorsAndLecturers.map((mentor, index) => (
                            <View key={index} style={styles.mentorContainer}>
                                <Text style={styles.personName}>
                                    {mentor.name} ({mentor.roleType})
                                </Text>
                            </View>
                        ))}

                        <View style={styles.inlineContainer}>
                            <Text style={styles.time}>Milestones:</Text>
                            <TouchableOpacity onPress={() => setModalVisible(true)}>
                                <Text style={styles.detailMilestoneText}>Details</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.inlineContainer}>
                            <Text style={styles.time}>Finances:</Text>
                            <TouchableOpacity onPress={handleFinance}>
                                <Text style={styles.detailMilestoneText}>Details</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
                <TouchableOpacity onPress={handleProjectTask} style={styles.taskButton}>
                    <Text style={styles.taskButtonText}>Project Tasks</Text>
                </TouchableOpacity>

            </ScrollView>
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => {
                    setModalVisible(!modalVisible);
                }}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalView}>
                        <Text style={styles.modalTitle}>Milestones</Text>
                        <ScrollView contentContainerStyle={styles.modalContent}>
                            {projectDetail?.milestones.map((milestone, index) => (
                                <View key={index} style={styles.milestoneContainer}>
                                    <Text style={styles.milestoneName}>{milestone.name}</Text>
                                    <Text style={styles.milestoneDescription}>{milestone.description}</Text>
                                    <Text style={styles.milestoneDate}>Start Date: {new Date(milestone.startDate).toLocaleDateString()}</Text>
                                    <Text style={styles.milestoneDate}>End Date: {new Date(milestone.endDate).toLocaleDateString()}</Text>
                                </View>
                            ))}
                        </ScrollView>
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={() => setModalVisible(!modalVisible)}
                        >
                            <Text style={styles.closeButtonText}>Close</Text>
                        </TouchableOpacity>
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
    detailMilestoneText: {
        color: '#007BFF',
        fontSize: 16,
        marginTop: -10
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalView: {
        width: '90%', // Increase the width of the popup
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
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 15,
        textAlign: 'center',
    },
    modalContent: {
        borderRadius: 20,
        alignItems: 'flex-start',
    },
    milestoneContainer: {
        width: '100%', // Increase the width of each milestone
        marginBottom: 15,
        borderRadius: 20,
        padding: 20,
        backgroundColor: '#d3d3d3',
    },
    milestoneName: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    milestoneDescription: {
        fontSize: 16,
    },
    milestoneDate: {
        fontSize: 14,

    },
    closeButton: {
        backgroundColor: '#2196F3',
        borderRadius: 0,
        padding: 10,
        elevation: 2,
        marginTop: 15,
    },
    closeButtonText: {
        color: 'white',
        fontWeight: 'bold',
        textAlign: 'center',
        fontSize: 16,
    },
    taskButton: {
        margin: 20,
        padding: 10,
        backgroundColor: '#003366',
        borderRadius: 10,
        alignItems: 'center',
    },
    taskButtonText: {
        color: '#fff',
        fontSize: 18,
    },

});


export default MentorLecturerProjectDetailScreen;
